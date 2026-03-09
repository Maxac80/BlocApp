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
        console.log('📋 useInvoices onSnapshot — facturi încărcate:', invoicesData.length, 'associationId:', associationId);
        if (invoicesData.length > 0) {
          console.log('📋 Detalii facturi:', invoicesData.map(inv => ({
            id: inv.id, num: inv.invoiceNumber, supplier: inv.supplierName,
            remaining: inv.remainingAmount, distributed: inv.distributedAmount,
            total: inv.totalInvoiceAmount || inv.totalAmount,
            isFullyDistributed: inv.isFullyDistributed,
            documentType: inv.documentType
          })));
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
      console.log('📝 Actualizez distribuția facturii:', invoiceId);
      
      // Obține factura existentă
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        throw new Error('Factura nu a fost găsită');
      }
      
      const currentDistribution = parseFloat(distributionData.amount) || 0;
      const newDistributedAmount = (invoice.distributedAmount || 0) + currentDistribution;
      const newRemainingAmount = (invoice.totalInvoiceAmount || invoice.totalAmount) - newDistributedAmount;
      const isFullyDistributed = newRemainingAmount <= 0;
      
      // console.log('🔍 ACTUALIZARE DISTRIBUȚIE - Date de calcul:', {
      //   invoiceId,
      //   invoiceNumber: invoice.invoiceNumber,
      //   totalInvoiceAmount: invoice.totalInvoiceAmount || invoice.totalAmount,
      //   currentDistributedAmount: invoice.distributedAmount || 0,
      //   newDistributionAmount: currentDistribution,
      //   calculatedNewDistributedAmount: newDistributedAmount,
      //   calculatedNewRemainingAmount: newRemainingAmount,
      //   isFullyDistributed
      // });
      
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
        console.log('📊 Actualizare intrare existentă în distributionHistory pentru expenseId/expenseTypeId:',
                    distributionData.expenseId, distributionData.expenseTypeId);

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
        console.log('📊 Adăugare intrare nouă în distributionHistory');

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
      
      console.log('✅ Distribuție actualizată pentru factura:', invoiceId);
      console.log('📊 Nouă distribuție:', {
        distributedAmount: newDistributedAmount,
        remainingAmount: newRemainingAmount,
        isFullyDistributed: isFullyDistributed
      });
      
      // Așteaptă puțin pentru a permite sincronizarea Firestore înainte de următoarea operație
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('❌ Eroare la actualizarea distribuției:', error);
      throw error;
    }
  }, [invoices]);

  // ➕ ADĂUGAREA UNEI FACTURI NOI (cu suport pentru distribuție parțială)
  const addInvoice = useCallback(async (invoiceData, pdfFile = null) => {
    
    if (!associationId) {
      throw new Error('Nu există asociație selectată');
    }

    try {
      console.log('➕ Adaug factură nouă:', invoiceData);
      console.log('📎 PDF File:', pdfFile?.name || 'Nu există PDF');
      
      // 🔍 VERIFICĂ DACĂ FACTURA EXISTĂ DEJA
      console.log('🔍 CĂUTARE FACTURĂ EXISTENTĂ:', {
        cautataInvoiceNumber: invoiceData.invoiceNumber,
        cautataAssociationId: associationId,
        totalInvoicesInMemory: invoices.length,
        invoicesNumbers: invoices.map(inv => ({ id: inv.id, invoiceNumber: inv.invoiceNumber, associationId: inv.associationId }))
      });
      
      // Normalizează invoiceNumber pentru comparație (elimină spații și face lowercase)
      const normalizeInvoiceNumber = (invoiceNum) => {
        return invoiceNum ? invoiceNum.toString().trim().toLowerCase() : '';
      };
      
      const normalizedSearchNumber = normalizeInvoiceNumber(invoiceData.invoiceNumber);
      
      const existingInvoice = invoices.find(inv => {
        const normalizedExistingNumber = normalizeInvoiceNumber(inv.invoiceNumber);
        const matchesNumber = normalizedExistingNumber === normalizedSearchNumber;
        const matchesAssociation = inv.associationId === associationId;
        
        console.log('🔍 COMPARING INVOICE:', {
          existing: { id: inv.id, invoiceNumber: inv.invoiceNumber, normalized: normalizedExistingNumber },
          searching: { invoiceNumber: invoiceData.invoiceNumber, normalized: normalizedSearchNumber },
          matchesNumber,
          matchesAssociation,
          willMatch: matchesNumber && matchesAssociation
        });
        
        return matchesNumber && matchesAssociation;
      });
      
      if (existingInvoice) {
        console.log('🔄 Factură existentă găsită, actualizez distribuția:', {
          id: existingInvoice.id,
          invoiceNumber: existingInvoice.invoiceNumber,
          currentDistributedAmount: existingInvoice.distributedAmount,
          totalAmount: existingInvoice.totalInvoiceAmount || existingInvoice.totalAmount
        });
        
        // Folosește updateInvoiceDistribution pentru factura existentă
        const currentDistribution = parseFloat(invoiceData.totalAmount) || 0;
        
        await updateInvoiceDistribution(existingInvoice.id, {
          sheetId: invoiceData.sheetId || null,  // SHEET-BASED: folosim sheetId
          month: invoiceData.month,  // Păstrăm și month pentru compatibilitate
          amount: currentDistribution,
          expenseId: invoiceData.expenseId || null,
          expenseTypeId: invoiceData.expenseTypeId || null,  // ID-ul tipului de cheltuială
          expenseName: invoiceData.expenseName || invoiceData.expenseType || null,  // Păstrăm numele pentru afișare
          notes: invoiceData.distributionNotes || `Distribuție pentru ${invoiceData.expenseName || invoiceData.expenseType}`
        });
        
        console.log('✅ Distribuție actualizată pentru factura existentă:', existingInvoice.id);
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
      console.log('🔍 Verificare necesitatea corectării furnizorului:', {
        supplierId: supplierData.supplierId,
        supplierName: supplierData.supplierName,
        needsCorrection: needsSupplierCorrection
      });
      
      if (needsSupplierCorrection) {
        console.log('⚠️ Furnizor lipsă, încerc să obțin din configurația cheltuielii:', invoiceData.expenseType);
        
        try {
          const expenseConfig = getExpenseConfig(invoiceData.expenseType);
          console.log('🔎 expenseConfig din getExpenseConfig:', {
            expenseConfig: expenseConfig,
            hasConfig: !!expenseConfig,
            supplierId: expenseConfig?.supplierId,
            supplierName: expenseConfig?.supplierName,
            hasValidSupplier: !!(expenseConfig && expenseConfig.supplierId && expenseConfig.supplierName)
          });
          
          if (expenseConfig && expenseConfig.supplierId && expenseConfig.supplierName) {
            // 🔥 ACTUALIZEZ supplierData cu datele corecte!
            supplierData.supplierId = expenseConfig.supplierId;
            supplierData.supplierName = expenseConfig.supplierName;
            console.log('✅ Furnizor obținut din configurația cheltuielii:', supplierData);
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
          console.log('📎 Procesez PDF pentru factură:', invoiceData.invoiceNumber);
          pdfData = await uploadInvoicePDF(pdfFile, associationId, invoiceData.invoiceNumber);
        } catch (uploadError) {
          console.warn('⚠️ Nu s-a putut procesa PDF-ul, salvez factura fără PDF:', uploadError);
          // Continuă să salveze factura fără PDF
          pdfData = null;
        }
      }

      // Calculează sumele pentru distribuție parțială - PENTRU FACTURĂ NOUĂ
      const totalInvoiceAmount = parseFloat(invoiceData.totalInvoiceAmount || invoiceData.totalAmount) || 0;
      const currentDistribution = parseFloat(invoiceData.currentDistribution || invoiceData.totalAmount) || 0;
      const distributedAmount = currentDistribution; // Pentru factură nouă, distributedAmount = currentDistribution
      const remainingAmount = totalInvoiceAmount - distributedAmount;
      const isFullyDistributed = remainingAmount <= 0;

      // Creează istoricul distribuției
      const distributionEntry = {
        sheetId: invoiceData.sheetId || null,  // SHEET-BASED: folosim sheetId
        month: invoiceData.month,  // Păstrăm și month pentru compatibilitate
        amount: currentDistribution,
        expenseId: invoiceData.expenseId || null,
        expenseTypeId: invoiceData.expenseTypeId || null,  // ID-ul tipului de cheltuială
        expenseName: invoiceData.expenseName || invoiceData.expenseType || null,  // Păstrăm numele pentru afișare
        distributedAt: new Date().toISOString(),
        notes: invoiceData.distributionNotes || ''
      };

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
        distributionHistory: [distributionEntry],
        
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

      console.log('✅ Factură salvată cu ID:', docRef.id);
      console.log('📊 Factură salvată cu datele:', {
        id: docRef.id,
        month: invoiceData.month,
        invoiceNumber: invoiceData.invoiceNumber,
        supplierName: supplierData.supplierName,
        totalInvoiceAmount: totalInvoiceAmount,
        distributedAmount: distributedAmount,
        remainingAmount: remainingAmount,
        isFullyDistributed: isFullyDistributed,
        hasPdfData: !!pdfData
      });
      
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
      console.log('📝 Actualizez factura:', invoiceId);

      const invoiceRef = getInvoiceRef(associationId, invoiceId);
      await updateDoc(invoiceRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Factură actualizată:', invoiceId);

    } catch (error) {
      console.error('❌ Eroare la actualizarea facturii:', error);
      throw error;
    }
  }, []);

  // 📝 ACTUALIZAREA UNEI FACTURI DUPĂ NUMĂR
  const updateInvoiceByNumber = useCallback(async (invoiceNumber, updates) => {
    try {
      console.log('📝 Actualizez factura după număr:', invoiceNumber);

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
      console.log('🗑️ Șterg factura:', invoiceId);

      const invoiceRef = getInvoiceRef(associationId, invoiceId);
      await deleteDoc(invoiceRef);

      console.log('✅ Factură ștearsă:', invoiceId);
      
    } catch (error) {
      console.error('❌ Eroare la ștergerea facturii:', error);
      throw error;
    }
  }, [associationId]);

  // ✅ MARCAREA FACTURII CA PLĂTITĂ
  const markInvoiceAsPaid = useCallback(async (invoiceId, paymentData = {}) => {
    try {
      console.log('✅ Marchez factura ca plătită:', invoiceId);
      
      await updateInvoice(invoiceId, {
        isPaid: true,
        paidDate: new Date().toISOString(),
        paymentMethod: paymentData.paymentMethod || 'Transfer bancar',
        paymentNotes: paymentData.notes || ''
      });

      console.log('✅ Factură marcată ca plătită:', invoiceId);
      
    } catch (error) {
      console.error('❌ Eroare la marcarea facturii ca plătită:', error);
      throw error;
    }
  }, [updateInvoice]);

  // ❌ MARCAREA FACTURII CA NEPLĂTITĂ
  const markInvoiceAsUnpaid = useCallback(async (invoiceId) => {
    try {
      console.log('❌ Marchez factura ca neplătită:', invoiceId);
      
      await updateInvoice(invoiceId, {
        isPaid: false,
        paidDate: null,
        paymentMethod: null,
        paymentNotes: null
      });

      console.log('❌ Factură marcată ca neplătită:', invoiceId);
      
    } catch (error) {
      console.error('❌ Eroare la marcarea facturii ca neplătită:', error);
      throw error;
    }
  }, [updateInvoice]);

  // 📎 UPLOAD PDF FACTURĂ FOLOSIND BASE64 (ca DocumentsStep)
  const uploadInvoicePDF = async (file, associationId, invoiceNumber) => {
    try {
      console.log('📎 Convertesc PDF factură la Base64:', invoiceNumber);
      console.log('📄 Fișier details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
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
      
      console.log('🔄 Converting PDF to Base64...');
      const base64Data = await fileToBase64(file);
      
      // Verifică dacă Base64 nu este prea mare pentru Firestore (1MB limit)
      if (base64Data.length > 1048487) { // ~1MB în Base64
        throw new Error('PDF-ul este prea mare chiar și după conversie. Încearcă un PDF mai mic.');
      }
      
      console.log('✅ PDF convertit cu succes la Base64');
      console.log('📊 Original size:', file.size, 'bytes');
      console.log('📊 Base64 size:', base64Data.length, 'characters');
      
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
      console.log('🔧 Verific și actualizez facturile fără furnizor...', specificExpenseType ? `pentru ${specificExpenseType}` : '');
      
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
      
      console.log('📊 Facturi găsite fără furnizor:', invoicesWithoutSupplier.length, specificExpenseType ? `pentru ${specificExpenseType}` : '');
      
      for (const invoice of invoicesWithoutSupplier) {
        try {
          console.log('🔧 Procesez factura:', invoice.id, 'cu cheltuiala:', invoice.expenseName || invoice.expenseType || 'LIPSEȘTE');

          // Pentru facturile fără expenseTypeId/expenseName, folosește specificExpenseType pentru configurare
          const targetExpenseType = invoice.expenseTypeId || invoice.expenseName || invoice.expenseType || specificExpenseType;
          const expenseConfig = getExpenseConfig(targetExpenseType);

          if (expenseConfig && expenseConfig.supplierId && expenseConfig.supplierName) {
            console.log('✅ Actualizez furnizorul pentru factura:', invoice.id, 'cu:', expenseConfig.supplierName);

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
              console.log('🔧 Setez expenseTypeId și expenseName pentru factura:', invoice.id, 'la:', expenseConfig.id, expenseConfig.name);
            }

            await updateDoc(invoiceRef, updateData);
          } else {
            console.warn('⚠️ Nu s-a găsit configurația furnizorului pentru:', targetExpenseType);
          }
        } catch (error) {
          console.error('❌ Eroare la actualizarea facturii:', invoice.id, error);
        }
      }
      
      console.log('✅ Actualizare furnizori completă');
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
  
  // 🆕 OBȚINE FACTURILE PARȚIAL DISTRIBUITE
  const getPartiallyDistributedInvoices = useCallback((expenseType = null, documentType = null) => {
    console.log('🔍 getPartiallyDistributedInvoices:', { expenseType, documentType, totalInvoices: invoices.length });
    if (invoices.length > 0) {
      console.log('🔍 Facturi în memorie:', invoices.map(inv => ({
        id: inv.id, num: inv.invoiceNumber, supplier: inv.supplierName,
        docType: inv.documentType || 'factura',
        remaining: inv.remainingAmount, distributed: inv.distributedAmount,
        total: inv.totalInvoiceAmount || inv.totalAmount,
        isFullyDistributed: inv.isFullyDistributed
      })));
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

      // Pentru non-facturi (bon fiscal, chitanță, etc.): match doar pe documentType, fără filtru furnizor
      if (documentType && documentType !== 'factura') {
        const invoiceDocType = invoice.documentType || 'factura';
        return hasRemaining && (invoiceDocType === documentType);
      }

      // Pentru facturi: match pe expenseTypeId/expenseName SAU pe furnizor
      const expenseConfig = expenseType ? getExpenseConfig(expenseType) : null;
      let matchesType = !expenseType ||
                        invoice.expenseTypeId === expenseConfig?.id ||
                        invoice.expenseName === expenseType ||
                        invoice.expenseType === expenseType;  // backwards compatibility

      // Dacă nu găsim direct, încearcă matching pe furnizor
      if (!matchesType && expenseConfig?.supplierName && invoice.supplierName) {
        matchesType = expenseConfig.supplierName.toLowerCase().trim() === invoice.supplierName.toLowerCase().trim();
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
      console.log('🛠️ Corectez furnizori greșit atribuiți...');
      
      // Găsește facturi care au expenseTypeId/expenseName diferit de furnizorul lor
      const problematicInvoices = invoices.filter(invoice => {
        const expenseIdentifier = invoice.expenseTypeId || invoice.expenseName || invoice.expenseType;
        if (!expenseIdentifier || !invoice.supplierName) return false;

        const expenseConfig = getExpenseConfig(expenseIdentifier);
        if (!expenseConfig?.supplierName) return false;

        // Verifică dacă furnizorul din factură nu corespunde cu cel configurat
        return expenseConfig.supplierName.toLowerCase().trim() !== invoice.supplierName.toLowerCase().trim();
      });

      console.log('🔍 Facturi cu furnizor incorect:', problematicInvoices.length);

      for (const invoice of problematicInvoices) {
        const expenseIdentifier = invoice.expenseTypeId || invoice.expenseName || invoice.expenseType;
        const correctExpenseConfig = getExpenseConfig(expenseIdentifier);
        
        console.log('🔧 Corectez factura:', invoice.id, {
          invoiceNumber: invoice.invoiceNumber,
          expenseTypeId: invoice.expenseTypeId,
          expenseName: invoice.expenseName || invoice.expenseType,
          currentSupplier: invoice.supplierName,
          correctSupplier: correctExpenseConfig.supplierName
        });

        const invoiceRef = getInvoiceRef(associationId, invoice.id);
        await updateDoc(invoiceRef, {
          supplierId: correctExpenseConfig.supplierId,
          supplierName: correctExpenseConfig.supplierName,
          updatedAt: new Date().toISOString()
        });
      }
      
      console.log('✅ Corecție furnizori completă');
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
  
  // 🆕 OBȚINE FACTURA DUPĂ NUMĂR
  const getInvoiceByNumber = useCallback((invoiceNumber) => {
    return invoices.find(invoice => invoice.invoiceNumber === invoiceNumber);
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
      console.log('📊 Nu există facturi de migrat');
      return { success: true, updated: 0, total: 0 };
    }

    console.log('🔄 Începe migrarea distributionHistory...');
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
          console.log(`✅ Migrat factura ${invoice.invoiceNumber} (${invoice.id})`);
        } catch (error) {
          console.error(`❌ Eroare la migrarea facturii ${invoice.id}:`, error);
        }
      }
    }

    console.log(`✅ Migrare completă: ${updatedCount} din ${totalProcessed} facturi actualizate`);
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