import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, Upload, Settings } from 'lucide-react';
import InvoiceDetailsModal from './InvoiceDetailsModal';

const ExpenseEntryModal = ({
  isOpen,
  onClose,
  blocks,
  stairs,
  availableExpenseTypes,
  getExpenseConfig,
  handleAddExpense,
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
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState('single'); // 'single' | 'separate'
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    notes: '',
    totalInvoiceAmount: '',
    currentDistribution: '',
    isPartialDistribution: false
  });
  const [pdfFile, setPdfFile] = useState(null);

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

  const resetForm = () => {
    setSelectedExpense('');
    setAmounts({});
    setTotalAmount('');
    setUnitPrice('');
    setBillAmount('');
    setShowInvoiceDetails(false);
    setInvoiceMode('single');
    setInvoiceData({
      invoiceNumber: '',
      invoiceDate: '',
      dueDate: '',
      notes: '',
      totalInvoiceAmount: '',
      currentDistribution: '',
      isPartialDistribution: false
    });
    setPdfFile(null);
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
    const fileInput = document.getElementById('pdf-upload-modal');
    if (fileInput) fileInput.value = '';
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
        const missingBlocks = config.appliesTo.blocks.filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
        // Calculează billAmount ca sumă totală
        newExpense.billAmount = Object.values(amounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toString();
      } else if (config.receptionMode === 'per_stair') {
        const missingStairs = config.appliesTo.stairs.filter(stairId => !amounts[stairId]);
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
        const missingBlocks = config.appliesTo.blocks.filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
      } else if (config.receptionMode === 'per_stair') {
        const missingStairs = config.appliesTo.stairs.filter(stairId => !amounts[stairId]);
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
        const missingBlocks = config.appliesTo.blocks.filter(blockId => !amounts[blockId]);
        if (missingBlocks.length > 0) {
          alert('Completează sumele pentru toate blocurile');
          return;
        }
        newExpense.amountsByBlock = amounts;
      } else if (config.receptionMode === 'per_stair') {
        // Verifică că toate scările au sume
        const missingStairs = config.appliesTo.stairs.filter(stairId => !amounts[stairId]);
        if (missingStairs.length > 0) {
          alert('Completează sumele pentru toate scările');
          return;
        }
        newExpense.amountsByStair = amounts;
      }
    }

    // Adaugă invoice data dacă există
    if (showInvoiceDetails) {
      let currentDist, totalInvoice;

      // Pentru per_block/per_stair cu factură unică, folosim suma auto-calculată
      if (invoiceMode === 'single' && (config.receptionMode === 'per_block' || config.receptionMode === 'per_stair')) {
        const autoTotal = Object.values(amounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        currentDist = autoTotal.toString();
        totalInvoice = autoTotal.toString();
      } else {
        // Pentru toate celelalte cazuri (total mode)
        if (config.distributionType === 'consumption') {
          currentDist = billAmount;
        } else if (config.distributionType === 'individual') {
          currentDist = totalAmount;
        } else {
          currentDist = totalAmount;
        }
        totalInvoice = invoiceData.totalInvoiceAmount || currentDist;
      }

      newExpense.invoiceData = {
        ...invoiceData,
        currentDistribution: currentDist,
        totalInvoiceAmount: totalInvoice
      };
      newExpense.pdfFile = pdfFile;
    }

    try {
      await handleAddExpense(newExpense);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Eroare la adăugarea cheltuielii:', error);
      alert('Eroare la adăugarea cheltuielii: ' + error.message);
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
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
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
              <h2 className="text-2xl font-bold">➕ Adaugă Cheltuială</h2>
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
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="space-y-4">
            {/* Dropdown Cheltuială */}
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

            {/* Info despre cheltuiala selectată */}
            {selectedExpense && config && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-blue-900">
                      {selectedExpense}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      📊 Mod distribuție: {
                        config.distributionType === 'apartment' ? 'Pe apartament (egal)' :
                        config.distributionType === 'person' ? 'Pe persoană' :
                        config.distributionType === 'consumption' ? 'Pe consum' :
                        config.distributionType === 'individual' ? 'Individual' : config.distributionType
                      }
                    </div>
                    <div className="text-sm text-blue-700">
                      💡 Mod introducere: {
                        config.receptionMode === 'total' ? 'Pe asociație (total)' :
                        config.receptionMode === 'per_block' ? 'Defalcat pe blocuri' :
                        config.receptionMode === 'per_stair' ? 'Defalcat pe scări' : config.receptionMode
                      }
                    </div>
                    <div className="text-sm text-blue-700">
                      📄 Mod factură: {
                        config.invoiceMode === 'single' ? 'Factură unică (defalcată)' :
                        config.invoiceMode === 'separate' ? 'Facturi separate' : 'Factură unică (defalcată)'
                      }
                    </div>
                    {config.supplierName && (
                      <div className="text-sm text-blue-700">
                        🏢 Furnizor: {config.supplierName}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedExpenseForConfig(selectedExpense);
                      setShowExpenseConfig(true);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preț pe unitate (RON/{selectedExpense.toLowerCase().includes("apă") || selectedExpense.toLowerCase().includes("canal") ? "mc" : "Gcal"}) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    {/* Dacă e total, un singur câmp pentru sumă */}
                    {config.receptionMode === 'total' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total de distribuit luna aceasta (RON) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={billAmount}
                          onChange={(e) => {
                            setBillAmount(e.target.value);
                            if (!invoiceData.isPartialDistribution) {
                              setInvoiceData(prev => ({ ...prev, currentDistribution: e.target.value }));
                            }
                          }}
                          className="w-full p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                    )}

                    {/* Dacă e per_block, câmpuri pe bloc */}
                    {config.receptionMode === 'per_block' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per bloc (din factură) *
                        </div>
                        {blocks.filter(block => config.appliesTo.blocks.includes(block.id)).map(block => {
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
                                    {hasInvoice ? '✓ Factură' : '+ Factură'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Dacă e per_stair, câmpuri pe scară */}
                    {config.receptionMode === 'per_stair' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per scară (din factură) *
                        </div>
                        {blocksWithStairs.map(block => {
                          const blockStairs = block.stairs.filter(stair =>
                            config.appliesTo.stairs.includes(stair.id)
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
                                          {hasInvoice ? '✓ Factură' : '+ Factură'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
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
                    {config.receptionMode === 'total' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total de distribuit luna aceasta (RON) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          💡 Suma totală pentru verificare. Vei introduce sumele individuale în panoul de consumuri.
                        </p>
                      </div>
                    )}

                    {/* MODE: PER_BLOCK */}
                    {config.receptionMode === 'per_block' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per bloc *
                        </div>
                        {blocks.filter(block => config.appliesTo.blocks.includes(block.id)).map(block => {
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
                                    {hasInvoice ? '✓ Factură' : '+ Factură'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* MODE: PER_STAIR */}
                    {config.receptionMode === 'per_stair' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per scară *
                        </div>
                        {blocksWithStairs.map(block => {
                          const blockStairs = block.stairs.filter(stair =>
                            config.appliesTo.stairs.includes(stair.id)
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
                                          {hasInvoice ? '✓ Factură' : '+ Factură'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
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

                    {/* MODE: PER_BLOCK */}
                    {config.receptionMode === 'per_block' && (
                      <>
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            📊 Sume per bloc *
                          </div>
                          {config.appliesTo.blocks.map(blockId => {
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
                                      {hasInvoice ? '📎 Editează' : '+ Adaugă factură'}
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
                      </>
                    )}

                    {/* MODE: PER_STAIR */}
                    {config.receptionMode === 'per_stair' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          📊 Sume per scară *
                        </div>
                        {blocksWithStairs.map(block => {
                          const blockStairs = block.stairs.filter(stair =>
                            config.appliesTo.stairs.includes(stair.id)
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
                                          {hasInvoice ? '📎 Editează' : '+ Adaugă factură'}
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
                      </div>
                    )}

                    {/* Buton pentru Factură unică - când invoiceMode === 'single' */}
                    {(config.receptionMode === 'per_block' || config.receptionMode === 'per_stair') && config.supplierId && invoiceMode === 'single' && (
                      <div className="border-t pt-4 mt-4">
                        <div className="space-y-4">
                          <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            📄 Factură unică (defalcată)
                          </div>

                          <div className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-blue-900">
                                O singură factură cu defalcare pe {config.receptionMode === 'per_block' ? 'blocuri' : 'scări'}
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
                              {singleInvoice ? '📎 Editează' : '+ Adaugă factură'}
                            </button>
                          </div>
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

            {/* Secțiunea Factură (opțională) - DOAR pentru receptionMode = total/consumption/individual */}
            {selectedExpense && config && config.receptionMode !== 'per_block' && config.receptionMode !== 'per_stair' && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Detalii Factură</span>
                    <span className="text-xs text-gray-500">(opțional)</span>
                  </div>

                  {!config.supplierId ? (
                    <div className="flex flex-col items-end">
                      <button
                        type="button"
                        disabled={true}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-400 cursor-not-allowed"
                        title="Cheltuiala nu are furnizor configurat"
                      >
                        Adaugă factură
                      </button>
                      <span className="text-xs text-red-600 mt-1">
                        ⚠️ Fără furnizor configurat
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowInvoiceDetails(!showInvoiceDetails)}
                      className={`px-3 py-1 rounded-md text-xs font-medium ${
                        showInvoiceDetails
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {showInvoiceDetails ? 'Ascunde' : 'Adaugă factură'}
                    </button>
                  )}
                </div>

                {/* Mesaj când nu există furnizor */}
                {!config.supplierId && (
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
                )}

                {/* Detalii factură - collapse */}
                {showInvoiceDetails && config.supplierId && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
                    {config.supplierName && (
                      <div className="text-sm text-blue-700 font-medium">
                        🏢 Furnizor: {config.supplierName}
                      </div>
                    )}

                    {(
                      <>
                        {/* Formular factură pentru total/consumption/individual */}
                        {(
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Număr factură
                                </label>
                            <input
                              type="text"
                              value={invoiceData.invoiceNumber}
                              onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
                              placeholder="ex: FAC-2024-001234"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total factură (RON)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={invoiceData.totalInvoiceAmount}
                              onChange={(e) => setInvoiceData({...invoiceData, totalInvoiceAmount: e.target.value})}
                              placeholder="Suma totală"
                              className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Data facturii
                            </label>
                            <input
                              type="date"
                              value={invoiceData.invoiceDate}
                              onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Data scadență
                            </label>
                            <input
                              type="date"
                              value={invoiceData.dueDate}
                              onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            PDF factură
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id="pdf-upload-modal"
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
                                onClick={() => document.getElementById('pdf-upload-modal').click()}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600 flex items-center justify-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Selectează PDF
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Indicator distribuție parțială */}
                        {(() => {
                          const totalInvoice = invoiceData.totalInvoiceAmount;
                          const currentAmount = billAmount || totalAmount;
                          return totalInvoice && currentAmount &&
                                 parseFloat(totalInvoice) > parseFloat(currentAmount);
                        })() && (
                          <div className="p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                            <div className="text-sm font-medium text-yellow-800">
                              ⚠️ Distribuție parțială detectată
                            </div>
                            <div className="text-xs text-yellow-700 mt-1">
                              {(() => {
                                const total = parseFloat(invoiceData.totalInvoiceAmount) || 0;
                                const currentAmount = billAmount || totalAmount;
                                const distribuit = parseFloat(currentAmount) || 0;
                                const ramas = total - distribuit;
                                return (
                                  <>
                                    Distribui: {currentAmount} RON din {invoiceData.totalInvoiceAmount} RON total
                                    <br />
                                    Rămas de distribuit: {ramas.toFixed(2)} RON
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observații
                          </label>
                          <textarea
                            value={invoiceData.notes}
                            onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                            placeholder="Observații sau detalii suplimentare..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                          />
                        </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
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
            Adaugă Cheltuială
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
