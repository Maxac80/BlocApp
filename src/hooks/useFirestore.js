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
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

export const useAssociationData = () => {
  const { user, userProfile, currentUser } = useAuth();

  // Determină utilizatorul activ (user sau currentUser, oricare este disponibil)
  const activeUser = user || currentUser;

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
        console.log("ℹ️ Nu există blocuri, deci nu există scări");
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
      console.log("✅ Scări încărcate:", stairsData.length, stairsData);
    } catch (err) {
      console.error("❌ Eroare la încărcarea scărilor:", err);
      setStairs([]);
    }
  };

  const loadApartments = async (associationId) => {
    try {
      // Încarcă blocurile asociației
      const blocksQuery = query(
        collection(db, "blocks"),
        where("associationId", "==", associationId)
      );
      const blocksSnapshot = await getDocs(blocksQuery);
      const blockIds = blocksSnapshot.docs.map((doc) => doc.id);

      if (blockIds.length === 0) {
        setApartments([]);
        console.log("ℹ️ Nu există blocuri, deci nu există apartamente");
        return;
      }

      // Încarcă scările pentru aceste blocuri
      const stairsQuery = query(collection(db, "stairs"), where("blockId", "in", blockIds));
      const stairsSnapshot = await getDocs(stairsQuery);
      const stairIds = stairsSnapshot.docs.map((doc) => doc.id);

      if (stairIds.length === 0) {
        setApartments([]);
        console.log("ℹ️ Nu există scări, deci nu există apartamente");
        return;
      }

      // Încarcă apartamentele pentru aceste scări
      const apartmentsQuery = query(collection(db, "apartments"), where("stairId", "in", stairIds));
      const apartmentsSnapshot = await getDocs(apartmentsQuery);
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
      console.log(
        "✅ Apartamente încărcate și sortate:",
        sortedApartments.length,
        sortedApartments
      );
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
      console.log("✅ Cheltuieli încărcate:", expensesData.length, expensesData);
    } catch (err) {
      console.error("❌ Eroare la încărcarea cheltuielilor:", err);
      setExpenses([]);
    }
  };

  const loadCustomExpenses = async (associationId) => {
    try {
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
      console.log("✅ Cheltuieli custom încărcate:", customExpensesData.length);
    } catch (err) {
      console.error("❌ Eroare la încărcarea cheltuielilor custom:", err);
      setCustomExpenses([]);
    }
  };

  const updateBlock = async (blockId, updates) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "blocks", blockId), updateData);
      await loadBlocks(association.id);

      console.log("✅ Bloc actualizat și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la actualizarea blocului:", err);
      throw err;
    }
  };

  const deleteBlock = async (blockId) => {
    if (!association) throw new Error("Nu există asociație");

    try {
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

      console.log("✅ Bloc șters complet și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la ștergerea blocului:", err);
      throw err;
    }
  };

  const updateStair = async (stairId, updates) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "stairs", stairId), updateData);
      await loadStairs(association.id);

      console.log("✅ Scară actualizată și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la actualizarea scării:", err);
      throw err;
    }
  };

  const deleteStair = async (stairId) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      // Șterge toate apartamentele din scară
      const apartmentsQuery = query(collection(db, "apartments"), where("stairId", "==", stairId));
      const apartmentsSnapshot = await getDocs(apartmentsQuery);

      for (const apartmentDoc of apartmentsSnapshot.docs) {
        await deleteDoc(doc(db, "apartments", apartmentDoc.id));
      }

      await deleteDoc(doc(db, "stairs", stairId));

      await Promise.all([loadStairs(association.id), loadApartments(association.id)]);

      console.log("✅ Scară ștearsă complet și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la ștergerea scării:", err);
      throw err;
    }
  };

  // Încărcare automată a datelor când utilizatorul se autentifică
  useEffect(() => {
    console.log("🔄 useEffect triggered");
    console.log("- user:", user?.uid);
    console.log("- currentUser:", currentUser?.uid);
    console.log("- activeUser:", activeUser?.uid);
    console.log("- userProfile:", userProfile?.role);

    if (!activeUser) {
      console.log("❌ Nu există activeUser, opresc loading");
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
          where("userId", "==", activeUser.uid)
        );
        const associationSnapshot = await getDocs(associationQuery);

        console.log("🔍 Căutare asociație - rezultate:", associationSnapshot.docs.length);

        if (!associationSnapshot.empty) {
          const associationDoc = associationSnapshot.docs[0];
          const associationData = { id: associationDoc.id, ...associationDoc.data() };
          setAssociation(associationData);
          console.log("✅ Asociație găsită:", associationData.name);

          // 2. Încarcă toate datele asociate - TRANSMITE associationId
          await Promise.all([
            loadBlocks(associationData.id),
            loadStairs(associationData.id),
            loadApartments(associationData.id),
            loadExpenses(associationData.id),
            loadCustomExpenses(associationData.id),
          ]);
        } else {
          console.log("ℹ️ Nu s-a găsit asociație pentru acest utilizator");
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
    console.log("🏢 createAssociation called");
    console.log("📊 activeUser:", activeUser?.uid);
    console.log("📊 userProfile:", userProfile);
    console.log("📊 data:", data);

    if (!activeUser?.uid) {
      const errorMsg = "Nu ești autentificat. Reîncarcă pagina și încearcă din nou.";
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const associationData = {
        ...data,
        userId: activeUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("💾 Salvez asociația în Firestore:", associationData);

      const docRef = await addDoc(collection(db, "associations"), associationData);
      const newAssociation = { id: docRef.id, ...associationData };
      setAssociation(newAssociation);

      console.log("✅ Asociație creată cu succes:", newAssociation);
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

      console.log("✅ Asociație actualizată");
    } catch (err) {
      console.error("❌ Eroare la actualizarea asociației:", err);
      throw err;
    }
  };

  const addBlock = async (data) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const blockData = {
        ...data,
        associationId: association.id,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "blocks"), blockData);
      const newBlock = { id: docRef.id, ...blockData };

      // Reîncarcă blocurile pentru sincronizare
      await loadBlocks(association.id);

      console.log("✅ Bloc adăugat și date reîncărcate:", newBlock);
      return newBlock;
    } catch (err) {
      console.error("❌ Eroare la adăugarea blocului:", err);
      throw err;
    }
  };

  const addStair = async (data) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const stairData = {
        ...data,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "stairs"), stairData);
      const newStair = { id: docRef.id, ...stairData };

      // Reîncarcă scările pentru sincronizare
      await loadStairs(association.id);

      console.log("✅ Scară adăugată și date reîncărcate:", newStair);
      return newStair;
    } catch (err) {
      console.error("❌ Eroare la adăugarea scării:", err);
      throw err;
    }
  };

  const addApartment = async (data) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      const apartmentData = {
        ...data,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "apartments"), apartmentData);
      const newApartment = { id: docRef.id, ...apartmentData };

      // Reîncarcă apartamentele pentru sincronizare
      await loadApartments(association.id);

      console.log("✅ Apartament adăugat și date reîncărcate:", newApartment);
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

      console.log("✅ Apartament actualizat și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la actualizarea apartamentului:", err);
      throw err;
    }
  };

  const deleteApartment = async (apartmentId) => {
    if (!association) throw new Error("Nu există asociație");

    try {
      await deleteDoc(doc(db, "apartments", apartmentId));

      // Reîncarcă apartamentele pentru sincronizare
      await loadApartments(association.id);

      console.log("✅ Apartament șters și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la ștergerea apartamentului:", err);
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

      const docRef = await addDoc(collection(db, "customExpenses"), expenseData);
      const newExpense = { id: docRef.id, ...expenseData };

      // Reîncarcă cheltuielile custom pentru sincronizare
      await loadCustomExpenses(association.id);

      console.log("✅ Cheltuială custom adăugată și date reîncărcate:", newExpense);
      return newExpense;
    } catch (err) {
      console.error("❌ Eroare la adăugarea cheltuielii custom:", err);
      throw err;
    }
  };

  const deleteCustomExpense = async (expenseName) => {
    if (!association) throw new Error("Nu există asociație");

    try {
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

      console.log("✅ Cheltuială custom ștearsă și date reîncărcate");
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

      console.log("✅ Cheltuială lunară adăugată și date reîncărcate:", newExpense);
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

      console.log("✅ Cheltuială lunară actualizată și date reîncărcate");
    } catch (err) {
      console.error("❌ Eroare la actualizarea cheltuielii lunare:", err);
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
    addCustomExpense,
    deleteCustomExpense,
    addMonthlyExpense,
    updateMonthlyExpense,
    updateBlock,
    deleteBlock,
    updateStair,
    deleteStair,
  };
};
