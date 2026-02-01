import React, { useState } from 'react';
import {
  CreditCard,
  Building2,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Shield,
  Info
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import payuClient from '../../utils/payuClient';

/**
 * 💳 PAYMENT METHOD FORM
 *
 * Formular pentru selectarea metodei de plată și procesare:
 * - Card (prin PayU) - când va fi configurat
 * - Transfer bancar - funcțional acum
 *
 * Props:
 * - invoice: Factura de plătit
 * - userId: ID-ul userului
 * - onSuccess: Callback la succes
 * - onCancel: Callback la anulare
 */

// Informații bancare BlocApp (de actualizat cu datele reale)
const BANK_INFO = {
  beneficiary: 'SC BlocApp Solutions SRL',
  bank: 'Banca Transilvania',
  iban: 'RO12BTRL0000000000000000', // De actualizat
  swift: 'BTRLRO22'
};

/**
 * Formatează suma în RON
 */
const formatCurrency = (amount, currency = 'RON') => {
  return `${Number(amount || 0).toFixed(2)} ${currency}`;
};

/**
 * Card pentru selectare metodă de plată
 */
const PaymentMethodCard = ({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
  disabled = false,
  badge = null
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all
      ${selected
        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
      ${selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
    >
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${selected ? 'text-blue-900' : 'text-gray-900'}`}>
          {title}
        </span>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
            {badge.text}
          </span>
        )}
      </div>
      <p className={`text-sm mt-1 ${selected ? 'text-blue-700' : 'text-gray-500'}`}>
        {description}
      </p>
    </div>
    {selected && (
      <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
    )}
  </button>
);

/**
 * Componenta principală PaymentMethodForm
 */
const PaymentMethodForm = ({
  invoice,
  userId,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const { initiateCardPayment, initiateBankTransfer, loading } = usePayments();

  const [selectedMethod, setSelectedMethod] = useState('bank_transfer');
  const [step, setStep] = useState('select'); // 'select' | 'bank_details' | 'processing' | 'success'
  const [paymentResult, setPaymentResult] = useState(null);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);

  // Verifică dacă PayU este configurat
  const payuStatus = payuClient.getConfigStatus();

  // Handler pentru copiere în clipboard
  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handler pentru procesare plată
  const handleProcessPayment = async () => {
    setError(null);
    setStep('processing');

    try {
      if (selectedMethod === 'card') {
        // Plată cu cardul (PayU)
        const result = await initiateCardPayment({
          userId,
          invoiceId: invoice?.id,
          amount: invoice?.totalAmount,
          description: `Plată factură ${invoice?.invoiceNumber}`,
          metadata: {
            invoiceNumber: invoice?.invoiceNumber
          }
        });

        if (result.success) {
          if (result.requiresPayuIntegration && !payuStatus.configured) {
            // PayU nu e configurat
            setError('Plata cu cardul nu este disponibilă momentan. Te rugăm să folosești transferul bancar.');
            setStep('select');
          } else if (result.payuRedirectUrl) {
            // Redirect la PayU
            window.location.href = result.payuRedirectUrl;
          } else {
            setPaymentResult(result);
            setStep('success');
          }
        } else {
          setError(result.error || 'Eroare la procesarea plății');
          setStep('select');
        }
      } else {
        // Transfer bancar
        const result = await initiateBankTransfer({
          userId,
          invoiceId: invoice?.id,
          amount: invoice?.totalAmount,
          description: `Plată factură ${invoice?.invoiceNumber}`,
          metadata: {
            invoiceNumber: invoice?.invoiceNumber
          }
        });

        if (result.success) {
          setPaymentResult(result);
          setStep('bank_details');
        } else {
          setError(result.error || 'Eroare la inițierea transferului');
          setStep('select');
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Eroare neașteptată');
      setStep('select');
    }
  };

  // Handler pentru confirmare transfer bancar inițiat
  const handleBankTransferComplete = () => {
    if (onSuccess) {
      onSuccess(paymentResult);
    }
  };

  // ================================
  // STEP: SELECT METHOD
  // ================================
  if (step === 'select') {
    return (
      <div className={`bg-white rounded-2xl shadow-lg border overflow-hidden ${className}`}>
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-900">
            Alege metoda de plată
          </h2>
          <p className="text-gray-600 mt-1">
            Total de plată: <span className="font-bold text-blue-600">{formatCurrency(invoice?.totalAmount)}</span>
          </p>
          {invoice?.invoiceNumber && (
            <p className="text-sm text-gray-500 mt-1">
              Factură: {invoice.invoiceNumber}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Payment methods */}
        <div className="p-6 space-y-4">
          {/* Card payment */}
          <PaymentMethodCard
            icon={CreditCard}
            title="Card bancar"
            description={payuStatus.configured
              ? "Plată instant cu Visa, Mastercard sau Maestro"
              : "Momentan indisponibil - în curs de configurare"
            }
            selected={selectedMethod === 'card'}
            onClick={() => setSelectedMethod('card')}
            disabled={!payuStatus.configured}
            badge={!payuStatus.configured
              ? { text: 'În curând', className: 'bg-amber-100 text-amber-700' }
              : { text: 'Instant', className: 'bg-green-100 text-green-700' }
            }
          />

          {/* Bank transfer */}
          <PaymentMethodCard
            icon={Building2}
            title="Transfer bancar"
            description="Transferă suma în contul nostru bancar. Plata va fi confirmată în 1-2 zile lucrătoare."
            selected={selectedMethod === 'bank_transfer'}
            onClick={() => setSelectedMethod('bank_transfer')}
            badge={{ text: 'Disponibil', className: 'bg-blue-100 text-blue-700' }}
          />
        </div>

        {/* Security note */}
        <div className="px-6 pb-4">
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <Shield className="w-4 h-4 text-gray-400 mt-0.5" />
            <p className="text-xs text-gray-500">
              Toate plățile sunt procesate în siguranță. Nu stocăm datele cardului tău.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={loading || (!payuStatus.configured && selectedMethod === 'card')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700
              text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuă
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ================================
  // STEP: PROCESSING
  // ================================
  if (step === 'processing') {
    return (
      <div className={`bg-white rounded-2xl shadow-lg border p-8 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Se procesează...
        </h3>
        <p className="text-gray-500">
          Te rugăm să aștepți câteva momente.
        </p>
      </div>
    );
  }

  // ================================
  // STEP: BANK DETAILS
  // ================================
  if (step === 'bank_details') {
    const bankDetails = paymentResult?.bankDetails || BANK_INFO;
    const reference = paymentResult?.payment?.bankReference || invoice?.invoiceNumber;

    return (
      <div className={`bg-white rounded-2xl shadow-lg border overflow-hidden ${className}`}>
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Detalii transfer bancar
              </h2>
              <p className="text-gray-600">
                Transferă suma în contul de mai jos
              </p>
            </div>
          </div>
        </div>

        {/* Amount to pay */}
        <div className="p-6 bg-blue-50 border-b">
          <div className="text-center">
            <div className="text-sm text-blue-600 font-medium">Sumă de transferat</div>
            <div className="text-3xl font-bold text-blue-700 mt-1">
              {formatCurrency(paymentResult?.payment?.amount || invoice?.totalAmount)}
            </div>
          </div>
        </div>

        {/* Bank details */}
        <div className="p-6 space-y-4">
          {/* Beneficiary */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">Beneficiar</div>
              <div className="font-medium text-gray-900">{bankDetails.beneficiary}</div>
            </div>
            <button
              onClick={() => handleCopy(bankDetails.beneficiary, 'beneficiary')}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {copied === 'beneficiary' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* IBAN */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">IBAN</div>
              <div className="font-mono font-medium text-gray-900">{bankDetails.iban}</div>
            </div>
            <button
              onClick={() => handleCopy(bankDetails.iban, 'iban')}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {copied === 'iban' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Bank */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">Bancă</div>
              <div className="font-medium text-gray-900">{bankDetails.bank}</div>
            </div>
            <button
              onClick={() => handleCopy(bankDetails.bank, 'bank')}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {copied === 'bank' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Reference */}
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div>
              <div className="text-xs text-amber-600 font-medium">Referință plată (IMPORTANT!)</div>
              <div className="font-mono font-bold text-amber-800">{reference}</div>
            </div>
            <button
              onClick={() => handleCopy(reference, 'reference')}
              className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
            >
              {copied === 'reference' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Info note */}
        <div className="px-6 pb-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Important:</p>
              <ul className="mt-1 space-y-1 text-blue-600">
                <li>• Include referința plății în descrierea transferului</li>
                <li>• Plata va fi confirmată în 1-2 zile lucrătoare</li>
                <li>• Vei primi email de confirmare după verificare</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep('select')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Înapoi
          </button>
          <button
            type="button"
            onClick={handleBankTransferComplete}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700
              text-white font-medium rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Am efectuat transferul
          </button>
        </div>
      </div>
    );
  }

  // ================================
  // STEP: SUCCESS
  // ================================
  if (step === 'success') {
    return (
      <div className={`bg-white rounded-2xl shadow-lg border p-8 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Plată procesată cu succes!
        </h3>
        <p className="text-gray-500 mb-6">
          Mulțumim pentru plată. Factura a fost achitată.
        </p>
        <button
          type="button"
          onClick={() => onSuccess && onSuccess(paymentResult)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700
            text-white font-medium rounded-lg transition-colors"
        >
          Continuă
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
};

export default PaymentMethodForm;
