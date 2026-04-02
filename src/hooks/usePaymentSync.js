import { useState, useEffect, useCallback } from 'react';
import {
  query,
  where,
  onSnapshot,
  updateDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { getSheetRef, getSheetsCollection } from '../utils/firestoreHelpers';

/**
 * 🆕 FAZA 5: Hook pentru sincronizarea plăților cu tabelul de întreținere
 * Gestionează diminuarea datoriilor conform încasărilor efectuate
 * Sincronizare cross-sheet: plăți în Sheet-1 → actualizează restante în Sheet-2
 */
export const usePaymentSync = (association, currentMonth, currentSheet = null) => {
  const [paymentSummary, setPaymentSummary] = useState({});
  const [loading, setLoading] = useState(false);

  // 🆕 FAZA 5: Ascultă plățile din sheet-ul PUBLISHED/ARCHIVED curent
  useEffect(() => {
    // Verifică status pentru locked sheets (published sau archived)
    const isLockedSheet = currentSheet?.status === 'PUBLISHED' ||
                          currentSheet?.status === 'published' ||
                          currentSheet?.status === 'archived';

    if (!currentSheet?.id || !isLockedSheet) {
      setPaymentSummary({});
      return;
    }

    setLoading(true);

    // Listener pe sheet-ul publicat pentru a lua payments
    const sheetRef = getSheetRef(association.id, currentSheet.id);

    const unsubscribe = onSnapshot(
      sheetRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const sheetData = docSnapshot.data();
          const payments = sheetData.payments || [];

          // Grupăm plățile pe apartamentId
          const summary = {};

          payments.forEach((payment) => {
            const apartmentId = payment.apartmentId;

            if (!summary[apartmentId]) {
              summary[apartmentId] = {
                totalRestante: 0,
                totalIntretinere: 0,
                totalPenalitati: 0,
                totalIncasat: 0,
                incasari: []
              };
            }

            summary[apartmentId].totalRestante += payment.restante || 0;
            summary[apartmentId].totalIntretinere += payment.intretinere || 0;
            summary[apartmentId].totalPenalitati += payment.penalitati || 0;
            summary[apartmentId].totalIncasat += payment.total || 0;
            summary[apartmentId].incasari.push(payment);
          });

          setPaymentSummary(summary);
        } else {
          setPaymentSummary({});
        }
        setLoading(false);
      },
      (err) => {
        console.error('Eroare la ascultarea plăților din sheet:', err);
        setPaymentSummary({});
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentSheet?.id, currentSheet?.status, association?.id]);

  // 🆕 FAZA 5: Sincronizare cross-sheet automată
  // Când se înregistrează plăți în currentSheet, actualizează nextSheet automat
  useEffect(() => {
    if (!currentSheet?.id || !association?.id || Object.keys(paymentSummary).length === 0) {
      return;
    }

    // Găsește sheet-ul IN_PROGRESS pentru luna următoare
    const findAndUpdateNextSheet = async () => {
      try {
        const sheetsQuery = query(
          getSheetsCollection(association.id),
          where('status', '==', 'IN_PROGRESS')
        );

        const snapshot = await getDocs(sheetsQuery);

        // Căutăm sheet-ul cu luna imediat următoare
        const currentSheetMonth = new Date(currentSheet.month + '-01');
        const nextMonthDate = new Date(currentSheetMonth);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const nextMonthStr = nextMonthDate.toISOString().substring(0, 7); // Format: 2025-12

        let nextSheet = null;
        snapshot.forEach((doc) => {
          if (doc.data().month === nextMonthStr) {
            nextSheet = { id: doc.id, ...doc.data() };
          }
        });

        if (!nextSheet) {
          // Nu există sheet următor, nu facem nimic
          return;
        }

        // Actualizăm balanceAdjustments pentru fiecare apartament cu plăți
        const maintenanceTable = currentSheet.maintenanceTable || [];
        const updatedAdjustments = { ...(nextSheet.configSnapshot?.balanceAdjustments || {}) };

        Object.keys(paymentSummary).forEach((apartmentId) => {
          // Găsim datele apartamentului din maintenanceTable capturat la publicare
          const apartmentData = maintenanceTable.find(item => item.apartmentId === apartmentId);

          if (!apartmentData) return;

          const payments = paymentSummary[apartmentId];
          const initialRestante = apartmentData.restante || 0;
          const initialIntretinere = apartmentData.currentMaintenance || 0;

          // Calculăm ce a mai rămas de plătit
          const remainingRestante = Math.max(0, initialRestante - payments.totalRestante);
          const remainingIntretinere = Math.max(0, initialIntretinere - payments.totalIntretinere);

          // Formula: Restanță pentru Sheet-2 = restante rămase + întreținere rămasă
          const newRestante = remainingRestante + remainingIntretinere;

          // Actualizăm adjustment pentru acest apartament
          updatedAdjustments[apartmentId] = {
            restante: newRestante,
            reason: `Transfer automat din ${currentSheet.month}`,
            timestamp: new Date().toISOString()
          };
        });

        // Actualizăm sheet-ul următorului cu noile adjustments
        const nextSheetRef = getSheetRef(association.id, nextSheet.id);
        await updateDoc(nextSheetRef, {
          'configSnapshot.balanceAdjustments': updatedAdjustments,
          updatedAt: serverTimestamp()
        });

      } catch (err) {
        console.error('Eroare la sincronizarea cross-sheet:', err);
      }
    };

    findAndUpdateNextSheet();
  }, [paymentSummary, currentSheet?.id, currentSheet?.month, association?.id, currentSheet?.maintenanceTable]);

  /**
   * Calculează datoriile rămase pentru un apartament
   * bazat pe datele inițiale și încasările efectuate
   */
  const calculateRemainingDebt = useCallback((apartmentData, payments) => {
    if (!apartmentData) return null;
    
    const {
      restante: initialRestante = 0,
      currentMaintenance: initialIntretinere = 0,
      penalitati: initialPenalitati = 0
    } = apartmentData;
    
    const {
      totalRestante = 0,
      totalIntretinere = 0,
      totalPenalitati = 0
    } = payments || {};
    
    // Calculează ce a mai rămas de plătit
    const remainingRestante = Math.max(0, initialRestante - totalRestante);
    const remainingIntretinere = Math.max(0, initialIntretinere - totalIntretinere);
    const remainingPenalitati = Math.max(0, initialPenalitati - totalPenalitati);
    
    // Determină statusul de plată
    const totalRemaining = remainingRestante + remainingIntretinere + remainingPenalitati;
    const totalPaid = totalRestante + totalIntretinere + totalPenalitati;
    
    // Statusuri de plată
    const isPaid = totalRemaining === 0; // A plătit totul
    const isPartiallyPaid = totalPaid > 0 && totalRemaining > 0; // A plătit ceva dar mai are restanțe
    const isUnpaid = totalPaid === 0; // Nu a plătit nimic
    
    // Determinăm statusul textual
    let paymentStatus = '';
    if (isPaid) {
      paymentStatus = 'Plătit integral';
    } else if (isPartiallyPaid) {
      paymentStatus = 'Plătit parțial';
    } else {
      paymentStatus = ''; // Nu afișăm nimic pentru neplătiți
    }
    
    return {
      remainingRestante,
      remainingIntretinere,
      remainingPenalitati,
      totalRemaining,
      isPaid,
      isPartiallyPaid,
      isUnpaid,
      paymentStatus,
      totalPaid
    };
  }, []);

  /**
   * Obține sumarul plăților pentru un apartament specific
   */
  const getApartmentPayments = useCallback((apartmentId) => {
    return paymentSummary[apartmentId] || {
      totalRestante: 0,
      totalIntretinere: 0,
      totalPenalitati: 0,
      totalIncasat: 0,
      incasari: []
    };
  }, [paymentSummary]);

  /**
   * Verifică dacă un apartament are plăți înregistrate
   */
  const hasPayments = useCallback((apartmentId) => {
    return paymentSummary[apartmentId] && paymentSummary[apartmentId].incasari.length > 0;
  }, [paymentSummary]);

  /**
   * Calculează datele actualizate pentru afișare în tabel
   * Aceasta este funcția principală care va fi folosită pentru a actualiza UI-ul
   */
  const getUpdatedMaintenanceData = useCallback((originalData) => {
    if (!originalData || !Array.isArray(originalData)) return originalData;
    
    return originalData.map(data => {
      const payments = getApartmentPayments(data.apartmentId);
      const remaining = calculateRemainingDebt(data, payments);
      
      if (!remaining) return data;
      
      // Returnează datele actualizate cu sumele rămase
      return {
        ...data,
        // Actualizează sumele rămase
        restante: remaining.remainingRestante,
        currentMaintenance: remaining.remainingIntretinere,
        penalitati: remaining.remainingPenalitati,
        totalMaintenance: remaining.remainingRestante + remaining.remainingIntretinere, // Doar restanțe + întreținere
        totalDatorat: remaining.totalRemaining, // Total complet incluzând penalitățile
        
        // Statusuri de plată
        isPaid: remaining.isPaid,
        isPartiallyPaid: remaining.isPartiallyPaid,
        isUnpaid: remaining.isUnpaid,
        paymentStatus: remaining.paymentStatus,
        paid: remaining.isPaid, // Pentru compatibilitate cu codul existent
        
        // Informații despre plăți (pentru afișare în UI)
        paymentInfo: {
          totalPaid: remaining.totalPaid,
          hasPayments: payments.incasari.length > 0,
          paymentCount: payments.incasari.length,
          lastPayment: payments.incasari[0]?.timestamp,
          canReceivePayment: remaining.totalRemaining > 0, // Pentru butonul Încasează
          // Adăugăm datele detaliate pentru componenta PaymentStatusDetail
          payments: payments.incasari, // Lista completă de plăți
          totalsByCategory: {
            totalRestante: payments.totalRestante,
            totalIntretinere: payments.totalIntretinere,
            totalPenalitati: payments.totalPenalitati
          }
        }
      };
    });
  }, [getApartmentPayments, calculateRemainingDebt]);

  /**
   * Obține statistici generale despre încasări
   */
  const getPaymentStats = useCallback(() => {
    const stats = {
      totalApartments: 0,
      apartmentsWithPayments: 0,
      totalIncasat: 0,
      totalRestanteIncasate: 0,
      totalIntretinereIncasata: 0,
      totalPenalitatiIncasate: 0
    };
    
    Object.values(paymentSummary).forEach(apartment => {
      if (apartment.incasari.length > 0) {
        stats.apartmentsWithPayments++;
        stats.totalIncasat += apartment.totalIncasat;
        stats.totalRestanteIncasate += apartment.totalRestante;
        stats.totalIntretinereIncasata += apartment.totalIntretinere;
        stats.totalPenalitatiIncasate += apartment.totalPenalitati;
      }
    });
    
    return stats;
  }, [paymentSummary]);

  return {
    paymentSummary,
    loading,
    getApartmentPayments,
    calculateRemainingDebt,
    hasPayments,
    getUpdatedMaintenanceData,
    getPaymentStats
  };
};