/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { getSheetRef, getSheetsCollection } from '../utils/firestoreHelpers';

export const useIncasari = (association, currentMonth, publishedSheet = null) => { // 🆕 FAZA 4: publishedSheet param
  const [incasari, setIncasari] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastReceiptNumber, setLastReceiptNumber] = useState(0);
  
  // 🆕 FAZA 4: Ascultă încasările din sheet publicat
  useEffect(() => {
    if (!publishedSheet?.id) {
      setIncasari([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Listener pe document-ul sheet-ului publicat
    const sheetRef = getSheetRef(association.id, publishedSheet.id);

    const unsubscribe = onSnapshot(
      sheetRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const sheetData = docSnapshot.data();
          const payments = sheetData.payments || [];

          // Sortăm după timestamp descendent (cele mai recente primele)
          const sortedPayments = [...payments].sort((a, b) => {
            const dateA = new Date(a.timestamp || a.createdAt || 0);
            const dateB = new Date(b.timestamp || b.createdAt || 0);
            return dateB - dateA;
          });

          setIncasari(sortedPayments);
        } else {
          setIncasari([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Eroare la încărcarea încasărilor din sheet:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [publishedSheet?.id]);
  
  // 🆕 FAZA 4: Obține ultimul număr de chitanță din toate sheet-urile asociației
  useEffect(() => {
    const getLastReceiptNumber = async () => {
      if (!association?.id) return;

      try {
        // Query toate sheet-urile asociației
        const q = getSheetsCollection(association.id);

        const snapshot = await getDocs(q);
        let maxReceiptNumber = 0;

        // Parcurgem toate sheet-urile și căutăm numărul maxim de chitanță
        snapshot.forEach((docSnapshot) => {
          const sheetData = docSnapshot.data();
          const payments = sheetData.payments || [];

          payments.forEach((payment) => {
            const receiptNum = payment.receiptNumber || 0;
            if (receiptNum > maxReceiptNumber) {
              maxReceiptNumber = receiptNum;
            }
          });
        });

        setLastReceiptNumber(maxReceiptNumber);
      } catch (err) {
        console.error('Eroare la obținerea ultimului număr de chitanță:', err);
        // În caz de eroare, pornim de la 0
        setLastReceiptNumber(0);
      }
    };

    getLastReceiptNumber();
  }, [association?.id]);
  
  // Adaugă o nouă încasare (compatibil cu PaymentModal)
  const addIncasare = async (incasareData) => {
    if (!association?.id) {
      throw new Error('Nu există asociație selectată');
    }

    // 🆕 FAZA 4: OBLIGATORIU să existe sheet publicat
    if (!publishedSheet) {
      throw new Error('Plățile se pot înregistra doar pe luni publicate. Vă rugăm să publicați mai întâi luna curentă.');
    }

    // Verifică status (poate fi 'PUBLISHED' sau 'published')
    if (publishedSheet.status !== 'PUBLISHED' && publishedSheet.status !== 'published') {
      throw new Error('Plățile se pot înregistra doar pe luni publicate');
    }

    // Verifică că apartamentul există în maintenanceTable capturat la publicare
    const apartmentInTable = publishedSheet.maintenanceTable?.find(
      item => item.apartmentId === incasareData.apartmentId
    );

    if (!apartmentInTable) {
      throw new Error('Apartamentul nu există în tabelul de întreținere publicat');
    }

    try {
      const newReceiptNumber = lastReceiptNumber + 1;

      // 🆕 FAZA 4: Structura plății pentru array-ul din sheet
      const paymentRecord = {
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID unic
        apartmentId: incasareData.apartmentId,
        apartmentNumber: incasareData.apartmentNumber,
        owner: incasareData.owner,
        restante: incasareData.restante || 0,
        intretinere: incasareData.intretinere || 0,
        penalitati: incasareData.penalitati || 0,
        total: incasareData.total,
        timestamp: incasareData.timestamp || new Date().toISOString(),
        month: incasareData.month || publishedSheet.monthYear || '', // pentru chitanță premium
        receiptNumber: newReceiptNumber,
        createdAt: new Date().toISOString(),
        createdBy: incasareData.createdBy || 'Administrator',
        paymentMethod: incasareData.paymentMethod || 'cash',
        notes: incasareData.notes || ''
      };

      // 🆕 FAZA 4: Adaugă plata în array-ul payments din sheet
      const sheetRef = getSheetRef(association.id, publishedSheet.id);
      const currentPayments = publishedSheet.payments || [];

      await updateDoc(sheetRef, {
        payments: [...currentPayments, paymentRecord],
        updatedAt: serverTimestamp()
      });

      setLastReceiptNumber(newReceiptNumber);

      return {
        success: true,
        id: paymentRecord.id,
        receiptNumber: newReceiptNumber
      };
    } catch (err) {
      console.error('Eroare la adăugarea încasării:', err);
      return { success: false, error: err.message };
    }
  };
  
  // 🆕 FAZA 4: Actualizează o plată în array-ul din sheet
  const updateIncasare = async (paymentId, updates) => {
    if (!publishedSheet?.id) {
      throw new Error('Nu există sheet publicat');
    }

    try {
      const sheetRef = getSheetRef(association.id, publishedSheet.id);
      const currentPayments = publishedSheet.payments || [];

      // Găsește și actualizează plata
      const updatedPayments = currentPayments.map(payment =>
        payment.id === paymentId
          ? { ...payment, ...updates, updatedAt: new Date().toISOString() }
          : payment
      );

      await updateDoc(sheetRef, {
        payments: updatedPayments,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (err) {
      console.error('Eroare la actualizarea plății:', err);
      return { success: false, error: err.message };
    }
  };

  // 🆕 FAZA 4: Șterge o plată din array-ul din sheet
  const deleteIncasare = async (paymentId) => {
    if (!publishedSheet?.id) {
      throw new Error('Nu există sheet publicat');
    }

    try {
      const sheetRef = getSheetRef(association.id, publishedSheet.id);
      const currentPayments = publishedSheet.payments || [];

      // Filtrează plata care trebuie ștearsă
      const updatedPayments = currentPayments.filter(payment => payment.id !== paymentId);

      await updateDoc(sheetRef, {
        payments: updatedPayments,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (err) {
      console.error('Eroare la ștergerea plății:', err);
      return { success: false, error: err.message };
    }
  };
  
  // Obține încasările pentru un apartament specific
  const getApartmentIncasari = (apartmentId) => {
    return incasari.filter(inc => inc.apartmentId === apartmentId);
  };
  
  // Calculează totalul încasărilor pentru luna curentă
  const getTotalIncasari = () => {
    return incasari.reduce((total, inc) => total + (inc.total || 0), 0);
  };
  
  // Obține încasările grupate pe apartamente
  const getIncasariByApartment = () => {
    const grouped = {};
    incasari.forEach(inc => {
      if (!grouped[inc.apartmentId]) {
        grouped[inc.apartmentId] = [];
      }
      grouped[inc.apartmentId].push(inc);
    });
    return grouped;
  };
  
  // Verifică dacă un apartament a plătit întreținerea
  const hasApartmentPaid = (apartmentId) => {
    const apartmentIncasari = getApartmentIncasari(apartmentId);
    return apartmentIncasari.length > 0;
  };
  
  // Obține statistica încasărilor
  const getIncasariStats = (apartments = []) => {
    const totalApartments = apartments.length;
    const paidApartments = new Set(incasari.map(inc => inc.apartmentId)).size;
    const unpaidApartments = totalApartments - paidApartments;
    const totalAmount = getTotalIncasari();
    
    return {
      totalApartments,
      paidApartments,
      unpaidApartments,
      totalAmount,
      percentagePaid: totalApartments > 0 ? (paidApartments / totalApartments * 100).toFixed(1) : 0
    };
  };
  
  // Generează numărul chitanței în format personalizat
  const generateReceiptNumber = () => {
    const year = new Date().getFullYear();
    const nextNumber = (lastReceiptNumber + 1).toString().padStart(5, '0');
    return `${year}-${nextNumber}`;
  };
  
  return {
    incasari,
    loading,
    error,
    addIncasare,
    updateIncasare,
    deleteIncasare,
    getApartmentIncasari,
    getTotalIncasari,
    getIncasariByApartment,
    hasApartmentPaid,
    getIncasariStats,
    generateReceiptNumber,
    lastReceiptNumber
  };
};