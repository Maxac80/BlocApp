import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { getSheetRef } from '../utils/firestoreHelpers';

const useSuppliers = (currentSheet) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentSheet) {
      setSuppliers([]);
      setLoading(false);
      return;
    }

    // Citește furnizorii din sheet-ul curent
    const sheetSuppliers = currentSheet.configSnapshot?.suppliers || [];
    setSuppliers(sheetSuppliers);
    setLoading(false);
    setError(null);

  }, [currentSheet]);

  const addSupplier = useCallback(async (supplierData) => {
    if (!currentSheet || !currentSheet.id) return null;

    try {
      const newSupplier = {
        ...supplierData,
        id: Date.now().toString(), // Generate a simple ID
        associationId: currentSheet.associationId,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      // Actualizează furnizorii în sheet
      const currentSuppliers = currentSheet.configSnapshot?.suppliers || [];
      const updatedSuppliers = [...currentSuppliers, newSupplier];

      const sheetRef = getSheetRef(currentSheet.associationId, currentSheet.id);
      await updateDoc(sheetRef, {
        'configSnapshot.suppliers': updatedSuppliers,
        'configSnapshot.updatedAt': serverTimestamp()
      });

      // Actualizează state-ul local pentru feedback instant
      setSuppliers(updatedSuppliers);

      console.log('✅ SHEET-BASED: Furnizor adăugat în sheet:', currentSheet.monthYear);
      return newSupplier; // Returnează furnizorul nou creat
    } catch (error) {
      console.error('Error adding supplier to sheet:', error);
      setError(error.message);
      throw error;
    }
  }, [currentSheet]);

  const updateSupplier = useCallback(async (supplierId, updates) => {
    if (!currentSheet || !currentSheet.id) return;

    try {
      const currentSuppliers = currentSheet.configSnapshot?.suppliers || [];
      const updatedSuppliers = currentSuppliers.map(supplier =>
        supplier.id === supplierId
          ? { ...supplier, ...updates, updatedAt: new Date().toISOString() }
          : supplier
      );

      // Dacă se schimbă numele furnizorului, actualizează și în expenseConfigurations
      const updateData = {
        'configSnapshot.suppliers': updatedSuppliers,
        'configSnapshot.updatedAt': serverTimestamp()
      };

      if (updates.name) {
        const currentConfigurations = currentSheet.configSnapshot?.expenseConfigurations || {};
        const updatedConfigurations = {};

        // Actualizează supplierName în toate configurațiile care folosesc acest furnizor
        Object.keys(currentConfigurations).forEach(expenseType => {
          const config = currentConfigurations[expenseType];
          if (config.supplierId === supplierId) {
            updatedConfigurations[expenseType] = {
              ...config,
              supplierName: updates.name
            };
          } else {
            updatedConfigurations[expenseType] = config;
          }
        });

        // Adaugă configurațiile actualizate la update
        if (Object.keys(updatedConfigurations).length > 0) {
          updateData['configSnapshot.expenseConfigurations'] = updatedConfigurations;
        }
      }

      const sheetRef = getSheetRef(currentSheet.associationId, currentSheet.id);
      await updateDoc(sheetRef, updateData);

      setSuppliers(updatedSuppliers);
      console.log('✅ SHEET-BASED: Furnizor actualizat în sheet:', currentSheet.monthYear);
    } catch (error) {
      console.error('Error updating supplier in sheet:', error);
      setError(error.message);
      throw error;
    }
  }, [currentSheet]);

  const deleteSupplier = useCallback(async (supplierId) => {
    if (!currentSheet || !currentSheet.id) return;

    try {
      const currentSuppliers = currentSheet.configSnapshot?.suppliers || [];
      const updatedSuppliers = currentSuppliers.filter(supplier => supplier.id !== supplierId);

      // Actualizează și expenseConfigurations pentru a elimina furnizorul
      const currentConfigurations = currentSheet.configSnapshot?.expenseConfigurations || {};
      const updatedConfigurations = {};

      Object.keys(currentConfigurations).forEach(expenseType => {
        const config = currentConfigurations[expenseType];
        if (config.supplierId === supplierId) {
          // Elimină furnizorul și datele asociate din configurația cheltuielii
          updatedConfigurations[expenseType] = {
            ...config,
            supplierId: null,
            supplierName: '',
            contractNumber: '',
            contactPerson: ''
          };
        } else {
          updatedConfigurations[expenseType] = config;
        }
      });

      const sheetRef = getSheetRef(currentSheet.associationId, currentSheet.id);
      await updateDoc(sheetRef, {
        'configSnapshot.suppliers': updatedSuppliers,
        'configSnapshot.expenseConfigurations': updatedConfigurations,
        'configSnapshot.updatedAt': serverTimestamp()
      });

      setSuppliers(updatedSuppliers);
      console.log('✅ SHEET-BASED: Furnizor șters din sheet și eliminat din configurații:', currentSheet.monthYear);
    } catch (error) {
      console.error('Error deleting supplier from sheet:', error);
      setError(error.message);
      throw error;
    }
  }, [currentSheet]);

  const getSuppliersByExpenseType = useCallback((expenseType) => {
    return suppliers.filter(supplier => 
      supplier.serviceTypes && 
      supplier.serviceTypes.includes(expenseType) &&
      supplier.isActive
    );
  }, [suppliers]);

  return {
    suppliers,
    loading,
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSuppliersByExpenseType
  };
};

export default useSuppliers;