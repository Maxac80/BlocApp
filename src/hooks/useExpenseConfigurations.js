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

    console.log('📥 [useExpenseConfigurations] Loading configurations from sheet:', Object.keys(sheetConfigurations).length, 'configs');
    setConfigurations(sheetConfigurations);
    setSuppliers(sheetSuppliers);
    setLoading(false);

  }, [currentSheet]);

  const getExpenseConfig = useCallback((expenseOrTypeOrId) => {
    // Compatibilitate: acceptă expense object, expenseTypeId, sau expenseType (nume - backwards)
    let expenseTypeId, expenseTypeName;

    console.log('🔍 [getExpenseConfig] INPUT:', expenseOrTypeOrId);

    if (typeof expenseOrTypeOrId === 'object' && expenseOrTypeOrId !== null) {
      // Este un obiect expense
      expenseTypeId = expenseOrTypeOrId.expenseTypeId || expenseOrTypeOrId.expenseType;
      expenseTypeName = expenseOrTypeOrId.name;
    } else if (typeof expenseOrTypeOrId === 'string') {
      // Este fie ID, fie nume
      // Verificăm dacă este un ID (începe cu "expense-type-" sau "custom-")
      if (expenseOrTypeOrId.startsWith('expense-type-') || expenseOrTypeOrId.startsWith('custom-')) {
        expenseTypeId = expenseOrTypeOrId;
      } else {
        // Este nume (backwards compatibility)
        expenseTypeName = expenseOrTypeOrId;
        // Găsește ID-ul din defaultExpenseTypes
        const defaultType = defaultExpenseTypes.find(def => def.name === expenseTypeName);
        expenseTypeId = defaultType?.id;
      }
    }

    console.log('🔍 [getExpenseConfig] EXTRACTED - ID:', expenseTypeId, 'Name:', expenseTypeName);

    // Încearcă să găsește configurația în Firestore
    // Prioritate: 1) după ID (nou), 2) după nume (backwards compatibility)
    let firestoreConfig = expenseTypeId ? configurations[expenseTypeId] : null;
    if (!firestoreConfig && expenseTypeName) {
      firestoreConfig = configurations[expenseTypeName];
    }

    console.log('🔍 [getExpenseConfig] FIRESTORE CONFIG:', firestoreConfig ? {
      id: firestoreConfig.id,
      name: firestoreConfig.name,
      distributionType: firestoreConfig.distributionType,
      isCustom: firestoreConfig.isCustom
    } : 'NOT FOUND');

    // Obține participările apartamentelor pentru acest tip de cheltuială
    const allParticipations = currentSheet?.configSnapshot?.apartmentParticipations || {};
    const apartmentParticipation = {};

    // Filtrează doar participările pentru acest tip de cheltuială
    // IMPORTANT: Dacă avem name dar nu ID, încercăm să găsim ID-ul din defaultExpenseTypes
    let searchKeys = [];
    if (expenseTypeId) {
      searchKeys.push(expenseTypeId);
    }
    if (expenseTypeName) {
      searchKeys.push(expenseTypeName);
      // Dacă nu avem ID dar avem name, caută ID-ul în defaultExpenseTypes
      if (!expenseTypeId) {
        const defaultType = defaultExpenseTypes.find(def => def.name === expenseTypeName);
        if (defaultType?.id) {
          searchKeys.push(defaultType.id);
        }
      }
    }

    // Caută participările cu toate cheile posibile (ID și name)
    Object.keys(allParticipations).forEach(key => {
      for (const searchKey of searchKeys) {
        if (key.endsWith(`-${searchKey}`)) {
          const apartmentId = key.replace(`-${searchKey}`, '');
          apartmentParticipation[apartmentId] = allParticipations[key];
          break; // Găsit, nu mai căuta cu alte chei
        }
      }
    });

    // Obține configurația pentru distribuția diferenței din sheet
    // Prioritate: 1) din expenseConfigurations (NOU) 2) din differenceDistributions (VECHI)
    let differenceDistribution = firestoreConfig?.differenceDistribution ||
                                  currentSheet?.configSnapshot?.differenceDistributions?.[searchKey];

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
        const defaultType = defaultExpenseTypes.find(def =>
          def.id === expenseTypeId || def.name === expenseTypeName
        );
        const defaultDistribution = defaultType?.defaultDistribution || 'apartment';
        firestoreConfig.distributionType = defaultDistribution;
      }

      // Sincronizează numele furnizorului din lista actuală de furnizori
      if (firestoreConfig.supplierId) {
        const currentSupplier = suppliers.find(s => s.id === firestoreConfig.supplierId);
        if (currentSupplier && currentSupplier.name !== firestoreConfig.supplierName) {
          // Returnează configurația cu numele actualizat în timp real
          const result = {
            ...firestoreConfig,
            apartmentParticipation,
            differenceDistribution,
            supplierName: currentSupplier.name
          };
          console.log('✅ [getExpenseConfig] RETURN (with supplier update):', {
            id: result.id,
            name: result.name,
            distributionType: result.distributionType
          });
          return result;
        }
      }

      const result = {
        ...firestoreConfig,
        id: expenseTypeId,  // Include ID-ul
        name: expenseTypeName || firestoreConfig.name,  // Include numele
        apartmentParticipation,
        differenceDistribution
      };
      console.log('✅ [getExpenseConfig] RETURN (from firestore):', {
        id: result.id,
        name: result.name,
        distributionType: result.distributionType
      });
      return result;
    }

    // Altfel, folosește configurația default din expenseTypes
    const defaultType = defaultExpenseTypes.find(def =>
      def.id === expenseTypeId || def.name === expenseTypeName
    );
    const defaultDistribution = defaultType?.defaultDistribution || 'apartment';
    const defaultInvoiceEntryMode = defaultType?.invoiceEntryMode || 'single';
    const defaultExpenseEntryMode = defaultType?.expenseEntryMode || 'total';

    const result = {
      id: defaultType?.id,  // Include ID-ul în configurație
      name: defaultType?.name,  // Include numele pentru afișare
      distributionType: defaultDistribution,
      invoiceEntryMode: defaultInvoiceEntryMode,
      expenseEntryMode: defaultExpenseEntryMode,
      supplierId: null,
      supplierName: '',
      contractNumber: '',
      contactPerson: '',
      apartmentParticipation
    };
    console.log('✅ [getExpenseConfig] RETURN (default):', {
      id: result.id,
      name: result.name,
      distributionType: result.distributionType
    });
    return result;
  }, [configurations, suppliers, currentSheet]);

  const updateExpenseConfig = useCallback(async (expenseType, config) => {
    if (!currentSheet || !currentSheet.id) return;

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

      // Obține configurațiile existente din sheet
      const existingConfigs = currentSheet.configSnapshot?.expenseConfigurations || {};

      // 🆕 UNIFIED STRUCTURE: Asigură-te că configurația include name, id, isCustom, isEnabled
      const oldConfig = existingConfigs[expenseType] || {};
      const { differenceDistribution: oldDiff, ...oldConfigRest } = oldConfig;
      const { differenceDistribution: newDiff, ...newConfigRest } = config;

      // Determină ID-ul și numele cheltuielii
      let expenseId = config.id || oldConfig.id || expenseType;
      let expenseName = config.name || oldConfig.name;

      // Dacă expenseType este un ID (începe cu "expense-type-"), folosește-l ca ID
      if (expenseType.startsWith('expense-type-') || expenseType.startsWith('custom-')) {
        expenseId = expenseType;
      } else {
        // expenseType este un nume - găsește ID-ul din defaultExpenseTypes
        const defaultType = defaultExpenseTypes.find(def => def.name === expenseType);
        if (defaultType) {
          expenseId = defaultType.id;
          expenseName = expenseName || defaultType.name;
        }
      }

      // Determină isCustom și isEnabled
      const isCustom = config.isCustom !== undefined ? config.isCustom :
                       (oldConfig.isCustom !== undefined ? oldConfig.isCustom :
                        expenseId.startsWith('custom-'));

      const isEnabled = config.isEnabled !== undefined ? config.isEnabled :
                        (oldConfig.isEnabled !== undefined ? oldConfig.isEnabled : true);

      const updatedConfigs = {
        ...existingConfigs,
        [expenseId]: {
          ...oldConfigRest,
          ...newConfigRest,
          // 🆕 Asigură-te că aceste câmpuri există întotdeauna
          id: expenseId,
          name: expenseName,
          isCustom: isCustom,
          isEnabled: isEnabled,
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

      // Dacă cheia veche (name-based) este diferită de noua cheie (ID-based), șterge cheia veche
      if (expenseType !== expenseId && existingConfigs[expenseType]) {
        delete updatedConfigs[expenseType];
        console.log(`🔄 Migrare configurație: "${expenseType}" → "${expenseId}"`);
      }

      // Salvează în sheet-ul curent
      await updateDoc(sheetRef, {
        'configSnapshot.expenseConfigurations': updatedConfigs,
        'configSnapshot.updatedAt': serverTimestamp()
      });

      // Actualizează state-ul local pentru feedback instant
      console.log('💾 [updateExpenseConfig] Actualizare state local pentru:', expenseId, 'cu distributionType:', updatedConfigs[expenseId]?.distributionType);
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

  // 🔄 AUTO-MIGRAȚIE PARTICIPĂRI: Convertește participările vechi (name-based) în ID-based
  useEffect(() => {
    if (!currentSheet?.id) {
      return;
    }

    const migrateParticipations = async () => {
      const allParticipations = currentSheet.configSnapshot?.apartmentParticipations || {};

      // Verifică dacă există participări cu chei vechi (fără "expense-type-")
      const oldKeys = Object.keys(allParticipations).filter(key => {
        const parts = key.split('-');
        // Cheile vechi au formatul "apt-{id}-{name}" (3 părți)
        // Cheile noi au formatul "apt-{id}-expense-type-{slug}" (5+ părți)
        return parts.length === 3 && parts[0] === 'apt';
      });

      if (oldKeys.length === 0) {
        return; // Nu e nevoie de migrație
      }

      console.log(`🔄 Migrare participări: ${oldKeys.length} chei vechi găsite`);

      const updatedParticipations = { ...allParticipations };
      let migratedCount = 0;

      oldKeys.forEach(oldKey => {
        // Extrage apartamentId și numele cheltuielii din cheia veche
        // Format: "apt-22-Canal" → apartmentId="apt-22", name="Canal"
        const parts = oldKey.split('-');
        const apartmentId = `${parts[0]}-${parts[1]}`; // "apt-22"
        const expenseName = parts[2]; // "Canal"

        // Găsește expenseTypeId din defaultExpenseTypes
        const defaultType = defaultExpenseTypes.find(def => def.name === expenseName);

        if (defaultType?.id) {
          const newKey = `${apartmentId}-${defaultType.id}`;

          // Copiază participarea la noua cheie (doar dacă nu există deja)
          if (!updatedParticipations[newKey]) {
            updatedParticipations[newKey] = allParticipations[oldKey];
            console.log(`  ✓ ${oldKey} → ${newKey}`, allParticipations[oldKey]);
            migratedCount++;
          }

          // Șterge cheia veche
          delete updatedParticipations[oldKey];
        } else {
          console.warn(`  ⚠️ Nu s-a găsit ID pentru "${expenseName}" - cheia ${oldKey} rămâne`);
        }
      });

      if (migratedCount > 0) {
        try {
          const sheetRef = doc(db, 'sheets', currentSheet.id);
          await updateDoc(sheetRef, {
            'configSnapshot.apartmentParticipations': updatedParticipations,
            'configSnapshot.updatedAt': serverTimestamp()
          });

          console.log(`✅ Migrare participări completă: ${migratedCount} chei actualizate`);
        } catch (error) {
          console.error('❌ Eroare la migrarea participărilor:', error);
        }
      }
    };

    migrateParticipations();
  }, [currentSheet?.id]); // Rulează o singură dată când se încarcă sheet-ul

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