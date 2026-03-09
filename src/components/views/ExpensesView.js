/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, Building2, Package, MoreVertical, Home, Users, User, BarChart3 } from 'lucide-react';
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
  togglePortalSubmission
}) => {
  const cantEdit = isMonthReadOnly || isReadOnlyRole;

  const [activeTab, setActiveTab] = useState('expenses');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);

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

  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers(activeSheet);

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
    
    return getAssociationExpenseTypes()
      .map(expenseType => {
        const config = getExpenseConfig(expenseType.name);
        return config.supplierId === supplierId ? expenseType.name : null;
      })
      .filter(Boolean);
  };

  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">💰 Configurare cheltuieli</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'expenses'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Cheltuieli</span><span className="sm:hidden">Cheltuieli</span> ({getAssociationExpenseTypes().length})
              </button>
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'suppliers'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Furnizori ({suppliers.length})
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'expenses' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-end mb-3 sm:mb-4">
                  <button
                    onClick={() => {
                      if (cantEdit) {
                        alert('Nu poți adăuga cheltuieli într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                        return;
                      }
                      setAddModalOpen(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-sm rounded-lg transition-colors ${
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
                  <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-3 sm:mb-4">Cheltuieli active pentru {currentMonth}</h3>
                  <div className="space-y-3">
                    {getAssociationExpenseTypes().map((expenseType, index, array) => {
                      const config = getExpenseConfig(expenseType.id || expenseType.name);
                      const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                      const supplierName = config.supplierName || 'Fără furnizor';
                      const hasSupplier = config.supplierName && config.supplierName.trim() !== '';
                      const isLastItem = index >= array.length - 2; // ultimele 2 iteme

                      // Verifică dacă cheltuiala a fost distribuită în calcul întreținere
                      const isDistributed = currentSheet?.expenses?.some(exp =>
                        (exp.expenseTypeId === expenseType.id || exp.expenseType === expenseType.name) &&
                        exp.amount > 0
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

                      return (
                        <div key={expenseType.name} className="p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {/* Rând 1: Nume cheltuială */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm sm:text-base text-gray-900">{expenseType.name}</span>
                                {isCustom && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Custom</span>
                                )}
                                {isDistributed && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Distribuită</span>
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
                              {/* Rând 3: Furnizor */}
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="text-xs text-gray-500">Furnizor:</span>
                                {hasSupplier ? (
                                  <span className="text-xs text-gray-900 font-medium">{supplierName}</span>
                                ) : (
                                  <span className="text-xs text-orange-600 italic">{supplierName}</span>
                                )}
                              </div>
                            </div>
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
                      );
                    })}
                  </div>
                </div>

                {getDisabledExpenseTypes().length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-500 mb-4">Cheltuieli dezactivate pentru {currentMonth}</h3>
                    <div className="space-y-3 opacity-60">
                      {getDisabledExpenseTypes().map((expenseType, index, array) => {
                        const config = getExpenseConfig(expenseType.id || expenseType.name);
                        const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                        const isLastItem = index >= array.length - 2; // ultimele 2 iteme
                        const supplierName = config.supplierName || 'Fără furnizor';
                        const hasSupplier = config.supplierName && config.supplierName.trim() !== '';

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
                                  <span className="text-xs text-gray-400">Furnizor:</span>
                                  {hasSupplier ? (
                                    <span className="text-xs text-gray-500 font-medium">{supplierName}</span>
                                  ) : (
                                    <span className="text-xs text-orange-500 italic opacity-60">{supplierName}</span>
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
            )}

            {activeTab === 'suppliers' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-end mb-3 sm:mb-4">
                  <button
                    onClick={() => {
                      if (cantEdit) {
                        alert('Nu poți adăuga furnizori într-o lună publicată sau arhivată.\n\nPentru a face modificări, mergi la luna în lucru.');
                        return;
                      }
                      handleAddSupplier();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-sm rounded-lg transition-colors ${
                      cantEdit
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={cantEdit}
                    title={cantEdit ? 'Adăugare blocată - lună publicată/arhivată' : 'Adaugă furnizor nou'}
                  >
                    <Plus className="w-4 h-4" />
                    Adaugă furnizor
                  </button>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-3 sm:mb-4">Lista furnizorilor</h3>
                  {loading ? (
                    <p className="text-gray-500 text-center py-8">Se încarcă furnizorii...</p>
                  ) : suppliers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nu există furnizori adăugați</p>
                  ) : (
                    <div className="space-y-3">
                      {suppliers.map((supplier, index, array) => {
                        const isLastItem = index >= array.length - 2; // ultimele 2 iteme
                        const activeExpenseTypes = getSupplierExpenseTypes(supplier.id);
                        const isSelected = selectedSupplierId === supplier.id;

                        return (
                        <div
                          key={supplier.id}
                          className="p-3 sm:p-4 rounded-lg transition-all duration-200 bg-gray-50 border-2 border-transparent"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm sm:text-base text-gray-900">{supplier.name}</div>
                              {activeExpenseTypes.length > 0 && (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs text-gray-500">
                                    {activeExpenseTypes.length === 1 ? 'Cheltuială:' : 'Cheltuieli:'}
                                  </span>
                                  {activeExpenseTypes.map(type => (
                                    <span key={type} className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="relative" data-dropdown-container>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === `supplier-${supplier.id}` ? null : `supplier-${supplier.id}`);
                                }}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                title="Opțiuni"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>

                              {openDropdown === `supplier-${supplier.id}` && (
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
                                          alert('Nu poți edita furnizori într-o lună publicată sau arhivată.\n\nPentru a face modificări, mergi la luna în lucru.');
                                          setOpenDropdown(null);
                                          return;
                                        }
                                        handleEditSupplier(supplier);
                                        setOpenDropdown(null);
                                      }}
                                      className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                                        cantEdit
                                          ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                                      }`}
                                      disabled={cantEdit}
                                    >
                                      <Settings className="w-4 h-4" />
                                      Editează
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (cantEdit) {
                                          alert('Nu poți șterge furnizori într-o lună publicată sau arhivată.\n\nPentru a face modificări, mergi la luna în lucru.');
                                          setOpenDropdown(null);
                                          return;
                                        }
                                        handleDeleteSupplier(supplier.id);
                                        setOpenDropdown(null);
                                      }}
                                      className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                                        cantEdit
                                          ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                          : 'text-red-700 hover:bg-red-50'
                                      }`}
                                      disabled={cantEdit}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Șterge furnizor
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

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
        />

        <SupplierModal
          isOpen={supplierModalOpen}
          onClose={() => {
            setSupplierModalOpen(false);
            setEditingSupplier(null);
          }}
          onSave={handleSupplierSave}
          supplier={editingSupplier}
          title={editingSupplier ? 'Editează furnizor' : 'Adaugă furnizor nou'}
        />
      </div>
    </div>
  );
};

export default ExpensesViewNew;