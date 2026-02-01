/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  ArrowUpRight,
  Receipt,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';

/**
 * 📜 PAYMENT HISTORY COMPONENT
 *
 * Afișează istoricul plăților pentru un user:
 * - Lista plăților cu status vizual
 * - Filtrare după status/metodă
 * - Detalii expandabile
 * - Statistici plăți
 */

// Configurare status-uri
const STATUS_CONFIG = {
  pending: {
    label: 'În așteptare',
    icon: Clock,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500'
  },
  processing: {
    label: 'Se procesează',
    icon: RefreshCw,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500'
  },
  completed: {
    label: 'Finalizată',
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500'
  },
  failed: {
    label: 'Eșuată',
    icon: XCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500'
  },
  refunded: {
    label: 'Returnată',
    icon: RotateCcw,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-500'
  },
  cancelled: {
    label: 'Anulată',
    icon: XCircle,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-400'
  }
};

// Configurare metode de plată
const METHOD_CONFIG = {
  card: {
    label: 'Card',
    icon: CreditCard,
    color: 'text-blue-600'
  },
  bank_transfer: {
    label: 'Transfer',
    icon: Building2,
    color: 'text-green-600'
  },
  manual: {
    label: 'Manual',
    icon: User,
    color: 'text-purple-600'
  }
};

/**
 * Formatează data
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatează suma
 */
const formatCurrency = (amount, currency = 'RON') => {
  return `${Number(amount || 0).toFixed(2)} ${currency}`;
};

/**
 * Badge pentru status
 */
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      ${config.bgColor} ${config.textColor} ${config.borderColor} border`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      {config.label}
    </span>
  );
};

/**
 * Icon pentru metoda de plată
 */
const MethodIcon = ({ method }) => {
  const config = METHOD_CONFIG[method] || METHOD_CONFIG.manual;
  const Icon = config.icon;

  return (
    <div className={`w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center ${config.color}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
};

/**
 * Rând pentru o plată
 */
