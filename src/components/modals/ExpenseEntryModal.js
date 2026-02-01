/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, Settings } from 'lucide-react';
import InvoiceDetailsModal from './InvoiceDetailsModal';

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
  setSelectedExpenseForConfig
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
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [currentEntityForInvoice, setCurrentEntityForInvoice] = useState(null); // { id, name }

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
        console.log('📋 Loading singleInvoice from editingExpense:', editingExpense.invoiceData);
        setSingleInvoice({
          invoiceNumber: editingExpense.invoiceData.invoiceNumber || '',
          invoiceAmount: editingExpense.invoiceData.invoiceAmount?.toString() || editingExpense.invoiceData.totalInvoiceAmount?.toString() || '',
          invoiceDate: editingExpense.invoiceData.invoiceDate || '',
          dueDate: editingExpense.invoiceData.dueDate || '',
          notes: editingExpense.invoiceData.notes || '',
          pdfFile: null // Nu putem încărca PDF-ul din Firestore
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
    setShowInvoiceDetailsModal(false);
    setCurrentEntityForInvoice(null);
  };

  const handleOpenInvoiceModal = (entityId, entityName) => {
    setCurrentEntityForInvoice({ id: entityId, name: entityName });
    setShowInvoiceDetailsModal(true);
  };

  const handleSaveInvoice = async (invoiceDetails) => {
    console.log('🔍 ExpenseEntryModal - handleSaveInvoice - Received:', invoiceDetails);

    const invoiceData = {
      invoiceNumber: invoiceDetails.invoiceNumber,
      invoiceAmount: invoiceDetails.invoiceAmount,
      invoiceDate: invoiceDetails.invoiceDate,
      dueDate: invoiceDetails.dueDate,
      notes: invoiceDetails.notes,
      pdfFile: invoiceDetails.pdfFile
    };

    // Salvează în state local pentru a afișa în UI
    if (invoiceDetails.entityId === 'single') {
      console.log('🔍 ExpenseEntryModal - Setting singleInvoice:', invoiceData);
      setSingleInvoice(invoiceData);
    } else {
      console.log('🔍 ExpenseEntryModal - Setting separateInvoice for entity:', invoiceDetails.entityId, invoiceData);
      setSeparateInvoices(prev => ({
        ...prev,
        [invoiceDetails.entityId]: invoiceData
      }));
    }

    // Salvează sau actualizează factura în Firebase
    if (!invoiceDetails.isExistingInvoice) {
      // Verifică dacă suntem în modul de editare și dacă factura deja există
      if (editingExpense && editingExpense.invoiceData?.invoiceNumber && getInvoiceByNumber && updateInvoice) {
        // MOD EDITARE - actualizează factura existentă
        try {
          console.log('✏️ ExpenseEntryModal - Actualizare factură existentă:', invoiceDetails.invoiceNumber);

          const existingInvoice = await getInvoiceByNumber(invoiceDetails.invoiceNumber);

          if (existingInvoice) {
            // Actualizează factura existentă
            const updateData = {
              invoiceAmount: parseFloat(invoiceDetails.invoiceAmount) || 0,
              totalInvoiceAmount: parseFloat(invoiceDetails.invoiceAmount) || 0,
              invoiceDate: invoiceDetails.invoiceDate,
              dueDate: invoiceDetails.dueDate,
              notes: invoiceDetails.notes,
              updatedAt: new Date().toISOString()
            };

            // Recalculează remainingAmount dacă s-a schimbat totalInvoiceAmount
            const newTotalAmount = parseFloat(invoiceDetails.invoiceAmount) || 0;
            const distributedAmount = existingInvoice.distributedAmount || 0;
            updateData.remainingAmount = newTotalAmount - distributedAmount;
            updateData.isFullyDistributed = updateData.remainingAmount <= 0;

            console.log('💾 ExpenseEntryModal - Actualizare factură:', updateData);
            await updateInvoice(existingInvoice.id, updateData);
            console.log('✅ ExpenseEntryModal - Factură actualizată în Firebase');
          } else {
            console.warn('⚠️ Nu s-a găsit factura pentru actualizare, se creează una nouă');
            // Dacă nu găsim factura, o creăm
            await createNewInvoice(invoiceDetails);
          }
        } catch (error) {
          console.error('❌ Eroare la actualizarea facturii:', error);
          alert('Eroare la actualizarea facturii: ' + error.message);
        }
      } else if (addInvoice) {
        // MOD ADĂUGARE - creează factură nouă
        await createNewInvoice(invoiceDetails);
      }
    }

    // Funcție helper pentru creare factură nouă
    async function createNewInvoice(invoiceDetails) {
      try {
        const config = getExpenseConfigNormalized(selectedExpense);

        const firebaseInvoiceData = {
          expenseType: selectedExpense,
          invoiceNumber: invoiceDetails.invoiceNumber,
          invoiceAmount: invoiceDetails.invoiceAmount,
          invoiceDate: invoiceDetails.invoiceDate,
          dueDate: invoiceDetails.dueDate,
          notes: invoiceDetails.notes,
          sheetId: currentSheet?.id || null,
          month: currentMonth,
          supplierId: config?.supplierId || null,
          supplierName: config?.supplierName || null,
          amount: 0,  // Încă nu am distribuit nimic
          totalAmount: 0,
          vatAmount: 0,
          totalInvoiceAmount: parseFloat(invoiceDetails.invoiceAmount) || 0,
          currentDistribution: 0,
          distributedAmount: 0
        };

        console.log('💾 ExpenseEntryModal - Salvare imediată factură în Firebase:', firebaseInvoiceData);
        await addInvoice(firebaseInvoiceData, invoiceDetails.pdfFile);
        console.log('✅ ExpenseEntryModal - Factură salvată în Firebase');
      } catch (error) {
        console.error('❌ Eroare la salvarea facturii:', error);
        alert('Eroare la salvarea facturii: ' + error.message);
      }
    }
  };

  // Helper pentru a obține unitatea de măsură corectă
  const getConsumptionUnit = (config) => {
    if (!config) return 'unitate';
    if (config.consumptionUnit === 'custom') {
      return config.customConsumptionUnit || 'unitate';
    }
    return config.consumptionUnit || 'mc';
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
    if (singleInvoice && singleInvoice.invoiceNumber && singleInvoice.invoiceNumber.trim()) {
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

      console.log('🔍 ExpenseEntryModal - handleSubmit - Building invoiceData from singleInvoice:', singleInvoice);

      newExpense.invoiceData = {
        invoiceNumber: singleInvoice.invoiceNumber,
        invoiceAmount: singleInvoice.invoiceAmount,
        invoiceDate: singleInvoice.invoiceDate,
        dueDate: singleInvoice.dueDate,
        notes: singleInvoice.notes,
        currentDistribution: currentDist,
        totalInvoiceAmount: singleInvoice.invoiceAmount || currentDist, // Folosește invoiceAmount dacă există
        isPartialDistribution: false
      };
      newExpense.pdfFile = singleInvoice.pdfFile;

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

  const config = selectedExpense ? getExpenseConfig(selectedExpense) : null;

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
              <h2 className="text-lg sm:text-xl font-bold">
                {editingExpense ? '✏️ Editează distribuirea' : '➕ Distribuie Cheltuială'}
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
                        config.receptionMode === 'per_association' ? 'Pe asociație' :
                        config.receptionMode === 'per_block' ? 'Per bloc' :
                        config.receptionMode === 'per_stair' ? 'Per scară' : config.receptionMode
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
                        ⚠️ Furnizor neconfigurat - apasă Configurare
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedExpenseForConfig(selectedExpense);
                      setShowExpenseConfig(true);
                    }}
                    className={`px-2 py-1.5 ${config.supplierName ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700 animate-pulse'} text-white rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap text-xs`}
                    title="Configurează cheltuiala"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Configurare
                  </button>
                </div>
              </div>
            )}

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
                          Suma totală (RON) *
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
                        {blocks.filter(block => config.appliesTo?.blocks?.includes(block.id)).map(block => {
                          const hasInvoice = separateInvoices[block.id];
                          return (
                            <div key={block.id}>
                              <label className="block text-sm text-gray-700 mb-1">
                                🏢 {block.name}
                              </label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={amounts[block.id] || ''}
                                  onChange={(e) => setAmounts({ ...amounts, [block.id]: e.target.value })}
                                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="Sumă (RON)"
                                />
                                {invoiceMode === 'separate' && config.supplierId && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInvoiceModal(block.id, block.name)}
                                    className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm ${
                                      hasInvoice
                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    {hasInvoice ? '✓ Factură' : 'Adaugă factură'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Mesaj informativ pentru facturi separate */}
                        {invoiceMode === 'separate' && config.supplierId && (
                          <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Facturi separate per bloc
                            </div>
                          </div>
                        )}
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
                              {blockStairs.map(stair => {
                                const hasInvoice = separateInvoices[stair.id];
                                return (
                                  <div key={stair.id} className="ml-4">
                                    <label className="block text-sm text-gray-700 mb-1">
                                      🏢 {stair.name}
                                    </label>
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amounts[stair.id] || ''}
                                        onChange={(e) => setAmounts({ ...amounts, [stair.id]: e.target.value })}
                                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Sumă (RON)"
                                      />
                                      {invoiceMode === 'separate' && config.supplierId && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenInvoiceModal(stair.id, stair.name)}
                                          className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm ${
                                            hasInvoice
                                              ? 'bg-green-100 text-green-700 border border-green-300'
                                              : 'bg-blue-600 text-white hover:bg-blue-700'
                                          }`}
                                        >
                                          {hasInvoice ? '✓ Factură' : 'Adaugă factură'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}

                        {/* Mesaj informativ pentru facturi separate */}
                        {invoiceMode === 'separate' && config.supplierId && (
                          <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Facturi separate per scară
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Factură unică pentru CONSUMPTION cu per_block/per_stair */}
                    {(config.receptionMode === 'per_block' || config.receptionMode === 'per_stair') && config.supplierId && invoiceMode === 'single' && (
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Factură unică cu sume per {config.receptionMode === 'per_block' ? 'bloc' : 'scară'}
                              </div>
                              {singleInvoice && (
                                <div className="text-xs text-green-700 mt-1">
                                  ✓ Factură #{singleInvoice.invoiceNumber}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceModal('single', 'Factură unică')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                singleInvoice
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {singleInvoice ? '📎 Editează' : 'Adaugă factură'}
                            </button>
                          </div>
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
                          Suma totală (RON) *
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
                        {blocks.filter(block => config.appliesTo?.blocks?.includes(block.id)).map(block => {
                          const hasInvoice = separateInvoices[block.id];
                          return (
                            <div key={block.id}>
                              <label className="block text-sm text-gray-700 mb-1">
                                🏢 {block.name}
                              </label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={amounts[block.id] || ''}
                                  onChange={(e) => setAmounts({ ...amounts, [block.id]: e.target.value })}
                                  className="flex-1 p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                  placeholder="Sumă (RON)"
                                />
                                {invoiceMode === 'separate' && config.supplierId && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInvoiceModal(block.id, block.name)}
                                    className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm ${
                                      hasInvoice
                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    {hasInvoice ? '✓ Factură' : 'Adaugă factură'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Mesaj informativ pentru facturi separate */}
                        {invoiceMode === 'separate' && config.supplierId && (
                          <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Facturi separate per bloc
                            </div>
                          </div>
                        )}
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
                              {blockStairs.map(stair => {
                                const hasInvoice = separateInvoices[stair.id];
                                return (
                                  <div key={stair.id} className="ml-4">
                                    <label className="block text-sm text-gray-700 mb-1">
                                      🏢 {stair.name}
                                    </label>
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amounts[stair.id] || ''}
                                        onChange={(e) => setAmounts({ ...amounts, [stair.id]: e.target.value })}
                                        className="flex-1 p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="Sumă (RON)"
                                      />
                                      {invoiceMode === 'separate' && config.supplierId && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenInvoiceModal(stair.id, stair.name)}
                                          className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm ${
                                            hasInvoice
                                              ? 'bg-green-100 text-green-700 border border-green-300'
                                              : 'bg-blue-600 text-white hover:bg-blue-700'
                                          }`}
                                        >
                                          {hasInvoice ? '✓ Factură' : 'Adaugă factură'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}

                        {/* Mesaj informativ pentru facturi separate */}
                        {invoiceMode === 'separate' && config.supplierId && (
                          <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Facturi separate per scară
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Factură unică pentru INDIVIDUAL cu per_block/per_stair */}
                    {(config.receptionMode === 'per_block' || config.receptionMode === 'per_stair') && config.supplierId && invoiceMode === 'single' && (
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Factură unică cu sume per {config.receptionMode === 'per_block' ? 'bloc' : 'scară'}
                              </div>
                              {singleInvoice && (
                                <div className="text-xs text-green-700 mt-1">
                                  ✓ Factură #{singleInvoice.invoiceNumber}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceModal('single', 'Factură unică')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                singleInvoice
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {singleInvoice ? '📎 Editează' : 'Adaugă factură'}
                            </button>
                          </div>
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
                          Suma totală (RON) *
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
                      <>
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            📊 Sume per bloc *
                          </div>
                          {config.appliesTo?.blocks?.map(blockId => {
                            const block = blocks.find(b => b.id === blockId);
                            if (!block) return null;
                            const hasInvoice = separateInvoices[blockId];
                            return (
                              <div key={blockId}>
                                <label className="block text-sm text-gray-700 mb-1">
                                  🏢 {block.name}
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amounts[blockId] || ''}
                                    onChange={(e) => setAmounts({ ...amounts, [blockId]: e.target.value })}
                                    placeholder="Suma (RON)"
                                    className="flex-1 p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                                  {invoiceMode === 'separate' && config.supplierId && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenInvoiceModal(blockId, block.name)}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                                        hasInvoice
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                      }`}
                                      title={hasInvoice ? `Factură #${hasInvoice.invoiceNumber}` : 'Adaugă factură'}
                                    >
                                      {hasInvoice ? '📎 Editează' : 'Adaugă factură'}
                                    </button>
                                  )}
                                </div>
                                {hasInvoice && invoiceMode === 'separate' && (
                                  <div className="text-xs text-green-700 mt-1 ml-1">
                                    ✓ Factură #{hasInvoice.invoiceNumber}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Mesaj informativ pentru facturi separate */}
                          {invoiceMode === 'separate' && config.supplierId && (
                            <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                              <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Facturi separate per bloc
                              </div>
                            </div>
                          )}
                        </div>
                      </>
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
                              {blockStairs.map(stair => {
                                const hasInvoice = separateInvoices[stair.id];
                                return (
                                  <div key={stair.id} className="ml-4">
                                    <label className="block text-sm text-gray-700 mb-1">
                                      🏢 {stair.name}
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amounts[stair.id] || ''}
                                        onChange={(e) => setAmounts({ ...amounts, [stair.id]: e.target.value })}
                                        placeholder="Suma (RON)"
                                        className="flex-1 p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                      />
                                      {invoiceMode === 'separate' && config.supplierId && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenInvoiceModal(stair.id, stair.name)}
                                          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                                            hasInvoice
                                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                          }`}
                                          title={hasInvoice ? `Factură #${hasInvoice.invoiceNumber}` : 'Adaugă factură'}
                                        >
                                          {hasInvoice ? '📎 Editează' : 'Adaugă factură'}
                                        </button>
                                      )}
                                    </div>
                                    {hasInvoice && invoiceMode === 'separate' && (
                                      <div className="text-xs text-green-700 mt-1 ml-1">
                                        ✓ Factură #{hasInvoice.invoiceNumber}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}

                        {/* Mesaj informativ pentru facturi separate */}
                        {invoiceMode === 'separate' && config.supplierId && (
                          <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Facturi separate per scară
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Buton pentru Factură unică - când invoiceMode === 'single' */}
                    {(config.receptionMode === 'per_block' || config.receptionMode === 'per_stair') && config.supplierId && invoiceMode === 'single' && (
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Factură unică cu sume per {config.receptionMode === 'per_block' ? 'bloc' : 'scară'}
                              </div>
                              {singleInvoice && (
                                <div className="text-xs text-green-700 mt-1">
                                  ✓ Factură #{singleInvoice.invoiceNumber}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceModal('single', 'Factură unică')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                singleInvoice
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {singleInvoice ? '📎 Editează' : 'Adaugă factură'}
                            </button>
                          </div>
                      </div>
                    )}

                    {/* Mesaj când nu există furnizor pentru per_block/per_stair */}
                    {(config.receptionMode === 'per_block' || config.receptionMode === 'per_stair') && !config.supplierId && (
                      <div className="border-t pt-4 mt-4">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <span className="text-amber-600 text-lg">⚠️</span>
                            <div className="text-sm">
                              <div className="text-amber-800 font-medium mb-1">
                                Furnizor neconfigurat pentru "{selectedExpense}"
                              </div>
                              <div className="text-amber-700">
                                Pentru a putea adăuga facturi, această cheltuială trebuie să aibă un furnizor asociat.
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpenseForConfig(selectedExpense);
                                  setShowExpenseConfig(true);
                                  onClose();
                                }}
                                className="mt-2 text-sm text-amber-800 font-medium underline hover:text-amber-900"
                              >
                                📋 Configurează acum
                              </button>
                            </div>
                          </div>
                        </div>
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
                          Suma totală (RON) *
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
                      <>
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            📊 Sume per bloc *
                          </div>
                          {config.appliesTo?.blocks?.map(blockId => {
                            const block = blocks.find(b => b.id === blockId);
                            if (!block) return null;
                            const hasInvoice = separateInvoices[blockId];
                            return (
                              <div key={blockId}>
                                <label className="block text-sm text-gray-700 mb-1">
                                  🏢 {block.name}
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amounts[blockId] || ''}
                                    onChange={(e) => setAmounts({ ...amounts, [blockId]: e.target.value })}
                                    placeholder="Suma (RON)"
                                    className="flex-1 p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                                  {invoiceMode === 'separate' && config.supplierId && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenInvoiceModal(blockId, block.name)}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                                        hasInvoice
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                      }`}
                                      title={hasInvoice ? `Factură #${hasInvoice.invoiceNumber}` : 'Adaugă factură'}
                                    >
                                      {hasInvoice ? '📎 Editează' : 'Adaugă factură'}
                                    </button>
                                  )}
                                </div>
                                {hasInvoice && invoiceMode === 'separate' && (
                                  <div className="text-xs text-green-700 mt-1 ml-1">
                                    ✓ Factură #{hasInvoice.invoiceNumber}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Mesaj informativ pentru facturi separate */}
                          {invoiceMode === 'separate' && config.supplierId && (
                            <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                              <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Facturi separate per bloc
                              </div>
                            </div>
                          )}
                        </div>
                      </>
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
                              {blockStairs.map(stair => {
                                const hasInvoice = separateInvoices[stair.id];
                                return (
                                  <div key={stair.id} className="ml-4">
                                    <label className="block text-sm text-gray-700 mb-1">
                                      🏢 {stair.name}
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amounts[stair.id] || ''}
                                        onChange={(e) => setAmounts({ ...amounts, [stair.id]: e.target.value })}
                                        placeholder="Suma (RON)"
                                        className="flex-1 p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                      />
                                      {invoiceMode === 'separate' && config.supplierId && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenInvoiceModal(stair.id, stair.name)}
                                          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                                            hasInvoice
                                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                          }`}
                                          title={hasInvoice ? `Factură #${hasInvoice.invoiceNumber}` : 'Adaugă factură'}
                                        >
                                          {hasInvoice ? '📎 Editează' : 'Adaugă factură'}
                                        </button>
                                      )}
                                    </div>
                                    {hasInvoice && invoiceMode === 'separate' && (
                                      <div className="text-xs text-green-700 mt-1 ml-1">
                                        ✓ Factură #{hasInvoice.invoiceNumber}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}

                        {/* Mesaj informativ pentru facturi separate */}
                        {invoiceMode === 'separate' && config.supplierId && (
                          <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Facturi separate per scară
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Buton pentru Factură unică - când invoiceMode === 'single' */}
                    {(config.receptionMode === 'per_block' || config.receptionMode === 'per_stair') && config.supplierId && invoiceMode === 'single' && (
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Factură unică cu sume per {config.receptionMode === 'per_block' ? 'bloc' : 'scară'}
                              </div>
                              {singleInvoice && (
                                <div className="text-xs text-green-700 mt-1">
                                  ✓ Factură #{singleInvoice.invoiceNumber}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceModal('single', 'Factură unică')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                singleInvoice
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {singleInvoice ? '📎 Editează' : 'Adaugă factură'}
                            </button>
                          </div>
                      </div>
                    )}

                    {/* Mesaj când nu există furnizor pentru per_block/per_stair */}
                    {(config.receptionMode === 'per_block' || config.receptionMode === 'per_stair') && !config.supplierId && (
                      <div className="border-t pt-4 mt-4">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <span className="text-amber-600 text-lg">⚠️</span>
                            <div className="text-sm">
                              <div className="text-amber-800 font-medium mb-1">
                                Furnizor neconfigurat pentru "{selectedExpense}"
                              </div>
                              <div className="text-amber-700">
                                Pentru a putea adăuga facturi, această cheltuială trebuie să aibă un furnizor asociat.
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpenseForConfig(selectedExpense);
                                  setShowExpenseConfig(true);
                                  onClose();
                                }}
                                className="mt-2 text-sm text-amber-800 font-medium underline hover:text-amber-900"
                              >
                                📋 Configurează acum
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Buton Factură pentru receptionMode = total */}
            {selectedExpense && config && config.receptionMode === 'per_association' && config.supplierId && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Factură unică pe asociație
                      </div>
                      {singleInvoice && (
                        <div className="text-xs text-green-700 mt-1">
                          ✓ Factură #{singleInvoice.invoiceNumber}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenInvoiceModal('single', 'Factură')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        singleInvoice
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {singleInvoice ? '📎 Editează' : 'Adaugă factură'}
                    </button>
                  </div>
              </div>
            )}

            {/* Mesaj când nu există furnizor pentru total */}
            {selectedExpense && config && config.receptionMode === 'per_association' && !config.supplierId && (
              <div className="border-t pt-4 mt-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">⚠️</span>
                    <div className="text-sm">
                      <div className="text-amber-800 font-medium mb-1">
                        Furnizor neconfigurat pentru "{selectedExpense}"
                      </div>
                      <div className="text-amber-700">
                        Pentru a putea adăuga facturi, această cheltuială trebuie să aibă un furnizor asociat.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExpenseForConfig(selectedExpense);
                          setShowExpenseConfig(true);
                          onClose();
                        }}
                        className="mt-2 text-sm text-amber-800 font-medium underline hover:text-amber-900"
                      >
                        📋 Configurează acum
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
            disabled={!selectedExpense}
            className="px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {editingExpense ? 'Salvează Modificări' : 'Distribuie Cheltuială'}
          </button>
        </div>
      </div>

      {/* InvoiceDetailsModal - pentru facturi separate și factură unică */}
      {showInvoiceDetailsModal && currentEntityForInvoice && (
        <InvoiceDetailsModal
          isOpen={showInvoiceDetailsModal}
          onClose={() => setShowInvoiceDetailsModal(false)}
          onSave={handleSaveInvoice}
          entityId={currentEntityForInvoice.id}
          entityName={currentEntityForInvoice.name}
          monthType={monthType}
          supplierName={config?.supplierName}
          supplierId={config?.supplierId}
          existingInvoice={
            currentEntityForInvoice.id === 'single'
              ? singleInvoice
              : separateInvoices[currentEntityForInvoice.id]
          }
          getPartiallyDistributedInvoices={getPartiallyDistributedInvoices}
          expenseType={selectedExpense}
        />
      )}
    </div>
  );
};

export default ExpenseEntryModal;
