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
            supplierName: currentSupplier.name
          };
        }
      }
      
      return firestoreConfig;
    }
    
    // Altfel, folosește configurația default din expenseTypes
    const defaultType = defaultExpenseTypes.find(def => def.name === expenseType);
    const defaultDistribution = defaultType?.defaultDistribution || 'apartment';
    
    
    return {
      distributionType: defaultDistribution,
      supplierId: null,
      supplierName: '',
      contractNumber: '',
      contactPerson: ''
    };
  }, [configurations, suppliers]);

  const updateExpenseConfig = useCallback(async (expenseType, config) => {
    if (!currentSheet || !currentSheet.id) return;

    try {
      const sheetRef = doc(db, 'sheets', currentSheet.id);

      // Obține configurațiile existente din sheet
      const existingConfigs = currentSheet.configSnapshot?.expenseConfigurations || {};

      // Actualizează configurația pentru tipul de cheltuială specific
      const updatedConfigs = {
        ...existingConfigs,
        [expenseType]: {
          ...existingConfigs[expenseType],
          ...config,
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

      console.log('✅ SHEET-BASED: Configurație actualizată pentru:', expenseType, 'în sheet:', currentSheet.monthYear);
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

      console.log(`✅ Configurația pentru "${expenseType}" ștearsă cu succes`);
    } catch (error) {
      console.error(`❌ Eroare la ștergerea configurației pentru "${expenseType}":`, error);
      throw error;
    }
  }, [currentSheet]);

  return {
    configurations,
    suppliers,
    loading,
    getExpenseConfig,
    updateExpenseConfig,
    deleteExpenseConfig,
    fixFirestoreConfigurations
  };
};

export default useExpenseConfigurations;