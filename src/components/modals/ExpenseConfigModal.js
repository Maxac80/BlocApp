import React, { useState, useEffect, useMemo } from 'react';
import { X, Settings, Users, Building2, Info, Activity, Plus, Trash2 } from 'lucide-react';
import useSuppliers from '../../hooks/useSuppliers';
import SupplierModal from './SupplierModal';

const ExpenseConfigModal = ({
  isOpen,
  onClose,
  expenseName,
  expenseConfig,
  updateExpenseConfig,
  getAssociationApartments,
  getApartmentParticipation,
  setApartmentParticipation,
  currentSheet,
  saveApartmentParticipations,
  blocks = [],
  stairs = []
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [selectedStairTab, setSelectedStairTab] = useState('all');
  const [localConfig, setLocalConfig] = useState({
    distributionType: 'apartment',
    consumptionUnit: 'mc',
    customConsumptionUnit: '',
    invoiceMode: 'single',
    receptionMode: 'total',
    appliesTo: {
      blocks: [],
      stairs: []
    },
    supplierId: null,
    supplierName: '',
    contractNumber: '',
    contactPerson: '',
    // 💰 Mod calcul sumă fixă (pentru distribuție pe persoană)
    fixedAmountMode: 'apartment', // 'apartment' | 'person'
    // 📊 Configurare indecși
    indexConfiguration: {
      enabled: false,
      inputMode: 'mixed', // 'manual' | 'indexes' | 'mixed' - Default: Mixt (flexibil)
      indexTypes: []
    },
    // 💰 Distribuție diferență
    differenceDistribution: {
      method: 'apartment', // 'consumption' | 'apartment' | 'person'
      adjustmentMode: 'none', // 'none' | 'participation' | 'apartmentType'
      apartmentTypeRatios: {}, // Procente pe tip: { 'Garsonieră': 50, '2 camere': 100, etc. }
      includeFixedAmountInDifference: true, // Bifat implicit
      includeExcludedInDifference: false // Nebifat implicit - ultimul
    }
  });

  const [showCustomUnit, setShowCustomUnit] = useState(false);

  // State pentru adăugare apometru nou
  const [newIndexName, setNewIndexName] = useState('');

  // 🏠 State local pentru participările apartamentelor (se salvează în Firebase)
  const [localParticipations, setLocalParticipations] = useState({});

  const { suppliers, loading, addSupplier } = useSuppliers(currentSheet);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const justAddedSupplierRef = React.useRef(false);



  useEffect(() => {
    if (expenseConfig && !justAddedSupplierRef.current) {
      setLocalConfig({
        distributionType: expenseConfig.distributionType || 'apartment',
        consumptionUnit: expenseConfig.consumptionUnit || 'mc',
        customConsumptionUnit: expenseConfig.customConsumptionUnit || '',
        invoiceMode: expenseConfig.invoiceMode || 'single',
        receptionMode: expenseConfig.receptionMode || 'total',
        appliesTo: expenseConfig.appliesTo || {
          blocks: [],
          stairs: []
        },
        supplierId: expenseConfig.supplierId || null,
        supplierName: expenseConfig.supplierName || '',
        contractNumber: expenseConfig.contractNumber || '',
        contactPerson: expenseConfig.contactPerson || '',
        // 💰 Mod calcul sumă fixă (pentru distribuție pe persoană)
        fixedAmountMode: expenseConfig.fixedAmountMode || 'apartment',
        // 📊 Configurare indecși
        indexConfiguration: expenseConfig.indexConfiguration || {
          enabled: false,
          inputMode: 'mixed', // Default: Mixt (flexibil)
          indexTypes: []
        },
        // 💰 Distribuție diferență
        differenceDistribution: expenseConfig.differenceDistribution || {
          method: 'apartment',
          respectParticipation: true,
          includeFixedAmountInDifference: true,
          includeExcludedInDifference: false
        }
      });

      // Setează showCustomUnit dacă unitatea e custom
      setShowCustomUnit(expenseConfig.consumptionUnit === 'custom');
    }
  }, [expenseConfig]);

  // 🔄 Încarcă participările din Firebase la deschiderea modalului
  useEffect(() => {
    if (isOpen && currentSheet && expenseName) {
      const savedParticipations = currentSheet.configSnapshot?.apartmentParticipations || {};

      // Filtrează doar participările pentru cheltuiala curentă
      const expenseParticipations = {};
      Object.keys(savedParticipations).forEach(key => {
        if (key.includes(`-${expenseName}`)) {
          expenseParticipations[key] = savedParticipations[key];
        }
      });

      setLocalParticipations(expenseParticipations);
    } else if (!isOpen) {
      // Resetează participările când modalul se închide
      setLocalParticipations({});
    }
  }, [isOpen, currentSheet, expenseName]);

  const handleAddNewSupplier = async (supplierData) => {
    try {
      const newSupplier = await addSupplier({
        ...supplierData,
        serviceTypes: [expenseName]
      });

      // Setează flag-ul că tocmai am adăugat un furnizor
      justAddedSupplierRef.current = true;

      // Update local config with new supplier
      setLocalConfig(prev => ({
        ...prev,
        supplierId: newSupplier.id,
        supplierName: newSupplier.name
      }));

      // Resetează flag-ul după 2 secunde
      setTimeout(() => {
        justAddedSupplierRef.current = false;
      }, 2000);
    } catch (error) {
      console.error('Error adding supplier:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        supplierData,
        currentSheet: currentSheet?.id
      });

      // More specific error messages
      if (error.code === 'permission-denied') {
        alert('Nu aveți permisiunea de a adăuga furnizori. Verificați dacă sunteți autentificat.');
      } else if (error.message?.includes('Missing or insufficient permissions')) {
        alert('Permisiuni insuficiente. Contactați administratorul.');
      } else {
        alert(`Eroare la adăugarea furnizorului: ${error.message || 'Eroare necunoscută'}. Verificați consola pentru detalii.`);
      }
    }
  };

  const handleSave = async () => {
    try {
      // Validare unitate de măsură custom
      if (localConfig.distributionType === 'consumption' &&
          localConfig.consumptionUnit === 'custom' &&
          !localConfig.customConsumptionUnit?.trim()) {
        alert('Vă rog completați unitatea de măsură personalizată');
        return;
      }

      // Validare participări - verifică dacă există sume/procente necompletate
      const apartments = getAssociationApartments();
      const incompleteParticipations = [];

      apartments.forEach(apartment => {
        const participationKey = `${apartment.id}-${expenseName}`;
        const participation = localParticipations[participationKey] || { type: 'integral', value: null };

        if (participation.type === 'percentage' || participation.type === 'fixed') {
          if (!participation.value || participation.value <= 0) {
            incompleteParticipations.push({
              apartment: apartment.number,
              type: participation.type === 'percentage' ? 'procent' : 'sumă fixă'
            });
          }
        }
      });

      // Dacă există participări incomplete, afișează eroare
      if (incompleteParticipations.length > 0) {
        const messages = incompleteParticipations.map(p =>
          `Apt ${p.apartment}: completați ${p.type}`
        ).join('\n');
        alert(`Participări incomplete:\n\n${messages}\n\nVă rog completați toate valorile înainte de a salva.`);
        return;
      }

      // Închide modalul IMEDIAT pentru a preveni afișarea valorilor vechi
      onClose();

      // Salvează în fundal (după închidere)
      // Save configuration
      await updateExpenseConfig(expenseName, localConfig);

      // Save apartment participations to Firebase
      if (saveApartmentParticipations) {
        // Merge cu participările existente pentru alte cheltuieli
        const allParticipations = currentSheet?.configSnapshot?.apartmentParticipations || {};
        const mergedParticipations = { ...allParticipations, ...localParticipations };
        await saveApartmentParticipations(mergedParticipations);
      }
    } catch (error) {
      console.error('Eroare la salvarea configurației:', error);
      alert('Eroare la salvarea configurației. Verificați consola.');
    }
  };

  const handleSupplierChange = (supplierId) => {
    if (!supplierId) {
      // Dacă se selectează "Fără furnizor"
      setLocalConfig({
        ...localConfig,
        supplierId: null,
        supplierName: ''
      });
    } else {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (supplier) {
        setLocalConfig({
          ...localConfig,
          supplierId: supplier.id,
          supplierName: supplier.name
        });
      }
    }
  };

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
    const currentBlocks = localConfig.appliesTo.blocks;
    const newBlocks = currentBlocks.includes(blockId)
      ? currentBlocks.filter(id => id !== blockId)
      : [...currentBlocks, blockId];

    setLocalConfig({
      ...localConfig,
      appliesTo: {
        ...localConfig.appliesTo,
        blocks: newBlocks
      }
    });
  };

  const handleStairToggle = (stairId) => {
    const currentStairs = localConfig.appliesTo.stairs;
    const newStairs = currentStairs.includes(stairId)
      ? currentStairs.filter(id => id !== stairId)
      : [...currentStairs, stairId];

    setLocalConfig({
      ...localConfig,
      appliesTo: {
        ...localConfig.appliesTo,
        stairs: newStairs
      }
    });
  };

  // Grupare scări pe blocuri
  const blocksWithStairs = blocks.map(block => ({
    ...block,
    stairs: stairs.filter(stair => stair.blockId === block.id)
  }));

  // 📊 FUNCȚII PENTRU GESTIONARE INDECȘI/CONTOARE
  const handleAddIndexType = () => {
    if (!newIndexName.trim()) {
      alert('Introduceți numele contorului');
      return;
    }

    const newIndex = {
      id: `index_${Date.now()}`,
      name: newIndexName.trim(),
      unit: localConfig.consumptionUnit === 'custom'
        ? localConfig.customConsumptionUnit
        : localConfig.consumptionUnit
    };

    setLocalConfig({
      ...localConfig,
      indexConfiguration: {
        ...localConfig.indexConfiguration,
        indexTypes: [...localConfig.indexConfiguration.indexTypes, newIndex]
      }
    });

    setNewIndexName('');
  };

  const handleDeleteIndexType = (indexId) => {
    setLocalConfig({
      ...localConfig,
      indexConfiguration: {
        ...localConfig.indexConfiguration,
        indexTypes: localConfig.indexConfiguration.indexTypes.filter(idx => idx.id !== indexId)
      }
    });
  };

  const handleInputModeChange = (mode) => {
    const updatedConfig = {
      ...localConfig.indexConfiguration,
      inputMode: mode,
      enabled: mode === 'indexes' || mode === 'mixed'
    };

    setLocalConfig({
      ...localConfig,
      indexConfiguration: updatedConfig
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">⚙️ Configurare: {expenseName}</h2>
              <p className="text-purple-100 mt-1">Setări de distribuție și furnizor</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-purple-800 p-2 rounded-lg transition-colors"
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
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
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
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
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
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Furnizor
            </button>
            {/* Tab Consum - vizibil doar pentru distributionType === "consumption" */}
            {localConfig.distributionType === 'consumption' && (
              <button
                onClick={() => setActiveTab('indexes')}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === 'indexes'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity className="w-4 h-4" />
                Consum
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribuție
                </label>
                <select
                  value={localConfig.distributionType}
                  onChange={(e) => setLocalConfig({ ...localConfig, distributionType: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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

              {/* Mod calcul sumă fixă - apare doar pentru distribuție pe persoană */}
              {localConfig.distributionType === 'person' && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Mod calcul sumă fixă (global pentru toată asociația)
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-purple-300 transition-colors">
                      <input
                        type="radio"
                        name="fixedAmountMode"
                        value="apartment"
                        checked={localConfig.fixedAmountMode === 'apartment'}
                        onChange={(e) => setLocalConfig({ ...localConfig, fixedAmountMode: e.target.value })}
                        className="w-4 h-4 text-purple-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Per apartament</div>
                        <div className="text-sm text-gray-600">Suma fixă se calculează per apartament (indiferent de numărul de persoane)</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-purple-300 transition-colors">
                      <input
                        type="radio"
                        name="fixedAmountMode"
                        value="person"
                        checked={localConfig.fixedAmountMode === 'person'}
                        onChange={(e) => setLocalConfig({ ...localConfig, fixedAmountMode: e.target.value })}
                        className="w-4 h-4 text-purple-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Per persoană</div>
                        <div className="text-sm text-gray-600">Suma fixă se calculează înmulțită cu numărul de persoane din apartament</div>
                      </div>
                    </label>
                  </div>
                  <p className="mt-3 text-xs text-purple-700 bg-purple-50 p-2 rounded">
                    💡 Această setare se aplică la toate apartamentele care au participare "Sumă fixă"
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        required
                      />
                    </div>
                  )}

                  <p className="mt-2 text-sm text-gray-600">
                    Unitatea folosită pentru măsurarea consumului
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Factură
                </label>
                <select
                  value={localConfig.invoiceMode}
                  onChange={(e) => handleInvoiceModeChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                        <label key={block.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-purple-50">
                          <input
                            type="checkbox"
                            checked={localConfig.appliesTo.blocks.includes(block.id)}
                            onChange={() => handleBlockToggle(block.id)}
                            className="w-4 h-4 text-purple-600 rounded"
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
                            <label key={stair.id} className="flex items-center gap-2 p-2 ml-4 border rounded-lg cursor-pointer hover:bg-purple-50">
                              <input
                                type="checkbox"
                                checked={localConfig.appliesTo.stairs.includes(stair.id)}
                                onChange={() => handleStairToggle(stair.id)}
                                className="w-4 h-4 text-purple-600 rounded"
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
                          ? 'bg-purple-50 text-purple-700 border-purple-700'
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
                              ? 'bg-purple-50 text-purple-700 border-purple-700'
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
                    const participationKey = `${apartment.id}-${expenseName}`;
                    const participation = localParticipations[participationKey] || { type: 'integral', value: null };
                    const isModified = participation.type !== 'integral';

                    // Date pentru tooltip
                    const stair = stairs.find(s => s.id === apartment.stairId);
                    const block = stair ? blocks.find(b => b.id === stair.blockId) : null;

                    // Verifică dacă apartamentul este activ (scara/blocul este selectat)
                    const isApartmentActive = localConfig.receptionMode === 'total' ||
                      (localConfig.receptionMode === 'per_stair' && localConfig.appliesTo.stairs.includes(apartment.stairId)) ||
                      (localConfig.receptionMode === 'per_block' && block && localConfig.appliesTo.blocks.includes(block.id));

                    return (
                      <div key={apartment.id} className="space-y-0">
                      <div
                        className={`grid grid-cols-[80px_1fr_160px_100px] gap-3 p-3 rounded-lg items-center ${
                          !isApartmentActive ? 'bg-gray-200 opacity-60' :
                          isModified ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                        }`}
                      >
                        <span className="font-medium text-sm">Apt {apartment.number}</span>
                        <span className={`text-sm truncate ${!isApartmentActive ? 'text-gray-500' : 'text-gray-700'}`}>
                          {apartment.owner || 'Fără proprietar'}
                          {!isApartmentActive && ' (Dezactivat)'}
                        </span>
                        <select
                          value={participation.type}
                          onChange={(e) => {
                            const type = e.target.value;
                            const newValue = type === "percentage" ? 50 : type === "fixed" ? 0 : null;
                            setLocalParticipations({
                              ...localParticipations,
                              [participationKey]: {
                                type,
                                value: newValue
                              }
                            });
                          }}
                          disabled={!isApartmentActive}
                          className={`p-2 border rounded-lg text-sm ${
                            !isApartmentActive ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
                          }`}
                        >
                          <option value="integral">Integral</option>
                          <option value="percentage">Procent</option>
                          <option value="fixed">Sumă fixă</option>
                          <option value="excluded">Exclus</option>
                        </select>
                        <div className="flex justify-end">
                          {(participation.type === "percentage" || participation.type === "fixed") && (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={participation.value || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Permite doar numere și punct zecimal
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  setLocalParticipations({
                                    ...localParticipations,
                                    [participationKey]: {
                                      ...participation,
                                      value: value === '' ? 0 : parseFloat(value) || 0
                                    }
                                  });
                                }
                              }}
                              disabled={!isApartmentActive}
                              placeholder={participation.type === "percentage" ? "%" : "RON"}
                              className={`w-20 p-2 border rounded-lg text-sm text-right ${
                                !isApartmentActive ? 'bg-gray-100 cursor-not-allowed' :
                                (!participation.value || participation.value <= 0)
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-300'
                              }`}
                            />
                          )}
                        </div>
                      </div>

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
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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

          {/* Tab Consum */}
          {activeTab === 'indexes' && localConfig.distributionType === 'consumption' && (
            <div className="space-y-6">
              {/* 1️⃣ Mod introducere date */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">
                  1️⃣ Mod introducere date
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="radio"
                      name="inputMode"
                      value="mixed"
                      checked={localConfig.indexConfiguration.inputMode === 'mixed'}
                      onChange={(e) => handleInputModeChange(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Mixt (flexibil)</div>
                      <div className="text-sm text-gray-600">Permite atât indecși cât și introducere consumuri</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="radio"
                      name="inputMode"
                      value="indexes"
                      checked={localConfig.indexConfiguration.inputMode === 'indexes'}
                      onChange={(e) => handleInputModeChange(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Indecși</div>
                      <div className="text-sm text-gray-600">Index vechi → Index nou (calcul automat consum)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="radio"
                      name="inputMode"
                      value="manual"
                      checked={localConfig.indexConfiguration.inputMode === 'manual'}
                      onChange={(e) => handleInputModeChange(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Introducere consumuri</div>
                      <div className="text-sm text-gray-600">Introduci direct consumul (ex: 8.5 mc)</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2️⃣ Configurare Contoare - apare doar pentru indexes sau mixed */}
              {(localConfig.indexConfiguration.inputMode === 'indexes' || localConfig.indexConfiguration.inputMode === 'mixed') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-900 mb-3">
                    2️⃣ Configurare Contoare
                  </h3>

                  {/* Listă contoare configurate */}
                  {localConfig.indexConfiguration.indexTypes.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <div className="text-xs font-medium text-gray-600 mb-2">Contoare configurate:</div>
                      {localConfig.indexConfiguration.indexTypes.map(indexType => (
                        <div key={indexType.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-600" />
                            <span className="font-medium">{indexType.name}</span>
                            <span className="text-sm text-gray-500">({indexType.unit})</span>
                          </div>
                          <button
                            onClick={() => handleDeleteIndexType(indexType.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Șterge contor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adăugare contor nou */}
                  <div className="bg-white border-2 border-dashed border-green-300 rounded-lg p-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nume contor (ex: Contor baie, Contor bucătărie, Contor hol)"
                        value={newIndexName}
                        onChange={(e) => setNewIndexName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddIndexType()}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <button
                        onClick={handleAddIndexType}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Adaugă
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3️⃣ Distribuție Diferență */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-orange-900 mb-3">
                  3️⃣ Distribuție Diferență (Pierderi/Scurgeri)
                </h3>

                <div className="space-y-4">
                  {/* Explicație */}
                  <p className="text-sm text-gray-600">
                    Cum se distribuie diferența dintre totalul facturii și suma consumurilor declarate?
                  </p>

                  {/* Metoda de distribuție */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Metoda de distribuție:
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-2 bg-white border rounded-lg cursor-pointer hover:border-orange-300">
                        <input
                          type="radio"
                          name="differenceMethod"
                          value="apartment"
                          checked={localConfig.differenceDistribution.method === 'apartment'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, method: e.target.value }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm">Egal pe apartament</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-white border rounded-lg cursor-pointer hover:border-orange-300">
                        <input
                          type="radio"
                          name="differenceMethod"
                          value="consumption"
                          checked={localConfig.differenceDistribution.method === 'consumption'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, method: e.target.value }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm">Proporțional cu consumul</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-white border rounded-lg cursor-pointer hover:border-orange-300">
                        <input
                          type="radio"
                          name="differenceMethod"
                          value="person"
                          checked={localConfig.differenceDistribution.method === 'person'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, method: e.target.value }
                          })}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm">Proporțional cu numărul de persoane</span>
                      </label>

                    </div>
                  </div>

                  {/* AJUSTĂRI DIFERENȚĂ */}
                  <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50/30">
                    <label className="block text-sm font-medium text-orange-900 mb-3">
                      ⚙️ Mod de ajustare a diferenței
                    </label>
                    <div className="space-y-2">

                      {/* Opțiune 1: Fără ajustări */}
                      <label className="flex items-start gap-3 p-3 bg-white border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                        <input
                          type="radio"
                          name="adjustmentMode"
                          value="none"
                          checked={localConfig.differenceDistribution.adjustmentMode === 'none'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, adjustmentMode: e.target.value }
                          })}
                          className="w-4 h-4 text-gray-600 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Fără ajustări suplimentare</div>
                          <div className="text-xs text-gray-600 mt-1">Diferența se distribuie doar conform metodei alese mai sus</div>
                        </div>
                      </label>

                      {/* Opțiune 2: Respectă configurările de participare */}
                      <label className="flex items-start gap-3 p-3 bg-white border-2 border-green-300 rounded-lg cursor-pointer hover:border-green-400">
                        <input
                          type="radio"
                          name="adjustmentMode"
                          value="participation"
                          checked={localConfig.differenceDistribution.adjustmentMode === 'participation'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, adjustmentMode: e.target.value }
                          })}
                          className="w-4 h-4 text-green-600 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-green-900">Respectă configurările de participare</div>
                          <div className="text-xs text-green-700 mt-1">Aplică procentele individuale configurate (ex: Apt cu 50% → primește 50% din diferență)</div>
                        </div>
                      </label>

                      {/* Opțiune 3: Ajustare pe tip apartament */}
                      <label className="flex items-start gap-3 p-3 bg-white border-2 border-purple-300 rounded-lg cursor-pointer hover:border-purple-400">
                        <input
                          type="radio"
                          name="adjustmentMode"
                          value="apartmentType"
                          checked={localConfig.differenceDistribution.adjustmentMode === 'apartmentType'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, adjustmentMode: e.target.value }
                          })}
                          className="w-4 h-4 text-purple-600 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-purple-900">Ajustare pe tip apartament</div>
                          <div className="text-xs text-purple-700 mt-1">Configurează procente diferite pentru fiecare tip (Garsonieră, 2 camere, etc.)</div>
                        </div>
                      </label>

                      {/* Panel configurare procente pe tip apartament */}
                      {localConfig.differenceDistribution.adjustmentMode === 'apartmentType' && (
                        <div className="ml-7 p-4 bg-white border border-purple-300 rounded-lg">
                          <label className="block text-sm font-medium text-purple-900 mb-3">
                            Procent din diferența calculată pentru fiecare tip:
                          </label>
                          <div className="space-y-2">
                            {['Garsonieră', '2 camere', '3 camere', '4 camere', 'Penthouse'].map(type => (
                              <div key={type} className="flex items-center gap-3 bg-purple-50 p-2 rounded border border-purple-200">
                                <label className="flex-1 text-sm font-medium text-gray-700">{type}</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="100"
                                  value={localConfig.differenceDistribution.apartmentTypeRatios?.[type] || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setLocalConfig({
                                      ...localConfig,
                                      differenceDistribution: {
                                        ...localConfig.differenceDistribution,
                                        apartmentTypeRatios: {
                                          ...localConfig.differenceDistribution.apartmentTypeRatios,
                                          [type]: value === '' ? undefined : parseInt(value)
                                        }
                                      }
                                    });
                                  }}
                                  className="w-20 p-2 text-sm border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-600">%</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-purple-700 mt-3">
                            💡 Lasă gol pentru 100% (implicit). Cu reponderare - suma totală se păstrează.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Opțiuni suplimentare care se aplică la orice mod */}
                    <div className="mt-4 pt-4 border-t border-orange-300">
                      <label className="block text-sm font-medium text-orange-900 mb-2">Opțiuni suplimentare:</label>
                      <div className="space-y-2">
                        {/* Include apartamente cu sumă fixă */}
                        <label className="flex items-center gap-3 p-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={localConfig.differenceDistribution.includeFixedAmountInDifference}
                            onChange={(e) => setLocalConfig({
                              ...localConfig,
                              differenceDistribution: { ...localConfig.differenceDistribution, includeFixedAmountInDifference: e.target.checked }
                            })}
                            className="w-4 h-4 text-orange-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">Include apartamente cu sumă fixă</div>
                            <div className="text-xs text-gray-600">Apartamentele cu sumă fixă participă și la diferență</div>
                          </div>
                        </label>

                        {/* Include apartamente excluse */}
                        <label className="flex items-center gap-3 p-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={localConfig.differenceDistribution.includeExcludedInDifference}
                            onChange={(e) => setLocalConfig({
                              ...localConfig,
                              differenceDistribution: { ...localConfig.differenceDistribution, includeExcludedInDifference: e.target.checked }
                            })}
                            className="w-4 h-4 text-orange-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">Include apartamente excluse</div>
                            <div className="text-xs text-gray-600">Apartamentele excluse (debranșate) participă și la diferență</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Exemplu explicativ dinamic */}
                  <div className="bg-gradient-to-br from-orange-50 to-purple-50 border-2 border-orange-200 rounded-lg p-4">
                    <div className="text-xs font-bold text-orange-900 mb-3">💡 Exemplu detaliat - cum se aplică configurările:</div>
                    <div className="text-xs text-gray-700 space-y-2">
                      {/* Setup inițial */}
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <div className="font-semibold text-gray-800 mb-1">📋 Setup:</div>
                        <div>• Apt 1 - Garsonieră (Participare: Integral 100%)</div>
                        <div>• Apt 2 - 2 camere (Participare: Procent 50%)</div>
                        <div>• Apt 3 - 3 camere (Participare: Sumă fixă 100 RON)</div>
                        <div>• Apt 4 - Penthouse (Participare: Exclus)</div>
                        <div className="font-semibold mt-2">Diferență de distribuit: 100 RON</div>
                        <div className="font-semibold">Metodă: {
                          localConfig.differenceDistribution.method === 'apartment' ? 'Egal pe apartament' :
                          localConfig.differenceDistribution.method === 'consumption' ? 'Proporțional cu consumul' :
                          'Proporțional cu persoanele'
                        }</div>
                        <div className="font-semibold">Ajustare: {
                          localConfig.differenceDistribution.adjustmentMode === 'none' ? 'Fără ajustări' :
                          localConfig.differenceDistribution.adjustmentMode === 'participation' ? 'Respectă participare' :
                          'Pe tip apartament'
                        }</div>
                      </div>

                      {/* Pasul 1: Calcul de bază */}
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <div className="font-semibold text-blue-900 mb-1">① Calcul de bază (metodă aleasă):</div>
                        <div>Diferența se împarte {
                          localConfig.differenceDistribution.method === 'apartment' ? 'egal pe apartament' :
                          localConfig.differenceDistribution.method === 'consumption' ? 'proporțional cu consumul' :
                          'proporțional cu persoanele'
                        }</div>
                        <div className="text-blue-700 mt-1">
                          {(() => {
                            const includeFixed = localConfig.differenceDistribution.includeFixedAmountInDifference;
                            const includeExcluded = localConfig.differenceDistribution.includeExcludedInDifference;
                            let participatingCount = 2; // Apt 1, Apt 2
                            if (includeFixed) participatingCount++; // + Apt 3
                            if (includeExcluded) participatingCount++; // + Apt 4
                            const perApt = 100 / participatingCount;

                            return (
                              <>
                                <div>Participă: Apt 1, Apt 2{includeFixed ? ', Apt 3' : ''}{includeExcluded ? ', Apt 4' : ''}</div>
                                <div>100 RON ÷ {participatingCount} ap = {perApt.toFixed(2)} RON/ap</div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Pasul 2: MOD PARTICIPATION */}
                      {localConfig.differenceDistribution.adjustmentMode === 'participation' && (
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          <div className="font-semibold text-green-900 mb-1">② Aplică configurările de participare:</div>
                          {(() => {
                            const includeFixed = localConfig.differenceDistribution.includeFixedAmountInDifference;
                            const includeExcluded = localConfig.differenceDistribution.includeExcludedInDifference;
                            let participatingCount = 2;
                            if (includeFixed) participatingCount++;
                            if (includeExcluded) participatingCount++;
                            const perApt = 100 / participatingCount;

                            return (
                              <>
                                <div>• Apt 1: {perApt.toFixed(2)} RON × 100% = {perApt.toFixed(2)} RON</div>
                                <div>• Apt 2: {perApt.toFixed(2)} RON × 50% = {(perApt * 0.5).toFixed(2)} RON</div>
                                {includeFixed && <div>• Apt 3: {perApt.toFixed(2)} RON (sumă fixă participă)</div>}
                                {includeExcluded && <div>• Apt 4: {perApt.toFixed(2)} RON (exclus participă)</div>}
                              </>
                            );
                          })()}
                          <div className="text-green-700 text-[10px] mt-2">💡 Se aplică procentele de participare. Total rămâne {(() => {
                            const includeFixed = localConfig.differenceDistribution.includeFixedAmountInDifference;
                            const includeExcluded = localConfig.differenceDistribution.includeExcludedInDifference;
                            let participatingCount = 2;
                            if (includeFixed) participatingCount++;
                            if (includeExcluded) participatingCount++;
                            const perApt = 100 / participatingCount;
                            const total = perApt + (perApt * 0.5) + (includeFixed ? perApt : 0) + (includeExcluded ? perApt : 0);
                            return total.toFixed(2);
                          })()} RON (se pierde diferența pentru procente &lt; 100%).</div>
                        </div>
                      )}

                      {/* Pasul 2: MOD APARTMENT TYPE */}
                      {localConfig.differenceDistribution.adjustmentMode === 'apartmentType' && (
                        <div className="bg-purple-50 p-2 rounded border border-purple-200">
                          <div className="font-semibold text-purple-900 mb-1">② Ajustare pe tip apartament (REPONDERARE):</div>
                          <div className="text-purple-700 text-[10px] mb-2">💡 Greutăți = suma bază × procent tip. Redistribuim 100 RON proporțional cu greutățile.</div>
                          {(() => {
                            const includeFixed = localConfig.differenceDistribution.includeFixedAmountInDifference;
                            const includeExcluded = localConfig.differenceDistribution.includeExcludedInDifference;
                            let participatingCount = 2;
                            if (includeFixed) participatingCount++;
                            if (includeExcluded) participatingCount++;
                            const perApt = 100 / participatingCount;

                            const ratioGarsioniera = (localConfig.differenceDistribution.apartmentTypeRatios?.['Garsonieră'] || 100) / 100;
                            const ratio2Camere = (localConfig.differenceDistribution.apartmentTypeRatios?.['2 camere'] || 100) / 100;
                            const ratio3Camere = (localConfig.differenceDistribution.apartmentTypeRatios?.['3 camere'] || 100) / 100;
                            const ratioPenthouse = (localConfig.differenceDistribution.apartmentTypeRatios?.['Penthouse'] || 100) / 100;

                            const weight1 = perApt * ratioGarsioniera;
                            const weight2 = perApt * ratio2Camere;
                            const weight3 = includeFixed ? (perApt * ratio3Camere) : 0;
                            const weight4 = includeExcluded ? (perApt * ratioPenthouse) : 0;
                            const totalWeights = weight1 + weight2 + weight3 + weight4;

                            const final1 = totalWeights > 0 ? (weight1 / totalWeights) * 100 : 0;
                            const final2 = totalWeights > 0 ? (weight2 / totalWeights) * 100 : 0;
                            const final3 = totalWeights > 0 ? (weight3 / totalWeights) * 100 : 0;
                            const final4 = totalWeights > 0 ? (weight4 / totalWeights) * 100 : 0;

                            return (
                              <>
                                <div className="text-xs">
                                  <div>• Apt 1: greutate = {perApt.toFixed(2)} × {(ratioGarsioniera * 100).toFixed(0)}% = {weight1.toFixed(2)}</div>
                                  <div>• Apt 2: greutate = {perApt.toFixed(2)} × {(ratio2Camere * 100).toFixed(0)}% = {weight2.toFixed(2)}</div>
                                  {includeFixed && <div>• Apt 3: greutate = {perApt.toFixed(2)} × {(ratio3Camere * 100).toFixed(0)}% = {weight3.toFixed(2)}</div>}
                                  {includeExcluded && <div>• Apt 4: greutate = {perApt.toFixed(2)} × {(ratioPenthouse * 100).toFixed(0)}% = {weight4.toFixed(2)}</div>}
                                  <div className="font-semibold mt-1">Total greutăți: {totalWeights.toFixed(2)}</div>
                                </div>
                                <div className="text-xs mt-2 pt-2 border-t border-purple-300">
                                  <div className="font-semibold mb-1">Redistribuire 100 RON:</div>
                                  <div>• Apt 1: ({weight1.toFixed(2)} / {totalWeights.toFixed(2)}) × 100 = {final1.toFixed(2)} RON</div>
                                  <div>• Apt 2: ({weight2.toFixed(2)} / {totalWeights.toFixed(2)}) × 100 = {final2.toFixed(2)} RON</div>
                                  {includeFixed && <div>• Apt 3: ({weight3.toFixed(2)} / {totalWeights.toFixed(2)}) × 100 = {final3.toFixed(2)} RON</div>}
                                  {includeExcluded && <div>• Apt 4: ({weight4.toFixed(2)} / {totalWeights.toFixed(2)}) × 100 = {final4.toFixed(2)} RON</div>}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Rezultat final */}
                      <div className="bg-gray-800 text-white p-2 rounded">
                        <div className="font-semibold mb-1">✅ REZULTAT FINAL:</div>
                        {(() => {
                          const includeFixed = localConfig.differenceDistribution.includeFixedAmountInDifference;
                          const includeExcluded = localConfig.differenceDistribution.includeExcludedInDifference;
                          let participatingCount = 2;
                          if (includeFixed) participatingCount++;
                          if (includeExcluded) participatingCount++;
                          const perApt = 100 / participatingCount;

                          let apt1 = perApt;
                          let apt2 = perApt;
                          let apt3 = includeFixed ? perApt : 0;
                          let apt4 = includeExcluded ? perApt : 0;

                          // Aplică modul de ajustare selectat
                          if (localConfig.differenceDistribution.adjustmentMode === 'participation') {
                            // Aplică procentele de participare
                            apt1 = perApt; // 100%
                            apt2 = perApt * 0.5; // 50%
                            // apt3 și apt4 rămân neschimbate
                          } else if (localConfig.differenceDistribution.adjustmentMode === 'apartmentType') {
                            // Aplică reponderarea pe tip apartament
                            const ratioGarsioniera = (localConfig.differenceDistribution.apartmentTypeRatios?.['Garsonieră'] || 100) / 100;
                            const ratio2Camere = (localConfig.differenceDistribution.apartmentTypeRatios?.['2 camere'] || 100) / 100;
                            const ratio3Camere = (localConfig.differenceDistribution.apartmentTypeRatios?.['3 camere'] || 100) / 100;
                            const ratioPenthouse = (localConfig.differenceDistribution.apartmentTypeRatios?.['Penthouse'] || 100) / 100;

                            const weight1 = apt1 * ratioGarsioniera;
                            const weight2 = apt2 * ratio2Camere;
                            const weight3 = apt3 * ratio3Camere;
                            const weight4 = apt4 * ratioPenthouse;
                            const totalWeights = weight1 + weight2 + weight3 + weight4;

                            if (totalWeights > 0) {
                              apt1 = (weight1 / totalWeights) * 100;
                              apt2 = (weight2 / totalWeights) * 100;
                              apt3 = (weight3 / totalWeights) * 100;
                              apt4 = (weight4 / totalWeights) * 100;
                            }
                          }

                          const total = apt1 + apt2 + apt3 + apt4;

                          return (
                            <>
                              <div>Apt 1 (Garsonieră): {apt1.toFixed(2)} RON</div>
                              <div>Apt 2 (2 camere): {apt2.toFixed(2)} RON</div>
                              {(includeFixed || apt3 > 0) && <div>Apt 3 (3 camere): {apt3.toFixed(2)} RON</div>}
                              {(includeExcluded || apt4 > 0) && <div>Apt 4 (Penthouse): {apt4.toFixed(2)} RON</div>}
                              <div className="font-semibold mt-2 pt-2 border-t border-gray-600">TOTAL: {total.toFixed(2)} RON / 100 RON</div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Salvează configurație
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

export default ExpenseConfigModal;