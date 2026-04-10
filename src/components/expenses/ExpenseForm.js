/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import { Plus, FileText, Upload, X } from 'lucide-react';

const ExpenseForm = ({
  newExpense,
  setNewExpense,
  availableExpenseTypes,
  associationExpenses,
  getExpenseConfig,
  handleAddExpense,
  isMonthReadOnly,
  currentMonth,
  setShowExpenseConfig,
  setSelectedExpenseForConfig,
  monthType,
  blocks,
  stairs,
  // Funcții noi pentru facturi parțiale
  getPartiallyDistributedInvoices,
  getInvoiceByNumber,
  syncSuppliersForExpenseType,
  getAssociationApartments
}) => {
  // Helper: Obține unitatea de măsură configurată
  const getUnitLabel = (expenseName) => {
    const config = getExpenseConfig(expenseName);
    if (config?.consumptionUnit === 'custom' && config?.customConsumptionUnit) {
      return config.customConsumptionUnit;
    } else if (config?.consumptionUnit) {
      return config.consumptionUnit;
    }
    return 'mc'; // default
  };

  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    notes: '',
    totalInvoiceAmount: '', // Total factură completă
    currentDistribution: '', // Suma de distribuit luna aceasta
    isPartialDistribution: false // Flag pentru distribuție parțială
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [selectedExistingInvoice, setSelectedExistingInvoice] = useState('');

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
    document.getElementById('pdf-upload').value = '';
  };

  const resetInvoiceData = () => {
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
    setShowInvoiceDetails(false);
    setSelectedExistingInvoice('');
    // Resetează și input-ul de file
    const fileInput = document.getElementById('pdf-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Handler pentru selectarea unei facturi existente
  const handleExistingInvoiceSelect = (invoiceId) => {
    setSelectedExistingInvoice(invoiceId);
    
    if (invoiceId && getInvoiceByNumber) {
      const invoice = getPartiallyDistributedInvoices?.(newExpense.name)
        ?.find(inv => inv.id === invoiceId);
      
      if (invoice) {
        // Pre-completează cu suma rămasă
        setInvoiceData(prev => ({
          ...prev,
          currentDistribution: invoice.remainingAmount?.toString() || '',
          totalInvoiceAmount: invoice.totalInvoiceAmount?.toString() || invoice.totalAmount?.toString() || '',
          invoiceNumber: invoice.invoiceNumber,
          isPartialDistribution: true
        }));
        
        // Actualizează și newExpense pentru calcule
        if (getExpenseConfig(newExpense.name).distributionType === "consumption") {
          setNewExpense(prev => ({
            ...prev,
            billAmount: invoice.remainingAmount?.toString() || ''
          }));
        } else {
          setNewExpense(prev => ({
            ...prev,
            amount: invoice.remainingAmount?.toString() || ''
          }));
        }
      }
    } else if (!invoiceId) {
      // Resetează toate câmpurile când se selectează "Factură nouă"
      resetInvoiceData();
      
      // Resetează și valorile din newExpense
      if (getExpenseConfig(newExpense.name).distributionType === "consumption") {
        setNewExpense(prev => ({
          ...prev,
          billAmount: ''
        }));
      } else {
        setNewExpense(prev => ({
          ...prev,
          amount: ''
        }));
      }
    }
  };

  // Resetează toate datele formei când se resetează newExpense  
  React.useEffect(() => {
    // Doar resetează datele locale când newExpense.name devine gol
    if (newExpense.name === "" && (invoiceData.invoiceNumber || pdfFile || showInvoiceDetails)) {
      resetInvoiceData();
    }
  }, [newExpense.name]); // Doar dependența necesară

  // Transmite datele facturii în props pentru ca părinte să le folosească
  React.useEffect(() => {
    // Doar actualiza când există date de factură și nu e în reset
    if (setNewExpense && newExpense.name && showInvoiceDetails) {
      
      // Calculează suma de distribuit curentă
      const currentDistribution = getExpenseConfig(newExpense.name).distributionType === "consumption" 
        ? newExpense.billAmount 
        : newExpense.amount;
      
      setNewExpense(prev => ({
        ...prev,
        invoiceData: {
          ...invoiceData,
          currentDistribution: currentDistribution,
          totalInvoiceAmount: invoiceData.totalInvoiceAmount || currentDistribution,
          selectedExistingInvoiceId: selectedExistingInvoice
        },
        pdfFile: pdfFile
      }));
    }
  }, [invoiceData, pdfFile, showInvoiceDetails, newExpense.name, selectedExistingInvoice]); // Fără isResetting
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">💰 Adaugă Cheltuială</h3>
      </div>
      
      {getAssociationApartments && getAssociationApartments().length === 0 ? (
        <div className="py-4 px-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    APARTAMENTE NECESARE
                  </span>
                  <span className="text-sm font-semibold text-blue-800">Nu există apartamente configurate</span>
                </div>
                <p className="text-sm text-blue-600">Pentru a adăuga cheltuieli, configurează mai întâi apartamentele din asociație</p>
              </div>
            </div>
          </div>
        </div>
      ) : availableExpenseTypes.length === 0 ? (
        isMonthReadOnly ? (
          monthType === 'historic' ? (
            <div className="py-4 px-6 bg-gray-50 border-2 border-gray-300 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        LUNĂ ISTORICĂ
                      </span>
                      <span className="text-sm font-semibold text-gray-800">Aceasta este o lună arhivată</span>
                    </div>
                    <p className="text-sm text-gray-600">Nu se mai pot face modificări • Datele sunt doar pentru consultare</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 px-6 bg-purple-50 border-2 border-purple-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        LUNĂ PUBLICATĂ
                      </span>
                      <span className="text-sm font-semibold text-purple-800">Luna este publicată și afișată proprietarilor</span>
                    </div>
                    <p className="text-sm text-purple-600">Nu se pot adăuga cheltuieli noi • Poți doar înregistra încasări</p>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : associationExpenses.length === 0 ? (
          <div className="text-center py-8 bg-orange-50 border-2 border-orange-200 rounded-xl">
            <div className="mb-4">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">⚠️</span>
              </div>
              <div className="mb-2">
                <span className="bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                  ⚠️ CONFIGURARE NECESARĂ
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-orange-800 mb-2">Nu există cheltuieli active configurate</h3>
            <p className="text-orange-700 font-medium">Toate cheltuielile au fost dezactivate pentru această lună</p>
            <p className="text-orange-600 text-sm mt-2">Mergi la Configurare Asociație → Cheltuieli pentru a reactiva cheltuielile necesare</p>
          </div>
        ) : (
          <div className="py-4 px-6 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      TOATE CHELTUIELILE ADĂUGATE
                    </span>
                    <span className="text-sm font-semibold text-green-800">Toate cheltuielile configurate au fost adăugate</span>
                  </div>
                  <p className="text-sm text-green-600">Poți modifica cheltuielile existente sau configura cheltuieli noi</p>
                </div>
              </div>
            </div>
          </div>
        )
      ) : isMonthReadOnly ? (
        monthType === 'historic' ? (
          <div className="py-4 px-6 bg-gray-50 border-2 border-gray-300 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      LUNĂ ISTORICĂ
                    </span>
                    <span className="text-sm font-semibold text-gray-800">Aceasta este o lună arhivată</span>
                  </div>
                  <p className="text-sm text-gray-600">Nu se mai pot face modificări • Datele sunt doar pentru consultare</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 px-6 bg-purple-50 border-2 border-purple-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🔒</span>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      LUNĂ PUBLICATĂ
                    </span>
                    <span className="text-sm font-semibold text-purple-800">Luna este publicată și afișată proprietarilor</span>
                  </div>
                  <p className="text-sm text-purple-600">Nu se pot adăuga cheltuieli noi • Poți doar înregistra încasări</p>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <select 
            value={newExpense.name}
            onChange={(e) => {
              setNewExpense({
                ...newExpense, 
                name: e.target.value,
                // Resetează toate câmpurile de sume când se schimbă cheltuiala
                amount: '',
                billAmount: '',
                unitPrice: ''
              });
              // Resetează factura selectată când se schimbă cheltuiala
              setSelectedExistingInvoice('');
              resetInvoiceData();
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
          
          {newExpense.name && getExpenseConfig(newExpense.name).distributionType === "consumption" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>{newExpense.name}</strong> - cheltuială pe consum
                </div>
                {getExpenseConfig(newExpense.name).supplierName && (
                  <div className="text-xs text-blue-600 mt-1">
                    🏢 Furnizor: <strong>{getExpenseConfig(newExpense.name).supplierName}</strong>
                  </div>
                )}
                {!getExpenseConfig(newExpense.name).supplierName && (
                  <div className="text-xs text-orange-600 mt-1">
                    ⚠️ Fără furnizor configurat
                  </div>
                )}
              </div>
              <input
                value={newExpense.unitPrice}
                onChange={(e) => setNewExpense({...newExpense, unitPrice: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder={`Preț pe ${getUnitLabel(newExpense.name)} (RON)`}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <input
                value={newExpense.billAmount}
                onChange={(e) => {
                  setNewExpense({...newExpense, billAmount: e.target.value});
                  // Actualizează și suma de distribuit dacă nu e factură parțială
                  if (!selectedExistingInvoice && !invoiceData.isPartialDistribution) {
                    setInvoiceData(prev => ({
                      ...prev,
                      currentDistribution: e.target.value
                    }));
                  }
                }}
                type="text"
                inputMode="decimal"
                placeholder="Total de distribuit luna aceasta (RON)"
                className="w-full p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
              
              
              <div className="text-xs text-gray-600 space-y-1">
                <div>💡 <strong>Preț pe unitate:</strong> pentru calculul individual pe consum</div>
                <div>💰 <strong>Total de distribuit:</strong> suma care va fi distribuită luna aceasta</div>
                {selectedExistingInvoice && (
                  <div className="text-purple-600">
                    📊 <strong>Factură selectată:</strong> distribuind suma rămasă din factura existentă
                  </div>
                )}
              </div>
            </div>
          )}
          
          {newExpense.name && getExpenseConfig(newExpense.name).distributionType === "individual" && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-800">
                  <strong>{newExpense.name}</strong> - sume individuale per apartament
                </div>
                {getExpenseConfig(newExpense.name).supplierName && (
                  <div className="text-xs text-purple-600 mt-1">
                    🏢 Furnizor: <strong>{getExpenseConfig(newExpense.name).supplierName}</strong>
                  </div>
                )}
                {!getExpenseConfig(newExpense.name).supplierName && (
                  <div className="text-xs text-orange-600 mt-1">
                    ⚠️ Fără furnizor configurat
                  </div>
                )}
              </div>
              <input
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder="Total de distribuit luna aceasta (RON)"
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              <div className="text-xs text-gray-600">
                💡 Suma totală pentru verificare. Vei introduce sumele individuale în panoul de introducere.
              </div>
            </div>
          )}
          
          {newExpense.name && getExpenseConfig(newExpense.name).distributionType !== "consumption" && getExpenseConfig(newExpense.name).distributionType !== "individual" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>{newExpense.name}</strong> se împarte: {
                    getExpenseConfig(newExpense.name).distributionType === "apartment" ? "Pe apartament" :
                    getExpenseConfig(newExpense.name).distributionType === "person" ? "Pe persoană" : "Pe consum"
                  }
                </div>
                {getExpenseConfig(newExpense.name).supplierName && (
                  <div className="text-xs text-blue-600 mt-1">
                    🏢 Furnizor: <strong>{getExpenseConfig(newExpense.name).supplierName}</strong>
                  </div>
                )}
                {!getExpenseConfig(newExpense.name).supplierName && (
                  <div className="text-xs text-orange-600 mt-1">
                    ⚠️ Fără furnizor configurat
                  </div>
                )}
              </div>
              <input
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder="Total de distribuit luna aceasta (RON)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          {/* Dropdown pentru facturi existente nedistribuite - pentru toate tipurile de cheltuieli */}
          {newExpense.name && (() => {
            const hasFunction = !!getPartiallyDistributedInvoices;
            const allPartialInvoices = hasFunction ? getPartiallyDistributedInvoices() : [];
            const partialInvoicesForType = hasFunction ? getPartiallyDistributedInvoices(newExpense.name) : [];
            
            // Dacă cheltuiala nu are furnizor configurat, arată toate facturile parțiale
            const expenseConfig = getExpenseConfig(newExpense.name);
            const hasConfiguredSupplier = expenseConfig?.supplierId && expenseConfig?.supplierName;
            
            const shouldShowAllPartials = !hasConfiguredSupplier && allPartialInvoices?.length > 0;
            const shouldShowSpecificPartials = hasConfiguredSupplier && partialInvoicesForType?.length > 0;
            
            // console.log('🔍 Debug dropdown ENHANCED:', {
            //   hasFunction,
            //   expenseType: newExpense.name,
            //   hasConfiguredSupplier,
            //   configuredSupplier: expenseConfig?.supplierName,
            //   partialInvoicesForTypeCount: partialInvoicesForType?.length || 0,
            //   allPartialInvoicesCount: allPartialInvoices?.length || 0,
            //   shouldShowAllPartials,
            //   shouldShowSpecificPartials,
            //   willShow: shouldShowAllPartials || shouldShowSpecificPartials
            // });
            
            // Auto-sincronizare dacă nu găsim facturi pentru cheltuiala cu furnizor configurat
            if (hasConfiguredSupplier && partialInvoicesForType?.length === 0 && syncSuppliersForExpenseType) {
              // Rulează sincronizarea în background, dar nu așteptăm rezultatul pentru UI
              syncSuppliersForExpenseType(newExpense.name).then((syncedCount) => {
                if (syncedCount > 0) {
                }
              }).catch(error => {
                console.error('❌ Eroare auto-sincronizare:', error);
              });
            }
            
            // console.log('🎯 FINAL DROPDOWN DECISION:', {
            //   hasFunction,
            //   hasConfiguredSupplier,
            //   partialInvoicesForTypeCount: partialInvoicesForType?.length || 0,
            //   shouldShowAllPartials,
            //   shouldShowSpecificPartials,
            //   finalDecision: shouldShowAllPartials || shouldShowSpecificPartials
            // });
            
            // TEMPORAR: Afișează dropdown pentru cheltuieli cu furnizor configurat chiar dacă nu găsește facturi încă
            const shouldShowDropdown = hasFunction && (shouldShowAllPartials || shouldShowSpecificPartials || hasConfiguredSupplier);
            
            // console.log('🔧 TEMPORARY SHOW LOGIC:', { shouldShowDropdown, reasons: {
            //   hasFunction,
            //   shouldShowAllPartials,
            //   shouldShowSpecificPartials,
            //   hasConfiguredSupplier
            // }});
            
            return shouldShowDropdown;
          })() && (
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-gray-700">
                💰 Sau selectează o factură existentă nedistribuită complet:
              </label>
              <select
                value={selectedExistingInvoice}
                onChange={(e) => handleExistingInvoiceSelect(e.target.value)}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Factură nouă --</option>
                {(() => {
                  const expenseConfig = getExpenseConfig(newExpense.name);
                  const hasConfiguredSupplier = expenseConfig?.supplierId && expenseConfig?.supplierName;
                  
                  // Dacă cheltuiala are furnizor configurat, arată doar facturile pentru acel furnizor
                  // Dacă nu, arată toate facturile parțiale disponibile
                  const invoicesToShow = hasConfiguredSupplier 
                    ? getPartiallyDistributedInvoices(newExpense.name)
                    : getPartiallyDistributedInvoices();
                    
                  return invoicesToShow.map(invoice => {
                    const remainingAmount = invoice.remainingAmount?.toFixed(2) || invoice.totalAmount?.toFixed(2);
                    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('ro-RO') : 'N/A';
                    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ro-RO') : 'N/A';
                    const supplierName = invoice.supplierName || 'Fără furnizor';
                    
                    return (
                      <option key={invoice.id} value={invoice.id}>
                        Factură {invoice.invoiceNumber} - {supplierName} - Rămas: {remainingAmount} RON - Emitere: {invoiceDate} - Scadență: {dueDate}
                      </option>
                    );
                  });
                })()}
              </select>
            </div>
          )}

          {/* Secțiunea Factură (opțională) */}
          {newExpense.name && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Detalii Factură</span>
                  <span className="text-xs text-gray-500">(opțional)</span>
                </div>
                
                {/* Verifică dacă cheltuiala are furnizor configurat */}
                {!getExpenseConfig(newExpense.name).supplierId ? (
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
                    onClick={() => {
                      setShowInvoiceDetails(!showInvoiceDetails);
                    }}
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

              {/* Mesaj informativ când nu există furnizor configurat */}
              {newExpense.name && !getExpenseConfig(newExpense.name).supplierId && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="text-amber-600 text-lg">⚠️</span>
                    </div>
                    <div className="text-sm">
                      <div className="text-amber-800 font-medium mb-1">
                        Furnizor neconfigurat pentru cheltuiala "{newExpense.name}"
                      </div>
                      <div className="text-amber-700">
                        Pentru a putea adăuga facturi, această cheltuială trebuie să aibă un furnizor asociat.
                        <br />
                        Mergi la <strong>Configurare Cheltuieli</strong> pentru a asocia un furnizor.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExpenseForConfig(newExpense.name);
                          setShowExpenseConfig(true);
                        }}
                        className="mt-2 text-sm text-amber-800 font-medium underline hover:text-amber-900"
                      >
                        📋 Configurează acum
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showInvoiceDetails && getExpenseConfig(newExpense.name).supplierId && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
                  {/* Furnizor info */}
                  {getExpenseConfig(newExpense.name).supplierName && (
                    <div className="text-sm text-blue-700 font-medium">
                      🏢 Furnizor: {getExpenseConfig(newExpense.name).supplierName}
                    </div>
                  )}
                  
                  {/* Afișează informații despre factură selectată dacă există */}
                  {selectedExistingInvoice && (
                    <div className="p-3 bg-purple-100 rounded-lg border border-purple-300">
                      <div className="text-sm font-medium text-purple-800">
                        📊 Continuare distribuție factură existentă
                      </div>
                      <div className="text-xs text-purple-600 mt-1">
                        Factura #{invoiceData.invoiceNumber} - distribuind {invoiceData.currentDistribution} RON 
                        din {invoiceData.totalInvoiceAmount} RON total
                      </div>
                    </div>
                  )}
                  
                  {/* Formular pentru factură nouă - afișat doar dacă nu e selectată o factură existentă */}
                  {!selectedExistingInvoice && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Număr factură
                          </label>
                          <input
                            type="text"
                            value={invoiceData.invoiceNumber}
                            onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
                            placeholder="ex: FAC-2024-001234"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total factură complet (RON)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={invoiceData.totalInvoiceAmount}
                            onChange={(e) => setInvoiceData({...invoiceData, totalInvoiceAmount: e.target.value})}
                            placeholder="Suma totală a facturii"
                            className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data facturii
                          </label>
                          <input
                            type="date"
                            value={invoiceData.invoiceDate}
                            onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            PDF factură
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id="pdf-upload"
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
                                  title="Elimină fișier"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => document.getElementById('pdf-upload').click()}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600 flex items-center justify-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Selectează PDF
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Indicator pentru distribuție parțială */}
                      {(() => {
                        const totalInvoice = invoiceData.totalInvoiceAmount;
                        const currentAmount = newExpense.billAmount || newExpense.amount;
                        // console.log('🔍 DEBUG Condiție distribuție:', {
                        //   totalInvoice,
                        //   billAmount: newExpense.billAmount,
                        //   amount: newExpense.amount,
                        //   currentAmount,
                        //   hasTotal: !!totalInvoice,
                        //   hasCurrent: !!currentAmount,
                        //   isPartial: totalInvoice && currentAmount && parseFloat(totalInvoice) > parseFloat(currentAmount)
                        // });
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
                              const currentAmount = newExpense.billAmount || newExpense.amount;
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
                          placeholder="Observații sau detalii suplimentare despre factură..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          <button 
            onClick={async () => await handleAddExpense()}
            className="w-full mt-4 bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 flex items-center justify-center disabled:bg-gray-400"
            disabled={!newExpense.name || 
              (getExpenseConfig(newExpense.name).distributionType === "consumption" ? (!newExpense.unitPrice || !newExpense.billAmount) : 
               !newExpense.amount)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Cheltuială
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpenseForm;