import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Building2,
  Mail,
  Hash,
  Calendar,
  DollarSign,
  AlertTriangle,
  Filter,
  Search
} from 'lucide-react';
import { useAdminBilling } from '../../hooks/useAdminBilling';
import { usePayments } from '../../hooks/usePayments';
import { useBillingInvoices } from '../../hooks/useBillingInvoices';

/**
 * 💳 PENDING PAYMENTS COMPONENT
 *
 * Gestionare plăți pending pentru admin:
 * - Lista transferuri bancare de confirmat
 * - Confirmare/Respingere plăți
 * - Legături cu facturi asociate
 */

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
const formatCurrency = (amount) => {
  return `${Number(amount || 0).toFixed(2)} RON`;
};

/**
 * Calculează cât timp a trecut
 */
const getTimeAgo = (dateString) => {
  if (!dateString) return '-';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `acum ${diffDays} ${diffDays === 1 ? 'zi' : 'zile'}`;
  if (diffHours > 0) return `acum ${diffHours} ${diffHours === 1 ? 'oră' : 'ore'}`;
  if (diffMinutes > 0) return `acum ${diffMinutes} ${diffMinutes === 1 ? 'minut' : 'minute'}`;
  return 'chiar acum';
};

/**
 * Card pentru o plată pending
 */
const PendingPaymentCard = ({ payment, onConfirm, onReject, loading }) => {
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const isOld = () => {
    if (!payment.createdAt) return false;
    const created = new Date(payment.createdAt);
    const now = new Date();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);
    return diffDays > 3;
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden
      ${isOld() ? 'border-amber-300' : ''}`}
    >
      {/* Warning pentru plăți vechi */}
      {isOld() && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-700">
            Plată veche de peste 3 zile - verifică urgent!
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(payment.amount)}
              </div>
              <div className="text-sm text-gray-500">
                {getTimeAgo(payment.createdAt)}
              </div>
            </div>
          </div>

          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
            Așteaptă confirmare
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{payment.userEmail || 'Email necunoscut'}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="font-mono text-gray-600">{payment.bankReference || '-'}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{formatDate(payment.createdAt)}</span>
          </div>

          {payment.invoiceId && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Factură asociată</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5
              bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg
              transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            Confirmă plata
          </button>
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={loading}
            className="px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50
              font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Confirmă plata
            </h3>
            <p className="text-gray-600 mb-4">
              Confirmi că ai primit transferul de <strong>{formatCurrency(payment.amount)}</strong> de la{' '}
              <strong>{payment.userEmail}</strong>?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note confirmare (opțional)
              </label>
              <textarea
                value={confirmationNotes}
                onChange={(e) => setConfirmationNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                rows={2}
                placeholder="Ex: Primit în cont BT la 15:30"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={() => {
                  onConfirm(payment, confirmationNotes);
                  setShowConfirmDialog(false);
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Se procesează...' : 'Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Respinge plata
            </h3>
            <p className="text-gray-600 mb-4">
              Sigur vrei să respingi această plată? Motivul va fi înregistrat.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motiv respingere
              </label>
              <textarea
                value={confirmationNotes}
                onChange={(e) => setConfirmationNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                rows={2}
                placeholder="Ex: Transfer neidentificat, sumă incorectă"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={() => {
                  onReject(payment, confirmationNotes);
                  setShowRejectDialog(false);
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Se procesează...' : 'Respinge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Componenta principală PendingPayments
 */
const PendingPayments = ({ adminUserId }) => {
  const { getPendingBankTransfers, loading: adminLoading } = useAdminBilling();
  const { confirmBankTransfer, failPayment, loading: paymentLoading } = usePayments();
  const { markInvoiceAsPaid } = useBillingInvoices();

  const [payments, setPayments] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loading = adminLoading || paymentLoading || actionLoading;

  // Încarcă plățile
  const loadPayments = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await getPendingBankTransfers();
      setPayments(data);
    } catch (err) {
      console.error('Error loading pending payments:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [getPendingBankTransfers]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Handler pentru confirmare
  const handleConfirm = async (payment, notes) => {
    setActionLoading(true);
    try {
      // Confirmă plata
      await confirmBankTransfer(payment.id, notes, adminUserId);

      // Marchează factura ca plătită dacă există
      if (payment.invoiceId) {
        await markInvoiceAsPaid(payment.invoiceId, {
          method: 'bank_transfer',
          payuTransactionId: payment.id
        });
      }

      // Reîncarcă lista
      loadPayments();
    } catch (err) {
      alert('Eroare: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler pentru respingere
  const handleReject = async (payment, reason) => {
    setActionLoading(true);
    try {
      await failPayment(payment.id, reason || 'Respins de admin');
      loadPayments();
    } catch (err) {
      alert('Eroare: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrare
  const filteredPayments = searchQuery
    ? payments.filter(p =>
        p.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bankReference?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : payments;

  // Statistici
  const totalPending = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const oldPayments = payments.filter(p => {
    if (!p.createdAt) return false;
    const diffDays = (new Date() - new Date(p.createdAt)) / (1000 * 60 * 60 * 24);
    return diffDays > 3;
  }).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            Plăți de confirmat
          </h1>
          <p className="text-gray-500">
            Transferuri bancare în așteptarea confirmării
          </p>
        </div>
        <button
          onClick={loadPayments}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg
            text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizează
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-3xl font-bold text-amber-600">{payments.length}</div>
          <div className="text-sm text-gray-500">Plăți pending</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-3xl font-bold text-green-600">{formatCurrency(totalPending)}</div>
          <div className="text-sm text-gray-500">Total de confirmat</div>
        </div>
        <div className={`rounded-xl border p-4 ${oldPayments > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
          <div className={`text-3xl font-bold ${oldPayments > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {oldPayments}
          </div>
          <div className="text-sm text-gray-500">Vechi (&gt;3 zile)</div>
        </div>
      </div>

      {/* Search */}
      {payments.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută după email sau referință..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
          />
        </div>
      )}

      {/* Payments list */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nicio plată de confirmat
          </h3>
          <p className="text-gray-500">
            Toate transferurile bancare au fost procesate.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <PendingPaymentCard
              key={payment.id}
              payment={payment}
              onConfirm={handleConfirm}
              onReject={handleReject}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingPayments;
