/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, Building, Building2, Package, MoreVertical, Home, Users, User, BarChart3, ChevronDown, ChevronUp, FileText, Search, Tag } from 'lucide-react';
import StatsCard from '../common/StatsCard';
import { defaultExpenseTypes } from '../../data/expenseTypes';
import ExpenseConfigModal from '../modals/ExpenseConfigModal';
import SupplierModal from '../modals/SupplierModal';
import useSuppliers from '../../hooks/useSuppliers';

const ExpensesViewNew = ({
  association,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses,
  isMonthReadOnly,
  isReadOnlyRole,
  getAssociationApartments,
  handleNavigation,
  newCustomExpense,
  setNewCustomExpense,
  handleAddCustomExpense,
  addCustomExpense,
  selectedExpenseForConfig,
  setSelectedExpenseForConfig,
  getAssociationExpenseTypes,
  getExpenseConfig,
  updateExpenseConfig,
  saveApartmentParticipations,
  getApartmentParticipation,
  setApartmentParticipation,
  getDisabledExpenseTypes,
  toggleExpenseStatus,
  deleteCustomExpense,
  getMonthType,
  currentSheet,
  publishedSheet,
  sheets,
  blocks,
  stairs,
  togglePortalSubmission,
  invoices = []
}) => {
  const cantEdit = isMonthReadOnly || isReadOnlyRole;

  const [activeTab, setActiveTab] = useState('expenses');
  const [expandedExpenseCards, setExpandedExpenseCards] = useState({});

  const toggleExpenseCard = (id) => {
    setExpandedExpenseCards(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Determină sheet-ul corect pentru luna selectată
  // 1. Dacă suntem pe luna publicată, folosește publishedSheet
  // 2. Dacă suntem pe luna în lucru, folosește currentSheet
  // 3. Dacă suntem pe o lună arhivată, caută în sheets array
  const activeSheet = React.useMemo(() => {
    if (publishedSheet?.monthYear === currentMonth) {
      return publishedSheet;
    }
    if (currentSheet?.monthYear === currentMonth) {
      return currentSheet;
    }
    // Caută în sheets array pentru luni arhivate
    const archivedSheet = sheets?.find(sheet => sheet.monthYear === currentMonth);
    return archivedSheet || currentSheet;
  }, [publishedSheet, currentSheet, currentMonth, sheets]);

  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier, updateSupplierServiceTypes } = useSuppliers(activeSheet);

  // Închide dropdown-ul când se dă click în afara lui
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown-container]')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);


  const handleConfigureExpense = (expenseIdOrName) => {
    setSelectedExpense(expenseIdOrName);
    setConfigModalOpen(true);
  };

  // Sincronizare bidirecțională: când salvez cheltuiala cu furnizori,
  // actualizez serviceTypes pe furnizorii asociați
  const handleSyncSupplierServiceTypes = async (expenseId, supplierIds) => {
    if (!expenseId || !supplierIds) return;
    for (const supplier of suppliers) {
      const currentServiceTypes = supplier.serviceTypes || [];
      const isLinked = supplierIds.includes(supplier.id);
      const hasExpense = currentServiceTypes.includes(expenseId);

      if (isLinked && !hasExpense) {
        // Adaugă cheltuiala la furnizor (fără a atinge expenseConfigurations)
        await updateSupplierServiceTypes(supplier.id, [...currentServiceTypes, expenseId]);
      } else if (!isLinked && hasExpense) {
        // Scoate cheltuiala de la furnizor
        await updateSupplierServiceTypes(supplier.id, currentServiceTypes.filter(id => id !== expenseId));
      }
    }
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierModalOpen(true);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierModalOpen(true);
  };

  const handleSupplierSave = async (formData) => {
    if (editingSupplier) {
      // Editare furnizor existent
      await updateSupplier(editingSupplier.id, formData);
    } else {
      // Adăugare furnizor nou
      const newSupplier = await addSupplier(formData);
      // Selectează furnizorul nou adăugat
      if (newSupplier?.id) {
        setSelectedSupplierId(newSupplier.id);
      }
    }
  };

  const handleAddExpenseFromModal = async (expenseData, configData) => {
    try {
      // Verifică dacă numele cheltuielii există deja
      const existingExpenseTypes = getAssociationExpenseTypes();
      const nameExists = existingExpenseTypes.some(expense =>
        expense.name.toLowerCase().trim() === expenseData.name.toLowerCase().trim()
      );

      if (nameExists) {
        alert(`Cheltuiala cu numele "${expenseData.name}" există deja. Vă rugăm să alegeți un alt nume.`);
        return;
      }

      // Generează un ID unic pentru noua cheltuială custom
      const newExpenseId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Creează configurația completă pentru noua cheltuială
      // Merge expenseData și configData pentru configurație completă
      await updateExpenseConfig(newExpenseId, {
        // Include toate câmpurile din configData (localConfig din modal)
        ...configData,
        // Suprascrie/adaugă câmpuri esențiale
        id: newExpenseId,
        name: expenseData.name,
        isCustom: true,
        isEnabled: true,
        // Asigură-te că distributionType vine din configData, nu defaultDistribution
        distributionType: configData.distributionType || expenseData.defaultDistribution || 'apartment',
        receptionMode: configData.receptionMode || expenseData.receptionMode || 'total',
        appliesTo: configData.appliesTo || expenseData.appliesTo || { blocks: [], stairs: [] }
      });

      // Sincronizare furnizori: actualizează serviceTypes pe furnizorii asociați
      const supplierIds = (configData.suppliers || []).map(s => s.supplierId);
      if (supplierIds.length > 0) {
        await handleSyncSupplierServiceTypes(newExpenseId, supplierIds);
      }

      return true;
    } catch (error) {
      console.error('❌ Eroare la adăugarea cheltuielii din modal:', error);
      throw error;
    }
  };



  const handleDeleteSupplier = async (supplierId) => {
    try {
      await deleteSupplier(supplierId);
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  // Funcție pentru a obține cheltuielile active pentru un furnizor
  const getSupplierExpenseTypes = (supplierId) => {
    if (!getAssociationExpenseTypes) return [];

    // Caută furnizorul pentru serviceTypes (sursa principală)
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier?.serviceTypes?.length > 0) {
      // Mapează serviceTypes la numele cheltuielilor
      return getAssociationExpenseTypes()
        .filter(et => supplier.serviceTypes.includes(et.id || et.name))
        .map(et => et.name);
    }

    // Fallback: verifică expenseConfigurations (backward compat)
    return getAssociationExpenseTypes()
      .map(expenseType => {
        const config = getExpenseConfig(expenseType.name);
        if (config.supplierId === supplierId) return expenseType.name;
        if (config.suppliers?.some(s => s.supplierId === supplierId)) return expenseType.name;
        return null;
      })
      .filter(Boolean);
  };

  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-600" />
            Cheltuieli
          </h1>
        </div>

        {/* Statistici cheltuieli */}
        {(() => {
          const totalExpenseTypes = getAssociationExpenseTypes().length;
          const distributedExpenses = currentSheet?.expenses?.length || 0;
          const undistributed = totalExpenseTypes - distributedExpenses;
          const totalDistributed = (currentSheet?.expenses || []).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatsCard label="Total cheltuieli" value={totalExpenseTypes} borderColor="border-blue-500" />
              <StatsCard label="Distribuite" value={`${distributedExpenses} / ${totalExpenseTypes}`} borderColor="border-green-500" />
              <StatsCard label="Nedistribuite" value={undistributed} borderColor="border-orange-500" />
              <StatsCard label="Total distribuit" value={`${totalDistributed.toFixed(2)} lei`} borderColor="border-teal-500" />
            </div>
          );
        })()}

        {/* Guard: nu există apartamente configurate */}
        {getAssociationApartments && getAssociationApartments().length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 text-center mb-6">
            <Building className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-2">
              Configurează mai întâi structura asociației
            </h3>
            <p className="text-sm text-blue-600 mb-4">
              Pentru a configura cheltuielile și a seta furnizorii, trebuie să adaugi blocurile, scările și apartamentele.
            </p>
            <button
              onClick={() => handleNavigation('setup')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Configurează Apartamentele
            </button>
          </div>
        ) : (

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div>
                {/* Bara de căutare, filtru și buton acțiune */}
                <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Caută după nume cheltuială..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">Toate cheltuielile</option>
                    <option value="distributed">Distribuite</option>
                    <option value="undistributed">Nedistribuite</option>
                  </select>
                  <button
                    onClick={() => {
                      if (cantEdit) {
                        alert('Nu poți adăuga cheltuieli într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                        return;
                      }
                      setAddModalOpen(true);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                      cantEdit
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={cantEdit}
                    title={cantEdit ? 'Adăugare blocată - lună publicată' : 'Adaugă cheltuială nouă'}
                  >
                    <Plus className="w-4 h-4" />
                    Adaugă cheltuială
                  </button>
                </div>

                <div>
                  {(() => {
                    const allExpenseTypes = getAssociationExpenseTypes();
                    const filteredExpenseTypes = allExpenseTypes.filter(expenseType => {
                      const matchesSearch = !searchTerm || expenseType.name?.toLowerCase().includes(searchTerm.toLowerCase());
                      if (!matchesSearch) return false;
                      if (filterStatus === 'all') return true;
                      const isDistributed = currentSheet?.expenses?.some(exp =>
                        (exp.expenseTypeId === expenseType.id || exp.expenseType === expenseType.name) &&
                        // Cheltuielile pe consum au amount=0 și sumele în billAmount / invoicesData
                        (exp.amount > 0 || exp.billAmount > 0 || (exp.invoicesData && exp.invoicesData.length > 0))
                      );
                      if (filterStatus === 'distributed') return isDistributed;
                      if (filterStatus === 'undistributed') return !isDistributed;
                      return true;
                    });
                    if (filteredExpenseTypes.length === 0) {
                      return <p className="text-gray-500 text-center py-8">Nicio cheltuială nu corespunde filtrelor</p>;
                    }
                    return (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredExpenseTypes.map((expenseType, index, array) => {
                      const config = getExpenseConfig(expenseType.id || expenseType.name);
                      const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                      const allSuppliers = config.suppliers?.length > 0
                        ? config.suppliers.map(s => s.supplierName).filter(Boolean)
                        : (config.supplierName ? [config.supplierName] : []);
                      const hasSupplier = allSuppliers.length > 0;
                      const isLastItem = index >= array.length - 2; // ultimele 2 iteme

                      // Verifică dacă cheltuiala a fost distribuită în calcul întreținere
                      const isDistributed = currentSheet?.expenses?.some(exp =>
                        (exp.expenseTypeId === expenseType.id || exp.expenseType === expenseType.name) &&
                        // Cheltuielile pe consum au amount=0 și sumele în billAmount / invoicesData
                        (exp.amount > 0 || exp.billAmount > 0 || (exp.invoicesData && exp.invoicesData.length > 0))
                      );

                      // Determină textul și culoarea pentru tipul de distribuție
                      let distributionText, distributionBadgeClass;
                      if (config.distributionType === "apartment") {
                        distributionText = "Pe apartament";
                        distributionBadgeClass = "bg-blue-100 text-blue-700";
                      } else if (config.distributionType === "individual") {
                        distributionText = "Sume individuale";
                        distributionBadgeClass = "bg-purple-100 text-purple-700";
                      } else if (config.distributionType === "person") {
                        distributionText = "Pe persoană";
                        distributionBadgeClass = "bg-amber-100 text-amber-700";
                      } else if (config.distributionType === "cotaParte") {
                        distributionText = "Pe cotă parte";
                        distributionBadgeClass = "bg-indigo-100 text-indigo-700";
                      } else {
                        distributionText = "Pe consum";
                        distributionBadgeClass = "bg-teal-100 text-teal-700";
                      }

                      const expCardId = expenseType.id || expenseType.name;
                      const isExpCardExpanded = expandedExpenseCards[expCardId];
                      // Facturi asociate cheltuielii — fie prin link direct (expenseTypeId / distributionHistory),
                      // fie prin furnizor: factura e de la un furnizor care are această cheltuială în serviceTypes
                      const linkedSupplierIds = new Set([
                        ...(config.suppliers || []).map(s => s.supplierId).filter(Boolean),
                        ...(config.supplierId ? [config.supplierId] : [])
                      ]);
                      const expenseInvoices = invoices.filter(inv =>
                        inv.expenseTypeId === expenseType.id ||
                        inv.distributionHistory?.some(d => d.expenseName === expenseType.name) ||
                        (inv.supplierId && linkedSupplierIds.has(inv.supplierId))
                      );

                      return (
                        <div key={expenseType.name} className="p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div
                            className="flex items-start justify-between cursor-pointer"
                            onClick={() => toggleExpenseCard(expCardId)}
                          >
                            <div className="flex-1 min-w-0">
                              {/* Rând 1: Nume cheltuială */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm sm:text-base text-gray-900">{expenseType.name}</span>
                                {isCustom && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Custom</span>
                                )}
                                {/* Buton toggle Portal pentru cheltuieli cu perioadă manuală */}
                                {config.distributionType === 'consumption' &&
                                 config.indexConfiguration?.portalSubmission?.periodType === 'manual' &&
                                 togglePortalSubmission && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (cantEdit) {
                                        alert('Nu poți modifica setările într-o lună publicată.');
                                        return;
                                      }
                                      togglePortalSubmission(expenseType.id || expenseType.name);
                                    }}
                                    className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                                      config.indexConfiguration?.portalSubmission?.isOpen
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    } ${cantEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={config.indexConfiguration?.portalSubmission?.isOpen
                                      ? 'Portal deschis - Click pentru a închide'
                                      : 'Portal închis - Click pentru a deschide'}
                                  >
                                    {config.indexConfiguration?.portalSubmission?.isOpen
                                      ? '🟢 Portal'
                                      : '⚪ Portal'}
                                  </button>
                                )}
                              </div>
                              {/* Rând 2: Distribuție */}
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-xs text-gray-500">Distribuție:</span>
                                <span className={`px-1.5 py-0.5 text-xs rounded ${distributionBadgeClass}`}>
                                  {distributionText}
                                </span>
                              </div>
                              {/* Rând 3: Furnizor(i) - doar dacă există */}
                              {hasSupplier && (
                                <div className="mt-0.5">
                                  <span className="text-xs text-gray-500">{allSuppliers.length > 1 ? 'Furnizori: ' : 'Furnizor: '}</span>
                                  <span className="text-xs text-gray-900 font-medium">{allSuppliers.join(', ')}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!hasSupplier ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded whitespace-nowrap">
                                  Adaugă furnizor
                                </span>
                              ) : isDistributed ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded whitespace-nowrap">Distribuită</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded whitespace-nowrap">Nedistribuită</span>
                              )}
                              {isExpCardExpanded
                                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                : <ChevronDown className="w-4 h-4 text-gray-400" />
                              }
                            <div className="relative" data-dropdown-container>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === expenseType.name ? null : expenseType.name);
                                }}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                title="Opțiuni"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>

                              {openDropdown === expenseType.name && (
                                <div
                                  className={`absolute right-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 ${
                                    isLastItem ? 'bottom-full mb-2' : 'top-full mt-2'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (cantEdit) {
                                          alert('Nu poți configura cheltuieli într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                          setOpenDropdown(null);
                                          return;
                                        }
                                        handleConfigureExpense(expenseType.id || expenseType.name);
                                        setOpenDropdown(null);
                                      }}
                                      className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                                        cantEdit
                                          ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                          : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                                      }`}
                                      disabled={cantEdit}
                                    >
                                      <Settings className="w-4 h-4" />
                                      Configurare
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (cantEdit) {
                                          alert('Nu poți elimina cheltuieli într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                          setOpenDropdown(null);
                                          return;
                                        }
                                        toggleExpenseStatus(expenseType.name, currentMonth, true, currentSheet?.id);
                                        setOpenDropdown(null);
                                      }}
                                      className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                                        cantEdit
                                          ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                          : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-700'
                                      }`}
                                      title={cantEdit ? 'Operație blocată - lună publicată' : 'Elimină pentru această lună'}
                                      disabled={cantEdit}
                                    >
                                      <span className="w-4 h-4 flex items-center justify-center">🚫</span>
                                      Elimină
                                    </button>
                                    {isCustom && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (cantEdit) {
                                            alert('Nu poți șterge cheltuieli într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                            setOpenDropdown(null);
                                            return;
                                          }
                                          deleteCustomExpense(expenseType.name);
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                                          cantEdit
                                            ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                            : 'text-red-700 hover:bg-red-50'
                                        }`}
                                        title={cantEdit ? 'Ștergere blocată - lună publicată' : 'Șterge definitiv cheltuiala'}
                                        disabled={cantEdit}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Șterge cheltuiala
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            </div>
                          </div>

                          {/* Secțiune expandată — facturi cheltuială */}
                          {isExpCardExpanded && (
                            <div className="border-t border-gray-200 mt-3 pt-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <FileText className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-xs font-semibold text-gray-600">Facturi asociate</span>
                              </div>
                              {expenseInvoices.length === 0 ? (
                                <div className="pl-5">
                                  <div className="bg-white rounded border border-gray-200 p-2.5">
                                    <p className="text-xs text-gray-400 italic">Nicio factură asociată</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2 pl-5">
                                  {expenseInvoices.map(inv => {
                                    const totalInv = parseFloat(inv.totalInvoiceAmount || inv.totalAmount) || 0;
                                    const distHistory = (inv.distributionHistory || []).filter(d => d.amount > 0);
                                    // Suma reală distribuită din factură = suma amount-urilor din distributionHistory (per factură)
                                    const realDistributedTotal = distHistory.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
                                    const remaining = totalInv - realDistributedTotal;
                                    const isFullyDist = remaining <= 0.01 && realDistributedTotal > 0;
                                    const isPartial = realDistributedTotal > 0 && !isFullyDist;
                                    // Suma distribuită pe ACEASTĂ cheltuială (nu totalul facturii)
                                    const distOnThisExpense = distHistory
                                      .filter(d => d.expenseName === expenseType.name)
                                      .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

                                    return (
                                      <div key={inv.id} className="bg-white rounded border border-gray-200 p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm font-medium text-gray-800">
                                            Nr. {inv.invoiceNumber} · {inv.supplierName || 'Furnizor'} · {distOnThisExpense.toFixed(2)} lei
                                          </span>
                                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                                            isFullyDist ? 'bg-green-100 text-green-700' :
                                            isPartial ? 'bg-orange-100 text-orange-700' :
                                            'bg-red-100 text-red-700'
                                          }`}>
                                            {isFullyDist ? 'Distribuită' : isPartial ? 'Parțial distribuită' : 'Nedistribuită'}
                                          </span>
                                        </div>
                                        {distHistory.length > 0 && (
                                          <div className="space-y-0.5 mt-1">
                                            {distHistory.map((d, idx) => {
                                              const realAmt = parseFloat(d.amount) || 0;
                                              const isCurrentExpense = d.expenseName === expenseType.name;
                                              return (
                                                <div key={idx} className={`text-xs flex justify-between ${isCurrentExpense ? 'text-green-700 font-semibold' : 'text-gray-500'}`}>
                                                  <span>{isCurrentExpense ? '→ ' : ''}{d.expenseName}</span>
                                                  <span className="font-medium">{realAmt.toFixed(2)} lei</span>
                                                </div>
                                              );
                                            })}
                                            {remaining > 0.01 && (
                                              <div className="text-xs text-orange-600 font-medium flex justify-between pt-0.5 border-t border-gray-100">
                                                <span>Rămas nedistribuit</span>
                                                <span>{remaining.toFixed(2)} lei</span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                    );
                  })()}
                </div>

                {getDisabledExpenseTypes().length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-500 mb-4">Cheltuieli dezactivate pentru {currentMonth}</h3>
                    <div className="grid grid-cols-1 gap-3 opacity-60">
                      {getDisabledExpenseTypes().map((expenseType, index, array) => {
                        const config = getExpenseConfig(expenseType.id || expenseType.name);
                        const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                        const isLastItem = index >= array.length - 2; // ultimele 2 iteme
                        const allSuppliers = config.suppliers?.length > 0
                          ? config.suppliers.map(s => s.supplierName).filter(Boolean)
                          : (config.supplierName ? [config.supplierName] : []);
                        const hasSupplier = allSuppliers.length > 0;

                        // Determină textul și culoarea pentru tipul de distribuție
                        let distributionText, distributionBadgeClass;
                        if (config.distributionType === "apartment") {
                          distributionText = "Pe apartament";
                          distributionBadgeClass = "bg-blue-100 text-blue-700";
                        } else if (config.distributionType === "individual") {
                          distributionText = "Sume individuale";
                          distributionBadgeClass = "bg-purple-100 text-purple-700";
                        } else if (config.distributionType === "person") {
                          distributionText = "Pe persoană";
                          distributionBadgeClass = "bg-amber-100 text-amber-700";
                        } else if (config.distributionType === "cotaParte") {
                          distributionText = "Pe cotă parte";
                          distributionBadgeClass = "bg-indigo-100 text-indigo-700";
                        } else {
                          distributionText = "Pe consum";
                          distributionBadgeClass = "bg-teal-100 text-teal-700";
                        }

                        return (
                          <div key={expenseType.name} className="p-3 sm:p-4 bg-gray-100 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                {/* Rând 1: Nume cheltuială */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm sm:text-base text-gray-500 line-through">{expenseType.name}</span>
                                  {isCustom && (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded opacity-60">Custom</span>
                                  )}
                                </div>
                                {/* Rând 2: Distribuție */}
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="text-xs text-gray-400">Distribuție:</span>
                                  <span className={`px-1.5 py-0.5 text-xs rounded opacity-60 ${distributionBadgeClass}`}>
                                    {distributionText}
                                  </span>
                                </div>
                                {/* Rând 3: Furnizor */}
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <span className="text-xs text-gray-400">{allSuppliers.length > 1 ? 'Furnizori:' : 'Furnizor:'}</span>
                                  {hasSupplier ? (
                                    allSuppliers.map((name, i) => (
                                      <span key={i} className="text-xs text-gray-500 font-medium">
                                        {name}{i < allSuppliers.length - 1 ? ',' : ''}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-orange-500 italic opacity-60">Fără furnizor</span>
                                  )}
                                </div>
                              </div>
                              <div className="relative" data-dropdown-container>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(openDropdown === `disabled-${expenseType.name}` ? null : `disabled-${expenseType.name}`);
                                  }}
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                  title="Opțiuni"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>

                                {openDropdown === `disabled-${expenseType.name}` && (
                                  <div
                                    className={`absolute right-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 ${
                                      isLastItem ? 'bottom-full mb-2' : 'top-full mt-2'
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="py-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (cantEdit) {
                                            alert('Nu poți reactiva cheltuieli într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                            setOpenDropdown(null);
                                            return;
                                          }
                                          toggleExpenseStatus(expenseType.name, currentMonth, false, currentSheet?.id);
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                                          cantEdit
                                            ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                            : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                                        }`}
                                        title={cantEdit ? 'Reactivare blocată - lună publicată' : 'Reactivează pentru această lună'}
                                        disabled={cantEdit}
                                      >
                                        <span className="w-4 h-4 flex items-center justify-center">✅</span>
                                        Reactivează
                                      </button>
                                      {isCustom && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (cantEdit) {
                                              alert('Nu poți șterge cheltuieli într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                              setOpenDropdown(null);
                                              return;
                                            }
                                            deleteCustomExpense(expenseType.name);
                                            setOpenDropdown(null);
                                          }}
                                          className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                                            cantEdit
                                              ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                              : 'text-red-700 hover:bg-red-50'
                                          }`}
                                          title={cantEdit ? 'Ștergere blocată - lună publicată' : 'Șterge definitiv cheltuiala'}
                                          disabled={cantEdit}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Șterge cheltuiala
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
        </div>
        )}

        <ExpenseConfigModal
          isOpen={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedExpense(null);
          }}
          expenseName={selectedExpense ? (getExpenseConfig(selectedExpense)?.name || selectedExpense) : null}
          expenseConfig={selectedExpense ? getExpenseConfig(selectedExpense) : null}
          updateExpenseConfig={updateExpenseConfig}
          saveApartmentParticipations={saveApartmentParticipations}
          getAssociationApartments={getAssociationApartments}
          getApartmentParticipation={getApartmentParticipation}
          setApartmentParticipation={setApartmentParticipation}
          currentSheet={currentSheet}
          blocks={blocks}
          stairs={stairs}
          onSyncSupplierServiceTypes={handleSyncSupplierServiceTypes}
        />

        {/* Unified modal in ADD mode */}
        <ExpenseConfigModal
          mode="add"
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAddExpense={handleAddExpenseFromModal}
          getAssociationApartments={getAssociationApartments}
          getApartmentParticipation={getApartmentParticipation}
          setApartmentParticipation={setApartmentParticipation}
          saveApartmentParticipations={saveApartmentParticipations}
          getAssociationExpenseTypes={getAssociationExpenseTypes}
          currentSheet={currentSheet}
          blocks={blocks || []}
          stairs={stairs || []}
          onSyncSupplierServiceTypes={handleSyncSupplierServiceTypes}
        />

        <SupplierModal
          isOpen={supplierModalOpen}
          onClose={() => {
            setSupplierModalOpen(false);
            setEditingSupplier(null);
          }}
          onSave={handleSupplierSave}
          supplier={editingSupplier}
          title={editingSupplier ? 'Editează furnizor' : 'Adaugă furnizor'}
          expenseTypes={getAssociationExpenseTypes()}
          existingSuppliers={suppliers}
        />
      </div>
    </div>
  );
};

export default ExpensesViewNew;