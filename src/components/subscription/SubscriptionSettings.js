import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building2,
  Users,
  TrendingUp,
  RefreshCw,
  Shield,
  DollarSign
} from 'lucide-react';
import { useAuthEnhanced as useAuth } from '../../context/AuthContextEnhanced';
import { useSubscription } from '../../hooks/useSubscription';
import { useBillingCalculation } from '../../hooks/useBillingCalculation';
import { useBillingInvoices } from '../../hooks/useBillingInvoices';
import { usePayments } from '../../hooks/usePayments';
import BillingContactForm from './BillingContactForm';
import PaymentMethodForm from './PaymentMethodForm';
import InvoiceHistory from './InvoiceHistory';
import PaymentHistory from './PaymentHistory';

/**
 * ⚙️ SUBSCRIPTION SETTINGS
 *
 * Pagina principală de setări pentru abonament.
 * Utilizatorii pot:
 * - Vedea statusul curent al abonamentului
 * - Vedea prețul estimat pentru luna următoare
 * - Adăuga/modifica metoda de plată
 * - Vizualiza istoricul facturilor
 * - Edita datele de facturare
 * - Gestiona modul de facturare (individual vs organizație)
 */

/**
 * Formatează suma în RON
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0) + ' RON';
};

/**
 * Calculează zilele rămase
 */
const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
  const now = new Date();
  const diffTime = end - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Status Badge component
 */
const StatusBadge = ({ status, daysRemaining }) => {
  const configs = {
    trial: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: Clock,
      label: daysRemaining ? `Trial - ${daysRemaining} zile rămase` : 'Trial'
    },
    active: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: CheckCircle,
      label: 'Activ'
    },
    past_due: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      icon: AlertTriangle,
      label: 'Read-only'
    },
    suspended: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: XCircle,
      label: 'Suspendat'
    }
  };

  const config = configs[status] || configs.trial;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};

/**
 * Card pentru secțiune
 */
