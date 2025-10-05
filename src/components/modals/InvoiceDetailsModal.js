import React, { useState } from 'react';
import { X, FileText, Upload } from 'lucide-react';

const InvoiceDetailsModal = ({
  isOpen,
  onClose,
  onSave,
  entityId,
  entityName,
  monthType,
  supplierName,
  existingInvoice = null,
  // Funcții pentru facturi parțiale
  getPartiallyDistributedInvoices,
  expenseType
}) => {
  const [selectedExistingInvoice, setSelectedExistingInvoice] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(existingInvoice?.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate] = useState(existingInvoice?.invoiceDate || '');
  const [dueDate, setDueDate] = useState(existingInvoice?.dueDate || '');
  const [notes, setNotes] = useState(existingInvoice?.notes || '');
  const [pdfFile, setPdfFile] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      alert('Te rog selectează doar fișiere PDF');
      event.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setPdfFile(null);
    const fileInput = document.getElementById('pdf-upload-invoice-modal');
    if (fileInput) fileInput.value = '';
  };

  const handleExistingInvoiceSelect = (invoiceId) => {
    setSelectedExistingInvoice(invoiceId);

    if (invoiceId && getPartiallyDistributedInvoices) {
      const allInvoices = expenseType
        ? getPartiallyDistributedInvoices(expenseType)
        : getPartiallyDistributedInvoices();

      const invoice = allInvoices?.find(inv => inv.id === invoiceId);

      if (invoice) {
        setInvoiceNumber(invoice.invoiceNumber);
        setInvoiceDate(invoice.invoiceDate || '');
        setDueDate(invoice.dueDate || '');
        setNotes(invoice.notes || '');
        // PDF-ul nu poate fi setat din factură existentă
      }
    } else if (!invoiceId) {
      // Reset când se selectează "Factură nouă"
      setInvoiceNumber('');
      setInvoiceDate('');
      setDueDate('');
      setNotes('');
      setPdfFile(null);
    }
  };

  const handleSubmit = () => {
    if (!invoiceNumber.trim()) {
      alert('Introdu numărul facturii');
      return;
    }

    onSave({
      entityId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      notes,
      pdfFile,
      isExistingInvoice: !!selectedExistingInvoice,
      existingInvoiceId: selectedExistingInvoice
    });

    // Reset și închide
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedExistingInvoice('');
    setInvoiceNumber('');
    setInvoiceDate('');
    setDueDate('');
    setNotes('');
    setPdfFile(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 60 }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className={`p-6 ${
          monthType === 'historic'
            ? 'bg-gradient-to-r from-gray-600 to-gray-700'
            : monthType === 'next'
            ? 'bg-gradient-to-r from-green-600 to-green-700'
            : 'bg-gradient-to-r from-indigo-600 to-blue-700'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">📄 Detalii Factură</h2>
              <p className="text-white/80 text-sm mt-1">{entityName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {supplierName && (
            <div className="text-sm text-blue-700 font-medium bg-blue-50 p-3 rounded-lg">
              🏢 Furnizor: {supplierName}
            </div>
          )}

          {/* Dropdown pentru facturi existente parțiale */}
          {getPartiallyDistributedInvoices && (() => {
            const allPartialInvoices = getPartiallyDistributedInvoices();
            const partialInvoicesForType = expenseType ? getPartiallyDistributedInvoices(expenseType) : [];

            const shouldShowAllPartials = !expenseType && allPartialInvoices?.length > 0;
            const shouldShowSpecificPartials = expenseType && partialInvoicesForType?.length > 0;
            const shouldShowDropdown = shouldShowAllPartials || shouldShowSpecificPartials || expenseType;

            return shouldShowDropdown;
          })() && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                📋 Selectează o factură existentă:
              </label>
              <select
                value={selectedExistingInvoice}
                onChange={(e) => handleExistingInvoiceSelect(e.target.value)}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">-- Factură nouă --</option>
                {(() => {
                  const invoicesToShow = expenseType
                    ? getPartiallyDistributedInvoices(expenseType)
                    : getPartiallyDistributedInvoices();

                  return invoicesToShow?.map(invoice => {
                    const remainingAmount = invoice.remainingAmount?.toFixed(2) || invoice.totalAmount?.toFixed(2);
                    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('ro-RO') : 'N/A';
                    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ro-RO') : 'N/A';
                    const supplierNameInv = invoice.supplierName || 'Fără furnizor';

                    return (
                      <option key={invoice.id} value={invoice.id}>
                        Factură {invoice.invoiceNumber} - {supplierNameInv} - Rămas: {remainingAmount} RON - Emitere: {invoiceDate} - Scadență: {dueDate}
                      </option>
                    );
                  });
                })()}
              </select>
            </div>
          )}

          {selectedExistingInvoice && (
            <div className="p-3 bg-purple-100 rounded-lg border border-purple-300">
              <div className="text-sm font-medium text-purple-800">
                📊 Factură existentă selectată
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Factura #{invoiceNumber} - Câmpurile sunt pre-completate
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Număr factură *
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="ex: FAC-2024-001234"
              disabled={!!selectedExistingInvoice}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                selectedExistingInvoice ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data facturii
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={!!selectedExistingInvoice}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                  selectedExistingInvoice ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data scadență
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!!selectedExistingInvoice}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                  selectedExistingInvoice ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF factură
            </label>
            <div className="flex items-center gap-2">
              <input
                id="pdf-upload-invoice-modal"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              {pdfFile ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {pdfFile.name}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('pdf-upload-invoice-modal').click()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Selectează PDF
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observații
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observații sau detalii suplimentare..."
              rows={3}
              disabled={!!selectedExistingInvoice}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none ${
                selectedExistingInvoice ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsModal;
