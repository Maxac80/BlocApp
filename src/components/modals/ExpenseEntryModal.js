/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { X, Share2, FileText, Wrench } from 'lucide-react';

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
  const [singleInvoice, setSingleInvoice] = useState(null); // Pentru factură unică { invoiceNumber, date, pdf, notes }

  // Inline document state (înlocuiește InvoiceDetailsModal)
  const [documentType, setDocumentType] = useState('factura');
  const [selectedExistingInvoice, setSelectedExistingInvoice] = useState(null);
  const [newDocNumber, setNewDocNumber] = useState('');
  const [newDocAmount, setNewDocAmount] = useState('');
  const [newDocDate, setNewDocDate] = useState('');
  const [newDocDueDate, setNewDocDueDate] = useState('');

  // Reset când se deschide/închide modalul
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

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
      console.log('✏️ Pre-populating form with:', editingExpense);
      console.log('✏️ editingExpense.amountsByBlock:', editingExpense.amountsByBlock);
      console.log('✏️ editingExpense.amountsByStair:', editingExpense.amountsByStair);

      const expenseConfig = getExpenseConfigNormalized(editingExpense.name);
      console.log('✏️ Config receptionMode:', expenseConfig?.receptionMode);
      console.log('✏️ Full config:', expenseConfig);

      setSelectedExpense(editingExpense.name);

      // Populează sumele bazate pe distributionType și receptionMode
      if (editingExpense.amountsByBlock && Object.keys(editingExpense.amountsByBlock).length > 0) {
        console.log('✏️ Setting amounts from amountsByBlock:', editingExpense.amountsByBlock);
        setAmounts(editingExpense.amountsByBlock);
      } else if (editingExpense.amountsByStair && Object.keys(editingExpense.amountsByStair).length > 0) {
        console.log('✏️ Setting amounts from amountsByStair:', editingExpense.amountsByStair);
        setAmounts(editingExpense.amountsByStair);
      } else {
        console.log('✏️ No amounts to set, using empty object');
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
      if (editingExpense.invoiceData) {
        console.log('📋 Loading invoice data from editingExpense:', editingExpense.invoiceData);
        const invData = editingExpense.invoiceData;
        const invAmount = invData.invoiceAmount?.toString() || invData.totalInvoiceAmount?.toString() || '';

        // Populează câmpurile inline
        setDocumentType(invData.documentType || 'factura');
        setNewDocNumber(invData.invoiceNumber || '');
        setNewDocAmount(invAmount);
        setNewDocDate(invData.invoiceDate || '');
        setNewDocDueDate(invData.dueDate || '');

        // Populează și singleInvoice pentru handleSubmit
        setSingleInvoice({
          invoiceNumber: invData.invoiceNumber || '',
          invoiceAmount: invAmount,
          invoiceDate: invData.invoiceDate || '',
          dueDate: invData.dueDate || '',
          notes: invData.notes || '',
          pdfFile: null,
          isExisting: !!invData.existingInvoiceId,
          existingInvoiceId: invData.existingInvoiceId || null
        });
      }

      if (editingExpense.separateInvoicesData) {
        console.log('📋 Loading separateInvoices from editingExpense:', editingExpense.separateInvoicesData);
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
    setSingleInvoice(null);
    setDocumentType('factura');
    setSelectedExistingInvoice(null);
    setNewDocNumber('');
    setNewDocAmount('');
    setNewDocDate('');
    setNewDocDueDate('');
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

  // Obține lista de documente parțial distribuite
  // Pentru facturi: filtrează pe furnizor/expenseType; pentru alte tipuri: arată toate de acel tip
  const availableInvoices = selectedExpense && getPartiallyDistributedInvoices
    ? (getPartiallyDistributedInvoices(
        documentType === 'factura' ? selectedExpense : null,
        documentType
      ) || [])
    : [];

  // Handler pentru selectarea unei facturi existente
  const handleSelectExistingInvoice = (invoiceId) => {
    if (!invoiceId) {
      setSelectedExistingInvoice(null);
      return;
    }
    const invoice = availableInvoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setSelectedExistingInvoice(invoice);
      // Auto-fill suma din factură
      const remaining = invoice.remainingAmount || invoice.totalInvoiceAmount || 0;
      // Completează suma în câmpul corespunzător
      if (config?.distributionType === 'consumption') {
        setBillAmount(remaining.toString());
      } else {
        setTotalAmount(remaining.toString());
      }
      // Populează singleInvoice pentru compatibilitate cu handleSubmit
      setSingleInvoice({
        invoiceNumber: invoice.invoiceNumber,
        invoiceAmount: (invoice.totalInvoiceAmount || 0).toString(),
        invoiceDate: invoice.invoiceDate || '',
        dueDate: invoice.dueDate || '',
        notes: invoice.notes || '',
        pdfFile: null,
        isExisting: true,
        existingInvoiceId: invoice.id
      });
      // Resetează câmpurile de document nou
      setNewDocNumber('');
      setNewDocAmount('');
      setNewDocDate('');
    }
  };

  // Handler pentru completarea unui document nou inline
  const handleNewDocAmountChange = (value) => {
    setNewDocAmount(value);
    // Auto-fill suma de distribuit
    const numValue = parseFloat(value) || 0;
    if (numValue > 0) {
      if (config?.distributionType === 'consumption') {
        setBillAmount(value);
      } else {
        setTotalAmount(value);
      }
      // Resetează selecția de document existent
      setSelectedExistingInvoice(null);
      // Populează singleInvoice cu datele noi
      setSingleInvoice({
        invoiceNumber: newDocNumber,
        invoiceAmount: value,
        invoiceDate: newDocDate,
        dueDate: newDocDueDate,
        notes: '',
        pdfFile: null,
        isExisting: false
      });
    }
  };

  // Sync newDocNumber/newDocDate cu singleInvoice
  const handleNewDocNumberChange = (value) => {
    setNewDocNumber(value);
    if (newDocAmount) {
      setSingleInvoice(prev => prev
        ? { ...prev, invoiceNumber: value }
        : { invoiceNumber: value, invoiceAmount: newDocAmount, invoiceDate: newDocDate, dueDate: newDocDueDate, notes: '', pdfFile: null, isExisting: false }
      );
    }
    if (value) setSelectedExistingInvoice(null);
  };

  const handleNewDocDateChange = (value) => {
    setNewDocDate(value);
    if (newDocAmount) {
      setSingleInvoice(prev => prev
        ? { ...prev, invoiceDate: value }
        : { invoiceNumber: newDocNumber, invoiceAmount: newDocAmount, invoiceDate: value, dueDate: newDocDueDate, notes: '', pdfFile: null, isExisting: false }
      );
    }
  };

  const handleNewDocDueDateChange = (value) => {
    setNewDocDueDate(value);
    if (newDocAmount) {
      setSingleInvoice(prev => prev
        ? { ...prev, dueDate: value }
        : { invoiceNumber: newDocNumber, invoiceAmount: newDocAmount, invoiceDate: newDocDate, dueDate: value, notes: '', pdfFile: null, isExisting: false }
      );
    }
  };

  // Verifică dacă avem un document valid (pentru butonul Distribuie)
  const hasValidDocument = !!(selectedExistingInvoice || (newDocNumber && newDocAmount));

  // Render secțiunea inline de document justificativ
  const renderInlineDocument = () => {
    if (!config?.supplierId) return null;

    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
        <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Document justificativ *
        </div>

        {/* Tip document */}
        <div>
          <select
            value={documentType}
            onChange={(e) => { setDocumentType(e.target.value); setSelectedExistingInvoice(null); }}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            {documentTypes.map(dt => (
              <option key={dt.value} value={dt.value}>{dt.label}</option>
            ))}
          </select>
        </div>

        {/* Selectează document existent */}
        {availableInvoices.length > 0 && (
          <div>
            <select
              value={selectedExistingInvoice?.id || ''}
              onChange={(e) => handleSelectExistingInvoice(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">Selectează document existent...</option>
              {availableInvoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {documentType !== 'factura' ? (inv.expenseName || 'Fără cheltuială') : (inv.supplierName || 'Fără furnizor')} — Rămas: {(inv.remainingAmount || 0).toFixed(2)} RON
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Separator */}
        {availableInvoices.length > 0 && !selectedExistingInvoice && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 border-t border-gray-300"></div>
            <span>sau document nou</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>
        )}

        {/* Câmpuri document nou (ascunse dacă e selectat document existent) */}
        {!selectedExistingInvoice && (
          <div className="space-y-2">
            {/* Rând 1: Nr. document + Sumă document */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nr. document *</label>
                <input
                  type="text"
                  value={newDocNumber}
                  onChange={(e) => handleNewDocNumberChange(e.target.value)}
                  placeholder="FAC-001"
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sumă document (RON) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newDocAmount}
                  onChange={(e) => handleNewDocAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            {/* Rând 2: Data factură + Data scadență */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data document</label>
                <input
                  type="date"
                  value={newDocDate}
                  onChange={(e) => handleNewDocDateChange(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data scadență</label>
                <input
                  type="date"
                  value={newDocDueDate}
                  onChange={(e) => handleNewDocDueDateChange(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Info document selectat */}
        {selectedExistingInvoice && (
          <div className="text-xs text-green-700 bg-green-50 p-2 rounded-lg">
            ✓ Document selectat: #{selectedExistingInvoice.invoiceNumber} — Rămas: {(selectedExistingInvoice.remainingAmount || 0).toFixed(2)} RON
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit START', {
      selectedExpense,
      editingExpense: !!editingExpense,
      hasSingleInvoice: !!(singleInvoice?.invoiceNumber),
      singleInvoice
    });

    if (!selectedExpense) {
      alert('Selectează o cheltuială');
      return;
    }

    const config = getExpenseConfigNormalized(selectedExpense);

    // Construiește obiectul newExpense bazat pe receptionMode și distributionType
    const newExpense = {
      name: selectedExpense
    };

    // Adaugă sume bazate pe distributionType
    if (config.distributionType === 'consumption') {
      if (!unitPrice) {
        alert('Completează prețul pe unitate');
        return;
      }
      newExpense.unitPrice = unitPrice;

      // Verifică receptionMode pentru consumption
      if (config.receptionMode === 'per_association') {
        if (!billAmount) {
          alert('Completează suma totală');
          return;
        }
        newExpense.billAmount = billAmount;
      } else if (config.receptionMode === 'per_block') {
        const missingBlocks = (config.appliesTo?.blocks || []).filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
        // Calculează billAmount ca sumă totală
        newExpense.billAmount = Object.values(amounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toString();
      } else if (config.receptionMode === 'per_stair') {
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
      if (config.receptionMode === 'per_association') {
        if (!totalAmount) {
          alert('Completează suma totală');
          return;
        }
        newExpense.amount = totalAmount;
      } else if (config.receptionMode === 'per_block') {
        const missingBlocks = (config.appliesTo?.blocks || []).filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
      } else if (config.receptionMode === 'per_stair') {
        const missingStairs = (config.appliesTo?.stairs || []).filter(stairId => !amounts[stairId]);
        if (missingStairs.length > 0) {
          alert('Completează sumele pentru toate scările');
          return;
        }
        newExpense.amountsByStair = amounts;
      }
    } else if (config.distributionType === 'cotaParte') {
      // cotaParte - verificăm dacă e total sau per_block/per_stair
      if (config.receptionMode === 'per_association') {
        if (!totalAmount) {
          alert('Completează suma totală');
          return;
        }
        newExpense.amount = totalAmount;
      } else if (config.receptionMode === 'per_block') {
        // Verifică că toate blocurile au sume
        const missingBlocks = (config.appliesTo?.blocks || []).filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
      } else if (config.receptionMode === 'per_stair') {
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
      if (config.receptionMode === 'per_association') {
        if (!totalAmount) {
          alert('Completează suma totală');
          return;
        }
        newExpense.amount = totalAmount;
      } else if (config.receptionMode === 'per_block') {
        // Verifică că toate blocurile au sume
        const missingBlocks = (config.appliesTo?.blocks || []).filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
      } else if (config.receptionMode === 'per_stair') {
        // Verifică că toate scările au sume
        const missingStairs = (config.appliesTo?.stairs || []).filter(stairId => !amounts[stairId]);
        if (missingStairs.length > 0) {
          alert('Completează sumele pentru toate scările');
          return;
        }
        newExpense.amountsByStair = amounts;
      }
    }

    // Adaugă invoice data dacă există
    // Fallback: dacă singleInvoice nu e setat dar avem date inline, creează-l
    const effectiveInvoice = singleInvoice || (newDocNumber && newDocAmount ? {
      invoiceNumber: newDocNumber,
      invoiceAmount: newDocAmount,
      invoiceDate: newDocDate,
      dueDate: newDocDueDate,
      notes: '',
      pdfFile: null,
      isExisting: false
    } : null);

    console.log('🧾 handleSubmit - invoice check:', {
      singleInvoice: !!singleInvoice,
      effectiveInvoice: !!effectiveInvoice,
      newDocNumber, newDocAmount, documentType,
      selectedExistingInvoice: selectedExistingInvoice?.id
    });
    if (effectiveInvoice && effectiveInvoice.invoiceNumber && effectiveInvoice.invoiceNumber.trim()) {
      // Folosim singleInvoice pentru toate cazurile (total, per_block, per_stair cu factură unică)
      let currentDist;

      // Calculează suma curentă bazată pe receptionMode și distributionType
      if (config.receptionMode === 'per_block' || config.receptionMode === 'per_stair') {
        // Pentru per_block/per_stair, suma totală = suma tuturor câmpurilor
        currentDist = Object.values(amounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toString();
      } else {
        // Pentru total mode
        if (config.distributionType === 'consumption') {
          currentDist = billAmount;
        } else {
          currentDist = totalAmount;
        }
      }

      console.log('🔍 ExpenseEntryModal - handleSubmit - Building invoiceData from effectiveInvoice:', effectiveInvoice);

      newExpense.invoiceData = {
        invoiceNumber: effectiveInvoice.invoiceNumber,
        invoiceAmount: effectiveInvoice.invoiceAmount,
        invoiceDate: effectiveInvoice.invoiceDate,
        dueDate: newDocDueDate || effectiveInvoice.dueDate || '',
        notes: effectiveInvoice.notes || '',
        documentType: documentType,
        currentDistribution: currentDist,
        totalInvoiceAmount: effectiveInvoice.invoiceAmount || currentDist,
        isPartialDistribution: false,
        isExistingInvoice: effectiveInvoice.isExisting || false,
        existingInvoiceId: effectiveInvoice.existingInvoiceId || null
      };
      newExpense.pdfFile = effectiveInvoice.pdfFile || null;

      console.log('🔍 ExpenseEntryModal - handleSubmit - newExpense.invoiceData:', newExpense.invoiceData);
    }

    // Adaugă facturi separate per bloc/scară dacă există
    if (Object.keys(separateInvoices).length > 0) {
      newExpense.separateInvoicesData = separateInvoices;
      // Adaugă și amounts pentru a ști care e suma pentru fiecare entitate
      newExpense.entityAmounts = amounts;
    }

    console.log('🚀 About to save expense', {
      isEditing: !!editingExpense,
      hasInvoiceData: !!newExpense.invoiceData,
      invoiceNumber: newExpense.invoiceData?.invoiceNumber,
      newExpense
    });

    try {
      if (editingExpense) {
        // Mod editare - folosește handleUpdateExpense
        console.log('✏️ ExpenseEntryModal - Updating expense:', newExpense);
        await handleUpdateExpense(editingExpense.id, newExpense);
      } else {
        // Mod adăugare - folosește handleAddExpense
        console.log('📝 ExpenseEntryModal - About to call handleAddExpense with:', newExpense);
        console.log('📝 handleAddExpense function type:', typeof handleAddExpense);
        await handleAddExpense(newExpense);
        console.log('✅ handleAddExpense completed');
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
                        config.distributionType === 'apartment' ? 'Pe apartament (egal)' :
                        config.distributionType === 'person' ? 'Pe persoană' :
                        config.distributionType === 'consumption' ? `Pe consum (${getConsumptionUnit(config)})` :
                        config.distributionType === 'individual' ? 'Pe apartament (individual)' :
                        config.distributionType === 'cotaParte' ? 'Pe cotă parte indiviză' : config.distributionType
                      }
                    </div>
                    {config.supplierName ? (
                      <div className="text-xs text-blue-700">
                        🏢 Furnizor: {config.supplierName}
                      </div>
                    ) : (
                      <div className="text-xs text-orange-700 font-medium">
                        ⚠️ Furnizor neconfigurat - apasă Configurare cheltuială
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (setConfigModalInitialTab) {
                        setConfigModalInitialTab(config.supplierName ? 'general' : 'supplier');
                      }
                      setSelectedExpenseForConfig(selectedExpense);
                      setShowExpenseConfig(true);
                    }}
                    className={`px-2 py-1.5 ${config.supplierName ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap text-xs`}
                    title="Configurează cheltuiala"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Configurare cheltuială
                  </button>
                </div>
              </div>
            )}

            {/* Document justificativ inline */}
            {selectedExpense && config && renderInlineDocument()}

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
                          onChange={(e) => setBillAmount(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
                          onChange={(e) => setTotalAmount(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
                          onChange={(e) => setTotalAmount(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
                          onChange={(e) => setTotalAmount(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
            disabled={!selectedExpense || !config?.supplierId}
            className="px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            title={!config?.supplierId ? 'Configurează furnizorul mai întâi' : ''}
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
