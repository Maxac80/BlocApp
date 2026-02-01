import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Calendar,
  CreditCard,
  Building2
} from 'lucide-react';
import { useBillingInvoices } from '../../hooks/useBillingInvoices';
import { downloadInvoicePdf, previewInvoicePdf } from '../../utils/invoicePdfGenerator';

/**
 * 📋 INVOICE HISTORY COMPONENT
 *
 * Afișează istoricul facturilor pentru un user cu:
 * - Lista facturilor cu status vizual
 * - Filtrare după status
 * - Descărcare/Preview PDF
 * - Detalii expandabile
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
  paid: {
    label: 'Plătită',
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
  cancelled: {
    label: 'Anulată',
    icon: XCircle,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-400'
  },
  draft: {
    label: 'Ciornă',
    icon: FileText,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500'
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
const formatPeriod = (startDate, endDate) => {
  const start = new Date(startDate);
  const monthNames = [
    'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun',
    'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
};

/**
 * Badge pentru status factură
 */
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
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
 * Componentă pentru un rând de factură (collapsed)
 */
const InvoiceRow = ({ invoice, onExpand, isExpanded, onDownload, onPreview }) => {
  const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;

  return (
    <div className={`border rounded-lg transition-all duration-200 ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Header row - always visible */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50
          ${isExpanded ? 'border-b' : ''}`}
        onClick={() => onExpand(invoice.id)}
      >
        <div className="flex items-center gap-4">
          {/* Icon status */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor}`}>
            <FileText className={`w-5 h-5 ${config.iconColor}`} />
          </div>

          {/* Detalii principale */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="text-sm text-gray-500 mt-0.5">
              {formatPeriod(invoice.periodStart, invoice.periodEnd)} • {invoice.totalApartments} apartamente
            </div>
          </div>
        </div>

        {/* Sumă și acțiuni */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</div>
            <div className="text-xs text-gray-500">
              {invoice.status === 'paid' ? `Plătit: ${formatDate(invoice.paidAt)}` : `Scadent: ${formatDate(invoice.dueAt)}`}
            </div>
          </div>

          {/* Butoane acțiuni */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(invoice); }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Vizualizează"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(invoice); }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Descarcă PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onExpand(invoice.id); }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Detalii factură */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Detalii factură
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Data emiterii:</span>
                  <span className="text-gray-900">{formatDate(invoice.issuedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Scadență:</span>
                  <span className="text-gray-900">{formatDate(invoice.dueAt)}</span>
                </div>
                {invoice.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Data plății:</span>
                    <span className="text-green-600 font-medium">{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
                {invoice.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Metoda plată:</span>
                    <span className="text-gray-900 capitalize">{invoice.paymentMethod}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detalii financiare */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Detalii financiare
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountPercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount ({invoice.discountPercent}%):</span>
                    <span className="text-green-600">-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-700">Total:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line items - asociații */}
          {invoice.lineItems && invoice.lineItems.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Detalii pe asociații
              </h4>
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-600 font-medium">Asociație</th>
                      <th className="text-center px-4 py-2 text-gray-600 font-medium">Apartamente</th>
                      <th className="text-right px-4 py-2 text-gray-600 font-medium">Preț/ap.</th>
                      <th className="text-right px-4 py-2 text-gray-600 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-900">{item.description.split(' - ')[0]}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Asociații suspendate (dacă există) */}
          {invoice.suspendedAssociations && invoice.suspendedAssociations.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <span className="font-medium text-amber-700">
                    {invoice.suspendedAssociations.length} asociații suspendate
                  </span>
                  <span className="text-amber-600"> nu au fost incluse în facturare:</span>
                  <div className="mt-1 text-amber-600">
                    {invoice.suspendedAssociations.map(a => a.name).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Componenta principală InvoiceHistory
 */
const InvoiceHistory = ({ userId, className = '' }) => {
  const { loadUserInvoices, getInvoiceStats, loading, error } = useBillingInvoices();

  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Încarcă facturile
  const loadInvoices = useCallback(async () => {
    if (!userId) return;

    setIsRefreshing(true);
    try {
      const [invoicesList, invoiceStats] = await Promise.all([
        loadUserInvoices(userId, filterStatus !== 'all' ? { status: filterStatus } : {}),
        getInvoiceStats(userId)
      ]);
      setInvoices(invoicesList);
      setStats(invoiceStats);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, filterStatus, loadUserInvoices, getInvoiceStats]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Handlers
  const handleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDownload = (invoice) => {
    try {
      downloadInvoicePdf(invoice);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  const handlePreview = (invoice) => {
    try {
      previewInvoicePdf(invoice);
    } catch (err) {
      console.error('Error previewing PDF:', err);
    }
  };

  // Empty state
  if (!loading && invoices.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border p-8 text-center ${className}`}>
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nu există facturi
        </h3>
        <p className="text-gray-500">
          Facturile vor apărea aici după finalizarea perioadei de trial sau la prima facturare lunară.
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
            <FileText className="w-5 h-5 text-blue-500" />
            Istoric facturi
          </h3>
          <button
            onClick={loadInvoices}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Statistici rapide */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total facturi</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
              <div className="text-xs text-gray-500">Total plătit</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-xs text-gray-500">În așteptare</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalPending)}</div>
              <div className="text-xs text-gray-500">De plătit</div>
            </div>
          </div>
        )}

        {/* Filtru status */}
        <div className="flex items-center gap-2 mt-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toate facturile</option>
            <option value="pending">În așteptare</option>
            <option value="paid">Plătite</option>
            <option value="failed">Eșuate</option>
            <option value="cancelled">Anulate</option>
          </select>
        </div>
      </div>

      {/* Lista facturi */}
      <div className="p-4 space-y-3">
        {loading && !isRefreshing ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-gray-300 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Se încarcă facturile...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>Eroare la încărcare: {error}</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              isExpanded={expandedId === invoice.id}
              onExpand={handleExpand}
              onDownload={handleDownload}
              onPreview={handlePreview}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default InvoiceHistory;
