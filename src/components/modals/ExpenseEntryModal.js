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
  setShowExpenseConfig,
  setSelectedExpenseForConfig
}) => {
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
      const config = getExpenseConfig(selectedExpense);
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

      const expenseConfig = getExpenseConfig(editingExpense.name);
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

      // TODO: Populează și invoice data dacă există
      // Deocamdată nu avem invoice data în editing
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

  const handleSaveInvoice = (invoiceDetails) => {
    if (invoiceDetails.entityId === 'single') {
      // Factură unică
      setSingleInvoice({
        invoiceNumber: invoiceDetails.invoiceNumber,
        invoiceDate: invoiceDetails.invoiceDate,
        dueDate: invoiceDetails.dueDate,
        notes: invoiceDetails.notes,
        pdfFile: invoiceDetails.pdfFile
      });
    } else {
      // Factură separată
      setSeparateInvoices(prev => ({
        ...prev,
        [invoiceDetails.entityId]: {
          invoiceNumber: invoiceDetails.invoiceNumber,
          invoiceDate: invoiceDetails.invoiceDate,
          dueDate: invoiceDetails.dueDate,
          notes: invoiceDetails.notes,
          pdfFile: invoiceDetails.pdfFile
        }
      }));
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
    if (!selectedExpense) {
      alert('Selectează o cheltuială');
      return;
    }

    const config = getExpenseConfig(selectedExpense);

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
      if (config.receptionMode === 'total') {
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
      if (config.receptionMode === 'total') {
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
    } else if (config.distributionType === 'cotaParte' || config.distributionType === 'cotaParteIndiviza') {
      // cotaParte - verificăm dacă e total sau per_block/per_stair
      if (config.receptionMode === 'total') {
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
      if (config.receptionMode === 'total') {
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
    if (singleInvoice) {
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

      newExpense.invoiceData = {
        invoiceNumber: singleInvoice.invoiceNumber,
        invoiceDate: singleInvoice.invoiceDate,
        dueDate: singleInvoice.dueDate,
        notes: singleInvoice.notes,
        currentDistribution: currentDist,
        totalInvoiceAmount: currentDist, // Pentru simplitate, totalul = distribuția curentă
        isPartialDistribution: false
      };
      newExpense.pdfFile = singleInvoice.pdfFile;
    }

    try {
      if (editingExpense) {
        // Mod editare - folosește handleUpdateExpense
        console.log('✏️ ExpenseEntryModal - Updating expense:', newExpense);
        await handleUpdateExpense(editingExpense.id, newExpense);
      } else {
        // Mod adăugare - folosește handleAddExpense
        console.log('📝 ExpenseEntryModal - Adding expense:', newExpense);
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

  const config = selectedExpense ? getExpenseConfig(selectedExpense) : null;

  // Grupează scările per bloc pentru afișare
  const blocksWithStairs = blocks?.map(block => ({
    ...block,
    stairs: stairs?.filter(stair => stair.blockId === block.id) || []
  })) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`p-6 flex-shrink-0 ${
          monthType === 'historic'
            ? 'bg-gradient-to-r from-gray-600 to-gray-700'
            : monthType === 'next'
            ? 'bg-gradient-to-r from-green-600 to-green-700'
            : 'bg-gradient-to-r from-indigo-600 to-blue-700'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {editingExpense ? '✏️ Editează distribuirea' : '➕ Distribuie Cheltuială'}
              </h2>
              <p className="text-white/80 mt-1">{currentMonth}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          <div className="space-y-4">
            {/* Dropdown Cheltuială - doar când adaugi cheltuială nouă */}
            {!editingExpense && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-blue-900">
                      {selectedExpense}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      📄 Factură: {
                        config.invoiceMode === 'single' ? 'O singură factură' :
                        config.invoiceMode === 'separate' ? 'Facturi separate' : 'O singură factură'
                      }
                    </div>
                    <div className="text-sm text-blue-700">
                      💡 Sume: {
                        config.receptionMode === 'total' ? 'Pe asociație' :
                        config.receptionMode === 'per_block' ? 'Per bloc' :
                        config.receptionMode === 'per_stair' ? 'Per scară' : config.receptionMode
                      }
                    </div>
                    <div className="text-sm text-blue-700">
                      📊 Distribuție: {
                        config.distributionType === 'apartment' ? 'Pe apartament (egal)' :
                        config.distributionType === 'person' ? 'Pe persoană' :
                        config.distributionType === 'consumption' ? `Pe consum (${getConsumptionUnit(config)})` :
                        config.distributionType === 'individual' ? 'Pe apartament (individual)' :
                        config.distributionType === 'cotaParte' || config.distributionType === 'cotaParteIndiviza' ? 'Pe cotă parte indiviză' : config.distributionType
                      }
                    </div>
                    {config.supplierName ? (
                      <div className="text-sm text-blue-700">
                        🏢 Furnizor: {config.supplierName}
                      </div>
                    ) : (
                      <div className="text-sm text-orange-700 font-medium">
                        ⚠️ Furnizor neconfigurat - apasă Configurare
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedExpenseForConfig(selectedExpense);
                      setShowExpenseConfig(true);
                    }}
                    className={`px-3 py-2 ${config.supplierName ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700 animate-pulse'} text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap text-sm`}
                    title="Configurează cheltuiala"
                  >
                    <Settings className="w-4 h-4" />
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
                    {config.receptionMode === 'total' && (
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
                    {config.receptionMode === 'total' && (
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
                    {config.receptionMode === 'total' && (
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
                {(config.distributionType === 'cotaParte' || config.distributionType === 'cotaParteIndiviza') && (
                  <>
                    {/* MODE: TOTAL */}
                    {config.receptionMode === 'total' && (
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
            {selectedExpense && config && config.receptionMode === 'total' && config.supplierId && (
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
            {selectedExpense && config && config.receptionMode === 'total' && !config.supplierId && (
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
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedExpense}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
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
