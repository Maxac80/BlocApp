import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
// Firebase Storage nu mai este necesar - folosim Base64
import { db } from '../firebase';
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
    
    // Query pentru toate facturile asociației (fără orderBy pentru a evita problema cu index-ul)
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('associationId', '==', associationId)
      // Temporar fără orderBy până creez index-ul în Firebase
    );

    // Listener pentru modificări în timp real
    const unsubscribe = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        const invoicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setInvoices(invoicesData);
        setLoading(false);
        // console.log('📋 Lista facturilor încărcate:', invoicesData.map(inv => ({
        //   id: inv.id,
        //   month: inv.month,
        //   invoiceNumber: inv.invoiceNumber,
        //   associationId: inv.associationId,
        //   supplierName: inv.supplierName,
        //   supplierId: inv.supplierId
        // })));
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
      
      // Creează noua intrare în istoric
      const newDistributionEntry = {
        month: distributionData.month,
        amount: currentDistribution,
        expenseId: distributionData.expenseId || null,
        expenseType: distributionData.expenseType || null,
        distributedAt: new Date().toISOString(),
        notes: distributionData.notes || ''
      };
      
      // Actualizează factura
      const docRef = doc(db, 'invoices', invoiceId);
      await updateDoc(docRef, {
        distributedAmount: newDistributedAmount,
        remainingAmount: newRemainingAmount,
        isFullyDistributed: isFullyDistributed,
        distributionHistory: [...(invoice.distributionHistory || []), newDistributionEntry],
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
          month: invoiceData.month,
          amount: currentDistribution,
          expenseId: invoiceData.expenseId || null,
          expenseType: invoiceData.expenseType || null,
          notes: invoiceData.distributionNotes || `Distribuție pentru ${invoiceData.expenseType}`
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
        month: invoiceData.month,
        amount: currentDistribution,
        expenseId: invoiceData.expenseId || null,
        expenseType: invoiceData.expenseType || null,
        distributedAt: new Date().toISOString(),
        notes: invoiceData.distributionNotes || ''
      };

      // Creează documentul facturii
      
      const dataToSave = {
        associationId,
        supplierId: supplierData.supplierId,
        supplierName: supplierData.supplierName,
        expenseType: invoiceData.expenseType,
        expenseId: invoiceData.expenseId || null,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        month: invoiceData.month,
        
        // Sume pentru compatibilitate
        amount: parseFloat(invoiceData.amount) || 0,
        vatAmount: parseFloat(invoiceData.vatAmount) || 0,
        totalAmount: parseFloat(invoiceData.totalAmount) || 0,
        
        // NOILE câmpuri pentru distribuție parțială
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
        pdfData: pdfData, // Datele complete Base64
        notes: invoiceData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Data ready pentru Firebase
      
      const docRef = await addDoc(collection(db, 'invoices'), dataToSave);

      console.log('✅ Factură salvată cu ID:', docRef.id);
      console.log('📊 Factură salvată cu datele:', {
        id: docRef.id,
        associationId,
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
      
      const docRef = doc(db, 'invoices', invoiceId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Factură actualizată:', invoiceId);
      
    } catch (error) {
      console.error('❌ Eroare la actualizarea facturii:', error);
      throw error;
    }
  }, []);

  // 🗑️ ȘTERGEREA UNEI FACTURI
  const deleteInvoice = useCallback(async (invoiceId) => {
    try {
      console.log('🗑️ Șterg factura:', invoiceId);
      
      const docRef = doc(db, 'invoices', invoiceId);
      await deleteDoc(docRef);

      console.log('✅ Factură ștearsă:', invoiceId);
      
    } catch (error) {
      console.error('❌ Eroare la ștergerea facturii:', error);
      throw error;
    }
  }, []);

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
        const matchesExpenseType = !specificExpenseType || invoice.expenseType === specificExpenseType;
        
        // Debug eliminat pentru a reduce clutterul din consolă
        
        return hasNoSupplier && matchesExpenseType;
      });
      
      console.log('📊 Facturi găsite fără furnizor:', invoicesWithoutSupplier.length, specificExpenseType ? `pentru ${specificExpenseType}` : '');
      
      for (const invoice of invoicesWithoutSupplier) {
        try {
          console.log('🔧 Procesez factura:', invoice.id, 'cu cheltuiala:', invoice.expenseType || 'LIPSEȘTE');
          
          // Pentru facturile fără expenseType, folosește specificExpenseType pentru configurare
          const targetExpenseType = invoice.expenseType || specificExpenseType;
          const expenseConfig = getExpenseConfig(targetExpenseType);
          
          if (expenseConfig && expenseConfig.supplierId && expenseConfig.supplierName) {
            console.log('✅ Actualizez furnizorul pentru factura:', invoice.id, 'cu:', expenseConfig.supplierName);
            
            const docRef = doc(db, 'invoices', invoice.id);
            const updateData = {
              supplierId: expenseConfig.supplierId,
              supplierName: expenseConfig.supplierName,
              updatedAt: new Date().toISOString()
            };
            
            // Dacă factura nu are expenseType setat, setează-l
            if (!invoice.expenseType || invoice.expenseType === '') {
              updateData.expenseType = specificExpenseType;
              console.log('🔧 Setez și expenseType pentru factura:', invoice.id, 'la:', specificExpenseType);
            }
            
            await updateDoc(docRef, updateData);
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
      !invoice.isPaid && new Date(invoice.dueDate) < today
    );
  }, [invoices]);
  
  // 🆕 OBȚINE FACTURILE PARȚIAL DISTRIBUITE
  const getPartiallyDistributedInvoices = useCallback((expenseType = null) => {
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
      
      // ÎMBUNĂTĂȚIRE: Match pe expenseType SAU pe furnizor
      let matchesType = !expenseType || invoice.expenseType === expenseType;
      
      // Dacă nu găsim pe expenseType, încearcă matching pe furnizor
      if (!matchesType && expenseType) {
        const expenseConfig = getExpenseConfig(expenseType);
        if (expenseConfig?.supplierName && invoice.supplierName) {
          // Match doar pe furnizor existent
          matchesType = expenseConfig.supplierName.toLowerCase().trim() === invoice.supplierName.toLowerCase().trim();
        }
      }
      
      return hasRemaining && matchesType;
    });
    
    // Debug simplificat - doar pentru probleme
    // Dezactivat pentru a reduce noise-ul din consolă
    // if (filtered.length === 0 && expenseType) {
    //   console.log('⚠️ Nicio factură găsită pentru:', expenseType);
    // }
    
    // Verifică dacă există facturi care au nevoie de sincronizare
    if (expenseType && filtered.length === 0) {
      const expenseConfig = getExpenseConfig(expenseType);
      if (expenseConfig?.supplierName) {
        const invoicesNeedingSync = invoices.filter(invoice => 
          invoice.expenseType === expenseType &&
          (!invoice.supplierName || invoice.supplierName === 'Fără furnizor')
        );
        
        if (invoicesNeedingSync.length > 0) {
          console.log('⚠️ Găsite', invoicesNeedingSync.length, 'facturi pentru', expenseType, 'care au nevoie de sincronizare furnizor');
          console.log('💡 Apelează syncSuppliersForExpenseType("' + expenseType + '") pentru a sincroniza');
        }
      }
    }

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
      
      // Găsește facturi care au expenseType diferit de furnizorul lor
      const problematicInvoices = invoices.filter(invoice => {
        if (!invoice.expenseType || !invoice.supplierName) return false;
        
        const expenseConfig = getExpenseConfig(invoice.expenseType);
        if (!expenseConfig?.supplierName) return false;
        
        // Verifică dacă furnizorul din factură nu corespunde cu cel configurat pentru expenseType
        return expenseConfig.supplierName.toLowerCase().trim() !== invoice.supplierName.toLowerCase().trim();
      });
      
      console.log('🔍 Facturi cu furnizor incorect:', problematicInvoices.length);
      
      for (const invoice of problematicInvoices) {
        const correctExpenseConfig = getExpenseConfig(invoice.expenseType);
        
        console.log('🔧 Corectez factura:', invoice.id, {
          invoiceNumber: invoice.invoiceNumber,
          expenseType: invoice.expenseType,
          currentSupplier: invoice.supplierName,
          correctSupplier: correctExpenseConfig.supplierName
        });
        
        const docRef = doc(db, 'invoices', invoice.id);
        await updateDoc(docRef, {
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
  }, [invoices, getExpenseConfig]);
  
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


  // 🎯 RETURN API
  return {
    // 📊 Date și stare
    invoices,
    loading,
    
    // 🔧 Funcții CRUD
    addInvoice,
    updateInvoice,
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
    fixIncorrectSuppliers
  };
};

export default useInvoices;