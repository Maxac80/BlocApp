import React, { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, Building2, Package, MoreVertical } from 'lucide-react';
import { defaultExpenseTypes } from '../../data/expenseTypes';
import DashboardHeader from '../dashboard/DashboardHeader';
import ExpenseConfigModal from '../modals/ExpenseConfigModal';
import ExpenseAddModal from '../modals/ExpenseAddModal';
import SupplierModal from '../modals/SupplierModal';
import useSuppliers from '../../hooks/useSuppliers';

const ExpensesViewNew = ({
  association,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses,
  isMonthReadOnly,
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
  getApartmentParticipation,
  setApartmentParticipation,
  getDisabledExpenseTypes,
  toggleExpenseStatus,
  deleteCustomExpense,
  getMonthType,
  currentSheet
}) => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers(currentSheet);

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

  const monthType = getMonthType ? getMonthType(currentMonth) : null;

  const handleConfigureExpense = (expenseName) => {
    setSelectedExpense(expenseName);
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
      await addSupplier(formData);
    }
  };

  const handleAddExpenseFromModal = async (expenseData, configData) => {
    try {
      console.log('🔄 Adăugare cheltuială din modal:', expenseData, configData);

      // Verifică dacă numele cheltuielii există deja
      const existingExpenseTypes = getAssociationExpenseTypes();
      const nameExists = existingExpenseTypes.some(expense =>
        expense.name.toLowerCase().trim() === expenseData.name.toLowerCase().trim()
      );

      if (nameExists) {
        alert(`Cheltuiala cu numele "${expenseData.name}" există deja. Vă rugăm să alegeți un alt nume.`);
        return;
      }

      // Add custom expense directly
      await addCustomExpense({
        name: expenseData.name,
        defaultDistribution: expenseData.defaultDistribution || "apartment"
      });

      // Update configuration if provided
      if (configData && Object.keys(configData).length > 0) {
        console.log('🔄 Actualizare configurație:', configData);
        await updateExpenseConfig(expenseData.name, {
          distributionType: configData.distributionType,
          supplierId: configData.supplierId,
          supplierName: configData.supplierName,
          contractNumber: configData.contractNumber,
          contactPerson: configData.contactPerson
        });
      }

      console.log('✅ Cheltuială adăugată cu succes din modal');
      return true;
    } catch (error) {
      console.error('❌ Eroare la adăugarea cheltuielii din modal:', error);
      throw error;
    }
  };



  const handleDeleteSupplier = async (supplierId) => {
    if (window.confirm('Sigur doriți să ștergeți acest furnizor?')) {
      try {
        await deleteSupplier(supplierId);
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
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
    <div className={`min-h-screen pt-2 px-6 pb-6 ${
      monthType === 'current'
        ? "bg-gradient-to-br from-indigo-50 to-blue-100"
        : monthType === 'next'
        ? "bg-gradient-to-br from-green-50 to-emerald-100"
        : monthType === 'historic'
        ? "bg-gradient-to-br from-gray-50 to-gray-100"
        : "bg-gradient-to-br from-indigo-50 to-blue-100"
    }`}>
      <div className="w-full">
        <DashboardHeader
          association={association}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          getAvailableMonths={getAvailableMonths}
          expenses={expenses}
          isMonthReadOnly={isMonthReadOnly}
          getAssociationApartments={getAssociationApartments}
          handleNavigation={handleNavigation}
          getMonthType={getMonthType}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">💰 Configurare cheltuieli</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'expenses'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-5 h-5" />
                Cheltuieli ({getAssociationExpenseTypes().length})
              </button>
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'suppliers'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-5 h-5" />
                Furnizori ({suppliers.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                {(() => {
                  const customExpenses = getAssociationExpenseTypes().filter(expenseType =>
                    !defaultExpenseTypes.find(def => def.name === expenseType.name)
                  );
                  const hasCustomExpenses = customExpenses.length > 0;

                  return hasCustomExpenses ? (
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => setAddModalOpen(true)}
                        className="w-10 h-10 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center shadow-lg"
                        title="Adaugă cheltuială nouă"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => setAddModalOpen(true)}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg"
                      >
                        Adaugă cheltuială
                      </button>
                    </div>
                  );
                })()}

                <div>
                  <h3 className="font-semibold text-gray-700 mb-4">Cheltuieli active pentru {currentMonth}</h3>
                  <div className="space-y-3">
                    {getAssociationExpenseTypes().map((expenseType, index, array) => {
                      const config = getExpenseConfig(expenseType.name);
                      const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                      const supplierName = config.supplierName || 'Fără furnizor';
                      const isLastItem = index >= array.length - 2; // ultimele 2 iteme
                      
                      return (
                        <div key={expenseType.name} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-lg text-gray-900">{expenseType.name}</span>
                                {isCustom && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Custom</span>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-gray-600">
                                <span className="mr-4">
                                  {config.distributionType === "apartment" ? "📊 Pe apartament (egal)" : 
                                   config.distributionType === "individual" ? "📋 Pe apartament (individual)" :
                                   config.distributionType === "person" ? "👥 Pe persoană" : 
                                   "📈 Pe consum"}
                                </span>
                                <span>• 🏢 {supplierName}</span>
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
                                        handleConfigureExpense(expenseType.name);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                                    >
                                      <Settings className="w-4 h-4" />
                                      Configurare
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpenseStatus(expenseType.name, currentMonth, true);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 flex items-center gap-2"
                                      title="Elimină pentru această lună"
                                    >
                                      <span className="w-4 h-4 flex items-center justify-center">🚫</span>
                                      Elimină
                                    </button>
                                    {isCustom && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteCustomExpense(expenseType.name);
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-red-700 hover:bg-red-50 flex items-center gap-2"
                                        title="Șterge definitiv cheltuiala"
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
                        const config = getExpenseConfig(expenseType.name);
                        const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                        const isLastItem = index >= array.length - 2; // ultimele 2 iteme

                        return (
                          <div key={expenseType.name} className="p-4 bg-gray-100 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-600 line-through">{expenseType.name}</span>
                                  {isCustom && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full opacity-60">Custom</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {config.distributionType === "apartment" ? "Pe apartament (egal)" :
                                   config.distributionType === "individual" ? "Pe apartament (individual)" :
                                   config.distributionType === "person" ? "Pe persoană" :
                                   "Pe consum"}
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
                                          toggleExpenseStatus(expenseType.name, currentMonth, false);
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                                        title="Reactivează pentru această lună"
                                      >
                                        <span className="w-4 h-4 flex items-center justify-center">✅</span>
                                        Reactivează
                                      </button>
                                      {isCustom && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteCustomExpense(expenseType.name);
                                            setOpenDropdown(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-red-700 hover:bg-red-50 flex items-center gap-2"
                                          title="Șterge definitiv cheltuiala"
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
              <div className="space-y-6">
                {(() => {
                  const hasSuppliers = suppliers.length > 0;

                  return hasSuppliers ? (
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={handleAddSupplier}
                        className="w-10 h-10 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center shadow-lg"
                        title="Adaugă furnizor nou"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={handleAddSupplier}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg"
                      >
                        Adaugă furnizor
                      </button>
                    </div>
                  );
                })()}

                <div>
                  <h3 className="font-semibold text-gray-700 mb-4">Lista furnizorilor</h3>
                  {loading ? (
                    <p className="text-gray-500 text-center py-8">Se încarcă furnizorii...</p>
                  ) : suppliers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nu există furnizori adăugați</p>
                  ) : (
                    <div className="space-y-3">
                      {suppliers.map((supplier, index, array) => {
                        const isLastItem = index >= array.length - 2; // ultimele 2 iteme
                        const activeExpenseTypes = getSupplierExpenseTypes(supplier.id);

                        return (
                        <div key={supplier.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-lg text-gray-900">{supplier.name}</div>
                              {activeExpenseTypes.length > 0 && (
                                <div className="mt-1">
                                  {activeExpenseTypes.map(type => (
                                    <span key={type} className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full mr-2">
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {supplier.cui && (
                                <div className="text-sm text-gray-500 mt-1">CUI: {supplier.cui}</div>
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
                                        handleEditSupplier(supplier);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                                    >
                                      <Settings className="w-4 h-4" />
                                      Editează
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSupplier(supplier.id);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-red-700 hover:bg-red-50 flex items-center gap-2"
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
          expenseName={selectedExpense}
          expenseConfig={selectedExpense ? getExpenseConfig(selectedExpense) : null}
          updateExpenseConfig={updateExpenseConfig}
          getAssociationApartments={getAssociationApartments}
          getApartmentParticipation={getApartmentParticipation}
          setApartmentParticipation={setApartmentParticipation}
          currentSheet={currentSheet}
        />

        <ExpenseAddModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAddExpense={handleAddExpenseFromModal}
          getAssociationApartments={getAssociationApartments}
          getApartmentParticipation={getApartmentParticipation}
          setApartmentParticipation={setApartmentParticipation}
          getAssociationExpenseTypes={getAssociationExpenseTypes}
          currentSheet={currentSheet}
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