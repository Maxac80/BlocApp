import React, { useState } from 'react';
import { Plus, Settings, Trash2, Building2, Package } from 'lucide-react';
import { defaultExpenseTypes } from '../../data/expenseTypes';
import DashboardHeader from '../dashboard/DashboardHeader';
import ExpenseConfigModal from '../modals/ExpenseConfigModal';
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
  getMonthType
}) => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  
  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers(association?.id);
  
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    cui: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    iban: '',
    notes: ''
  });
  
  const [editingSupplier, setEditingSupplier] = useState(null);

  const monthType = getMonthType ? getMonthType(currentMonth) : null;

  const handleConfigureExpense = (expenseName) => {
    setSelectedExpense(expenseName);
    setConfigModalOpen(true);
  };

  const handleAddSupplier = async () => {
    if (newSupplier.name) {
      try {
        // Adaugă furnizorul cu doar numele completat
        await addSupplier({ name: newSupplier.name });
        setNewSupplier({ 
          name: '', 
          cui: '', 
          address: '', 
          phone: '', 
          email: '', 
          website: '', 
          iban: '', 
          notes: '' 
        });
      } catch (error) {
        console.error('Error adding supplier:', error);
      }
    }
  };

  const handleUpdateSupplier = async (supplierId) => {
    if (editingSupplier) {
      try {
        await updateSupplier(supplierId, editingSupplier);
        setEditingSupplier(null);
      } catch (error) {
        console.error('Error updating supplier:', error);
      }
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
    <div className={`min-h-screen p-6 ${
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

        <div className="bg-white rounded-xl shadow-lg">
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
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">Adaugă cheltuială nouă</h3>
                  <div className="flex gap-2">
                    <input
                      value={newCustomExpense.name}
                      onChange={(e) => setNewCustomExpense({...newCustomExpense, name: e.target.value})}
                      placeholder="ex: Deratizare, Curățenie, etc."
                      className="flex-1 p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button 
                      onClick={handleAddCustomExpense}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      disabled={!newCustomExpense.name}
                    >
                      <Plus className="w-5 h-5" />
                      Adaugă
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-4">Cheltuieli active pentru {currentMonth}</h3>
                  <div className="space-y-3">
                    {getAssociationExpenseTypes().map(expenseType => {
                      const config = getExpenseConfig(expenseType.name);
                      const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                      const supplierName = config.supplierName || 'Fără furnizor';
                      
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
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfigureExpense(expenseType.name)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                              >
                                <Settings className="w-4 h-4" />
                                Configurare
                              </button>
                              <button
                                onClick={() => toggleExpenseStatus(expenseType.name, currentMonth, true)}
                                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors"
                                title="Elimină pentru această lună"
                              >
                                Elimină
                              </button>
                              {isCustom && (
                                <button
                                  onClick={() => deleteCustomExpense(expenseType.name)}
                                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                  title="Șterge definitiv cheltuiala"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
                      {getDisabledExpenseTypes().map(expenseType => {
                        const config = getExpenseConfig(expenseType.name);
                        const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                        
                        return (
                          <div key={expenseType.name} className="p-4 bg-gray-100 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-600 line-through">{expenseType.name}</div>
                                <div className="text-sm text-gray-500">
                                  {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                                   config.distributionType === "individual" ? "Pe apartament (individual)" :
                                   config.distributionType === "person" ? "Pe persoană" : 
                                   "Pe consum"}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleExpenseStatus(expenseType.name, currentMonth, false)}
                                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                                  title="Reactivează pentru această lună"
                                >
                                  Reactivează
                                </button>
                                {isCustom && (
                                  <button
                                    onClick={() => deleteCustomExpense(expenseType.name)}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                    title="Șterge definitiv cheltuiala"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
                <div className="flex items-center gap-4 mb-6">
                  <input
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                    placeholder="Nume furnizor (ex: EON Energie)"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button 
                    onClick={handleAddSupplier}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    disabled={!newSupplier.name}
                  >
                    <Plus className="w-5 h-5" />
                    Adaugă
                  </button>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-4">Lista furnizorilor</h3>
                  {loading ? (
                    <p className="text-gray-500 text-center py-8">Se încarcă furnizorii...</p>
                  ) : suppliers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nu există furnizori adăugați</p>
                  ) : (
                    <div className="space-y-3">
                      {suppliers.map(supplier => (
                        <div key={supplier.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between">
                            {editingSupplier && editingSupplier.id === supplier.id ? (
                              <div className="w-full">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Nume furnizor *
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSupplier.name}
                                      onChange={(e) => setEditingSupplier({...editingSupplier, name: e.target.value})}
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      CUI
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSupplier.cui || ''}
                                      onChange={(e) => setEditingSupplier({...editingSupplier, cui: e.target.value})}
                                      placeholder="ex: 22043010"
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Adresă
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSupplier.address || ''}
                                      onChange={(e) => setEditingSupplier({...editingSupplier, address: e.target.value})}
                                      placeholder="ex: Str. Example 123, București"
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Telefon
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSupplier.phone || ''}
                                      onChange={(e) => setEditingSupplier({...editingSupplier, phone: e.target.value})}
                                      placeholder="ex: 0800 800 800"
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Email
                                    </label>
                                    <input
                                      type="email"
                                      value={editingSupplier.email || ''}
                                      onChange={(e) => setEditingSupplier({...editingSupplier, email: e.target.value})}
                                      placeholder="ex: contact@eon.ro"
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Website
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSupplier.website || ''}
                                      onChange={(e) => setEditingSupplier({...editingSupplier, website: e.target.value})}
                                      placeholder="ex: www.eon.ro"
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      IBAN
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSupplier.iban || ''}
                                      onChange={(e) => setEditingSupplier({...editingSupplier, iban: e.target.value})}
                                      placeholder="ex: RO12BTRL0000000000000"
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Note
                                    </label>
                                    <textarea
                                      value={editingSupplier.notes || ''}
                                      onChange={(e) => setEditingSupplier({...editingSupplier, notes: e.target.value})}
                                      placeholder="Informații adiționale..."
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      rows="3"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingSupplier(null)}
                                    className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
                                  >
                                    Anulează
                                  </button>
                                  <button
                                    onClick={() => handleUpdateSupplier(supplier.id)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                  >
                                    Salvează
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <div className="font-medium text-lg text-gray-900">{supplier.name}</div>
                                  {(() => {
                                    const activeExpenseTypes = getSupplierExpenseTypes(supplier.id);
                                    return activeExpenseTypes.length > 0 && (
                                      <div className="mt-1">
                                        {activeExpenseTypes.map(type => (
                                          <span key={type} className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full mr-2">
                                            {type}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingSupplier(supplier)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                  >
                                    Editează
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSupplier(supplier.id)}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
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
          associationId={association?.id}
        />
      </div>
    </div>
  );
};

export default ExpensesViewNew;