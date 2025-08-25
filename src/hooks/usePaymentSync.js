import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Hook pentru sincronizarea plăților cu tabelul de întreținere
 * Gestionează diminuarea datoriilor conform încasărilor efectuate
 */
export const usePaymentSync = (association, currentMonth) => {
  const [paymentSummary, setPaymentSummary] = useState({});
  const [loading, setLoading] = useState(false);

  // Ascultă încasările pentru luna curentă și calculează totalurile per apartament
  useEffect(() => {
    if (!association?.id || !currentMonth) return;

    const q = query(
      collection(db, 'incasari'),
      where('associationId', '==', association.id),
      where('month', '==', currentMonth)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const summary = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const apartmentId = data.apartmentId;
        
        if (!summary[apartmentId]) {
          summary[apartmentId] = {
            totalRestante: 0,
            totalIntretinere: 0,
            totalPenalitati: 0,
            totalIncasat: 0,
            incasari: []
          };
        }
        
        summary[apartmentId].totalRestante += data.restante || 0;
        summary[apartmentId].totalIntretinere += data.intretinere || 0;
        summary[apartmentId].totalPenalitati += data.penalitati || 0;
        summary[apartmentId].totalIncasat += data.total || 0;
        summary[apartmentId].incasari.push({
          id: doc.id,
          ...data
        });
      });
      
      setPaymentSummary(summary);
    });

    return () => unsubscribe();
  }, [association?.id, currentMonth]);

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
    const totalInitial = initialRestante + initialIntretinere + initialPenalitati;
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

  /**
   * Salvează statusul de plată în Firebase (pentru persistență)
   */
  const savePaymentStatus = useCallback(async (apartmentId, month, status) => {
    if (!association?.id || !apartmentId || !month) return false;
    
    try {
      const paymentStatusRef = doc(db, 'paymentStatus', `${association.id}_${month}_${apartmentId}`);
      
      await updateDoc(paymentStatusRef, {
        associationId: association.id,
        apartmentId: apartmentId,
        month: month,
        ...status,
        updatedAt: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      // Dacă documentul nu există, îl creăm
      try {
        const paymentStatusRef = doc(db, 'paymentStatus', `${association.id}_${month}_${apartmentId}`);
        await setDoc(paymentStatusRef, {
          associationId: association.id,
          apartmentId: apartmentId,
          month: month,
          ...status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return true;
      } catch (err) {
        console.error('Eroare la salvarea statusului de plată:', err);
        return false;
      }
    }
  }, [association?.id]);

  return {
    paymentSummary,
    loading,
    getApartmentPayments,
    calculateRemainingDebt,
    hasPayments,
    getUpdatedMaintenanceData,
    getPaymentStats,
    savePaymentStatus
  };
};