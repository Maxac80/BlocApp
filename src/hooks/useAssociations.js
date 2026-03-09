/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
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
  deleteDoc,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSecurity } from './useSecurity';
import { useUserProfile } from './useUserProfile';

/**
 * 🏠 HOOK PENTRU GESTIONAREA AVANSATĂ A ASOCIAȚIILOR
 *
 * Extinde funcționalitatea existentă din useFirestore cu:
 * - organizationId (link la firmă)
 * - president object (userId opțional)
 * - censors[] array
 * - settings pentru workflow
 * - billing information
 *
 * Structura Firebase:
 * /associations/{assocId}
 * /associations/{assocId}/members/{memberId}
 */
export const useAssociations = (userId = null) => {
  const { logActivity } = useSecurity();
  const { addDirectAssociation, removeDirectAssociation } = useUserProfile();

  const [associations, setAssociations] = useState([]);
  const [currentAssociation, setCurrentAssociation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 📋 STRUCTURA DEFAULT PENTRU ASSOCIATION (EXTINSĂ v2.0)
  const defaultAssociationStructure = {
    // Date de bază (existente)
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
    email: '',
    phone: '',
    bank: '',
    bankAccount: '',

    // Administrator principal
    adminId: '',
    adminProfile: null,

    // 🏢 NOU: Link la organizație (null = asociație directă)
    organizationId: null,

    // 👤 NOU: Președinte (poate fi user sau doar nume text)
    president: null,
    // Format: { userId: string | null, name: string, phone: string, email: string }

    // 👥 NOU: Cenzori (array, 1-3 cenzori)
    censors: [],
    // Format: [{ userId: string | null, name: string, phone: string, email: string }]

    // ⚙️ NOU: Setări workflow
    settings: {
      requirePresidentApproval: false,
      notifyPresidentOnPublish: false,
      notifyCensorsOnPublish: false,
      autoSendToOwners: false,
      penaltyEnabled: false,
      penaltyPercentage: 0.1, // 10% default
      penaltyThresholdDays: 30
    },

    // 💰 NOU: Billing (integrat din architecture)
    billing: {
      mode: 'trial', // 'trial' | 'organization' | 'association'
      billedToOrganizationId: null,
      billingContact: null,
      // Format billingContact: { name, email, phone, address }
      status: 'trial', // 'trial' | 'active' | 'overdue' | 'suspended'
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      lastPaymentAt: null,
      transfers: []
    },

    // 💳 NOU: Billing Status (pentru suspendare/reactivare de către user)
    // Acest câmp controlează dacă asociația e activă pentru facturare și editare
    billingStatus: 'active', // 'active' | 'suspended'
    billingStatusChangedAt: null,
    billingStatusChangedBy: null,
    suspensionReason: null,
    suspendedAt: null,
    reactivatedAt: null,
    // Dacă a fost suspendată de organizație (când organizația e suspendată)
    suspendedByOrganization: false,

    // Timestamps
    createdAt: null,
    updatedAt: null,
    createdBy: null
  };

  // 🏠 CREARE ASOCIAȚIE NOUĂ (EXTINSĂ)
  const createAssociation = async (associationData, creatorUserId, organizationId = null) => {
    if (!creatorUserId) {
      throw new Error('User ID is required to create association');
    }

    setLoading(true);
    setError(null);

    try {
      // Calculează data de expirare trial (90 zile)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 90);

      const now = new Date();

      const newAssociation = {
        ...defaultAssociationStructure,
        ...associationData,
        adminId: creatorUserId,
        organizationId: organizationId,
        billing: {
          ...defaultAssociationStructure.billing,
          mode: organizationId ? 'organization' : 'trial',
          billedToOrganizationId: organizationId,
          status: 'trial',
          trialEndsAt: trialEndsAt.toISOString(),
          currentPeriodStart: now.toISOString()
        },
        // Billing status - default active la creare
        billingStatus: 'active',
        billingStatusChangedAt: now.toISOString(),
        billingStatusChangedBy: creatorUserId,
        suspensionReason: null,
        suspendedAt: null,
        reactivatedAt: null,
        suspendedByOrganization: false,
        createdBy: creatorUserId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      // Creare în Firestore
      const assocRef = await addDoc(collection(db, 'associations'), newAssociation);
      const associationId = assocRef.id;

      // Creează member doc pentru creator (admin)
      // Obține datele complete ale admin-ului din user doc
      let adminName = '';
      let adminEmail = '';
      try {
        const creatorDoc = await getDoc(doc(db, 'users', creatorUserId));
        if (creatorDoc.exists()) {
          const creatorData = creatorDoc.data();
          adminName = creatorData.profile?.personalInfo?.firstName
            ? `${creatorData.profile.personalInfo.firstName} ${creatorData.profile.personalInfo.lastName || ''}`.trim()
            : creatorData.name || '';
          adminEmail = creatorData.email || '';
        }
      } catch (e) {
        console.warn('Could not fetch creator data for member doc:', e);
      }

      const memberRef = doc(db, 'associations', associationId, 'members', creatorUserId);
      await setDoc(memberRef, {
        userId: creatorUserId,
        role: 'assoc_admin',
        status: 'active',
        name: adminName,
        email: adminEmail,
        addedAt: now.toISOString(),
        joinedAt: now.toISOString()
      });

      // Dacă nu e parte dintr-o organizație, adaugă la directAssociations
      if (!organizationId) {
        await addDirectAssociation(creatorUserId, associationId);
      }

      // Log activitate
      await logActivity(creatorUserId, 'ASSOCIATION_CREATED', {
        associationId,
        associationName: associationData.name,
        organizationId
      });

      const createdAssoc = { id: associationId, ...newAssociation };
      setAssociations(prev => [...prev, createdAssoc]);

      return createdAssoc;
    } catch (err) {
      console.error('❌ Error creating association:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 📝 ACTUALIZARE ASOCIAȚIE
  const updateAssociation = async (associationId, updates) => {
    if (!associationId) {
      throw new Error('Association ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const assocRef = doc(db, 'associations', associationId);

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(assocRef, updateData);

      // Update local state
      setAssociations(prev =>
        prev.map(assoc =>
          assoc.id === associationId ? { ...assoc, ...updateData } : assoc
        )
      );

      if (currentAssociation?.id === associationId) {
        setCurrentAssociation(prev => ({ ...prev, ...updateData }));
      }

      await logActivity(userId, 'ASSOCIATION_UPDATED', {
        associationId,
        updatedFields: Object.keys(updates)
      });

      return true;
    } catch (err) {
      console.error('❌ Error updating association:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 👤 SETARE PREȘEDINTE
  const setPresident = async (associationId, presidentData) => {
    if (!associationId) {
      throw new Error('Association ID is required');
    }

    try {
      // presidentData: { userId: string | null, name: string, phone: string, email: string }
      const president = {
        userId: presidentData.userId || null,
        name: presidentData.name || '',
        phone: presidentData.phone || '',
        email: presidentData.email || ''
      };

      await updateAssociation(associationId, { president });

      // Dacă președintele are userId, adaugă în members subcollection
      if (president.userId) {
        const memberRef = doc(db, 'associations', associationId, 'members', president.userId);
        await setDoc(memberRef, {
          userId: president.userId,
          role: 'assoc_president',
          name: president.name,
          email: president.email || '',
          phone: president.phone || '',
          status: 'active',
          addedAt: new Date().toISOString(),
          joinedAt: new Date().toISOString()
        }, { merge: true });
      }

      await logActivity(userId, 'ASSOCIATION_PRESIDENT_SET', {
        associationId,
        presidentName: president.name,
        hasUserId: !!president.userId
      });

      return true;
    } catch (err) {
      console.error('❌ Error setting president:', err);
      throw err;
    }
  };

  // 👤 ELIMINARE PREȘEDINTE
  const removePresident = async (associationId) => {
    if (!associationId) {
      throw new Error('Association ID is required');
    }

    try {
      const assocRef = doc(db, 'associations', associationId);
      const assocDoc = await getDoc(assocRef);

      if (!assocDoc.exists()) {
        throw new Error('Association not found');
      }

      const currentPresident = assocDoc.data().president;

      // Dacă președintele avea userId, elimină din members
      if (currentPresident?.userId) {
        const memberRef = doc(db, 'associations', associationId, 'members', currentPresident.userId);
        await deleteDoc(memberRef).catch(() => {});
      }

      await updateAssociation(associationId, { president: null });

      await logActivity(userId, 'ASSOCIATION_PRESIDENT_REMOVED', {
        associationId
      });

      return true;
    } catch (err) {
      console.error('❌ Error removing president:', err);
      throw err;
    }
  };

  // 👥 ADĂUGARE CENZOR
  const addCensor = async (associationId, censorData) => {
    if (!associationId) {
      throw new Error('Association ID is required');
    }

    try {
      const assocRef = doc(db, 'associations', associationId);
      const assocDoc = await getDoc(assocRef);

      if (!assocDoc.exists()) {
        throw new Error('Association not found');
      }

      const currentCensors = assocDoc.data().censors || [];

      const newCensor = {
        id: `censor-${Date.now()}`,
        userId: censorData.userId || null,
        name: censorData.name || '',
        phone: censorData.phone || '',
        email: censorData.email || ''
      };

      await updateAssociation(associationId, {
        censors: [...currentCensors, newCensor]
      });

      // Dacă cenzorul are userId, adaugă în members subcollection
      if (newCensor.userId) {
        const memberRef = doc(db, 'associations', associationId, 'members', newCensor.userId);
        await setDoc(memberRef, {
          userId: newCensor.userId,
          role: 'assoc_censor',
          name: newCensor.name,
          email: newCensor.email || '',
          phone: newCensor.phone || '',
          status: 'active',
          addedAt: new Date().toISOString(),
          joinedAt: new Date().toISOString()
        }, { merge: true });
      }

      await logActivity(userId, 'ASSOCIATION_CENSOR_ADDED', {
        associationId,
        censorName: newCensor.name,
        hasUserId: !!newCensor.userId
      });

      return newCensor;
    } catch (err) {
      console.error('❌ Error adding censor:', err);
      throw err;
    }
  };

  // 👥 ELIMINARE CENZOR
  const removeCensor = async (associationId, censorId) => {
    if (!associationId || !censorId) {
      throw new Error('Association ID and Censor ID are required');
    }

    try {
      const assocRef = doc(db, 'associations', associationId);
      const assocDoc = await getDoc(assocRef);

      if (!assocDoc.exists()) {
        throw new Error('Association not found');
      }

      const currentCensors = assocDoc.data().censors || [];
      const censorToRemove = currentCensors.find(c => c.id === censorId);

      const updatedCensors = currentCensors.filter(c => c.id !== censorId);

      await updateAssociation(associationId, { censors: updatedCensors });

      // Dacă cenzorul avea userId, elimină din members
      if (censorToRemove?.userId) {
        const memberRef = doc(db, 'associations', associationId, 'members', censorToRemove.userId);
        await deleteDoc(memberRef).catch(() => {});
      }

      await logActivity(userId, 'ASSOCIATION_CENSOR_REMOVED', {
        associationId,
        censorId
      });

      return true;
    } catch (err) {
      console.error('❌ Error removing censor:', err);
      throw err;
    }
  };

  // ⚙️ ACTUALIZARE SETĂRI WORKFLOW
  const updateSettings = async (associationId, settingsUpdates) => {
    if (!associationId) {
      throw new Error('Association ID is required');
    }

    try {
      const assocRef = doc(db, 'associations', associationId);
      const assocDoc = await getDoc(assocRef);

      if (!assocDoc.exists()) {
        throw new Error('Association not found');
      }

      const currentSettings = assocDoc.data().settings || {};

      await updateAssociation(associationId, {
        settings: { ...currentSettings, ...settingsUpdates }
      });

      await logActivity(userId, 'ASSOCIATION_SETTINGS_UPDATED', {
        associationId,
        updatedSettings: Object.keys(settingsUpdates)
      });

      return true;
    } catch (err) {
      console.error('❌ Error updating settings:', err);
      throw err;
    }
  };

  // 📥 ÎNCĂRCARE ASOCIAȚIE BY ID
  const loadAssociation = async (associationId) => {
    if (!associationId) return null;

    setLoading(true);
    setError(null);

    try {
      const assocRef = doc(db, 'associations', associationId);
      const assocDoc = await getDoc(assocRef);

      if (assocDoc.exists()) {
        const assocData = { id: assocDoc.id, ...assocDoc.data() };
        setCurrentAssociation(assocData);
        return assocData;
      }

      return null;
    } catch (err) {
      console.error('❌ Error loading association:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 📥 ÎNCĂRCARE ASOCIAȚII DIRECTE ALE UTILIZATORULUI
  const loadUserDirectAssociations = useCallback(async (userIdToLoad) => {
    if (!userIdToLoad) return [];

    setLoading(true);
    setError(null);

    try {
      // Obține lista de directAssociations din user document
      const userRef = doc(db, 'users', userIdToLoad);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setAssociations([]);
        return [];
      }

      const userData = userDoc.data();
      const directAssociationIds = userData.directAssociations || [];

      if (directAssociationIds.length === 0) {
        // Fallback: caută asociații unde adminId === userId
        const adminQuery = query(
          collection(db, 'associations'),
          where('adminId', '==', userIdToLoad)
        );
        const adminSnapshot = await getDocs(adminQuery);

        // Încarcă statisticile pentru fiecare asociație
        const adminAssociations = await Promise.all(
          adminSnapshot.docs.map(async (assocDoc) => {
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
                  const snapshot = activeSheet.associationSnapshot;
                  let totalPersons = 0;
                  if (snapshot.apartments && Array.isArray(snapshot.apartments)) {
                    snapshot.apartments.forEach(apt => {
                      totalPersons += parseInt(apt.persons || apt.noPersons || 0);
                    });
                  }
                  assocData.stats = {
                    totalBlocks: snapshot.blocks?.length || 0,
                    totalStairs: snapshot.stairs?.length || 0,
                    totalApartments: snapshot.apartments?.length || 0,
                    totalPersons
                  };
                }
              }
            } catch (statsErr) {
              console.warn('⚠️ Could not load stats for association:', assocDoc.id, statsErr);
            }

            return assocData;
          })
        );

        setAssociations(adminAssociations);
        return adminAssociations;
      }

      // Încarcă detaliile fiecărei asociații + statistici din sheets
      const assocPromises = directAssociationIds.map(async (assocId) => {
        const assocRef = doc(db, 'associations', assocId);
        const assocDoc = await getDoc(assocRef);

        if (assocDoc.exists()) {
          const assocData = {
            id: assocDoc.id,
            ...assocDoc.data()
          };

          // Detectează rolul utilizatorului pe această asociație
          let detectedRole = 'assoc_admin';
          try {
            const memberDoc = await getDoc(doc(db, 'associations', assocId, 'members', userIdToLoad));
            if (memberDoc.exists() && memberDoc.data().role) {
              detectedRole = memberDoc.data().role;
            }
          } catch (e) {
            // silent - default to assoc_admin
          }
          assocData.userRole = detectedRole;

          // Încarcă statisticile din sheets
          try {
            const sheetsRef = collection(db, 'associations', assocId, 'sheets');
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
                let totalPersons = 0;
                if (snapshot.apartments && Array.isArray(snapshot.apartments)) {
                  snapshot.apartments.forEach(apt => {
                    totalPersons += parseInt(apt.persons || apt.noPersons || 0);
                  });
                }
                assocData.stats = {
                  totalBlocks: snapshot.blocks?.length || 0,
                  totalStairs: snapshot.stairs?.length || 0,
                  totalApartments: snapshot.apartments?.length || 0,
                  totalPersons
                };
              }
            }
          } catch (statsErr) {
            console.warn('⚠️ Could not load stats for association:', assocId, statsErr);
          }

          return assocData;
        }
        return null;
      });

      const assocs = (await Promise.all(assocPromises)).filter(assoc => assoc !== null);

      setAssociations(assocs);
      return assocs;
    } catch (err) {
      console.error('❌ Error loading user direct associations:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 💳 SUSPENDARE ASOCIAȚIE (de către user - nu mai plătește pentru ea)
  const suspendAssociation = async (associationId, suspendingUserId, reason = null) => {
    if (!associationId || !suspendingUserId) {
      throw new Error('Association ID and User ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();

      await updateAssociation(associationId, {
        billingStatus: 'suspended',
        billingStatusChangedAt: now.toISOString(),
        billingStatusChangedBy: suspendingUserId,
        suspensionReason: reason,
        suspendedAt: now.toISOString()
      });

      await logActivity(suspendingUserId, 'ASSOCIATION_SUSPENDED', {
        associationId,
        reason
      });

      return true;
    } catch (err) {
      console.error('❌ Error suspending association:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 💳 REACTIVARE ASOCIAȚIE (de către user - începe să plătească iar)
  const reactivateAssociation = async (associationId, reactivatingUserId) => {
    if (!associationId || !reactivatingUserId) {
      throw new Error('Association ID and User ID are required');
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();

      await updateAssociation(associationId, {
        billingStatus: 'active',
        billingStatusChangedAt: now.toISOString(),
        billingStatusChangedBy: reactivatingUserId,
        suspensionReason: null,
        reactivatedAt: now.toISOString(),
        suspendedByOrganization: false
      });

      await logActivity(reactivatingUserId, 'ASSOCIATION_REACTIVATED', {
        associationId
      });

      return true;
    } catch (err) {
      console.error('❌ Error reactivating association:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 💳 VERIFICARE DACĂ ASOCIAȚIA E SUSPENDATĂ (read-only mode)
  const isAssociationSuspended = (association) => {
    if (!association) return false;
    return association.billingStatus === 'suspended' || association.suspendedByOrganization === true;
  };

  // 📊 OBȚINERE MEMBRI ASOCIAȚIE
  const getAssociationMembers = async (associationId) => {
    if (!associationId) return [];

    try {
      const membersSnapshot = await getDocs(
        collection(db, 'associations', associationId, 'members')
      );

      return membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error('❌ Error getting association members:', err);
      return [];
    }
  };

  // 💰 VERIFICARE DACĂ POATE ȘTERGE ASOCIAȚIA (canDeleteAssociation)
  const canDeleteAssociation = async (associationId, userIdToCheck) => {
    if (!associationId || !userIdToCheck) return false;

    try {
      const assocRef = doc(db, 'associations', associationId);
      const assocDoc = await getDoc(assocRef);

      if (!assocDoc.exists()) return false;

      const assocData = assocDoc.data();
      const billing = assocData.billing || {};

      // Obține user data pentru a verifica rolul
      const userRef = doc(db, 'users', userIdToCheck);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : {};

      // Master poate oricând
      if (userData.role === 'master') return true;

      // În funcție de billing mode
      switch (billing.mode) {
        case 'trial':
          // Doar creatorul asociației
          return assocData.createdBy === userIdToCheck;

        case 'organization':
          // Doar org_owner al organizației care plătește
          if (!billing.billedToOrganizationId) return false;
          const orgRef = doc(db, 'organizations', billing.billedToOrganizationId);
          const orgDoc = await getDoc(orgRef);
          if (!orgDoc.exists()) return false;
          return orgDoc.data().ownerIds?.includes(userIdToCheck);

        case 'association':
          // Doar assoc_admin care e și billing contact
          return assocData.adminId === userIdToCheck &&
                 billing.billingContact?.email === userData.email;

        default:
          return false;
      }
    } catch (err) {
      console.error('❌ Error checking delete permission:', err);
      return false;
    }
  };

  // 🗑️ ȘTERGERE ASOCIAȚIE
  const deleteAssociation = async (associationId, deletingUserId) => {
    if (!associationId || !deletingUserId) {
      throw new Error('Association ID and User ID are required');
    }

    // Verifică permisiunea
    const canDelete = await canDeleteAssociation(associationId, deletingUserId);
    if (!canDelete) {
      throw new Error('NOT_AUTHORIZED_TO_DELETE');
    }

    setLoading(true);
    setError(null);

    try {
      const assocRef = doc(db, 'associations', associationId);

      // Elimină din directAssociations ale userului
      await removeDirectAssociation(deletingUserId, associationId);

      // Șterge asociația
      await deleteDoc(assocRef);

      // Update local state
      setAssociations(prev => prev.filter(assoc => assoc.id !== associationId));

      if (currentAssociation?.id === associationId) {
        setCurrentAssociation(null);
      }

      await logActivity(deletingUserId, 'ASSOCIATION_DELETED', {
        associationId
      });

      return true;
    } catch (err) {
      console.error('❌ Error deleting association:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 📊 OBȚINERE STATISTICI ASOCIAȚIE (din sheets - arhitectură nouă)
  const getAssociationStats = async (associationId) => {
    if (!associationId) return null;

    try {
      let totalApartments = 0;
      let totalPersons = 0;
      let totalBlocks = 0;

      // 1. Încearcă să citească din sheets (arhitectură nouă)
      const sheetsRef = collection(db, 'associations', associationId, 'sheets');
      const sheetsSnapshot = await getDocs(sheetsRef);

      if (sheetsSnapshot.size > 0) {
        // Caută sheet-ul in_progress sau cel mai recent
        let activeSheet = null;
        sheetsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'in_progress') {
            activeSheet = data;
          } else if (!activeSheet && data.status === 'published') {
            activeSheet = data;
          }
        });

        if (activeSheet?.associationSnapshot) {
          const snapshot = activeSheet.associationSnapshot;
          totalBlocks = snapshot.blocks?.length || 0;
          totalApartments = snapshot.apartments?.length || 0;

          // Calculează numărul de persoane
          if (snapshot.apartments && Array.isArray(snapshot.apartments)) {
            snapshot.apartments.forEach(apt => {
              totalPersons += parseInt(apt.persons || apt.noPersons || 0);
            });
          }

          return {
            totalApartments,
            totalPersons,
            totalBlocks
          };
        }
      }

      // 2. Fallback: citește din colecțiile vechi (pentru compatibilitate)
      const blocksQuery = query(
        collection(db, 'blocks'),
        where('associationId', '==', associationId)
      );
      const blocksSnapshot = await getDocs(blocksQuery);
      const blockIds = blocksSnapshot.docs.map(doc => doc.id);

      if (blockIds.length > 0) {
        const stairsQuery = query(
          collection(db, 'stairs'),
          where('blockId', 'in', blockIds)
        );
        const stairsSnapshot = await getDocs(stairsQuery);
        const stairIds = stairsSnapshot.docs.map(doc => doc.id);

        if (stairIds.length > 0) {
          const apartmentsQuery = query(
            collection(db, 'apartments'),
            where('stairId', 'in', stairIds)
          );
          const apartmentsSnapshot = await getDocs(apartmentsQuery);

          totalApartments = apartmentsSnapshot.size;
          apartmentsSnapshot.docs.forEach(doc => {
            const apt = doc.data();
            totalPersons += parseInt(apt.persons || apt.noPersons || 0);
          });
        }
      }

      return {
        totalApartments,
        totalPersons,
        totalBlocks: blocksSnapshot.size
      };
    } catch (err) {
      console.error('❌ Error getting association stats:', err);
      return null;
    }
  };

  // 🔄 EFFECT: Încarcă asociațiile când userId se schimbă
  useEffect(() => {
    if (userId) {
      loadUserDirectAssociations(userId);
    } else {
      setAssociations([]);
      setCurrentAssociation(null);
    }
  }, [userId, loadUserDirectAssociations]);

  // 🆕 CREARE ASOCIAȚIE DIRECTĂ (wrapper pentru modal)
  const createDirectAssociation = async (associationData) => {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    try {
      const result = await createAssociation(associationData, userId, null);
      return { success: true, association: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    // State
    associations,
    currentAssociation,
    loading,
    error,

    // CRUD Operations
    createAssociation,
    createDirectAssociation,
    updateAssociation,
    deleteAssociation,
    loadAssociation,
    loadUserDirectAssociations,

    // President & Censor Management
    setPresident,
    removePresident,
    addCensor,
    removeCensor,

    // Settings
    updateSettings,

    // Members
    getAssociationMembers,

    // Utils
    canDeleteAssociation,
    getAssociationStats,
    setCurrentAssociation,

    // 💳 Billing Status Management
    suspendAssociation,
    reactivateAssociation,
    isAssociationSuspended,

    // Helpers
    defaultAssociationStructure
  };
};
