import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

export const useIncasari = (association, currentMonth) => {
  const [incasari, setIncasari] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastReceiptNumber, setLastReceiptNumber] = useState(0);
  
  // Ascultă încasările pentru asociația și luna curentă
  useEffect(() => {
    if (!association?.id || !currentMonth) return;
    
    setLoading(true);
    
    // Query simplificat care nu necesită index compus
    // Filtrăm doar pe associationId și facem filtrarea pe month în client
    const q = query(
      collection(db, 'incasari'),
      where('associationId', '==', association.id)
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const incasariData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Filtrăm pe month în client-side
          if (data.month === currentMonth) {
            incasariData.push({ id: doc.id, ...data });
          }
        });
        
        // Sortăm în client-side după timestamp sau createdAt
        incasariData.sort((a, b) => {
          const dateA = new Date(a.timestamp || a.createdAt?.toDate() || 0);
          const dateB = new Date(b.timestamp || b.createdAt?.toDate() || 0);
          return dateB - dateA; // Descendent (cele mai recente primele)
        });
        
        setIncasari(incasariData);
        setLoading(false);
      },
      (err) => {
        console.error('Eroare la încărcarea încasărilor:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [association?.id, currentMonth]);
  
  // Obține ultimul număr de chitanță
  useEffect(() => {
    const getLastReceiptNumber = async () => {
      if (!association?.id) return;
      
      try {
        // Query simplificat - preluăm toate încasările asociației
        const q = query(
          collection(db, 'incasari'),
          where('associationId', '==', association.id)
        );
        
        const snapshot = await getDocs(q);
        let maxReceiptNumber = 0;
        
        // Găsim numărul maxim de chitanță
        snapshot.forEach((doc) => {
          const receiptNum = doc.data().receiptNumber || 0;
          if (receiptNum > maxReceiptNumber) {
            maxReceiptNumber = receiptNum;
          }
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
    
    try {
      const newReceiptNumber = lastReceiptNumber + 1;
      
      // Structura compatibilă cu PaymentModal
      const docRef = await addDoc(collection(db, 'incasari'), {
        associationId: association.id,
        apartmentId: incasareData.apartmentId,
        month: incasareData.month,
        restante: incasareData.restante || 0,
        intretinere: incasareData.intretinere || 0,
        penalitati: incasareData.penalitati || 0,
        total: incasareData.total,
        timestamp: incasareData.timestamp || new Date().toISOString(),
        receiptNumber: newReceiptNumber,
        createdAt: serverTimestamp(),
        createdBy: incasareData.createdBy || 'Administrator',
        // Câmpuri adiționale pentru chitanță
        apartmentNumber: incasareData.apartmentNumber,
        owner: incasareData.owner,
        paymentMethod: incasareData.paymentMethod || 'cash',
        notes: incasareData.notes || ''
      });
      
      setLastReceiptNumber(newReceiptNumber);
      
      return { 
        success: true, 
        id: docRef.id,
        receiptNumber: newReceiptNumber 
      };
    } catch (err) {
      console.error('Eroare la adăugarea încasării:', err);
      return { success: false, error: err.message };
    }
  };
  
  // Actualizează o încasare existentă
  const updateIncasare = async (incasareId, updates) => {
    try {
      const incasareRef = doc(db, 'incasari', incasareId);
      await updateDoc(incasareRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (err) {
      console.error('Eroare la actualizarea încasării:', err);
      return { success: false, error: err.message };
    }
  };
  
  // Șterge o încasare
  const deleteIncasare = async (incasareId) => {
    try {
      await deleteDoc(doc(db, 'incasari', incasareId));
      return { success: true };
    } catch (err) {
      console.error('Eroare la ștergerea încasării:', err);
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