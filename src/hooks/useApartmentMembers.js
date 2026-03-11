import { useState, useCallback, useRef } from 'react';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { useOwnerInvitation } from './useOwnerInvitation';

/**
 * HOOK PENTRU GESTIONAREA MEMBRILOR APARTAMENTULUI
 *
 * Membri = owners din /owners/ care au apartmentId in associations[].apartments[]
 * Invitatii = /associations/{assocId}/apartment_invitations/{invitationId}
 *
 * Roluri: proprietar, chirias, membru_familie, altul
 */
export const useApartmentMembers = () => {
  const { sendInvitation, resendInvitation, findOwnerByEmail } = useOwnerInvitation();

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  // === HELPERS ===

  const ROLES = {
    proprietar: { label: 'Proprietar', color: 'blue', description: 'Proprietarul apartamentului' },
    chirias: { label: 'Chiriaș', color: 'green', description: 'Chiriaș cu contract' },
    membru_familie: { label: 'Membru de familie', color: 'orange', description: 'Soț/soție, fiu/fiică, părinte etc.' },
    altul: { label: 'Altul', color: 'gray', description: 'Altă persoană cu acces' }
  };

  const getRoleName = (code) => ROLES[code]?.label || code;
  const getRoleColor = (code) => ROLES[code]?.color || 'gray';

  const generateToken = () => {
    return 'apt_inv_' + crypto.randomUUID();
  };

  const calculateExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString();
  };

  // === LOAD MEMBERS ===
  // Query /owners/ for all owners that have this apartmentId
  const loadApartmentMembers = useCallback(async (associationId, apartmentId) => {
    if (!associationId || !apartmentId) {
      setMembers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query all owners - filter client-side by apartmentId
      // Firestore can't query inside nested arrays of objects
      const ownersSnapshot = await getDocs(collection(db, 'owners'));

      const apartmentMembers = [];
      ownersSnapshot.docs.forEach(d => {
        const ownerData = { id: d.id, ...d.data() };

        // Check if this owner has this apartment in any association
        const assoc = ownerData.associations?.find(a => a.associationId === associationId);
        if (assoc) {
          const apt = assoc.apartments?.find(a => a.apartmentId === apartmentId);
          if (apt && ownerData.status === 'active') {
            apartmentMembers.push({
              ...ownerData,
              apartmentRole: apt.role || 'proprietar'
            });
          }
        }
      });

      setMembers(apartmentMembers);
      // Curăță invitațiile orfane: exclude emailurile care au deja un cont activ
      const activeEmails = new Set(apartmentMembers.map(m => m.email).filter(Boolean));
      setInvitations(prev => prev.filter(inv => !activeEmails.has(inv.email)));
    } catch (err) {
      console.error('Error loading apartment members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // === LOAD INVITATIONS ===
  // Real-time listener on /associations/{assocId}/apartment_invitations/ filtered by apartmentId
  const loadApartmentInvitations = useCallback((associationId, apartmentId) => {
    // Cleanup previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!associationId || !apartmentId) {
      setInvitations([]);
      return;
    }

    const invitationsRef = collection(db, 'associations', associationId, 'apartment_invitations');
    const q = query(invitationsRef, where('apartmentId', '==', apartmentId));

    unsubscribeRef.current = onSnapshot(q, async (snapshot) => {
      try {
        const invitationsData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        // Auto-expire pending invitations
        const now = new Date();
        const processed = await Promise.all(
          invitationsData.map(async (inv) => {
            if (inv.status === 'pending' && new Date(inv.expiresAt) < now) {
              try {
                await updateDoc(
                  doc(db, 'associations', associationId, 'apartment_invitations', inv.id),
                  { status: 'expired' }
                );
              } catch (e) {
                console.warn('Could not update expired invitation:', e);
              }
              return { ...inv, status: 'expired' };
            }
            return inv;
          })
        );

        setInvitations(processed);
      } catch (err) {
        console.error('Error processing apartment invitations:', err);
        setError(err.message);
      }
    }, (err) => {
      if (err.code === 'permission-denied') {
        console.warn('Apartment invitations permission error');
        return;
      }
      console.error('Error loading apartment invitations:', err);
      setError(err.message);
    });
  }, []);

  // Cleanup listener
  const unsubscribeInvitations = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // === INVITE MEMBER ===
  const inviteApartmentMember = async (email, role, apartmentData, associationData, invitedByUserId) => {
    if (!email || !apartmentData?.id || !associationData?.id) {
      throw new Error('Email, apartment data and association data are required');
    }

    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check for existing pending invitation for this email + apartment
      const existingQuery = query(
        collection(db, 'associations', associationData.id, 'apartment_invitations'),
        where('email', '==', normalizedEmail),
        where('apartmentId', '==', apartmentData.id),
        where('status', '==', 'pending')
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        throw new Error('INVITATION_EXISTS');
      }

      // Check if email already has access to this apartment
      const existingOwner = await findOwnerByEmail(normalizedEmail);
      if (existingOwner) {
        const assoc = existingOwner.associations?.find(a => a.associationId === associationData.id);
        if (assoc) {
          const apt = assoc.apartments?.find(a => a.apartmentId === apartmentData.id);
          if (apt && existingOwner.status === 'active') {
            throw new Error('USER_ALREADY_MEMBER');
          }
        }
      }

      const token = generateToken();

      // Create tracking doc in apartment_invitations
      const invitationDoc = {
        email: normalizedEmail,
        name: '',
        role: role || 'proprietar',
        apartmentId: apartmentData.id,
        apartmentNumber: apartmentData.number || '',
        stairId: apartmentData.stairId || null,
        blocId: apartmentData.blocId || null,
        token,
        createdBy: invitedByUserId,
        createdByType: 'admin',
        createdAt: new Date().toISOString(),
        expiresAt: calculateExpiryDate(),
        status: 'pending',
        usedAt: null,
        usedBy: null,
        associationId: associationData.id,
        associationName: associationData.name || ''
      };

      await addDoc(
        collection(db, 'associations', associationData.id, 'apartment_invitations'),
        invitationDoc
      );

      // Use existing sendInvitation from useOwnerInvitation to create/update owner doc + send email
      const aptDataWithRole = { ...apartmentData, role: role || 'proprietar' };
      const result = await sendInvitation(
        normalizedEmail,
        aptDataWithRole,
        associationData,
        invitedByUserId,
        {} // ownerInfo empty - user will fill in at registration
      );

      return {
        success: result.success,
        inviteLink: result.magicLink,
        emailSent: result.success
      };
    } catch (err) {
      console.error('Error inviting apartment member:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // === CANCEL INVITATION ===
  const cancelInvitation = async (associationId, invitationId) => {
    if (!associationId || !invitationId) {
      throw new Error('Association ID and invitation ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const invRef = doc(db, 'associations', associationId, 'apartment_invitations', invitationId);
      const invDoc = await getDoc(invRef);

      if (!invDoc.exists()) {
        throw new Error('Invitation not found');
      }

      if (invDoc.data().status !== 'pending') {
        throw new Error('Only pending invitations can be cancelled');
      }

      await updateDoc(invRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });

      return true;
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // === RESEND INVITATION ===
  const resendApartmentInvitation = async (associationId, invitationId, adminId) => {
    if (!associationId || !invitationId) {
      throw new Error('Association ID and invitation ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const invRef = doc(db, 'associations', associationId, 'apartment_invitations', invitationId);
      const invDoc = await getDoc(invRef);

      if (!invDoc.exists()) {
        throw new Error('Invitation not found');
      }

      const invData = invDoc.data();

      // Find the owner doc to resend
      const owner = await findOwnerByEmail(invData.email);
      if (!owner) {
        throw new Error('Owner not found');
      }

      // Resend via useOwnerInvitation
      const result = await resendInvitation(owner.id, adminId);

      if (result.success) {
        // Update the apartment_invitations doc with new token/expiry
        await updateDoc(invRef, {
          token: result.token,
          expiresAt: calculateExpiryDate(),
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      return result;
    } catch (err) {
      console.error('Error resending invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // === REMOVE MEMBER ===
  // Remove apartment from owner's associations array
  const removeMember = async (ownerId, associationId, apartmentId) => {
    if (!ownerId || !associationId || !apartmentId) {
      throw new Error('Owner ID, association ID and apartment ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const ownerRef = doc(db, 'owners', ownerId);
      const ownerDoc = await getDoc(ownerRef);

      if (!ownerDoc.exists()) {
        throw new Error('Owner not found');
      }

      const ownerData = ownerDoc.data();
      const updatedAssociations = (ownerData.associations || []).map(assoc => {
        if (assoc.associationId === associationId) {
          return {
            ...assoc,
            apartments: assoc.apartments.filter(apt => apt.apartmentId !== apartmentId)
          };
        }
        return assoc;
      }).filter(assoc => assoc.apartments.length > 0); // Remove association if no apartments left

      await updateDoc(ownerRef, {
        associations: updatedAssociations
      });

      // Update local state
      setMembers(prev => prev.filter(m => m.id !== ownerId));

      return true;
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // === CHANGE ROLE ===
  const changeMemberRole = async (ownerId, associationId, apartmentId, newRole) => {
    if (!ownerId || !associationId || !apartmentId || !newRole) {
      throw new Error('All parameters are required');
    }

    if (!ROLES[newRole]) {
      throw new Error('Invalid role');
    }

    setLoading(true);
    setError(null);

    try {
      const ownerRef = doc(db, 'owners', ownerId);
      const ownerDoc = await getDoc(ownerRef);

      if (!ownerDoc.exists()) {
        throw new Error('Owner not found');
      }

      const ownerData = ownerDoc.data();
      const updatedAssociations = (ownerData.associations || []).map(assoc => {
        if (assoc.associationId === associationId) {
          return {
            ...assoc,
            apartments: assoc.apartments.map(apt => {
              if (apt.apartmentId === apartmentId) {
                return { ...apt, role: newRole };
              }
              return apt;
            })
          };
        }
        return assoc;
      });

      await updateDoc(ownerRef, {
        associations: updatedAssociations
      });

      // Update local state
      setMembers(prev =>
        prev.map(m =>
          m.id === ownerId ? { ...m, apartmentRole: newRole } : m
        )
      );

      return true;
    } catch (err) {
      console.error('Error changing member role:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    members,
    invitations,
    loading,
    error,
    ROLES,
    getRoleName,
    getRoleColor,
    loadApartmentMembers,
    loadApartmentInvitations,
    unsubscribeInvitations,
    inviteApartmentMember,
    cancelInvitation,
    resendApartmentInvitation,
    removeMember,
    changeMemberRole
  };
};

export default useApartmentMembers;
