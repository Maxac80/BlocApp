/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
// Firebase Storage nu mai este necesar - folosim Base64
import { db } from '../firebase';
import { getInvoicesCollection, getInvoiceRef } from '../utils/firestoreHelpers';
import useExpenseConfigurations from './useExpenseConfigurations';

/**
 * 🧾 Custom Hook pentru Gestionarea Facturilor
 * 
 * RESPONSABILITĂȚI:
 * - CRUD complet pentru facturi
 * - Upload/download PDF-uri facturi
 * - Sincronizare real-time cu Firebase
 * - Filtrare și căutare facturi
 */
const useInvoices = (associationId, currentSheet) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hook pentru obținerea configurațiilor de cheltuieli (pentru furnizori)
  const { getExpenseConfig } = useExpenseConfigurations(currentSheet);

  // 🔄 ÎNCĂRCAREA FACTURILOR LA SCHIMBAREA ASOCIAȚIEI
  useEffect(() => {
    if (!associationId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    // Query pentru toate facturile asociației din structura nested
    // NU mai e nevoie de where('associationId', '==', associationId)
    // pentru că path-ul deja izolează facturile per asociație
    const invoicesCollection = getInvoicesCollection(associationId);

    // Listener pentru modificări în timp real
    const unsubscribe = onSnapshot(
      invoicesCollection,
      (snapshot) => {
        const invoicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setInvoices(invoicesData);
        setLoading(false);
        if (invoicesData.length > 0) {
        }
      },
      (error) => {
        console.error('❌ Eroare la încărcarea facturilor:', error);
        setInvoices([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId]);

  // 📝 ACTUALIZAREA DISTRIBUȚIEI UNEI FACTURI EXISTENTE
  const updateInvoiceDistribution = useCallback(async (invoiceId, distributionData) => {
    try {
      
      // Obține factura existentă
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        throw new Error('Factura nu a fost găsită');
      }
      
      const currentDistribution = parseFloat(distributionData.amount) || 0;
      const newDistributedAmount = (invoice.distributedAmount || 0) + currentDistribution;
      const newRemainingAmount = (invoice.totalInvoiceAmount || invoice.totalAmount) - newDistributedAmount;
      const isFullyDistributed = newRemainingAmount <= 0;
      
      
      // Verifică dacă există deja o intrare pentru acest expenseId sau expenseTypeId în distributionHistory
      const existingHistory = invoice.distributionHistory || [];
      const existingEntryIndex = existingHistory.findIndex(entry => {
        // Verifică după expenseId (ID document) sau expenseTypeId (ID tip cheltuială)
        if (distributionData.expenseId && entry.expenseId === distributionData.expenseId) {
          return true;
        }
        if (distributionData.expenseTypeId && entry.expenseTypeId === distributionData.expenseTypeId) {
          return true;
        }
        return false;
      });

      let updatedHistory;
      let actualNewDistributedAmount;

      if (existingEntryIndex >= 0) {
        // ACTUALIZARE - există deja o intrare pentru acest expense

        const oldAmount = existingHistory[existingEntryIndex].amount || 0;

        // Recalculează distributedAmount: scade suma veche, adaugă suma nouă
        actualNewDistributedAmount = (invoice.distributedAmount || 0) - oldAmount + currentDistribution;

        // Actualizează intrarea existentă
        const updatedEntry = {
          ...existingHistory[existingEntryIndex],
          sheetId: distributionData.sheetId || existingHistory[existingEntryIndex].sheetId,
          month: distributionData.month || existingHistory[existingEntryIndex].month,
          amount: currentDistribution,
          expenseTypeId: distributionData.expenseTypeId || existingHistory[existingEntryIndex].expenseTypeId,  // ID-ul tipului de cheltuială
          expenseName: distributionData.expenseName || existingHistory[existingEntryIndex].expenseName,  // Păstrăm numele pentru afișare
          distributedAt: new Date().toISOString(),
          notes: distributionData.notes || existingHistory[existingEntryIndex].notes
        };

        updatedHistory = [
          ...existingHistory.slice(0, existingEntryIndex),
          updatedEntry,
          ...existingHistory.slice(existingEntryIndex + 1)
        ];
      } else {
        // ADĂUGARE - nu există o intrare pentru acest expenseId, adaugă una nouă

        actualNewDistributedAmount = newDistributedAmount;

        const newDistributionEntry = {
          sheetId: distributionData.sheetId || null,
          month: distributionData.month,
          amount: currentDistribution,
          expenseId: distributionData.expenseId || null,
          expenseTypeId: distributionData.expenseTypeId || null,  // ID-ul tipului de cheltuială
          expenseName: distributionData.expenseName || null,  // Păstrăm numele pentru afișare
          distributedAt: new Date().toISOString(),
          notes: distributionData.notes || ''
        };

        updatedHistory = [...existingHistory, newDistributionEntry];
      }

      const actualNewRemainingAmount = (invoice.totalInvoiceAmount || invoice.totalAmount) - actualNewDistributedAmount;
      const actualIsFullyDistributed = actualNewRemainingAmount <= 0;

      // Actualizează factura
      const invoiceRef = getInvoiceRef(associationId, invoiceId);
      await updateDoc(invoiceRef, {
        distributedAmount: actualNewDistributedAmount,
        remainingAmount: actualNewRemainingAmount,
        isFullyDistributed: actualIsFullyDistributed,
        distributionHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      });
      
      
      // Așteaptă puțin pentru a permite sincronizarea Firestore înainte de următoarea operație
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('❌ Eroare la actualizarea distribuției:', error);
      throw error;
    }
  }, [invoices]);

  // 🗑️ REVERSAREA DISTRIBUȚIEI (când se șterge o cheltuială distribuită)
  const removeInvoiceDistribution = useCallback(async (invoiceId, expenseId, expenseTypeId = null) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) return false;

      const existingHistory = invoice.distributionHistory || [];
      const entryIndex = existingHistory.findIndex(entry => {
        if (expenseId && entry.expenseId === expenseId) return true;
        if (expenseId && entry.expenseTypeId === expenseId) return true;
        if (expenseTypeId && entry.expenseTypeId === expenseTypeId) return true;
        if (expenseTypeId && entry.expenseId === expenseTypeId) return true;
        return false;
      });

      if (entryIndex < 0) return false; // Nu există distribuție pentru acest expense

      const removedAmount = existingHistory[entryIndex].amount || 0;
      const updatedHistory = existingHistory.filter((_, i) => i !== entryIndex);
      const newDistributedAmount = Math.max(0, (invoice.distributedAmount || 0) - removedAmount);
      const totalAmount = invoice.totalInvoiceAmount || invoice.totalAmount;
      const newRemainingAmount = totalAmount - newDistributedAmount;

      const invoiceRef = getInvoiceRef(associationId, invoiceId);
      await updateDoc(invoiceRef, {
        distributedAmount: newDistributedAmount,
        remainingAmount: newRemainingAmount,
        isFullyDistributed: newRemainingAmount <= 0,
        distributionHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ Eroare la reversarea distribuției:', error);
      return false;
    }
  }, [invoices, associationId]);

  // ➕ ADĂUGAREA UNEI FACTURI NOI (cu suport pentru distribuție parțială)
  const addInvoice = useCallback(async (invoiceData, pdfFile = null) => {
    
    if (!associationId) {
      throw new Error('Nu există asociație selectată');
    }

    try {
      
      // 🔍 VERIFICĂ DACĂ FACTURA EXISTĂ DEJA
      
      // Normalizează invoiceNumber pentru comparație (elimină spații și face lowercase)
      const normalizeInvoiceNumber = (invoiceNum) => {
        return invoiceNum ? invoiceNum.toString().trim().toLowerCase() : '';
      };
      
      const normalizedSearchNumber = normalizeInvoiceNumber(invoiceData.invoiceNumber);
      
      const existingInvoice = invoices.find(inv => {
        const normalizedExistingNumber = normalizeInvoiceNumber(inv.invoiceNumber);
        const matchesNumber = normalizedExistingNumber === normalizedSearchNumber;
        const matchesAssociation = inv.associationId === associationId;
        // Filtrăm și pe furnizor pentru a evita coliziunile când același număr
        // (ex: "A1") este folosit de furnizori diferiți (Apa Nova A1 vs Ascensorul A1)
        const matchesSupplier = !invoiceData.supplierId || inv.supplierId === invoiceData.supplierId;

        return matchesNumber && matchesAssociation && matchesSupplier;
      });
      
      if (existingInvoice) {

        // Folosește updateInvoiceDistribution pentru factura existentă
        // IMPORTANT: folosim currentDistribution/amount (porțiunea distribuită pe această cheltuială),
        // nu totalAmount (totalul facturii), ca să nu suprascriem cu totalul facturii distribuția parțială.
        const currentDistribution = parseFloat(
          invoiceData.currentDistribution ||
          invoiceData.amount ||
          invoiceData.totalAmount
        ) || 0;
        
        await updateInvoiceDistribution(existingInvoice.id, {
          sheetId: invoiceData.sheetId || null,  // SHEET-BASED: folosim sheetId
          month: invoiceData.month,  // Păstrăm și month pentru compatibilitate
          amount: currentDistribution,
          expenseId: invoiceData.expenseId || null,
          expenseTypeId: invoiceData.expenseTypeId || null,  // ID-ul tipului de cheltuială
          expenseName: invoiceData.expenseName || invoiceData.expenseType || null,  // Păstrăm numele pentru afișare
          notes: invoiceData.distributionNotes || `Distribuție pentru ${invoiceData.expenseName || invoiceData.expenseType}`
        });
        
        return existingInvoice.id;
      }
      
      // 🔧 CORECTARE FURNIZOR: Obține automat furnizorul din configurația de cheltuieli
      let supplierData = {
        supplierId: invoiceData.supplierId,
        supplierName: invoiceData.supplierName
      };
      
      // Dacă nu avem furnizor sau furnizorul este "Fără furnizor" sau string gol sau null, încearcă să-l obții din configurația de cheltuieli
      const needsSupplierCorrection = !supplierData.supplierId || 
                                    !supplierData.supplierName || 
                                    supplierData.supplierName === 'Fără furnizor' ||
                                    supplierData.supplierName === '' ||
                                    supplierData.supplierName === null;
      
      if (needsSupplierCorrection) {
        
        try {
          const expenseConfig = getExpenseConfig(invoiceData.expenseType);
          
          if (expenseConfig && expenseConfig.supplierId && expenseConfig.supplierName) {
            // 🔥 ACTUALIZEZ supplierData cu datele corecte!
            supplierData.supplierId = expenseConfig.supplierId;
            supplierData.supplierName = expenseConfig.supplierName;
          } else {
            console.warn('⚠️ Nu s-a găsit configurația furnizorului pentru cheltuiala:', invoiceData.expenseType);
            console.warn('⚠️ expenseConfig details:', expenseConfig);
          }
        } catch (configError) {
          console.warn('⚠️ Eroare la obținerea configurației furnizorului:', configError);
        }
      }

      // Supplier data ready pentru salvare
      
      let pdfData = null;
      
      // Upload PDF dacă este furnizat
      if (pdfFile) {
        try {
          pdfData = await uploadInvoicePDF(pdfFile, associationId, invoiceData.invoiceNumber);
        } catch (uploadError) {
          console.warn('⚠️ Nu s-a putut procesa PDF-ul, salvez factura fără PDF:', uploadError);
          // Continuă să salveze factura fără PDF
          pdfData = null;
        }
      }

      // Calculează sumele pentru distribuție parțială - PENTRU FACTURĂ NOUĂ
      const totalInvoiceAmount = parseFloat(invoiceData.totalInvoiceAmount || invoiceData.totalAmount) || 0;
      const isStandalone = invoiceData.isStandalone === true;

      let distributedAmount, remainingAmount, isFullyDistributed, distributionEntry;

      if (isStandalone) {
        // Factură standalone (adăugată din Contabilitate) - fără distribuție
        distributedAmount = 0;
        remainingAmount = totalInvoiceAmount;
        isFullyDistributed = false;
        distributionEntry = null;
      } else {
        const currentDistribution = parseFloat(invoiceData.currentDistribution || invoiceData.totalAmount) || 0;
        distributedAmount = currentDistribution;
        remainingAmount = totalInvoiceAmount - distributedAmount;
        isFullyDistributed = remainingAmount <= 0;

        // Creează istoricul distribuției
        distributionEntry = {
          sheetId: invoiceData.sheetId || null,
          month: invoiceData.month,
          amount: currentDistribution,
          expenseId: invoiceData.expenseId || null,
          expenseTypeId: invoiceData.expenseTypeId || null,
          expenseName: invoiceData.expenseName || invoiceData.expenseType || null,
          distributedAt: new Date().toISOString(),
          notes: invoiceData.distributionNotes || ''
        };
      }

      // Creează documentul facturii

      const dataToSave = {
        // associationId NU mai e necesar - este implicit în path
        supplierId: supplierData.supplierId,
        supplierName: supplierData.supplierName,
        expenseTypeId: invoiceData.expenseTypeId || null,  // ID-ul tipului de cheltuială
        expenseName: invoiceData.expenseName || invoiceData.expenseType || null,  // Păstrăm numele pentru afișare și compatibilitate
        expenseId: invoiceData.expenseId || null,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate || null,
        dueDate: invoiceData.dueDate || null,
        sheetId: invoiceData.sheetId || null,  // SHEET-BASED: folosim sheetId
        month: invoiceData.month,  // Păstrăm și month pentru compatibilitate

        // Sume pentru compatibilitate
        amount: parseFloat(invoiceData.amount) || 0,
        vatAmount: parseFloat(invoiceData.vatAmount) || 0,
        totalAmount: parseFloat(invoiceData.totalAmount) || 0,

        // NOILE câmpuri pentru distribuție parțială
        invoiceAmount: parseFloat(invoiceData.invoiceAmount) || totalInvoiceAmount || 0,
        totalInvoiceAmount: totalInvoiceAmount,
        distributedAmount: distributedAmount,
        remainingAmount: remainingAmount,
        isFullyDistributed: isFullyDistributed,
        distributionHistory: distributionEntry ? [distributionEntry] : [],
        
        // Status plată
        isPaid: false,
        paidDate: null,
        paymentMethod: null,
        
        // Date PDF - salvate ca Base64 în loc de URL
        pdfUrl: pdfData?.base64 || null, // Pentru compatibilitate cu codul existent
        pdfData: pdfData || null, // Datele complete Base64
        notes: invoiceData.notes || '',
        documentType: invoiceData.documentType || 'factura',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Data ready pentru Firebase

      const docRef = await addDoc(getInvoicesCollection(associationId), dataToSave);

      
      // Factură salvată cu succes
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Eroare la salvarea facturii:', error);
      throw error;
    }
  }, [associationId, getExpenseConfig, invoices, updateInvoiceDistribution]);

  // 📝 ACTUALIZAREA UNEI FACTURI EXISTENTE
  const updateInvoice = useCallback(async (invoiceId, updates) => {
    try {

      const invoiceRef = getInvoiceRef(associationId, invoiceId);
      await updateDoc(invoiceRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });


    } catch (error) {
      console.error('❌ Eroare la actualizarea facturii:', error);
      throw error;
    }
  }, [associationId]);

  // 📝 ACTUALIZAREA UNEI FACTURI DUPĂ NUMĂR
  const updateInvoiceByNumber = useCallback(async (invoiceNumber, updates) => {
    try {

      // Normalizează numărul facturii pentru căutare
      const normalizedNumber = invoiceNumber.trim().toLowerCase();

      // Găsește factura în lista locală
      const invoice = invoices.find(inv =>
        inv.invoiceNumber && inv.invoiceNumber.trim().toLowerCase() === normalizedNumber
      );

      if (!invoice) {
        console.warn('⚠️ Factură negăsită cu numărul:', invoiceNumber);
        return;
      }

      // Update folosind ID-ul găsit
      await updateInvoice(invoice.id, updates);

    } catch (error) {
      console.error('❌ Eroare la actualizarea facturii după număr:', error);
      throw error;
    }
  }, [associationId, invoices, updateInvoice]);

  // 🗑️ ȘTERGEREA UNEI FACTURI
  const deleteInvoice = useCallback(async (invoiceId) => {
    try {

      const invoiceRef = getInvoiceRef(associationId, invoiceId);
      await deleteDoc(invoiceRef);

      
    } catch (error) {
      console.error('❌ Eroare la ștergerea facturii:', error);
      throw error;
    }
  }, [associationId]);

  // ✅ MARCAREA FACTURII CA PLĂTITĂ
  const markInvoiceAsPaid = useCallback(async (invoiceId, paymentData = {}) => {
    try {
      
      await updateInvoice(invoiceId, {
        isPaid: true,
        paidDate: new Date().toISOString(),
        paymentMethod: paymentData.paymentMethod || 'Transfer bancar',
        paymentNotes: paymentData.notes || ''
      });

      
    } catch (error) {
      console.error('❌ Eroare la marcarea facturii ca plătită:', error);
      throw error;
    }
  }, [updateInvoice]);

  // ❌ MARCAREA FACTURII CA NEPLĂTITĂ
  const markInvoiceAsUnpaid = useCallback(async (invoiceId) => {
    try {
      
      await updateInvoice(invoiceId, {
        isPaid: false,
        paidDate: null,
        paymentMethod: null,
        paymentNotes: null
      });

      
    } catch (error) {
      console.error('❌ Eroare la marcarea facturii ca neplătită:', error);
      throw error;
    }
  }, [updateInvoice]);

  // 📎 UPLOAD PDF FACTURĂ FOLOSIND BASE64 (ca DocumentsStep)
  const uploadInvoicePDF = async (file, associationId, invoiceNumber) => {
    try {
      
      // Validare fișier PDF
      if (file.type !== 'application/pdf') {
        throw new Error('Tipul fișierului nu este suportat. Doar PDF-uri sunt permise.');
      }
      
      // Verificare dimensiune (max 5MB pentru PDF-uri Base64)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('PDF-ul este prea mare. Dimensiunea maximă este 5MB.');
      }
      
      // Convertire fișier în Base64 (exact ca în DocumentsStep)
      const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      };
      
      const base64Data = await fileToBase64(file);
      
      // Verifică dacă Base64 nu este prea mare pentru Firestore (1MB limit)
      if (base64Data.length > 1048487) { // ~1MB în Base64
        throw new Error('PDF-ul este prea mare chiar și după conversie. Încearcă un PDF mai mic.');
      }
      
      
      // Returnează datele Base64 în loc de URL Firebase Storage
      return {
        base64: base64Data,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storageType: 'base64', // Marchez că este salvat în Base64
        uploadedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Eroare la convertirea PDF în Base64:', error);
      throw error;
    }
  };

  // 🔧 ACTUALIZAREA FURNIZORILOR PENTRU FACTURILE EXISTENTE FĂRĂ FURNIZOR
  const updateMissingSuppliersForExistingInvoices = useCallback(async (specificExpenseType = null) => {
    try {
      
      const invoicesWithoutSupplier = invoices.filter(invoice => {
        const hasNoSupplier = !invoice.supplierName || 
                             invoice.supplierName === 'Fără furnizor' || 
                             invoice.supplierName === '';
        
        // Pentru sincronizare, consideră doar facturile care chiar aparțin acestei cheltuieli
        // Verifică atât după expenseTypeId (NOU) cât și după expenseName/expenseType (backwards compatibility)
        const expenseConfig = specificExpenseType ? getExpenseConfig(specificExpenseType) : null;
        const matchesExpenseType = !specificExpenseType ||
                                   invoice.expenseTypeId === expenseConfig?.id ||
                                   invoice.expenseName === specificExpenseType ||
                                   invoice.expenseType === specificExpenseType;
        
        // Debug eliminat pentru a reduce clutterul din consolă
        
        return hasNoSupplier && matchesExpenseType;
      });
      
      
      for (const invoice of invoicesWithoutSupplier) {
        try {

          // Pentru facturile fără expenseTypeId/expenseName, folosește specificExpenseType pentru configurare
          const targetExpenseType = invoice.expenseTypeId || invoice.expenseName || invoice.expenseType || specificExpenseType;
          const expenseConfig = getExpenseConfig(targetExpenseType);

          if (expenseConfig && expenseConfig.supplierId && expenseConfig.supplierName) {

            const invoiceRef = getInvoiceRef(associationId, invoice.id);
            const updateData = {
              supplierId: expenseConfig.supplierId,
              supplierName: expenseConfig.supplierName,
              updatedAt: new Date().toISOString()
            };

            // Dacă factura nu are expenseTypeId și expenseName setate, setează-le
            if (!invoice.expenseTypeId && expenseConfig.id) {
              updateData.expenseTypeId = expenseConfig.id;
              updateData.expenseName = expenseConfig.name;
            }

            await updateDoc(invoiceRef, updateData);
          } else {
            console.warn('⚠️ Nu s-a găsit configurația furnizorului pentru:', targetExpenseType);
          }
        } catch (error) {
          console.error('❌ Eroare la actualizarea facturii:', invoice.id, error);
        }
      }
      
      return invoicesWithoutSupplier.length;
    } catch (error) {
      console.error('❌ Eroare la actualizarea furnizorilor:', error);
      throw error;
    }
  }, [invoices, getExpenseConfig]);

  // 🔍 FILTRARE ȘI CĂUTARE FACTURI
  const getInvoicesByMonth = useCallback((month) => {
    return invoices.filter(invoice => invoice.month === month);
  }, [invoices]);

  const getInvoicesBySupplier = useCallback((supplierId) => {
    return invoices.filter(invoice => invoice.supplierId === supplierId);
  }, [invoices]);

  const getUnpaidInvoices = useCallback(() => {
    return invoices.filter(invoice => !invoice.isPaid);
  }, [invoices]);

  const getOverdueInvoices = useCallback(() => {
    const today = new Date();
    return invoices.filter(invoice => 
      !invoice.isPaid && invoice.dueDate && new Date(invoice.dueDate) < today
    );
  }, [invoices]);
  
  // 🔄 SYNC AUTOMAT: după ce s-a modificat sheet.expense.amount (consum/sume individuale),
  // recalculează distributionHistory[].amount pentru fiecare factură care are doar O SINGURĂ
  // intrare în sheet pentru cheltuiala respectivă (singura factură pe acea cheltuială).
  // Pentru cheltuieli cu mai multe facturi, păstrăm sumele introduse de user (split manual).
  const syncInvoicesAfterExpenseChange = useCallback(async (sheet, changedExpenseId) => {
    if (!sheet || !sheet.expenses || !changedExpenseId) return;
    if (!associationId) return;

    try {
      const sheetExpense = sheet.expenses.find(e => e.id === changedExpenseId);
      if (!sheetExpense) return;

      const expenseTypeId = sheetExpense.expenseTypeId || sheetExpense.id;
      const expenseName = sheetExpense.name;
      const newSheetAmount = parseFloat(sheetExpense.amount) || 0;

      // Identifică facturile care au această cheltuială în distributionHistory
      const linkedInvoices = invoices.filter(inv =>
        inv.distributionHistory?.some(entry =>
          entry.expenseId === changedExpenseId ||
          (expenseTypeId && entry.expenseTypeId === expenseTypeId) ||
          (expenseName && (entry.expenseName === expenseName || entry.expenseType === expenseName))
        )
      );

      if (linkedInvoices.length === 0) return;

      // Pentru fiecare factură legată, decide dacă auto-sync-ul e sigur
      for (const invoice of linkedInvoices) {
        const totalInvoiceAmount = parseFloat(invoice.totalInvoiceAmount || invoice.totalAmount) || 0;
        if (totalInvoiceAmount === 0) continue;

        // Numără câte facturi au această cheltuială (intersecție invoices × sheetExpense)
        const invoicesOnSameExpense = invoices.filter(inv =>
          inv.distributionHistory?.some(entry =>
            entry.expenseId === changedExpenseId ||
            (expenseTypeId && entry.expenseTypeId === expenseTypeId) ||
            (expenseName && (entry.expenseName === expenseName || entry.expenseType === expenseName))
          )
        );

        // Dacă sunt mai multe facturi pe aceeași cheltuială → split manual, nu auto-sync
        if (invoicesOnSameExpense.length > 1) continue;

        // Dacă e o singură factură → setează dist.amount = sheetExpense.amount
        const updatedHistory = invoice.distributionHistory.map(entry => {
          const matches =
            entry.expenseId === changedExpenseId ||
            (expenseTypeId && entry.expenseTypeId === expenseTypeId) ||
            (expenseName && (entry.expenseName === expenseName || entry.expenseType === expenseName));
          if (matches) {
            return { ...entry, amount: newSheetAmount };
          }
          return entry;
        });

        // Recalculează distributedAmount, remainingAmount, isFullyDistributed
        const newDistributedAmount = updatedHistory
          .filter(d => d.amount > 0)
          .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        const newRemainingAmount = Math.max(0, totalInvoiceAmount - newDistributedAmount);
        const newIsFullyDistributed = newRemainingAmount <= 0.01 && newDistributedAmount > 0;

        // Skip dacă nu s-a schimbat nimic real
        const oldDistributedAmount = parseFloat(invoice.distributedAmount) || 0;
        if (Math.abs(oldDistributedAmount - newDistributedAmount) < 0.001) continue;

        const invoiceRef = getInvoiceRef(associationId, invoice.id);
        await updateDoc(invoiceRef, {
          distributionHistory: updatedHistory,
          distributedAmount: newDistributedAmount,
          remainingAmount: newRemainingAmount,
          isFullyDistributed: newIsFullyDistributed,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Eroare la sync facturi după modificare cheltuială:', error);
    }
  }, [invoices, associationId]);

  // 🆕 OBȚINE FACTURILE PARȚIAL DISTRIBUITE
  const getPartiallyDistributedInvoices = useCallback((expenseType = null, documentType = null, supplierId = null) => {
    if (invoices.length > 0) {
    }
    const filtered = invoices.filter(invoice => {
      // Logica îmbunătățită pentru facturi parțial distribuite
      const totalInvoiceAmount = invoice.totalInvoiceAmount || invoice.totalAmount || 0;
      const distributedAmount = invoice.distributedAmount || 0;
      const remainingAmount = invoice.remainingAmount ?? (totalInvoiceAmount - distributedAmount);
      const isNotFullyDistributed = !invoice.isFullyDistributed;

      // O factură este parțial distribuită dacă:
      // 1. Are remainingAmount > 0 SAU
      // 2. Nu este marcată ca complet distribuită ȘI are totalAmount > 0
      const hasRemaining = remainingAmount > 0 || (isNotFullyDistributed && totalInvoiceAmount > 0);

      // Pentru non-facturi (bon fiscal, chitanță, proces-verbal etc.): match pe documentType
      // Dar respectă filtrul de supplierId dacă e specificat (la fel ca la facturi)
      if (documentType && documentType !== 'factura') {
        const invoiceDocType = invoice.documentType || 'factura';
        if (invoiceDocType !== documentType) return false;
        if (supplierId && invoice.supplierId && invoice.supplierId !== supplierId) return false;
        return hasRemaining;
      }

      // Filtrare pe supplierId specific (pentru multi-furnizor)
      if (supplierId && invoice.supplierId && invoice.supplierId !== supplierId) {
        return false;
      }

      // Pentru facturi: match pe expenseTypeId/expenseName SAU pe furnizor
      const expenseConfig = expenseType ? getExpenseConfig(expenseType) : null;
      let matchesType = !expenseType ||
                        invoice.expenseTypeId === expenseConfig?.id ||
                        invoice.expenseName === expenseType ||
                        invoice.expenseType === expenseType;  // backwards compatibility

      // Dacă nu găsim direct, încearcă matching pe furnizor (single supplier - format vechi)
      if (!matchesType && expenseConfig?.supplierName && invoice.supplierName) {
        matchesType = expenseConfig.supplierName.toLowerCase().trim() === invoice.supplierName.toLowerCase().trim();
      }

      // Dacă tot nu găsim, încearcă matching pe lista de furnizori (multi-supplier - format nou)
      if (!matchesType && expenseConfig?.suppliers?.length > 0 && invoice.supplierId) {
        matchesType = expenseConfig.suppliers.some(s => s.supplierId === invoice.supplierId);
      }

      // Pentru facturi, verifică și documentType (exclude non-facturi din lista de facturi)
      if (matchesType) {
        const invoiceDocType = invoice.documentType || 'factura';
        if (invoiceDocType !== 'factura') return false;
      }

      return hasRemaining && matchesType;
    });

    // 🔧 CONSOLIDARE FACTURI DUPLICATE
    // Grupează facturile după invoiceNumber pentru a evita duplicate
    const consolidatedInvoices = new Map();
    
    filtered.forEach(invoice => {
      const key = invoice.invoiceNumber;
      if (consolidatedInvoices.has(key)) {
        // Dacă factura există deja, păstrează cea cu remaining amount mai mare
        const existing = consolidatedInvoices.get(key);
        const currentRemaining = invoice.remainingAmount ?? ((invoice.totalInvoiceAmount || invoice.totalAmount || 0) - (invoice.distributedAmount || 0));
        const existingRemaining = existing.remainingAmount ?? ((existing.totalInvoiceAmount || existing.totalAmount || 0) - (existing.distributedAmount || 0));
        
        // Păstrează factura mai recent actualizată (cu data mai recentă)
        const currentDate = new Date(invoice.updatedAt || invoice.createdAt);
        const existingDate = new Date(existing.updatedAt || existing.createdAt);
        
        if (currentDate > existingDate) {
          consolidatedInvoices.set(key, invoice);
        }
      } else {
        consolidatedInvoices.set(key, invoice);
      }
    });
    
    return Array.from(consolidatedInvoices.values());
  }, [invoices, getExpenseConfig]);
  
  // 🛠️ CORECTARE FURNIZORI GREȘIT ATRIBUIȚI
  const fixIncorrectSuppliers = useCallback(async () => {
    try {
      
      // Găsește facturi care au expenseTypeId/expenseName diferit de furnizorul lor
      const problematicInvoices = invoices.filter(invoice => {
        const expenseIdentifier = invoice.expenseTypeId || invoice.expenseName || invoice.expenseType;
        if (!expenseIdentifier || !invoice.supplierName) return false;

        const expenseConfig = getExpenseConfig(expenseIdentifier);
        if (!expenseConfig?.supplierName) return false;

        // Verifică dacă furnizorul din factură nu corespunde cu cel configurat
        return expenseConfig.supplierName.toLowerCase().trim() !== invoice.supplierName.toLowerCase().trim();
      });


      for (const invoice of problematicInvoices) {
        const expenseIdentifier = invoice.expenseTypeId || invoice.expenseName || invoice.expenseType;
        const correctExpenseConfig = getExpenseConfig(expenseIdentifier);
        

        const invoiceRef = getInvoiceRef(associationId, invoice.id);
        await updateDoc(invoiceRef, {
          supplierId: correctExpenseConfig.supplierId,
          supplierName: correctExpenseConfig.supplierName,
          updatedAt: new Date().toISOString()
        });
      }
      
      return problematicInvoices.length;
    } catch (error) {
      console.error('❌ Eroare la corecția furnizorilor:', error);
      throw error;
    }
  }, [associationId, invoices, getExpenseConfig]);
  
  // 🔄 SINCRONIZARE AUTOMATĂ FURNIZORI PENTRU UN TIP DE CHELTUIALĂ
  const syncSuppliersForExpenseType = useCallback(async (expenseType) => {
    return await updateMissingSuppliersForExistingInvoices(expenseType);
  }, [updateMissingSuppliersForExistingInvoices]);
  
  // 🆕 OBȚINE FACTURA DUPĂ NUMĂR (opțional: filtrează și pe supplierId pentru a evita
  // coliziuni când același număr de factură există la furnizori diferiți)
  const getInvoiceByNumber = useCallback((invoiceNumber, supplierId = null) => {
    return invoices.find(invoice =>
      invoice.invoiceNumber === invoiceNumber &&
      (!supplierId || invoice.supplierId === supplierId)
    );
  }, [invoices]);

  // 📊 STATISTICI FACTURI
  const getInvoiceStats = useCallback(() => {
    const total = invoices.length;
    const paid = invoices.filter(inv => inv.isPaid).length;
    const unpaid = total - paid;
    const overdue = getOverdueInvoices().length;

    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paidAmount = invoices
      .filter(inv => inv.isPaid)
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const unpaidAmount = totalAmount - paidAmount;

    return {
      total,
      paid,
      unpaid,
      overdue,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      unpaidAmount: Math.round(unpaidAmount * 100) / 100
    };
  }, [invoices, getOverdueInvoices]);

  // 🔄 MIGRARE AUTOMATĂ - Adaugă expenseTypeId în distributionHistory
  const migrateDistributionHistoryToExpenseTypeId = useCallback(async () => {
    if (!invoices || invoices.length === 0) {
      return { success: true, updated: 0, total: 0 };
    }

    let updatedCount = 0;
    let totalProcessed = 0;

    for (const invoice of invoices) {
      totalProcessed++;

      // Verifică dacă are distributionHistory
      if (!invoice.distributionHistory || invoice.distributionHistory.length === 0) {
        continue;
      }

      let needsUpdate = false;
      const updatedHistory = invoice.distributionHistory.map(entry => {
        // Dacă deja are expenseTypeId, nu face nimic
        if (entry.expenseTypeId) {
          return entry;
        }

        // Încearcă să găsească expenseTypeId din expenseName sau expenseType
        const expenseName = entry.expenseName || entry.expenseType;
        if (!expenseName) {
          return entry;
        }

        // Caută tipul de cheltuială după nume
        const expenseConfig = getExpenseConfig(expenseName);

        // Dacă nu găsim ID (cheltuială custom), nu e o eroare - doar păstrăm expenseName
        if (!expenseConfig?.id) {
          // Pentru cheltuieli custom, nu avem expenseTypeId predefinit
          // Doar ne asigurăm că avem expenseName
          if (!entry.expenseName && entry.expenseType) {
            needsUpdate = true;
            return {
              ...entry,
              expenseName: expenseName
            };
          }
          return entry;
        }

        // Actualizează intrarea cu expenseTypeId pentru cheltuieli standard
        needsUpdate = true;
        return {
          ...entry,
          expenseTypeId: expenseConfig.id,
          expenseName: expenseName  // Asigură că avem și expenseName
        };
      });

      // Dacă sunt modificări, actualizează factura
      if (needsUpdate) {
        try {
          const invoiceRef = getInvoiceRef(associationId, invoice.id);
          await updateDoc(invoiceRef, {
            distributionHistory: updatedHistory,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        } catch (error) {
          console.error(`❌ Eroare la migrarea facturii ${invoice.id}:`, error);
        }
      }
    }

    return { success: true, updated: updatedCount, total: totalProcessed };
  }, [associationId, invoices, getExpenseConfig]);


  // 🎯 RETURN API
  return {
    // 📊 Date și stare
    invoices,
    loading,

    // 🔧 Funcții CRUD
    addInvoice,
    updateInvoice,
    updateInvoiceByNumber,
    deleteInvoice,
    updateInvoiceDistribution,
    syncInvoicesAfterExpenseChange,
    removeInvoiceDistribution,
    updateMissingSuppliersForExistingInvoices,
    
    // ✅ Management plăți
    markInvoiceAsPaid,
    markInvoiceAsUnpaid,
    
    // 📎 Upload fișiere
    uploadInvoicePDF,
    
    // 🔍 Filtrare și căutare
    getInvoicesByMonth,
    getInvoicesBySupplier,
    getUnpaidInvoices,
    getOverdueInvoices,
    getPartiallyDistributedInvoices,
    getInvoiceByNumber,
    getInvoiceStats,
    syncSuppliersForExpenseType,
    fixIncorrectSuppliers,

    // 🔄 Migrare
    migrateDistributionHistoryToExpenseTypeId
  };
};

export default useInvoices;