const SectionCard = ({ title, icon: Icon, children, action }) => (
  <div className="bg-white rounded-xl border shadow-sm">
    <div className="px-6 py-4 border-b flex items-center justify-between">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-500" />
        {title}
      </h3>
      {action}
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

/**
 * Tab navigation
 */
const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Prezentare generală', icon: TrendingUp },
    { id: 'payment', label: 'Metodă de plată', icon: CreditCard },
    { id: 'billing', label: 'Date facturare', icon: FileText },
    { id: 'invoices', label: 'Facturi', icon: FileText },
    { id: 'history', label: 'Istoric plăți', icon: Clock }
  ];

  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              text-sm font-medium transition-colors
              ${isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Overview Tab - Prezentare generală
 */
const OverviewTab = ({ subscription, billingStats, loading }) => {
  const daysRemaining = getDaysRemaining(subscription?.trialEndsAt);

  return (
    <div className="space-y-6">
      {/* Status card */}
      <SectionCard title="Status Abonament" icon={Shield}>
        <div className="flex items-center justify-between">
          <div>
            <StatusBadge
              status={subscription?.status || 'trial'}
              daysRemaining={daysRemaining}
            />
            {subscription?.status === 'trial' && daysRemaining && (
              <p className="text-sm text-gray-500 mt-2">
                Trial-ul expiră pe {subscription?.trialEndsAt?.toDate?.()?.toLocaleDateString('ro-RO') || 'N/A'}
              </p>
            )}
          </div>

          {subscription?.status === 'active' && subscription?.currentPeriodEnd && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Următoarea facturare</div>
              <div className="font-medium text-gray-900">
                {subscription.currentPeriodEnd.toDate?.()?.toLocaleDateString('ro-RO') || 'N/A'}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Billing summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {billingStats?.billableAssociations?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Asociații active</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {billingStats?.total || 0}
              </div>
              <div className="text-sm text-gray-500">Apartamente active</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(billingStats?.estimatedMonthlyAmount)}
              </div>
              <div className="text-sm text-gray-500">Preț estimat/lună</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing breakdown */}
      <SectionCard title="Detalii Preț" icon={DollarSign}>
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ) : (
          <div className="space-y-4">
            {billingStats?.billableAssociations?.length > 0 ? (
              <>
                <div className="space-y-2">
                  {billingStats.billableAssociations.map((assoc) => (
                    <div
                      key={assoc.associationId}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{assoc.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600">
                          {assoc.activeApartments} apt × 5 RON =
                        </span>
                        <span className="font-medium text-gray-900 ml-2">
                          {formatCurrency(assoc.activeApartments * 5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {subscription?.customPricing?.enabled && (
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-gray-600">
                      Discount ({subscription.customPricing.discountPercent}%)
                    </span>
                    <span className="text-green-600 font-medium">
                      -{formatCurrency(
                        (billingStats.total * 5) *
                        (subscription.customPricing.discountPercent / 100)
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-t-2 border-gray-200">
                  <span className="font-semibold text-gray-900">Total lunar</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(billingStats.estimatedMonthlyAmount)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Nu ai asociații active cu apartamente facturabile</p>
              </div>
            )}

            {billingStats?.suspendedAssociations?.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">
                    {billingStats.suspendedAssociations.length} asociații suspendate
                  </span>
                  {' - nu sunt incluse în facturare'}
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

/**
 * Componenta principală SubscriptionSettings
 */
const SubscriptionSettings = () => {
  const { currentUser } = useAuth();
  const { subscription, loading: subLoading, updateBillingContact } = useSubscription();
  const { calculateBilling, billingStats, loading: calcLoading } = useBillingCalculation();
  const { invoices, loadUserInvoices } = useBillingInvoices();
  const { payments, loadUserPayments } = usePayments();

  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load data on mount
  const loadData = useCallback(async () => {
    if (!currentUser?.uid) return;

    setIsRefreshing(true);
    try {
      // Get discount from subscription if available
      const discountPercent = subscription?.customPricing?.enabled
        ? subscription.customPricing.discountPercent
        : 0;

      await Promise.all([
        calculateBilling(currentUser.uid, 5.00, discountPercent),
        loadUserInvoices?.(currentUser.uid),
        loadUserPayments?.(currentUser.uid)
      ]);
    } catch (err) {
      console.error('Error loading subscription data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser?.uid, subscription?.customPricing, calculateBilling, loadUserInvoices, loadUserPayments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler pentru salvare date facturare
  const handleSaveBillingContact = async (billingContact) => {
    await updateBillingContact?.(billingContact);
  };

  const loading = subLoading || calcLoading;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Setări Abonament</h1>
          <p className="text-gray-500">Gestionează abonamentul și datele de facturare</p>
        </div>

        <button
          onClick={loadData}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg
            text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizează
        </button>
      </div>

      {/* Tab navigation */}
      <div className="mb-6">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            subscription={subscription}
            billingStats={billingStats}
            loading={loading}
          />
        )}

        {activeTab === 'payment' && (
          <SectionCard title="Metodă de Plată" icon={CreditCard}>
            <PaymentMethodForm
              currentMethod={subscription?.paymentMethod}
              onSave={() => loadData()}
            />
          </SectionCard>
        )}

        {activeTab === 'billing' && (
          <SectionCard title="Date Facturare" icon={FileText}>
            <BillingContactForm
              initialData={subscription?.billingContact}
              onSave={handleSaveBillingContact}
              loading={loading}
            />
          </SectionCard>
        )}

        {activeTab === 'invoices' && (
          <InvoiceHistory invoices={invoices} loading={loading} />
        )}

        {activeTab === 'history' && (
          <PaymentHistory payments={payments} loading={loading} />
        )}
      </div>

      {/* Help section */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <h3 className="font-medium text-gray-900 mb-2">Ai nevoie de ajutor?</h3>
        <p className="text-sm text-gray-600">
          Pentru întrebări legate de facturare sau abonament, ne poți contacta la{' '}
          <a
            href="mailto:support@blocapp.ro"
            className="text-blue-600 hover:text-blue-700"
          >
            support@blocapp.ro
          </a>
        </p>
      </div>
    </div>
  );
};

export default SubscriptionSettings;
