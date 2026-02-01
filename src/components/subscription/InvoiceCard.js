import React from 'react';
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Calendar
} from 'lucide-react';
import { downloadInvoicePdf, previewInvoicePdf } from '../../utils/invoicePdfGenerator';

/**
 * 💳 INVOICE CARD COMPONENT
 *
 * Card compact pentru afișarea unei facturi.
 * Utilizări:
 * - Dashboard pentru ultima factură
 * - Sidebar pentru factură pending
 * - Notificări pentru plăți restante
 *
 * Variante:
 * - default: Card standard cu toate detaliile
 * - compact: Versiune minimalistă pentru sidebar
 * - alert: Card de alertă pentru facturi restante
 */

// Configurare status-uri
const STATUS_CONFIG = {
  pending: {
    label: 'În așteptare',
    icon: Clock,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
    accentColor: 'bg-amber-500'
  },
  paid: {
    label: 'Plătită',
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    accentColor: 'bg-green-500'
  },
  failed: {
    label: 'Eșuată',
    icon: XCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    accentColor: 'bg-red-500'
  },
  cancelled: {
    label: 'Anulată',
    icon: XCircle,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-400',
    accentColor: 'bg-gray-400'
  },
  draft: {
    label: 'Ciornă',
    icon: FileText,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    accentColor: 'bg-blue-500'
  }
};

/**
 * Formatează data în format românesc
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
 * Formatează suma în RON
 */
const formatCurrency = (amount, currency = 'RON') => {
  return `${Number(amount || 0).toFixed(2)} ${currency}`;
};

/**
 * Formatează perioada
 */
const formatPeriod = (startDate) => {
  if (!startDate) return '-';
  const start = new Date(startDate);
  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];
  return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
};

/**
 * Verifică dacă factura e restantă
 */
const isOverdue = (invoice) => {
  if (invoice.status !== 'pending') return false;
  const dueDate = new Date(invoice.dueAt);
  return new Date() > dueDate;
};

/**
 * Calculează zilele până la scadență
 */
const getDaysUntilDue = (invoice) => {
  if (!invoice.dueAt) return null;
  const due = new Date(invoice.dueAt);
  const now = new Date();
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diff;
};

/**
 * Card standard pentru factură
 */
