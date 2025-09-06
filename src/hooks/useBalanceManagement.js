import { useState, useCallback, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 💰 Custom Hook pentru Gestionarea Soldurilor
 * 
 * RESPONSABILITĂȚI:
 * - Încărcarea și salvarea soldurilor inițiale
 * - Gestionarea ajustărilor de solduri
 * - Sincronizarea cu Firestore
 * - Calculul automatizat al soldurilor
 */
export const useBalanceManagement = (association) => {
  // 📊 STATE LOCAL PENTRU SOLDURI
  const [hasInitialBalances, setHasInitialBalances] = useState(false);
  const [disabledExpenses, setDisabledExpenses] = useState({});
  const [initialBalances, setInitialBalances] = useState({});

  // 🔄 ÎNCĂRCAREA CONFIGURĂRILOR LA SCHIMBAREA ASOCIAȚIEI
  useEffect(() => {
    if (association?.id) {
      loadInitialBalances();
    }
  }, [association?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 📥 ÎNCĂRCAREA SOLDURILOR ȘI CONFIGURĂRILOR DIN FIRESTORE
  const loadInitialBalances = useCallback(async () => {
    if (!association?.id) return;
    
    try {
      console.log('📥 Încarc configurațiile pentru asociația:', association.id);
      
      // 1. Încarcă soldurile inițiale
      const balancesQuery = query(
        collection(db, 'initialBalances'),
        where('associationId', '==', association.id)
      );
      const balancesSnapshot = await getDocs(balancesQuery);
      
      const loadedBalances = {};
      balancesSnapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        loadedBalances[data.apartmentId] = {
          restante: data.restante || 0,
          penalitati: data.penalitati || 0
        };
      });
      
      // 2. Încarcă cheltuielile eliminate
      const disabledExpensesQuery = query(
        collection(db, 'disabledExpenses'),
        where('associationId', '==', association.id)
      );
      const disabledExpensesSnapshot = await getDocs(disabledExpensesQuery);
      
      const loadedDisabledExpenses = {};
      disabledExpensesSnapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        const key = `${data.associationId}-${data.month}`;
        loadedDisabledExpenses[key] = data.expenseNames || [];
      });
      
      // 3. Actualizează state-urile
      setDisabledExpenses(loadedDisabledExpenses);
      
      if (Object.keys(loadedBalances).length > 0) {
        setHasInitialBalances(true);
        setInitialBalances(loadedBalances);
      }
      
      console.log('✅ Configurații încărcate:', {
        solduri: Object.keys(loadedBalances).length,
        cheltuieliEliminate: Object.keys(loadedDisabledExpenses).length
      });
      
      return {
        balances: loadedBalances,
        disabledExpenses: loadedDisabledExpenses
      };
      
    } catch (error) {
      console.error('❌ Eroare la încărcarea configurărilor:', error);
      throw error;
    }
  }, [association?.id]);

  // 💾 SALVAREA SOLDURILOR INIȚIALE ÎN FIRESTORE
  const saveInitialBalances = useCallback(async (monthlyBalances, currentMonth) => {
    if (!association?.id) {
      throw new Error('Nu există asociație selectată');
    }
    
    try {
      console.log('💾 Salvez soldurile inițiale...');
      
      const currentMonthStr = currentMonth || new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      const monthKey = `${association.id}-${currentMonthStr}`;
      const currentBalances = monthlyBalances[monthKey] || {};
      
      // Șterge doar soldurile pentru această lună specifică, nu toate
      const existingBalancesQuery = query(
        collection(db, 'initialBalances'),
        where('associationId', '==', association.id),
        where('month', '==', currentMonthStr)
      );
      const existingSnapshot = await getDocs(existingBalancesQuery);
      
      const deletePromises = existingSnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'initialBalances', docSnapshot.id))
      );
      await Promise.all(deletePromises);
      
      // Salvează noile solduri
      const savePromises = Object.entries(currentBalances).map(([apartmentId, balance]) => {
        return addDoc(collection(db, 'initialBalances'), {
          associationId: association.id,
          apartmentId: apartmentId,
          month: currentMonthStr, // Adăugăm câmpul month pentru filtrare
          restante: balance.restante || 0,
          penalitati: balance.penalitati || 0,
          savedAt: new Date().toISOString()
        });
      });
      
      await Promise.all(savePromises);
      
      setHasInitialBalances(true);
      console.log('✅ Solduri inițiale salvate în Firestore');
      
      return true;
    } catch (error) {
      console.error('❌ Eroare la salvarea soldurilor:', error);
      throw error;
    }
  }, [association?.id]);

  // 🔄 SALVAREA AJUSTĂRILOR DE SOLDURI
  const saveBalanceAdjustments = useCallback(async (month, adjustmentData) => {
    if (!association?.id) {
      throw new Error('Nu există asociație selectată');
    }
    
    try {
      console.log('🔄 Salvez ajustările de solduri pentru:', month);
      
      // Șterge ajustările existente pentru această lună
      const existingQuery = query(
        collection(db, 'balanceAdjustments'),
        where('associationId', '==', association.id),
        where('month', '==', month)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      const deletePromises = existingSnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'balanceAdjustments', docSnapshot.id))
      );
      await Promise.all(deletePromises);
      
      // Salvează noile ajustări
      const savePromises = adjustmentData.map(apartmentData => {
        return addDoc(collection(db, 'balanceAdjustments'), {
          associationId: association.id,
          month: month,
          apartmentId: apartmentData.apartmentId,
          restante: apartmentData.restanteAjustate || 0,
          penalitati: apartmentData.penalitatiAjustate || 0,
          savedAt: new Date().toISOString()
        });
      });
      
      await Promise.all(savePromises);
      console.log(`✅ Ajustări solduri salvate pentru ${month}:`, adjustmentData.length, 'apartamente');
      
      return true;
    } catch (error) {
      console.error('❌ Eroare la salvarea ajustărilor:', error);
      throw error;
    }
  }, [association?.id]);

  // 🚫 GESTIONAREA CHELTUIELILOR ELIMINATE
  const toggleExpenseStatus = useCallback(async (expenseName, currentMonth, disable = true) => {
    if (!association?.id) return;
    
    const disabledKey = `${association.id}-${currentMonth}`;
    
    try {
      console.log(`${disable ? '🚫' : '✅'} ${disable ? 'Elimin' : 'Reactiv'} cheltuiala:`, expenseName);
      
      // Actualizează starea locală
      setDisabledExpenses(prev => {
        const currentDisabled = prev[disabledKey] || [];
        
        let newDisabled;
        if (disable) {
          newDisabled = [...currentDisabled, expenseName];
        } else {
          newDisabled = currentDisabled.filter(name => name !== expenseName);
        }
        
        return {
          ...prev,
          [disabledKey]: newDisabled
        };
      });
      
      // Salvează în Firestore
      await saveDisabledExpenses(disabledKey, expenseName, disable);
      
    } catch (error) {
      console.error('❌ Eroare la actualizarea statusului cheltuielii:', error);
      throw error;
    }
  }, [association?.id]);

  // 💾 SALVAREA CHELTUIELILOR ELIMINATE ÎN FIRESTORE
  const saveDisabledExpenses = useCallback(async (monthKey, expenseName, disable) => {
    try {
      const [associationId, month] = monthKey.split('-');
      
      // Găsește documentul existent pentru această lună
      const existingQuery = query(
        collection(db, 'disabledExpenses'),
        where('associationId', '==', associationId),
        where('month', '==', month)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (existingSnapshot.empty) {
        // Creează document nou
        if (disable) {
          await addDoc(collection(db, 'disabledExpenses'), {
            associationId: associationId,
            month: month,
            expenseNames: [expenseName],
            updatedAt: new Date().toISOString()
          });
        }
      } else {
        // Actualizează documentul existent
        const existingDoc = existingSnapshot.docs[0];
        const currentExpenseNames = existingDoc.data().expenseNames || [];
        
        let updatedExpenseNames;
        if (disable) {
          updatedExpenseNames = [...currentExpenseNames, expenseName];
        } else {
          updatedExpenseNames = currentExpenseNames.filter(name => name !== expenseName);
        }
        
        if (updatedExpenseNames.length === 0) {
          // Șterge documentul dacă nu mai există cheltuieli eliminate
          await deleteDoc(doc(db, 'disabledExpenses', existingDoc.id));
        } else {
          // Actualizează lista
          await updateDoc(doc(db, 'disabledExpenses', existingDoc.id), {
            expenseNames: updatedExpenseNames,
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      console.log(`✅ Cheltuiala "${expenseName}" ${disable ? 'eliminată' : 'reactivată'} pentru ${month}`);
    } catch (error) {
      console.error('❌ Eroare la salvarea cheltuielilor eliminate:', error);
      throw error;
    }
  }, []);

  // 📋 ÎNCĂRCAREA AJUSTĂRILOR DE SOLDURI
  const loadBalanceAdjustments = useCallback(async () => {
    if (!association?.id) return {};
    
    try {
      console.log('📋 Încarc ajustările de solduri...');
      
      const adjustmentsQuery = query(
        collection(db, 'balanceAdjustments'),
        where('associationId', '==', association.id)
      );
      const adjustmentsSnapshot = await getDocs(adjustmentsQuery);
      
      const loadedAdjustments = {};
      adjustmentsSnapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        const monthKey = `${data.associationId}-${data.month}`;
        if (!loadedAdjustments[monthKey]) {
          loadedAdjustments[monthKey] = {};
        }
        loadedAdjustments[monthKey][data.apartmentId] = {
          restante: data.restante || 0,
          penalitati: data.penalitati || 0
        };
      });
      
      console.log('✅ Ajustări încărcate pentru', Object.keys(loadedAdjustments).length, 'luni');
      return loadedAdjustments;
      
    } catch (error) {
      console.error('❌ Eroare la încărcarea ajustărilor:', error);
      return {};
    }
  }, [association?.id]);

  // 🧮 CALCULUL AUTOMATIZAT AL SOLDURILOR PENTRU LUNA URMĂTOARE
  const calculateNextMonthBalances = useCallback((currentTable, currentMonth) => {
    console.log('🧮 Calculez soldurile pentru luna următoare...');
    
    const nextMonthDate = new Date();
    const currentMonthDate = new Date(currentMonth);
    nextMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    const nextMonth = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    if (currentTable && currentTable.length > 0) {
      const nextMonthKey = `${association?.id}-${nextMonth}`;
      const nextMonthBalances = {};
      
      currentTable.forEach(row => {
        // Folosim datele actualizate din usePaymentSync care reflectă plățile parțiale
        // Aceste câmpuri sunt deja calculate prin scăderea plăților din sumele inițiale
        
        const remainingRestante = row.restante || 0; // Restanțele rămase după plăți
        const remainingMaintenance = row.currentMaintenance || 0; // Întreținerea rămasă după plăți  
        const remainingPenalties = row.penalitati || 0; // Penalitățile rămase după plăți
        
        // Calculează totalul rămas
        const totalRemaining = remainingRestante + remainingMaintenance + remainingPenalties;
        
        console.log(`🔍 Ap.${row.apartment} - Analiza plăți:`, {
          totalDatorat: row.totalDatorat,
          remainingRestante,
          remainingMaintenance, 
          remainingPenalties,
          totalRemaining,
          isPaid: row.isPaid,
          isPartiallyPaid: row.isPartiallyPaid,
          paymentInfo: row.paymentInfo
        });
        
        if (totalRemaining > 0) {
          // Mai sunt datorii de transferat în luna următoare
          // Pentru luna următoare, ce rămâne neplătit din luna curentă devine "restanță"
          const nextMonthRestante = Math.round(totalRemaining * 100) / 100;
          
          // Calculăm penalty doar pe întreținerea curentă neplătită (1%)
          // Nu aplicăm penalty pe restanțe sau penalități existente
          const penaltyOnCurrentMaintenance = remainingMaintenance > 0 ? (remainingMaintenance * 0.01) : 0;
          
          // Penalitățile pentru luna următoare = penalitățile rămase + penalty pe întreținerea neplătită
          const nextMonthPenalitati = Math.round((remainingPenalties + penaltyOnCurrentMaintenance) * 100) / 100;
          
          nextMonthBalances[row.apartmentId] = {
            restante: nextMonthRestante,
            penalitati: nextMonthPenalitati
          };
          
          console.log(`✅ Ap.${row.apartment}: Transfer → Restante=${nextMonthRestante}, Penalitati=${nextMonthPenalitati}, PenaltyAdded=${penaltyOnCurrentMaintenance}`);
        } else {
          // Totul plătit - nu se transferă nimic
          nextMonthBalances[row.apartmentId] = { restante: 0, penalitati: 0 };
          console.log(`✅ Ap.${row.apartment}: Totul plătit - balante resetate`);
        }
      });
      
      console.log('✅ Solduri calculate pentru', nextMonth, ':', Object.keys(nextMonthBalances).length, 'apartamente');
      return { [nextMonthKey]: nextMonthBalances };
    }
    
    return {};
  }, [association?.id]);

  console.log('🔄 useBalanceManagement render:', {
    association: !!association,
    hasInitialBalances,
    disabledExpensesKeys: Object.keys(disabledExpenses).length
  });

  // 🎯 RETURN API
  return {
    // 📊 State și date
    hasInitialBalances,
    setHasInitialBalances,
    disabledExpenses,
    setDisabledExpenses,
    initialBalances,
    setInitialBalances,
    
    // 🔧 Funcții de management
    loadInitialBalances,
    saveInitialBalances,
    saveBalanceAdjustments,
    loadBalanceAdjustments,
    calculateNextMonthBalances,
    
    // 🚫 Gestionare cheltuieli eliminate
    toggleExpenseStatus,
    saveDisabledExpenses
  };
};