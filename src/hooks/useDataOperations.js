/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
// hooks/useDataOperations.js
import { useCallback } from 'react';

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

  // Funcții actualizate pentru a folosi hook-urile Firestore
  const handleAddAssociation = useCallback(async (activeUser, newAssociation, resetForm, initializeMonths) => {
    
    if (!newAssociation.name || !newAssociation.address) {
      alert('Te rog completează numele și adresa asociației!');
      return;
    }
    
    if (!activeUser?.uid) {
      alert('Nu ești autentificat. Reîncarcă pagina și încearcă din nou.');
      return;
    }
    
    try {
      const createdAssociation = await createAssociation({
        name: newAssociation.name,
        address: newAssociation.address,
        bankAccount: newAssociation.bankAccount || "",
        administrator: newAssociation.administrator || "",
        president: newAssociation.president || "",
        censor: newAssociation.censor || ""
      });

      resetForm();

      // 🎯 Sheet creation removed - only happens automatically after onboarding completion
      // Nu mai creăm sheet automat la adăugarea manuală de asociații
      // Sheet-ul se creează doar după finalizarea onboarding-ului

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
    
    if (!newStair.name || !newStair.blockId) {
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
    
    
    if (!newApartment.number || !newApartment.persons || !newApartment.stairId || !newApartment.owner) {
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