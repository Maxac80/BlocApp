/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { X, Share2, FileText, Wrench, Truck, Tag } from 'lucide-react';

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
    singleInvoice: null, distributeAmount: '',
    // isAddingNew: user a ales explicit "Adaugă factură nouă" în dropdown → afișăm form-ul
    isAddingNew: false
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

      // Populează sumele pentru consumption sau alte tipuri (format la 2 zecimale dacă e valid număr)
      const fmt = (v) => {
        const n = parseFloat(v);
        return !isNaN(n) ? n.toFixed(2) : (v?.toString() || '');
      };
      if (editingExpense.isUnitBased) {
        setUnitPrice(fmt(editingExpense.unitPrice));
        setBillAmount(fmt(editingExpense.billAmount));
      } else {
        setTotalAmount(fmt(editingExpense.amount));
      }

      // Populează invoice data din editingExpense (salvate în sheet)
      // Helper: construiește un obiect pseudo-invoice pentru afișare read-only în edit mode.
      // Why: în edit mode nu vrem să arătăm câmpuri editabile pentru factură (Nr, Sumă, Data,
      // Scadență), ci doar suma de distribuit pentru această cheltuială. Setând
      // selectedExistingInvoice populat, modalul afișează dropdown-ul read-only + câmpul de distribuit.
      // În edit mode, preferăm factura REALĂ din colecție (cu remainingAmount/status actualizat),
      // ca să arătăm date corecte în mini-card și să potrivim id-ul cu opțiunile din dropdown.
      // Fallback la un pseudo-invoice doar dacă factura nu mai există în listă.
      const buildPseudoInvoice = (invData) => {
        if (!invData.invoiceNumber) return null;
        if (getInvoiceByNumber) {
          const real = getInvoiceByNumber(invData.invoiceNumber, invData.supplierId);
          if (real) return real;
        }
        const total = parseFloat(invData.invoiceAmount || invData.totalInvoiceAmount) || 0;
        return {
          id: invData.existingInvoiceId || `edit-${invData.invoiceNumber}`,
          invoiceNumber: invData.invoiceNumber,
          invoiceAmount: total,
          totalInvoiceAmount: total,
          totalAmount: total,
          remainingAmount: total,
          invoiceDate: invData.invoiceDate || '',
          dueDate: invData.dueDate || '',
          isExisting: !!invData.existingInvoiceId
        };
      };

      if (editingExpense.invoicesData && editingExpense.invoicesData.length > 0) {
        // Multi-document invoices — group by supplierId
        const newSupplierInvoices = {};
        for (const invData of editingExpense.invoicesData) {
          const invAmount = invData.invoiceAmount?.toString() || invData.totalInvoiceAmount?.toString() || '';
          const distAmount = invData.distributeAmount?.toString() || invData.currentDistribution?.toString() || invAmount;
          const pseudoInv = buildPseudoInvoice(invData);
          const docEntry = {
            documentType: invData.documentType || 'factura',
            selectedExistingInvoice: pseudoInv,
            // Reținem factura originală din edit mode — ca să rămână disponibilă în dropdown
            // chiar dacă user o "deselectează" accidental (altfel ar dispărea dropdown-ul
            // pentru facturile complet distribuite care nu apar în getPartiallyDistributedInvoices).
            originalExistingInvoice: pseudoInv,
            originalDistributeAmount: distAmount,
            newDocNumber: '',
            newDocAmount: '',
            newDocDate: '',
            newDocDueDate: '',
            distributeAmount: distAmount,
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
        const distAmount = invData.distributeAmount?.toString() || invData.currentDistribution?.toString() || invAmount;
        const suppliers = getEffectiveSuppliers(expenseConfig);
        const targetSupplierId = invData.supplierId || suppliers[0]?.supplierId;
        const pseudoInv = buildPseudoInvoice(invData);
        if (targetSupplierId) {
          setSupplierInvoices({
            [targetSupplierId]: {
              documents: [{
                documentType: invData.documentType || 'factura',
                selectedExistingInvoice: pseudoInv,
                originalExistingInvoice: pseudoInv,
                originalDistributeAmount: distAmount,
                newDocNumber: '',
                newDocAmount: '',
                newDocDate: '',
                newDocDueDate: '',
                distributeAmount: distAmount,
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
    // Opțiunea specială "__new__" → utilizatorul vrea să introducă factură nouă
    if (invoiceId === '__new__') {
      updateSupplierDocument(supplierId, docIndex, {
        isAddingNew: true,
        selectedExistingInvoice: null,
        newDocNumber: '', newDocAmount: '', newDocDate: '', newDocDueDate: '',
        distributeAmount: '', singleInvoice: null
      });
      return;
    }
    if (!invoiceId) {
      updateSupplierDocument(supplierId, docIndex, { isAddingNew: false, selectedExistingInvoice: null, distributeAmount: '', singleInvoice: null });
      return;
    }
    const available = getAvailableInvoicesForSupplier(supplierId, docIndex);
    let invoice = available.find(inv => inv.id === invoiceId);
    // Fallback: dacă nu e în available (ex: factură fully distributed din edit mode),
    // cautăm în originalExistingInvoice salvat la inițializare
    if (!invoice) {
      const docs = getSupplierDocs(supplierId);
      const doc = docs[docIndex] || {};
      if (doc.originalExistingInvoice?.id === invoiceId) {
        invoice = doc.originalExistingInvoice;
      }
    }
    if (invoice) {
      // Dacă re-selectăm factura originală din edit mode, restaurăm distributeAmount-ul
      // salvat la inițializare (undo pentru detașare accidentală).
      // Altfel calculăm max disponibil = total - distribuit pe ALTE cheltuieli.
      const docs = getSupplierDocs(supplierId);
      const existingDoc = docs[docIndex] || {};
      const isReselectingOriginal = existingDoc.originalExistingInvoice?.id === invoiceId;
      const originalDistAmount = existingDoc.originalDistributeAmount;

      const totalInv = parseFloat(invoice.totalInvoiceAmount || invoice.totalAmount || 0);
      const distOnOthers = (invoice.distributionHistory || [])
        .filter(d => d.expenseName !== selectedExpense && d.expenseType !== selectedExpense)
        .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      const maxAvailable = Math.max(0, totalInv - distOnOthers);
      const remainingStr = maxAvailable.toFixed(2);
      const finalDistAmount = (isReselectingOriginal && originalDistAmount) ? originalDistAmount : remainingStr;
      // Auto-fill total doar dacă e un singur furnizor + un singur document
      if (!isMultiDocumentMode()) {
        if (config?.distributionType === 'consumption') {
          setBillAmount(finalDistAmount);
        } else {
          setTotalAmount(finalDistAmount);
        }
      }
      updateSupplierDocument(supplierId, docIndex, {
        isAddingNew: false,
        selectedExistingInvoice: invoice,
        newDocNumber: '',
        newDocAmount: '',
        newDocDate: '',
        newDocDueDate: '',
        distributeAmount: finalDistAmount,
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

    // Stare live pentru mini-card factură + clamp input (evită float mess cu toFixed(2))
    const selTotalInv = selExisting ? parseFloat(selExisting.totalInvoiceAmount || selExisting.totalAmount || selExisting.amount || 0) : 0;
    const selHistory = selExisting?.distributionHistory || [];
    // Distribuții pe ALTE cheltuieli, defalcate per cheltuială (nu lumped)
    const selOtherDistributions = selHistory
      .filter(d => d.expenseName !== selectedExpense && d.expenseType !== selectedExpense && parseFloat(d.amount) > 0);
    const selDistributedToOthers = selOtherDistributions
      .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
    const selMaxForThisExpense = Math.max(0, selTotalInv - selDistributedToOthers);
    const selCurrentInput = parseFloat(doc.distributeAmount) || 0;
    const selRemainingLive = Math.max(0, selMaxForThisExpense - selCurrentInput);
    const selPercent = selTotalInv > 0
      ? Math.min(100, Math.round(((selDistributedToOthers + selCurrentInput) / selTotalInv) * 100))
      : 0;

    return (
      <div key={docIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
        {/* Afișăm header doar în mod multi-document (ca să numerotăm: Document 1, Document 2...).
            Pentru single-doc, titlul "Documente justificative" e deja la nivel de secțiune. */}
        {totalDocs > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Document {docIndex + 1}
            </div>
            <button
              onClick={() => removeDocumentFromSupplier(sid, docIndex)}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Șterge document"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dropdown selectează document existent SAU adaugă nou.
            Tip document NU apare aici — apare doar în form-ul de "Adaugă document nou"
            pentru că la selectarea unei facturi existente tipul e deja cunoscut. */}
        {!selExisting && !doc.isAddingNew && (() => {
          const optionsList = [...available];
          // În edit mode: păstrează factura originală ca opțiune (chiar dacă detașată)
          const origInv = doc.originalExistingInvoice;
          if (origInv && !optionsList.some(a => a.id === origInv.id)) {
            optionsList.push(origInv);
          }
          return (
            <div>
              <select
                value=""
                onChange={(e) => handleSelectExistingInvoice(sid, docIndex, e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">Selectează factura existentă sau adaugă nouă...</option>
                {optionsList.map(avInv => {
                  const totalAv = parseFloat(avInv.totalInvoiceAmount || avInv.totalAmount || avInv.amount || 0);
                  // Rămas = ce poate fi distribuit pe cheltuiala curentă
                  // = total - distribuit pe ALTE cheltuieli (nu scădem și distribuția curentă
                  // pentru că ea e în curs de editare și se "eliberează")
                  const distOnOthers = (avInv.distributionHistory || [])
                    .filter(d => d.expenseName !== selectedExpense && d.expenseType !== selectedExpense)
                    .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
                  const liveRemaining = Math.max(0, totalAv - distOnOthers);
                  return (
                    <option key={avInv.id} value={avInv.id}>
                      {avInv.invoiceNumber} — Total: {totalAv.toFixed(2)} RON — Rămas: {liveRemaining.toFixed(2)} RON
                    </option>
                  );
                })}
                <option value="__new__">➕ Adaugă factură nouă</option>
              </select>
            </div>
          );
        })()}

        {/* Form adăugare factură nouă — afișat într-un chenar propriu, cu buton X de anulare.
            Apare DOAR după ce user alege explicit "➕ Adaugă factură nouă" din dropdown. */}
        {!selExisting && doc.isAddingNew && (() => {
          return (
          <div className="bg-white border border-indigo-300 rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-700" />
                <span className="text-sm font-semibold text-gray-800">Factură nouă</span>
              </div>
              <button
                onClick={() => updateSupplierDocument(sid, docIndex, { isAddingNew: false, newDocNumber: '', newDocAmount: '', newDocDate: '', newDocDueDate: '', distributeAmount: '', singleInvoice: null })}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Anulează adăugare"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {/* Tip document — apare aici, pentru că doar la adăugare tipul e necunoscut */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tip document *</label>
                <select
                  value={docType}
                  onChange={(e) => updateSupplierDocument(sid, docIndex, { documentType: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  {documentTypes.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>
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
          </div>
          );
        })()}

        {/* Sumă de distribuit — în afara chenarului "Factură nouă" (uniform cu pattern-ul
            pentru factura existentă, unde input-ul e sub card). */}
        {!selExisting && doc.isAddingNew && (
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

        {/* Info document selectat — mini-card factură (sumele sunt sincronizate live cu input-ul) */}
        {selExisting && (
          <>
            <div className="bg-white border border-green-300 rounded-lg shadow-sm overflow-hidden">
              {/* Header: icon + nr factură + badge status live + buton detașare */}
              <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-green-700 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 truncate">Factură #{selExisting.invoiceNumber}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    selPercent >= 100 ? 'bg-green-100 text-green-700' :
                    selPercent > 0 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {selPercent >= 100 ? 'Distribuită' : selPercent > 0 ? `Parțial ${selPercent}%` : 'Nedistribuită'}
                  </span>
                  <button
                    onClick={() => handleSelectExistingInvoice(sid, docIndex, '')}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Detașează factura (alegi alta sau creezi document nou)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Body: breakdown live */}
              <div className="px-3 py-2 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total factură:</span>
                  <span className="font-semibold text-gray-800">{selTotalInv.toFixed(2)} RON</span>
                </div>
                {/* Breakdown per cheltuială — fiecare cheltuială distribuită pe această factură */}
                {selOtherDistributions.map((d, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-gray-500">→ {d.expenseName || d.expenseType}:</span>
                    <span className="font-medium text-gray-600">{parseFloat(d.amount).toFixed(2)} RON</span>
                  </div>
                ))}
                {selectedExpense && (
                  <div className="flex justify-between text-xs">
                    <span className="text-indigo-600">→ {selectedExpense}:</span>
                    <span className="font-semibold text-indigo-600">{selCurrentInput.toFixed(2)} RON</span>
                  </div>
                )}
                <div className="flex justify-between text-xs pt-1 mt-1 border-t border-gray-100">
                  <span className="text-gray-500">Rămas de distribuit:</span>
                  <span className={`font-semibold ${selRemainingLive > 0.01 ? 'text-orange-600' : 'text-green-600'}`}>
                    {selRemainingLive.toFixed(2)} RON
                  </span>
                </div>
                {(selExisting.invoiceDate || selExisting.dueDate) && (
                  <div className="pt-1.5 mt-1.5 border-t border-gray-100 flex justify-between text-[11px] text-gray-500">
                    {selExisting.invoiceDate && (
                      <span>📅 Emisă: {formatDateRo(selExisting.invoiceDate)}</span>
                    )}
                    {selExisting.dueDate && (
                      <span>⏰ Scadență: {formatDateRo(selExisting.dueDate)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sumă de distribuit (RON) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={doc.distributeAmount || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  // Max = totalul facturii - ce e deja distribuit pe alte cheltuieli.
                  // Nu folosim remainingAmount direct pentru că acela scade deja distribuția curentă.
                  // toFixed(2) evită artefacte float (ex: 40.81 → 40.809999999999945).
                  const finalVal = (selMaxForThisExpense > 0 && parseFloat(val) > selMaxForThisExpense)
                    ? selMaxForThisExpense.toFixed(2)
                    : val;
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
            <div className="flex items-center gap-2 mt-4 mb-2 px-3 py-2 bg-indigo-50 border-l-4 border-indigo-500 rounded-r">
              <Truck className="w-5 h-5 text-indigo-700" />
              <span className="text-base font-bold text-gray-800 uppercase tracking-wide">
                {supplier.supplierName}
              </span>
            </div>
          )}
          <div className="space-y-3">
            {docsToRender.map((doc, idx) => renderDocumentCard(supplier, doc, idx, docsToRender.length))}
          </div>
          {/* Avertisment dacă furnizorul nu are niciun document completat */}
          {(() => {
            const hasAnyDoc = docsToRender.some(d =>
              d.selectedExistingInvoice ||
              (d.newDocNumber && d.newDocNumber.trim() && d.newDocAmount && parseFloat(d.newDocAmount) > 0)
            );
            if (hasAnyDoc) return null;
            return (
              <div className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                <span>⚠</span> Asociază o factură pentru {supplier.supplierName}
              </div>
            );
          })()}
          {/* "Adaugă alt document" apare doar dacă toate documentele existente au factură
              selectată sau sunt în curs de adăugare — altfel user are deja un slot gol. */}
          {docsToRender.every(d => d.selectedExistingInvoice || d.isAddingNew) && (
            <button
              onClick={() => addDocumentToSupplier(sid)}
              className="mt-1 px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex items-center gap-1"
            >
              <span>+</span> Adaugă altă factură
            </button>
          )}
        </div>
      );
    });
  };

  // Helper: returnează lista furnizorilor care NU au niciun document completat
  // (fie factură selectată, fie câmpuri Nr.+Sumă pentru factură nouă).
  // Folosit pentru a bloca "Salvează" și a afișa mesaj clar despre ce lipsește.
  const getSuppliersWithoutDocs = () => {
    if (!config) return [];
    const suppliers = getEffectiveSuppliers(config);
    return suppliers.filter(s => {
      const docs = getSupplierDocs(s.supplierId);
      return !docs.some(d =>
        d.selectedExistingInvoice ||
        (d.newDocNumber && d.newDocNumber.trim() && d.newDocAmount && parseFloat(d.newDocAmount) > 0)
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

    // Pentru multi-doc mode, calculăm SUMA tuturor distribuțiilor din toate facturile
    // (state-ul billAmount/totalAmount poate fi nesincronizat cu auto-sum useEffect).
    const computeMultiDocTotal = () => {
      return getAllDocs().reduce((sum, d) => sum + (parseFloat(d.distributeAmount) || 0), 0);
    };

    const effectiveTotalAmount = isMultiDocumentMode()
      ? computeMultiDocTotal().toString()
      : (totalAmount || (() => {
          const doc = getAllDocs().find(d => d.distributeAmount && parseFloat(d.distributeAmount) > 0);
          return doc ? doc.distributeAmount : '';
        })());
    const effectiveBillAmount = isMultiDocumentMode()
      ? computeMultiDocTotal().toString()
      : (billAmount || effectiveTotalAmount);


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
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                {editingExpense ? (<>✏️ Editează distribuirea</>) : (<><Share2 className="w-5 h-5" /> Distribuie Cheltuială</>)}
              </h2>
              <p className="text-white/80 text-xs sm:text-sm">
                {selectedExpense && <span className="font-medium">{selectedExpense}</span>}
                {selectedExpense && <span className="mx-1">·</span>}
                <span>Întreținere {currentMonth}</span>
                {currentSheet?.consumptionMonth && (
                  <>
                    <span className="mx-1">·</span>
                    <span>Consum {currentSheet.consumptionMonth}</span>
                  </>
                )}
              </p>
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

            {/* Card info cheltuială — numele cheltuielii iese în evidență, urmat de preview
                al setărilor (factură/sume/distribuție). Furnizorii nu mai apar aici — sunt
                deja evidențiați clar în secțiunile de mai jos. */}
            {selectedExpense && config && (() => {
              const hasNoSuppliers = getEffectiveSuppliers(config).length === 0;
              // Suma totală distribuită live: sumă din toate distributeAmount
              const liveTotal = Object.values(supplierInvoices).reduce((sum, sup) => {
                if (!sup?.documents) return sum;
                return sum + sup.documents.reduce((dSum, d) => dSum + (parseFloat(d.distributeAmount) || 0), 0);
              }, 0);
              return (
                <div className="bg-white border-2 border-indigo-200 rounded-lg overflow-hidden shadow-sm">
                  {/* Header: nume cheltuială + total distribuit (fără buton Configurare —
                      mutat în secțiunea de jos lângă setări, ca să nu aglomereze headerul). */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-5 h-5 text-indigo-700 flex-shrink-0" />
                      <span className="text-lg font-bold text-gray-900 uppercase tracking-wide truncate">
                        {selectedExpense}
                      </span>
                    </div>
                    {liveTotal > 0 && (
                      <div className="px-2.5 py-1 bg-white border border-indigo-300 rounded-md self-start sm:self-auto">
                        <div className="text-[10px] text-gray-500 leading-none">Total distribuit</div>
                        <div className="text-sm font-bold text-indigo-700 leading-tight">{liveTotal.toFixed(2)} RON</div>
                      </div>
                    )}
                  </div>
                  {/* Preview setări + buton Configurare */}
                  <div className="px-3 py-2 flex items-end justify-between gap-3">
                    <div className="space-y-0.5 text-xs text-gray-700 flex-1 min-w-0">
                      {/* Factură: arătăm doar când NU e default ("O singură factură"),
                          adică doar când avem facturi separate per bloc/scară. */}
                      {config.invoiceMode === 'separate' && (
                        <div>
                          <span className="text-gray-500">📄 Factură:</span>{' '}
                          <span className="font-medium">Facturi separate</span>
                        </div>
                      )}
                      {/* Sume: arătăm doar când NU e default ("Pe asociație") */}
                      {(config.receptionMode === 'per_block' || config.receptionMode === 'per_stair') && (
                        <div>
                          <span className="text-gray-500">💡 Sume:</span>{' '}
                          <span className="font-medium">{
                            config.receptionMode === 'per_block' ? 'Per bloc' : 'Per scară'
                          }</span>
                        </div>
                      )}
                      {/* Distribuție: mereu vizibilă (variază mult: pe apartament/persoană/consum/etc) */}
                      <div>
                        <span className="text-gray-500">📊 Distribuție:</span>{' '}
                        <span className="font-medium">{
                          config.distributionType === 'apartment' ? 'Pe apartament' :
                          config.distributionType === 'person' ? 'Pe persoană' :
                          config.distributionType === 'consumption' ? `Pe consum (${getConsumptionUnit(config)})` :
                          config.distributionType === 'individual' ? 'Pe apartament (individual)' :
                          config.distributionType === 'cotaParte' ? 'Pe cotă parte indiviză' : config.distributionType
                        }</span>
                      </div>
                      {hasNoSuppliers && (
                        <div className="text-orange-700 font-medium pt-1">
                          ⚠️ Furnizor neconfigurat — apasă Configurare
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (setConfigModalInitialTab) {
                          setConfigModalInitialTab(hasNoSuppliers ? 'supplier' : 'general');
                        }
                        setSelectedExpenseForConfig(selectedExpense);
                        setShowExpenseConfig(true);
                      }}
                      className={`px-2 py-1.5 ${hasNoSuppliers ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap text-xs flex-shrink-0`}
                      title="Configurează cheltuiala"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Configurare
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Preț pe unitate — pus ÎNAINTEA facturilor pentru cheltuieli pe consum
                (admin introduce întâi prețul unitar, apoi selectează facturile).
                Format la 2 zecimale pe blur (ex: 30 → 30.00). */}
            {selectedExpense && config && config.distributionType === 'consumption' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preț pe unitate (RON/{getConsumptionUnit(config)}) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  onBlur={(e) => {
                    const num = parseFloat(e.target.value);
                    if (!isNaN(num)) setUnitPrice(num.toFixed(2));
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                />
              </div>
            )}

            {selectedExpense && config && renderInlineDocuments()}

            {/* Input-uri sume - DINAMIC bazat pe receptionMode și distributionType */}
            {selectedExpense && config && (
              <>
                {/* CONSUMPTION - verifică și receptionMode */}
                {config.distributionType === 'consumption' && (
                  <div className="space-y-3">
                    {/* Câmpul total "Sumă de distribuit" apare DOAR dacă nu există furnizori configurați
                        (caz rar — fallback). Când există furnizori, totalul se sincronizează automat
                        din input-urile per-factură de mai sus, deci câmpul ar fi un duplicat confuz. */}
                    {config.receptionMode === 'per_association' && getEffectiveSuppliers(config).length === 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sumă de distribuit (RON) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={billAmount}
                          onChange={(e) => setBillAmount(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                        />
                      </div>
                    )}

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
          {(() => {
            const noSuppliers = getEffectiveSuppliers(config).length === 0;
            const missingDocs = getSuppliersWithoutDocs();
            const isDisabled = !selectedExpense || noSuppliers || missingDocs.length > 0;
            const title = noSuppliers
              ? 'Configurează furnizorul mai întâi'
              : missingDocs.length > 0
                ? `Completează factura pentru: ${missingDocs.map(s => s.supplierName).join(', ')}`
                : '';
            return (
              <button
                onClick={handleSubmit}
                disabled={isDisabled}
                className="px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                title={title}
              >
                <Share2 className="w-3.5 h-3.5" />
                {editingExpense ? 'Salvează Modificări' : 'Distribuie Cheltuială'}
              </button>
            );
          })()}
        </div>
      </div>

    </div>
  );
};

export default ExpenseEntryModal;
