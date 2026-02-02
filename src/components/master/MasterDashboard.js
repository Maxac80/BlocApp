import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Users,
  Building2,
  CreditCard,
  Clock,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { useAdminBilling } from '../../hooks/useAdminBilling';

/**
 * 📊 MASTER DASHBOARD
 *
 * Dashboard principal pentru owner BlocApp cu:
 * - KPIs principale (MRR, useri, asociații)
 * - Grafic evoluție MRR
 * - Plăți pending pentru confirmare
 * - Activitate recentă
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
 * Card pentru KPI
 */
const KpiCard = ({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  subValue,
  trend,
  trendLabel
}) => (
  <div className="bg-white rounded-xl border shadow-sm p-6">
    <div className="flex items-start justify-between">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-sm font-medium
          ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          {trend >= 0 ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="mt-4">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {subValue && (
        <div className="text-xs text-gray-400 mt-1">{subValue}</div>
      )}
    </div>
  </div>
);

/**
 * Card pentru status useri
 */
const UserStatusCard = ({ stats }) => {
  const statuses = [
    { label: 'Activi', count: stats?.activeUsers || 0, color: 'bg-green-500' },
    { label: 'Trial', count: stats?.trialUsers || 0, color: 'bg-blue-500' },
    { label: 'Expirați', count: stats?.pastDueUsers || 0, color: 'bg-amber-500' },
    { label: 'Suspendați', count: stats?.suspendedUsers || 0, color: 'bg-red-500' }
  ];

  const total = stats?.totalUsers || 0;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-500" />
        Distribuție Useri
      </h3>

      {/* Progress bar */}
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
        {statuses.map((status, idx) => (
          <div
            key={idx}
            className={`${status.color} transition-all duration-500`}
            style={{ width: total > 0 ? `${(status.count / total) * 100}%` : '0%' }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {statuses.map((status, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${status.color}`} />
            <span className="text-sm text-gray-600">{status.label}</span>
            <span className="text-sm font-semibold text-gray-900 ml-auto">{status.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Mini grafic pentru MRR
 */
const MrrChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-400">
        Nu există date pentru grafic
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="h-40 flex items-end gap-1">
      {data.map((item, idx) => {
        const height = (item.amount / maxValue) * 100;
        const monthLabel = item.month.split('-')[1];

        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${item.month}: ${formatCurrency(item.amount)}`}
            />
            <span className="text-xs text-gray-400">{monthLabel}</span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Card pentru plăți pending
 */
const PendingPaymentsCard = ({ payments = [], onViewAll }) => (
  <div className="bg-white rounded-xl border shadow-sm">
    <div className="p-4 border-b flex items-center justify-between">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Clock className="w-5 h-5 text-amber-500" />
        Plăți de confirmat
      </h3>
      {payments.length > 0 && (
        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
          {payments.length}
        </span>
      )}
    </div>

    <div className="p-4">
      {payments.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          <CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" />
          Nicio plată de confirmat
        </div>
      ) : (
        <div className="space-y-3">
          {payments.slice(0, 5).map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="font-medium text-gray-900">
                  {formatCurrency(payment.amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {payment.userEmail || payment.userId?.slice(0, 10)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-gray-500">
                  {payment.bankReference}
                </div>
              </div>
            </div>
          ))}

          {payments.length > 5 && (
            <button
              onClick={onViewAll}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2"
            >
              Vezi toate ({payments.length})
            </button>
          )}
        </div>
      )}
    </div>
  </div>
);

/**
 * Card pentru alerte
 */
const AlertsCard = ({ stats }) => {
  const alerts = [];

  if (stats?.pastDueUsers > 0) {
    alerts.push({
      type: 'warning',
      icon: AlertTriangle,
      message: `${stats.pastDueUsers} useri cu trial expirat`,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    });
  }

  if (stats?.suspendedUsers > 0) {
    alerts.push({
      type: 'error',
      icon: XCircle,
      message: `${stats.suspendedUsers} useri suspendați`,
      color: 'text-red-600',
      bg: 'bg-red-50'
    });
  }

  if (stats?.pendingPayments > 0) {
    alerts.push({
      type: 'info',
      icon: Clock,
      message: `${stats.pendingPayments} plăți de confirmat (${formatCurrency(stats.pendingPaymentsAmount)})`,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      icon: CheckCircle,
      message: 'Totul este în ordine!',
      color: 'text-green-600',
      bg: 'bg-green-50'
    });
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-500" />
        Alerte & Notificări
      </h3>

      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 p-3 rounded-lg ${alert.bg}`}
          >
            <alert.icon className={`w-5 h-5 ${alert.color}`} />
            <span className={`text-sm font-medium ${alert.color}`}>
              {alert.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Componenta principală MasterDashboard
 */
const MasterDashboard = ({ onNavigate }) => {
  const {
    getDashboardStats,
    getMrrHistory,
    getPendingBankTransfers
  } = useAdminBilling();

  const [stats, setStats] = useState(null);
  const [mrrHistory, setMrrHistory] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Încarcă datele
  const loadData = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const [statsData, mrrData, paymentsData] = await Promise.all([
        getDashboardStats(),
        getMrrHistory(12),
        getPendingBankTransfers()
      ]);

      setStats(statsData);
      setMrrHistory(mrrData);
      setPendingPayments(paymentsData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [getDashboardStats, getMrrHistory, getPendingBankTransfers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Dashboard</h1>
          <p className="text-gray-500">Bine ai venit în panoul de administrare BlocApp</p>
        </div>
        <button
          onClick={loadData}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg
            text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizează
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          label="MRR (30 zile)"
          value={formatCurrency(stats?.mrr)}
          subValue={`Total încasat: ${formatCurrency(stats?.totalRevenue)}`}
        />
        <KpiCard
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          label="Total Useri"
          value={stats?.totalUsers || 0}
          subValue={`${stats?.newUsersThisMonth || 0} noi luna asta`}
        />
        <KpiCard
          icon={Building2}
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
          label="Asociații Active"
          value={stats?.activeAssociations || 0}
          subValue={`${stats?.suspendedAssociations || 0} suspendate`}
        />
        <KpiCard
          icon={CreditCard}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
          label="Pending Revenue"
          value={formatCurrency(stats?.pendingRevenue)}
          subValue={`${stats?.pendingPayments || 0} plăți de confirmat`}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* MRR Chart */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Evoluție MRR
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Ultimele 12 luni
              </div>
            </div>
            <MrrChart data={mrrHistory} />
          </div>

          {/* User Status */}
          <UserStatusCard stats={stats} />
        </div>

        {/* Right column - Alerts & Actions */}
        <div className="space-y-6">
          {/* Alerts */}
          <AlertsCard stats={stats} />

          {/* Pending Payments */}
          <PendingPaymentsCard
            payments={pendingPayments}
            onViewAll={() => onNavigate?.('payments')}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate?.('users')}
          className="flex items-center gap-3 p-4 bg-white border rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">Gestionare Useri</div>
            <div className="text-sm text-gray-500">Extend trial, discount, suspend</div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400 ml-auto" />
        </button>

        <button
          onClick={() => onNavigate?.('invoices')}
          className="flex items-center gap-3 p-4 bg-white border rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">Facturi</div>
            <div className="text-sm text-gray-500">Vezi și gestionează facturi</div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400 ml-auto" />
        </button>

        <button
          onClick={() => onNavigate?.('payments')}
          className="flex items-center gap-3 p-4 bg-white border rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">Plăți</div>
            <div className="text-sm text-gray-500">Confirmă transferuri bancare</div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400 ml-auto" />
        </button>
      </div>
    </div>
  );
};

export default MasterDashboard;
