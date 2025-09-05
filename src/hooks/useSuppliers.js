import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';

const useSuppliers = (associationId) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!associationId) {
      setSuppliers([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'suppliers'),
      where('associationId', '==', associationId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const suppliersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSuppliers(suppliersData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching suppliers:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId]);

  const addSupplier = useCallback(async (supplierData) => {
    try {
      const newSupplier = {
        ...supplierData,
        associationId,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      const docRef = await addDoc(collection(db, 'suppliers'), newSupplier);
      return { id: docRef.id, ...newSupplier };
    } catch (error) {
      console.error('Error adding supplier:', error);
      setError(error.message);
      throw error;
    }
  }, [associationId]);

  const updateSupplier = useCallback(async (supplierId, updates) => {
    try {
      const supplierRef = doc(db, 'suppliers', supplierId);
      await updateDoc(supplierRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const deleteSupplier = useCallback(async (supplierId) => {
    try {
      await deleteDoc(doc(db, 'suppliers', supplierId));
    } catch (error) {
      console.error('Error deleting supplier:', error);
      setError(error.message);
      throw error;
    }
  }, []);

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