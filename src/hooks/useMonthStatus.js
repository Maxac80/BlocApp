import { useState, useEffect } from 'react';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export const useMonthStatus = (associationId) => {
  const [monthStatuses, setMonthStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ascultă statusurile lunilor pentru asociația curentă
  useEffect(() => {
    if (!associationId) return;

    setLoading(true);
    
    // Referința către documentul de statusuri
    const statusDocRef = doc(db, 'monthStatuses', associationId);
    
    // Ascultă modificările în timp real
    const unsubscribe = onSnapshot(
      statusDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMonthStatuses(data.statuses || {});
        } else {
          // Dacă nu există document, inițializează cu un obiect gol
          setMonthStatuses({});
        }
        setLoading(false);
      },
      (err) => {
        console.error('Eroare la încărcarea statusurilor:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId]);

  // Salvează statusul unei luni în Firebase
  const saveMonthStatus = async (month, status) => {
    if (!associationId) {
      console.error('Nu există asociație selectată');
      return false;
    }

    try {
      const statusDocRef = doc(db, 'monthStatuses', associationId);
      
      // Actualizează statusul pentru luna specificată
      const updatedStatuses = {
        ...monthStatuses,
        [month]: {
          status: status,
          updatedAt: new Date().toISOString(),
          ...(status === 'afisata' ? { publishedAt: new Date().toISOString() } : {})
        }
      };

      await setDoc(statusDocRef, {
        associationId: associationId,
        statuses: updatedStatuses,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      // Actualizează și state-ul local
      setMonthStatuses(updatedStatuses);
      
      console.log(`✅ Status salvat pentru ${month}: ${status}`);
      return true;
    } catch (err) {
      console.error('Eroare la salvarea statusului:', err);
      setError(err.message);
      return false;
    }
  };

  // Obține statusul unei luni specifice
  const getMonthStatus = (month) => {
    if (!month || !monthStatuses[month]) {
      return 'in_lucru'; // Status default
    }
    
    const monthData = monthStatuses[month];
    
    // Dacă este obiect, returnează statusul
    if (typeof monthData === 'object' && monthData.status) {
      return monthData.status;
    }
    
    // Dacă este string direct (pentru compatibilitate)
    if (typeof monthData === 'string') {
      return monthData;
    }
    
    return 'in_lucru';
  };

  // Verifică dacă o lună este publicată
  const isMonthPublished = (month) => {
    return getMonthStatus(month) === 'afisata';
  };

  // Verifică dacă o lună este read-only
  const isMonthReadOnly = (month) => {
    const status = getMonthStatus(month);
    return status === 'afisata' || status === 'inchisa';
  };

  // Obține data publicării pentru o lună
  const getPublishDate = (month) => {
    if (!monthStatuses[month]) return null;
    
    const monthData = monthStatuses[month];
    if (typeof monthData === 'object' && monthData.publishedAt) {
      return new Date(monthData.publishedAt);
    }
    
    return null;
  };

  // Publică o lună
  const publishMonth = async (month) => {
    return await saveMonthStatus(month, 'afisata');
  };

  // Depublică o lună (pentru cazuri excepționale)
  const unpublishMonth = async (month) => {
    return await saveMonthStatus(month, 'in_lucru');
  };

  // Închide definitiv o lună
  const closeMonth = async (month) => {
    return await saveMonthStatus(month, 'inchisa');
  };

  return {
    monthStatuses,
    loading,
    error,
    getMonthStatus,
    saveMonthStatus,
    isMonthPublished,
    isMonthReadOnly,
    getPublishDate,
    publishMonth,
    unpublishMonth,
    closeMonth
  };
};