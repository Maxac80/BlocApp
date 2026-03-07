import { useState, useCallback } from 'react';
import {
  doc,
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSecurity } from './useSecurity';

/**
 * HOOK PENTRU GESTIONAREA MEMBRILOR ASOCIATIEI
 *
 * Membrii asociatiei pot fi:
 * - assoc_admin: Administrator (acces complet la editare)
 * - assoc_president: Presedinte (read-only)
 * - assoc_censor: Cenzor (read-only)
 *
 * Structura Firebase:
 * /associations/{assocId}/members/{userId}
 */
export const useAssocMembers = () => {
  const { logActivity } = useSecurity();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Incarcare membri asociatie
  const loadMembers = useCallback(async (associationId) => {
    if (!associationId) {
      setMembers([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const membersSnapshot = await getDocs(
        collection(db, 'associations', associationId, 'members')
      );

      const membersData = membersSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Filtreaza doar membrii activi
      const activeMembers = membersData.filter(m => m.status === 'active');

      setMembers(activeMembers);
      return activeMembers;
    } catch (err) {
      console.error('Error loading members:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Eliminare membru
  const removeMember = async (associationId, memberId, removedByUserId) => {
    if (!associationId || !memberId) {
      throw new Error('Association ID and Member ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const memberRef = doc(db, 'associations', associationId, 'members', memberId);
      const memberDoc = await getDoc(memberRef);

      if (!memberDoc.exists()) {
        throw new Error('Member not found');
      }

      const memberData = memberDoc.data();

      // Elimina din members subcollection
      await deleteDoc(memberRef);

      // Elimina asociatia din user.directAssociations[]
      const userRef = doc(db, 'users', memberId);
      await updateDoc(userRef, {
        directAssociations: arrayRemove(associationId)
      });

      await logActivity(removedByUserId, 'ASSOC_MEMBER_REMOVED', {
        associationId,
        removedMemberUserId: memberId,
        removedMemberEmail: memberData.email
      });

      // Update local state
      setMembers(prev => prev.filter(m => m.id !== memberId));

      return true;
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Schimbare rol membru
  const changeMemberRole = async (associationId, memberId, newRole, changedByUserId) => {
    if (!associationId || !memberId || !newRole) {
      throw new Error('All parameters are required');
    }

    if (!['assoc_admin', 'assoc_president', 'assoc_censor'].includes(newRole)) {
      throw new Error('Invalid role');
    }

    setLoading(true);
    setError(null);

    try {
      const memberRef = doc(db, 'associations', associationId, 'members', memberId);
      await updateDoc(memberRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });

      await logActivity(changedByUserId, 'ASSOC_MEMBER_ROLE_CHANGED', {
        associationId,
        memberId,
        newRole
      });

      // Update local state
      setMembers(prev =>
        prev.map(m =>
          m.id === memberId ? { ...m, role: newRole } : m
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

  // Helpers
  const getMembersByRole = (role) => {
    return members.filter(m => m.role === role);
  };

  return {
    members,
    loading,
    error,
    loadMembers,
    removeMember,
    changeMemberRole,
    getMembersByRole
  };
};
