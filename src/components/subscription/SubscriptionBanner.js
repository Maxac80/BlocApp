import React from 'react';
import {
  Clock,
  AlertTriangle,
  CreditCard,
  XCircle,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';

/**
 * 🎯 SUBSCRIPTION BANNER
 *
 * Banner afișat în header când:
 * - Trial < 14 zile rămase
 * - Status = 'past_due' (trial expirat, fără plată)
 * - Status = 'suspended' (cont suspendat)
 *
 * Folosit în BlocApp.js pentru a notifica userii despre statusul subscription-ului.
 */

/**
 * Calculează zilele rămase până la o dată
 */
const getDaysRemaining = (endDate) => {
  if (!endDate) return null;

  const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
  const now = new Date();
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Banner pentru trial în desfășurare
 */
const TrialBanner = ({ daysRemaining, onUpgrade }) => {
  // Culori bazate pe urgență
  const isUrgent = daysRemaining <= 3;
  const isWarning = daysRemaining <= 7;

  const bgColor = isUrgent
    ? 'bg-red-50 border-red-200'
    : isWarning
      ? 'bg-amber-50 border-amber-200'
      : 'bg-blue-50 border-blue-200';

  const textColor = isUrgent
    ? 'text-red-700'
    : isWarning
      ? 'text-amber-700'
      : 'text-blue-700';

  const iconColor = isUrgent
    ? 'text-red-500'
    : isWarning
      ? 'text-amber-500'
      : 'text-blue-500';

  return (
    <div className={`${bgColor} border-b px-4 py-2.5 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <Clock className={`w-5 h-5 ${iconColor}`} />
        <span className={`text-sm font-medium ${textColor}`}>
          {daysRemaining <= 0 ? (
            'Perioada de trial a expirat'
          ) : daysRemaining === 1 ? (
            'Mai ai 1 zi din perioada de trial'
          ) : (
            `Mai ai ${daysRemaining} zile din perioada de trial`
          )}
        </span>
      </div>

      <button
        onClick={onUpgrade}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium
          transition-colors ${isUrgent
            ? 'bg-red-600 text-white hover:bg-red-700'
            : isWarning
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
      >
        <CreditCard className="w-4 h-4" />
        Adaugă metodă de plată
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Banner pentru past_due (trial expirat, fără plată)
 */
const PastDueBanner = ({ onUpgrade }) => (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-500" />
      <div>
        <span className="text-sm font-medium text-amber-700">
          Contul tău este în modul read-only
        </span>
        <span className="text-sm text-amber-600 ml-2">
          Adaugă o metodă de plată pentru a continua să editezi
        </span>
      </div>
    </div>

    <button
      onClick={onUpgrade}
      className="flex items-center gap-2 px-4 py-1.5 bg-amber-600 text-white rounded-lg
        text-sm font-medium hover:bg-amber-700 transition-colors"
    >
      <Zap className="w-4 h-4" />
      Activează acum
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
);

/**
 * Banner pentru suspended (cont suspendat complet)
 */
const SuspendedBanner = ({ onUpgrade }) => (
  <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <XCircle className="w-5 h-5 text-red-500" />
      <div>
        <span className="text-sm font-medium text-red-700">
          Contul tău este suspendat
        </span>
        <span className="text-sm text-red-600 ml-2">
          Efectuează o plată pentru a-l reactiva
        </span>
      </div>
    </div>

    <button
      onClick={onUpgrade}
      className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-lg
        text-sm font-medium hover:bg-red-700 transition-colors"
    >
      <CreditCard className="w-4 h-4" />
      Plătește acum
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
);

/**
 * Componenta principală SubscriptionBanner
 */
const SubscriptionBanner = ({ onNavigateToSubscription }) => {
  const { subscription, loading } = useSubscription();

  // Nu afișa nimic în timpul încărcării
  if (loading) return null;

  // Nu afișa pentru active (plătitori)
  if (!subscription || subscription.status === 'active') return null;

  const status = subscription.status;
  const trialEndsAt = subscription.trialEndsAt;
  const daysRemaining = getDaysRemaining(trialEndsAt);

  // Handler pentru navigare
  const handleUpgrade = () => {
    if (onNavigateToSubscription) {
      onNavigateToSubscription();
    }
  };

  // Trial în desfășurare - afișează doar dacă < 14 zile rămase
  if (status === 'trial') {
    if (daysRemaining === null || daysRemaining > 14) {
      return null; // Nu afișa banner dacă mai sunt multe zile
    }
    return <TrialBanner daysRemaining={daysRemaining} onUpgrade={handleUpgrade} />;
  }

  // Past due - trial expirat
  if (status === 'past_due') {
    return <PastDueBanner onUpgrade={handleUpgrade} />;
  }

  // Suspended
  if (status === 'suspended') {
    return <SuspendedBanner onUpgrade={handleUpgrade} />;
  }

  return null;
};

/**
 * Versiune compactă pentru sidebar sau alte locații
 */
export const SubscriptionBadge = ({ subscription }) => {
  if (!subscription) return null;

  const status = subscription.status;
  const daysRemaining = getDaysRemaining(subscription.trialEndsAt);

  const badges = {
    trial: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      label: daysRemaining ? `Trial: ${daysRemaining} zile` : 'Trial'
    },
    active: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: 'Activ'
    },
    past_due: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      label: 'Read-only'
    },
    suspended: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: 'Suspendat'
    }
  };

  const badge = badges[status] || badges.trial;

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
};

/**
 * Hook pentru a verifica dacă userul poate edita (nu e read-only)
 */
export const useCanEdit = () => {
  const { subscription, loading } = useSubscription();

  if (loading) return { canEdit: true, loading: true }; // Permitem temporar în timpul încărcării

  if (!subscription) return { canEdit: true, loading: false }; // Fără subscription = trial nou

  const status = subscription.status;
  const canEdit = status === 'trial' || status === 'active';

  return {
    canEdit,
    loading: false,
    status,
    reason: canEdit ? null : (
      status === 'past_due'
        ? 'Trial-ul a expirat. Adaugă o metodă de plată pentru a continua.'
        : 'Contul este suspendat. Efectuează o plată pentru a-l reactiva.'
    )
  };
};

export default SubscriptionBanner;
