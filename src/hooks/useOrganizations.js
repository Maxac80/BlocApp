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
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSecurity } from './useSecurity';
import { useUserProfile } from './useUserProfile';

/**
 * 🏢 HOOK PENTRU GESTIONAREA ORGANIZAȚIILOR (FIRMELOR)
 *
 * Organizațiile sunt firme de administrare care pot gestiona multiple asociații.
 * Un user poate fi:
 * - org_owner: Proprietar al organizației (poate fi mai mulți, cu founder privilege)
 * - org_admin: Administrator în organizație
 * - org_member: Membru simplu în organizație
 *
 * Structura Firebase:
 * /organizations/{orgId}
 * /organizations/{orgId}/members/{memberId}
 * /organizations/{orgId}/invitations/{invitationId}
 */
export const useOrganizations = (userId = null) => {
  const { logActivity } = useSecurity();
  const { addOrganizationToUser, removeOrganizationFromUser, updateUserOrganizationRole } = useUserProfile();

  const [organizations, setOrganizations] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 📋 STRUCTURA DEFAULT PENTRU ORGANIZAȚIE
  const defaultOrganizationStructure = {
    name: '',
    cui: '',
    registrationNumber: '',
    address: {
      street: '',
      number: '',
      city: '',
      county: '',
      zipCode: ''
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    ownerIds: [],           // Array de userIds - owners egali
    createdBy: '',          // Founder-ul original (pentru Founder Privilege Light)
    status: 'active',       // 'active' | 'inactive'
    settings: {
      requirePresidentApproval: false,
      defaultPenaltyEnabled: false,
      defaultPenaltyPercentage: 0.1,
      notifyOwnersOnChanges: true
    },
    billing: {
      status: 'trial',
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      lastPaymentAt: null,
      billingContact: {
        name: '',
        email: '',
        phone: '',
        companyName: '',
        cui: '',
        address: ''
      },
      totalApartments: 0,
      monthlyAmount: 0,
      tier: 'starter'
    },
    createdAt: null,
    updatedAt: null
  };

  // 🏢 CREARE ORGANIZAȚIE NOUĂ
  const createOrganization = async (organizationData, creatorUserId) => {
    if (!creatorUserId) {
      throw new Error('User ID is required to create organization');
    }

    setLoading(true);
    setError(null);

    try {
      // Calculează data de expirare trial (90 zile)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 90);

      const newOrganization = {
        ...defaultOrganizationStructure,
        ...organizationData,
        ownerIds: [creatorUserId],
        createdBy: creatorUserId,
        status: 'active',
        billing: {
          ...defaultOrganizationStructure.billing,
          status: 'trial',
          trialEndsAt: trialEndsAt.toISOString(),
          currentPeriodStart: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Creare în Firestore
      const orgRef = await addDoc(collection(db, 'organizations'), newOrganization);
      const organizationId = orgRef.id;

      // Adaugă organizația la user
      await addOrganizationToUser(creatorUserId, organizationId, 'org_owner');

      // Log activitate
      await logActivity(creatorUserId, 'ORGANIZATION_CREATED', {
        organizationId,
        organizationName: organizationData.name
      });

      const createdOrg = { id: organizationId, ...newOrganization };
      setOrganizations(prev => [...prev, createdOrg]);

      return createdOrg;
    } catch (err) {
      console.error('❌ Error creating organization:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 📝 ACTUALIZARE ORGANIZAȚIE
  const updateOrganization = async (organizationId, updates) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const orgRef = doc(db, 'organizations', organizationId);

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(orgRef, updateData);

      // Update local state
      setOrganizations(prev =>
        prev.map(org =>
          org.id === organizationId ? { ...org, ...updateData } : org
        )
      );

      if (currentOrganization?.id === organizationId) {
        setCurrentOrganization(prev => ({ ...prev, ...updateData }));
      }

      await logActivity(userId, 'ORGANIZATION_UPDATED', {
        organizationId,
        updatedFields: Object.keys(updates)
      });

      return true;
    } catch (err) {
      console.error('❌ Error updating organization:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ SOFT DELETE ORGANIZAȚIE (cu transfer asociații)
  const softDeleteOrganization = async (organizationId, deletingUserId) => {
    if (!organizationId || !deletingUserId) {
      throw new Error('Organization ID and User ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      await runTransaction(db, async (transaction) => {
        const orgRef = doc(db, 'organizations', organizationId);
        const orgDoc = await transaction.get(orgRef);

        if (!orgDoc.exists()) {
          throw new Error('Organization not found');
        }

        const orgData = orgDoc.data();

        // Verifică că user-ul este founder (Founder Privilege Light)
        if (orgData.createdBy !== deletingUserId) {
          throw new Error('ONLY_FOUNDER_CAN_DELETE');
        }

        // Găsește toate asociațiile din organizație
        const associationsQuery = query(
          collection(db, 'associations'),
          where('organizationId', '==', organizationId)
        );
        const associationsSnapshot = await getDocs(associationsQuery);

        // Pentru fiecare asociație - transfer la direct associations
        for (const assocDoc of associationsSnapshot.docs) {
          const assocData = assocDoc.data();
          const assocRef = doc(db, 'associations', assocDoc.id);

          // Update asociația - dezlegăm de organizație
          transaction.update(assocRef, {
            organizationId: null,
            'billing.mode': 'association',
            'billing.billedToOrganizationId': null,
            'billing.status': 'overdue',
            'billing.transfers': arrayUnion({
              fromMode: 'organization',
              toMode: 'association',
              fromEntityId: organizationId,
              toEntityId: assocDoc.id,
              transferredAt: new Date().toISOString(),
              reason: 'organization_deleted',
              initiatedBy: deletingUserId
            }),
            updatedAt: new Date().toISOString()
          });

          // Adaugă în directAssociations ale adminului
          if (assocData.adminId) {
            const adminRef = doc(db, 'users', assocData.adminId);
            transaction.update(adminRef, {
              directAssociations: arrayUnion(assocDoc.id),
              updatedAt: new Date().toISOString()
            });
          }
        }

        // Obține toți membrii organizației
        const membersSnapshot = await getDocs(
          collection(db, 'organizations', organizationId, 'members')
        );

        // Elimină organizația din user.organizations[] pentru fiecare member
        for (const memberDoc of membersSnapshot.docs) {
          const memberData = memberDoc.data();
          if (memberData.userId) {
            const userRef = doc(db, 'users', memberData.userId);
            const userDoc = await transaction.get(userRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();
              const updatedOrgs = (userData.organizations || []).filter(
                o => o.id !== organizationId
              );
              transaction.update(userRef, {
                organizations: updatedOrgs,
                updatedAt: new Date().toISOString()
              });
            }
          }
        }

        // Elimină organizația din user.organizations[] pentru fiecare owner
        for (const ownerId of orgData.ownerIds || []) {
          const userRef = doc(db, 'users', ownerId);
          const userDoc = await transaction.get(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const updatedOrgs = (userData.organizations || []).filter(
              o => o.id !== organizationId
            );
            transaction.update(userRef, {
              organizations: updatedOrgs,
              updatedAt: new Date().toISOString()
            });
          }
        }

        // Soft delete organizația
        transaction.update(orgRef, {
          status: 'inactive',
          deletedAt: new Date().toISOString(),
          deletedBy: deletingUserId,
          updatedAt: new Date().toISOString()
        });
      });

      // Update local state
      setOrganizations(prev => prev.filter(org => org.id !== organizationId));

      if (currentOrganization?.id === organizationId) {
        setCurrentOrganization(null);
      }

      await logActivity(deletingUserId, 'ORGANIZATION_DELETED', {
        organizationId
      });

      return true;
    } catch (err) {
      console.error('❌ Error deleting organization:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 👤 ADĂUGARE OWNER LA ORGANIZAȚIE
  const addOwner = async (organizationId, newOwnerId, addedByUserId) => {
    if (!organizationId || !newOwnerId) {
      throw new Error('Organization ID and new owner ID are required');
    }

    try {
      const orgRef = doc(db, 'organizations', organizationId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const orgData = orgDoc.data();
      const currentOwnerIds = orgData.ownerIds || [];

      // Verifică dacă user-ul care adaugă are dreptul (este owner)
      if (!currentOwnerIds.includes(addedByUserId)) {
        throw new Error('NOT_AUTHORIZED_TO_ADD_OWNER');
      }

      // Verifică dacă noul owner e deja owner
      if (currentOwnerIds.includes(newOwnerId)) {
        throw new Error('USER_ALREADY_OWNER');
      }

      // Adaugă noul owner
      await updateDoc(orgRef, {
        ownerIds: arrayUnion(newOwnerId),
        updatedAt: new Date().toISOString()
      });

      // Adaugă organizația la user
      await addOrganizationToUser(newOwnerId, organizationId, 'org_owner');

      await logActivity(addedByUserId, 'ORGANIZATION_OWNER_ADDED', {
        organizationId,
        newOwnerId
      });

      return true;
    } catch (err) {
      console.error('❌ Error adding owner:', err);
      throw err;
    }
  };

  // 👤 ELIMINARE OWNER DIN ORGANIZAȚIE
  const removeOwner = async (organizationId, ownerIdToRemove, removedByUserId) => {
    if (!organizationId || !ownerIdToRemove) {
      throw new Error('Organization ID and owner ID to remove are required');
    }

    try {
      const orgRef = doc(db, 'organizations', organizationId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const orgData = orgDoc.data();
      const currentOwnerIds = orgData.ownerIds || [];
      const isFounder = orgData.createdBy === removedByUserId;
      const isSelfRemoval = ownerIdToRemove === removedByUserId;

      // Founder nu poate fi eliminat de nimeni
      if (ownerIdToRemove === orgData.createdBy) {
        throw new Error('CANNOT_REMOVE_FOUNDER');
      }

      // Non-founders pot doar să se elimine pe ei înșiși
      if (!isFounder && !isSelfRemoval) {
        throw new Error('CAN_ONLY_SELF_REMOVE');
      }

      // Verifică că rămâne cel puțin un owner
      if (currentOwnerIds.length <= 1) {
        throw new Error('ORGANIZATION_NEEDS_AT_LEAST_ONE_OWNER');
      }

      // Elimină owner-ul
      await updateDoc(orgRef, {
        ownerIds: arrayRemove(ownerIdToRemove),
        updatedAt: new Date().toISOString()
      });

      // Elimină organizația de la user
      await removeOrganizationFromUser(ownerIdToRemove, organizationId);

      await logActivity(removedByUserId, 'ORGANIZATION_OWNER_REMOVED', {
        organizationId,
        removedOwnerId: ownerIdToRemove,
        wasSelfRemoval: isSelfRemoval
      });

      return true;
    } catch (err) {
      console.error('❌ Error removing owner:', err);
      throw err;
    }
  };

  // 🔄 TRANSFER FOUNDER STATUS
  const transferFounderStatus = async (organizationId, newFounderId, currentFounderId) => {
    if (!organizationId || !newFounderId || !currentFounderId) {
      throw new Error('All IDs are required for founder transfer');
    }

    try {
      const orgRef = doc(db, 'organizations', organizationId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const orgData = orgDoc.data();

      // Verifică că user-ul curent este founder
      if (orgData.createdBy !== currentFounderId) {
        throw new Error('ONLY_FOUNDER_CAN_TRANSFER');
      }

      // Verifică că noul founder este deja owner
      if (!orgData.ownerIds?.includes(newFounderId)) {
        throw new Error('NEW_FOUNDER_MUST_BE_OWNER');
      }

      // Transfer founder status
      await updateDoc(orgRef, {
        createdBy: newFounderId,
        updatedAt: new Date().toISOString()
      });

      await logActivity(currentFounderId, 'ORGANIZATION_FOUNDER_TRANSFERRED', {
        organizationId,
        previousFounder: currentFounderId,
        newFounder: newFounderId
      });

      return true;
    } catch (err) {
      console.error('❌ Error transferring founder status:', err);
      throw err;
    }
  };

  // 📥 ÎNCĂRCARE ORGANIZAȚIE BY ID
  const loadOrganization = async (organizationId) => {
    if (!organizationId) return null;

    setLoading(true);
    setError(null);

    try {
      const orgRef = doc(db, 'organizations', organizationId);
      const orgDoc = await getDoc(orgRef);

      if (orgDoc.exists()) {
        const orgData = { id: orgDoc.id, ...orgDoc.data() };
        setCurrentOrganization(orgData);
        return orgData;
      }

      return null;
    } catch (err) {
      console.error('❌ Error loading organization:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 📥 ÎNCĂRCARE TOATE ORGANIZAȚIILE UTILIZATORULUI
  const loadUserOrganizations = useCallback(async (userIdToLoad) => {
    if (!userIdToLoad) return [];

    setLoading(true);
    setError(null);

    try {
      // Obține lista de organizații din user document
      const userRef = doc(db, 'users', userIdToLoad);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setOrganizations([]);
        return [];
      }

      const userData = userDoc.data();
      const userOrganizations = userData.organizations || [];

      if (userOrganizations.length === 0) {
        setOrganizations([]);
        return [];
      }

      // Încarcă detaliile fiecărei organizații + statistici
      const orgPromises = userOrganizations.map(async (orgEntry) => {
        const orgRef = doc(db, 'organizations', orgEntry.id);
        const orgDoc = await getDoc(orgRef);

        if (orgDoc.exists()) {
          const orgData = {
            id: orgDoc.id,
            ...orgDoc.data(),
            userRole: orgEntry.role,
            userJoinedAt: orgEntry.joinedAt
          };

          // Calculează statisticile pentru organizație
          try {
            const associationsQuery = query(
              collection(db, 'associations'),
              where('organizationId', '==', orgDoc.id)
            );
            const assocsSnapshot = await getDocs(associationsQuery);

            let totalApartments = 0;
            let totalPersons = 0;
            let totalBlocks = 0;
            let totalStairs = 0;

            // Pentru fiecare asociație, citește stats din sheets
            await Promise.all(
              assocsSnapshot.docs.map(async (assocDoc) => {
                try {
                  const sheetsRef = collection(db, 'associations', assocDoc.id, 'sheets');
                  const sheetsSnapshot = await getDocs(sheetsRef);

                  if (sheetsSnapshot.size > 0) {
                    let activeSheet = null;
                    sheetsSnapshot.docs.forEach(sheetDoc => {
                      const data = sheetDoc.data();
                      if (data.status === 'in_progress') {
                        activeSheet = data;
                      } else if (!activeSheet && data.status === 'published') {
                        activeSheet = data;
                      }
                    });

                    if (activeSheet?.associationSnapshot) {
                      const snapshot = activeSheet.associationSnapshot;
                      totalBlocks += snapshot.blocks?.length || 0;
                      totalStairs += snapshot.stairs?.length || 0;
                      totalApartments += snapshot.apartments?.length || 0;
                      if (snapshot.apartments && Array.isArray(snapshot.apartments)) {
                        snapshot.apartments.forEach(apt => {
                          totalPersons += parseInt(apt.persons || apt.noPersons || 0);
                        });
                      }
                    }
                  }
                } catch (statsErr) {
                  console.warn('⚠️ Could not load stats for association in org:', assocDoc.id);
                }
              })
            );

            // Adaugă stats în billing (pentru compatibilitate cu UI-ul existent)
            orgData.billing = {
              ...orgData.billing,
              totalAssociations: assocsSnapshot.size,
              totalApartments,
              totalPersons,
              totalBlocks,
              totalStairs
            };
          } catch (statsErr) {
            console.warn('⚠️ Could not calculate org stats:', orgDoc.id, statsErr);
          }

          return orgData;
        }
        return null;
      });

      const orgs = (await Promise.all(orgPromises)).filter(org => org !== null);

      // Filtrează organizațiile inactive (soft deleted)
      const activeOrgs = orgs.filter(org => org.status === 'active');

      setOrganizations(activeOrgs);
      return activeOrgs;
    } catch (err) {
      console.error('❌ Error loading user organizations:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 📊 OBȚINERE ASOCIAȚII DIN ORGANIZAȚIE (cu statistici din sheets)
  const getOrganizationAssociations = async (organizationId) => {
    if (!organizationId) return [];

    try {
      const associationsQuery = query(
        collection(db, 'associations'),
        where('organizationId', '==', organizationId)
      );
      const snapshot = await getDocs(associationsQuery);

      // Încarcă asociațiile cu statistici din sheets
      const associations = await Promise.all(
        snapshot.docs.map(async (assocDoc) => {
          const assocData = {
            id: assocDoc.id,
            ...assocDoc.data()
          };

          // Încarcă statisticile din sheets
          try {
            const sheetsRef = collection(db, 'associations', assocDoc.id, 'sheets');
            const sheetsSnapshot = await getDocs(sheetsRef);

            if (sheetsSnapshot.size > 0) {
              let activeSheet = null;
              sheetsSnapshot.docs.forEach(sheetDoc => {
                const data = sheetDoc.data();
                if (data.status === 'in_progress') {
                  activeSheet = data;
                } else if (!activeSheet && data.status === 'published') {
                  activeSheet = data;
                }
              });

              if (activeSheet?.associationSnapshot) {
                const snapData = activeSheet.associationSnapshot;
                let totalPersons = 0;
                if (snapData.apartments && Array.isArray(snapData.apartments)) {
                  snapData.apartments.forEach(apt => {
                    totalPersons += parseInt(apt.persons || apt.noPersons || 0);
                  });
                }
                assocData.stats = {
                  totalBlocks: snapData.blocks?.length || 0,
                  totalStairs: snapData.stairs?.length || 0,
                  totalApartments: snapData.apartments?.length || 0,
                  totalPersons
                };
              }
            }
          } catch (statsErr) {
            console.warn('⚠️ Could not load stats for org association:', assocDoc.id, statsErr);
          }

          return assocData;
        })
      );

      return associations;
    } catch (err) {
      console.error('❌ Error getting organization associations:', err);
      return [];
    }
  };

  // 🔗 ALOCĂ ASOCIAȚIE LA ORGANIZAȚIE
  const allocateAssociationToOrganization = async (associationId, organizationId, allocatedByUserId) => {
    if (!associationId || !organizationId) {
      throw new Error('Association ID and Organization ID are required');
    }

    try {
      const assocRef = doc(db, 'associations', associationId);
      const orgRef = doc(db, 'organizations', organizationId);

      const [assocDoc, orgDoc] = await Promise.all([
        getDoc(assocRef),
        getDoc(orgRef)
      ]);

      if (!assocDoc.exists()) {
        throw new Error('Association not found');
      }

      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const orgData = orgDoc.data();

      // Verifică că user-ul are dreptul să aloce (e owner sau admin)
      const isOwner = orgData.ownerIds?.includes(allocatedByUserId);
      if (!isOwner) {
        throw new Error('NOT_AUTHORIZED_TO_ALLOCATE');
      }

      // Update asociația cu organizationId și billing
      await updateDoc(assocRef, {
        organizationId: organizationId,
        'billing.mode': 'organization',
        'billing.billedToOrganizationId': organizationId,
        'billing.status': orgData.billing?.status || 'trial',
        'billing.transfers': arrayUnion({
          fromMode: 'association',
          toMode: 'organization',
          fromEntityId: associationId,
          toEntityId: organizationId,
          transferredAt: new Date().toISOString(),
          reason: 'org_claimed_billing',
          initiatedBy: allocatedByUserId
        }),
        updatedAt: new Date().toISOString()
      });

      await logActivity(allocatedByUserId, 'ASSOCIATION_ALLOCATED_TO_ORG', {
        associationId,
        organizationId
      });

      return true;
    } catch (err) {
      console.error('❌ Error allocating association:', err);
      throw err;
    }
  };

  // 🔓 DEZALOCĂ ASOCIAȚIE DE LA ORGANIZAȚIE
  const deallocateAssociationFromOrganization = async (associationId, deallocatedByUserId) => {
    if (!associationId) {
      throw new Error('Association ID is required');
    }

    try {
      const assocRef = doc(db, 'associations', associationId);
      const assocDoc = await getDoc(assocRef);

      if (!assocDoc.exists()) {
        throw new Error('Association not found');
      }

      const assocData = assocDoc.data();
      const organizationId = assocData.organizationId;

      if (!organizationId) {
        throw new Error('Association is not allocated to any organization');
      }

      // Update asociația - dezlegăm de organizație
      await updateDoc(assocRef, {
        organizationId: null,
        'billing.mode': 'association',
        'billing.billedToOrganizationId': null,
        'billing.status': 'overdue',
        'billing.transfers': arrayUnion({
          fromMode: 'organization',
          toMode: 'association',
          fromEntityId: organizationId,
          toEntityId: associationId,
          transferredAt: new Date().toISOString(),
          reason: 'org_stopped_paying',
          initiatedBy: deallocatedByUserId
        }),
        updatedAt: new Date().toISOString()
      });

      // Adaugă asociația la directAssociations ale adminului
      if (assocData.adminId) {
        const adminRef = doc(db, 'users', assocData.adminId);
        const adminDoc = await getDoc(adminRef);

        if (adminDoc.exists()) {
          await updateDoc(adminRef, {
            directAssociations: arrayUnion(associationId),
            updatedAt: new Date().toISOString()
          });
        }
      }

      await logActivity(deallocatedByUserId, 'ASSOCIATION_DEALLOCATED_FROM_ORG', {
        associationId,
        previousOrganizationId: organizationId
      });

      return true;
    } catch (err) {
      console.error('❌ Error deallocating association:', err);
      throw err;
    }
  };

  // 📊 VERIFICĂ DACĂ USER E OWNER/ADMIN/MEMBER ÎN ORGANIZAȚIE
  const getUserRoleInOrganization = async (organizationId, userIdToCheck) => {
    if (!organizationId || !userIdToCheck) return null;

    try {
      const orgRef = doc(db, 'organizations', organizationId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) return null;

      const orgData = orgDoc.data();

      // Verifică dacă e owner
      if (orgData.ownerIds?.includes(userIdToCheck)) {
        return 'org_owner';
      }

      // Verifică în subcollection members
      const memberRef = doc(db, 'organizations', organizationId, 'members', userIdToCheck);
      const memberDoc = await getDoc(memberRef);

      if (memberDoc.exists()) {
        return memberDoc.data().role;
      }

      return null;
    } catch (err) {
      console.error('❌ Error getting user role in organization:', err);
      return null;
    }
  };

  // 🔄 EFFECT: Încarcă organizațiile când userId se schimbă
  useEffect(() => {
    if (userId) {
      loadUserOrganizations(userId);
    } else {
      setOrganizations([]);
      setCurrentOrganization(null);
    }
  }, [userId, loadUserOrganizations]);

  return {
    // State
    organizations,
    currentOrganization,
    loading,
    error,

    // CRUD Operations
    createOrganization,
    updateOrganization,
    softDeleteOrganization,
    loadOrganization,
    loadUserOrganizations,

    // Owner Management (Founder Privilege Light)
    addOwner,
    removeOwner,
    transferFounderStatus,

    // Association Allocation
    getOrganizationAssociations,
    allocateAssociationToOrganization,
    deallocateAssociationFromOrganization,

    // Utils
    getUserRoleInOrganization,
    setCurrentOrganization,

    // Helpers
    defaultOrganizationStructure
  };
};