const PaymentRow = ({ payment, isExpanded, onToggle }) => {
  const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
  const methodConfig = METHOD_CONFIG[payment.method] || METHOD_CONFIG.manual;

  return (
    <div className={`border rounded-lg transition-all duration-200 ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Main row */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50
          ${isExpanded ? 'border-b' : ''}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <MethodIcon method={payment.method} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {formatCurrency(payment.amount, payment.currency)}
              </span>
              {payment.refundedAmount > 0 && payment.status !== 'refunded' && (
                <span className="text-xs text-purple-600">
                  (-{formatCurrency(payment.refundedAmount)})
                </span>
              )}
              <StatusBadge status={payment.status} />
            </div>
            <div className="text-sm text-gray-500 mt-0.5">
              {methodConfig.label} • {formatDate(payment.completedAt || payment.createdAt)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {payment.invoiceId && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              <Receipt className="w-3 h-3 inline mr-1" />
              Factură
            </span>
          )}
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {/* ID Plată */}
            <div>
              <div className="text-gray-500">ID Plată</div>
              <div className="font-mono text-gray-900 text-xs mt-1">
                {payment.id?.slice(0, 20)}...
              </div>
            </div>

            {/* Metodă */}
            <div>
              <div className="text-gray-500">Metodă</div>
              <div className="text-gray-900 mt-1 flex items-center gap-1">
                {methodConfig.label}
                {payment.cardLast4 && (
                  <span className="text-gray-500">
                    •••• {payment.cardLast4}
                  </span>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <div className="text-gray-500">Status</div>
              <div className="mt-1">
                <StatusBadge status={payment.status} />
              </div>
            </div>

            {/* Data inițiere */}
            <div>
              <div className="text-gray-500">Inițiat la</div>
              <div className="text-gray-900 mt-1">{formatDate(payment.initiatedAt)}</div>
            </div>

            {/* Data finalizare */}
            {payment.completedAt && (
              <div>
                <div className="text-gray-500">Finalizat la</div>
                <div className="text-gray-900 mt-1">{formatDate(payment.completedAt)}</div>
              </div>
            )}

            {/* Referință bancară */}
            {payment.bankReference && (
              <div>
                <div className="text-gray-500">Referință</div>
                <div className="font-mono text-gray-900 mt-1">{payment.bankReference}</div>
              </div>
            )}

            {/* PayU Transaction ID */}
            {payment.payuTransactionId && (
              <div>
                <div className="text-gray-500">PayU ID</div>
                <div className="font-mono text-gray-900 text-xs mt-1">{payment.payuTransactionId}</div>
              </div>
            )}

            {/* Refund info */}
            {payment.refundedAmount > 0 && (
              <div className="col-span-2">
                <div className="text-gray-500">Returnat</div>
                <div className="text-purple-600 mt-1">
                  {formatCurrency(payment.refundedAmount)} {payment.refundReason && `- ${payment.refundReason}`}
                </div>
              </div>
            )}

            {/* Failure reason */}
            {payment.status === 'failed' && payment.failureReason && (
              <div className="col-span-3">
                <div className="text-gray-500">Motiv eșec</div>
                <div className="text-red-600 mt-1">{payment.failureReason}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Componenta principală PaymentHistory
 */
const PaymentHistory = ({ userId, className = '' }) => {
  const { loadUserPayments, getPaymentStats, loading, error } = usePayments();

  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Încarcă plățile
  const loadPayments = useCallback(async () => {
    if (!userId) return;

    setIsRefreshing(true);
    try {
      const options = {};
      if (filterStatus !== 'all') options.status = filterStatus;

      const [paymentsList, paymentStats] = await Promise.all([
        loadUserPayments(userId, options),
        getPaymentStats(userId)
      ]);

      // Filtrare suplimentară pentru metodă (client-side)
      let filtered = paymentsList;
      if (filterMethod !== 'all') {
        filtered = paymentsList.filter(p => p.method === filterMethod);
      }

      setPayments(filtered);
      setStats(paymentStats);
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, filterStatus, filterMethod, loadUserPayments, getPaymentStats]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Toggle expand
  const handleToggle = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Empty state
  if (!loading && payments.length === 0 && filterStatus === 'all' && filterMethod === 'all') {
    return (
      <div className={`bg-white rounded-xl shadow-sm border p-8 text-center ${className}`}>
        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nu există plăți
        </h3>
        <p className="text-gray-500">
          Istoricul plăților va apărea aici după prima plată.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${className}`}>
      {/* Header cu statistici */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            Istoric plăți
          </h3>
          <button
            onClick={loadPayments}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Statistici */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total plăți</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
              <div className="text-xs text-gray-500">Total plătit</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-xs text-gray-500">În așteptare</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalRefunded)}</div>
              <div className="text-xs text-gray-500">Returnat</div>
            </div>
          </div>
        )}

        {/* Filtre */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toate statusurile</option>
              <option value="completed">Finalizate</option>
              <option value="pending">În așteptare</option>
              <option value="failed">Eșuate</option>
              <option value="refunded">Returnate</option>
            </select>
          </div>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toate metodele</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Transfer bancar</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {/* Lista plăți */}
      <div className="p-4 space-y-3">
        {loading && !isRefreshing ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-gray-300 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Se încarcă plățile...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>Eroare la încărcare: {error}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nu există plăți care să corespundă filtrelor selectate.</p>
          </div>
        ) : (
          payments.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              isExpanded={expandedId === payment.id}
              onToggle={() => handleToggle(payment.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Card compact pentru ultima plată (pentru dashboard)
 */
export const LastPaymentCard = ({ payment, className = '' }) => {
  if (!payment) {
    return (
      <div className={`bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center ${className}`}>
        <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Nicio plată</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
  const methodConfig = METHOD_CONFIG[payment.method] || METHOD_CONFIG.manual;
  const MethodIcon = methodConfig.icon;

  return (
    <div className={`bg-white border rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${statusConfig.bgColor} flex items-center justify-center`}>
            <MethodIcon className={`w-5 h-5 ${statusConfig.iconColor}`} />
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {formatCurrency(payment.amount)}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(payment.completedAt || payment.createdAt)}
            </div>
          </div>
        </div>
        <StatusBadge status={payment.status} />
      </div>
    </div>
  );
};

export default PaymentHistory;
