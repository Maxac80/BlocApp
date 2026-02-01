import { useState, useCallback } from 'react';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSecurity } from './useSecurity';
import { useOrgMembers } from './useOrgMembers';
import { useUserProfile } from './useUserProfile';

/**
 * 📧 HOOK PENTRU GESTIONAREA INVITAȚIILOR ÎN ORGANIZAȚIE
 *
 * Fluxul de invitație:
 * 1. Owner/Admin trimite invitație (email + rol)
 * 2. Se creează document în /organizations/{orgId}/invitations/
 * 3. Email cu link magic trimis (în producție, prin Cloud Functions)
 * 4. User accesează link-ul și se înregistrează/conectează
 * 5. Invitația se marchează folosită, membrul se adaugă
 *
 * Structura invitație:
 * {
 *   email: string,
 *   role: 'org_admin' | 'org_member',
 *   token: string (UUID),
 *   createdBy: userId,
 *   createdAt: timestamp,
 *   expiresAt: timestamp (7 zile),
 *   status: 'pending' | 'accepted' | 'expired' | 'cancelled',
 *   usedAt: timestamp | null,
 *   usedBy: userId | null,
 *   message: string (mesaj personalizat)
 * }
 */
export const useOrgInvitation = () => {
  const { logActivity } = useSecurity();
  const { addMember } = useOrgMembers();
  const { loadUserProfile } = useUserProfile();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔑 GENERARE TOKEN UNIC
  const generateToken = () => {
    return 'inv_' + crypto.randomUUID();
  };

  // 📅 CALCUL DATA EXPIRARE (7 zile)
  const calculateExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString();
  };

  // 📥 ÎNCĂRCARE INVITAȚII ORGANIZAȚIE
  const loadInvitations = useCallback(async (organizationId) => {
    if (!organizationId) {
      setInvitations([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const invitationsRef = collection(db, 'organizations', organizationId, 'invitations');
      const snapshot = await getDocs(invitationsRef);

      const invitationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrează invitațiile expirate și le marchează
      const now = new Date();
      const processedInvitations = await Promise.all(
        invitationsData.map(async (inv) => {
          if (inv.status === 'pending' && new Date(inv.expiresAt) < now) {
            // Marchează ca expirată
            await updateDoc(
              doc(db, 'organizations', organizationId, 'invitations', inv.id),
              { status: 'expired' }
            );
            return { ...inv, status: 'expired' };
          }
          return inv;
        })
      );

      setInvitations(processedInvitations);
      return processedInvitations;
    } catch (err) {
      console.error('❌ Error loading invitations:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 📤 CREARE INVITAȚIE
  const createInvitation = async (organizationId, invitationData, createdByUserId) => {
    if (!organizationId || !invitationData.email) {
      throw new Error('Organization ID and email are required');
    }

    setLoading(true);
    setError(null);

    try {
      // Verifică dacă există deja o invitație activă pentru acest email
      const existingQuery = query(
        collection(db, 'organizations', organizationId, 'invitations'),
        where('email', '==', invitationData.email.toLowerCase()),
        where('status', '==', 'pending')
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        throw new Error('INVITATION_EXISTS');
      }

      // Verifică dacă email-ul aparține deja unui membru
      const membersQuery = query(
        collection(db, 'organizations', organizationId, 'members'),
        where('email', '==', invitationData.email.toLowerCase()),
        where('status', 'in', ['active', 'pending'])
      );
      const membersSnapshot = await getDocs(membersQuery);

      if (!membersSnapshot.empty) {
        throw new Error('USER_ALREADY_MEMBER');
      }

      // Creează invitația
      const token = generateToken();
      const newInvitation = {
        email: invitationData.email.toLowerCase().trim(),
        role: invitationData.role || 'org_member',
        token,
        createdBy: createdByUserId,
        createdAt: new Date().toISOString(),
        expiresAt: calculateExpiryDate(),
        status: 'pending',
        usedAt: null,
        usedBy: null,
        message: invitationData.message || '',
        organizationId,
        organizationName: invitationData.organizationName || ''
      };

      const invitationRef = await addDoc(
        collection(db, 'organizations', organizationId, 'invitations'),
        newInvitation
      );

      // Log activitate
      await logActivity(createdByUserId, 'ORGANIZATION_INVITATION_SENT', {
        organizationId,
        invitationId: invitationRef.id,
        email: invitationData.email,
        role: invitationData.role
      });

      const createdInvitation = { id: invitationRef.id, ...newInvitation };
      setInvitations(prev => [...prev, createdInvitation]);

      // În producție: Aici s-ar trimite email-ul prin Cloud Functions
      // Pentru development: returnăm link-ul direct
      const inviteLink = `${window.location.origin}/invite/${token}`;
      console.log('🔗 Invite link:', inviteLink);

      return {
        invitation: createdInvitation,
        inviteLink
      };
    } catch (err) {
      console.error('❌ Error creating invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ ACCEPTARE INVITAȚIE
  const acceptInvitation = async (token, userId) => {
    if (!token || !userId) {
      throw new Error('Token and user ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      // Caută invitația după token (în toate organizațiile)
      // Notă: În producție, ar trebui un index pe token la nivel global
      // sau păstrăm organizationId în URL
      const orgsSnapshot = await getDocs(collection(db, 'organizations'));
      let foundInvitation = null;
      let foundOrgId = null;

      for (const orgDoc of orgsSnapshot.docs) {
        const invQuery = query(
          collection(db, 'organizations', orgDoc.id, 'invitations'),
          where('token', '==', token)
        );
        const invSnapshot = await getDocs(invQuery);

        if (!invSnapshot.empty) {
          foundInvitation = { id: invSnapshot.docs[0].id, ...invSnapshot.docs[0].data() };
          foundOrgId = orgDoc.id;
          break;
        }
      }

      if (!foundInvitation) {
        throw new Error('INVITATION_NOT_FOUND');
      }

      // Verifică statusul
      if (foundInvitation.status !== 'pending') {
        throw new Error(`INVITATION_${foundInvitation.status.toUpperCase()}`);
      }

      // Verifică expirarea
      if (new Date(foundInvitation.expiresAt) < new Date()) {
        await updateDoc(
          doc(db, 'organizations', foundOrgId, 'invitations', foundInvitation.id),
          { status: 'expired' }
        );
        throw new Error('INVITATION_EXPIRED');
      }

      // Obține datele organizației
      const orgDoc = await getDoc(doc(db, 'organizations', foundOrgId));
      if (!orgDoc.exists()) {
        throw new Error('ORGANIZATION_NOT_FOUND');
      }
      const orgData = orgDoc.data();

      // Obține datele user-ului
      const userData = await loadUserProfile(userId);

      // Adaugă membrul în organizație
      await addMember(foundOrgId, {
        userId,
        role: foundInvitation.role,
        name: userData?.profile?.personalInfo?.firstName
          ? `${userData.profile.personalInfo.firstName} ${userData.profile.personalInfo.lastName || ''}`
          : userData?.displayName || '',
        email: userData?.email || foundInvitation.email,
        phone: userData?.profile?.personalInfo?.phone || ''
      }, foundInvitation.createdBy);

      // Marchează invitația ca acceptată
      await updateDoc(
        doc(db, 'organizations', foundOrgId, 'invitations', foundInvitation.id),
        {
          status: 'accepted',
          usedAt: new Date().toISOString(),
          usedBy: userId
        }
      );

      // Log activitate
      await logActivity(userId, 'ORGANIZATION_INVITATION_ACCEPTED', {
        organizationId: foundOrgId,
        invitationId: foundInvitation.id,
        role: foundInvitation.role
      });

      return {
        organization: { id: foundOrgId, ...orgData },
        role: foundInvitation.role
      };
    } catch (err) {
      console.error('❌ Error accepting invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔍 VERIFICARE INVITAȚIE (fără acceptare)
  const verifyInvitation = async (token) => {
    if (!token) {
      throw new Error('Token is required');
    }

    setLoading(true);
    setError(null);

    try {
      // Caută invitația după token
      const orgsSnapshot = await getDocs(collection(db, 'organizations'));
      let foundInvitation = null;
      let foundOrgData = null;

      for (const orgDoc of orgsSnapshot.docs) {
        const invQuery = query(
          collection(db, 'organizations', orgDoc.id, 'invitations'),
          where('token', '==', token)
        );
        const invSnapshot = await getDocs(invQuery);

        if (!invSnapshot.empty) {
          foundInvitation = { id: invSnapshot.docs[0].id, ...invSnapshot.docs[0].data() };
          foundOrgData = { id: orgDoc.id, ...orgDoc.data() };
          break;
        }
      }

      if (!foundInvitation) {
        return { valid: false, error: 'INVITATION_NOT_FOUND' };
      }

      // Verifică statusul
      if (foundInvitation.status !== 'pending') {
        return { valid: false, error: `INVITATION_${foundInvitation.status.toUpperCase()}` };
      }

      // Verifică expirarea
      if (new Date(foundInvitation.expiresAt) < new Date()) {
        return { valid: false, error: 'INVITATION_EXPIRED' };
      }

      return {
        valid: true,
        invitation: foundInvitation,
        organization: foundOrgData
      };
    } catch (err) {
      console.error('❌ Error verifying invitation:', err);
      return { valid: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ❌ ANULARE INVITAȚIE
  const cancelInvitation = async (organizationId, invitationId, cancelledByUserId) => {
    if (!organizationId || !invitationId) {
      throw new Error('Organization ID and invitation ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const invitationRef = doc(db, 'organizations', organizationId, 'invitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        throw new Error('Invitation not found');
      }

      const invitationData = invitationDoc.data();

      if (invitationData.status !== 'pending') {
        throw new Error('Only pending invitations can be cancelled');
      }

      await updateDoc(invitationRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: cancelledByUserId
      });

      // Log activitate
      await logActivity(cancelledByUserId, 'ORGANIZATION_INVITATION_CANCELLED', {
        organizationId,
        invitationId,
        email: invitationData.email
      });

      // Update local state
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitationId ? { ...inv, status: 'cancelled' } : inv
        )
      );

      return true;
    } catch (err) {
      console.error('❌ Error cancelling invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔄 RETRIMITERE INVITAȚIE
  const resendInvitation = async (organizationId, invitationId, resentByUserId) => {
    if (!organizationId || !invitationId) {
      throw new Error('Organization ID and invitation ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const invitationRef = doc(db, 'organizations', organizationId, 'invitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        throw new Error('Invitation not found');
      }

      const invitationData = invitationDoc.data();

      // Generează token nou și expiry nou
      const newToken = generateToken();
      const newExpiry = calculateExpiryDate();

      await updateDoc(invitationRef, {
        token: newToken,
        expiresAt: newExpiry,
        status: 'pending',
        resentAt: new Date().toISOString(),
        resentBy: resentByUserId
      });

      // Log activitate
      await logActivity(resentByUserId, 'ORGANIZATION_INVITATION_RESENT', {
        organizationId,
        invitationId,
        email: invitationData.email
      });

      // Update local state
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitationId
            ? { ...inv, token: newToken, expiresAt: newExpiry, status: 'pending' }
            : inv
        )
      );

      const inviteLink = `${window.location.origin}/invite/${newToken}`;
      console.log('🔗 New invite link:', inviteLink);

      return { inviteLink, newToken };
    } catch (err) {
      console.error('❌ Error resending invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ ȘTERGERE INVITAȚIE (doar cancelled/expired)
  const deleteInvitation = async (organizationId, invitationId) => {
    if (!organizationId || !invitationId) {
      throw new Error('Organization ID and invitation ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const invitationRef = doc(db, 'organizations', organizationId, 'invitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        throw new Error('Invitation not found');
      }

      const invitationData = invitationDoc.data();

      if (invitationData.status === 'pending') {
        throw new Error('Cannot delete pending invitation. Cancel it first.');
      }

      await deleteDoc(invitationRef);

      // Update local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      return true;
    } catch (err) {
      console.error('❌ Error deleting invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 📊 STATISTICI INVITAȚII
  const getInvitationStats = (invitationsList = invitations) => {
    return {
      total: invitationsList.length,
      pending: invitationsList.filter(i => i.status === 'pending').length,
      accepted: invitationsList.filter(i => i.status === 'accepted').length,
      expired: invitationsList.filter(i => i.status === 'expired').length,
      cancelled: invitationsList.filter(i => i.status === 'cancelled').length
    };
  };

  return {
    // State
    invitations,
    loading,
    error,

    // CRUD Operations
    loadInvitations,
    createInvitation,
    cancelInvitation,
    resendInvitation,
    deleteInvitation,

    // Acceptance Flow
    verifyInvitation,
    acceptInvitation,

    // Helpers
    getInvitationStats
  };
};
