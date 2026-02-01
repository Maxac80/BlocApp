/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useCallback } from 'react';
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSecurity } from './useSecurity';

/**
 * 👑 HOOK PENTRU ADMIN BILLING OPERATIONS
 *
 * Funcționalități pentru super-admin (owner BlocApp):
 * - Dashboard statistici (MRR, useri, churn)
 * - Gestionare useri (extend trial, set discount, suspend)
 * - Vizualizare și gestionare facturi
 * - Confirmare plăți manuale
 * - Rapoarte și export
 *
 * IMPORTANT: Acest hook trebuie folosit DOAR de super_admin!
 * Verifică rolul utilizatorului înainte de a permite acces.
 */
export const useAdminBilling = () => {
  const { logActivity } = useSecurity();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // DASHBOARD STATISTICS
  // ============================================

  /**
   * Obține statistici generale pentru dashboard
   */
  const getDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stats = {
        // User stats
        totalUsers: 0,
        activeUsers: 0,
        trialUsers: 0,
        pastDueUsers: 0,
        suspendedUsers: 0,

        // Revenue stats
        mrr: 0, // Monthly Recurring Revenue
        totalRevenue: 0,
        pendingRevenue: 0,

        // Association stats
        totalAssociations: 0,
        activeAssociations: 0,
        suspendedAssociations: 0,

        // Apartment stats
        totalApartments: 0,

        // Payment stats
        pendingPayments: 0,
        pendingPaymentsAmount: 0,

        // Recent activity
        newUsersThisMonth: 0,
        newAssociationsThisMonth: 0
      };

      // 1. Obține statistici useri
      const usersRef = collection(db, 'users');

      // Total useri admin_asociatie
      const adminUsersQuery = query(usersRef, where('role', '==', 'admin_asociatie'));
      const adminUsersSnapshot = await getDocs(adminUsersQuery);
      stats.totalUsers = adminUsersSnapshot.size;

      // Numără pe statusuri
      adminUsersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.subscription?.status || data.subscriptionStatus;

        switch (status) {
          case 'active':
            stats.activeUsers++;
            break;
          case 'trial':
            // Verifică dacă trial-ul a expirat
            const trialEnd = data.subscription?.trialEndsAt;
            if (trialEnd && new Date(trialEnd) < new Date()) {
              stats.pastDueUsers++;
            } else {
              stats.trialUsers++;
            }
            break;
          case 'past_due':
            stats.pastDueUsers++;
            break;
          case 'suspended':
          case 'cancelled':
            stats.suspendedUsers++;
            break;
          default:
            stats.trialUsers++; // Default to trial
        }
      });

      // 2. Obține statistici asociații
      const associationsRef = collection(db, 'associations');
      const associationsSnapshot = await getCountFromServer(associationsRef);
      stats.totalAssociations = associationsSnapshot.data().count;

      const activeAssocQuery = query(associationsRef, where('billingStatus', '==', 'active'));
      const activeAssocSnapshot = await getCountFromServer(activeAssocQuery);
      stats.activeAssociations = activeAssocSnapshot.data().count;

      stats.suspendedAssociations = stats.totalAssociations - stats.activeAssociations;

      // 3. Obține statistici plăți pending
      const paymentsRef = collection(db, 'payments');
      const pendingPaymentsQuery = query(
        paymentsRef,
        where('status', '==', 'pending'),
        where('method', '==', 'bank_transfer')
      );
      const pendingPaymentsSnapshot = await getDocs(pendingPaymentsQuery);
      stats.pendingPayments = pendingPaymentsSnapshot.size;
      pendingPaymentsSnapshot.docs.forEach(doc => {
        stats.pendingPaymentsAmount += doc.data().amount || 0;
      });

      // 4. Obține statistici facturi pentru MRR
      const invoicesRef = collection(db, 'invoices');
      const paidInvoicesQuery = query(
        invoicesRef,
        where('status', '==', 'paid'),
        orderBy('paidAt', 'desc')
      );
      const paidInvoicesSnapshot = await getDocs(paidInvoicesQuery);

      paidInvoicesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.totalRevenue += data.totalAmount || 0;

        // Calculează MRR (ultimele 30 zile)
        const paidAt = new Date(data.paidAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        if (paidAt > thirtyDaysAgo) {
          stats.mrr += data.totalAmount || 0;
        }
      });

      // Pending revenue
      const pendingInvoicesQuery = query(invoicesRef, where('status', '==', 'pending'));
      const pendingInvoicesSnapshot = await getDocs(pendingInvoicesQuery);
      pendingInvoicesSnapshot.docs.forEach(doc => {
        stats.pendingRevenue += doc.data().totalAmount || 0;
      });

      // 5. Useri noi luna asta
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      adminUsersSnapshot.docs.forEach(doc => {
        const createdAt = doc.data().createdAt;
        if (createdAt && new Date(createdAt) >= startOfMonth) {
          stats.newUsersThisMonth++;
        }
      });

      setLoading(false);
      return stats;
    } catch (err) {
      console.error('❌ Error getting dashboard stats:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * Obține evoluția MRR pentru ultimele N luni
   */
  const getMrrHistory = useCallback(async (months = 12) => {
    try {
      const invoicesRef = collection(db, 'invoices');
      const paidInvoicesQuery = query(
        invoicesRef,
        where('status', '==', 'paid'),
        orderBy('paidAt', 'asc')
      );
      const snapshot = await getDocs(paidInvoicesQuery);

      // Grupează pe luni
      const mrrByMonth = {};
      const now = new Date();

      // Inițializează ultimele N luni
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        mrrByMonth[key] = 0;
      }

      // Adaugă sumele
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.paidAt) {
          const paidDate = new Date(data.paidAt);
          const key = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`;
          if (mrrByMonth.hasOwnProperty(key)) {
            mrrByMonth[key] += data.totalAmount || 0;
          }
        }
      });

      // Convertește în array pentru grafic
      return Object.entries(mrrByMonth).map(([month, amount]) => ({
        month,
        amount: Math.round(amount * 100) / 100
      }));
    } catch (err) {
      console.error('❌ Error getting MRR history:', err);
      return [];
    }
  }, []);

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Obține lista userilor cu paginare
   */
  const getUsers = useCallback(async (options = {}) => {
    const {
      pageSize = 20,
      lastDoc = null,
      status = null,
      search = null
    } = options;

    setLoading(true);

    try {
      const usersRef = collection(db, 'users');
      let usersQuery = query(
        usersRef,
        where('role', '==', 'admin_asociatie'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      // Filtrare după status
      if (status && status !== 'all') {
        usersQuery = query(
          usersRef,
          where('role', '==', 'admin_asociatie'),
          where('subscription.status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      }

      // Paginare
      if (lastDoc) {
        usersQuery = query(usersQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(usersQuery);

      const users = await Promise.all(snapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();

        // Obține numărul de asociații
        const associationsQuery = query(
          collection(db, 'associations'),
          where('adminId', '==', userDoc.id)
        );
        const assocSnapshot = await getCountFromServer(associationsQuery);

        return {
          id: userDoc.id,
          ...userData,
          associationsCount: assocSnapshot.data().count
        };
      }));

      setLoading(false);

      return {
        users,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (err) {
      console.error('❌ Error getting users:', err);
      setError(err.message);
      setLoading(false);
      return { users: [], lastDoc: null, hasMore: false };
    }
  }, []);

  /**
   * Obține detalii complete pentru un user
   */
  const getUserDetails = useCallback(async (userId) => {
    if (!userId) return null;

    setLoading(true);

    try {
      // 1. Date user
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setLoading(false);
        return null;
      }

      const userData = userDoc.data();

      // 2. Asociații
      const associationsQuery = query(
        collection(db, 'associations'),
        where('adminId', '==', userId)
      );
      const associationsSnapshot = await getDocs(associationsQuery);
      const associations = associationsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // 3. Facturi
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoices = invoicesSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // 4. Plăți
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // 5. Calculează apartamente active
      let totalApartments = 0;
      for (const assoc of associations) {
        if (assoc.billingStatus !== 'suspended') {
          const sheetsQuery = query(
            collection(db, 'associations', assoc.id, 'sheets'),
            where('status', '==', 'published'),
            limit(1)
          );
          const sheetsSnapshot = await getDocs(sheetsQuery);
          if (!sheetsSnapshot.empty) {
            const sheet = sheetsSnapshot.docs[0].data();
            const apartmentIds = new Set();
            (sheet.maintenanceTable || []).forEach(entry => {
              if (entry.apartmentId) apartmentIds.add(entry.apartmentId);
            });
            totalApartments += apartmentIds.size;
          }
        }
      }

      // 6. Calculează MRR pentru user
      let userMrr = 0;
      invoices.forEach(inv => {
        if (inv.status === 'paid') {
          const paidAt = new Date(inv.paidAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (paidAt > thirtyDaysAgo) {
            userMrr += inv.totalAmount || 0;
          }
        }
      });

      setLoading(false);

      return {
        user: {
          id: userId,
          ...userData
        },
        associations,
        invoices,
        payments,
        stats: {
          totalAssociations: associations.length,
          activeAssociations: associations.filter(a => a.billingStatus !== 'suspended').length,
          totalApartments,
          userMrr
        }
      };
    } catch (err) {
      console.error('❌ Error getting user details:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * Extinde trial-ul unui user
   */
  const extendUserTrial = useCallback(async (userId, additionalDays, adminUserId) => {
    if (!userId || !additionalDays || !adminUserId) {
      throw new Error('User ID, additional days, and admin ID are required');
    }

    setLoading(true);

    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentTrialEnd = userData.subscription?.trialEndsAt
        ? new Date(userData.subscription.trialEndsAt)
        : new Date();

      // Extinde de la data curentă dacă trial-ul a expirat
      const baseDate = currentTrialEnd > new Date() ? currentTrialEnd : new Date();
      const newTrialEnd = new Date(baseDate);
      newTrialEnd.setDate(newTrialEnd.getDate() + additionalDays);

      await updateDoc(userRef, {
        'subscription.status': 'trial',
        'subscription.trialEndsAt': newTrialEnd.toISOString(),
        'subscriptionStatus': 'trial',
        updatedAt: new Date().toISOString()
      });

      await logActivity(adminUserId, 'ADMIN_TRIAL_EXTENDED', {
        targetUserId: userId,
        additionalDays,
        newTrialEndsAt: newTrialEnd.toISOString()
      });

      setLoading(false);
      return { success: true, newTrialEndsAt: newTrialEnd.toISOString() };
    } catch (err) {
      console.error('❌ Error extending trial:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  /**
   * Setează pricing custom pentru un user
   */
  const setCustomPricing = useCallback(async (userId, pricing, adminUserId) => {
    if (!userId || !adminUserId) {
      throw new Error('User ID and admin ID are required');
    }

    setLoading(true);

    try {
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        'subscription.customPricing': {
          enabled: pricing.enabled !== false,
          pricePerApartment: pricing.pricePerApartment || 5.00,
          discountPercent: pricing.discountPercent || 0,
          discountReason: pricing.discountReason || null,
          setBy: adminUserId,
          setAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      });

      await logActivity(adminUserId, 'ADMIN_CUSTOM_PRICING_SET', {
        targetUserId: userId,
        ...pricing
      });

      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('❌ Error setting custom pricing:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  /**
   * Suspendă un user
   */
  const suspendUser = useCallback(async (userId, reason, adminUserId) => {
    if (!userId || !adminUserId) {
      throw new Error('User ID and admin ID are required');
    }

    setLoading(true);

    try {
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        'subscription.status': 'suspended',
        'subscriptionStatus': 'suspended',
        updatedAt: new Date().toISOString()
      });

      await logActivity(adminUserId, 'ADMIN_USER_SUSPENDED', {
        targetUserId: userId,
        reason
      });

      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('❌ Error suspending user:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  /**
   * Reactivează un user
   */
  const reactivateUser = useCallback(async (userId, adminUserId) => {
    if (!userId || !adminUserId) {
      throw new Error('User ID and admin ID are required');
    }

    setLoading(true);

    try {
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        'subscription.status': 'active',
        'subscriptionStatus': 'active',
        updatedAt: new Date().toISOString()
      });

      await logActivity(adminUserId, 'ADMIN_USER_REACTIVATED', {
        targetUserId: userId
      });

      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('❌ Error reactivating user:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [logActivity]);

  // ============================================
  // INVOICE MANAGEMENT
  // ============================================

  /**
   * Obține toate facturile cu paginare
   */
  const getInvoices = useCallback(async (options = {}) => {
    const {
      pageSize = 20,
      lastDoc = null,
      status = null
    } = options;

    setLoading(true);

    try {
      const invoicesRef = collection(db, 'invoices');
      let invoicesQuery = query(
        invoicesRef,
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (status && status !== 'all') {
        invoicesQuery = query(
          invoicesRef,
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      }

      if (lastDoc) {
        invoicesQuery = query(invoicesQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(invoicesQuery);

      const invoices = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setLoading(false);

      return {
        invoices,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (err) {
      console.error('❌ Error getting invoices:', err);
      setError(err.message);
      setLoading(false);
      return { invoices: [], lastDoc: null, hasMore: false };
    }
  }, []);

  // ============================================
  // PAYMENT MANAGEMENT
  // ============================================

  /**
   * Obține plățile pending (pentru confirmare transfer bancar)
   */
  const getPendingBankTransfers = useCallback(async () => {
    setLoading(true);

    try {
      const paymentsRef = collection(db, 'payments');
      const pendingQuery = query(
        paymentsRef,
        where('method', '==', 'bank_transfer'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(pendingQuery);

      // Îmbogățește cu date user
      const payments = await Promise.all(snapshot.docs.map(async (paymentDoc) => {
        const paymentData = paymentDoc.data();

        // Obține date user
        let userEmail = null;
        if (paymentData.userId) {
          const userRef = doc(db, 'users', paymentData.userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            userEmail = userDoc.data().email;
          }
        }

        return {
          id: paymentDoc.id,
          ...paymentData,
          userEmail
        };
      }));

      setLoading(false);
      return payments;
    } catch (err) {
      console.error('❌ Error getting pending transfers:', err);
      setError(err.message);
      setLoading(false);
      return [];
    }
  }, []);

  /**
   * Obține toate plățile cu paginare
   */
  const getPayments = useCallback(async (options = {}) => {
    const {
      pageSize = 20,
      lastDoc = null,
      status = null,
      method = null
    } = options;

    setLoading(true);

    try {
      const paymentsRef = collection(db, 'payments');
      let paymentsQuery = query(
        paymentsRef,
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (status && status !== 'all') {
        paymentsQuery = query(
          paymentsRef,
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      }

      if (lastDoc) {
        paymentsQuery = query(paymentsQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(paymentsQuery);

      const payments = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setLoading(false);

      return {
        payments,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (err) {
      console.error('❌ Error getting payments:', err);
      setError(err.message);
      setLoading(false);
      return { payments: [], lastDoc: null, hasMore: false };
    }
  }, []);

  return {
    // State
    loading,
    error,

    // Dashboard
    getDashboardStats,
    getMrrHistory,

    // User management
    getUsers,
    getUserDetails,
    extendUserTrial,
    setCustomPricing,
    suspendUser,
    reactivateUser,

    // Invoice management
    getInvoices,

    // Payment management
    getPendingBankTransfers,
    getPayments
  };
};
