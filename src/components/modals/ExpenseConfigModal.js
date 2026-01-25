import React, { useState, useEffect, useMemo } from 'react';
import { X, Settings, Users, Building2, Activity, Plus, Trash2, MoreVertical, Edit, Gauge } from 'lucide-react';
import useSuppliers from '../../hooks/useSuppliers';
import SupplierModal from './SupplierModal';
import { defaultExpenseTypes } from '../../data/expenseTypes';

// Funcție pentru normalizarea textului (elimină diacriticele și convertește la lowercase)
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const ExpenseConfigModal = ({
  mode = 'edit', // 'add' | 'edit'
  isOpen,
  onClose,
  expenseName, // Optional when mode='add'
  expenseConfig, // Optional when mode='add'
  updateExpenseConfig, // Used in 'edit' mode
  onAddExpense, // Used in 'add' mode
  getAssociationApartments,
  getApartmentParticipation,
  setApartmentParticipation,
  currentSheet,
  saveApartmentParticipations,
  blocks = [],
  stairs = [],
  initialTab = 'general',
  getAssociationExpenseTypes, // For duplicate name checking in 'add' mode
  updateExpenseConsumption, // For clearing consumption when excluding apartments
  updatePendingConsumption // For clearing consumption in pending expenses
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedStairTab, setSelectedStairTab] = useState('all');
  const [inputExpenseName, setInputExpenseName] = useState(''); // For 'add' mode
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
      indexTypes: [],
      // 📱 Setări Portal Locatari
      portalSubmission: {
        enabled: true,           // Permite transmitere din portal
        periodType: 'auto',      // 'auto' | 'manual' | 'custom'
        isOpen: true,            // Pentru periodType: 'manual'
        startDay: 1,             // Pentru periodType: 'custom'
        endDay: 25               // Pentru periodType: 'custom'
      }
    },
    // 💰 Distribuție diferență - SIMPLIFICAT
    differenceDistribution: {
      method: 'apartment',
      adjustmentMode: 'none',
      apartmentTypeRatios: {},
      includeFixedAmountInDifference: true,
      includeExcludedInDifference: false
    }
  });

  const [showCustomUnit, setShowCustomUnit] = useState(false);

  // State pentru adăugare apometru nou
  const [newIndexName, setNewIndexName] = useState('');
  const [showAddIndexForm, setShowAddIndexForm] = useState(false);

  // State pentru editare contor
  const [editingIndexId, setEditingIndexId] = useState(null);
  const [editingIndexName, setEditingIndexName] = useState('');

  // State pentru dropdown menu (3 puncte)
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // 🏠 State local pentru participările apartamentelor (se salvează în Firebase)
  const [localParticipations, setLocalParticipations] = useState({});

  // 🔧 State local pentru configurarea contoarelor per apartament
  const [localApartmentMeters, setLocalApartmentMeters] = useState({});

  const { suppliers, loading, addSupplier } = useSuppliers(currentSheet);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const justAddedSupplierRef = React.useRef(false);

  // 🔑 Cheia pentru participări: folosește expenseTypeId sau expenseName (sau inputExpenseName în modul add)
  const expenseKey = useMemo(() => {
    if (mode === 'add') {
      return inputExpenseName.trim(); // In ADD mode, use the input name
    }
    return expenseConfig?.id || expenseName; // In EDIT mode, use config ID or passed name
  }, [mode, inputExpenseName, expenseConfig, expenseName]);

  // Reset tab când se deschide modalul sau se schimbă initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Reset form when modal opens in ADD mode
  useEffect(() => {
    if (isOpen && mode === 'add') {
      setInputExpenseName('');
      setLocalConfig({
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
        fixedAmountMode: 'apartment',
        indexConfiguration: {
          enabled: false,
          inputMode: 'mixed',
          indexTypes: [],
          portalSubmission: {
            enabled: true,
            periodType: 'auto',
            isOpen: true,
            startDay: 1,
            endDay: 25
          }
        },
        differenceDistribution: {
          method: 'apartment',
          adjustmentMode: 'none',
          apartmentTypeRatios: {},
          includeFixedAmountInDifference: true,
          includeExcludedInDifference: false
        }
      });
      setShowCustomUnit(false);
      setLocalParticipations({});
    }
  }, [isOpen, mode]);

  // Load config when modal opens in EDIT mode
  useEffect(() => {
    if (isOpen && mode === 'edit' && expenseConfig && !justAddedSupplierRef.current) {
      console.log('🔧 [ExpenseConfigModal] EDIT MODE - expenseConfig received:', {
        id: expenseConfig.id,
        name: expenseConfig.name,
        distributionType: expenseConfig.distributionType
      });
      const distributionType = expenseConfig.distributionType || 'apartment';
      const defaultFixedAmountMode = distributionType === 'person' ? 'person' : 'apartment';

      const newLocalConfig = {
        distributionType: distributionType,
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
        // Default: 'person' dacă distributionType e 'person', altfel 'apartment'
        fixedAmountMode: expenseConfig.fixedAmountMode || defaultFixedAmountMode,
        // 📊 Configurare indecși
        indexConfiguration: {
          enabled: expenseConfig.indexConfiguration?.enabled || false,
          inputMode: expenseConfig.indexConfiguration?.inputMode || 'mixed',
          indexTypes: expenseConfig.indexConfiguration?.indexTypes || [],
          apartmentMeters: expenseConfig.indexConfiguration?.apartmentMeters || {},
          // 📱 Setări Portal Locatari - merge cu defaults
          portalSubmission: {
            enabled: expenseConfig.indexConfiguration?.portalSubmission?.enabled ?? true,
            periodType: expenseConfig.indexConfiguration?.portalSubmission?.periodType || 'auto',
            isOpen: expenseConfig.indexConfiguration?.portalSubmission?.isOpen ?? true,
            startDay: expenseConfig.indexConfiguration?.portalSubmission?.startDay || 1,
            endDay: expenseConfig.indexConfiguration?.portalSubmission?.endDay || 25
          }
        },
        // 💰 Distribuție diferență - citire directă
        differenceDistribution: expenseConfig.differenceDistribution || {
          method: 'apartment',
          adjustmentMode: 'none',
          apartmentTypeRatios: {},
          includeFixedAmountInDifference: true,
          includeExcludedInDifference: false
        }
      };
      console.log('🔧 [ExpenseConfigModal] Setting localConfig with distributionType:', newLocalConfig.distributionType);
      setLocalConfig(newLocalConfig);

      // Setează showCustomUnit dacă unitatea e custom
      setShowCustomUnit(expenseConfig.consumptionUnit === 'custom');
    }
  }, [isOpen, mode, expenseConfig]);

  // 🔄 Încarcă participările din Firebase la deschiderea modalului
  // IMPORTANT: Folosim un ref pentru a evita re-încărcarea când user-ul modifică participările local
  const hasLoadedParticipations = React.useRef(false);

  useEffect(() => {
    if (isOpen && expenseKey && getApartmentParticipation && getAssociationApartments) {
      // Încarcă participările DOAR la prima deschidere a modalului
      if (!hasLoadedParticipations.current) {
        const apartments = getAssociationApartments();
        const expenseParticipations = {};

        // Încarcă participările pentru fiecare apartament folosind expenseKey (ID sau name)
        apartments.forEach(apartment => {
          const participationKey = `${apartment.id}-${expenseKey}`;
          const participation = getApartmentParticipation(apartment.id, expenseKey);

          // Doar dacă există o participare non-default, o adăugăm
          if (participation && participation.type !== 'integral') {
            expenseParticipations[participationKey] = participation;
          }
        });

        setLocalParticipations(expenseParticipations);
        hasLoadedParticipations.current = true;
      }
    } else if (!isOpen) {
      // Resetează participările când modalul se închide
      setLocalParticipations({});
      hasLoadedParticipations.current = false;
    }
  }, [isOpen, expenseKey, getApartmentParticipation, getAssociationApartments]);

  // 🔧 Încarcă configurația contoarelor per apartament la deschiderea modalului
  useEffect(() => {
    if (isOpen && expenseConfig?.indexConfiguration?.apartmentMeters) {
      setLocalApartmentMeters(expenseConfig.indexConfiguration.apartmentMeters);
    } else if (!isOpen) {
      // Resetează când modalul se închide
      setLocalApartmentMeters({});
    }
  }, [isOpen, expenseConfig]);

  // Închide dropdown-ul când se dă click în afara lui
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdownId && !event.target.closest('.relative')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdownId]);

  const handleAddNewSupplier = async (supplierData) => {
    try {
      const newSupplier = await addSupplier({
        ...supplierData,
        serviceTypes: [expenseKey]  // Folosește ID-ul cheltuielii, nu numele
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
      // ADD MODE: Validate expense name
      if (mode === 'add') {
        if (!inputExpenseName.trim()) {
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

        const normalizedInputName = normalizeText(inputExpenseName);

        // Verifică dacă numele există în cheltuielile standard
        const standardExpenseExists = defaultExpenseTypes.some(expense =>
          normalizeText(expense.name) === normalizedInputName
        );

        if (standardExpenseExists) {
          alert(`Cheltuiala cu numele "${inputExpenseName.trim()}" există deja în cheltuielile standard. Vă rugăm să alegeți un alt nume.`);
          return;
        }

        // Verifică dacă numele cheltuielii există deja în cheltuielile custom
        if (getAssociationExpenseTypes) {
          const existingExpenseTypes = getAssociationExpenseTypes();
          const nameExists = existingExpenseTypes.some(expense =>
            normalizeText(expense.name) === normalizedInputName
          );

          if (nameExists) {
            alert(`Cheltuiala cu numele "${inputExpenseName.trim()}" există deja. Vă rugăm să alegeți un alt nume.`);
            return;
          }
        }
      }

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
        const participationKey = `${apartment.id}-${expenseKey}`;
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

      // EDIT MODE: VERIFICARE CRITICĂ: Detectează schimbarea receptionMode când există distribuție activă
      if (mode === 'edit' && expenseConfig && localConfig.receptionMode !== expenseConfig.receptionMode) {
        // Verifică dacă există o cheltuială distribuită în luna curentă
        const existingExpense = currentSheet?.expenses?.find(exp => exp.name === expenseName);

        if (existingExpense) {
          const oldMode = expenseConfig.receptionMode === 'per_association' ? 'Pe asociație' :
                         expenseConfig.receptionMode === 'per_block' ? 'Per bloc' :
                         expenseConfig.receptionMode === 'per_stair' ? 'Per scară' : expenseConfig.receptionMode;
          const newMode = localConfig.receptionMode === 'per_association' ? 'Pe asociație' :
                         localConfig.receptionMode === 'per_block' ? 'Per bloc' :
                         localConfig.receptionMode === 'per_stair' ? 'Per scară' : localConfig.receptionMode;

          alert(`⚠️ ATENȚIE!\n\nAi schimbat modul de primire factură de la "${oldMode}" la "${newMode}".\n\nAceastă cheltuială este deja distribuită în luna curentă cu configurația veche.\n\nPentru a schimba configurația, trebuie mai întâi să:\n1. Ștergi distribuirea existentă (din tab Cheltuieli distribuite → meniul cu 3 puncte → Șterge distribuirea)\n2. Salvezi noua configurație\n3. Re-distribui cheltuiala cu noile setări`);
          return;
        }
      }

      // 🔧 Pregătește configurația finală cu apartmentMeters inclus
      const finalConfig = {
        ...localConfig,
        indexConfiguration: {
          ...localConfig.indexConfiguration,
          apartmentMeters: localApartmentMeters
        }
      };

      // ADD MODE: Call onAddExpense
      if (mode === 'add') {
        await onAddExpense({
          name: inputExpenseName.trim(),
          defaultDistribution: finalConfig.distributionType,
          receptionMode: finalConfig.receptionMode,
          appliesTo: finalConfig.appliesTo
        }, finalConfig);
      } else {
        // EDIT MODE: Call updateExpenseConfig
        await updateExpenseConfig(expenseKey, finalConfig);
      }

      // Save apartment participations to Firebase FIRST
      if (saveApartmentParticipations) {
        // Merge cu participările existente pentru alte cheltuieli
        const allParticipations = currentSheet?.configSnapshot?.apartmentParticipations || {};
        const mergedParticipations = { ...allParticipations, ...localParticipations };
        await saveApartmentParticipations(mergedParticipations);
      }

      // Șterge consumurile pentru apartamentele excluse AFTER participations are saved
      if (updateExpenseConsumption || updatePendingConsumption) {
        const apartments = getAssociationApartments();
        const distributedExpenses = currentSheet?.expenses || [];
        const distributedExpense = distributedExpenses.find(exp =>
          exp.name === expenseKey || exp.id === expenseKey
        );

        apartments.forEach(apartment => {
          const participationKey = `${apartment.id}-${expenseKey}`;
          const participation = localParticipations[participationKey] || { type: 'integral', value: null };

          // Dacă apartamentul este exclus, șterge consumul
          if (participation.type === 'excluded') {
            if (distributedExpense && distributedExpense.id && updateExpenseConsumption) {
              // Cheltuială distribuită - șterge consumul
              updateExpenseConsumption(distributedExpense.id, apartment.id, null);
            } else if (updatePendingConsumption) {
              // Cheltuială pending - șterge consumul pending
              updatePendingConsumption(expenseKey, apartment.id, null);
            }
          }
        });
      }

      // Închide modalul DUPĂ ce toate operațiunile sunt complete
      onClose();
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

    // Dacă se alege "separate" și receptionMode este "total", schimbă automat la per_block sau per_stair
    if (mode === 'separate' && localConfig.receptionMode === 'per_association') {
      // Prioritizează per_block dacă există cel puțin 2 blocuri
      if (blocks.length >= 2) {
        newConfig.receptionMode = 'per_block';
        newConfig.appliesTo = {
          blocks: blocks.map(b => b.id),
          stairs: []
        };
      } else if (stairs.length >= 2) {
        // Fallback la per_stair dacă există cel puțin 2 scări
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
    setShowAddIndexForm(false);
  };

  const handleCancelAddIndexType = () => {
    setNewIndexName('');
    setShowAddIndexForm(false);
  };

  const handleDeleteIndexType = (indexId) => {
    setLocalConfig({
      ...localConfig,
      indexConfiguration: {
        ...localConfig.indexConfiguration,
        indexTypes: localConfig.indexConfiguration.indexTypes.filter(idx => idx.id !== indexId)
      }
    });
    setOpenDropdownId(null);
  };

  const handleStartEditIndexType = (indexType) => {
    setEditingIndexId(indexType.id);
    setEditingIndexName(indexType.name);
    setOpenDropdownId(null);
  };

  const handleSaveEditIndexType = () => {
    if (!editingIndexName.trim()) {
      alert('Introduceți numele contorului');
      return;
    }

    setLocalConfig({
      ...localConfig,
      indexConfiguration: {
        ...localConfig.indexConfiguration,
        indexTypes: localConfig.indexConfiguration.indexTypes.map(idx =>
          idx.id === editingIndexId
            ? { ...idx, name: editingIndexName.trim() }
            : idx
        )
      }
    });

    setEditingIndexId(null);
    setEditingIndexName('');
  };

  const handleCancelEditIndexType = () => {
    setEditingIndexId(null);
    setEditingIndexName('');
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

  // 🔧 HANDLERS PENTRU CONFIGURARE CONTOARE PER APARTAMENT
  const handleMeterToggle = (apartmentId, meterId, enabled) => {
    setLocalApartmentMeters(prev => ({
      ...prev,
      [apartmentId]: {
        ...prev[apartmentId],
        [meterId]: {
          enabled: enabled,
          serialNumber: prev[apartmentId]?.[meterId]?.serialNumber || ''
        }
      }
    }));
  };

  const handleSerialChange = (apartmentId, meterId, serialNumber) => {
    setLocalApartmentMeters(prev => ({
      ...prev,
      [apartmentId]: {
        ...prev[apartmentId],
        [meterId]: {
          ...prev[apartmentId]?.[meterId],
          enabled: prev[apartmentId]?.[meterId]?.enabled ?? false,
          serialNumber: serialNumber
        }
      }
    }));
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

  // Obține toate apartamentele - ÎNAINTE de return
  const apartments = useMemo(() => {
    if (!getAssociationApartments) return [];
    return getAssociationApartments();
  }, [getAssociationApartments]);

  // Filtrează apartamentele pe baza tab-ului selectat - ÎNAINTE de return
  const filteredApartments = useMemo(() => {
    if (selectedStairTab === 'all') return apartments;
    return apartments.filter(apt => apt.stairId === selectedStairTab);
  }, [selectedStairTab, apartments]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className={`p-3 sm:p-4 bg-gradient-to-r ${mode === 'add' ? 'from-green-600 to-green-700' : 'from-purple-600 to-purple-700'} text-white rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {mode === 'add' ? 'Adaugă cheltuială nouă' : `⚙️ Configurare: ${expenseName}`}
              </h2>
              <p className={`text-xs sm:text-sm ${mode === 'add' ? 'text-green-100' : 'text-purple-100'} mt-0.5`}>
                Setări de distribuție și furnizor
              </p>
            </div>
            <button
              onClick={onClose}
              className={`text-white ${mode === 'add' ? 'hover:bg-green-800' : 'hover:bg-purple-800'} p-1.5 rounded-lg transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="border-b overflow-x-auto flex-shrink-0">
          <div className="flex min-w-max">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'general'
                  ? `${mode === 'add' ? 'bg-green-50 text-green-700 border-b-2 border-green-700' : 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'}`
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              General
            </button>
            <button
              onClick={() => setActiveTab('participation')}
              className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'participation'
                  ? `${mode === 'add' ? 'bg-green-50 text-green-700 border-b-2 border-green-700' : 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'}`
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Participare
            </button>
            <button
              onClick={() => setActiveTab('supplier')}
              className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'supplier'
                  ? `${mode === 'add' ? 'bg-green-50 text-green-700 border-b-2 border-green-700' : 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'}`
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Furnizor
            </button>
            {/* Tab Consum - vizibil doar pentru distributionType === "consumption" */}
            {localConfig.distributionType === 'consumption' && (
              <button
                onClick={() => setActiveTab('indexes')}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'indexes'
                    ? `${mode === 'add' ? 'bg-green-50 text-green-700 border-b-2 border-green-700' : 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'}`
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Consum
              </button>
            )}
            {/* Tab Contoare - vizibil doar când există contoare configurate */}
            {localConfig.distributionType === 'consumption' &&
             localConfig.indexConfiguration?.indexTypes?.length > 0 && (
              <button
                onClick={() => setActiveTab('meters')}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'meters'
                    ? `${mode === 'add' ? 'bg-green-50 text-green-700 border-b-2 border-green-700' : 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'}`
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Contoare
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Expense Name Field - Only in ADD mode */}
              {mode === 'add' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Numele cheltuielii *
                  </label>
                  <input
                    type="text"
                    value={inputExpenseName}
                    onChange={(e) => setInputExpenseName(e.target.value)}
                    placeholder="ex: Deratizare, Dezinsecție, etc."
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    Introduceți numele cheltuielii personalizate. Acest nume va fi folosit pentru identificare în sistem.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Distribuție
                </label>
                <select
                  value={localConfig.distributionType}
                  onChange={(e) => {
                    const newDistributionType = e.target.value;
                    setLocalConfig({
                      ...localConfig,
                      distributionType: newDistributionType,
                      // Setează fixedAmountMode la "person" când distributionType devine "person"
                      fixedAmountMode: newDistributionType === 'person' ? 'person' : localConfig.fixedAmountMode
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="cotaParte">Pe cotă parte indiviză</option>
                  <option value="consumption">Pe consum</option>
                  <option value="person">Pe persoană</option>
                  <option value="apartment">Pe apartament</option>
                  <option value="individual">Sume individuale pe apartament</option>
                </select>
                <p className="mt-1 text-xs text-gray-600">
                  {localConfig.distributionType === 'apartment' && 'Cheltuiala se împarte egal între toate apartamentele'}
                  {localConfig.distributionType === 'individual' && 'Fiecare apartament are suma proprie'}
                  {localConfig.distributionType === 'person' && 'Cheltuiala se împarte pe numărul de persoane'}
                  {localConfig.distributionType === 'consumption' && 'Cheltuiala se calculează pe baza unităților consumate (mc, kWh, Gcal, etc.)'}
                  {localConfig.distributionType === 'cotaParte' && 'Cheltuiala se distribuie proporțional cu cota parte indiviză (% din suprafața utilă totală)'}
                </p>
                {localConfig.distributionType === 'cotaParte' && apartments.length === 0 && (
                  <p className="mt-1 text-xs text-orange-600 font-medium">
                    ⚠️ Nu ai apartamente introduse. Nu vei putea publica întreținerea până nu adaugi apartamente și completezi suprafețele.
                  </p>
                )}
                {localConfig.distributionType === 'cotaParte' && apartments.length > 0 && apartments.some(apt => !apt.suprafataUtila || apt.suprafataUtila === 0) && (
                  <p className="mt-1 text-xs text-orange-600 font-medium">
                    ⚠️ Unele apartamente nu au suprafața utilă completată. Nu vei putea publica întreținerea până nu completezi toate suprafețele.
                  </p>
                )}
              </div>

              {/* Mod participare sumă fixă - apare doar pentru distribuție pe persoană */}
              {localConfig.distributionType === 'person' && (
                <div className="border-t pt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mod participare sumă fixă
                  </label>
                  <select
                    value={localConfig.fixedAmountMode}
                    onChange={(e) => setLocalConfig({ ...localConfig, fixedAmountMode: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="apartment">Per apartament</option>
                    <option value="person">Per persoană</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-600">
                    {localConfig.fixedAmountMode === 'apartment' && 'Sumă fixă per apartament (indiferent de numărul de persoane)'}
                    {localConfig.fixedAmountMode === 'person' && 'Sumă fixă per persoană înmulțită cu numărul de persoane din apartament'}
                  </p>
                </div>
              )}

              {/* Unitate de măsură - apare doar pentru consumption */}
              {localConfig.distributionType === 'consumption' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="mc">mc (metri cubi) - Apă, Canalizare, Gaz</option>
                    <option value="Gcal">Gcal (gigacalorii) - Căldură</option>
                    <option value="kWh">kWh (kilowați-oră) - Electricitate</option>
                    <option value="MWh">MWh (megawați-oră) - Electricitate</option>
                    <option value="custom">✏️ Altă unitate...</option>
                  </select>

                  {showCustomUnit && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unitatea personalizată *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: litri, m³, kW, etc."
                        value={localConfig.customConsumptionUnit || ''}
                        onChange={(e) => setLocalConfig({ ...localConfig, customConsumptionUnit: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        required
                      />
                    </div>
                  )}

                  <p className="mt-1 text-xs text-gray-600">
                    Unitatea folosită pentru măsurarea consumului
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Factură
                </label>
                <select
                  value={localConfig.invoiceMode}
                  onChange={(e) => handleInvoiceModeChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  disabled={blocks.length < 2 && stairs.length < 2 && localConfig.invoiceMode === 'single'}
                >
                  <option value="single">O singură factură</option>
                  {(blocks.length >= 2 || stairs.length >= 2) && <option value="separate">Facturi separate (per scară/bloc)</option>}
                </select>
                <p className="mt-1 text-xs text-gray-600">
                  {localConfig.invoiceMode === 'single' && localConfig.receptionMode === 'per_association' && 'O factură pe asociație'}
                  {localConfig.invoiceMode === 'single' && localConfig.receptionMode === 'per_block' && 'O factură cu suma totală distribuită pe blocuri'}
                  {localConfig.invoiceMode === 'single' && localConfig.receptionMode === 'per_stair' && 'O factură cu suma totală distribuită pe scări'}
                  {localConfig.invoiceMode === 'separate' && localConfig.receptionMode === 'per_block' && 'Facturi separate pentru fiecare bloc'}
                  {localConfig.invoiceMode === 'separate' && localConfig.receptionMode === 'per_stair' && 'Facturi separate pentru fiecare scară'}
                </p>
                {blocks.length < 2 && stairs.length < 2 && (
                  <p className="mt-1 text-xs text-orange-600 font-medium">
                    ⚠️ Adaugă cel puțin 2 blocuri sau 2 scări pentru a putea folosi "Facturi separate"
                  </p>
                )}
              </div>

              {/* Introducere sume */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Introducere sume
                </label>
                <select
                  value={localConfig.receptionMode}
                  onChange={(e) => handleReceptionModeChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  disabled={blocks.length < 2 && stairs.length < 2 && localConfig.receptionMode === 'per_association'}
                >
                  {localConfig.invoiceMode !== 'separate' && <option value="per_association">Pe asociație</option>}
                  {(blocks.length >= 2 || localConfig.receptionMode === 'per_block') && <option value="per_block">Per bloc</option>}
                  {(stairs.length >= 2 || localConfig.receptionMode === 'per_stair') && <option value="per_stair">Per scară</option>}
                </select>
                <p className="mt-1 text-xs text-gray-600">
                  {localConfig.receptionMode === 'per_association' && 'Suma se introduce o singură dată pentru întreaga asociație'}
                  {localConfig.receptionMode === 'per_block' && 'Sume separate per bloc'}
                  {localConfig.receptionMode === 'per_stair' && 'Sume separate per scară'}
                </p>
                {localConfig.invoiceMode === 'separate' && localConfig.receptionMode === 'per_association' && (
                  <p className="mt-1 text-xs text-orange-600 font-medium">
                    ⚠️ Mod "Facturi separate" necesită "Per bloc" sau "Per scară"
                  </p>
                )}
                {blocks.length < 2 && stairs.length < 2 && localConfig.invoiceMode !== 'separate' && (
                  <p className="mt-1 text-xs text-orange-600 font-medium">
                    ⚠️ Adaugă cel puțin 2 blocuri sau 2 scări pentru a putea folosi "Per bloc" sau "Per scară"
                  </p>
                )}
              </div>

              {/* Se aplică pe (bife) - doar pentru per_block și per_stair */}
              {localConfig.receptionMode !== 'per_association' && (
                <div className="border-t pt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    🏢 Se aplică pe: (bifează)
                  </label>

                  {localConfig.receptionMode === 'per_block' && (
                    <div className="space-y-1.5">
                      {blocks.map(block => (
                        <label key={block.id} className="flex items-center gap-2 p-1.5 border rounded-md cursor-pointer hover:bg-purple-50">
                          <input
                            type="checkbox"
                            checked={localConfig.appliesTo.blocks.includes(block.id)}
                            onChange={() => handleBlockToggle(block.id)}
                            className="w-3.5 h-3.5 text-purple-600 rounded"
                          />
                          <span className="text-xs">{block.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {localConfig.receptionMode === 'per_stair' && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {blocksWithStairs.map(block => (
                        <div key={block.id} className="space-y-1">
                          <div className="text-xs font-medium text-gray-600 px-1.5">{block.name}</div>
                          {block.stairs.map(stair => (
                            <label key={stair.id} className="flex items-center gap-2 p-1.5 ml-3 border rounded-md cursor-pointer hover:bg-purple-50">
                              <input
                                type="checkbox"
                                checked={localConfig.appliesTo.stairs.includes(stair.id)}
                                onChange={() => handleStairToggle(stair.id)}
                                className="w-3.5 h-3.5 text-purple-600 rounded"
                              />
                              <span className="text-xs">{stair.name}</span>
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
            <div className="space-y-3">
              <div className="text-xs text-gray-600 mb-3">
                Configurează participarea fiecărui apartament la această cheltuială
              </div>

              {/* Tab-uri pentru scări */}
              {stairs.length > 0 && (
                <div className="border-b overflow-x-auto">
                  <div className="flex">
                    <button
                      onClick={() => setSelectedStairTab('all')}
                      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                        selectedStairTab === 'all'
                          ? 'bg-purple-50 text-purple-700 border-purple-700'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Toate
                    </button>
                    {stairTabs.map(stair => {
                      // Verifică dacă scara este activă în configurație
                      const isStairActive = localConfig.receptionMode === 'per_association' ||
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
                          className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
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
                    const participationKey = `${apartment.id}-${expenseKey}`;
                    const participation = localParticipations[participationKey] || { type: 'integral', value: null };
                    const isModified = participation.type !== 'integral';

                    // Date pentru tooltip
                    const stair = stairs.find(s => s.id === apartment.stairId);
                    const block = stair ? blocks.find(b => b.id === stair.blockId) : null;

                    // Verifică dacă apartamentul este activ (scara/blocul este selectat)
                    const isApartmentActive = localConfig.receptionMode === 'per_association' ||
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

                            // Când se exclude un apartament, șterge consumul său IMEDIAT
                            if (type === "excluded") {
                              // Determină dacă cheltuiala este salvată sau pending
                              const expenseKeyForConsumption = mode === 'add' ? inputExpenseName : expenseName;

                              console.log('🗑️ Excluding apartment, deleting consumption:', {
                                apartmentId: apartment.id,
                                apartmentNumber: apartment.number,
                                expenseKey: expenseKeyForConsumption,
                                mode
                              });

                              // Găsește cheltuiala pentru a obține ID-ul (pentru cheltuieli distribuite)
                              const distributedExpenses = currentSheet?.expenses || [];
                              const distributedExpense = distributedExpenses.find(exp =>
                                exp.name === expenseKeyForConsumption || exp.id === expenseKeyForConsumption
                              );

                              console.log('🔍 Looking for distributed expense:', {
                                expenseKeyForConsumption,
                                foundExpense: distributedExpense ? { id: distributedExpense.id, name: distributedExpense.name } : null,
                                totalDistributedExpenses: distributedExpenses.length,
                                hasUpdateExpenseConsumption: !!updateExpenseConsumption,
                                hasUpdatePendingConsumption: !!updatePendingConsumption
                              });

                              if (distributedExpense && distributedExpense.id && updateExpenseConsumption) {
                                // Cheltuială distribuită - șterge consumul
                                console.log('✅ Calling updateExpenseConsumption:', distributedExpense.id, apartment.id, null);
                                updateExpenseConsumption(distributedExpense.id, apartment.id, null);
                              } else if (updatePendingConsumption) {
                                // Cheltuială pending - șterge consumul pending
                                console.log('✅ Calling updatePendingConsumption:', expenseKeyForConsumption, apartment.id, null);
                                updatePendingConsumption(expenseKeyForConsumption, apartment.id, null);
                              }
                            }
                          }}
                          disabled={!isApartmentActive}
                          className={`p-2 border rounded-lg text-sm ${
                            !isApartmentActive ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
                          }`}
                        >
                          <option value="integral">Integral</option>
                          {/* Pentru "individual", afișăm doar Integral și Exclus */}
                          {localConfig.distributionType !== 'individual' && (
                            <>
                              <option value="percentage">Procent</option>
                              <option value="fixed">Sumă fixă</option>
                            </>
                          )}
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
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Selectează furnizor
                </label>
                <div className="flex gap-2">
                  <select
                    value={localConfig.supplierId || ''}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                    className="px-3 py-1.5 text-xs sm:text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors whitespace-nowrap"
                  >
                    + Adaugă furnizor
                  </button>
                </div>
              </div>

              {localConfig.supplierId && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Număr contract
                    </label>
                    <input
                      type="text"
                      value={localConfig.contractNumber}
                      onChange={(e) => setLocalConfig({ ...localConfig, contractNumber: e.target.value })}
                      placeholder="ex: 12345/2024"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Persoană de contact
                    </label>
                    <input
                      type="text"
                      value={localConfig.contactPerson}
                      onChange={(e) => setLocalConfig({ ...localConfig, contactPerson: e.target.value })}
                      placeholder="ex: Ion Popescu"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab Consum */}
          {activeTab === 'indexes' && localConfig.distributionType === 'consumption' && (
            <div className="space-y-3 sm:space-y-4">
              {/* 1️⃣ Mod introducere date */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="text-xs sm:text-sm font-semibold text-blue-900 mb-2">
                  1️⃣ Mod introducere date
                </h3>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2 bg-white border-2 rounded-md cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="radio"
                      name="inputMode"
                      value="indexes"
                      checked={localConfig.indexConfiguration.inputMode === 'indexes'}
                      onChange={(e) => handleInputModeChange(e.target.value)}
                      className="w-3.5 h-3.5 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Indecși</div>
                      <div className="text-xs text-gray-600">Index vechi → Index nou (calcul automat consum)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white border-2 rounded-md cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="radio"
                      name="inputMode"
                      value="manual"
                      checked={localConfig.indexConfiguration.inputMode === 'manual'}
                      onChange={(e) => handleInputModeChange(e.target.value)}
                      className="w-3.5 h-3.5 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Introducere consumuri</div>
                      <div className="text-xs text-gray-600">Introduci direct consumul (ex: 8.5 mc)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white border-2 rounded-md cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="radio"
                      name="inputMode"
                      value="mixed"
                      checked={localConfig.indexConfiguration.inputMode === 'mixed'}
                      onChange={(e) => handleInputModeChange(e.target.value)}
                      className="w-3.5 h-3.5 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Mixt</div>
                      <div className="text-xs text-gray-600">Indecși pentru unele apartamente, consumuri pentru altele</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2️⃣ Configurare Contoare - apare pentru indexes și mixed */}
              {(localConfig.indexConfiguration.inputMode === 'indexes' || localConfig.indexConfiguration.inputMode === 'mixed') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h3 className="text-xs sm:text-sm font-semibold text-green-900 mb-2">
                    2️⃣ Configurare Contoare
                  </h3>

                  {/* Listă contoare configurate + buton adăugare */}
                  <div className="space-y-1.5 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-gray-600">
                        {localConfig.indexConfiguration.indexTypes.length > 0
                          ? 'Contoare configurate:'
                          : 'Niciun contor configurat'}
                      </div>
                      {!showAddIndexForm && (
                        <button
                          onClick={() => setShowAddIndexForm(true)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors"
                          title="Adaugă contor nou"
                        >
                          <Plus className="w-3 h-3" />
                          Adaugă contor
                        </button>
                      )}
                    </div>

                    {/* Listă contoare */}
                    {localConfig.indexConfiguration.indexTypes.length > 0 && (
                      <div className="space-y-1.5">
                        {localConfig.indexConfiguration.indexTypes.map(indexType => (
                        <div key={indexType.id} className="flex items-center justify-between p-2 bg-white border rounded-md">
                          {editingIndexId === indexType.id ? (
                            // Mod editare
                            <div className="flex items-center gap-2 flex-1">
                              <Activity className="w-3.5 h-3.5 text-green-600" />
                              <input
                                type="text"
                                value={editingIndexName}
                                onChange={(e) => setEditingIndexName(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') handleSaveEditIndexType();
                                  if (e.key === 'Escape') handleCancelEditIndexType();
                                }}
                                className="flex-1 px-2 py-1 text-sm border border-green-500 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                autoFocus
                              />
                              <span className="text-xs text-gray-500">({indexType.unit})</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={handleSaveEditIndexType}
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                                >
                                  Salvează
                                </button>
                                <button
                                  onClick={handleCancelEditIndexType}
                                  className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400 transition-colors"
                                >
                                  Anulează
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Mod vizualizare
                            <>
                              <div className="flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-sm font-medium">{indexType.name}</span>
                                <span className="text-xs text-gray-500">({indexType.unit})</span>
                              </div>
                              <div className="relative">
                                <button
                                  onClick={() => setOpenDropdownId(openDropdownId === indexType.id ? null : indexType.id)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Opțiuni"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                {openDropdownId === indexType.id && (
                                  <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                    <button
                                      onClick={() => handleStartEditIndexType(indexType)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                      Editează
                                    </button>
                                    <button
                                      onClick={() => handleDeleteIndexType(indexType.id)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors rounded-b-md"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Șterge
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        ))}
                      </div>
                    )}

                    {/* Formular adăugare contor nou - apare doar când dai click pe buton */}
                    {showAddIndexForm && (
                      <div className="bg-white border-2 border-green-300 rounded-md p-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nume contor (ex: Contor baie, Contor bucătărie)"
                            value={newIndexName}
                            onChange={(e) => setNewIndexName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleAddIndexType();
                              if (e.key === 'Escape') handleCancelAddIndexType();
                            }}
                            className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            autoFocus
                          />
                          <button
                            onClick={handleAddIndexType}
                            className="px-2 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                          >
                            Adaugă
                          </button>
                          <button
                            onClick={handleCancelAddIndexType}
                            className="px-2 py-1.5 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400 transition-colors"
                          >
                            Anulează
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3️⃣ Distribuție Diferență */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h3 className="text-xs sm:text-sm font-semibold text-orange-900 mb-2">
                  3️⃣ Distribuție Diferență (Pierderi/Scurgeri)
                </h3>

                <div className="space-y-3">
                  {/* Explicație */}
                  <p className="text-xs text-gray-600">
                    Cum se distribuie diferența dintre totalul facturii și suma consumurilor declarate?
                  </p>

                  {/* Metoda de distribuție */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Metoda de distribuție:
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 p-1.5 bg-white border rounded-md cursor-pointer hover:border-orange-300">
                        <input
                          type="radio"
                          name="differenceMethod"
                          value="apartment"
                          checked={localConfig.differenceDistribution.method === 'apartment'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, method: e.target.value }
                          })}
                          className="w-3.5 h-3.5 text-orange-600"
                        />
                        <span className="text-xs sm:text-sm">Egal pe apartament</span>
                      </label>

                      <label className="flex items-center gap-2 p-1.5 bg-white border rounded-md cursor-pointer hover:border-orange-300">
                        <input
                          type="radio"
                          name="differenceMethod"
                          value="consumption"
                          checked={localConfig.differenceDistribution.method === 'consumption'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, method: e.target.value }
                          })}
                          className="w-3.5 h-3.5 text-orange-600"
                        />
                        <span className="text-xs sm:text-sm">Proporțional cu consumul</span>
                      </label>

                      <label className="flex items-center gap-2 p-1.5 bg-white border rounded-md cursor-pointer hover:border-orange-300">
                        <input
                          type="radio"
                          name="differenceMethod"
                          value="person"
                          checked={localConfig.differenceDistribution.method === 'person'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, method: e.target.value }
                          })}
                          className="w-3.5 h-3.5 text-orange-600"
                        />
                        <span className="text-xs sm:text-sm">Proporțional cu numărul de persoane</span>
                      </label>

                    </div>
                  </div>

                  {/* AJUSTĂRI DIFERENȚĂ */}
                  <div className="border-2 border-orange-200 rounded-md p-3 bg-orange-50/30">
                    <label className="block text-xs sm:text-sm font-medium text-orange-900 mb-2">
                      ⚙️ Mod de ajustare a diferenței
                    </label>
                    <div className="space-y-1.5">

                      {/* Opțiune 1: Fără ajustări */}
                      <label className="flex items-start gap-2 p-2 bg-white border-2 border-gray-300 rounded-md cursor-pointer hover:border-gray-400">
                        <input
                          type="radio"
                          name="adjustmentMode"
                          value="none"
                          checked={localConfig.differenceDistribution.adjustmentMode === 'none'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, adjustmentMode: e.target.value }
                          })}
                          className="w-3.5 h-3.5 text-gray-600 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">Fără ajustări suplimentare</div>
                          <div className="text-xs text-gray-600">Diferența se distribuie doar conform metodei alese mai sus</div>
                        </div>
                      </label>

                      {/* Opțiune 2: Respectă configurările de participare */}
                      <label className="flex items-start gap-2 p-2 bg-white border-2 border-green-300 rounded-md cursor-pointer hover:border-green-400">
                        <input
                          type="radio"
                          name="adjustmentMode"
                          value="participation"
                          checked={localConfig.differenceDistribution.adjustmentMode === 'participation'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, adjustmentMode: e.target.value }
                          })}
                          className="w-3.5 h-3.5 text-green-600 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-xs sm:text-sm font-medium text-green-900">Respectă configurările de participare</div>
                          <div className="text-xs text-green-700">Aplică procentele individuale configurate (ex: Apt cu 50% → primește 50% din diferență)</div>
                        </div>
                      </label>

                      {/* Opțiune 3: Ajustare pe tip apartament */}
                      <label className="flex items-start gap-2 p-2 bg-white border-2 border-purple-300 rounded-md cursor-pointer hover:border-purple-400">
                        <input
                          type="radio"
                          name="adjustmentMode"
                          value="apartmentType"
                          checked={localConfig.differenceDistribution.adjustmentMode === 'apartmentType'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            differenceDistribution: { ...localConfig.differenceDistribution, adjustmentMode: e.target.value }
                          })}
                          className="w-3.5 h-3.5 text-purple-600 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-xs sm:text-sm font-medium text-purple-900">Ajustare pe tip apartament</div>
                          <div className="text-xs text-purple-700">Configurează procente diferite pentru fiecare tip (Garsonieră, 2 camere, etc.)</div>
                        </div>
                      </label>

                      {/* Panel configurare procente pe tip apartament */}
                      {localConfig.differenceDistribution.adjustmentMode === 'apartmentType' && (
                        <div className="ml-5 p-2.5 bg-white border border-purple-300 rounded-md">
                          <label className="block text-xs font-medium text-purple-900 mb-2">
                            Procent din diferența calculată pentru fiecare tip:
                          </label>
                          <div className="space-y-1.5">
                            {['Garsonieră', '2 camere', '3 camere', '4 camere', 'Penthouse'].map(type => (
                              <div key={type} className="flex items-center gap-2 bg-purple-50 p-1.5 rounded border border-purple-200">
                                <label className="flex-1 text-xs font-medium text-gray-700">{type}</label>
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
                                  className="w-16 px-2 py-1 text-xs border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-xs text-gray-600">%</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-purple-700 mt-2">
                            💡 Lasă gol pentru 100% (implicit). Cu reponderare - suma totală se păstrează.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Opțiuni suplimentare care se aplică la orice mod */}
                    <div className="mt-3 pt-3 border-t border-orange-300">
                      <label className="block text-xs font-medium text-orange-900 mb-1.5">Opțiuni suplimentare:</label>
                      <div className="space-y-1.5">
                        {/* Include apartamente cu sumă fixă */}
                        <label className="flex items-center gap-2 p-1.5 bg-white border rounded-md cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={localConfig.differenceDistribution.includeFixedAmountInDifference}
                            onChange={(e) => setLocalConfig({
                              ...localConfig,
                              differenceDistribution: { ...localConfig.differenceDistribution, includeFixedAmountInDifference: e.target.checked }
                            })}
                            className="w-3.5 h-3.5 text-orange-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">Include apartamente cu sumă fixă</div>
                            <div className="text-xs text-gray-600">Apartamentele cu sumă fixă participă și la diferență</div>
                          </div>
                        </label>

                        {/* Include apartamente excluse */}
                        <label className="flex items-center gap-2 p-1.5 bg-white border rounded-md cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={localConfig.differenceDistribution.includeExcludedInDifference}
                            onChange={(e) => setLocalConfig({
                              ...localConfig,
                              differenceDistribution: { ...localConfig.differenceDistribution, includeExcludedInDifference: e.target.checked }
                            })}
                            className="w-3.5 h-3.5 text-orange-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">Include apartamente excluse</div>
                            <div className="text-xs text-gray-600">Apartamentele excluse (debranșate) participă și la diferență</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Exemplu explicativ dinamic */}
                  <div className="bg-gradient-to-br from-orange-50 to-purple-50 border-2 border-orange-200 rounded-md p-2.5">
                    <div className="text-xs font-bold text-orange-900 mb-2">💡 Exemplu detaliat - cum se aplică configurările:</div>
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

          {/* 🔧 TAB CONTOARE - Configurare contoare per apartament */}
          {activeTab === 'meters' && localConfig.indexConfiguration?.indexTypes?.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs text-gray-600 mb-2">
                Configurează contoarele instalate pentru fiecare apartament
              </div>

              {/* Tab-uri pentru scări */}
              {stairs.length > 0 && (
                <div className="border-b overflow-x-auto">
                  <div className="flex">
                    <button
                      onClick={() => setSelectedStairTab('all')}
                      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                        selectedStairTab === 'all'
                          ? 'bg-purple-50 text-purple-700 border-purple-700'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Toate
                    </button>
                    {stairTabs.map(stair => (
                      <button
                        key={stair.id}
                        onClick={() => setSelectedStairTab(stair.id)}
                        className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                          selectedStairTab === stair.id
                            ? 'bg-purple-50 text-purple-700 border-purple-700'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {stair.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabelul cu contoare per apartament */}
              {filteredApartments.length > 0 ? (
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-purple-50">
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-200 sticky left-0 bg-purple-50 z-10">
                          Apartament
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-200">
                          Proprietar
                        </th>
                        {localConfig.indexConfiguration.indexTypes.map(meter => (
                          <th key={meter.id} className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[140px]">
                            <div>{meter.name}</div>
                            <div className="text-xs font-normal text-gray-500">({meter.unit})</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApartments.map((apartment, index) => (
                        <tr key={apartment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {/* Coloana Apartament */}
                          <td className="px-2 py-1.5 border-b border-r border-gray-200 sticky left-0 bg-inherit z-10">
                            <div className="text-sm font-medium text-gray-900">Apt {apartment.number}</div>
                          </td>

                          {/* Coloana Proprietar */}
                          <td className="px-2 py-1.5 border-b border-r border-gray-200">
                            <div className="text-xs text-gray-600">{apartment.owner || '-'}</div>
                          </td>

                          {/* Coloane pentru fiecare contor */}
                          {localConfig.indexConfiguration.indexTypes.map(meter => {
                            const meterConfig = localApartmentMeters[apartment.id]?.[meter.id] || {
                              enabled: false,
                              serialNumber: ''
                            };

                            return (
                              <td key={meter.id} className="px-2 py-1.5 border-b border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  {/* Checkbox activare */}
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={meterConfig.enabled}
                                      onChange={(e) => handleMeterToggle(apartment.id, meter.id, e.target.checked)}
                                      className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <span className={`text-xs ${meterConfig.enabled ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                      {meterConfig.enabled ? '✓' : ''}
                                    </span>
                                  </label>

                                  {/* Input serie contor */}
                                  <input
                                    type="text"
                                    placeholder="Serie contor"
                                    value={meterConfig.serialNumber}
                                    disabled={!meterConfig.enabled}
                                    onChange={(e) => handleSerialChange(apartment.id, meter.id, e.target.value)}
                                    className={`flex-1 text-sm border rounded px-2 py-1 min-w-[100px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                                      !meterConfig.enabled
                                        ? 'bg-gray-100 cursor-not-allowed text-gray-400 border-gray-200'
                                        : 'bg-white border-gray-300'
                                    }`}
                                    maxLength={20}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nu există apartamente configurate în asociație
                </p>
              )}

              {/* Info text */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5">
                <p className="text-xs text-blue-800">
                  <strong>💡 Sfat:</strong> Bifează contoarele instalate pentru fiecare apartament și introdu seria contorului.
                  Doar apartamentele cu contoare bifate vor avea coloane pentru introducerea indexurilor în tabelul de consumuri.
                </p>
              </div>

              {/* 📱 Transmitere din Portal Locatari */}
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-md p-3">
                <h4 className="text-xs sm:text-sm font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                  📱 Transmitere din Portal Locatari
                </h4>

                {/* Toggle principal */}
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.indexConfiguration?.portalSubmission?.enabled ?? true}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      indexConfiguration: {
                        ...localConfig.indexConfiguration,
                        portalSubmission: {
                          ...localConfig.indexConfiguration.portalSubmission,
                          enabled: e.target.checked
                        }
                      }
                    })}
                    className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">
                    Permite proprietarilor să transmită indexuri online
                  </span>
                </label>

                {/* Opțiuni perioadă - afișate doar când e enabled */}
                {localConfig.indexConfiguration?.portalSubmission?.enabled && (
                  <div className="ml-5 space-y-2">
                    <p className="text-xs font-medium text-gray-600 mb-1.5">Perioadă de transmitere:</p>

                    {/* Auto (1-25) */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="portalPeriodType"
                        value="auto"
                        checked={localConfig.indexConfiguration?.portalSubmission?.periodType === 'auto'}
                        onChange={() => setLocalConfig({
                          ...localConfig,
                          indexConfiguration: {
                            ...localConfig.indexConfiguration,
                            portalSubmission: {
                              ...localConfig.indexConfiguration.portalSubmission,
                              periodType: 'auto'
                            }
                          }
                        })}
                        className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-xs sm:text-sm text-gray-700">Automată</span>
                        <span className="text-xs text-gray-500 ml-1">(1-25 ale lunii)</span>
                      </div>
                    </label>

                    {/* Manual */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="portalPeriodType"
                        value="manual"
                        checked={localConfig.indexConfiguration?.portalSubmission?.periodType === 'manual'}
                        onChange={() => setLocalConfig({
                          ...localConfig,
                          indexConfiguration: {
                            ...localConfig.indexConfiguration,
                            portalSubmission: {
                              ...localConfig.indexConfiguration.portalSubmission,
                              periodType: 'manual'
                            }
                          }
                        })}
                        className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-xs sm:text-sm text-gray-700">Manuală</span>
                        <span className="text-xs text-gray-500 ml-1">(deschid/închid când vreau)</span>
                      </div>
                    </label>

                    {/* Toggle Deschis/Închis - pentru manual */}
                    {localConfig.indexConfiguration?.portalSubmission?.periodType === 'manual' && (
                      <div className="ml-5 mt-1.5">
                        <select
                          value={localConfig.indexConfiguration?.portalSubmission?.isOpen ? 'open' : 'closed'}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            indexConfiguration: {
                              ...localConfig.indexConfiguration,
                              portalSubmission: {
                                ...localConfig.indexConfiguration.portalSubmission,
                                isOpen: e.target.value === 'open'
                              }
                            }
                          })}
                          className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="open">🟢 Deschisă</option>
                          <option value="closed">🔴 Închisă</option>
                        </select>
                      </div>
                    )}

                    {/* Custom */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="portalPeriodType"
                        value="custom"
                        checked={localConfig.indexConfiguration?.portalSubmission?.periodType === 'custom'}
                        onChange={() => setLocalConfig({
                          ...localConfig,
                          indexConfiguration: {
                            ...localConfig.indexConfiguration,
                            portalSubmission: {
                              ...localConfig.indexConfiguration.portalSubmission,
                              periodType: 'custom'
                            }
                          }
                        })}
                        className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs sm:text-sm text-gray-700">Personalizată</span>
                    </label>

                    {/* Inputs pentru custom period */}
                    {localConfig.indexConfiguration?.portalSubmission?.periodType === 'custom' && (
                      <div className="ml-5 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-600">De la ziua</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={localConfig.indexConfiguration?.portalSubmission?.startDay || 1}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            indexConfiguration: {
                              ...localConfig.indexConfiguration,
                              portalSubmission: {
                                ...localConfig.indexConfiguration.portalSubmission,
                                startDay: parseInt(e.target.value) || 1
                              }
                            }
                          })}
                          className="w-14 text-xs text-center border border-gray-300 rounded-md px-1.5 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <span className="text-xs text-gray-600">până la ziua</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={localConfig.indexConfiguration?.portalSubmission?.endDay || 25}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            indexConfiguration: {
                              ...localConfig.indexConfiguration,
                              portalSubmission: {
                                ...localConfig.indexConfiguration.portalSubmission,
                                endDay: parseInt(e.target.value) || 25
                              }
                            }
                          })}
                          className="w-14 text-xs text-center border border-gray-300 rounded-md px-1.5 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 bg-gray-50 border-t flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-white rounded-md transition-colors ${
              mode === 'add'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {mode === 'add' ? 'Adaugă cheltuială' : 'Salvează configurație'}
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