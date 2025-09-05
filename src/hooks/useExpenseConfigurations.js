import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { defaultExpenseTypes } from '../data/expenseTypes';

const useExpenseConfigurations = (associationId) => {
  const [configurations, setConfigurations] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId) {
      setConfigurations({});
      setSuppliers([]);
      setLoading(false);
      return;
    }

    // Ascultă modificările la configurările cheltuielilor pentru această asociație
    const configRef = doc(db, 'expenseConfigurations', associationId);
    const suppliersQuery = query(
      collection(db, 'suppliers'),
      where('associationId', '==', associationId)
    );
    
    const unsubscribeConfig = onSnapshot(
      configRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setConfigurations(snapshot.data());
        } else {
          setConfigurations({});
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching expense configurations:', error);
        setConfigurations({});
        setLoading(false);
      }
    );

    // Ascultă modificările la furnizori
    const unsubscribeSuppliers = onSnapshot(
      suppliersQuery,
      (snapshot) => {
        const suppliersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSuppliers(suppliersData);
      },
      (error) => {
        console.error('Error fetching suppliers:', error);
        setSuppliers([]);
      }
    );

    return () => {
      unsubscribeConfig();
      unsubscribeSuppliers();
    };
  }, [associationId]);

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
    if (!associationId) return;

    try {
      const docRef = doc(db, 'expenseConfigurations', associationId);
      
      // Obține configurațiile existente
      const docSnap = await getDoc(docRef);
      const existingConfigs = docSnap.exists() ? docSnap.data() : {};
      
      // Actualizează configurația pentru tipul de cheltuială specific
      const updatedConfigs = {
        ...existingConfigs,
        [expenseType]: {
          ...existingConfigs[expenseType],
          ...config,
          updatedAt: new Date().toISOString()
        }
      };
      
      // Salvează în Firestore
      await setDoc(docRef, updatedConfigs);
      
      // Actualizează state-ul local pentru feedback instant
      setConfigurations(updatedConfigs);
      
      console.log('✅ Configurație actualizată pentru:', expenseType);
    } catch (error) {
      console.error('Error updating expense configuration:', error);
      throw error;
    }
  }, [associationId]);

  // Funcție pentru a corecta configurațiile greșite din Firestore
  const fixFirestoreConfigurations = useCallback(async () => {
    if (!associationId) return;

    console.log('🔧 Fixing incorrect Firestore configurations...');
    
    const corrections = [
      { name: 'Energie electrică', correctType: 'person' },
      { name: 'Întreținere lift', correctType: 'apartment' }
    ];

    for (const correction of corrections) {
      const currentConfig = configurations[correction.name];
      if (currentConfig && currentConfig.distributionType !== correction.correctType) {
        console.log(`🔄 Correcting ${correction.name}: ${currentConfig.distributionType} → ${correction.correctType}`);
        
        await updateExpenseConfig(correction.name, {
          ...currentConfig,
          distributionType: correction.correctType
        });
      }
    }
    
    console.log('✅ Firestore configurations corrected!');
  }, [associationId, configurations, updateExpenseConfig]);

  return {
    configurations,
    loading,
    getExpenseConfig,
    updateExpenseConfig,
    fixFirestoreConfigurations
  };
};

export default useExpenseConfigurations;