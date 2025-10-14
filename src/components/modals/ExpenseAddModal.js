import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Settings, Users, Building2 } from 'lucide-react';
import useSuppliers from '../../hooks/useSuppliers';
import { defaultExpenseTypes } from '../../data/expenseTypes';
import SupplierModal from './SupplierModal';

// Funcție pentru normalizarea textului (elimină diacriticele și convertește la lowercase)
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const ExpenseAddModal = ({
  isOpen,
  onClose,
  onAddExpense,
  getAssociationApartments,
  getApartmentParticipation,
  setApartmentParticipation,
  getAssociationExpenseTypes,
  currentSheet,
  blocks,
  stairs
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [selectedStairTab, setSelectedStairTab] = useState('all');
  const [expenseName, setExpenseName] = useState('');
  const [localConfig, setLocalConfig] = useState({
    distributionType: 'apartment',
    consumptionUnit: 'mc',
    customConsumptionUnit: '',
    invoiceMode: 'single',
    supplierId: null,
    supplierName: '',
    contractNumber: '',
    contactPerson: '',
    receptionMode: 'total', // 'total' | 'per_block' | 'per_stair'
    appliesTo: {
      blocks: [],
      stairs: []
    },
    fixedAmountMode: 'apartment' // 'apartment' | 'person'
  });

  const [showCustomUnit, setShowCustomUnit] = useState(false);

  const { suppliers, loading, addSupplier } = useSuppliers(currentSheet);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setExpenseName('');
      setLocalConfig({
        distributionType: 'apartment',
        invoiceMode: 'single',
        supplierId: null,
        supplierName: '',
        contractNumber: '',
        contactPerson: '',
        receptionMode: 'total',
        appliesTo: {
          blocks: [],
          stairs: []
        },
        fixedAmountMode: 'apartment'
      });
      setActiveTab('general');
    }
  }, [isOpen]);

  const handleAddNewSupplier = async (supplierData) => {
    try {
      const newSupplier = await addSupplier(supplierData);
      setLocalConfig(prev => ({
        ...prev,
        supplierId: newSupplier.id,
        supplierName: newSupplier.name
      }));

      console.log('✅ Furnizor nou adăugat și selectat:', newSupplier.name);
    } catch (error) {
      console.error('Eroare la adăugarea furnizorului:', error);
      if (error.code === 'permission-denied') {
        alert('Permisiuni insuficiente. Contactați administratorul.');
      } else {
        alert(`Eroare la adăugarea furnizorului: ${error.message || 'Eroare necunoscută'}. Verificați consola pentru detalii.`);
      }
    }
  };

  const handleSave = async () => {
    if (!expenseName.trim()) {
      alert('Numele cheltuielii este obligatoriu');
      return;
    }

    // Validare Mod introducere: dacă e per_block sau per_stair, trebuie să aibă cel puțin un element selectat
    if (localConfig.receptionMode === 'per_block' && localConfig.appliesTo.blocks.length === 0) {
      alert('Selectați cel puțin un bloc sau alegeți "Pe asociație"');
      return;
    }
    if (localConfig.receptionMode === 'per_stair' && localConfig.appliesTo.stairs.length === 0) {
      alert('Selectați cel puțin o scară sau alegeți "Pe asociație"');
      return;
    }

    // Validare unitate de măsură custom
    if (localConfig.distributionType === 'consumption' &&
        localConfig.consumptionUnit === 'custom' &&
        !localConfig.customConsumptionUnit?.trim()) {
      alert('Vă rog completați unitatea de măsură personalizată');
      return;
    }

    const normalizedInputName = normalizeText(expenseName);

    // Verifică dacă numele există în cheltuielile standard (inclusiv cele dezactivate)
    const standardExpenseExists = defaultExpenseTypes.some(expense =>
      normalizeText(expense.name) === normalizedInputName
    );

    if (standardExpenseExists) {
      alert(`Cheltuiala cu numele "${expenseName.trim()}" există deja în cheltuielile standard. Vă rugăm să alegeți un alt nume.`);
      return;
    }

    // Verifică dacă numele cheltuielii există deja în cheltuielile custom
    if (getAssociationExpenseTypes) {
      const existingExpenseTypes = getAssociationExpenseTypes();
      const nameExists = existingExpenseTypes.some(expense =>
        normalizeText(expense.name) === normalizedInputName
      );

      if (nameExists) {
        alert(`Cheltuiala cu numele "${expenseName.trim()}" există deja. Vă rugăm să alegeți un alt nume.`);
        return;
      }
    }

    try {
      // Add the expense with configuration including reception mode and applies to
      await onAddExpense({
        name: expenseName.trim(),
        defaultDistribution: localConfig.distributionType,
        receptionMode: localConfig.receptionMode,
        appliesTo: localConfig.appliesTo
      }, localConfig);

      console.log('✅ Cheltuială adăugată cu succes:', expenseName.trim(), 'cu mod introducere:', localConfig.receptionMode, 'se aplică pe:', localConfig.appliesTo);
      onClose();
    } catch (error) {
      console.error('Eroare la adăugarea cheltuielii:', error);
      alert('Eroare la adăugarea cheltuielii: ' + error.message);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setLocalConfig({
        ...localConfig,
        supplierId: supplier.id,
        supplierName: supplier.name
      });
    }
  };

  // Funcții pentru gestionarea Mod introducere și bife
  const handleReceptionModeChange = (mode) => {
    setLocalConfig({
      ...localConfig,
      receptionMode: mode,
      appliesTo: {
        blocks: mode === 'per_block' ? blocks.map(b => b.id) : [],
        stairs: mode === 'per_stair' ? stairs.map(s => s.id) : []
      }
    });
  };

  const handleInvoiceModeChange = (mode) => {
    const newConfig = {
      ...localConfig,
      invoiceMode: mode
    };

    // Dacă se alege "separate" și receptionMode este "total", schimbă automat la per_block
    if (mode === 'separate' && localConfig.receptionMode === 'total') {
      if (blocks.length > 1) {
        newConfig.receptionMode = 'per_block';
        newConfig.appliesTo = {
          blocks: blocks.map(b => b.id),
          stairs: []
        };
      } else if (stairs.length > 1) {
        newConfig.receptionMode = 'per_stair';
        newConfig.appliesTo = {
          blocks: [],
          stairs: stairs.map(s => s.id)
        };
      }
    }

    setLocalConfig(newConfig);
  };

  const handleBlockToggle = (blockId) => {
    const isSelected = localConfig.appliesTo.blocks.includes(blockId);
    setLocalConfig({
      ...localConfig,
      appliesTo: {
        ...localConfig.appliesTo,
        blocks: isSelected
          ? localConfig.appliesTo.blocks.filter(id => id !== blockId)
          : [...localConfig.appliesTo.blocks, blockId]
      }
    });
  };

  const handleStairToggle = (stairId) => {
    const isSelected = localConfig.appliesTo.stairs.includes(stairId);
    setLocalConfig({
      ...localConfig,
      appliesTo: {
        ...localConfig.appliesTo,
        stairs: isSelected
          ? localConfig.appliesTo.stairs.filter(id => id !== stairId)
          : [...localConfig.appliesTo.stairs, stairId]
      }
    });
  };

  // Creează tab-uri pentru scări (pentru tab-ul Participare) - ÎNAINTE de return
  const stairTabs = useMemo(() => {
    if (!blocks || !stairs) return [];

    return stairs.map(stair => {
      const block = blocks.find(b => b.id === stair.blockId);
      return {
        id: stair.id,
        name: stair.name,
        blockName: block?.name || '',
        label: `${block?.name || ''} - ${stair.name}`
      };
    });
  }, [blocks, stairs]);

  // Filtrează apartamentele pe baza tab-ului selectat - ÎNAINTE de return
  const filteredApartments = useMemo(() => {
    if (!getAssociationApartments) return [];
    const apartments = getAssociationApartments();
    if (selectedStairTab === 'all') return apartments;
    return apartments.filter(apt => apt.stairId === selectedStairTab);
  }, [selectedStairTab, getAssociationApartments]);

  if (!isOpen) return null;

  const apartments = getAssociationApartments();

  // Group stairs by block for display
  const blocksWithStairs = blocks.map(block => ({
    ...block,
    stairs: stairs.filter(stair => stair.blockId === block.id)
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">➕ Adaugă cheltuială nouă</h2>
              <p className="text-green-100 mt-1">Configurează complet noua cheltuială</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-green-800 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              General
            </button>
            <button
              onClick={() => setActiveTab('participation')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'participation'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Participare
            </button>
            <button
              onClick={() => setActiveTab('supplier')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'supplier'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Furnizor
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto min-h-0">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Expense Name Field - NEW */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nume cheltuială *
                </label>
                <input
                  type="text"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="ex: Deratizare, Curățenie, Întreținere lift..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Distribution Type - SAME AS CONFIG MODAL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribuție
                </label>
                <select
                  value={localConfig.distributionType}
                  onChange={(e) => setLocalConfig({ ...localConfig, distributionType: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="apartment">Pe apartament (egal)</option>
                  <option value="individual">Pe apartament (individual)</option>
                  <option value="person">Pe persoană</option>
                  <option value="consumption">Pe consum</option>
                </select>
                <p className="mt-2 text-sm text-gray-600">
                  {localConfig.distributionType === 'apartment' && 'Cheltuiala se împarte egal între toate apartamentele'}
                  {localConfig.distributionType === 'individual' && 'Fiecare apartament are suma proprie'}
                  {localConfig.distributionType === 'person' && 'Cheltuiala se împarte pe numărul de persoane'}
                  {localConfig.distributionType === 'consumption' && 'Cheltuiala se calculează pe baza unităților consumate (mc, kWh, Gcal, etc.)'}
                </p>
              </div>

              {/* Mod participare sumă fixă - apare doar pentru distribuție pe persoană */}
              {localConfig.distributionType === 'person' && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mod participare sumă fixă
                  </label>
                  <select
                    value={localConfig.fixedAmountMode}
                    onChange={(e) => setLocalConfig({ ...localConfig, fixedAmountMode: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="apartment">Per apartament</option>
                    <option value="person">Per persoană</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-600">
                    {localConfig.fixedAmountMode === 'apartment' && 'Sumă fixă per apartament (indiferent de numărul de persoane)'}
                    {localConfig.fixedAmountMode === 'person' && 'Sumă fixă per persoană înmulțită cu numărul de persoane din apartament'}
                  </p>
                </div>
              )}

              {/* Unitate de măsură - apare doar pentru consumption */}
              {localConfig.distributionType === 'consumption' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unitate de măsură
                  </label>
                  <select
                    value={showCustomUnit ? 'custom' : localConfig.consumptionUnit}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomUnit(true);
                        setLocalConfig({ ...localConfig, consumptionUnit: 'custom', customConsumptionUnit: '' });
                      } else {
                        setShowCustomUnit(false);
                        setLocalConfig({ ...localConfig, consumptionUnit: e.target.value, customConsumptionUnit: '' });
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="mc">mc (metri cubi) - Apă, Canalizare, Gaz</option>
                    <option value="Gcal">Gcal (gigacalorii) - Căldură</option>
                    <option value="kWh">kWh (kilowați-oră) - Electricitate</option>
                    <option value="MWh">MWh (megawați-oră) - Electricitate</option>
                    <option value="custom">✏️ Altă unitate...</option>
                  </select>

                  {showCustomUnit && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unitatea personalizată *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: litri, m³, kW, etc."
                        value={localConfig.customConsumptionUnit || ''}
                        onChange={(e) => setLocalConfig({ ...localConfig, customConsumptionUnit: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                  )}

                  <p className="mt-2 text-sm text-gray-600">
                    Unitatea folosită pentru măsurarea consumului
                  </p>
                </div>
              )}

              {/* Invoice Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Factură
                </label>
                <select
                  value={localConfig.invoiceMode}
                  onChange={(e) => handleInvoiceModeChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="single">O singură factură</option>
                  <option value="separate">Facturi separate (per scară/bloc)</option>
                </select>
                <p className="mt-2 text-sm text-gray-600">
                  {localConfig.invoiceMode === 'single' && localConfig.receptionMode === 'total' && 'O factură pe asociație'}
                  {localConfig.invoiceMode === 'single' && localConfig.receptionMode === 'per_block' && 'O factură cu suma totală distribuită pe blocuri'}
                  {localConfig.invoiceMode === 'single' && localConfig.receptionMode === 'per_stair' && 'O factură cu suma totală distribuită pe scări'}
                  {localConfig.invoiceMode === 'separate' && localConfig.receptionMode === 'per_block' && 'Facturi separate pentru fiecare bloc'}
                  {localConfig.invoiceMode === 'separate' && localConfig.receptionMode === 'per_stair' && 'Facturi separate pentru fiecare scară'}
                </p>
              </div>

              {/* Introducere sume */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Introducere sume
                </label>
                <select
                  value={localConfig.receptionMode}
                  onChange={(e) => handleReceptionModeChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {localConfig.invoiceMode !== 'separate' && <option value="total">Pe asociație</option>}
                  {(blocks.length > 1 || localConfig.receptionMode === 'per_block') && <option value="per_block">Per bloc</option>}
                  {(stairs.length > 1 || localConfig.receptionMode === 'per_stair') && <option value="per_stair">Per scară</option>}
                </select>
                <p className="mt-2 text-sm text-gray-600">
                  {localConfig.receptionMode === 'total' && 'Suma se introduce o singură dată pentru întreaga asociație'}
                  {localConfig.receptionMode === 'per_block' && 'Sume separate per bloc'}
                  {localConfig.receptionMode === 'per_stair' && 'Sume separate per scară'}
                </p>
                {localConfig.invoiceMode === 'separate' && localConfig.receptionMode === 'total' && (
                  <p className="mt-2 text-sm text-orange-600 font-medium">
                    ⚠️ Mod "Facturi separate" necesită "Per bloc" sau "Per scară"
                  </p>
                )}
              </div>

              {/* Se aplică pe (bife) - doar pentru per_block și per_stair */}
              {localConfig.receptionMode !== 'total' && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    🏢 Se aplică pe: (bifează)
                  </label>

                  {localConfig.receptionMode === 'per_block' && (
                    <div className="space-y-2">
                      {blocks.map(block => (
                        <label key={block.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={localConfig.appliesTo.blocks.includes(block.id)}
                            onChange={() => handleBlockToggle(block.id)}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <span className="text-sm">{block.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {localConfig.receptionMode === 'per_stair' && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {blocksWithStairs.map(block => (
                        <div key={block.id} className="space-y-1">
                          <div className="text-xs font-medium text-gray-600 px-2">{block.name}</div>
                          {block.stairs.map(stair => (
                            <label key={stair.id} className="flex items-center gap-2 p-2 ml-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={localConfig.appliesTo.stairs.includes(stair.id)}
                                onChange={() => handleStairToggle(stair.id)}
                                className="w-4 h-4 text-green-600 rounded"
                              />
                              <span className="text-sm">{stair.name}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'participation' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Configurează participarea fiecărui apartament la această cheltuială
              </div>

              {/* Tab-uri pentru scări */}
              {stairs.length > 0 && (
                <div className="border-b overflow-x-auto">
                  <div className="flex">
                    <button
                      onClick={() => setSelectedStairTab('all')}
                      className={`px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${
                        selectedStairTab === 'all'
                          ? 'bg-green-50 text-green-700 border-green-700'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Toate
                    </button>
                    {stairTabs.map(stair => {
                      // Verifică dacă scara este activă în configurație
                      const isStairActive = localConfig.receptionMode === 'total' ||
                        (localConfig.receptionMode === 'per_stair' && localConfig.appliesTo.stairs.includes(stair.id)) ||
                        (localConfig.receptionMode === 'per_block' && (() => {
                          const stairObj = stairs.find(s => s.id === stair.id);
                          return stairObj && localConfig.appliesTo.blocks.includes(stairObj.blockId);
                        })());

                      return (
                        <button
                          key={stair.id}
                          onClick={() => setSelectedStairTab(stair.id)}
                          disabled={!isStairActive}
                          className={`px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${
                            selectedStairTab === stair.id
                              ? 'bg-green-50 text-green-700 border-green-700'
                              : isStairActive
                                ? 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                : 'border-transparent text-gray-400 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {stair.label} {!isStairActive && '(Dezactivat)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredApartments.length > 0 ? (
                <div className="space-y-2">
                  {filteredApartments.map(apartment => {
                    const participation = getApartmentParticipation ? getApartmentParticipation(apartment.id, expenseName) : { type: 'integral', value: null };
                    const isModified = participation.type !== 'integral';

                    // Date pentru verificare dacă apartamentul este activ
                    const stair = stairs.find(s => s.id === apartment.stairId);
                    const block = stair ? blocks.find(b => b.id === stair.blockId) : null;

                    // Verifică dacă apartamentul este activ (scara/blocul este selectat)
                    const isApartmentActive = localConfig.receptionMode === 'total' ||
                      (localConfig.receptionMode === 'per_stair' && localConfig.appliesTo.stairs.includes(apartment.stairId)) ||
                      (localConfig.receptionMode === 'per_block' && block && localConfig.appliesTo.blocks.includes(block.id));

                    return (
                      <div
                        key={apartment.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          !isApartmentActive ? 'bg-gray-200 opacity-60' :
                          isModified ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}
                      >
                        <span className="w-20 font-medium">Apt {apartment.number}</span>
                        <span className={`flex-1 ${!isApartmentActive ? 'text-gray-500' : 'text-gray-700'}`}>
                          {apartment.owner || 'Fără proprietar'}
                          {!isApartmentActive && ' (Dezactivat)'}
                        </span>
                        <select
                          value={participation.type}
                          onChange={(e) => {
                            const type = e.target.value;
                            if (type === "integral" || type === "excluded") {
                              if (setApartmentParticipation) {
                                setApartmentParticipation(apartment.id, expenseName, type);
                              }
                            } else {
                              if (setApartmentParticipation) {
                                setApartmentParticipation(apartment.id, expenseName, type, participation.value || (type === "percentage" ? 50 : 0));
                              }
                            }
                          }}
                          disabled={!isApartmentActive}
                          className={`flex-1 p-2 border rounded-lg ${
                            !isApartmentActive ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
                          }`}
                        >
                          <option value="integral">Integral</option>
                          <option value="percentage">Procent</option>
                          <option value="fixed">Sumă fixă</option>
                          <option value="excluded">Exclus</option>
                        </select>
                        {(participation.type === "percentage" || participation.type === "fixed") && (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={participation.value || ""}
                            onChange={(e) => {
                              if (setApartmentParticipation) {
                                setApartmentParticipation(apartment.id, expenseName, participation.type, parseFloat(e.target.value) || 0);
                              }
                            }}
                            disabled={!isApartmentActive}
                            placeholder={participation.type === "percentage" ? "%" : "RON"}
                            className={`w-24 p-2 border rounded-lg ${
                              !isApartmentActive ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nu există apartamente configurate în asociație
                </p>
              )}
            </div>
          )}

          {activeTab === 'supplier' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selectează furnizor
                </label>
                <div className="flex gap-2">
                  <select
                    value={localConfig.supplierId || ''}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg"
                    disabled={loading}
                  >
                    <option value="">Fără furnizor</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    + Adaugă furnizor
                  </button>
                </div>
              </div>

              {localConfig.supplierId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Număr contract
                    </label>
                    <input
                      type="text"
                      value={localConfig.contractNumber}
                      onChange={(e) => setLocalConfig({ ...localConfig, contractNumber: e.target.value })}
                      placeholder="ex: 12345/2024"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Persoană de contact
                    </label>
                    <input
                      type="text"
                      value={localConfig.contactPerson}
                      onChange={(e) => setLocalConfig({ ...localConfig, contactPerson: e.target.value })}
                      placeholder="ex: Ion Popescu"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            disabled={!expenseName.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adaugă cheltuială
          </button>
        </div>
      </div>

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSave={handleAddNewSupplier}
        supplier={null}
        title="Adaugă furnizor nou"
      />
    </div>
  );
};

export default ExpenseAddModal;