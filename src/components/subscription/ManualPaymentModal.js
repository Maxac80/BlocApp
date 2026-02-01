import React, { useState } from 'react';
import {
  X,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle,
  AlertTriangle,
  User,
  Receipt,
  Hash
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { useBillingInvoices } from '../../hooks/useBillingInvoices';

/**
 * 💰 MANUAL PAYMENT MODAL
 *
 * Modal pentru înregistrarea plăților manuale de către admin.
 * Utilizări:
 * - Confirmare transfer bancar primit
 * - Înregistrare plată cash/altă metodă
 * - Corectare plăți
 *
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - userId: ID-ul userului pentru care se înregistrează plata
 * - invoiceId: (opțional) ID-ul facturii asociate
 * - invoice: (opțional) Obiectul factură complet
 * - adminUserId: ID-ul adminului care înregistrează plata
 * - onSuccess: Callback la succes
 */

/**
 * Formatează suma
 */
const formatCurrency = (amount, currency = 'RON') => {
  return `${Number(amount || 0).toFixed(2)} ${currency}`;
};

const ManualPaymentModal = ({
  isOpen,
  onClose,
  userId,
  invoiceId,
  invoice,
  adminUserId,
  onSuccess
}) => {
  const { recordManualPayment, confirmBankTransfer, loading: paymentLoading } = usePayments();
  const { markInvoiceAsPaid, loading: invoiceLoading } = useBillingInvoices();

  const [formData, setFormData] = useState({
    amount: invoice?.totalAmount || '',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    paymentType: 'bank_transfer' // 'bank_transfer' | 'cash' | 'other'
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const loading = paymentLoading || invoiceLoading;

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validări
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Suma trebuie să fie mai mare ca 0');
      return;
    }

    if (!formData.paymentDate) {
      setError('Data plății este obligatorie');
      return;
    }

    try {
      // 1. Înregistrează plata
      const paymentResult = await recordManualPayment({
        userId,
        invoiceId: invoiceId || invoice?.id,
        amount: Number(formData.amount),
        description: formData.description || `Plată manuală - ${formData.paymentType}`,
        paymentDate: formData.paymentDate,
        reference: formData.reference
      }, adminUserId);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Eroare la înregistrarea plății');
      }

      // 2. Dacă avem factură, o marcăm ca plătită
      if (invoiceId || invoice?.id) {
        await markInvoiceAsPaid(invoiceId || invoice?.id, {
          method: 'manual',
          payuOrderId: null,
          payuTransactionId: paymentResult.payment?.id
        });
      }

      setSuccess(true);

      // Callback după 1.5 secunde
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(paymentResult.payment);
        }
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err.message || 'Eroare la înregistrarea plății');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Înregistrare plată manuală
              </h2>
              <p className="text-sm text-gray-500">
                {invoice?.invoiceNumber ? `Factură: ${invoice.invoiceNumber}` : 'Plată fără factură'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Plată înregistrată!
            </h3>
            <p className="text-gray-500">
              Plata de {formatCurrency(formData.amount)} a fost înregistrată cu succes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Form content */}
            <div className="p-6 space-y-4">
              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* User info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">User ID</div>
                  <div className="text-sm font-mono text-gray-700">{userId?.slice(0, 20)}...</div>
                </div>
              </div>

              {/* Payment type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tip plată
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'bank_transfer', label: 'Transfer' },
                    { value: 'cash', label: 'Cash' },
                    { value: 'other', label: 'Altele' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, paymentType: type.value }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                        ${formData.paymentType === type.value
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Sumă (RON) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0.00"
                  />
                </div>
                {invoice?.totalAmount && Number(formData.amount) !== invoice.totalAmount && (
                  <p className="mt-1 text-xs text-amber-600">
                    Suma facturii: {formatCurrency(invoice.totalAmount)}
                  </p>
                )}
              </div>

              {/* Payment date */}
              <div>
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Data plății *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    id="paymentDate"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
                  Referință / Nr. tranzacție
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="reference"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: REF123456"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descriere / Note
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    placeholder="Note adiționale..."
                  />
                </div>
              </div>

              {/* Invoice link */}
              {invoice && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-700">
                      Factura va fi marcată ca plătită
                    </div>
                    <div className="text-xs text-blue-600">
                      {invoice.invoiceNumber} • {formatCurrency(invoice.totalAmount)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700
                  text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Se procesează...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Înregistrează plata
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/**
 * Modal pentru confirmarea unui transfer bancar existent (pending)
 */
export const ConfirmBankTransferModal = ({
  isOpen,
  onClose,
  payment,
  adminUserId,
  onSuccess
}) => {
  const { confirmBankTransfer, loading } = usePayments();
  const { markInvoiceAsPaid } = useBillingInvoices();

  const [confirmationDetails, setConfirmationDetails] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    if (!payment?.id) return;

    setError(null);

    try {
      // Confirmă transferul bancar
      await confirmBankTransfer(payment.id, confirmationDetails, adminUserId);

      // Marchează factura ca plătită dacă există
      if (payment.invoiceId) {
        await markInvoiceAsPaid(payment.invoiceId, {
          method: 'bank_transfer',
          payuTransactionId: payment.id
        });
      }

      setSuccess(true);

      setTimeout(() => {
        if (onSuccess) onSuccess(payment);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error confirming transfer:', err);
      setError(err.message || 'Eroare la confirmarea transferului');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            Confirmă transfer bancar
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              Transfer confirmat!
            </h3>
          </div>
        ) : (
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Payment details */}
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {formatCurrency(payment?.amount)}
              </div>
              <div className="text-sm text-gray-500">
                Referință: <span className="font-mono">{payment?.bankReference}</span>
              </div>
            </div>

            {/* Confirmation notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note confirmare (opțional)
              </label>
              <textarea
                value={confirmationDetails}
                onChange={(e) => setConfirmationDetails(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ex: Primit în contul BT"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Se confirmă...' : 'Confirmă'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualPaymentModal;
