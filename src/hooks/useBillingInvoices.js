import { useState, useCallback } from 'react';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSecurity } from './useSecurity';
import { useBillingCalculation } from './useBillingCalculation';

/**
 * 🧾 HOOK PENTRU GESTIONAREA FACTURILOR SUBSCRIPTION
 *
 * Funcționalități:
 * - Generare facturi lunare
 * - Încărcare și listare facturi
 * - Actualizare status factură (paid, failed, cancelled)
 * - Generare număr factură unic (BLC-YYYY-XXXXXX)
 * - Suport pentru plăți manuale și automate
 *
 * Status-uri factură:
 * - 'draft': Factură în curs de generare
 * - 'pending': Factură emisă, așteaptă plată
 * - 'paid': Factură plătită
 * - 'failed': Plată eșuată
 * - 'cancelled': Factură anulată
 */
export const useBillingInvoices = () => {
  const { logActivity } = useSecurity();
  const { countActiveApartments, calculateBillingAmount } = useBillingCalculation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Generează număr factură unic în format BLC-YYYY-XXXXXX
   */
  const generateInvoiceNumber = useCallback(async () => {
    try {
      const settingsRef = doc(db, 'settings', 'billing');

      // Folosim tranzacție pentru a evita numere duplicate
      const invoiceNumber = await runTransaction(db, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);

        let nextNumber = 1;
        let prefix = 'BLC';

        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          nextNumber = (settings.nextInvoiceNumber || 0) + 1;
          prefix = settings.invoicePrefix || 'BLC';
        }

        // Actualizează următorul număr
        transaction.set(settingsRef, {
          nextInvoiceNumber: nextNumber,
          invoicePrefix: prefix,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Format: BLC-2026-000001
        const year = new Date().getFullYear();
        const paddedNumber = String(nextNumber).padStart(6, '0');

        return `${prefix}-${year}-${paddedNumber}`;
      });

      return invoiceNumber;
    } catch (err) {
      console.error('❌ Error generating invoice number:', err);
      throw err;
    }
  }, []);

  /**
   * Calculează data scadenței (14 zile de la emitere)
   */
  const calculateDueDate = useCallback((issuedAt) => {
    const issued = new Date(issuedAt);
    const due = new Date(issued);
    due.setDate(due.getDate() + 14);
    return due.toISOString();
  }, []);

  /**
   * Obține billing contact din user document
   */
  const getBillingContact = useCallback(async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) return null;

      const userData = userDoc.data();
      return userData.subscription?.billingContact || null;
    } catch (err) {
      console.error('❌ Error getting billing contact:', err);
      return null;
    }
  }, []);

  /**
   * Obține pricing custom pentru un user
   */
  const getUserPricing = useCallback(async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { pricePerApartment: 5.00, discountPercent: 0 };
      }

      const userData = userDoc.data();
      const customPricing = userData.subscription?.customPricing;

      if (customPricing?.enabled) {
        return {
          pricePerApartment: customPricing.pricePerApartment || 5.00,
          discountPercent: customPricing.discountPercent || 0
        };
      }

      return { pricePerApartment: 5.00, discountPercent: 0 };
    } catch (err) {
      console.error('❌ Error getting user pricing:', err);
      return { pricePerApartment: 5.00, discountPercent: 0 };
    }
  }, []);

  /**
   * Generează o factură pentru un user
   * @param {string} userId - ID-ul userului
   * @param {Date} periodStart - Începutul perioadei de facturare
   * @param {Date} periodEnd - Sfârșitul perioadei de facturare
   * @param {object} options - Opțiuni suplimentare
   */
  const generateInvoice = useCallback(async (userId, periodStart, periodEnd, options = {}) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obține pricing pentru user
      const { pricePerApartment, discountPercent } = await getUserPricing(userId);

      // 2. Contorizează apartamentele active
      const apartmentData = await countActiveApartments(userId);

      if (apartmentData.error) {
        throw new Error(apartmentData.error);
      }

      // Dacă nu are apartamente, nu generăm factură
      if (apartmentData.total === 0) {
        setLoading(false);
        return {
          success: false,
          reason: 'NO_BILLABLE_APARTMENTS',
          message: 'Nu există apartamente active de facturat'
        };
      }

      // 3. Calculează sumele
      const amounts = calculateBillingAmount(
        apartmentData.total,
        pricePerApartment,
        discountPercent
      );

      // 4. Generează line items
      const lineItems = apartmentData.billableAssociations.map(assoc => ({
        description: `${assoc.name} - ${assoc.activeApartments} apartamente active`,
        associationId: assoc.associationId,
        quantity: assoc.activeApartments,
        unitPrice: pricePerApartment,
        amount: Math.round(assoc.activeApartments * pricePerApartment * 100) / 100
      }));

      // 5. Obține billing contact
      const billingContact = await getBillingContact(userId);

      // 6. Generează număr factură
      const invoiceNumber = await generateInvoiceNumber();

      // 7. Timestamp-uri
      const now = new Date();
      const issuedAt = now.toISOString();
      const dueAt = calculateDueDate(issuedAt);

      // 8. Creează documentul factură
      const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const invoiceRef = doc(db, 'invoices', invoiceId);

      const invoiceData = {
        id: invoiceId,

        // References
        userId,
        subscriptionId: options.subscriptionId || null,

        // Invoice details
        invoiceNumber,
        status: options.status || 'pending',

        // Period
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        issuedAt,
        dueAt,
        paidAt: null,

        // Line items
        lineItems,

        // Summary from apartment data
        billableAssociations: apartmentData.billableAssociations,
        suspendedAssociations: apartmentData.suspendedAssociations,
        totalAssociations: apartmentData.totalAssociations,

        // Totals
        totalApartments: amounts.totalApartments,
        pricePerApartment: amounts.pricePerApartment,
        subtotal: amounts.subtotal,
        discountPercent: amounts.discountPercent,
        discountAmount: amounts.discountAmount,
        taxRate: 0, // Nu suntem plătitori TVA
        taxAmount: 0,
        totalAmount: amounts.totalAmount,
        currency: amounts.currency,

        // Billing contact (snapshot)
        billingContact,

        // Payment info (va fi completat la plată)
        paymentMethod: null,
        payuOrderId: null,
        payuTransactionId: null,

        // e-Factura (pentru viitor)
        eFactura: {
          enabled: false,
          uploadId: null,
          status: null,
          responseCode: null
        },

        // PDF
        pdfUrl: null,

        // Metadata
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        createdBy: options.createdBy || 'system'
      };

      await setDoc(invoiceRef, invoiceData);

      // 9. Log activity
      await logActivity(userId, 'INVOICE_GENERATED', {
        invoiceId,
        invoiceNumber,
        totalAmount: amounts.totalAmount,
        totalApartments: amounts.totalApartments,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString()
      });

      setLoading(false);

      return {
        success: true,
        invoice: invoiceData
      };
    } catch (err) {
      console.error('❌ Error generating invoice:', err);
      setError(err.message);
      setLoading(false);

      return {
        success: false,
        error: err.message
      };
    }
  }, [
    countActiveApartments,
    calculateBillingAmount,
    getUserPricing,
    getBillingContact,
    generateInvoiceNumber,
    calculateDueDate,
    logActivity
  ]);

  /**
   * Încarcă facturile unui user
   */
  const loadUserInvoices = useCallback(async (userId, options = {}) => {
    if (!userId) return [];

    setLoading(true);
    setError(null);

    try {
      const invoicesRef = collection(db, 'invoices');
      let invoicesQuery = query(
        invoicesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      // Opțional: filtrare după status
      if (options.status) {
        invoicesQuery = query(
          invoicesRef,
          where('userId', '==', userId),
          where('status', '==', options.status),
          orderBy('createdAt', 'desc')
        );
      }

      // Opțional: limitare rezultate
      if (options.limit) {
        invoicesQuery = query(invoicesQuery, limit(options.limit));
      }

      const snapshot = await getDocs(invoicesQuery);
      const invoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setLoading(false);
      return invoices;
    } catch (err) {
      console.error('❌ Error loading user invoices:', err);
      setError(err.message);
      setLoading(false);
      return [];
    }
  }, []);

  /**
   * Încarcă o factură specifică
   */
  const loadInvoice = useCallback(async (invoiceId) => {
    if (!invoiceId) return null;

    setLoading(true);
    setError(null);

    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);

      setLoading(false);

      if (!invoiceDoc.exists()) {
        return null;
      }

      return {
        id: invoiceDoc.id,
        ...invoiceDoc.data()
      };
    } catch (err) {
      console.error('❌ Error loading invoice:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * Marchează factura ca plătită
   */
  const markInvoiceAsPaid = useCallback(async (invoiceId, paymentDetails = {}) => {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);

      if (!invoiceDoc.exists()) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceDoc.data();
      const now = new Date().toISOString();

      await updateDoc(invoiceRef, {
        status: 'paid',
        paidAt: now,
        paymentMethod: paymentDetails.method || 'manual',
        payuOrderId: paymentDetails.payuOrderId || null,
        payuTransactionId: paymentDetails.payuTransactionId || null,
        updatedAt: now
      });

      // Log activity
      await logActivity(invoice.userId, 'INVOICE_PAID', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        paymentMethod: paymentDetails.method || 'manual'
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('❌ Error marking invoice as paid:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  /**
   * Marchează factura ca eșuată
   */
  const markInvoiceAsFailed = useCallback(async (invoiceId, failureReason = null) => {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);

      if (!invoiceDoc.exists()) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceDoc.data();
      const now = new Date().toISOString();

      await updateDoc(invoiceRef, {
        status: 'failed',
        failureReason,
        updatedAt: now
      });

      // Log activity
      await logActivity(invoice.userId, 'INVOICE_PAYMENT_FAILED', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        failureReason
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('❌ Error marking invoice as failed:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  /**
   * Anulează o factură
   */
  const cancelInvoice = useCallback(async (invoiceId, cancelledBy, reason = null) => {
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);

      if (!invoiceDoc.exists()) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceDoc.data();

      // Nu se poate anula o factură deja plătită
      if (invoice.status === 'paid') {
        throw new Error('Cannot cancel a paid invoice');
      }

      const now = new Date().toISOString();

      await updateDoc(invoiceRef, {
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy,
        cancelReason: reason,
        updatedAt: now
      });

      // Log activity
      await logActivity(cancelledBy, 'INVOICE_CANCELLED', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        targetUserId: invoice.userId,
        reason
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('❌ Error cancelling invoice:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  /**
   * Actualizează URL-ul PDF al facturii
   */
  const updateInvoicePdfUrl = useCallback(async (invoiceId, pdfUrl) => {
    if (!invoiceId || !pdfUrl) {
      throw new Error('Invoice ID and PDF URL are required');
    }

    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        pdfUrl,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error('❌ Error updating invoice PDF URL:', err);
      throw err;
    }
  }, []);

  /**
   * Obține facturile pending pentru un user (pentru afișare în UI)
   */
  const getPendingInvoices = useCallback(async (userId) => {
    return loadUserInvoices(userId, { status: 'pending' });
  }, [loadUserInvoices]);

  /**
   * Obține factura curentă (cea mai recentă pending sau paid)
   */
  const getCurrentInvoice = useCallback(async (userId) => {
    const invoices = await loadUserInvoices(userId, { limit: 1 });
    return invoices.length > 0 ? invoices[0] : null;
  }, [loadUserInvoices]);

  /**
   * Verifică dacă există o factură pentru o anumită perioadă
   */
  const hasInvoiceForPeriod = useCallback(async (userId, periodStart, periodEnd) => {
    try {
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('userId', '==', userId),
        where('periodStart', '==', periodStart.toISOString()),
        where('periodEnd', '==', periodEnd.toISOString())
      );

      const snapshot = await getDocs(invoicesQuery);
      return !snapshot.empty;
    } catch (err) {
      console.error('❌ Error checking invoice for period:', err);
      return false;
    }
  }, []);

  /**
   * Calculează statistici facturi pentru un user
   */
  const getInvoiceStats = useCallback(async (userId) => {
    try {
      const invoices = await loadUserInvoices(userId);

      const stats = {
        total: invoices.length,
        pending: 0,
        paid: 0,
        failed: 0,
        cancelled: 0,
        totalPaid: 0,
        totalPending: 0
      };

      invoices.forEach(inv => {
        switch (inv.status) {
          case 'pending':
            stats.pending++;
            stats.totalPending += inv.totalAmount || 0;
            break;
          case 'paid':
            stats.paid++;
            stats.totalPaid += inv.totalAmount || 0;
            break;
          case 'failed':
            stats.failed++;
            break;
          case 'cancelled':
            stats.cancelled++;
            break;
          default:
            break;
        }
      });

      return stats;
    } catch (err) {
      console.error('❌ Error getting invoice stats:', err);
      return null;
    }
  }, [loadUserInvoices]);

  return {
    // State
    loading,
    error,

    // Core functions
    generateInvoice,
    generateInvoiceNumber,

    // Load functions
    loadUserInvoices,
    loadInvoice,
    getCurrentInvoice,
    getPendingInvoices,

    // Status updates
    markInvoiceAsPaid,
    markInvoiceAsFailed,
    cancelInvoice,

    // Helpers
    updateInvoicePdfUrl,
    hasInvoiceForPeriod,
    getInvoiceStats,

    // Pricing helpers
    getUserPricing,
    getBillingContact
  };
};
