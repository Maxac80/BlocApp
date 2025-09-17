// hooks/useDataOperations.js
import { useCallback } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export const useDataOperations = ({
  association,
  blocks,
  stairs,
  apartments,
  createAssociation,
  addBlock,
  addStair,
  addApartment,
  updateApartment,
  deleteApartment,
  updateBlock,
  deleteBlock,
  updateStair,
  deleteStair
}) => {

  // Funcție pentru ștergerea tuturor datelor BlocApp
  const deleteAllBlocAppData = useCallback(async () => {
    if (!window.confirm('⚠️ ATENȚIE! Ești sigur că vrei să ștergi TOATE datele?\n\nAceasta va șterge:\n- Toate asociațiile\n- Toate blocurile\n- Toate scările\n- Toate apartamentele\n- Toate cheltuielile\n- Toate soldurile și ajustările\n- Toate configurările\n- Toate profilurile utilizatori\n\nAceastă acțiune este IREVERSIBILĂ!')) {
      return;
    }
    
    // A doua confirmare pentru siguranță
    if (!window.confirm('🚨 ULTIMA CONFIRMARE!\n\nEști 100% sigur? Toate datele vor fi șterse definitiv!')) {
      return;
    }
    
    // console.log('🚨 ȘTERGERE COMPLETĂ A DATELOR ÎNCEPUT...');
    
    // Afișează un loading pentru utilizator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-size: 18px;
      font-weight: bold;
    `;
    loadingDiv.innerHTML = '🗑️ Șterge toate datele... Te rog așteaptă...';
    document.body.appendChild(loadingDiv);
    
    try {
      // Lista completă a colecțiilor care trebuie șterse
      const collectionsToDelete = [
        'expenses',
        'customExpenses',
        'apartments',
        'stairs',
        'blocks',
        'associations',
        'balanceAdjustments',
        'disabledExpenses',
        'initialBalances',
        'users',
        'test',
        'audit_logs',
        'login_attempts',
        'onboarding_progress',
        'user_profiles',
        'expenseConfigurations',
        'incasari',
        'invoices',
        'monthStatuses',
        'sheets',
        'suppliers'
      ];

      // Șterge toate colecțiile în paralel pentru viteză
      const deletePromises = collectionsToDelete.map(async (collectionName) => {
        try {
          // console.log(`🗑️ Șterg colecția: ${collectionName}`);
          
          const collectionRef = collection(db, collectionName);
          const querySnapshot = await getDocs(collectionRef);
          
          if (querySnapshot.empty) {
            // console.log(`📭 Colecția ${collectionName} este goală`);
            return;
          }
          
          const batch = [];
          querySnapshot.forEach((document) => {
            batch.push(deleteDoc(doc(db, collectionName, document.id)));
          });
          
          await Promise.all(batch);
          // console.log(`✅ Colecția ${collectionName} ștearsă complet (${batch.length} documente)`);
        } catch (error) {
          console.error(`❌ Eroare la ștergerea colecției ${collectionName}:`, error);
        }
      });

      // Așteaptă ca toate colecțiile să fie șterse
      await Promise.all(deletePromises);
      
      // console.log('✅ TOATE DATELE AU FOST ȘTERSE!');
      
      // Actualizează mesajul de loading
      loadingDiv.innerHTML = '✅ Date șterse! Resetez aplicația...';
      
      // Forțează o resetare completă
      try {
        // Șterge toate datele din localStorage
        localStorage.clear();
        
        // Șterge toate cookie-urile
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // Șterge toate datele din sessionStorage
        sessionStorage.clear();
        
        // Încearcă deconectarea Firebase
        try {
          const { signOut } = await import('firebase/auth');
          const { auth } = await import('../firebase');
          await signOut(auth);
          // console.log('✅ Utilizator deconectat');
        } catch (authError) {
          // console.log('⚠️ Nu s-a putut deconecta utilizatorul:', authError);
        }
        
        // console.log('🔄 Reîncărcare forțată...');
        
        // Forțează reîncărcarea completă (fără cache)
        window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
        
      } catch (resetError) {
        console.error('❌ Eroare la resetare:', resetError);
        // Fallback: reîncărcare simplă
        window.location.reload(true);
      }
      
    } catch (error) {
      console.error('❌ Eroare la ștergerea datelor:', error);
      
      // Elimină loading-ul
      if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }
      
      alert('❌ Eroare la ștergerea datelor: ' + error.message);
    }
  }, []);

  // Funcție pentru ștergerea doar a datelor asociației curente
  const deleteCurrentAssociationData = useCallback(async () => {
    if (!association) {
      alert('Nu există asociație de șters');
      return;
    }
    
    if (!window.confirm(`Ești sigur că vrei să ștergi datele asociației "${association.name}"?\n\nAceasta va șterge toate blocurile, scările, apartamentele și cheltuielile acestei asociații.`)) {
      return;
    }
    
    try {
      // console.log('🗑️ Șterg datele asociației:', association.id, association.name);
      
      // Șterge cheltuielile asociației
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('associationId', '==', association.id)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      for (const expenseDoc of expensesSnapshot.docs) {
        await deleteDoc(doc(db, 'expenses', expenseDoc.id));
      }
      // console.log(`✅ Șterse ${expensesSnapshot.docs.length} cheltuieli`);
      
      // Șterge cheltuielile custom ale asociației
      const customExpensesQuery = query(
        collection(db, 'customExpenses'),
        where('associationId', '==', association.id)
      );
      const customExpensesSnapshot = await getDocs(customExpensesQuery);
      for (const customExpenseDoc of customExpensesSnapshot.docs) {
        await deleteDoc(doc(db, 'customExpenses', customExpenseDoc.id));
      }
      // console.log(`✅ Șterse ${customExpensesSnapshot.docs.length} cheltuieli custom`);
      
      // Șterge apartamentele (prin scări și blocuri)
      const blocksQuery = query(
        collection(db, 'blocks'),
        where('associationId', '==', association.id)
      );
      const blocksSnapshot = await getDocs(blocksQuery);
      const blockIds = blocksSnapshot.docs.map(doc => doc.id);
      
      if (blockIds.length > 0) {
        const stairsQuery = query(
          collection(db, 'stairs'),
          where('blockId', 'in', blockIds)
        );
        const stairsSnapshot = await getDocs(stairsQuery);
        const stairIds = stairsSnapshot.docs.map(doc => doc.id);
        
        if (stairIds.length > 0) {
          const apartmentsQuery = query(
            collection(db, 'apartments'),
            where('stairId', 'in', stairIds)
          );
          const apartmentsSnapshot = await getDocs(apartmentsQuery);
          for (const apartmentDoc of apartmentsSnapshot.docs) {
            await deleteDoc(doc(db, 'apartments', apartmentDoc.id));
          }
          // console.log(`✅ Șterse ${apartmentsSnapshot.docs.length} apartamente`);
        }
        
        // Șterge scările
        for (const stairDoc of stairsSnapshot.docs) {
          await deleteDoc(doc(db, 'stairs', stairDoc.id));
        }
        // console.log(`✅ Șterse ${stairsSnapshot.docs.length} scări`);
      }
      
      // Șterge blocurile
      for (const blockDoc of blocksSnapshot.docs) {
        await deleteDoc(doc(db, 'blocks', blockDoc.id));
      }
      // console.log(`✅ Șterse ${blocksSnapshot.docs.length} blocuri`);
      
      // Șterge asociația
      await deleteDoc(doc(db, 'associations', association.id));
      // console.log('✅ Asociația ștearsă');
      
      alert(`✅ Datele asociației "${association.name}" au fost șterse cu succes!\n\nPagina se va reîncărca...`);
      
      // Reîncarcă pagina
      window.location.reload();
    } catch (error) {
      console.error('❌ Eroare la ștergerea datelor asociației:', error);
      alert('❌ Eroare la ștergerea datelor: ' + error.message);
    }
  }, [association]);

  // Funcții actualizate pentru a folosi hook-urile Firestore
  const handleAddAssociation = useCallback(async (activeUser, newAssociation, resetForm, initializeMonths) => {
    // console.log('🏢 handleAddAssociation called');
    // console.log('📊 newAssociation:', newAssociation);
    // console.log('📊 activeUser:', activeUser);
    
    if (!newAssociation.name || !newAssociation.address) {
      alert('Te rog completează numele și adresa asociației!');
      return;
    }
    
    if (!activeUser?.uid) {
      alert('Nu ești autentificat. Reîncarcă pagina și încearcă din nou.');
      return;
    }
    
    try {
      console.log('🚀 ÎNCEPE CREAREA ASOCIAȚIEI...');
      const createdAssociation = await createAssociation({
        name: newAssociation.name,
        address: newAssociation.address,
        bankAccount: newAssociation.bankAccount || "",
        administrator: newAssociation.administrator || "",
        president: newAssociation.president || "",
        censor: newAssociation.censor || ""
      });

      resetForm();

      // Inițializează sheet-ul pentru noua asociație
      // Trimitem datele asociației și ID-ul pentru a crea primul sheet
      const associationData = {
        id: createdAssociation.id, // Adăugăm ID-ul aici
        name: newAssociation.name,
        cui: newAssociation.cui || "",
        address: newAssociation.address,
        bankAccount: newAssociation.bankAccount || "",
        administrator: newAssociation.administrator || "",
        president: newAssociation.president || "",
        censor: newAssociation.censor || ""
      };
      console.log('🎯 APELEAZĂ INITIALIZE MONTHS cu ID:', createdAssociation.id);
      initializeMonths(associationData, createdAssociation.id); // Trimitem și ID-ul ca parametru separat

      console.log('✅ ASOCIAȚIE CREATĂ CU SUCCES!');
    } catch (error) {
      console.error('❌ Eroare la crearea asociației:', error);
      alert('Eroare la crearea asociației: ' + error.message);
    }
  }, [createAssociation]);

  const handleAddBlock = useCallback(async (newBlock, resetForm) => {
    if (!newBlock.name || !association) return;
    
    try {
      await addBlock({
        name: newBlock.name
      });
      resetForm();
    } catch (error) {
      console.error('Error adding block:', error);
      alert('Eroare la adăugarea blocului. Încearcă din nou.');
    }
  }, [addBlock, association]);

  const handleAddStair = useCallback(async (newStair, resetForm) => {
    // console.log('🔼 handleAddStair - newStair:', newStair);
    // console.log('🔼 handleAddStair - blockId type:', typeof newStair.blockId, newStair.blockId);
    
    if (!newStair.name || !newStair.blockId) {
      // console.log('❌ Validare eșuată - lipsește numele sau blockId');
      alert('Te rog completează numele scării și selectează blocul!');
      return;
    }
    
    try {
      await addStair({
        name: newStair.name,
        blockId: newStair.blockId
      });
      resetForm();
    } catch (error) {
      console.error('Error adding stair:', error);
      alert('Eroare la adăugarea scării: ' + error.message);
    }
  }, [addStair]);

  const handleAddApartment = useCallback(async (newApartment, resetForm) => {
    const getAvailableStairs = () => {
      if (!association) return [];
      const associationBlocks = blocks.filter(block => block.associationId === association.id);
      return stairs.filter(stair => 
        associationBlocks.some(block => block.id === stair.blockId)
      );
    };
    
    const availableStairs = getAvailableStairs();
    
    // console.log('👥 handleAddApartment - newApartment:', newApartment);
    // console.log('👥 handleAddApartment - stairId type:', typeof newApartment.stairId, newApartment.stairId);
    // console.log('👥 handleAddApartment - availableStairs:', availableStairs);
    
    if (!newApartment.number || !newApartment.persons || !newApartment.stairId || !newApartment.owner) {
      // console.log('❌ Validare eșuată - lipsesc datele obligatorii');
      alert('Te rog completează toate câmpurile obligatorii (nr apartament, proprietar, persoane, scara)!');
      return;
    }
    
    try {
      await addApartment({
        number: parseInt(newApartment.number),
        persons: parseInt(newApartment.persons),
        stairId: newApartment.stairId,
        owner: newApartment.owner,
        surface: newApartment.surface ? parseFloat(newApartment.surface) : null,
        apartmentType: newApartment.apartmentType || null,
        heatingSource: newApartment.heatingSource || null
      });
      
      resetForm(true); // Keep stairId
    } catch (error) {
      console.error('Error adding apartment:', error);
      alert('Eroare la adăugarea apartamentului: ' + error.message);
    }
  }, [addApartment, association, blocks, stairs]);

  // Funcții pentru editarea apartamentelor
  const saveApartmentEdit = useCallback(async (apartmentId, editingApartmentData, onSuccess) => {
    try {
      await updateApartment(apartmentId, {
        owner: editingApartmentData.owner,
        persons: parseInt(editingApartmentData.persons),
        apartmentType: editingApartmentData.apartmentType || null,
        surface: editingApartmentData.surface ? parseFloat(editingApartmentData.surface) : null,
        heatingSource: editingApartmentData.heatingSource || null
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error updating apartment:', error);
      alert('Eroare la actualizarea apartamentului. Încearcă din nou.');
    }
  }, [updateApartment]);

  const handleDeleteApartment = useCallback(async (apartmentId) => {
    if (window.confirm("Ești sigur că vrei să ștergi acest apartament?")) {
      try {
        await deleteApartment(apartmentId);
      } catch (error) {
        console.error('Error deleting apartment:', error);
        alert('Eroare la ștergerea apartamentului. Încearcă din nou.');
      }
    }
  }, [deleteApartment]);

  // Helper pentru a obține scările disponibile
  const getAvailableStairs = useCallback(() => {
    if (!association) return [];
    const associationBlocks = blocks.filter(block => block.associationId === association.id);
    return stairs.filter(stair => 
      associationBlocks.some(block => block.id === stair.blockId)
    );
  }, [association, blocks, stairs]);

  return {
    // Delete operations
    deleteAllBlocAppData,
    deleteCurrentAssociationData,
    
    // CRUD operations
    handleAddAssociation,
    handleAddBlock,
    handleAddStair,
    handleAddApartment,
    saveApartmentEdit,
    handleDeleteApartment,
    
    // Helpers
    getAvailableStairs,
    
    // Direct access to base operations
    updateBlock,
    deleteBlock,
    updateStair,
    deleteStair,
    updateApartment,
    deleteApartment,
  };
};