import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  CreditCard,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Gift,
  Percent,
  Ban,
  Play,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Download,
  ExternalLink
} from 'lucide-react';
import { useAdminBilling } from '../../hooks/useAdminBilling';
import { downloadInvoicePdf } from '../../utils/invoicePdfGenerator';

/**
 * 👤 USER BILLING DETAILS
 *
 * Pagină de detalii complete pentru un user:
 * - Informații profil
 * - Status subscription
 * - Lista asociații
 * - Istoric facturi
 * - Istoric plăți
 * - Acțiuni admin
 */

// Configurare status-uri
const STATUS_CONFIG = {
  trial: { label: 'Trial', color: 'blue', icon: Clock },
  active: { label: 'Activ', color: 'green', icon: CheckCircle },
  past_due: { label: 'Expirat', color: 'amber', icon: AlertTriangle },
  suspended: { label: 'Suspendat', color: 'red', icon: XCircle },
  cancelled: { label: 'Anulat', color: 'gray', icon: XCircle }
};

/**
 * Formatează data
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Formatează suma
 */
const formatCurrency = (amount) => {
  return `${Number(amount || 0).toFixed(2)} RON`;
};

/**
 * Calculează zilele rămase
 */
const getDaysRemaining = (dateString) => {
  if (!dateString) return null;
  const end = new Date(dateString);
  const now = new Date();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

/**
 * Card pentru statistici
 */
const StatCard = ({ icon: Icon, iconColor, iconBg, label, value, subValue }) => (
  <div className="bg-white rounded-lg border p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
    {subValue && (
      <div className="text-xs text-gray-400 mt-2">{subValue}</div>
    )}
  </div>
);

/**
 * Componenta principală UserBillingDetails
 */
const UserBillingDetails = ({ userId, onBack, adminUserId }) => {
  const {
    getUserDetails,
    extendUserTrial,
    setCustomPricing,
    suspendUser,
    reactivateUser,
    loading
  } = useAdminBilling();

  const [userData, setUserData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [discountData, setDiscountData] = useState({
    pricePerApartment: 5,
    discountPercent: 0,
    discountReason: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Încarcă datele
  const loadData = useCallback(async () => {
    if (!userId) return;

    setIsRefreshing(true);
    try {
      const data = await getUserDetails(userId);
      setUserData(data);

      // Setează discount data din user
      if (data?.user?.subscription?.customPricing) {
        setDiscountData({
          pricePerApartment: data.user.subscription.customPricing.pricePerApartment || 5,
          discountPercent: data.user.subscription.customPricing.discountPercent || 0,
          discountReason: data.user.subscription.customPricing.discountReason || ''
        });
      }
    } catch (err) {
      console.error('Error loading user details:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, getUserDetails]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers pentru acțiuni
  const handleExtendTrial = async () => {
    setActionLoading(true);
    try {
      await extendUserTrial(userId, extendDays, adminUserId);
      setShowExtendModal(false);
      loadData();
    } catch (err) {
      alert('Eroare: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDiscount = async () => {
    setActionLoading(true);
    try {
      await setCustomPricing(userId, discountData, adminUserId);
      setShowDiscountModal(false);
      loadData();
    } catch (err) {
      alert('Eroare: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!window.confirm('Sigur vrei să suspendezi acest user?')) return;

    setActionLoading(true);
    try {
      await suspendUser(userId, 'Suspendat de admin', adminUserId);
      loadData();
    } catch (err) {
      alert('Eroare: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!window.confirm('Sigur vrei să reactivezi acest user?')) return;

    setActionLoading(true);
    try {
      await reactivateUser(userId, adminUserId);
      loadData();
    } catch (err) {
      alert('Eroare: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!userData && loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-6 text-center text-gray-500">
        User not found
      </div>
    );
  }

  const { user, associations, invoices, payments, stats } = userData;
  const subscription = user.subscription || {};
  const status = subscription.status || user.subscriptionStatus || 'trial';
  const trialDays = getDaysRemaining(subscription.trialEndsAt);
  const effectiveStatus = status === 'trial' && trialDays !== null && trialDays <= 0
    ? 'past_due'
    : status;
  const statusConfig = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.trial;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.profile?.personalInfo?.firstName} {user.profile?.personalInfo?.lastName}
            </h1>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status card */}
      <div className={`rounded-xl p-6 mb-6 bg-${statusConfig.color}-50 border border-${statusConfig.color}-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl bg-${statusConfig.color}-100 flex items-center justify-center`}>
              <StatusIcon className={`w-7 h-7 text-${statusConfig.color}-600`} />
            </div>
            <div>
              <div className={`text-lg font-bold text-${statusConfig.color}-700`}>
                Status: {statusConfig.label}
              </div>
              {status === 'trial' && trialDays !== null && (
                <div className={`text-sm text-${statusConfig.color}-600`}>
                  {trialDays > 0
                    ? `${trialDays} zile rămase din trial`
                    : 'Trial expirat'
                  }
                </div>
              )}
              {subscription.trialEndsAt && (
                <div className="text-sm text-gray-500 mt-1">
                  Trial până la: {formatDate(subscription.trialEndsAt)}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExtendModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg
                text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Gift className="w-4 h-4" />
              Extinde Trial
            </button>
            <button
              onClick={() => setShowDiscountModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg
                text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Percent className="w-4 h-4" />
              Discount
            </button>
            {effectiveStatus === 'suspended' ? (
              <button
                onClick={handleReactivate}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                  hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Reactivează
              </button>
            ) : (
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg
                  hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                Suspendă
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Building2}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          label="Asociații"
          value={stats.totalAssociations}
          subValue={`${stats.activeAssociations} active`}
        />
        <StatCard
          icon={User}
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
          label="Apartamente active"
          value={stats.totalApartments}
        />
        <StatCard
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          label="MRR User"
          value={formatCurrency(stats.userMrr)}
        />
        <StatCard
          icon={TrendingUp}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
          label="Preț/apartament"
          value={formatCurrency(subscription.customPricing?.pricePerApartment || 5)}
          subValue={subscription.customPricing?.discountPercent > 0
            ? `Discount ${subscription.customPricing.discountPercent}%`
            : 'Standard'
          }
        />
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          {[
            { id: 'overview', label: 'Asociații', icon: Building2 },
            { id: 'invoices', label: 'Facturi', icon: FileText },
            { id: 'payments', label: 'Plăți', icon: CreditCard }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asociație</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creat</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {associations.map(assoc => (
                <tr key={assoc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{assoc.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${assoc.billingStatus === 'suspended'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {assoc.billingStatus === 'suspended' ? 'Suspendată' : 'Activă'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(assoc.createdAt)}</td>
                </tr>
              ))}
              {associations.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Nicio asociație
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factură</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sumă</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dată</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-gray-900">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${inv.status === 'paid' ? 'bg-green-50 text-green-700' :
                        inv.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-50 text-gray-500'
                      }`}
                    >
                      {inv.status === 'paid' ? 'Plătită' :
                        inv.status === 'pending' ? 'Pending' :
                        inv.status
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(inv.issuedAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => downloadInvoicePdf(inv)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Descarcă PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nicio factură
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metodă</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sumă</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dată</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map(pay => (
                <tr key={pay.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="capitalize">{pay.method?.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${pay.status === 'completed' ? 'bg-green-50 text-green-700' :
                        pay.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        pay.status === 'failed' ? 'bg-red-50 text-red-700' :
                        'bg-gray-50 text-gray-500'
                      }`}
                    >
                      {pay.status === 'completed' ? 'Finalizată' :
                        pay.status === 'pending' ? 'Pending' :
                        pay.status === 'failed' ? 'Eșuată' :
                        pay.status
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(pay.amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(pay.completedAt || pay.createdAt)}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Nicio plată
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Extend Trial Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowExtendModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-blue-500" />
              Extinde Trial
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Număr de zile
              </label>
              <input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExtendModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleExtendTrial}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Se procesează...' : 'Extinde'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDiscountModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-green-500" />
              Setează Pricing Custom
            </h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preț per apartament (RON)
                </label>
                <input
                  type="number"
                  value={discountData.pricePerApartment}
                  onChange={(e) => setDiscountData(d => ({ ...d, pricePerApartment: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount (%)
                </label>
                <input
                  type="number"
                  value={discountData.discountPercent}
                  onChange={(e) => setDiscountData(d => ({ ...d, discountPercent: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motiv (opțional)
                </label>
                <input
                  type="text"
                  value={discountData.discountReason}
                  onChange={(e) => setDiscountData(d => ({ ...d, discountReason: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Contract negociat manual"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleSetDiscount}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Se procesează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBillingDetails;
