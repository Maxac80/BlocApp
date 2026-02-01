import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSecurity } from './useSecurity';
import { useUserProfile } from './useUserProfile';

/**
 * 👥 HOOK PENTRU GESTIONAREA MEMBRILOR ORGANIZAȚIEI
 *
 * Membrii organizației pot fi:
 * - org_admin: Administrator în firmă (poate gestiona asociații alocate)
 * - org_member: Membru simplu (acces limitat la asociații alocate)
 *
 * Nota: Owners sunt gestionați direct în organizations.ownerIds[]
 *
 * Structura Firebase:
 * /organizations/{orgId}/members/{memberId}
 */
export const useOrgMembers = (organizationId = null) => {
  const { logActivity } = useSecurity();
  const { addOrganizationToUser, removeOrganizationFromUser, updateUserOrganizationRole } = useUserProfile();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 📋 STRUCTURA DEFAULT PENTRU MEMBER
  const defaultMemberStructure = {
    userId: '',
    role: 'org_member', // 'org_admin' | 'org_member'
    assignedAssociations: [], // Array de associationIds pe care le poate gestiona
    invitedBy: '',
    invitedAt: null,
    joinedAt: null,
    status: 'pending', // 'pending' | 'active' | 'inactive'
    name: '',
    email: '',
    phone: ''
  };

  // 📥 ÎNCĂRCARE MEMBRI ORGANIZAȚIE
  const loadMembers = useCallback(async (orgId = organizationId) => {
    if (!orgId) {
      setMembers([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const membersSnapshot = await getDocs(
        collection(db, 'organizations', orgId, 'members')
      );

      const membersData = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrează doar membrii activi sau pending
      const activeMembers = membersData.filter(
        m => m.status === 'active' || m.status === 'pending'
      );

      setMembers(activeMembers);
      return activeMembers;
    } catch (err) {
      console.error('❌ Error loading members:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // 👤 ADĂUGARE MEMBRU (după ce a acceptat invitația)
  const addMember = async (orgId, memberData, addedByUserId) => {
    if (!orgId || !memberData.userId) {
      throw new Error('Organization ID and User ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      // Verifică dacă membrul există deja
      const existingQuery = query(
        collection(db, 'organizations', orgId, 'members'),
        where('userId', '==', memberData.userId)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        throw new Error('USER_ALREADY_MEMBER');
      }

      const newMember = {
        ...defaultMemberStructure,
        ...memberData,
        invitedBy: addedByUserId,
        invitedAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        status: 'active'
      };

      // Creează în subcollection
      const memberRef = await addDoc(
        collection(db, 'organizations', orgId, 'members'),
        newMember
      );

      // Adaugă organizația la user
      await addOrganizationToUser(memberData.userId, orgId, memberData.role || 'org_member');

      // Log activitate
      await logActivity(addedByUserId, 'ORGANIZATION_MEMBER_ADDED', {
        organizationId: orgId,
        newMemberUserId: memberData.userId,
        role: memberData.role
      });

      const createdMember = { id: memberRef.id, ...newMember };
      setMembers(prev => [...prev, createdMember]);

      return createdMember;
    } catch (err) {
      console.error('❌ Error adding member:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 📝 ACTUALIZARE MEMBRU
  const updateMember = async (orgId, memberId, updates) => {
    if (!orgId || !memberId) {
      throw new Error('Organization ID and Member ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const memberRef = doc(db, 'organizations', orgId, 'members', memberId);
      const memberDoc = await getDoc(memberRef);

      if (!memberDoc.exists()) {
        throw new Error('Member not found');
      }

      const memberData = memberDoc.data();

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(memberRef, updateData);

      // Dacă s-a schimbat rolul, actualizează și în user.organizations[]
      if (updates.role && updates.role !== memberData.role) {
        await updateUserOrganizationRole(memberData.userId, orgId, updates.role);
      }

      // Update local state
      setMembers(prev =>
        prev.map(member =>
          member.id === memberId ? { ...member, ...updateData } : member
        )
      );

      return true;
    } catch (err) {
      console.error('❌ Error updating member:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ ELIMINARE MEMBRU
  const removeMember = async (orgId, memberId, removedByUserId) => {
    if (!orgId || !memberId) {
      throw new Error('Organization ID and Member ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const memberRef = doc(db, 'organizations', orgId, 'members', memberId);
      const memberDoc = await getDoc(memberRef);

      if (!memberDoc.exists()) {
        throw new Error('Member not found');
      }

      const memberData = memberDoc.data();

      // Elimină din subcollection
      await deleteDoc(memberRef);

      // Elimină organizația de la user
      await removeOrganizationFromUser(memberData.userId, orgId);

      // Log activitate
      await logActivity(removedByUserId, 'ORGANIZATION_MEMBER_REMOVED', {
        organizationId: orgId,
        removedMemberUserId: memberData.userId
      });

      // Update local state
      setMembers(prev => prev.filter(member => member.id !== memberId));

      return true;
    } catch (err) {
      console.error('❌ Error removing member:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 📋 ALOCARE ASOCIAȚIE LA MEMBRU
  const assignAssociationToMember = async (orgId, memberId, associationId) => {
    if (!orgId || !memberId || !associationId) {
      throw new Error('All IDs are required');
    }

    try {
      const memberRef = doc(db, 'organizations', orgId, 'members', memberId);
      const memberDoc = await getDoc(memberRef);

      if (!memberDoc.exists()) {
        throw new Error('Member not found');
      }

      const currentAssignments = memberDoc.data().assignedAssociations || [];

      if (currentAssignments.includes(associationId)) {
        return true; // Deja alocat
      }

      await updateDoc(memberRef, {
        assignedAssociations: arrayUnion(associationId),
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setMembers(prev =>
        prev.map(member =>
          member.id === memberId
            ? { ...member, assignedAssociations: [...currentAssignments, associationId] }
            : member
        )
      );

      return true;
    } catch (err) {
      console.error('❌ Error assigning association:', err);
      throw err;
    }
  };

  // 📋 DEALOCARE ASOCIAȚIE DE LA MEMBRU
  const unassignAssociationFromMember = async (orgId, memberId, associationId) => {
    if (!orgId || !memberId || !associationId) {
      throw new Error('All IDs are required');
    }

    try {
      const memberRef = doc(db, 'organizations', orgId, 'members', memberId);
      const memberDoc = await getDoc(memberRef);

      if (!memberDoc.exists()) {
        throw new Error('Member not found');
      }

      await updateDoc(memberRef, {
        assignedAssociations: arrayRemove(associationId),
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setMembers(prev =>
        prev.map(member =>
          member.id === memberId
            ? {
                ...member,
                assignedAssociations: (member.assignedAssociations || []).filter(
                  id => id !== associationId
                )
              }
            : member
        )
      );

      return true;
    } catch (err) {
      console.error('❌ Error unassigning association:', err);
      throw err;
    }
  };

  // 🔄 SCHIMBARE ROL MEMBRU
  const changeMemberRole = async (orgId, memberId, newRole) => {
    if (!orgId || !memberId || !newRole) {
      throw new Error('All parameters are required');
    }

    if (!['org_admin', 'org_member'].includes(newRole)) {
      throw new Error('Invalid role. Must be org_admin or org_member');
    }

    try {
      await updateMember(orgId, memberId, { role: newRole });

      await logActivity(null, 'ORGANIZATION_MEMBER_ROLE_CHANGED', {
        organizationId: orgId,
        memberId,
        newRole
      });

      return true;
    } catch (err) {
      console.error('❌ Error changing member role:', err);
      throw err;
    }
  };

  // 📊 OBȚINERE MEMBRI CU ROL SPECIFIC
  const getMembersByRole = (role) => {
    return members.filter(member => member.role === role);
  };

  // 📊 OBȚINERE MEMBRI CU ACCES LA ASOCIAȚIE
  const getMembersWithAssociationAccess = (associationId) => {
    return members.filter(member =>
      member.assignedAssociations?.includes(associationId)
    );
  };

  // 📊 VERIFICĂ DACĂ USER E MEMBRU
  const isUserMember = async (orgId, userIdToCheck) => {
    if (!orgId || !userIdToCheck) return false;

    try {
      const membersQuery = query(
        collection(db, 'organizations', orgId, 'members'),
        where('userId', '==', userIdToCheck),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(membersQuery);

      return !snapshot.empty;
    } catch (err) {
      console.error('❌ Error checking membership:', err);
      return false;
    }
  };

  // 📊 OBȚINERE ROL MEMBRU
  const getMemberRole = async (orgId, userIdToCheck) => {
    if (!orgId || !userIdToCheck) return null;

    try {
      const membersQuery = query(
        collection(db, 'organizations', orgId, 'members'),
        where('userId', '==', userIdToCheck),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(membersQuery);

      if (snapshot.empty) return null;

      return snapshot.docs[0].data().role;
    } catch (err) {
      console.error('❌ Error getting member role:', err);
      return null;
    }
  };

  // 📊 OBȚINERE ASOCIAȚII ALOCATE MEMBRULUI
  const getMemberAssignedAssociations = async (orgId, userIdToCheck) => {
    if (!orgId || !userIdToCheck) return [];

    try {
      const membersQuery = query(
        collection(db, 'organizations', orgId, 'members'),
        where('userId', '==', userIdToCheck),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(membersQuery);

      if (snapshot.empty) return [];

      return snapshot.docs[0].data().assignedAssociations || [];
    } catch (err) {
      console.error('❌ Error getting member associations:', err);
      return [];
    }
  };

  // 🔄 DEZACTIVARE MEMBRU (soft delete)
  const deactivateMember = async (orgId, memberId) => {
    if (!orgId || !memberId) {
      throw new Error('Organization ID and Member ID are required');
    }

    try {
      await updateMember(orgId, memberId, { status: 'inactive' });

      return true;
    } catch (err) {
      console.error('❌ Error deactivating member:', err);
      throw err;
    }
  };

  // 🔄 REACTIVARE MEMBRU
  const reactivateMember = async (orgId, memberId) => {
    if (!orgId || !memberId) {
      throw new Error('Organization ID and Member ID are required');
    }

    try {
      await updateMember(orgId, memberId, { status: 'active' });

      return true;
    } catch (err) {
      console.error('❌ Error reactivating member:', err);
      throw err;
    }
  };

  // 🔄 EFFECT: Încarcă membrii când organizationId se schimbă
  useEffect(() => {
    if (organizationId) {
      loadMembers(organizationId);
    } else {
      setMembers([]);
    }
  }, [organizationId, loadMembers]);

  return {
    // State
    members,
    loading,
    error,

    // CRUD Operations
    loadMembers,
    addMember,
    updateMember,
    removeMember,

    // Association Assignment
    assignAssociationToMember,
    unassignAssociationFromMember,

    // Role Management
    changeMemberRole,

    // Status Management
    deactivateMember,
    reactivateMember,

    // Queries
    getMembersByRole,
    getMembersWithAssociationAccess,
    isUserMember,
    getMemberRole,
    getMemberAssignedAssociations,

    // Helpers
    defaultMemberStructure
  };
};
