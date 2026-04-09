/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, MoreVertical, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import SupplierModal from '../modals/SupplierModal';
import useSuppliers from '../../hooks/useSuppliers';
import StatsCard from '../common/StatsCard';

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
  stairs,
  invoices = []
}) => {
  const cantEdit = isMonthReadOnly || isReadOnlyRole;

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [expandedSuppliers, setExpandedSuppliers] = useState({});

  const toggleExpand = (supplierId) => {
    setExpandedSuppliers(prev => ({ ...prev, [supplierId]: !prev[supplierId] }));
  };

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

  // Helper: status distribuție furnizor (bazat pe cheltuielile asociate, nu pe facturi)
  // Un furnizor e "distribuit" dacă TOATE cheltuielile lui au fost distribuite în luna curentă
  const getSupplierDistributionStatus = (supplierId) => {
    const expenseTypes = getSupplierExpenseTypes(supplierId);
    if (expenseTypes.length === 0) return { status: 'no_expenses', label: 'Fără cheltuieli', color: 'bg-gray-100 text-gray-500', distributed: [], undistributed: [] };

    // Verifică dacă furnizorul are facturi în luna curentă
    const supplierInvs = invoices.filter(inv => inv.supplierId === supplierId);
    const hasInvoices = supplierInvs.length > 0;

    const distributedExpenses = currentSheet?.expenses || [];
    const distributed = [];
    const undistributed = [];

    expenseTypes.forEach(expName => {
      const isDistributed = distributedExpenses.some(exp => exp.name === expName);
      if (isDistributed) {
        distributed.push(expName);
      } else {
        undistributed.push(expName);
      }
    });

    if (distributed.length === expenseTypes.length) {
      return { status: 'full', label: 'Distribuit', color: 'bg-green-100 text-green-700', distributed, undistributed };
    }
    if (distributed.length > 0) {
      return { status: 'partial', label: 'Parțial distribuit', color: 'bg-orange-100 text-orange-700', distributed, undistributed };
    }
    if (!hasInvoices) {
      return { status: 'no_invoices', label: 'Fără facturi', color: 'bg-yellow-100 text-yellow-700', distributed, undistributed };
    }
    return { status: 'undistributed', label: 'Nedistribuit', color: 'bg-red-100 text-red-700', distributed, undistributed };
  };

  // Statistici globale furnizori
  const supplierStats = React.useMemo(() => {
    const totalLinks = suppliers.reduce((sum, s) => sum + getSupplierExpenseTypes(s.id).length, 0);
    const withDistributed = suppliers.filter(s => {
      const st = getSupplierDistributionStatus(s.id);
      return st.status === 'full';
    }).length;
    return { totalLinks, withDistributed };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers, invoices]);

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

        {/* Statistici furnizori */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatsCard label="Total furnizori" value={suppliers.length} borderColor="border-blue-500" />
          <StatsCard label="Cu facturi distribuite" value={`${supplierStats.withDistributed} / ${suppliers.length}`} borderColor="border-green-500" />
          <StatsCard label="Cheltuieli asociate" value={supplierStats.totalLinks} borderColor="border-teal-500" />
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

                      const isExpanded = expandedSuppliers[supplier.id];
                      const supplierInvoices = invoices.filter(inv => inv.supplierId === supplier.id);

                      return (
                        <div
                          key={supplier.id}
                          className="p-3 sm:p-4 rounded-lg transition-all duration-200 bg-gray-50 border-2 border-transparent"
                        >
                          <div
                            className="flex items-start justify-between cursor-pointer"
                            onClick={() => toggleExpand(supplier.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm sm:text-base text-gray-900">{supplier.name}</div>
                              {(() => {
                                const dist = getSupplierDistributionStatus(supplier.id);
                                return activeExpenseTypes.length > 0 && (
                                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs text-gray-500">
                                      {activeExpenseTypes.length === 1 ? 'Cheltuială:' : 'Cheltuieli:'}
                                    </span>
                                    {activeExpenseTypes.map(type => {
                                      const isExpDistributed = dist.distributed?.includes(type);
                                      return (
                                        <span
                                          key={type}
                                          className={`inline-block px-1.5 py-0.5 text-xs rounded ${
                                            isExpDistributed
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-gray-200 text-gray-600'
                                          }`}
                                        >
                                          {type}
                                        </span>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Badge distribuție + chevron + meniu acțiuni */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {(() => {
                                const dist = getSupplierDistributionStatus(supplier.id);
                                return (
                                  <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium whitespace-nowrap ${dist.color}`}>
                                    {dist.label}
                                  </span>
                                );
                              })()}
                              {isExpanded
                                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                : <ChevronDown className="w-4 h-4 text-gray-400" />
                              }
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

                          {/* Secțiune expandată — facturi furnizor */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 mt-3 pt-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <FileText className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-xs font-semibold text-gray-600">Facturi luna curentă</span>
                              </div>
                              {supplierInvoices.length === 0 ? (
                                <p className="text-xs text-gray-400 italic pl-5">Nicio factură în luna curentă</p>
                              ) : (
                                <div className="space-y-2 pl-5">
                                  {supplierInvoices.map(inv => {
                                    const totalInv = parseFloat(inv.totalInvoiceAmount || inv.totalAmount) || 0;
                                    const distHistory = (inv.distributionHistory || []).filter(d => d.amount > 0);
                                    const sheetExps = currentSheet?.expenses || [];
                                    // Suma reală distribuită din sheet expenses
                                    const distExpNames = distHistory.map(d => d.expenseName).filter(Boolean);
                                    const realDistributed = sheetExps
                                      .filter(exp => distExpNames.includes(exp.name))
                                      .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
                                    const remaining = totalInv - realDistributed;
                                    const isFullyDist = remaining <= 0.01 && realDistributed > 0;

                                    return (
                                      <div key={inv.id} className="bg-white rounded border border-gray-200 p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm font-medium text-gray-800">
                                            Nr. {inv.invoiceNumber} · {totalInv.toFixed(2)} lei
                                          </span>
                                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                                            isFullyDist ? 'bg-green-100 text-green-700' :
                                            realDistributed > 0 ? 'bg-orange-100 text-orange-700' :
                                            'bg-red-100 text-red-700'
                                          }`}>
                                            {isFullyDist ? 'Distribuită' :
                                             realDistributed > 0 ? 'Parțial' :
                                             'Nedistribuită'}
                                          </span>
                                        </div>
                                        {inv.invoiceDate && (
                                          <div className="text-[11px] text-gray-400 mb-1">{inv.invoiceDate}</div>
                                        )}
                                        {distHistory.length > 0 && (
                                          <div className="space-y-0.5">
                                            {distHistory.map((d, idx) => {
                                              const sheetExp = sheetExps.find(e => e.name === d.expenseName);
                                              const realAmt = sheetExp ? parseFloat(sheetExp.amount) || 0 : parseFloat(d.amount) || 0;
                                              return (
                                                <div key={idx} className="text-xs text-gray-600 flex justify-between">
                                                  <span>{d.expenseName}</span>
                                                  <span className="font-medium text-green-700">{realAmt.toFixed(2)} lei</span>
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
