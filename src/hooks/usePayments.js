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

/**
 * 💳 HOOK PENTRU GESTIONAREA PLĂȚILOR
 *
 * Funcționalități:
 * - Creare și tracking plăți
 * - Suport pentru multiple metode: card (PayU), transfer bancar, manual
 * - Istoric plăți per user
 * - Integrare cu facturi
 *
 * Status-uri plată:
 * - 'pending': Plată inițiată, așteaptă procesare
 * - 'processing': În curs de procesare (PayU)
 * - 'completed': Plată finalizată cu succes
 * - 'failed': Plată eșuată
 * - 'refunded': Plată returnată (partial sau total)
 * - 'cancelled': Plată anulată
 *
 * Metode de plată:
 * - 'card': Plată cu cardul prin PayU
 * - 'bank_transfer': Transfer bancar
 * - 'manual': Plată înregistrată manual de admin
 */
export const usePayments = () => {
  const { logActivity } = useSecurity();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Generează ID unic pentru plată
   */
  const generatePaymentId = () => {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Generează referință unică pentru transfer bancar
   */
  const generateBankReference = (invoiceNumber) => {
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return invoiceNumber ? `${invoiceNumber}-${random}` : `BLC-${Date.now()}-${random}`;
  };

  /**
   * Creează o nouă plată
   * @param {object} paymentData - Datele plății
   */
  const createPayment = useCallback(async (paymentData) => {
    const {
      userId,
      invoiceId,
      subscriptionId,
      amount,
      currency = 'RON',
      method, // 'card' | 'bank_transfer' | 'manual'
      description = null,
      metadata = {}
    } = paymentData;

    if (!userId || !amount || !method) {
      throw new Error('User ID, amount, and method are required');
    }

    setLoading(true);
    setError(null);

    try {
      const paymentId = generatePaymentId();
      const now = new Date();

      const payment = {
        id: paymentId,

        // References
        userId,
        invoiceId: invoiceId || null,
        subscriptionId: subscriptionId || null,

        // Payment details
        amount: Number(amount),
        currency,
        description: description || `Plată subscription BlocApp`,
        method,
        status: method === 'manual' ? 'completed' : 'pending',

        // Bank transfer specific
        bankReference: method === 'bank_transfer' ? generateBankReference(metadata.invoiceNumber) : null,

        // PayU specific (va fi completat la procesare)
        payuOrderId: null,
        payuTransactionId: null,
        payuStatus: null,

        // Card details (va fi completat de PayU)
        cardLast4: null,
        cardBrand: null,
        cardExpiry: null,

        // Timestamps
        initiatedAt: now.toISOString(),
        processedAt: method === 'manual' ? now.toISOString() : null,
        completedAt: method === 'manual' ? now.toISOString() : null,
        failedAt: null,
        refundedAt: null,
        cancelledAt: null,

        // Failure info
        failureReason: null,
        failureCode: null,

        // Refund info
        refundedAmount: 0,
        refundReason: null,

        // Metadata
        metadata: {
          ...metadata,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          createdVia: metadata.createdVia || 'app'
        },

        // Audit
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        createdBy: metadata.createdBy || userId
      };

      // Salvează în Firestore
      const paymentRef = doc(db, 'payments', paymentId);
      await setDoc(paymentRef, payment);

      // Log activity
      await logActivity(userId, 'PAYMENT_INITIATED', {
        paymentId,
        amount,
        method,
        invoiceId
      });

      setLoading(false);

      return {
        success: true,
        payment
      };
    } catch (err) {
      console.error('❌ Error creating payment:', err);
      setError(err.message);
      setLoading(false);

      return {
        success: false,
        error: err.message
      };
    }
  }, [logActivity]);

  /**
   * Actualizează statusul unei plăți
   */
  const updatePaymentStatus = useCallback(async (paymentId, status, additionalData = {}) => {
    if (!paymentId || !status) {
      throw new Error('Payment ID and status are required');
    }

    setLoading(true);

    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        throw new Error('Payment not found');
      }

      const payment = paymentDoc.data();
      const now = new Date().toISOString();

      const updateData = {
        status,
        updatedAt: now,
        ...additionalData
      };

      // Setează timestamp-uri specifice statusului
      switch (status) {
        case 'processing':
          updateData.processedAt = now;
          break;
        case 'completed':
          updateData.completedAt = now;
          break;
        case 'failed':
          updateData.failedAt = now;
          break;
        case 'refunded':
          updateData.refundedAt = now;
          break;
        case 'cancelled':
          updateData.cancelledAt = now;
          break;
        default:
          break;
      }

      await updateDoc(paymentRef, updateData);

      // Log activity
      await logActivity(payment.userId, `PAYMENT_${status.toUpperCase()}`, {
        paymentId,
        previousStatus: payment.status,
        newStatus: status,
        amount: payment.amount
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('❌ Error updating payment status:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  /**
   * Marchează plata ca finalizată
   */
  const completePayment = useCallback(async (paymentId, paymentDetails = {}) => {
    return updatePaymentStatus(paymentId, 'completed', {
      payuTransactionId: paymentDetails.transactionId || null,
      cardLast4: paymentDetails.cardLast4 || null,
      cardBrand: paymentDetails.cardBrand || null
    });
  }, [updatePaymentStatus]);

  /**
   * Marchează plata ca eșuată
   */
  const failPayment = useCallback(async (paymentId, reason, code = null) => {
    return updatePaymentStatus(paymentId, 'failed', {
      failureReason: reason,
      failureCode: code
    });
  }, [updatePaymentStatus]);

  /**
   * Procesează refund (parțial sau total)
   */
  const refundPayment = useCallback(async (paymentId, refundAmount, reason, refundedBy) => {
    if (!paymentId || !refundAmount) {
      throw new Error('Payment ID and refund amount are required');
    }

    setLoading(true);

    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        throw new Error('Payment not found');
      }

      const payment = paymentDoc.data();

      // Verifică că plata e completată
      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }

      // Verifică că suma de refund nu depășește plata
      const totalRefunded = (payment.refundedAmount || 0) + refundAmount;
      if (totalRefunded > payment.amount) {
        throw new Error('Refund amount exceeds payment amount');
      }

      const now = new Date().toISOString();
      const isFullRefund = totalRefunded === payment.amount;

      await updateDoc(paymentRef, {
        status: isFullRefund ? 'refunded' : 'completed',
        refundedAmount: totalRefunded,
        refundReason: reason,
        refundedAt: now,
        refundedBy,
        updatedAt: now
      });

      // Log activity
      await logActivity(refundedBy, 'PAYMENT_REFUNDED', {
        paymentId,
        refundAmount,
        totalRefunded,
        isFullRefund,
        reason,
        targetUserId: payment.userId
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('❌ Error refunding payment:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  /**
   * Anulează o plată pending
   */
  const cancelPayment = useCallback(async (paymentId, reason, cancelledBy) => {
    setLoading(true);

    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        throw new Error('Payment not found');
      }

      const payment = paymentDoc.data();

      // Doar plățile pending pot fi anulate
      if (payment.status !== 'pending') {
        throw new Error('Only pending payments can be cancelled');
      }

      await updatePaymentStatus(paymentId, 'cancelled', {
        cancelReason: reason,
        cancelledBy
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('❌ Error cancelling payment:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [updatePaymentStatus]);

  /**
   * Înregistrează plată manuală (de către admin)
   */
  const recordManualPayment = useCallback(async (paymentData, recordedBy) => {
    const {
      userId,
      invoiceId,
      amount,
      description,
      paymentDate,
      reference
    } = paymentData;

    if (!userId || !amount || !recordedBy) {
      throw new Error('User ID, amount, and recorder ID are required');
    }

    setLoading(true);

    try {
      const result = await createPayment({
        userId,
        invoiceId,
        amount,
        method: 'manual',
        description: description || 'Plată înregistrată manual',
        metadata: {
          recordedBy,
          paymentDate: paymentDate || new Date().toISOString(),
          reference,
          createdVia: 'admin_portal'
        }
      });

      if (result.success) {
        // Log activity pentru admin
        await logActivity(recordedBy, 'MANUAL_PAYMENT_RECORDED', {
          paymentId: result.payment.id,
          targetUserId: userId,
          amount,
          invoiceId
        });
      }

      setLoading(false);
      return result;
    } catch (err) {
      console.error('❌ Error recording manual payment:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [createPayment, logActivity]);

  /**
   * Confirmă plată prin transfer bancar (de către admin)
   */
  const confirmBankTransfer = useCallback(async (paymentId, confirmationDetails, confirmedBy) => {
    if (!paymentId || !confirmedBy) {
      throw new Error('Payment ID and confirmer ID are required');
    }

    setLoading(true);

    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        throw new Error('Payment not found');
      }

      const payment = paymentDoc.data();

      if (payment.method !== 'bank_transfer') {
        throw new Error('This is not a bank transfer payment');
      }

      if (payment.status !== 'pending') {
        throw new Error('Payment is not pending');
      }

      const now = new Date().toISOString();

      await updateDoc(paymentRef, {
        status: 'completed',
        completedAt: now,
        processedAt: now,
        updatedAt: now,
        metadata: {
          ...payment.metadata,
          confirmedBy,
          confirmedAt: now,
          confirmationDetails
        }
      });

      // Log activity
      await logActivity(confirmedBy, 'BANK_TRANSFER_CONFIRMED', {
        paymentId,
        targetUserId: payment.userId,
        amount: payment.amount,
        invoiceId: payment.invoiceId
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('❌ Error confirming bank transfer:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  /**
   * Încarcă o plată specifică
   */
  const loadPayment = useCallback(async (paymentId) => {
    if (!paymentId) return null;

    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) return null;

      return {
        id: paymentDoc.id,
        ...paymentDoc.data()
      };
    } catch (err) {
      console.error('❌ Error loading payment:', err);
      return null;
    }
  }, []);

  /**
   * Încarcă plățile unui user
   */
  const loadUserPayments = useCallback(async (userId, options = {}) => {
    if (!userId) return [];

    setLoading(true);

    try {
      const paymentsRef = collection(db, 'payments');
      let paymentsQuery = query(
        paymentsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      // Filtrare după status
      if (options.status) {
        paymentsQuery = query(
          paymentsRef,
          where('userId', '==', userId),
          where('status', '==', options.status),
          orderBy('createdAt', 'desc')
        );
      }

      // Limitare rezultate
      if (options.limit) {
        paymentsQuery = query(paymentsQuery, limit(options.limit));
      }

      const snapshot = await getDocs(paymentsQuery);
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setLoading(false);
      return payments;
    } catch (err) {
      console.error('❌ Error loading user payments:', err);
      setError(err.message);
      setLoading(false);
      return [];
    }
  }, []);

  /**
   * Încarcă plățile pentru o factură
   */
  const loadInvoicePayments = useCallback(async (invoiceId) => {
    if (!invoiceId) return [];

    try {
      const paymentsRef = collection(db, 'payments');
      const paymentsQuery = query(
        paymentsRef,
        where('invoiceId', '==', invoiceId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(paymentsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error('❌ Error loading invoice payments:', err);
      return [];
    }
  }, []);

  /**
   * Obține plățile pending (pentru transfer bancar) - pentru admin
   */
  const getPendingBankTransfers = useCallback(async () => {
    setLoading(true);

    try {
      const paymentsRef = collection(db, 'payments');
      const paymentsQuery = query(
        paymentsRef,
        where('method', '==', 'bank_transfer'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(paymentsQuery);
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setLoading(false);
      return payments;
    } catch (err) {
      console.error('❌ Error loading pending bank transfers:', err);
      setError(err.message);
      setLoading(false);
      return [];
    }
  }, []);

  /**
   * Calculează statistici plăți pentru un user
   */
  const getPaymentStats = useCallback(async (userId) => {
    if (!userId) return null;

    try {
      const payments = await loadUserPayments(userId);

      const stats = {
        total: payments.length,
        completed: 0,
        pending: 0,
        failed: 0,
        refunded: 0,
        totalPaid: 0,
        totalRefunded: 0,
        lastPaymentAt: null
      };

      payments.forEach(payment => {
        switch (payment.status) {
          case 'completed':
            stats.completed++;
            stats.totalPaid += payment.amount - (payment.refundedAmount || 0);
            if (!stats.lastPaymentAt || payment.completedAt > stats.lastPaymentAt) {
              stats.lastPaymentAt = payment.completedAt;
            }
            break;
          case 'pending':
          case 'processing':
            stats.pending++;
            break;
          case 'failed':
            stats.failed++;
            break;
          case 'refunded':
            stats.refunded++;
            stats.totalRefunded += payment.refundedAmount || payment.amount;
            break;
          default:
            break;
        }
      });

      return stats;
    } catch (err) {
      console.error('❌ Error getting payment stats:', err);
      return null;
    }
  }, [loadUserPayments]);

  /**
   * Inițiază plată cu cardul (va fi procesat prin PayU)
   * Returnează datele necesare pentru redirect la PayU
   */
  const initiateCardPayment = useCallback(async (paymentData) => {
    const result = await createPayment({
      ...paymentData,
      method: 'card'
    });

    if (!result.success) {
      return result;
    }

    // Aici se va integra cu PayU când vei avea credențialele
    // Pentru acum, returnăm datele plății care vor fi folosite pentru PayU
    return {
      success: true,
      payment: result.payment,
      // Aceste date vor fi completate de PayU client
      payuRedirectUrl: null,
      payuOrderId: null,
      requiresPayuIntegration: true
    };
  }, [createPayment]);

  /**
   * Inițiază plată prin transfer bancar
   */
  const initiateBankTransfer = useCallback(async (paymentData) => {
    const result = await createPayment({
      ...paymentData,
      method: 'bank_transfer'
    });

    if (!result.success) {
      return result;
    }

    // Returnează detaliile pentru transfer bancar
    return {
      success: true,
      payment: result.payment,
      bankDetails: {
        beneficiary: 'SC BlocApp Solutions SRL',
        bank: 'Banca Transilvania',
        iban: 'RO12BTRL0000000000000000', // De actualizat cu IBAN real
        reference: result.payment.bankReference,
        amount: result.payment.amount,
        currency: result.payment.currency
      }
    };
  }, [createPayment]);

  return {
    // State
    loading,
    error,

    // Core functions
    createPayment,
    updatePaymentStatus,

    // Payment completion
    completePayment,
    failPayment,
    cancelPayment,

    // Refunds
    refundPayment,

    // Manual/Bank payments
    recordManualPayment,
    confirmBankTransfer,

    // Payment initiation
    initiateCardPayment,
    initiateBankTransfer,

    // Load functions
    loadPayment,
    loadUserPayments,
    loadInvoicePayments,
    getPendingBankTransfers,

    // Stats
    getPaymentStats,

    // Helpers
    generateBankReference
  };
};
