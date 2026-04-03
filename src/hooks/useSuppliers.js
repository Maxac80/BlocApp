import { useState, useEffect, useCallback } from 'react';
import {
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
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

      const updateData = {
        'configSnapshot.suppliers': updatedSuppliers,
        'configSnapshot.updatedAt': serverTimestamp()
      };

      // Sincronizează serviceTypes cu expenseConfigurations
      if (supplierData.serviceTypes?.length > 0) {
        const currentConfigs = currentSheet.configSnapshot?.expenseConfigurations || {};
        const updatedConfigs = { ...currentConfigs };

        supplierData.serviceTypes.forEach(expenseId => {
          const config = updatedConfigs[expenseId] || {};
          const existingSuppliers = config.suppliers || [];
          // Adaugă furnizorul doar dacă nu există deja
          if (!existingSuppliers.some(s => s.supplierId === newSupplier.id)) {
            updatedConfigs[expenseId] = {
              ...config,
              suppliers: [...existingSuppliers, { supplierId: newSupplier.id, supplierName: newSupplier.name }],
              // Backward compat: setează și câmpurile singulare dacă e primul furnizor
              ...(!config.supplierId ? { supplierId: newSupplier.id, supplierName: newSupplier.name } : {})
            };
          }
        });

        updateData['configSnapshot.expenseConfigurations'] = updatedConfigs;
      }

      const sheetRef = getSheetRef(currentSheet.associationId, currentSheet.id);
      await updateDoc(sheetRef, updateData);

      // Actualizează state-ul local pentru feedback instant
      setSuppliers(updatedSuppliers);

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

      // Sincronizează serviceTypes și/sau name cu expenseConfigurations
      if (updates.name || updates.serviceTypes) {
        const currentConfigurations = currentSheet.configSnapshot?.expenseConfigurations || {};
        const updatedConfigurations = { ...currentConfigurations };
        const supplierName = updates.name || currentSuppliers.find(s => s.id === supplierId)?.name || '';
        const newServiceTypes = updates.serviceTypes || currentSuppliers.find(s => s.id === supplierId)?.serviceTypes || [];
        const oldServiceTypes = currentSuppliers.find(s => s.id === supplierId)?.serviceTypes || [];

        // Actualizează supplierName în toate configurațiile existente
        if (updates.name) {
          Object.keys(updatedConfigurations).forEach(expenseType => {
            const config = updatedConfigurations[expenseType];
            if (config.supplierId === supplierId) {
              updatedConfigurations[expenseType] = { ...config, supplierName: updates.name };
            }
            // Actualizează și în array-ul suppliers
            if (config.suppliers?.some(s => s.supplierId === supplierId)) {
              updatedConfigurations[expenseType] = {
                ...updatedConfigurations[expenseType],
                suppliers: (updatedConfigurations[expenseType].suppliers || []).map(s =>
                  s.supplierId === supplierId ? { ...s, supplierName: updates.name } : s
                )
              };
            }
          });
        }

        // Sincronizează serviceTypes: adaugă la cheltuieli noi, scoate din cele vechi
        if (updates.serviceTypes) {
          // Adaugă furnizorul la cheltuielile noi selectate
          newServiceTypes.forEach(expenseId => {
            const config = updatedConfigurations[expenseId] || {};
            const existingSuppliers = config.suppliers || [];
            if (!existingSuppliers.some(s => s.supplierId === supplierId)) {
              updatedConfigurations[expenseId] = {
                ...config,
                suppliers: [...existingSuppliers, { supplierId, supplierName }],
                ...(!config.supplierId ? { supplierId, supplierName } : {})
              };
            }
          });

          // Scoate furnizorul din cheltuielile debifate
          const removedExpenses = oldServiceTypes.filter(id => !newServiceTypes.includes(id));
          removedExpenses.forEach(expenseId => {
            const config = updatedConfigurations[expenseId];
            if (config) {
              const filteredSuppliers = (config.suppliers || []).filter(s => s.supplierId !== supplierId);
              updatedConfigurations[expenseId] = {
                ...config,
                suppliers: filteredSuppliers,
                // Dacă am scos ultimul furnizor, curăță și câmpurile singulare
                ...(config.supplierId === supplierId ? {
                  supplierId: filteredSuppliers[0]?.supplierId || null,
                  supplierName: filteredSuppliers[0]?.supplierName || ''
                } : {})
              };
            }
          });
        }

        updateData['configSnapshot.expenseConfigurations'] = updatedConfigurations;
      }

      const sheetRef = getSheetRef(currentSheet.associationId, currentSheet.id);
      await updateDoc(sheetRef, updateData);

      setSuppliers(updatedSuppliers);
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
        // Filtrează furnizorul din array-ul suppliers
        const filteredSuppliers = (config.suppliers || []).filter(s => s.supplierId !== supplierId);
        const wasInSuppliers = (config.suppliers || []).length !== filteredSuppliers.length;
        const wasPrimary = config.supplierId === supplierId;

        if (wasPrimary || wasInSuppliers) {
          updatedConfigurations[expenseType] = {
            ...config,
            suppliers: filteredSuppliers,
            // Dacă era furnizorul principal, promovează următorul sau curăță
            supplierId: wasPrimary ? (filteredSuppliers[0]?.supplierId || null) : config.supplierId,
            supplierName: wasPrimary ? (filteredSuppliers[0]?.supplierName || '') : config.supplierName,
            ...(wasPrimary && filteredSuppliers.length === 0 ? { contractNumber: '', contactPerson: '' } : {})
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
    } catch (error) {
      console.error('Error deleting supplier from sheet:', error);
      setError(error.message);
      throw error;
    }
  }, [currentSheet]);

  // Actualizează DOAR serviceTypes pe furnizor, fără a atinge expenseConfigurations
  // Folosit de sync bidirecțional din ExpenseConfigModal (care deja salvează config-ul)
  const updateSupplierServiceTypes = useCallback(async (supplierId, serviceTypes) => {
    if (!currentSheet || !currentSheet.id) return;

    try {
      const currentSuppliers = currentSheet.configSnapshot?.suppliers || [];
      const updatedSuppliers = currentSuppliers.map(supplier =>
        supplier.id === supplierId
          ? { ...supplier, serviceTypes, updatedAt: new Date().toISOString() }
          : supplier
      );

      const sheetRef = getSheetRef(currentSheet.associationId, currentSheet.id);
      await updateDoc(sheetRef, {
        'configSnapshot.suppliers': updatedSuppliers,
        'configSnapshot.updatedAt': serverTimestamp()
      });

      setSuppliers(updatedSuppliers);
    } catch (error) {
      console.error('Error updating supplier serviceTypes:', error);
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
    updateSupplierServiceTypes,
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