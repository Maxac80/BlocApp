import { useState, useCallback, useRef } from 'react';
import {
  doc,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSecurity } from './useSecurity';
import { useUserProfile } from './useUserProfile';

/**
 * 📧 HOOK PENTRU INVITAȚII PE ASOCIAȚIE
 *
 * Adaptat din useOrgInvitation.js pentru asociații.
 * Path: /associations/{assocId}/invitations/{invitationId}
 * La acceptare: creează member doc + adaugă la user.directAssociations[]
 */
export const useAssocInvitation = () => {
  const { logActivity } = useSecurity();
  const { loadUserProfile } = useUserProfile();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  const generateToken = () => {
    return 'assoc_inv_' + crypto.randomUUID();
  };

  const getRoleName = (role) => {
    const names = {
      assoc_admin: 'Administrator',
      assoc_president: 'Președinte',
      assoc_censor: 'Cenzor'
    };
    return names[role] || role;
  };

  const sendInvitationEmail = async (email, name, associationName, role, inviteLink) => {
    try {
      const response = await fetch('/api/send-member-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          memberName: name || '',
          associationName: associationName || '',
          roleName: getRoleName(role),
          inviteLink
        })
      });

      // Verifică dacă răspunsul e JSON (pe localhost poate returna HTML)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Email API not available (development mode?)');
        return { sent: false, error: 'API_NOT_AVAILABLE' };
      }

      const data = await response.json();
      if (!response.ok) {
        console.error('Email send failed:', data);
        return { sent: false, error: data.error };
      }
      return { sent: true, messageId: data.messageId };
    } catch (err) {
      console.error('Email send error:', err);
      return { sent: false, error: err.message };
    }
  };

  const calculateExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString();
  };

  // 📥 ÎNCĂRCARE INVITAȚII ASOCIAȚIE (real-time cu onSnapshot)
  const loadInvitations = useCallback((associationId) => {
    // Cleanup listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!associationId) {
      setInvitations([]);
      return;
    }

    setLoading(true);
    setError(null);

    const invitationsRef = collection(db, 'associations', associationId, 'invitations');
    unsubscribeRef.current = onSnapshot(invitationsRef, async (snapshot) => {
      try {
        const invitationsData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        const now = new Date();
        const processedInvitations = await Promise.all(
          invitationsData.map(async (inv) => {
            if (inv.status === 'pending' && new Date(inv.expiresAt) < now) {
              await updateDoc(
                doc(db, 'associations', associationId, 'invitations', inv.id),
                { status: 'expired' }
              );
              return { ...inv, status: 'expired' };
            }
            return inv;
          })
        );

        setInvitations(processedInvitations);
      } catch (err) {
        console.error('Error processing invitations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      if (err.code === 'permission-denied') {
        console.warn('⏳ Invitations permission error:', associationId);
        return;
      }
      console.error('Error loading invitations:', err);
      setError(err.message);
      setLoading(false);
    });
  }, []);

  // Cleanup listener
  const unsubscribeInvitations = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // 📤 CREARE INVITAȚIE
  const createInvitation = async (associationId, invitationData, createdByUserId) => {
    if (!associationId || !invitationData.email) {
      throw new Error('Association ID and email are required');
    }

    setLoading(true);
    setError(null);

    try {
      // Verifică dacă există deja o invitație activă pentru acest email
      const existingQuery = query(
        collection(db, 'associations', associationId, 'invitations'),
        where('email', '==', invitationData.email.toLowerCase()),
        where('status', '==', 'pending')
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        throw new Error('INVITATION_EXISTS');
      }

      // Verifică dacă email-ul aparține deja unui membru
      const membersRef = collection(db, 'associations', associationId, 'members');
      const membersSnapshot = await getDocs(membersRef);
      const existingMember = membersSnapshot.docs.find(d => {
        const data = d.data();
        return data.email?.toLowerCase() === invitationData.email.toLowerCase() && data.status === 'active';
      });

      if (existingMember) {
        throw new Error('USER_ALREADY_MEMBER');
      }

      const token = generateToken();
      const newInvitation = {
        email: invitationData.email.toLowerCase().trim(),
        name: invitationData.name || '',
        role: invitationData.role || 'assoc_admin',
        token,
        createdBy: createdByUserId,
        createdAt: new Date().toISOString(),
        expiresAt: calculateExpiryDate(),
        status: 'pending',
        usedAt: null,
        usedBy: null,
        associationId,
        associationName: invitationData.associationName || ''
      };

      const invitationRef = await addDoc(
        collection(db, 'associations', associationId, 'invitations'),
        newInvitation
      );

      await logActivity(createdByUserId, 'ASSOC_INVITATION_SENT', {
        associationId,
        invitationId: invitationRef.id,
        email: invitationData.email,
        role: invitationData.role
      });

      const createdInvitation = { id: invitationRef.id, ...newInvitation };
      // Nu mai facem setInvitations manual - onSnapshot listener actualizeaza automat

      const inviteLink = `${window.location.origin}/invite/assoc/${token}`;

      // Trimite email-ul de invitație
      const emailResult = await sendInvitationEmail(
        invitationData.email,
        invitationData.name,
        invitationData.associationName,
        invitationData.role || 'assoc_admin',
        inviteLink
      );

      return {
        invitation: createdInvitation,
        inviteLink,
        emailSent: emailResult.sent
      };
    } catch (err) {
      console.error('Error creating invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔍 VERIFICARE INVITAȚIE
  const verifyInvitation = async (token) => {
    if (!token) {
      return { valid: false, error: 'TOKEN_REQUIRED' };
    }

    setLoading(true);
    setError(null);

    try {
      // Caută invitația în toate asociațiile
      const assocsSnapshot = await getDocs(collection(db, 'associations'));
      let foundInvitation = null;
      let foundAssocData = null;

      for (const assocDoc of assocsSnapshot.docs) {
        const invQuery = query(
          collection(db, 'associations', assocDoc.id, 'invitations'),
          where('token', '==', token)
        );
        const invSnapshot = await getDocs(invQuery);

        if (!invSnapshot.empty) {
          foundInvitation = { id: invSnapshot.docs[0].id, ...invSnapshot.docs[0].data() };
          foundAssocData = { id: assocDoc.id, ...assocDoc.data() };
          break;
        }
      }

      if (!foundInvitation) {
        return { valid: false, error: 'INVITATION_NOT_FOUND' };
      }

      if (foundInvitation.status !== 'pending') {
        return { valid: false, error: `INVITATION_${foundInvitation.status.toUpperCase()}` };
      }

      if (new Date(foundInvitation.expiresAt) < new Date()) {
        return { valid: false, error: 'INVITATION_EXPIRED' };
      }

      return {
        valid: true,
        invitation: foundInvitation,
        association: foundAssocData
      };
    } catch (err) {
      console.error('Error verifying invitation:', err);
      return { valid: false, error: err.message };
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
      // Caută invitația
      const assocsSnapshot = await getDocs(collection(db, 'associations'));
      let foundInvitation = null;
      let foundAssocId = null;

      for (const assocDoc of assocsSnapshot.docs) {
        const invQuery = query(
          collection(db, 'associations', assocDoc.id, 'invitations'),
          where('token', '==', token)
        );
        const invSnapshot = await getDocs(invQuery);

        if (!invSnapshot.empty) {
          foundInvitation = { id: invSnapshot.docs[0].id, ...invSnapshot.docs[0].data() };
          foundAssocId = assocDoc.id;
          break;
        }
      }

      if (!foundInvitation) {
        throw new Error('INVITATION_NOT_FOUND');
      }

      if (foundInvitation.status !== 'pending') {
        throw new Error(`INVITATION_${foundInvitation.status.toUpperCase()}`);
      }

      if (new Date(foundInvitation.expiresAt) < new Date()) {
        await updateDoc(
          doc(db, 'associations', foundAssocId, 'invitations', foundInvitation.id),
          { status: 'expired' }
        );
        throw new Error('INVITATION_EXPIRED');
      }

      // Obține datele asociației
      const assocDoc = await getDoc(doc(db, 'associations', foundAssocId));
      if (!assocDoc.exists()) {
        throw new Error('ASSOCIATION_NOT_FOUND');
      }
      const assocData = assocDoc.data();

      // Obține datele user-ului (full user document, nu doar profile)
      const userDocSnap = await getDoc(doc(db, 'users', userId));
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};

      // Verifică email match — nu permite acceptare pe cont greșit
      if (userData?.email?.toLowerCase() !== foundInvitation.email.toLowerCase()) {
        throw new Error('EMAIL_MISMATCH');
      }

      // Construiește numele din profile.personalInfo sau din câmpul name
      const memberName = userData?.profile?.personalInfo?.firstName
        ? `${userData.profile.personalInfo.firstName} ${userData.profile.personalInfo.lastName || ''}`.trim()
        : userData?.name || '';

      // Creează member doc
      const memberRef = doc(db, 'associations', foundAssocId, 'members', userId);
      await setDoc(memberRef, {
        userId,
        role: foundInvitation.role,
        name: memberName,
        email: userData?.email || foundInvitation.email,
        phone: userData?.profile?.personalInfo?.phone || userData?.phone || '',
        status: 'active',
        invitedBy: foundInvitation.createdBy,
        addedAt: foundInvitation.createdAt,
        joinedAt: new Date().toISOString()
      });

      // Adaugă la user.directAssociations[]
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        directAssociations: arrayUnion(foundAssocId)
      });

      // Marchează invitația ca acceptată
      await updateDoc(
        doc(db, 'associations', foundAssocId, 'invitations', foundInvitation.id),
        {
          status: 'accepted',
          usedAt: new Date().toISOString(),
          usedBy: userId
        }
      );

      await logActivity(userId, 'ASSOC_INVITATION_ACCEPTED', {
        associationId: foundAssocId,
        invitationId: foundInvitation.id,
        role: foundInvitation.role
      });

      return {
        association: { id: foundAssocId, ...assocData },
        role: foundInvitation.role
      };
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ❌ ANULARE INVITAȚIE
  const cancelInvitation = async (associationId, invitationId, cancelledByUserId) => {
    if (!associationId || !invitationId) {
      throw new Error('Association ID and invitation ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const invitationRef = doc(db, 'associations', associationId, 'invitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        throw new Error('Invitation not found');
      }

      if (invitationDoc.data().status !== 'pending') {
        throw new Error('Only pending invitations can be cancelled');
      }

      await updateDoc(invitationRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: cancelledByUserId
      });

      await logActivity(cancelledByUserId, 'ASSOC_INVITATION_CANCELLED', {
        associationId,
        invitationId,
        email: invitationDoc.data().email
      });

      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitationId ? { ...inv, status: 'cancelled' } : inv
        )
      );

      return true;
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 📊 STATISTICI
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
    invitations,
    loading,
    error,
    loadInvitations,
    unsubscribeInvitations,
    createInvitation,
    cancelInvitation,
    verifyInvitation,
    acceptInvitation,
    getInvitationStats
  };
};
