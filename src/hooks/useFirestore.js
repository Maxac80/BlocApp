import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuthEnhanced } from "../context/AuthContextEnhanced";
import { db } from "../firebase";

export const useAssociationData = (sheetOperationsRef = null) => {
  const { userProfile, currentUser } = useAuthEnhanced();

  // Determină utilizatorul activ
  const activeUser = currentUser;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date principale
  const [association, setAssociation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [stairs, setStairs] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [customExpenses, setCustomExpenses] = useState([]);

  // Funcții pentru încărcarea datelor - CORECTATE
  const loadBlocks = async (associationId) => {
    try {
      console.log("🔍 BLOCKS DEBUG - Loading blocks for associationId:", associationId);
      const blocksQuery = query(
        collection(db, "blocks"),
        where("associationId", "==", associationId)
      );
      const blocksSnapshot = await getDocs(blocksQuery);
      const blocksData = blocksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // ✅ Sortăm în JavaScript în loc de Firestore
      const sortedBlocks = blocksData.sort((a, b) => a.name.localeCompare(b.name));

      setBlocks(sortedBlocks);
      console.log("✅ Blocuri încărcate și sortate:", sortedBlocks.length, sortedBlocks);
      console.log("🔍 BLOCKS DEBUG - Blocks loaded result:", {
        requestedAssociationId: associationId,
        blocksFound: sortedBlocks.length,
        blockIds: sortedBlocks.map(b => b.id),
        blockAssociationIds: sortedBlocks.map(b => b.associationId)
      });
    } catch (err) {
      console.error("❌ Eroare la încărcarea blocurilor:", err);
      setBlocks([]);
    }
  };

  const loadStairs = async (associationId) => {
    try {
      // Încarcă doar scările care aparțin blocurilor acestei asociații
      const blocksQuery = query(
        collection(db, "blocks"),
        where("associationId", "==", associationId)
      );
      const blocksSnapshot = await getDocs(blocksQuery);
      const blockIds = blocksSnapshot.docs.map((doc) => doc.id);

      if (blockIds.length === 0) {
        setStairs([]);
        // console.log("ℹ️ Nu există blocuri, deci nu există scări");
        return;
      }

      // Încarcă scările pentru aceste blocuri
      const stairsQuery = query(collection(db, "stairs"), where("blockId", "in", blockIds));
      const stairsSnapshot = await getDocs(stairsQuery);
      const stairsData = stairsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStairs(stairsData);
      // console.log("✅ Scări încărcate:", stairsData.length, stairsData);
    } catch (err) {
      console.error("❌ Eroare la încărcarea scărilor:", err);
      setStairs([]);
    }
  };

  const loadApartments = async (associationId) => {
    try {
      console.log('🔍 loadApartments called for associationId:', associationId);

      // Încarcă blocurile asociației
      const blocksQuery = query(
        collection(db, "blocks"),
        where("associationId", "==", associationId)
      );
      const blocksSnapshot = await getDocs(blocksQuery);
      const blockIds = blocksSnapshot.docs.map((doc) => doc.id);
      console.log('🔍 Blocks found:', blocksSnapshot.docs.length, 'Block IDs:', blockIds);

      if (blockIds.length === 0) {
        setApartments([]);
        console.log("⚠️ Nu există blocuri, deci nu există apartamente");
        return;
      }

      // Încarcă scările pentru aceste blocuri
      const stairsQuery = query(collection(db, "stairs"), where("blockId", "in", blockIds));
      const stairsSnapshot = await getDocs(stairsQuery);
      const stairIds = stairsSnapshot.docs.map((doc) => doc.id);
      console.log('🔍 Stairs found:', stairsSnapshot.docs.length, 'Stair IDs:', stairIds);

      if (stairIds.length === 0) {
        setApartments([]);
        console.log("⚠️ Nu există scări, deci nu există apartamente");
        return;
      }

      // Încarcă apartamentele pentru aceste scări
      const apartmentsQuery = query(collection(db, "apartments"), where("stairId", "in", stairIds));
      const apartmentsSnapshot = await getDocs(apartmentsQuery);
      console.log('🔍 Apartments found in Firebase:', apartmentsSnapshot.docs.length);
      const apartmentsData = apartmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ Sortează apartamentele după numărul apartamentului (crescător)
      const sortedApartments = apartmentsData.sort((a, b) => {
        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        return numA - numB;
      });

      setApartments(sortedApartments);
      // console.log(
      //   "✅ Apartamente încărcate și sortate:",
      //   sortedApartments.length,
      //   sortedApartments
      // );
    } catch (err) {
      console.error("❌ Eroare la încărcarea apartamentelor:", err);
      setApartments([]);
    }
  };

  const loadExpenses = async (associationId) => {
    try {
      const expensesQuery = query(
        collection(db, "expenses"),
        where("associationId", "==", associationId)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData = expensesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExpenses(expensesData);
      // console.log("✅ Cheltuieli încărcate:", expensesData.length, expensesData);
    } catch (err) {
      console.error("❌ Eroare la încărcarea cheltuielilor:", err);
      setExpenses([]);
    }
  };

  const loadCustomExpenses = async (associationId) => {
    try {
      // Încarcă din sheet în loc de colecție
      const sheetsQuery = query(
        collection(db, "sheets"),
        where("associationId", "==", associationId),
        where("status", "==", "IN_PROGRESS")
      );
      const sheetsSnapshot = await getDocs(sheetsQuery);

      if (!sheetsSnapshot.empty) {
        const sheetData = sheetsSnapshot.docs[0].data();
        const customExpensesData = sheetData.configSnapshot?.customExpenses || [];

        setCustomExpenses(customExpensesData);
        console.log("✅ Cheltuieli custom încărcate din sheet:", customExpensesData.length);
      } else {
        // Fallback la colecție dacă nu există sheet
        const customExpensesQuery = query(
          collection(db, "customExpenses"),
          where("associationId", "==", associationId)
        );
        const customExpensesSnapshot = await getDocs(customExpensesQuery);
        const customExpensesData = customExpensesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCustomExpenses(customExpensesData);
        console.log("⚠️ Cheltuieli custom încărcate din colecție (fallback):", customExpensesData.length);
      }
    } catch (err) {
      console.error("❌ Eroare la încărcarea cheltuielilor custom:", err);
      setCustomExpenses([]);
    }
  };

  const updateBlock = async (blockId, updates) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // 🎯 PRIORITATE: Folosește sheet operations dacă sunt disponibile
      if (sheetOperationsRef?.current?.updateBlockInSheet) {
        console.log('📝 SHEET-BASED: Actualizăm blocul direct în sheet...');
        await sheetOperationsRef.current.updateBlockInSheet(blockId, updates);
        console.log('✅ Bloc actualizat direct în sheet:', blockId);
        return;
      }

      // 📦 FALLBACK: Folosește colecțiile Firebase (pentru compatibilitate)
      console.log('📝 COLLECTION-FALLBACK: Actualizăm blocul în colecții...');

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "blocks", blockId), updateData);
      await loadBlocks(association.id);

      console.log("✅ Bloc actualizat în colecții și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la actualizarea blocului:", err);
      throw err;
    }
  };

  const deleteBlock = async (blockId) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // 🎯 PRIORITATE: Folosește sheet operations dacă sunt disponibile
      if (sheetOperationsRef?.current?.deleteBlockFromSheet) {
        console.log('🗑️ SHEET-BASED: Ștergem blocul direct din sheet...');
        await sheetOperationsRef.current.deleteBlockFromSheet(blockId);
        console.log('✅ Bloc șters direct din sheet:', blockId);
        return;
      }

      // 📦 FALLBACK: Folosește colecțiile Firebase (pentru compatibilitate)
      console.log('🗑️ COLLECTION-FALLBACK: Ștergem blocul din colecții...');

      // Șterge toate scările și apartamentele din bloc
      const stairsQuery = query(collection(db, "stairs"), where("blockId", "==", blockId));
      const stairsSnapshot = await getDocs(stairsQuery);

      for (const stairDoc of stairsSnapshot.docs) {
        const apartmentsQuery = query(
          collection(db, "apartments"),
          where("stairId", "==", stairDoc.id)
        );
        const apartmentsSnapshot = await getDocs(apartmentsQuery);

        for (const apartmentDoc of apartmentsSnapshot.docs) {
          await deleteDoc(doc(db, "apartments", apartmentDoc.id));
        }

        await deleteDoc(doc(db, "stairs", stairDoc.id));
      }

      await deleteDoc(doc(db, "blocks", blockId));

      await Promise.all([
        loadBlocks(association.id),
        loadStairs(association.id),
        loadApartments(association.id),
      ]);

      console.log("✅ Bloc șters complet din colecții și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la ștergerea blocului:", err);
      throw err;
    }
  };

  const updateStair = async (stairId, updates) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // 🎯 PRIORITATE: Folosește sheet operations dacă sunt disponibile
      if (sheetOperationsRef?.current?.updateStairInSheet) {
        console.log('📝 SHEET-BASED: Actualizăm scara direct în sheet...');
        await sheetOperationsRef.current.updateStairInSheet(stairId, updates);
        console.log('✅ Scară actualizată direct în sheet:', stairId);
        return;
      }

      // 📦 FALLBACK: Folosește colecțiile Firebase (pentru compatibilitate)
      console.log('📝 COLLECTION-FALLBACK: Actualizăm scara în colecții...');

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "stairs", stairId), updateData);
      await loadStairs(association.id);

      console.log("✅ Scară actualizată în colecții și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la actualizarea scării:", err);
      throw err;
    }
  };

  const deleteStair = async (stairId) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // 🎯 PRIORITATE: Folosește sheet operations dacă sunt disponibile
      if (sheetOperationsRef?.current?.deleteStairFromSheet) {
        console.log('🗑️ SHEET-BASED: Ștergem scara direct din sheet...');
        await sheetOperationsRef.current.deleteStairFromSheet(stairId);
        console.log('✅ Scară ștearsă direct din sheet:', stairId);
        return;
      }

      // 📦 FALLBACK: Folosește colecțiile Firebase (pentru compatibilitate)
      console.log('🗑️ COLLECTION-FALLBACK: Ștergem scara din colecții...');

      // Șterge toate apartamentele din scară
      const apartmentsQuery = query(collection(db, "apartments"), where("stairId", "==", stairId));
      const apartmentsSnapshot = await getDocs(apartmentsQuery);

      for (const apartmentDoc of apartmentsSnapshot.docs) {
        await deleteDoc(doc(db, "apartments", apartmentDoc.id));
      }

      await deleteDoc(doc(db, "stairs", stairId));

      await Promise.all([loadStairs(association.id), loadApartments(association.id)]);

      console.log("✅ Scară ștearsă complet din colecții și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la ștergerea scării:", err);
      throw err;
    }
  };

  const deleteApartment = async (apartmentId) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // 🎯 PRIORITATE: Folosește sheet operations dacă sunt disponibile
      if (sheetOperationsRef?.current?.deleteApartmentFromSheet) {
        console.log('🗑️ SHEET-BASED: Ștergem apartamentul direct din sheet...');
        await sheetOperationsRef.current.deleteApartmentFromSheet(apartmentId);
        console.log('✅ Apartament șters direct din sheet:', apartmentId);
        return;
      }

      // 📦 FALLBACK: Folosește colecțiile Firebase (pentru compatibilitate)
      console.log('🗑️ COLLECTION-FALLBACK: Ștergem apartamentul din colecții...');

      await deleteDoc(doc(db, "apartments", apartmentId));
      await loadApartments(association.id);

      console.log("✅ Apartament șters din colecții și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la ștergerea apartamentului:", err);
      throw err;
    }
  };

  // Încărcare automată a datelor când utilizatorul se autentifică
  useEffect(() => {
    // console.log("🔄 useEffect triggered");
    // console.log("- currentUser:", currentUser?.uid);
    // console.log("- activeUser:", activeUser?.uid);
    // console.log("- userProfile:", userProfile?.role);

    if (!activeUser) {
      // console.log("❌ Nu există activeUser, opresc loading");
      setLoading(false);
      setAssociation(null);
      setBlocks([]);
      setStairs([]);
      setApartments([]);
      setExpenses([]);
      setCustomExpenses([]);
      return;
    }

    const loadUserData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("🔄 Încărcare date pentru utilizator:", activeUser.uid);

        // 1. Încarcă asociația utilizatorului
        const associationQuery = query(
          collection(db, "associations"),
          where("adminId", "==", activeUser.uid)
        );
        const associationSnapshot = await getDocs(associationQuery);

        console.log("🔍 Căutare asociație - rezultate:", associationSnapshot.docs.length);
        console.log("🔍 Căutare pentru adminId:", activeUser.uid);

        if (!associationSnapshot.empty) {
          const associationDoc = associationSnapshot.docs[0];
          const associationData = { id: associationDoc.id, ...associationDoc.data() };
          setAssociation(associationData);
          console.log("✅ Asociație găsită și setată:", associationData.name, "ID:", associationData.id);
          console.log("🔍 ASSOCIATION DEBUG - Full association data:", associationData);

          // 2. Încarcă toate datele asociate - TRANSMITE associationId
          await Promise.all([
            loadBlocks(associationData.id),
            loadStairs(associationData.id),
            loadApartments(associationData.id),
            loadExpenses(associationData.id),
            loadCustomExpenses(associationData.id),
          ]);
        } else {
          console.log("❌ Nu s-a găsit asociație pentru acest utilizator");
          setAssociation(null);
          setBlocks([]);
          setStairs([]);
          setApartments([]);
          setExpenses([]);
          setCustomExpenses([]);
        }
      } catch (err) {
        console.error("❌ Eroare la încărcarea datelor:", err);
        setError("Eroare la încărcarea datelor: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [activeUser, userProfile]);

  // Funcții CRUD cu reîncărcare automată
  const createAssociation = async (data) => {
    // console.log("🏢 createAssociation called");
    // console.log("📊 activeUser:", activeUser?.uid);
    // console.log("📊 userProfile:", userProfile);
    // console.log("📊 data:", data);

    if (!activeUser?.uid) {
      const errorMsg = "Nu ești autentificat. Reîncarcă pagina și încearcă din nou.";
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const associationData = {
        ...data,
        adminId: activeUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // console.log("💾 Salvez asociația în Firestore:", associationData);

      const docRef = await addDoc(collection(db, "associations"), associationData);
      const newAssociation = { id: docRef.id, ...associationData };
      setAssociation(newAssociation);

      // console.log("✅ Asociație creată cu succes:", newAssociation);
      return newAssociation;
    } catch (err) {
      console.error("❌ Eroare la crearea asociației:", err);

      if (err.code === "permission-denied") {
        throw new Error("Nu ai permisiunea să creezi o asociație. Verifică configurația Firebase.");
      } else if (err.code === "unavailable") {
        throw new Error("Serviciul este temporar indisponibil. Încearcă din nou.");
      } else {
        throw new Error(`Eroare la salvarea datelor: ${err.message}`);
      }
    }
  };

  const updateAssociation = async (updates) => {
    if (!association) throw new Error("Nu există asociație de actualizat");

    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "associations", association.id), updateData);
      setAssociation((prev) => ({ ...prev, ...updateData }));

      // console.log("✅ Asociație actualizată");
    } catch (err) {
      console.error("❌ Eroare la actualizarea asociației:", err);
      throw err;
    }
  };

  const addBlock = async (data) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // 🆕 SHEET-BASED: Adaugă blocul direct în sheet în loc de colecții
      if (sheetOperationsRef?.current?.addBlockToSheet) {
        console.log('🏗️ SHEET-BASED: Adăugăm blocul direct în sheet...');
        const newBlock = await sheetOperationsRef.current.addBlockToSheet(data);
        console.log('✅ Bloc adăugat direct în sheet:', newBlock);
        return newBlock;
      }

      // 🔄 FALLBACK: Salvare în colecții (compatibilitate cu versiuni vechi)
      console.log('⚠️ FALLBACK: Salvez blocul în colecții (nu este recomandat)');
      const blockData = {
        ...data,
        associationId: association.id,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "blocks"), blockData);
      const newBlock = { id: docRef.id, ...blockData };

      // Reîncarcă blocurile pentru sincronizare
      await loadBlocks(association.id);

      console.log("✅ Bloc adăugat în colecții și date reîncărcate:", newBlock);
      return newBlock;
    } catch (err) {
      console.error("❌ Eroare la adăugarea blocului:", err);
      throw err;
    }
  };

  const addStair = async (data) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // 🆕 SHEET-BASED: Adaugă scara direct în sheet în loc de colecții
      if (sheetOperationsRef?.current?.addStairToSheet) {
        console.log('🏗️ SHEET-BASED: Adăugăm scara direct în sheet...');
        const newStair = await sheetOperationsRef.current.addStairToSheet(data);
        console.log('✅ Scară adăugată direct în sheet:', newStair);
        return newStair;
      }

      // 🔄 FALLBACK: Salvare în colecții (compatibilitate cu versiuni vechi)
      console.log('⚠️ FALLBACK: Salvez scara în colecții (nu este recomandat)');
      const stairData = {
        ...data,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "stairs"), stairData);
      const newStair = { id: docRef.id, ...stairData };

      // Reîncarcă scările pentru sincronizare
      await loadStairs(association.id);

      console.log("✅ Scară adăugată în colecții și date reîncărcate:", newStair);
      return newStair;
    } catch (err) {
      console.error("❌ Eroare la adăugarea scării:", err);
      throw err;
    }
  };

  const addApartment = async (data) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // 🆕 SHEET-BASED: Adaugă apartamentul direct în sheet în loc de colecții
      if (sheetOperationsRef?.current?.addApartmentToSheet) {
        console.log('🏗️ SHEET-BASED: Adăugăm apartamentul direct în sheet...');
        const newApartment = await sheetOperationsRef.current.addApartmentToSheet(data);
        console.log('✅ Apartament adăugat direct în sheet:', newApartment);
        return newApartment;
      }

      // 🔄 FALLBACK: Salvare în colecții (compatibilitate cu versiuni vechi)
      console.log('⚠️ FALLBACK: Salvez apartamentul în colecții (nu este recomandat)');
      const apartmentData = {
        ...data,
        // Adaugă solduri inițiale dacă sunt furnizate, altfel valori default
        initialBalance: data.initialBalance || {
          restante: 0,
          penalitati: 0,
          setupMonth: new Date().toISOString().slice(0, 7), // Format YYYY-MM
          createdAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "apartments"), apartmentData);
      const newApartment = { id: docRef.id, ...apartmentData };

      // Reîncarcă apartamentele pentru sincronizare
      await loadApartments(association.id);

      console.log("✅ Apartament adăugat în colecții și date reîncărcate:", newApartment);
      return newApartment;
    } catch (err) {
      console.error("❌ Eroare la adăugarea apartamentului:", err);
      throw err;
    }
  };

  const updateApartment = async (apartmentId, updates) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "apartments", apartmentId), updateData);

      // Reîncarcă apartamentele pentru sincronizare
      await loadApartments(association.id);

      // console.log("✅ Apartament actualizat și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la actualizarea apartamentului:", err);
      throw err;
    }
  };

  // Funcție pentru actualizarea în masă a soldurilor inițiale
  const updateInitialBalances = async (balancesData) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const updatePromises = balancesData.map(async ({ apartmentId, restante, penalitati }) => {
        const updateData = {
          initialBalance: {
            restante: parseFloat(restante) || 0,
            penalitati: parseFloat(penalitati) || 0,
            setupMonth: new Date().toISOString().slice(0, 7),
            createdAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
        
        return updateDoc(doc(db, "apartments", apartmentId), updateData);
      });

      await Promise.all(updatePromises);
      
      // Reîncarcă apartamentele pentru sincronizare
      await loadApartments(association.id);

      // console.log("✅ Solduri inițiale actualizate pentru", balancesData.length, "apartamente");
      return true;
    } catch (err) {
      console.error("❌ Eroare la actualizarea soldurilor inițiale:", err);
      throw err;
    }
  };

  const addCustomExpense = async (data) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const expenseData = {
        ...data,
        associationId: association.id,
        createdAt: new Date().toISOString(),
      };

      // 🎯 PRIORITATE: Salvează în sheet-based storage dacă este disponibil
      if (sheetOperationsRef?.current?.updateConfigSnapshot && sheetOperationsRef?.current?.currentSheet) {
        const currentSheet = sheetOperationsRef.current.currentSheet;
        const currentCustomExpenses = currentSheet.configSnapshot?.customExpenses || [];

        // Generează un ID unic pentru noua cheltuială custom (fără associationId)
        const newExpenseWithId = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...data, // folosește data originală fără associationId
          createdAt: new Date().toISOString()
        };

        // Adaugă noua cheltuială la array
        const updatedCustomExpenses = [...currentCustomExpenses, newExpenseWithId];

        // Actualizează configSnapshot
        await sheetOperationsRef.current.updateConfigSnapshot({
          ...currentSheet.configSnapshot,
          customExpenses: updatedCustomExpenses
        });

        console.log("✅ [SHEET-BASED] Cheltuială custom adăugată în sheet:", newExpenseWithId);

        // Actualizează direct state-ul local pentru afișare imediată
        setCustomExpenses(updatedCustomExpenses);

        return newExpenseWithId;
      }

      // FALLBACK: Metoda veche cu colecții separate (pentru compatibilitate)
      console.warn('⚠️ Folosesc fallback la colecții separate pentru customExpenses');

      const docRef = await addDoc(collection(db, "customExpenses"), expenseData);
      const newExpense = { id: docRef.id, ...expenseData };

      // Reîncarcă cheltuielile custom pentru sincronizare
      await loadCustomExpenses(association.id);

      console.log("✅ [FALLBACK] Cheltuială custom adăugată în colecție:", newExpense);
      return newExpense;
    } catch (err) {
      console.error("❌ Eroare la adăugarea cheltuielii custom:", err);
      throw err;
    }
  };

  const deleteCustomExpense = async (expenseName) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // 🎯 PRIORITATE: Șterge din sheet-based storage dacă este disponibil
      if (sheetOperationsRef?.current?.updateConfigSnapshot && sheetOperationsRef?.current?.currentSheet) {
        const currentSheet = sheetOperationsRef.current.currentSheet;
        const currentCustomExpenses = currentSheet.configSnapshot?.customExpenses || [];

        // Filtrează pentru a elimina cheltuiala cu numele specificat
        const updatedCustomExpenses = currentCustomExpenses.filter(
          expense => expense.name !== expenseName
        );

        // Elimină cheltuiala și din disabledExpenses dacă există acolo
        const currentDisabledExpenses = currentSheet.configSnapshot?.disabledExpenses || [];
        const updatedDisabledExpenses = currentDisabledExpenses.filter(
          disabledExpenseName => disabledExpenseName !== expenseName
        );

        // Actualizează configSnapshot cu ambele modificări
        await sheetOperationsRef.current.updateConfigSnapshot({
          ...currentSheet.configSnapshot,
          customExpenses: updatedCustomExpenses,
          disabledExpenses: updatedDisabledExpenses
        });

        console.log(`✅ [SHEET-BASED] Cheltuială custom "${expenseName}" ștearsă din sheet`);

        // Actualizează direct state-ul local pentru afișare imediată
        setCustomExpenses(updatedCustomExpenses);

        return;
      }

      // FALLBACK: Metoda veche cu colecții separate (pentru compatibilitate)
      console.warn('⚠️ Folosesc fallback la colecții separate pentru ștergerea customExpenses');

      const expenseQuery = query(
        collection(db, "customExpenses"),
        where("associationId", "==", association.id),
        where("name", "==", expenseName)
      );

      const snapshot = await getDocs(expenseQuery);

      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(doc(db, "customExpenses", docSnapshot.id));
      }

      // Reîncarcă cheltuielile custom pentru sincronizare
      await loadCustomExpenses(association.id);

      console.log(`✅ [FALLBACK] Cheltuială custom "${expenseName}" ștearsă din colecție`);
    } catch (err) {
      console.error("❌ Eroare la ștergerea cheltuielii custom:", err);
      throw err;
    }
  };

  const addMonthlyExpense = async (data) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const expenseData = {
        ...data,
        associationId: association.id,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "expenses"), expenseData);
      const newExpense = { id: docRef.id, ...expenseData };

      // Reîncarcă cheltuielile pentru sincronizare
      await loadExpenses(association.id);

      // console.log("✅ Cheltuială lunară adăugată și date reîncărcate:", newExpense);
      return newExpense;
    } catch (err) {
      console.error("❌ Eroare la adăugarea cheltuielii lunare:", err);
      throw err;
    }
  };

  const updateMonthlyExpense = async (expenseId, updates) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "expenses", expenseId), updateData);

      // Reîncarcă cheltuielile pentru sincronizare
      await loadExpenses(association.id);

      // console.log("✅ Cheltuială lunară actualizată și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la actualizarea cheltuielii lunare:", err);
      throw err;
    }
  };

  const deleteMonthlyExpense = async (expenseId) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      await deleteDoc(doc(db, "expenses", expenseId));

      // Reîncarcă cheltuielile pentru sincronizare
      await loadExpenses(association.id);

      // console.log("✅ Cheltuială lunară ștearsă și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la ștergerea cheltuielii lunare:", err);
      throw err;
    }
  };

  // Funcție pentru curățarea cheltuielilor invalide
  const cleanupInvalidExpenses = async () => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const expensesQuery = query(
        collection(db, "expenses"),
        where("associationId", "==", association.id)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      
      let deletedCount = 0;
      
      for (const docSnapshot of expensesSnapshot.docs) {
        const expense = docSnapshot.data();
        
        // Verifică dacă cheltuiala este invalidă
        const isInvalid = 
          (!expense.amount || expense.amount === 0) && 
          (!expense.billAmount || expense.billAmount === 0) &&
          (!expense.individualAmounts || Object.keys(expense.individualAmounts).length === 0 || 
           Object.values(expense.individualAmounts).every(val => !val || val === 0)) &&
          (!expense.consumption || Object.keys(expense.consumption).length === 0 || 
           Object.values(expense.consumption).every(val => !val || val === 0));
        
        if (isInvalid) {
          await deleteDoc(doc(db, "expenses", docSnapshot.id));
          deletedCount++;
          // console.log(`🗑️ Șters cheltuială invalidă: ${expense.name} din ${expense.month}`);
        }
      }
      
      if (deletedCount > 0) {
        await loadExpenses(association.id);
        // console.log(`✅ Curățate ${deletedCount} cheltuieli invalide`);
      }
      
      return deletedCount;
    } catch (err) {
      console.error("❌ Eroare la curățarea cheltuielilor invalide:", err);
      throw err;
    }
  };

  return {
    loading,
    error,
    association,
    blocks,
    stairs,
    apartments,
    expenses,
    customExpenses,
    createAssociation,
    updateAssociation,
    addBlock,
    addStair,
    addApartment,
    updateApartment,
    deleteApartment,
    updateInitialBalances,
    addCustomExpense,
    deleteCustomExpense,
    addMonthlyExpense,
    updateMonthlyExpense,
    deleteMonthlyExpense,
    cleanupInvalidExpenses,
    updateBlock,
    deleteBlock,
    updateStair,
    deleteStair,
  };
};
