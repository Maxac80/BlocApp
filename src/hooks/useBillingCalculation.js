import { useState, useCallback } from 'react';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 💰 HOOK PENTRU CALCULUL BILLING-ULUI
 *
 * Funcționalități:
 * - Contorizare apartamente active (cu cel puțin un sheet publicat)
 * - Excludere asociații suspendate din facturare
 * - Calcul preț total cu discount
 * - Generare detalii pentru factură
 *
 * Definiție "Apartament Activ":
 * - Aparține unei asociații ACTIVE (billingStatus !== 'suspended')
 * - A fost inclus în cel puțin un sheet PUBLICAT (status === 'published')
 */
export const useBillingCalculation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [billingStats, setBillingStats] = useState(null);

  /**
   * Obține toate asociațiile unui user (directe + din organizații)
   */
  const getUserAssociations = async (userId) => {
    if (!userId) return [];

    const associations = [];

    try {
      // 1. Obține datele user-ului
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) return [];

      const userData = userDoc.data();

      // 2. Încarcă asociațiile directe
      const directAssociationIds = userData.directAssociations || [];
      for (const assocId of directAssociationIds) {
        try {
          const assocRef = doc(db, 'associations', assocId);
          const assocDoc = await getDoc(assocRef);
          if (assocDoc.exists()) {
            associations.push({
              id: assocDoc.id,
              ...assocDoc.data(),
              source: 'direct'
            });
          }
        } catch (err) {
          console.warn(`Could not load direct association ${assocId}:`, err);
        }
      }

      // 3. Încarcă asociațiile din organizații
      const userOrganizations = userData.organizations || [];
      for (const orgEntry of userOrganizations) {
        try {
          const orgAssociationsQuery = query(
            collection(db, 'associations'),
            where('organizationId', '==', orgEntry.id)
          );
          const orgAssocsSnapshot = await getDocs(orgAssociationsQuery);

          orgAssocsSnapshot.docs.forEach(assocDoc => {
            // Evită duplicatele
            if (!associations.find(a => a.id === assocDoc.id)) {
              associations.push({
                id: assocDoc.id,
                ...assocDoc.data(),
                source: 'organization',
                organizationId: orgEntry.id
              });
            }
          });
        } catch (err) {
          console.warn(`Could not load org ${orgEntry.id} associations:`, err);
        }
      }

      // 4. Fallback: caută asociații unde adminId === userId
      if (associations.length === 0) {
        const adminQuery = query(
          collection(db, 'associations'),
          where('adminId', '==', userId)
        );
        const adminSnapshot = await getDocs(adminQuery);

        adminSnapshot.docs.forEach(assocDoc => {
          if (!associations.find(a => a.id === assocDoc.id)) {
            associations.push({
              id: assocDoc.id,
              ...assocDoc.data(),
              source: 'admin'
            });
          }
        });
      }

      return associations;
    } catch (err) {
      console.error('❌ Error getting user associations:', err);
      return [];
    }
  };

  /**
   * Contorizează apartamentele active pentru un user
   * Returnează total și detalii per asociație
   */
  const countActiveApartments = useCallback(async (userId) => {
    if (!userId) {
      return {
        total: 0,
        billableAssociations: [],
        suspendedAssociations: [],
        error: 'User ID is required'
      };
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obține toate asociațiile user-ului
      const associations = await getUserAssociations(userId);

      let totalActiveApartments = 0;
      const billableAssociations = [];
      const suspendedAssociations = [];

      for (const association of associations) {
        // 2. SKIP asociații suspendate (nu se facturează)
        if (association.billingStatus === 'suspended' || association.suspendedByOrganization === true) {
          suspendedAssociations.push({
            associationId: association.id,
            name: association.name,
            status: 'suspended',
            suspendedByOrganization: association.suspendedByOrganization || false,
            source: association.source
          });
          continue; // Nu contorizăm
        }

        // 3. Query sheets publicate pentru această asociație
        const sheetsRef = collection(db, 'associations', association.id, 'sheets');
        const publishedQuery = query(sheetsRef, where('status', '==', 'published'));

        let publishedSheets;
        try {
          publishedSheets = await getDocs(publishedQuery);
        } catch (err) {
          console.warn(`Could not load sheets for association ${association.id}:`, err);
          continue;
        }

        // 4. Obține apartment IDs unice din toate sheet-urile publicate
        const activeApartmentIds = new Set();

        publishedSheets.forEach(sheetDoc => {
          const sheetData = sheetDoc.data();
          const maintenanceTable = sheetData.maintenanceTable || [];

          maintenanceTable.forEach(entry => {
            if (entry.apartmentId) {
              activeApartmentIds.add(entry.apartmentId);
            }
          });
        });

        const count = activeApartmentIds.size;

        // Adaugă doar dacă are apartamente active
        if (count > 0) {
          totalActiveApartments += count;

          billableAssociations.push({
            associationId: association.id,
            name: association.name,
            activeApartments: count,
            status: 'active',
            source: association.source,
            organizationId: association.organizationId || null,
            publishedSheetsCount: publishedSheets.size
          });
        }
      }

      setLoading(false);

      return {
        total: totalActiveApartments,
        billableAssociations,
        suspendedAssociations,
        totalAssociations: associations.length,
        billableCount: billableAssociations.length,
        suspendedCount: suspendedAssociations.length
      };
    } catch (err) {
      console.error('❌ Error counting active apartments:', err);
      setError(err.message);
      setLoading(false);

      return {
        total: 0,
        billableAssociations: [],
        suspendedAssociations: [],
        error: err.message
      };
    }
  }, []);

  /**
   * Calculează suma totală de facturat
   */
  const calculateBillingAmount = useCallback((
    totalApartments,
    pricePerApartment = 5.00,
    discountPercent = 0
  ) => {
    const subtotal = totalApartments * pricePerApartment;
    const discountAmount = subtotal * (discountPercent / 100);
    const totalAmount = subtotal - discountAmount;

    return {
      totalApartments,
      pricePerApartment,
      subtotal: Math.round(subtotal * 100) / 100,
      discountPercent,
      discountAmount: Math.round(discountAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: 'RON'
    };
  }, []);

  /**
   * Generează detaliile complete pentru o factură
   * Combină contorizarea cu calculul de preț
   */
  const generateInvoiceDetails = useCallback(async (
    userId,
    pricePerApartment = 5.00,
    discountPercent = 0
  ) => {
    setLoading(true);

    try {
      // 1. Contorizează apartamentele
      const apartmentData = await countActiveApartments(userId);

      if (apartmentData.error) {
        throw new Error(apartmentData.error);
      }

      // 2. Calculează sumele
      const amounts = calculateBillingAmount(
        apartmentData.total,
        pricePerApartment,
        discountPercent
      );

      // 3. Generează line items pentru factură
      const lineItems = apartmentData.billableAssociations.map(assoc => ({
        description: `${assoc.name} - ${assoc.activeApartments} apartamente active`,
        associationId: assoc.associationId,
        quantity: assoc.activeApartments,
        unitPrice: pricePerApartment,
        amount: Math.round(assoc.activeApartments * pricePerApartment * 100) / 100
      }));

      setLoading(false);

      return {
        success: true,
        data: {
          // Detalii apartamente
          ...apartmentData,

          // Detalii financiare
          ...amounts,

          // Line items pentru factură
          lineItems,

          // Metadata
          calculatedAt: new Date().toISOString()
        }
      };
    } catch (err) {
      console.error('❌ Error generating invoice details:', err);
      setError(err.message);
      setLoading(false);

      return {
        success: false,
        error: err.message
      };
    }
  }, [countActiveApartments, calculateBillingAmount]);

  /**
   * Verifică dacă un user are apartamente de facturat
   */
  const hasBillableApartments = useCallback(async (userId) => {
    const result = await countActiveApartments(userId);
    return result.total > 0;
  }, [countActiveApartments]);

  /**
   * Estimează costul lunar pentru un user
   * Util pentru afișare în UI
   */
  const estimateMonthlyBill = useCallback(async (
    userId,
    pricePerApartment = 5.00,
    discountPercent = 0
  ) => {
    setLoading(true);

    try {
      const apartmentData = await countActiveApartments(userId);
      const amounts = calculateBillingAmount(
        apartmentData.total,
        pricePerApartment,
        discountPercent
      );

      setLoading(false);

      return {
        totalApartments: apartmentData.total,
        estimatedAmount: amounts.totalAmount,
        currency: 'RON',
        billableAssociations: apartmentData.billableAssociations.length,
        suspendedAssociations: apartmentData.suspendedAssociations.length
      };
    } catch (err) {
      console.error('❌ Error estimating monthly bill:', err);
      setLoading(false);
      return null;
    }
  }, [countActiveApartments, calculateBillingAmount]);

  /**
   * Calculează billing-ul pentru userul curent și salvează în state
   * Wrapper convenabil pentru UI
   */
  const calculateBilling = useCallback(async (userId, pricePerApartment = 5.00, discountPercent = 0) => {
    setLoading(true);
    setError(null);

    try {
      const apartmentData = await countActiveApartments(userId);
      const amounts = calculateBillingAmount(
        apartmentData.total,
        pricePerApartment,
        discountPercent
      );

      const stats = {
        ...apartmentData,
        ...amounts,
        estimatedMonthlyAmount: amounts.totalAmount,
        calculatedAt: new Date().toISOString()
      };

      setBillingStats(stats);
      setLoading(false);

      return stats;
    } catch (err) {
      console.error('❌ Error calculating billing:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, [countActiveApartments, calculateBillingAmount]);

  return {
    // State
    loading,
    error,
    billingStats,

    // Core functions
    getUserAssociations,
    countActiveApartments,
    calculateBillingAmount,
    calculateBilling,

    // Invoice generation
    generateInvoiceDetails,

    // Helpers
    hasBillableApartments,
    estimateMonthlyBill
  };
};