const InvoiceCard = ({
  invoice,
  variant = 'default',
  onPayClick,
  onViewDetails,
  className = ''
}) => {
  if (!invoice) return null;

  const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const StatusIcon = config.icon;
  const overdue = isOverdue(invoice);
  const daysUntilDue = getDaysUntilDue(invoice);

  // Handler pentru descărcare PDF
  const handleDownload = (e) => {
    e.stopPropagation();
    try {
      downloadInvoicePdf(invoice);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  // Handler pentru preview PDF
  const handlePreview = (e) => {
    e.stopPropagation();
    try {
      previewInvoicePdf(invoice);
    } catch (err) {
      console.error('Error previewing PDF:', err);
    }
  };

  // === VARIANTA COMPACT ===
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer
          hover:bg-gray-50 transition-colors ${config.borderColor} ${className}`}
        onClick={onViewDetails}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
          <FileText className={`w-4 h-4 ${config.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {invoice.invoiceNumber}
            </span>
            {overdue && (
              <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                Restantă
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {formatPeriod(invoice.periodStart)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold text-gray-900">
            {formatCurrency(invoice.totalAmount)}
          </div>
          <div className={`text-xs ${config.textColor}`}>
            {config.label}
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  // === VARIANTA ALERT (pentru facturi restante) ===
  if (variant === 'alert' && (invoice.status === 'pending' || invoice.status === 'failed')) {
    const alertConfig = overdue || invoice.status === 'failed'
      ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', accent: 'bg-red-500' }
      : { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', accent: 'bg-amber-500' };

    return (
      <div className={`${alertConfig.bg} ${alertConfig.border} border rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 ${alertConfig.accent} rounded-full flex items-center justify-center flex-shrink-0`}>
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold ${alertConfig.text}`}>
              {overdue ? 'Factură restantă' : invoice.status === 'failed' ? 'Plată eșuată' : 'Factură de plătit'}
            </h4>
            <p className={`text-sm ${alertConfig.text} opacity-80 mt-1`}>
              {invoice.invoiceNumber} • {formatPeriod(invoice.periodStart)}
            </p>

            <div className="flex items-center gap-4 mt-3">
              <div>
                <div className="text-xs text-gray-500">Total</div>
                <div className={`text-lg font-bold ${alertConfig.text}`}>
                  {formatCurrency(invoice.totalAmount)}
                </div>
              </div>

              {daysUntilDue !== null && (
                <div>
                  <div className="text-xs text-gray-500">
                    {overdue ? 'Restanță' : 'Scadență'}
                  </div>
                  <div className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-700'}`}>
                    {overdue
                      ? `${Math.abs(daysUntilDue)} zile`
                      : daysUntilDue === 0
                        ? 'Astăzi'
                        : `${daysUntilDue} zile`
                    }
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4">
              {onPayClick && (
                <button
                  onClick={onPayClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Plătește acum
                </button>
              )}
              <button
                onClick={handlePreview}
                className={`inline-flex items-center gap-1 px-3 py-2 ${alertConfig.text} hover:bg-black/5 text-sm font-medium rounded-lg transition-colors`}
              >
                <Eye className="w-4 h-4" />
                Vezi factura
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === VARIANTA DEFAULT ===
  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Accent bar */}
      <div className={`h-1 ${config.accentColor}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor}`}>
              <FileText className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{invoice.invoiceNumber}</div>
              <div className="text-sm text-gray-500">{formatPeriod(invoice.periodStart)}</div>
            </div>
          </div>

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
            ${config.bgColor} ${config.textColor} ${config.borderColor} border`}
          >
            <StatusIcon className={`w-3.5 h-3.5 ${config.iconColor}`} />
            {config.label}
          </span>
        </div>

        {/* Detalii */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {invoice.status === 'paid' ? 'Data plății' : 'Scadență'}
            </div>
            <div className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
              {invoice.status === 'paid'
                ? formatDate(invoice.paidAt)
                : formatDate(invoice.dueAt)
              }
              {overdue && ' (restantă)'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Apartamente</div>
            <div className="text-sm font-medium text-gray-900">
              {invoice.totalApartments || 0} apartamente
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-end justify-between pt-4 border-t">
          <div>
            <div className="text-xs text-gray-500">Total de plată</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(invoice.totalAmount)}
            </div>
            {invoice.discountPercent > 0 && (
              <div className="text-xs text-green-600">
                Include discount {invoice.discountPercent}%
              </div>
            )}
          </div>

          {/* Acțiuni */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Vizualizează"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Descarcă PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            {invoice.status === 'pending' && onPayClick && (
              <button
                onClick={onPayClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Plătește
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Card gol (no invoice)
 */
export const InvoiceCardEmpty = ({ message = 'Nu există facturi', className = '' }) => {
  return (
    <div className={`bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center ${className}`}>
      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
};

/**
 * Card skeleton (loading)
 */
export const InvoiceCardSkeleton = ({ className = '' }) => {
  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden animate-pulse ${className}`}>
      <div className="h-1 bg-gray-200" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="h-3 w-16 bg-gray-100 rounded mb-1" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div>
            <div className="h-3 w-16 bg-gray-100 rounded mb-1" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="flex items-end justify-between pt-4 border-t">
          <div>
            <div className="h-3 w-20 bg-gray-100 rounded mb-2" />
            <div className="h-8 w-28 bg-gray-200 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-gray-200 rounded-lg" />
            <div className="w-9 h-9 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Lista de facturi recente (pentru dashboard)
 */
export const RecentInvoicesList = ({ invoices = [], onViewAll, maxItems = 3, className = '' }) => {
  const displayInvoices = invoices.slice(0, maxItems);

  return (
    <div className={`space-y-3 ${className}`}>
      {displayInvoices.length === 0 ? (
        <InvoiceCardEmpty message="Nu există facturi recente" />
      ) : (
        <>
          {displayInvoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              variant="compact"
            />
          ))}
          {invoices.length > maxItems && onViewAll && (
            <button
              onClick={onViewAll}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Vezi toate facturile ({invoices.length})
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default InvoiceCard;
