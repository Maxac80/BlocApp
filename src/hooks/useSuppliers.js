import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

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
    if (!currentSheet || !currentSheet.id) return;

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

      const sheetRef = doc(db, 'sheets', currentSheet.id);
      await updateDoc(sheetRef, {
        'configSnapshot.suppliers': updatedSuppliers,
        'configSnapshot.updatedAt': serverTimestamp()
      });

      // Actualizează state-ul local pentru feedback instant
      setSuppliers(updatedSuppliers);

      console.log('✅ SHEET-BASED: Furnizor adăugat în sheet:', currentSheet.monthYear);
      return newSupplier;
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

      const sheetRef = doc(db, 'sheets', currentSheet.id);
      await updateDoc(sheetRef, {
        'configSnapshot.suppliers': updatedSuppliers,
        'configSnapshot.updatedAt': serverTimestamp()
      });

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

      const sheetRef = doc(db, 'sheets', currentSheet.id);
      await updateDoc(sheetRef, {
        'configSnapshot.suppliers': updatedSuppliers,
        'configSnapshot.updatedAt': serverTimestamp()
      });

      setSuppliers(updatedSuppliers);
      console.log('✅ SHEET-BASED: Furnizor șters din sheet:', currentSheet.monthYear);
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