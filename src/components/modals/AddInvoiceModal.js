import React, { useState, useEffect } from 'react';
import { X, FileText, Plus } from 'lucide-react';
import SupplierModal from './SupplierModal';

const AddInvoiceModal = ({
  isOpen,
  onClose,
  onSave,
  suppliers = [],
  onAddSupplier,
  currentMonth
}) => {
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    documentType: 'factura',
    invoiceNumber: '',
    totalAmount: '',
    invoiceDate: '',
    dueDate: ''
  });
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        supplierId: '',
        supplierName: '',
        documentType: 'factura',
        invoiceNumber: '',
        totalAmount: '',
        invoiceDate: '',
        dueDate: ''
      });
      setSaving(false);
    }
  }, [isOpen]);

  const handleSupplierChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setFormData(prev => ({ ...prev, supplierId: '', supplierName: '' }));
      return;
    }
    const supplier = suppliers.find(s => s.id === selectedId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplierId: supplier.id,
        supplierName: supplier.name
      }));
    }
  };

  const handleNewSupplier = async (supplierData) => {
    if (onAddSupplier) {
      const newSupplier = await onAddSupplier(supplierData);
      if (newSupplier?.id) {
        setFormData(prev => ({
          ...prev,
          supplierId: newSupplier.id,
          supplierName: newSupplier.name || supplierData.name
        }));
      }
    }
  };

  const handleSave = async () => {
    if (!formData.supplierId) {
      alert('Selecteaza un furnizor.');
      return;
    }
    if (!formData.invoiceNumber.trim()) {
      alert('Numarul documentului este obligatoriu.');
      return;
    }
    const amount = parseFloat(formData.totalAmount);
    if (!amount || amount <= 0) {
      alert('Suma documentului trebuie sa fie mai mare decat 0.');
      return;
    }

    setSaving(true);
    try {
      const invoiceData = {
        supplierId: formData.supplierId,
        supplierName: formData.supplierName,
        documentType: formData.documentType,
        invoiceNumber: formData.invoiceNumber.trim(),
        totalAmount: amount,
        totalInvoiceAmount: amount,
        invoiceAmount: amount,
        amount: amount,
        invoiceDate: formData.invoiceDate || null,
        dueDate: formData.dueDate || null,
        month: currentMonth,
        isStandalone: true,
        currentDistribution: 0,
        vatAmount: 0
      };
      await onSave(invoiceData, null);
      onClose();
    } catch (error) {
      console.error('Eroare la salvarea facturii:', error);
      alert('Eroare la salvarea facturii: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isValid = formData.supplierId && formData.invoiceNumber.trim() && parseFloat(formData.totalAmount) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Adauga factura
                </h2>
                <p className="text-white/80 text-xs">{currentMonth}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors hover:bg-white/20 p-1.5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto min-h-0">
          <div className="space-y-3 sm:space-y-4">
            {/* Furnizor */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Furnizor *
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.supplierId}
                  onChange={handleSupplierChange}
                  className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 hover:border-gray-400"
                >
                  <option value="">-- Selecteaza furnizor --</option>
                  {suppliers.filter(s => s.isActive !== false).map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {onAddSupplier && (
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    className="px-2.5 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Adaugă furnizor
                  </button>
                )}
              </div>
            </div>

            {/* Tip document */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tip document
              </label>
              <select
                value={formData.documentType}
                onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 hover:border-gray-400"
              >
                <option value="factura">Factura</option>
                <option value="bon_fiscal">Bon fiscal</option>
                <option value="chitanta">Chitanta</option>
                <option value="proces_verbal">Proces-verbal</option>
                <option value="altul">Altul</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Nr. document */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nr. document *
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="FAC-001"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>

              {/* Suma document */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Suma document (RON) *
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Data document */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Data document
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>

              {/* Data scadenta */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Data scadenta
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-3 sm:px-4 py-3 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="text-xs text-gray-500">
            * Obligatoriu
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Anuleaza
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className="px-3 py-1.5 text-xs sm:text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg whitespace-nowrap"
            >
              {saving ? 'Se salveaza...' : 'Salveaza factura'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal creare furnizor nou */}
      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSave={handleNewSupplier}
      />
    </div>
  );
};

export default AddInvoiceModal;
