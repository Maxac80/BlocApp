import { useState, useCallback, useRef } from 'react';
import {
  doc,
  collection,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayRemove,
  onSnapshot
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
 *
 * Foloseste onSnapshot pentru actualizari in timp real.
 * Daca adminId e furnizat si nu are member doc, il adauga virtual ca fondator.
 */
export const useAssocMembers = () => {
  const { logActivity } = useSecurity();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  // Incarcare membri asociatie (real-time cu onSnapshot)
  // adminId: optional - daca adminId nu e in members, il adauga ca fondator
  const loadMembers = useCallback((associationId, adminId) => {
    // Cleanup listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!associationId) {
      setMembers([]);
      return;
    }

    setLoading(true);
    setError(null);

    const membersRef = collection(db, 'associations', associationId, 'members');

    const unsubscribe = onSnapshot(membersRef, async (snapshot) => {
      try {
        const membersData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        const activeMembers = membersData.filter(m => m.status === 'active');

        // Asigura ca adminul apare in lista cu date corecte
        if (adminId) {
          const existingAdminIdx = activeMembers.findIndex(m => m.id === adminId);

          try {
            const adminDoc = await getDoc(doc(db, 'users', adminId));
            if (adminDoc.exists()) {
              const adminData = adminDoc.data();
              const adminName = adminData.profile?.personalInfo?.firstName
                ? `${adminData.profile.personalInfo.firstName} ${adminData.profile.personalInfo.lastName || ''}`.trim()
                : adminData.name || '';

              if (existingAdminIdx >= 0) {
                // Admin are member doc - imbogateste cu date din user doc daca lipsesc
                if (!activeMembers[existingAdminIdx].name) {
                  activeMembers[existingAdminIdx].name = adminName;
                }
                if (!activeMembers[existingAdminIdx].email) {
                  activeMembers[existingAdminIdx].email = adminData.email || '';
                }
                activeMembers[existingAdminIdx].isFounder = true;
              } else {
                // Admin nu are member doc - adauga virtual
                activeMembers.unshift({
                  id: adminId,
                  userId: adminId,
                  role: 'assoc_admin',
                  name: adminName,
                  email: adminData.email || '',
                  status: 'active',
                  isFounder: true
                });
              }
            }
          } catch (adminErr) {
            console.error('Error fetching admin data:', adminErr);
          }
        }

        setMembers(activeMembers);
      } catch (err) {
        console.error('Error processing members:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error('Error in members listener:', err);
      setError(err.message);
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;
  }, []);

  // Cleanup listener
  const unsubscribeMembers = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
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
    unsubscribeMembers,
    removeMember,
    changeMemberRole,
    getMembersByRole
  };
};
