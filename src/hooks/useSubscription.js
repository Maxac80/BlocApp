import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useSecurity } from './useSecurity';

/**
 * 💳 HOOK PENTRU GESTIONAREA SUBSCRIPTION-ULUI
 *
 * Funcționalități:
 * - Încărcare și monitorizare status subscription
 * - Verificare trial expiration
 * - Permission flags (canEdit, canPublish, etc.)
 * - Update billing contact și preferences
 *
 * Status-uri posibile:
 * - 'trial': În perioada de trial (90 zile)
 * - 'active': Subscription activ, plătit
 * - 'past_due': Trial expirat sau plată restantă (read-only)
 * - 'suspended': Cont suspendat (blocat complet)
 * - 'cancelled': Subscription anulat
 */
export const useSubscription = (userId = null) => {
  const { logActivity } = useSecurity();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Încărcare subscription din user document
  const loadSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSubscription(userData.subscription || null);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('❌ Error loading subscription:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Real-time listener pentru subscription changes
  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setSubscription(userData.subscription || null);
        } else {
          setSubscription(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('❌ Subscription listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Calculează zilele rămase din trial
  const trialDaysRemaining = useMemo(() => {
    if (!subscription?.trialEndsAt) return null;

    const trialEnd = new Date(subscription.trialEndsAt);
    const now = new Date();
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }, [subscription?.trialEndsAt]);

  // Verifică dacă trial-ul a expirat
  const isTrialExpired = useMemo(() => {
    if (!subscription?.trialEndsAt) return false;
    if (subscription.status !== 'trial') return false;

    const trialEnd = new Date(subscription.trialEndsAt);
    return new Date() > trialEnd;
  }, [subscription?.trialEndsAt, subscription?.status]);

  // Determină status-ul efectiv (ținând cont de trial expiration)
  const effectiveStatus = useMemo(() => {
    if (!subscription) return null;

    // Dacă e în trial dar trial-ul a expirat
    if (subscription.status === 'trial' && isTrialExpired) {
      return 'past_due';
    }

    return subscription.status;
  }, [subscription, isTrialExpired]);

  // Permission flags
  const permissions = useMemo(() => {
    const status = effectiveStatus;

    // Default: totul blocat
    const defaultPerms = {
      canEdit: false,
      canPublish: false,
      canExportPdf: false,
      canCreateAssociation: false,
      canViewData: false,
      isReadOnly: true,
      isBlocked: true
    };

    if (!status) return defaultPerms;

    switch (status) {
      case 'trial':
      case 'active':
        return {
          canEdit: true,
          canPublish: true,
          canExportPdf: true,
          canCreateAssociation: true,
          canViewData: true,
          isReadOnly: false,
          isBlocked: false
        };

      case 'past_due':
        // Read-only mode
        return {
          canEdit: false,
          canPublish: false,
          canExportPdf: false,
          canCreateAssociation: false,
          canViewData: true,
          isReadOnly: true,
          isBlocked: false
        };

      case 'suspended':
      case 'cancelled':
        // Blocat complet
        return {
          canEdit: false,
          canPublish: false,
          canExportPdf: false,
          canCreateAssociation: false,
          canViewData: false,
          isReadOnly: true,
          isBlocked: true
        };

      default:
        return defaultPerms;
    }
  }, [effectiveStatus]);

  // Verifică dacă are metodă de plată salvată
  const hasPaymentMethod = useMemo(() => {
    return !!(subscription?.payuTokenRef || subscription?.payuCustomerId);
  }, [subscription?.payuTokenRef, subscription?.payuCustomerId]);

  // Verifică dacă are billing contact completat
  const hasBillingContact = useMemo(() => {
    const contact = subscription?.billingContact;
    if (!contact) return false;
    return !!(contact.name && contact.email);
  }, [subscription?.billingContact]);

  // Update billing contact
  const updateBillingContact = async (billingContact) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'subscription.billingContact': billingContact,
        updatedAt: new Date().toISOString()
      });

      await logActivity(userId, 'BILLING_CONTACT_UPDATED', {
        contactType: billingContact.type
      });

      return true;
    } catch (err) {
      console.error('❌ Error updating billing contact:', err);
      throw err;
    }
  };

  // Update billing mode (per_user sau per_organization)
  const updateBillingMode = async (mode, organizationId = null) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!['per_user', 'per_organization'].includes(mode)) {
      throw new Error('Invalid billing mode');
    }

    if (mode === 'per_organization' && !organizationId) {
      throw new Error('Organization ID is required for per_organization mode');
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'subscription.billingMode': mode,
        'subscription.billingOrganizationId': mode === 'per_organization' ? organizationId : null,
        updatedAt: new Date().toISOString()
      });

      await logActivity(userId, 'BILLING_MODE_CHANGED', {
        newMode: mode,
        organizationId
      });

      return true;
    } catch (err) {
      console.error('❌ Error updating billing mode:', err);
      throw err;
    }
  };

  // Update custom pricing (doar pentru master portal)
  const updateCustomPricing = async (customPricing, setByUserId) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'subscription.customPricing': {
          ...customPricing,
          setBy: setByUserId,
          setAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      });

      await logActivity(setByUserId, 'CUSTOM_PRICING_SET', {
        targetUserId: userId,
        enabled: customPricing.enabled,
        pricePerApartment: customPricing.pricePerApartment,
        discountPercent: customPricing.discountPercent
      });

      return true;
    } catch (err) {
      console.error('❌ Error updating custom pricing:', err);
      throw err;
    }
  };

  // Extinde trial (doar pentru master portal)
  const extendTrial = async (additionalDays, extendedByUserId) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (additionalDays <= 0) {
      throw new Error('Additional days must be positive');
    }

    try {
      const currentTrialEnd = subscription?.trialEndsAt
        ? new Date(subscription.trialEndsAt)
        : new Date();

      // Dacă trial-ul a expirat, extinde de la acum
      const baseDate = currentTrialEnd > new Date() ? currentTrialEnd : new Date();
      const newTrialEnd = new Date(baseDate);
      newTrialEnd.setDate(newTrialEnd.getDate() + additionalDays);

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'subscription.status': 'trial',
        'subscription.trialEndsAt': newTrialEnd.toISOString(),
        'subscriptionStatus': 'trial', // Legacy field
        updatedAt: new Date().toISOString()
      });

      await logActivity(extendedByUserId, 'TRIAL_EXTENDED', {
        targetUserId: userId,
        additionalDays,
        newTrialEndsAt: newTrialEnd.toISOString()
      });

      return true;
    } catch (err) {
      console.error('❌ Error extending trial:', err);
      throw err;
    }
  };

  // Activează subscription (după plată reușită)
  const activateSubscription = async (periodStart, periodEnd) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'subscription.status': 'active',
        'subscription.currentPeriodStart': periodStart,
        'subscription.currentPeriodEnd': periodEnd,
        'subscriptionStatus': 'active', // Legacy field
        updatedAt: new Date().toISOString()
      });

      await logActivity(userId, 'SUBSCRIPTION_ACTIVATED', {
        periodStart,
        periodEnd
      });

      return true;
    } catch (err) {
      console.error('❌ Error activating subscription:', err);
      throw err;
    }
  };

  // Suspendă subscription (pentru admin portal sau auto după mai multe plăți eșuate)
  const suspendSubscription = async (suspendedByUserId, reason = null) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'subscription.status': 'suspended',
        'subscriptionStatus': 'suspended', // Legacy field
        updatedAt: new Date().toISOString()
      });

      await logActivity(suspendedByUserId, 'SUBSCRIPTION_SUSPENDED', {
        targetUserId: userId,
        reason
      });

      return true;
    } catch (err) {
      console.error('❌ Error suspending subscription:', err);
      throw err;
    }
  };

  // Calculează prețul efectiv per apartament
  const effectivePricePerApartment = useMemo(() => {
    if (!subscription?.customPricing?.enabled) {
      return 5.00; // Prețul default
    }
    return subscription.customPricing.pricePerApartment || 5.00;
  }, [subscription?.customPricing]);

  // Calculează discount-ul efectiv
  const effectiveDiscountPercent = useMemo(() => {
    if (!subscription?.customPricing?.enabled) {
      return 0;
    }
    return subscription.customPricing.discountPercent || 0;
  }, [subscription?.customPricing]);

  return {
    // State
    subscription,
    loading,
    error,

    // Status info
    status: effectiveStatus,
    isTrialExpired,
    trialDaysRemaining,

    // Permissions
    ...permissions,

    // Billing info
    hasPaymentMethod,
    hasBillingContact,
    billingMode: subscription?.billingMode || 'per_user',
    billingOrganizationId: subscription?.billingOrganizationId,
    billingContact: subscription?.billingContact,

    // Pricing
    effectivePricePerApartment,
    effectiveDiscountPercent,
    customPricing: subscription?.customPricing,

    // Actions
    loadSubscription,
    updateBillingContact,
    updateBillingMode,
    updateCustomPricing,
    extendTrial,
    activateSubscription,
    suspendSubscription,

    // Helper pentru a verifica dacă trebuie afișat banner
    shouldShowTrialBanner: effectiveStatus === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 14,
    shouldShowExpiredBanner: effectiveStatus === 'past_due',
    shouldShowSuspendedBanner: effectiveStatus === 'suspended'
  };
};
