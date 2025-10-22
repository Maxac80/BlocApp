import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { defaultExpenseTypes } from '../data/expenseTypes';

const useExpenseConfigurations = (currentSheet) => {
  const [configurations, setConfigurations] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSheet) {
      setConfigurations({});
      setSuppliers([]);
      setLoading(false);
      return;
    }

    // Citește configurările și furnizorii din sheet-ul curent
    const sheetConfigurations = currentSheet.configSnapshot?.expenseConfigurations || {};
    const sheetSuppliers = currentSheet.configSnapshot?.suppliers || [];

    setConfigurations(sheetConfigurations);
    setSuppliers(sheetSuppliers);
    setLoading(false);

  }, [currentSheet]);

  const getExpenseConfig = useCallback((expenseType) => {
    // Încearcă să găsească configurația în Firestore
    const firestoreConfig = configurations[expenseType];

    // Obține participările apartamentelor pentru acest tip de cheltuială
    const allParticipations = currentSheet?.configSnapshot?.apartmentParticipations || {};
    const apartmentParticipation = {};

    // Filtrează doar participările pentru acest tip de cheltuială
    Object.keys(allParticipations).forEach(key => {
      if (key.endsWith(`-${expenseType}`)) {
        const apartmentId = key.replace(`-${expenseType}`, '');
        apartmentParticipation[apartmentId] = allParticipations[key];
      }
    });

    // Obține configurația pentru distribuția diferenței din sheet
    // Prioritate: 1) din expenseConfigurations (NOU) 2) din differenceDistributions (VECHI)
    let differenceDistribution = firestoreConfig?.differenceDistribution ||
                                  currentSheet?.configSnapshot?.differenceDistributions?.[expenseType];

    // MIGRAȚIE: Curăță câmpurile vechi și convertește în noua structură
    let needsMigration = false;
    if (differenceDistribution) {
      const cleanConfig = {
        method: differenceDistribution.method || 'apartment',
        adjustmentMode: differenceDistribution.adjustmentMode || 'none',
        apartmentTypeRatios: differenceDistribution.apartmentTypeRatios || {},
        includeFixedAmountInDifference: differenceDistribution.includeFixedAmountInDifference !== false,
        includeExcludedInDifference: differenceDistribution.includeExcludedInDifference || false
      };

      // MIGRAȚIE: Conversii pentru câmpuri vechi
      // 1. respectParticipation (boolean vechi) → adjustmentMode (string nou)
      if ('respectParticipation' in differenceDistribution) {
        cleanConfig.adjustmentMode = differenceDistribution.respectParticipation ? 'participation' : 'none';
        needsMigration = true;
      }

      // 2. distributionType (câmp greșit în differenceDistribution) → ignoră
      if ('distributionType' in differenceDistribution) {
        needsMigration = true;
      }

      differenceDistribution = cleanConfig;
    }

    if (firestoreConfig) {
      // Verifică dacă lipsește distributionType și completează cu default-ul
      if (!firestoreConfig.distributionType) {
        const defaultType = defaultExpenseTypes.find(def => def.name === expenseType);
        const defaultDistribution = defaultType?.defaultDistribution || 'apartment';
        firestoreConfig.distributionType = defaultDistribution;
      }

      // Sincronizează numele furnizorului din lista actuală de furnizori
      if (firestoreConfig.supplierId) {
        const currentSupplier = suppliers.find(s => s.id === firestoreConfig.supplierId);
        if (currentSupplier && currentSupplier.name !== firestoreConfig.supplierName) {
          // Returnează configurația cu numele actualizat în timp real
          return {
            ...firestoreConfig,
            apartmentParticipation,
            differenceDistribution,
            supplierName: currentSupplier.name
          };
        }
      }

      return {
        ...firestoreConfig,
        apartmentParticipation,
        differenceDistribution
      };
    }

    // Altfel, folosește configurația default din expenseTypes
    const defaultType = defaultExpenseTypes.find(def => def.name === expenseType);
    const defaultDistribution = defaultType?.defaultDistribution || 'apartment';
    const defaultInvoiceEntryMode = defaultType?.invoiceEntryMode || 'single';
    const defaultExpenseEntryMode = defaultType?.expenseEntryMode || 'total';


    return {
      distributionType: defaultDistribution,
      invoiceEntryMode: defaultInvoiceEntryMode,
      expenseEntryMode: defaultExpenseEntryMode,
      supplierId: null,
      supplierName: '',
      contractNumber: '',
      contactPerson: '',
      apartmentParticipation
    };
  }, [configurations, suppliers, currentSheet]);

  const updateExpenseConfig = useCallback(async (expenseType, config) => {
    if (!currentSheet || !currentSheet.id) return;

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

      // Obține configurațiile existente din sheet
      const existingConfigs = currentSheet.configSnapshot?.expenseConfigurations || {};

      // Actualizează configurația pentru tipul de cheltuială specific
      // IMPORTANT: Pentru differenceDistribution, NU facem merge - înlocuim complet
      const oldConfig = existingConfigs[expenseType] || {};
      const { differenceDistribution: oldDiff, ...oldConfigRest } = oldConfig;
      const { differenceDistribution: newDiff, ...newConfigRest } = config;

      const updatedConfigs = {
        ...existingConfigs,
        [expenseType]: {
          ...oldConfigRest,
          ...newConfigRest,
          // Înlocuiește complet differenceDistribution (nu face merge!)
          differenceDistribution: newDiff || oldDiff || {
            method: 'apartment',
            adjustmentMode: 'none',
            apartmentTypeRatios: {},
            includeFixedAmountInDifference: true,
            includeExcludedInDifference: false
          },
          updatedAt: new Date().toISOString()
        }
      };

      // Salvează în sheet-ul curent
      await updateDoc(sheetRef, {
        'configSnapshot.expenseConfigurations': updatedConfigs,
        'configSnapshot.updatedAt': serverTimestamp()
      });

      // Actualizează state-ul local pentru feedback instant
      setConfigurations(updatedConfigs);
    } catch (error) {
      console.error('Error updating expense configuration in sheet:', error);
      throw error;
    }
  }, [currentSheet]);

  // Funcție pentru a corecta configurațiile greșite din Firestore
  const fixFirestoreConfigurations = useCallback(async () => {
    if (!currentSheet) return;

    // console.log('🔧 Fixing incorrect Firestore configurations...');
    
    const corrections = [
      { name: 'Energie electrică', correctType: 'person' },
      { name: 'Întreținere lift', correctType: 'apartment' }
    ];

    for (const correction of corrections) {
      const currentConfig = configurations[correction.name];
      if (currentConfig && currentConfig.distributionType !== correction.correctType) {
        // console.log(`🔄 Correcting ${correction.name}: ${currentConfig.distributionType} → ${correction.correctType}`);
        
        await updateExpenseConfig(correction.name, {
          ...currentConfig,
          distributionType: correction.correctType
        });
      }
    }
    
    // console.log('✅ Firestore configurations corrected!');
  }, [currentSheet, configurations, updateExpenseConfig]);

  const deleteExpenseConfig = useCallback(async (expenseType) => {
    if (!currentSheet?.id) {
      console.warn('⚠️ Nu există sheet pentru ștergerea configurației cheltuielii');
      return;
    }

    try {
      const currentConfigurations = currentSheet.configSnapshot?.expenseConfigurations || {};

      // Creează o copie fără configurația cheltuielii ștearse
      const { [expenseType]: deletedConfig, ...updatedConfigurations } = currentConfigurations;

      // Actualizează în Firebase
      await updateDoc(doc(db, 'sheets', currentSheet.id), {
        'configSnapshot.expenseConfigurations': updatedConfigurations,
        updatedAt: serverTimestamp()
      });

      // Actualizează state-ul local
      setConfigurations(updatedConfigurations);
    } catch (error) {
      console.error(`❌ Eroare la ștergerea configurației pentru "${expenseType}":`, error);
      throw error;
    }
  }, [currentSheet]);

  // 🏠 SALVARE PARTICIPĂRI APARTAMENTE
  const saveApartmentParticipations = useCallback(async (participations) => {
    if (!currentSheet?.id) {
      console.warn('⚠️ Nu există sheet pentru salvarea participărilor');
      return;
    }

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

      // Salvează participările în sheet
      await updateDoc(sheetRef, {
        'configSnapshot.apartmentParticipations': participations,
        'configSnapshot.updatedAt': serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Eroare la salvarea participărilor apartamente în sheet:', error);
      throw error;
    }
  }, [currentSheet]);

  // 🔄 AUTO-MIGRAȚIE: Curăță automat configurațiile vechi când se încarcă sheet-ul
  useEffect(() => {
    if (!currentSheet?.id || !configurations) {
      return;
    }

    const migrateConfigurations = async () => {
      let hasChanges = false;
      const updatedConfigs = { ...configurations };

      Object.keys(configurations).forEach(expenseType => {
        const config = configurations[expenseType];
        const diff = config?.differenceDistribution;

        if (diff && ('respectParticipation' in diff || 'distributionType' in diff)) {
          // Curăță differenceDistribution
          const cleanDiff = {
            method: diff.method || 'apartment',
            adjustmentMode: diff.adjustmentMode || 'none',
            apartmentTypeRatios: diff.apartmentTypeRatios || {},
            includeFixedAmountInDifference: diff.includeFixedAmountInDifference !== false,
            includeExcludedInDifference: diff.includeExcludedInDifference || false
          };

          // Conversii pentru câmpuri vechi
          if ('respectParticipation' in diff) {
            cleanDiff.adjustmentMode = diff.respectParticipation ? 'participation' : 'none';
          }

          updatedConfigs[expenseType] = {
            ...config,
            differenceDistribution: cleanDiff
          };

          hasChanges = true;
        }
      });

      if (hasChanges) {
        try {
          const sheetRef = doc(db, 'sheets', currentSheet.id);
          await updateDoc(sheetRef, {
            'configSnapshot.expenseConfigurations': updatedConfigs,
            'configSnapshot.updatedAt': serverTimestamp()
          });

          setConfigurations(updatedConfigs);
        } catch (error) {
          console.error('❌ Eroare la auto-migrație:', error);
        }
      }
    };

    migrateConfigurations();
  }, [currentSheet?.id, configurations]); // Rulează când se schimbă sheet-ul sau configurațiile

  return {
    configurations,
    suppliers,
    loading,
    getExpenseConfig,
    updateExpenseConfig,
    deleteExpenseConfig,
    saveApartmentParticipations,
    fixFirestoreConfigurations
  };
};

export default useExpenseConfigurations;