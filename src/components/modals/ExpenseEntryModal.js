/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { X, Share2, FileText, Wrench } from 'lucide-react';

// Helper: formatează dată din YYYY-MM-DD în DD/MM/YYYY
const formatDateRo = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

const ExpenseEntryModal = ({
  isOpen,
  onClose,
  blocks,
  stairs,
  availableExpenseTypes,
  getExpenseConfig,
  handleAddExpense,
  handleUpdateExpense,
  editingExpense,
  currentMonth,
  monthType,
  // Funcții pentru facturi parțiale
  getPartiallyDistributedInvoices,
  getInvoiceByNumber,
  syncSuppliersForExpenseType,
  // Funcții pentru salvare facturi
  addInvoice,
  updateInvoice,
  updateInvoiceDistribution,
  currentSheet,
  association,
  setShowExpenseConfig,
  setSelectedExpenseForConfig,
  setConfigModalInitialTab
}) => {
  // Helper: Normalizează receptionMode pentru backward compatibility
  const normalizeReceptionMode = (mode) => {
    if (mode === 'total') return 'per_association';
    if (mode === 'per_blocuri') return 'per_block';
    if (mode === 'per_scari') return 'per_stair';
    if (mode === 'building') return 'per_block';  // old expenseEntryMode
    if (mode === 'staircase') return 'per_stair'; // old expenseEntryMode
    return mode;
  };

  // Wrapper pentru getExpenseConfig care aplică backward compatibility
  const getExpenseConfigNormalized = (expenseNameOrId) => {
    const config = getExpenseConfig(expenseNameOrId);
    if (config && config.receptionMode) {
      config.receptionMode = normalizeReceptionMode(config.receptionMode);
    }
    return config;
  };

  const [selectedExpense, setSelectedExpense] = useState('');
  const [amounts, setAmounts] = useState({}); // Pentru sume per bloc/scară
  const [totalAmount, setTotalAmount] = useState(''); // Pentru mod total
  const [unitPrice, setUnitPrice] = useState(''); // Pentru consumption
  const [billAmount, setBillAmount] = useState(''); // Pentru consumption

  // Invoice data
  const [invoiceMode, setInvoiceMode] = useState('single'); // 'single' | 'separate'

  // Pentru facturi separate (per bloc/scară)
  const [separateInvoices, setSeparateInvoices] = useState({}); // { stairId/blockId: { invoiceNumber, date, pdf, notes } }

  // 🏢 Per-supplier multi-document invoice state
  // { [supplierId]: { documents: [{ documentType, selectedExistingInvoice, newDocNumber, newDocAmount, newDocDate, newDocDueDate, singleInvoice, distributeAmount }] } }
  const [supplierInvoices, setSupplierInvoices] = useState({});

  // Default document template
  const defaultDoc = () => ({
    documentType: 'factura', selectedExistingInvoice: null,
    newDocNumber: '', newDocAmount: '', newDocDate: '', newDocDueDate: '',
    singleInvoice: null, distributeAmount: ''
  });

  // Helper: get effective suppliers list from config (backward compat)
  const getEffectiveSuppliers = (cfg) => {
    if (cfg?.suppliers?.length > 0) return cfg.suppliers;
    if (cfg?.supplierId) return [{ supplierId: cfg.supplierId, supplierName: cfg.supplierName || '' }];
    return [];
  };

  // Helper: get documents for a supplier (always returns at least empty array)
  const getSupplierDocs = (supplierId) => {
    return supplierInvoices[supplierId]?.documents || [];
  };

  // Helper: update a specific document within a supplier
  const updateSupplierDocument = (supplierId, docIndex, updates) => {
    setSupplierInvoices(prev => {
      const supplier = prev[supplierId] || { documents: [defaultDoc()] };
      const docs = [...supplier.documents];
      docs[docIndex] = { ...(docs[docIndex] || defaultDoc()), ...updates };
      return { ...prev, [supplierId]: { documents: docs } };
    });
  };

  // Helper: add a new document to a supplier
  const addDocumentToSupplier = (supplierId) => {
    setSupplierInvoices(prev => {
      const supplier = prev[supplierId] || { documents: [defaultDoc()] };
      return { ...prev, [supplierId]: { documents: [...supplier.documents, defaultDoc()] } };
    });
  };

  // Helper: remove a document from a supplier (keep minimum 1)
  const removeDocumentFromSupplier = (supplierId, docIndex) => {
    setSupplierInvoices(prev => {
      const supplier = prev[supplierId] || { documents: [defaultDoc()] };
      if (supplier.documents.length <= 1) return prev;
      const docs = supplier.documents.filter((_, i) => i !== docIndex);
      return { ...prev, [supplierId]: { documents: docs } };
    });
  };

  // Helper: check if we're in multi-document mode (more than 1 supplier or more than 1 document anywhere)
  const isMultiDocumentMode = () => {
    const suppliers = getEffectiveSuppliers(config);
    if (suppliers.length > 1) return true;
    for (const s of suppliers) {
      const docs = getSupplierDocs(s.supplierId);
      if (docs.length > 1) return true;
    }
    return false;
  };

  // Reset când se deschide/închide modalul
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // 🏢 Auto-sum distribute amounts from all documents across all suppliers
  useEffect(() => {
    if (!selectedExpense || !config) return;
    if (!isMultiDocumentMode()) return;

    const total = getEffectiveSuppliers(config).reduce((sum, s) => {
      const docs = getSupplierDocs(s.supplierId);
      return sum + docs.reduce((dSum, d) => dSum + (parseFloat(d.distributeAmount) || 0), 0);
    }, 0);

    const totalStr = total > 0 ? total.toString() : '';
    if (config.distributionType === 'consumption') {
      setBillAmount(totalStr);
    } else {
      setTotalAmount(totalStr);
    }
  }, [supplierInvoices, selectedExpense]);

  // Sincronizează invoiceMode cu config când se selectează cheltuială
  useEffect(() => {
    if (selectedExpense) {
      const config = getExpenseConfigNormalized(selectedExpense);
      if (config) {
        setInvoiceMode(config.invoiceMode || 'single');
      }
    }
  }, [selectedExpense, getExpenseConfig]);

  // Pre-populează formularul când editingExpense este furnizat
  useEffect(() => {
    if (editingExpense) {

      const expenseConfig = getExpenseConfigNormalized(editingExpense.name);

      setSelectedExpense(editingExpense.name);

      // Populează sumele bazate pe distributionType și receptionMode
      if (editingExpense.amountsByBlock && Object.keys(editingExpense.amountsByBlock).length > 0) {
        setAmounts(editingExpense.amountsByBlock);
      } else if (editingExpense.amountsByStair && Object.keys(editingExpense.amountsByStair).length > 0) {
        setAmounts(editingExpense.amountsByStair);
      } else {
        setAmounts({});
      }

      // Populează sumele pentru consumption sau alte tipuri
      if (editingExpense.isUnitBased) {
        setUnitPrice(editingExpense.unitPrice?.toString() || '');
        setBillAmount(editingExpense.billAmount?.toString() || '');
      } else {
        setTotalAmount(editingExpense.amount?.toString() || '');
      }

      // Populează invoice data din editingExpense (salvate în sheet)
      if (editingExpense.invoicesData && editingExpense.invoicesData.length > 0) {
        // Multi-document invoices — group by supplierId
        const newSupplierInvoices = {};
        for (const invData of editingExpense.invoicesData) {
          const invAmount = invData.invoiceAmount?.toString() || invData.totalInvoiceAmount?.toString() || '';
          const docEntry = {
            documentType: invData.documentType || 'factura',
            selectedExistingInvoice: null,
            newDocNumber: invData.invoiceNumber || '',
            newDocAmount: invAmount,
            newDocDate: invData.invoiceDate || '',
            newDocDueDate: invData.dueDate || '',
            distributeAmount: invData.distributeAmount?.toString() || invAmount,
            singleInvoice: {
              invoiceNumber: invData.invoiceNumber || '',
              invoiceAmount: invAmount,
              invoiceDate: invData.invoiceDate || '',
              dueDate: invData.dueDate || '',
              notes: invData.notes || '',
              pdfFile: null,
              isExisting: !!invData.existingInvoiceId,
              existingInvoiceId: invData.existingInvoiceId || null
            }
          };
          if (!newSupplierInvoices[invData.supplierId]) {
            newSupplierInvoices[invData.supplierId] = { documents: [] };
          }
          newSupplierInvoices[invData.supplierId].documents.push(docEntry);
        }
        setSupplierInvoices(newSupplierInvoices);
      } else if (editingExpense.invoiceData) {
        // Single invoice — backward compat: wrap in documents array
        const invData = editingExpense.invoiceData;
        const invAmount = invData.invoiceAmount?.toString() || invData.totalInvoiceAmount?.toString() || '';
        const suppliers = getEffectiveSuppliers(expenseConfig);
        const targetSupplierId = invData.supplierId || suppliers[0]?.supplierId;
        if (targetSupplierId) {
          setSupplierInvoices({
            [targetSupplierId]: {
              documents: [{
                documentType: invData.documentType || 'factura',
                selectedExistingInvoice: null,
                newDocNumber: invData.invoiceNumber || '',
                newDocAmount: invAmount,
                newDocDate: invData.invoiceDate || '',
                newDocDueDate: invData.dueDate || '',
                distributeAmount: invAmount,
                singleInvoice: {
                  invoiceNumber: invData.invoiceNumber || '',
                  invoiceAmount: invAmount,
                  invoiceDate: invData.invoiceDate || '',
                  dueDate: invData.dueDate || '',
                  notes: invData.notes || '',
                  pdfFile: null,
                  isExisting: !!invData.existingInvoiceId,
                  existingInvoiceId: invData.existingInvoiceId || null
                }
              }]
            }
          });
        }
      }

      if (editingExpense.separateInvoicesData) {
        setSeparateInvoices(editingExpense.separateInvoicesData);
      }
    }
  }, [editingExpense]);

  const resetForm = () => {
    setSelectedExpense('');
    setAmounts({});
    setTotalAmount('');
    setUnitPrice('');
    setBillAmount('');
    setInvoiceMode('single');
    setSeparateInvoices({});
    setSupplierInvoices({});
  };


  // Helper pentru a obține unitatea de măsură corectă
  const getConsumptionUnit = (config) => {
    if (!config) return 'unitate';
    if (config.consumptionUnit === 'custom') {
      return config.customConsumptionUnit || 'unitate';
    }
    return config.consumptionUnit || 'mc';
  };

  // Tipuri de document justificativ
  const documentTypes = [
    { value: 'factura', label: 'Factură' },
    { value: 'bon_fiscal', label: 'Bon fiscal' },
    { value: 'chitanta', label: 'Chitanță' },
    { value: 'proces_verbal', label: 'Proces-verbal' },
    { value: 'altul', label: 'Altul' }
  ];

  // 🏢 Per-supplier per-document: get available invoices for a specific supplier/doc
  // Excludes invoices already selected in other documents of the same supplier
  const getAvailableInvoicesForSupplier = (supplierId, docIndex) => {
    if (!selectedExpense || !getPartiallyDistributedInvoices) return [];
    const docs = getSupplierDocs(supplierId);
    const doc = docs[docIndex] || {};
    const docType = doc.documentType || 'factura';
    const all = getPartiallyDistributedInvoices(
      docType === 'factura' ? selectedExpense : null,
      docType,
      supplierId
    ) || [];
    // Exclude invoices already selected in OTHER documents of this supplier
    const selectedIds = docs
      .filter((_, i) => i !== docIndex)
      .map(d => d.selectedExistingInvoice?.id)
      .filter(Boolean);
    return all.filter(inv => !selectedIds.includes(inv.id));
  };

  // 🏢 Handler: select existing invoice for a supplier's document
  const handleSelectExistingInvoice = (supplierId, docIndex, invoiceId) => {
    if (!invoiceId) {
      updateSupplierDocument(supplierId, docIndex, { selectedExistingInvoice: null, distributeAmount: '', singleInvoice: null });
      return;
    }
    const available = getAvailableInvoicesForSupplier(supplierId, docIndex);
    const invoice = available.find(inv => inv.id === invoiceId);
    if (invoice) {
      const remaining = invoice.remainingAmount || invoice.totalInvoiceAmount || 0;
      const remainingStr = parseFloat(remaining).toFixed(2);
      // Auto-fill total doar dacă e un singur furnizor + un singur document
      if (!isMultiDocumentMode()) {
        if (config?.distributionType === 'consumption') {
          setBillAmount(remainingStr);
        } else {
          setTotalAmount(remainingStr);
        }
      }
      updateSupplierDocument(supplierId, docIndex, {
        selectedExistingInvoice: invoice,
        newDocNumber: '',
        newDocAmount: '',
        newDocDate: '',
        newDocDueDate: '',
        distributeAmount: remainingStr,
        singleInvoice: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceAmount: parseFloat(invoice.totalInvoiceAmount || 0).toFixed(2),
          invoiceDate: invoice.invoiceDate || '',
          dueDate: invoice.dueDate || '',
          notes: invoice.notes || '',
          pdfFile: null,
          isExisting: true,
          existingInvoiceId: invoice.id
        }
      });
    }
  };

  // 🏢 Handler: new document amount change
  const handleDocAmountChange = (supplierId, docIndex, value) => {
    const docs = getSupplierDocs(supplierId);
    const doc = docs[docIndex] || {};
    const updates = { newDocAmount: value, selectedExistingInvoice: null };
    const numValue = parseFloat(value) || 0;
    if (numValue > 0) {
      updates.singleInvoice = {
        invoiceNumber: doc.newDocNumber || '',
        invoiceAmount: value,
        invoiceDate: doc.newDocDate || '',
        dueDate: doc.newDocDueDate || '',
        notes: '', pdfFile: null, isExisting: false
      };
      // Auto-fill distributeAmount doar dacă e gol sau egal cu suma anterioară (nu suprascrie editări manuale)
      const currentDistribute = doc.distributeAmount || '';
      const previousDocAmount = doc.newDocAmount || '';
      if (!currentDistribute || currentDistribute === previousDocAmount) {
        updates.distributeAmount = value;
      }
    }
    updateSupplierDocument(supplierId, docIndex, updates);
    // Auto-fill total doar dacă e un singur furnizor + un singur document
    if (!isMultiDocumentMode() && numValue > 0) {
      if (config?.distributionType === 'consumption') {
        setBillAmount(value);
      } else {
        setTotalAmount(value);
      }
    }
  };

  // 🏢 Handler: new document number change
  const handleDocNumberChange = (supplierId, docIndex, value) => {
    const docs = getSupplierDocs(supplierId);
    const doc = docs[docIndex] || {};
    const updates = { newDocNumber: value };
    if (doc.newDocAmount) {
      updates.singleInvoice = doc.singleInvoice
        ? { ...doc.singleInvoice, invoiceNumber: value }
        : { invoiceNumber: value, invoiceAmount: doc.newDocAmount, invoiceDate: doc.newDocDate || '', dueDate: doc.newDocDueDate || '', notes: '', pdfFile: null, isExisting: false };
    }
    if (value) updates.selectedExistingInvoice = null;
    updateSupplierDocument(supplierId, docIndex, updates);
  };

  // 🏢 Handler: document date change
  const handleDocDateChange = (supplierId, docIndex, value) => {
    const docs = getSupplierDocs(supplierId);
    const doc = docs[docIndex] || {};
    const updates = { newDocDate: value };
    // Dacă data documentului depășește scadența, resetăm scadența
    if (doc.newDocDueDate && value && value > doc.newDocDueDate) {
      updates.newDocDueDate = '';
    }
    if (doc.newDocAmount) {
      updates.singleInvoice = doc.singleInvoice
        ? { ...doc.singleInvoice, invoiceDate: value, ...(updates.newDocDueDate === '' ? { dueDate: '' } : {}) }
        : { invoiceNumber: doc.newDocNumber || '', invoiceAmount: doc.newDocAmount, invoiceDate: value, dueDate: updates.newDocDueDate === '' ? '' : (doc.newDocDueDate || ''), notes: '', pdfFile: null, isExisting: false };
    }
    updateSupplierDocument(supplierId, docIndex, updates);
  };

  // 🏢 Handler: due date change
  const handleDocDueDateChange = (supplierId, docIndex, value) => {
    const docs = getSupplierDocs(supplierId);
    const doc = docs[docIndex] || {};
    // Scadența nu poate fi mai mică decât data documentului
    if (doc.newDocDate && value && value < doc.newDocDate) {
      return;
    }
    const updates = { newDocDueDate: value };
    if (doc.newDocAmount) {
      updates.singleInvoice = doc.singleInvoice
        ? { ...doc.singleInvoice, dueDate: value }
        : { invoiceNumber: doc.newDocNumber || '', invoiceAmount: doc.newDocAmount, invoiceDate: doc.newDocDate || '', dueDate: value, notes: '', pdfFile: null, isExisting: false };
    }
    updateSupplierDocument(supplierId, docIndex, updates);
  };

  // 🏢 Render a single document card
  const renderDocumentCard = (supplier, doc, docIndex, totalDocs) => {
    const sid = supplier.supplierId;
    const docType = doc.documentType || 'factura';
    const selExisting = doc.selectedExistingInvoice;
    const available = getAvailableInvoicesForSupplier(sid, docIndex);
    const multiDoc = isMultiDocumentMode();

    return (
      <div key={docIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {totalDocs > 1 ? `Document ${docIndex + 1}` : 'Document justificativ *'}
          </div>
          {totalDocs > 1 && (
            <button
              onClick={() => removeDocumentFromSupplier(sid, docIndex)}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Șterge document"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tip document */}
        <div>
          <select
            value={docType}
            onChange={(e) => updateSupplierDocument(sid, docIndex, { documentType: e.target.value, selectedExistingInvoice: null, newDocNumber: '', newDocAmount: '', newDocDate: '', newDocDueDate: '', distributeAmount: '', singleInvoice: null })}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            {documentTypes.map(dt => (
              <option key={dt.value} value={dt.value}>{dt.label}</option>
            ))}
          </select>
        </div>

        {/* Selectează document existent */}
        {available.length > 0 && (
          <div>
            <select
              value={selExisting?.id || ''}
              onChange={(e) => handleSelectExistingInvoice(sid, docIndex, e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">Selectează document existent...</option>
              {available.map(avInv => (
                <option key={avInv.id} value={avInv.id}>
                  {avInv.invoiceNumber} — Total: {(avInv.totalInvoiceAmount || avInv.totalAmount || avInv.amount || 0).toFixed(2)} RON — Rămas: {(avInv.remainingAmount || 0).toFixed(2)} RON
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Separator */}
        {available.length > 0 && !selExisting && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 border-t border-gray-300"></div>
            <span>sau document nou</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>
        )}

        {/* Câmpuri document nou */}
        {!selExisting && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nr. document *</label>
                <input
                  type="text"
                  value={doc.newDocNumber || ''}
                  onChange={(e) => handleDocNumberChange(sid, docIndex, e.target.value)}
                  placeholder="FAC-001"
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sumă document (RON) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={doc.newDocAmount || ''}
                  onChange={(e) => handleDocAmountChange(sid, docIndex, e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data document</label>
                <input
                  type="date"
                  value={doc.newDocDate || ''}
                  onChange={(e) => handleDocDateChange(sid, docIndex, e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data scadență</label>
                <input
                  type="date"
                  value={doc.newDocDueDate || ''}
                  onChange={(e) => handleDocDueDateChange(sid, docIndex, e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sumă de distribuit per document nou */}
        {!selExisting && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Sumă de distribuit (RON) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={doc.distributeAmount || ''}
              onChange={(e) => {
                const val = e.target.value;
                const maxAmount = parseFloat(doc.newDocAmount) || 0;
                const finalVal = (maxAmount > 0 && parseFloat(val) > maxAmount) ? maxAmount.toString() : val;
                updateSupplierDocument(sid, docIndex, { distributeAmount: finalVal });
                // Sincronizează cu totalAmount/billAmount pentru validare
                if (!isMultiDocumentMode()) {
                  if (config?.distributionType === 'consumption') {
                    setBillAmount(finalVal);
                  } else {
                    setTotalAmount(finalVal);
                  }
                }
              }}
              placeholder="0.00"
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>
        )}

        {/* Info document selectat + sumă distribuit */}
        {selExisting && (
          <>
            <div className="text-xs text-green-700 bg-green-50 p-2 rounded-lg space-y-0.5">
              <div>✓ #{selExisting.invoiceNumber} — Total: {(selExisting.totalInvoiceAmount || selExisting.totalAmount || selExisting.amount || 0).toFixed(2)} RON — Rămas: {(selExisting.remainingAmount || 0).toFixed(2)} RON</div>
              {(selExisting.invoiceDate || selExisting.dueDate) && (
                <div className="text-green-600">
                  {selExisting.invoiceDate && `Data: ${formatDateRo(selExisting.invoiceDate)}`}
                  {selExisting.invoiceDate && selExisting.dueDate && ' — '}
                  {selExisting.dueDate && `Scadență: ${formatDateRo(selExisting.dueDate)}`}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sumă de distribuit (RON) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={doc.distributeAmount || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const maxAmount = selExisting.remainingAmount || 0;
                  const finalVal = (maxAmount > 0 && parseFloat(val) > maxAmount) ? maxAmount.toString() : val;
                  updateSupplierDocument(sid, docIndex, { distributeAmount: finalVal });
                  // Sincronizează cu totalAmount/billAmount pentru validare
                  if (!isMultiDocumentMode()) {
                    if (config?.distributionType === 'consumption') {
                      setBillAmount(finalVal);
                    } else {
                      setTotalAmount(finalVal);
                    }
                  }
                }}
                placeholder="0.00"
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
          </>
        )}
      </div>
    );
  };

  // Render all supplier document sections
  const renderInlineDocuments = () => {
    const suppliers = getEffectiveSuppliers(config);
    if (suppliers.length === 0) return null;

    return suppliers.map(supplier => {
      const sid = supplier.supplierId;
      const docs = getSupplierDocs(sid);
      // Ensure at least one document exists for rendering
      const docsToRender = docs.length > 0 ? docs : [defaultDoc()];

      return (
        <div key={sid}>
          {suppliers.length >= 1 && supplier.supplierName && (
            <div className={`text-sm font-medium flex items-center gap-1.5 mt-2 mb-1 ${suppliers.length > 1 ? 'text-gray-600' : 'text-gray-500'}`}>
              <span>🏢</span> {supplier.supplierName}
            </div>
          )}
          <div className="space-y-3">
            {docsToRender.map((doc, idx) => renderDocumentCard(supplier, doc, idx, docsToRender.length))}
          </div>
          <button
            onClick={() => addDocumentToSupplier(sid)}
            className="mt-1 px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex items-center gap-1"
          >
            <span>+</span> Adaugă document
          </button>
        </div>
      );
    });
  };

  const handleSubmit = async () => {

    if (!selectedExpense) {
      alert('Selectează o cheltuială');
      return;
    }

    const config = getExpenseConfigNormalized(selectedExpense);

    // Sincronizare: dacă totalAmount/billAmount sunt goale dar avem distributeAmount în documente
    // (caz auto-fill de la factură existentă fără editare manuală)
    const getAllDocs = () => {
      const all = [];
      Object.values(supplierInvoices).forEach(sup => {
        if (sup?.documents) all.push(...sup.documents);
      });
      return all;
    };

    if (!isMultiDocumentMode()) {
      const firstDocWithAmount = getAllDocs().find(d => d.distributeAmount && parseFloat(d.distributeAmount) > 0);
      if (firstDocWithAmount) {
        if (config?.distributionType === 'consumption' && !billAmount) {
          setBillAmount(firstDocWithAmount.distributeAmount);
        } else if (config?.distributionType !== 'consumption' && !totalAmount) {
          setTotalAmount(firstDocWithAmount.distributeAmount);
        }
      }
    }

    // Recalculează valorile locale pentru validare (state-ul poate fi încă nesincronizat)
    const effectiveTotalAmount = totalAmount || (() => {
      const doc = getAllDocs().find(d => d.distributeAmount && parseFloat(d.distributeAmount) > 0);
      return doc ? doc.distributeAmount : '';
    })();
    const effectiveBillAmount = billAmount || effectiveTotalAmount;


    // Normalizează receptionMode: dacă e undefined, folosim 'per_association' ca default sigur
    const receptionMode = config.receptionMode || 'per_association';

    // Construiește obiectul newExpense bazat pe receptionMode și distributionType
    const newExpense = {
      name: selectedExpense,
      receptionMode: receptionMode,
      distributionType: config.distributionType
    };

    // Adaugă sume bazate pe distributionType
    if (config.distributionType === 'consumption') {
      if (!unitPrice) {
        alert('Completează prețul pe unitate');
        return;
      }
      newExpense.unitPrice = unitPrice;

      // Verifică receptionMode pentru consumption
      if (receptionMode === 'per_association') {
        if (!effectiveBillAmount) {
          alert('Completează suma totală');
          return;
        }
        newExpense.billAmount = effectiveBillAmount;
      } else if (receptionMode === 'per_block') {
        const missingBlocks = (config.appliesTo?.blocks || []).filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
        // Calculează billAmount ca sumă totală
        newExpense.billAmount = Object.values(amounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toString();
      } else if (receptionMode === 'per_stair') {
        const missingStairs = (config.appliesTo?.stairs || []).filter(stairId => !amounts[stairId]);
        if (missingStairs.length > 0) {
          alert('Completează sumele pentru toate scările');
          return;
        }
        newExpense.amountsByStair = amounts;
        // Calculează billAmount ca sumă totală
        newExpense.billAmount = Object.values(amounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toString();
      }
    } else if (config.distributionType === 'individual') {
      // Verifică receptionMode pentru individual
      if (receptionMode === 'per_association') {
        if (!effectiveTotalAmount) {
          alert('Completează suma totală');
          return;
        }
        newExpense.amount = effectiveTotalAmount;
      } else if (receptionMode === 'per_block') {
        const missingBlocks = (config.appliesTo?.blocks || []).filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
      } else if (receptionMode === 'per_stair') {
        const missingStairs = (config.appliesTo?.stairs || []).filter(stairId => !amounts[stairId]);
        if (missingStairs.length > 0) {
          alert('Completează sumele pentru toate scările');
          return;
        }
        newExpense.amountsByStair = amounts;
      }
    } else if (config.distributionType === 'cotaParte') {
      // cotaParte - verificăm dacă e total sau per_block/per_stair
      if (receptionMode === 'per_association') {
        if (!effectiveTotalAmount) {
          alert('Completează suma totală');
          return;
        }
        newExpense.amount = effectiveTotalAmount;
      } else if (receptionMode === 'per_block') {
        // Verifică că toate blocurile au sume
        const missingBlocks = (config.appliesTo?.blocks || []).filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
      } else if (receptionMode === 'per_stair') {
        // Verifică că toate scările au sume
        const missingStairs = (config.appliesTo?.stairs || []).filter(stairId => !amounts[stairId]);
        if (missingStairs.length > 0) {
          alert('Completează sumele pentru toate scările');
          return;
        }
        newExpense.amountsByStair = amounts;
      }
    } else {
      // apartment, person - verificăm dacă e total sau per_block/per_stair
      if (receptionMode === 'per_association') {
        if (!effectiveTotalAmount) {
          alert('Completează suma totală');
          return;
        }
        newExpense.amount = effectiveTotalAmount;
      } else if (receptionMode === 'per_block') {
        // Verifică că toate blocurile au sume
        const missingBlocks = (config.appliesTo?.blocks || []).filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
      } else if (receptionMode === 'per_stair') {
        // Verifică că toate scările au sume
        const missingStairs = (config.appliesTo?.stairs || []).filter(stairId => !amounts[stairId]);
        if (missingStairs.length > 0) {
          alert('Completează sumele pentru toate scările');
          return;
        }
        newExpense.amountsByStair = amounts;
      }
    }

    // 🏢 Build invoices data from all suppliers
    let currentDist;
    if (receptionMode === 'per_block' || receptionMode === 'per_stair') {
      currentDist = Object.values(amounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toString();
    } else {
      currentDist = config.distributionType === 'consumption' ? billAmount : totalAmount;
    }

    const suppliers = getEffectiveSuppliers(config);
    const invoicesDataArray = [];
    const multiDoc = isMultiDocumentMode();

    // Validare documente parțial completate
    for (const supplier of suppliers) {
      const docs = getSupplierDocs(supplier.supplierId);
      const sName = supplier.supplierName || 'furnizor necunoscut';
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const hasNumber = doc.newDocNumber && doc.newDocNumber.trim();
        const hasAmount = doc.newDocAmount && parseFloat(doc.newDocAmount) > 0;
        const hasExisting = !!doc.selectedExistingInvoice;
        const isEmpty = !hasNumber && !hasAmount && !hasExisting;
        if (isEmpty) continue;
        if (hasExisting) {
          // Validare distributeAmount pentru document existent în multi-doc mode
          if (multiDoc) {
            const distAmt = parseFloat(doc.distributeAmount) || 0;
            if (distAmt <= 0) {
              alert(`Documentul "${doc.selectedExistingInvoice?.invoiceNumber || `Document ${i + 1}`}" de la ${sName} nu are sumă de distribuit completată.`);
              return;
            }
          }
          continue;
        }
        if (hasNumber && !hasAmount) {
          alert(`Documentul "${doc.newDocNumber}" de la ${sName} nu are sumă completată.`);
          return;
        }
        if (!hasNumber && hasAmount) {
          alert(`Un document de la ${sName} are sumă (${doc.newDocAmount} RON) dar nu are număr de document.`);
          return;
        }
        // Document complet (hasNumber && hasAmount) - validare distributeAmount în multi-doc
        if (multiDoc) {
          const distAmt = parseFloat(doc.distributeAmount) || 0;
          if (distAmt <= 0) {
            alert(`Documentul "${doc.newDocNumber}" de la ${sName} nu are sumă de distribuit completată.`);
            return;
          }
        }
      }
    }

    for (const supplier of suppliers) {
      const docs = getSupplierDocs(supplier.supplierId);
      const docsToProcess = docs.length > 0 ? docs : [defaultDoc()];

      for (const doc of docsToProcess) {
        const effectiveInvoice = doc.singleInvoice || (doc.newDocNumber && doc.newDocAmount ? {
          invoiceNumber: doc.newDocNumber,
          invoiceAmount: doc.newDocAmount,
          invoiceDate: doc.newDocDate || '',
          dueDate: doc.newDocDueDate || '',
          notes: '', pdfFile: null, isExisting: false
        } : null);

        if (effectiveInvoice && effectiveInvoice.invoiceNumber && effectiveInvoice.invoiceNumber.trim()) {
          const docDist = multiDoc ? (doc.distributeAmount || '0') : currentDist;
          invoicesDataArray.push({
            supplierId: supplier.supplierId,
            supplierName: supplier.supplierName,
            invoiceNumber: effectiveInvoice.invoiceNumber,
            invoiceAmount: effectiveInvoice.invoiceAmount,
            invoiceDate: effectiveInvoice.invoiceDate,
            dueDate: doc.newDocDueDate || effectiveInvoice.dueDate || '',
            notes: effectiveInvoice.notes || '',
            documentType: doc.documentType || 'factura',
            currentDistribution: docDist,
            distributeAmount: docDist,
            totalInvoiceAmount: effectiveInvoice.invoiceAmount || docDist,
            isPartialDistribution: false,
            isExistingInvoice: effectiveInvoice.isExisting || false,
            existingInvoiceId: effectiveInvoice.existingInvoiceId || null
          });
        }
      }
    }

    // Backward compat: set invoiceData to first invoice
    if (invoicesDataArray.length > 0) {
      newExpense.invoiceData = invoicesDataArray[0];
      newExpense.pdfFile = null;
    }
    // Multi-supplier: set invoicesData array
    if (invoicesDataArray.length > 1) {
      newExpense.invoicesData = invoicesDataArray;
    }


    // Adaugă facturi separate per bloc/scară dacă există
    if (Object.keys(separateInvoices).length > 0) {
      newExpense.separateInvoicesData = separateInvoices;
      // Adaugă și amounts pentru a ști care e suma pentru fiecare entitate
      newExpense.entityAmounts = amounts;
    }


    try {
      if (editingExpense) {
        // Mod editare - folosește handleUpdateExpense
        await handleUpdateExpense(editingExpense.id, newExpense);
      } else {
        // Mod adăugare - folosește handleAddExpense
        await handleAddExpense(newExpense);
      }
      onClose();
      resetForm();
    } catch (error) {
      console.error('Eroare la salvarea cheltuielii:', error);
      alert('Eroare la salvarea cheltuielii: ' + error.message);
    }
  };

  if (!isOpen) return null;

  const config = selectedExpense ? getExpenseConfigNormalized(selectedExpense) : null;

  // Grupează scările per bloc pentru afișare
  const blocksWithStairs = blocks?.map(block => ({
    ...block,
    stairs: stairs?.filter(stair => stair.blockId === block.id) || []
  })) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0 ${
          monthType === 'historic'
            ? 'bg-gradient-to-r from-gray-600 to-gray-700'
            : monthType === 'next'
            ? 'bg-gradient-to-r from-green-600 to-green-700'
            : 'bg-gradient-to-r from-indigo-600 to-blue-700'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                {editingExpense ? (<>✏️ Editează distribuirea</>) : (<><Share2 className="w-5 h-5" /> Distribuie Cheltuială</>)}
              </h2>
              <p className="text-white/80 text-xs sm:text-sm">{currentMonth}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 flex-1 overflow-y-auto min-h-0">
          <div className="space-y-3">
            {/* Dropdown Cheltuială - doar când adaugi cheltuială nouă */}
            {!editingExpense && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cheltuială *
                </label>
                <select
                  value={selectedExpense}
                  onChange={(e) => {
                    setSelectedExpense(e.target.value);
                    setAmounts({});
                    setTotalAmount('');
                    setUnitPrice('');
                    setBillAmount('');
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="">Selectează cheltuiala</option>
                  {availableExpenseTypes.map(expenseType => (
                    <option key={expenseType.name} value={expenseType.name}>
                      {expenseType.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Info despre cheltuiala selectată */}
            {selectedExpense && config && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900">
                      {selectedExpense}
                    </div>
                    <div className="text-xs text-blue-700 mt-0.5">
                      📄 Factură: {
                        config.invoiceMode === 'single' ? 'O singură factură' :
                        config.invoiceMode === 'separate' ? 'Facturi separate' : 'O singură factură'
                      }
                    </div>
                    <div className="text-xs text-blue-700">
                      💡 Sume: {
                        config.receptionMode === 'total' ? 'Pe asociație' :
                        config.receptionMode === 'per_association' ? 'Pe asociație' :
                        config.receptionMode === 'per_block' ? 'Per bloc' :
                        config.receptionMode === 'per_stair' ? 'Per scară' : 'Pe asociație'
                      }
                    </div>
                    <div className="text-xs text-blue-700">
                      📊 Distribuție: {
                        config.distributionType === 'apartment' ? 'Pe apartament' :
                        config.distributionType === 'person' ? 'Pe persoană' :
                        config.distributionType === 'consumption' ? `Pe consum (${getConsumptionUnit(config)})` :
                        config.distributionType === 'individual' ? 'Pe apartament (individual)' :
                        config.distributionType === 'cotaParte' ? 'Pe cotă parte indiviză' : config.distributionType
                      }
                    </div>
                    {(() => {
                      const suppliers = getEffectiveSuppliers(config);
                      return suppliers.length > 0 ? (
                        <div className="text-xs text-blue-700">
                          🏢 Furnizor{suppliers.length > 1 ? 'i' : ''}: {suppliers.map(s => s.supplierName).join(', ')}
                        </div>
                      ) : (
                        <div className="text-xs text-orange-700 font-medium">
                          ⚠️ Furnizor neconfigurat - apasă Configurare cheltuială
                        </div>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => {
                      if (setConfigModalInitialTab) {
                        setConfigModalInitialTab(getEffectiveSuppliers(config).length > 0 ? 'general' : 'supplier');
                      }
                      setSelectedExpenseForConfig(selectedExpense);
                      setShowExpenseConfig(true);
                    }}
                    className={`px-2 py-1.5 ${getEffectiveSuppliers(config).length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap text-xs`}
                    title="Configurează cheltuiala"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Configurare cheltuială
                  </button>
                </div>
              </div>
            )}

            {/* Document justificativ inline */}
            {selectedExpense && config && renderInlineDocuments()}

            {/* Input-uri sume - DINAMIC bazat pe receptionMode și distributionType */}
            {selectedExpense && config && (
              <>
                {/* CONSUMPTION - verifică și receptionMode */}
                {config.distributionType === 'consumption' && (
                  <div className="space-y-3">
                    {/* Dacă e total, un singur câmp pentru sumă */}
                    {config.receptionMode === 'per_association' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sumă de distribuit (RON) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={billAmount}
                          onChange={(e) => { if (!isMultiDocumentMode()) setBillAmount(e.target.value); }}
                          readOnly={isMultiDocumentMode()}
                          className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${isMultiDocumentMode() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preț pe unitate (RON/{getConsumptionUnit(config)}) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    {/* Dacă e per_block, câmpuri pe bloc - DOAR pentru blocurile bifate */}
                    {config.receptionMode === 'per_block' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per bloc (din factură) *
                        </div>
                        {blocks.filter(block => config.appliesTo?.blocks?.includes(block.id)).map(block => (
                            <div key={block.id}>
                              <label className="block text-sm text-gray-700 mb-1">
                                🏢 {block.name}
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={amounts[block.id] || ''}
                                onChange={(e) => setAmounts({ ...amounts, [block.id]: e.target.value })}
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                placeholder="Sumă (RON)"
                              />
                            </div>
                        ))}
                      </div>
                    )}

                    {/* Dacă e per_stair, câmpuri pe scară - DOAR pentru scările bifate */}
                    {config.receptionMode === 'per_stair' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per scară (din factură) *
                        </div>
                        {blocksWithStairs.map(block => {
                          const blockStairs = block.stairs.filter(stair =>
                            config.appliesTo?.stairs?.includes(stair.id)
                          );
                          if (blockStairs.length === 0) return null;

                          return (
                            <div key={block.id} className="space-y-2">
                              <div className="text-xs font-medium text-gray-600">{block.name}</div>
                              {blockStairs.map(stair => (
                                  <div key={stair.id} className="ml-4">
                                    <label className="block text-sm text-gray-700 mb-1">
                                      🏢 {stair.name}
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={amounts[stair.id] || ''}
                                      onChange={(e) => setAmounts({ ...amounts, [stair.id]: e.target.value })}
                                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                      placeholder="Sumă (RON)"
                                    />
                                  </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* INDIVIDUAL - verifică și receptionMode */}
                {config.distributionType === 'individual' && (
                  <>
                    {/* MODE: TOTAL */}
                    {config.receptionMode === 'per_association' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sumă de distribuit (RON) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={totalAmount}
                          onChange={(e) => { if (!isMultiDocumentMode()) setTotalAmount(e.target.value); }}
                          readOnly={isMultiDocumentMode()}
                          className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${isMultiDocumentMode() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    )}

                    {/* MODE: PER_BLOCK - DOAR pentru blocurile bifate */}
                    {config.receptionMode === 'per_block' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per bloc *
                        </div>
                        {blocks.filter(block => config.appliesTo?.blocks?.includes(block.id)).map(block => (
                            <div key={block.id}>
                              <label className="block text-sm text-gray-700 mb-1">
                                🏢 {block.name}
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={amounts[block.id] || ''}
                                onChange={(e) => setAmounts({ ...amounts, [block.id]: e.target.value })}
                                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Sumă (RON)"
                              />
                            </div>
                        ))}
                      </div>
                    )}

                    {/* MODE: PER_STAIR - DOAR pentru scările bifate (INDIVIDUAL) */}
                    {config.receptionMode === 'per_stair' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per scară *
                        </div>
                        {blocksWithStairs.map(block => {
                          const blockStairs = block.stairs.filter(stair =>
                            config.appliesTo?.stairs?.includes(stair.id)
                          );
                          if (blockStairs.length === 0) return null;

                          return (
                            <div key={block.id} className="space-y-2">
                              <div className="text-xs font-medium text-gray-600">{block.name}</div>
                              {blockStairs.map(stair => (
                                  <div key={stair.id} className="ml-4">
                                    <label className="block text-sm text-gray-700 mb-1">
                                      🏢 {stair.name}
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={amounts[stair.id] || ''}
                                      onChange={(e) => setAmounts({ ...amounts, [stair.id]: e.target.value })}
                                      className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                      placeholder="Sumă (RON)"
                                    />
                                  </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* APARTMENT / PERSON - poate fi total SAU defalcat */}
                {(config.distributionType === 'apartment' || config.distributionType === 'person') && (
                  <>
                    {/* MODE: TOTAL */}
                    {config.receptionMode === 'per_association' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sumă de distribuit (RON) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={totalAmount}
                          onChange={(e) => { if (!isMultiDocumentMode()) setTotalAmount(e.target.value); }}
                          readOnly={isMultiDocumentMode()}
                          className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${isMultiDocumentMode() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    )}

                    {/* MODE: PER_BLOCK - DOAR pentru blocurile bifate */}
                    {config.receptionMode === 'per_block' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per bloc *
                        </div>
                        {config.appliesTo?.blocks?.map(blockId => {
                          const block = blocks.find(b => b.id === blockId);
                          if (!block) return null;
                          return (
                            <div key={blockId}>
                              <label className="block text-sm text-gray-700 mb-1">
                                🏢 {block.name}
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={amounts[blockId] || ''}
                                onChange={(e) => setAmounts({ ...amounts, [blockId]: e.target.value })}
                                placeholder="Suma (RON)"
                                className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* MODE: PER_STAIR - DOAR pentru scările bifate (APARTMENT/PERSON) */}
                    {config.receptionMode === 'per_stair' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per scară *
                        </div>
                        {blocksWithStairs.map(block => {
                          const blockStairs = block.stairs.filter(stair =>
                            config.appliesTo?.stairs?.includes(stair.id)
                          );
                          if (blockStairs.length === 0) return null;

                          return (
                            <div key={block.id} className="space-y-2">
                              <div className="text-xs font-medium text-gray-600">{block.name}</div>
                              {blockStairs.map(stair => (
                                  <div key={stair.id} className="ml-4">
                                    <label className="block text-sm text-gray-700 mb-1">
                                      🏢 {stair.name}
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={amounts[stair.id] || ''}
                                      onChange={(e) => setAmounts({ ...amounts, [stair.id]: e.target.value })}
                                      placeholder="Suma (RON)"
                                      className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* COTA PARTE - verifică și receptionMode */}
                {(config.distributionType === 'cotaParte') && (
                  <>
                    {/* MODE: TOTAL */}
                    {config.receptionMode === 'per_association' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sumă de distribuit (RON) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={totalAmount}
                          onChange={(e) => { if (!isMultiDocumentMode()) setTotalAmount(e.target.value); }}
                          readOnly={isMultiDocumentMode()}
                          className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${isMultiDocumentMode() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    )}

                    {/* MODE: PER_BLOCK - DOAR pentru blocurile bifate */}
                    {config.receptionMode === 'per_block' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per bloc *
                        </div>
                        {config.appliesTo?.blocks?.map(blockId => {
                          const block = blocks.find(b => b.id === blockId);
                          if (!block) return null;
                          return (
                            <div key={blockId}>
                              <label className="block text-sm text-gray-700 mb-1">
                                🏢 {block.name}
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={amounts[blockId] || ''}
                                onChange={(e) => setAmounts({ ...amounts, [blockId]: e.target.value })}
                                placeholder="Suma (RON)"
                                className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* MODE: PER_STAIR - DOAR pentru scările bifate (COTA PARTE) */}
                    {config.receptionMode === 'per_stair' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per scară *
                        </div>
                        {blocksWithStairs.map(block => {
                          const blockStairs = block.stairs.filter(stair =>
                            config.appliesTo?.stairs?.includes(stair.id)
                          );
                          if (blockStairs.length === 0) return null;

                          return (
                            <div key={block.id} className="space-y-2">
                              <div className="text-xs font-medium text-gray-600">{block.name}</div>
                              {blockStairs.map(stair => (
                                  <div key={stair.id} className="ml-4">
                                    <label className="block text-sm text-gray-700 mb-1">
                                      🏢 {stair.name}
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={amounts[stair.id] || ''}
                                      onChange={(e) => setAmounts({ ...amounts, [stair.id]: e.target.value })}
                                      placeholder="Suma (RON)"
                                      className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 py-3 bg-gray-50 border-t flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs sm:text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedExpense || getEffectiveSuppliers(config).length === 0}
            className="px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            title={getEffectiveSuppliers(config).length === 0 ? 'Configurează furnizorul mai întâi' : ''}
          >
            <Share2 className="w-3.5 h-3.5" />
            {editingExpense ? 'Salvează Modificări' : 'Distribuie Cheltuială'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default ExpenseEntryModal;
