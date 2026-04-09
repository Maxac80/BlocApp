/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, MoreVertical } from 'lucide-react';
import SupplierModal from '../modals/SupplierModal';
import useSuppliers from '../../hooks/useSuppliers';

const SuppliersView = ({
  association,
  currentMonth,
  isMonthReadOnly,
  isReadOnlyRole,
  getAssociationExpenseTypes,
  getExpenseConfig,
  updateExpenseConfig,
  currentSheet,
  publishedSheet,
  sheets,
  blocks,
  stairs
}) => {
  const cantEdit = isMonthReadOnly || isReadOnlyRole;

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Determină sheet-ul corect pentru luna selectată
  const activeSheet = React.useMemo(() => {
    if (publishedSheet?.monthYear === currentMonth) return publishedSheet;
    if (currentSheet?.monthYear === currentMonth) return currentSheet;
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

  // Helper: obține cheltuielile unui furnizor
  const getSupplierExpenseTypes = (supplierId) => {
    const allExpenseTypes = getAssociationExpenseTypes();
    return allExpenseTypes
      .filter(expType => {
        const config = getExpenseConfig(expType.id || expType.name);
        return config?.suppliers?.some(s => s.supplierId === supplierId) ||
               config?.supplierId === supplierId;
      })
      .map(expType => expType.name);
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierModalOpen(true);
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierModalOpen(true);
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!window.confirm('Sigur vrei să ștergi acest furnizor?')) return;
    try {
      await deleteSupplier(supplierId);
    } catch (error) {
      console.error('Eroare la ștergerea furnizorului:', error);
      alert('Eroare la ștergerea furnizorului');
    }
  };

  const handleSupplierSave = async (supplierData) => {
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, supplierData);
      } else {
        await addSupplier(supplierData);
      }
      setSupplierModalOpen(false);
      setEditingSupplier(null);
    } catch (error) {
      console.error('Eroare la salvarea furnizorului:', error);
      alert('Eroare la salvarea furnizorului');
    }
  };

  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="w-full">
        {/* Page Title */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🚛 Furnizori</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6">
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
                  title={cantEdit ? 'Adăugare blocată - lună publicată/arhivată' : 'Adaugă furnizor'}
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
                  <div className="grid grid-cols-1 gap-3">
                    {suppliers.map((supplier, index, array) => {
                      const isLastItem = index >= array.length - 2;
                      const activeExpenseTypes = getSupplierExpenseTypes(supplier.id);

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
          </div>
        </div>

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

export default SuppliersView;
