import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
// Firebase Storage nu mai este necesar - folosim Base64
import { db } from '../firebase';

/**
 * 🧾 Custom Hook pentru Gestionarea Facturilor
 * 
 * RESPONSABILITĂȚI:
 * - CRUD complet pentru facturi
 * - Upload/download PDF-uri facturi
 * - Sincronizare real-time cu Firebase
 * - Filtrare și căutare facturi
 */
const useInvoices = (associationId) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔄 ÎNCĂRCAREA FACTURILOR LA SCHIMBAREA ASOCIAȚIEI
  useEffect(() => {
    if (!associationId) {
      console.log('⚠️ useInvoices: Nu există associationId, resetez facturile');
      setInvoices([]);
      setLoading(false);
      return;
    }

    console.log('📥 Încarc facturile pentru asociația:', associationId);
    
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
        
        console.log('✅ Facturi încărcate:', invoicesData.length);
        console.log('📋 Lista facturilor încărcate:', invoicesData.map(inv => ({
          id: inv.id,
          month: inv.month,
          invoiceNumber: inv.invoiceNumber,
          associationId: inv.associationId
        })));
      },
      (error) => {
        console.error('❌ Eroare la încărcarea facturilor:', error);
        setInvoices([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId]);

  // ➕ ADĂUGAREA UNEI FACTURI NOI
  const addInvoice = useCallback(async (invoiceData, pdfFile = null) => {
    if (!associationId) {
      throw new Error('Nu există asociație selectată');
    }

    try {
      console.log('➕ Adaug factură nouă:', invoiceData);
      console.log('📎 PDF File:', pdfFile?.name || 'Nu există PDF');
      
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

      // Creează documentul facturii
      const docRef = await addDoc(collection(db, 'invoices'), {
        associationId,
        supplierId: invoiceData.supplierId,
        supplierName: invoiceData.supplierName,
        expenseType: invoiceData.expenseType,
        expenseId: invoiceData.expenseId || null,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        month: invoiceData.month,
        amount: parseFloat(invoiceData.amount) || 0,
        vatAmount: parseFloat(invoiceData.vatAmount) || 0,
        totalAmount: parseFloat(invoiceData.totalAmount) || 0,
        isPaid: false,
        paidDate: null,
        paymentMethod: null,
        // Date PDF - salvate ca Base64 în loc de URL
        pdfUrl: pdfData?.base64 || null, // Pentru compatibilitate cu codul existent
        pdfData: pdfData, // Datele complete Base64
        notes: invoiceData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Factură salvată cu ID:', docRef.id);
      console.log('📊 Factură salvată cu datele:', {
        id: docRef.id,
        associationId,
        month: invoiceData.month,
        invoiceNumber: invoiceData.invoiceNumber,
        supplierName: invoiceData.supplierName,
        totalAmount: invoiceData.totalAmount,
        hasPdfData: !!pdfData
      });
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Eroare la salvarea facturii:', error);
      throw error;
    }
  }, [associationId]);

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

  console.log('🔄 useInvoices render:', {
    associationId,
    associationIdExists: !!associationId,
    invoicesCount: invoices.length,
    loading
  });

  // 🎯 RETURN API
  return {
    // 📊 Date și stare
    invoices,
    loading,
    
    // 🔧 Funcții CRUD
    addInvoice,
    updateInvoice,
    deleteInvoice,
    
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
    getInvoiceStats
  };
};

export default useInvoices;