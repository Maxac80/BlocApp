import React, { useState } from 'react';
import { Edit3, Eye, ChevronDown, ChevronUp } from 'lucide-react';

const ConsumptionInput = ({
  associationExpenses,
  getExpenseConfig,
  getAssociationApartments,
  updateExpenseConsumption,
  updateExpenseIndividualAmount,
  isMonthReadOnly,
  currentMonth
}) => {
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [expandedExpenses, setExpandedExpenses] = useState({});
  
  // Funcție pentru sortarea cheltuielilor ca în dropdown
  const sortExpenses = (expenses) => {
    return expenses.sort((a, b) => {
      // Sortare ca în dropdown: mai întâi cele standard (în ordinea din defaultExpenseTypes), apoi cele personalizate
      const defaultTypes = [
        "Apă caldă", "Apă rece", "Canal", "Întreținere lift", "Energie electrică", 
        "Service interfon", "Cheltuieli cu asociația", "Salarii NETE", "Impozit ANAF", 
        "Spații în folosință", "Căldură"
      ];
      
      const aIndex = defaultTypes.indexOf(a.name);
      const bIndex = defaultTypes.indexOf(b.name);
      
      // Dacă ambele sunt standard, sortez după index
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Cheltuielile standard vin înaintea celor personalizate
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;
      
      // Ambele sunt personalizate, sortez alfabetic
      return a.name.localeCompare(b.name);
    });
  };
  
  const consumptionExpenses = sortExpenses(associationExpenses.filter(expense => 
    getExpenseConfig(expense.name).distributionType === "consumption" || 
    getExpenseConfig(expense.name).distributionType === "individual"
  ));
  
  // Funcție pentru a determina dacă un apartament are câmpuri goale
  const getApartmentBlankFields = (apartment, expense) => {
    const expenseSettings = getExpenseConfig(expense.name);
    if (expenseSettings.distributionType === "individual") {
      const value = expense.individualAmounts?.[apartment.id];
      return !value || parseFloat(value) === 0;
    } else {
      const value = expense.consumption?.[apartment.id];
      return !value || parseFloat(value) === 0;
    }
  };
  
  // Funcție pentru a comuta expansiunea unei cheltuieli
  const toggleExpenseExpansion = (expenseId) => {
    console.log('Toggling expense:', expenseId, 'Current state:', expandedExpenses[expenseId]);
    setExpandedExpenses(prev => {
      const newState = {
        ...prev,
        [expenseId]: !prev[expenseId]
      };
      console.log('New state:', newState);
      return newState;
    });
  };
  
  // Inițializez toate cheltuielile ca fiind colapsate
  React.useEffect(() => {
    console.log('Initializing expanded state for expenses:', consumptionExpenses);
    const initialExpanded = {};
    consumptionExpenses.forEach(expense => {
      initialExpanded[expense.id] = false;
    });
    console.log('Setting initial expanded state:', initialExpanded);
    setExpandedExpenses(initialExpanded);
  }, [consumptionExpenses.length]); // Schimb dependency pentru a evita loop-uri

  // Calculez câmpurile completate vs total
  const apartments = getAssociationApartments();
  const totalFields = consumptionExpenses.length * apartments.length;
  
  const completedFields = consumptionExpenses.reduce((total, expense) => {
    const expenseSettings = getExpenseConfig(expense.name);
    return total + apartments.filter(apartment => {
      if (expenseSettings.distributionType === "individual") {
        const value = expense.individualAmounts?.[apartment.id];
        return value && parseFloat(value) > 0;
      } else {
        const value = expense.consumption?.[apartment.id];
        return value && parseFloat(value) > 0;
      }
    }).length;
  }, 0);
  
  const emptyFields = totalFields - completedFields;

  return (
    <>
      <div className={`p-6 rounded-xl shadow-lg ${isMonthReadOnly ? 'bg-purple-50 border-2 border-purple-200' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isMonthReadOnly ? 'text-purple-800' : ''}`}>
            {isMonthReadOnly ? 
              "📊 Consumuri & Sume (PUBLICATĂ)" :
              "📊 Introducere Consumuri & Sume"
            }
          </h3>
          {consumptionExpenses.length > 0 && (
            <button
              onClick={() => setShowConsumptionModal(true)}
              className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2 text-sm"
              title="Deschide editorul complet"
            >
              {isMonthReadOnly ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isMonthReadOnly ? "Vezi" : "Editează"}
            </button>
          )}
        </div>
      {consumptionExpenses.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">📏</div>
          <p className="text-gray-600 text-sm">Nu există cheltuieli pe consum sau individuale</p>
          <p className="text-gray-500 text-xs">Adaugă cheltuieli precum Apă, Căldură, etc.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview - informații generale */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{consumptionExpenses.length}</div>
              <div className="text-sm text-blue-800">Cheltuieli cu consumuri</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{emptyFields}</div>
              <div className="text-sm text-orange-800">câmpuri de completat din {totalFields}</div>
            </div>
          </div>
          
          {/* Preview listă cheltuieli cu scroll */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {consumptionExpenses.map(expense => {
              const expenseSettings = getExpenseConfig(expense.name);
              
              // Calculez câmpurile completate pentru această cheltuială
              const completedForExpense = apartments.filter(apartment => {
                if (expenseSettings.distributionType === "individual") {
                  const value = expense.individualAmounts?.[apartment.id];
                  return value && parseFloat(value) > 0;
                } else {
                  const value = expense.consumption?.[apartment.id];
                  return value && parseFloat(value) > 0;
                }
              }).length;
              
              const isFullyCompleted = completedForExpense === apartments.length;
              const isPartiallyCompleted = completedForExpense > 0;
              
              return (
                <div key={expense.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-medium">{expense.name}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({expenseSettings.distributionType === "individual" ? "Sume individuale" : "Pe consum"})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFullyCompleted ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Completat</span>
                    ) : isPartiallyCompleted ? (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        {completedForExpense}/{apartments.length}
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Necompletat</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* Modal pentru editarea consumurilor */}
      {showConsumptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 bg-green-50 border-b flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                📊 {isMonthReadOnly ? 'Vizualizare' : 'Editare'} Consumuri & Sume - {currentMonth}
              </h3>
              <button
                onClick={() => setShowConsumptionModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {consumptionExpenses.map(expense => {
                  const expenseSettings = getExpenseConfig(expense.name);
                  const isExpanded = expandedExpenses[expense.id];
                  const apartmentsWithBlanks = getAssociationApartments().filter(apt => 
                    getApartmentBlankFields(apt, expense)
                  );
                  const totalApartments = getAssociationApartments().length;
                  const isFullyCompleted = apartmentsWithBlanks.length === 0 && totalApartments > 0;
                  
                  return (
                    <div key={expense.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                      {/* Header colapsabil */}
                      <div 
                        className="p-4 bg-indigo-50 border-b cursor-pointer hover:bg-indigo-100 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleExpenseExpansion(expense.id);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-indigo-600 flex items-center">
                              {isMonthReadOnly && (
                                <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded mr-2">🔒 PUBLICATĂ</span>
                              )}
                              {expense.name}
                              {isFullyCompleted ? (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded ml-2">
                                  Completat
                                </span>
                              ) : apartmentsWithBlanks.length > 0 && (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded ml-2">
                                  {apartmentsWithBlanks.length} câmpuri goale
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {expenseSettings.distributionType === "individual" ? 
                                `Sume individuale - Total facturat: ${expense.amount} RON` :
                                expense.isUnitBased ? 
                                  `${expense.unitPrice} RON/${expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"} | Factură: ${expense.billAmount} RON` :
                                  `${expense.amount} RON total`
                              }
                            </p>
                            
                            {/* Totals pentru consum în header când e colapsat */}
                            {!isExpanded && expenseSettings.distributionType === "consumption" && (
                              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                                <div className="p-2 bg-blue-50 rounded text-center">
                                  <div className="text-gray-500">Total consum</div>
                                  <div className="font-medium text-blue-600">
                                    {Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}
                                  </div>
                                </div>
                                <div className="p-2 bg-green-50 rounded text-center">
                                  <div className="text-gray-500">Total calculat</div>
                                  <div className="font-medium text-green-600">
                                    {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice).toFixed(2)} RON
                                  </div>
                                </div>
                                <div className="p-2 bg-orange-50 rounded text-center">
                                  <div className="text-gray-500">Diferența</div>
                                  <div className={`font-medium ${(() => {
                                    const totalCalculat = Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice;
                                    const diferenta = totalCalculat - expense.billAmount;
                                    const procentDiferenta = expense.billAmount > 0 ? Math.abs(diferenta / expense.billAmount * 100) : 0;
                                    
                                    if (procentDiferenta < 5) return "text-green-600";
                                    else if (procentDiferenta <= 10) return "text-yellow-600";
                                    else return "text-red-600";
                                  })()}`}>
                                    {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount).toFixed(2)} RON
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Totals pentru individual în header când e colapsat */}
                            {!isExpanded && expenseSettings.distributionType === "individual" && (
                              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                                <div className="p-2 bg-blue-50 rounded text-center">
                                  <div className="text-gray-500">Total introdus</div>
                                  <div className="font-medium text-blue-600">
                                    {Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} RON
                                  </div>
                                </div>
                                <div className="p-2 bg-green-50 rounded text-center">
                                  <div className="text-gray-500">Total facturat</div>
                                  <div className="font-medium text-green-600">{expense.amount} RON</div>
                                </div>
                                <div className="p-2 bg-orange-50 rounded text-center">
                                  <div className="text-gray-500">Diferența</div>
                                  <div className={`font-medium ${(() => {
                                    const totalIntrodus = Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                                    const diferenta = totalIntrodus - expense.amount;
                                    const procentDiferenta = expense.amount > 0 ? Math.abs(diferenta / expense.amount * 100) : 0;
                                    
                                    if (procentDiferenta < 5) return "text-green-600";
                                    else if (procentDiferenta <= 10) return "text-yellow-600";
                                    else return "text-red-600";
                                  })()}`}>
                                    {(Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - expense.amount).toFixed(2)} RON
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {isExpanded ? 'Închide' : 'Deschide'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Conținutul colapsabil */}
                      {isExpanded && (
                        <div className="p-6">
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {getAssociationApartments().map(apartment => {
                              const hasBlankField = getApartmentBlankFields(apartment, expense);
                              const containerClass = hasBlankField 
                                ? "flex items-center gap-2 p-2 border-2 border-red-300 bg-red-50 rounded" 
                                : "flex items-center gap-2 p-2 border rounded";
                              
                              if (expenseSettings.distributionType === "individual") {
                                return (
                                  <div key={apartment.id} className={containerClass}>
                                    <span className={`text-sm font-medium w-16 ${hasBlankField ? 'text-red-700' : ''}`}>
                                      Apt {apartment.number}
                                      {hasBlankField && <span className="text-red-500 ml-1">⚠️</span>}
                                    </span>
                                    {isMonthReadOnly ? (
                                      <div className="flex-1 p-2 bg-gray-100 border rounded text-sm text-gray-600">
                                        {expense.individualAmounts?.[apartment.id] || "0"} RON
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="RON"
                                        value={expense.individualAmounts?.[apartment.id] || ""}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                                            const normalizedValue = value.replace(',', '.');
                                            updateExpenseIndividualAmount(expense.id, apartment.id, normalizedValue);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const value = e.target.value.replace(',', '.');
                                          const numericValue = parseFloat(value) || 0;
                                          updateExpenseIndividualAmount(expense.id, apartment.id, numericValue);
                                        }}
                                        className={`flex-1 p-2 border rounded text-sm ${hasBlankField ? 'border-red-300 bg-red-50' : ''}`}
                                      />
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={apartment.id} className={containerClass}>
                                    <span className={`text-sm font-medium w-16 ${hasBlankField ? 'text-red-700' : ''}`}>
                                      Apt {apartment.number}
                                      {hasBlankField && <span className="text-red-500 ml-1">⚠️</span>}
                                    </span>
                                    {isMonthReadOnly ? (
                                      <div className="flex-1 p-2 bg-gray-100 border rounded text-sm text-gray-600">
                                        {expense.consumption[apartment.id] || "0"} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}
                                        value={expense.consumption[apartment.id] || ""}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                                            const normalizedValue = value.replace(',', '.');
                                            updateExpenseConsumption(expense.id, apartment.id, normalizedValue);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const value = e.target.value.replace(',', '.');
                                          const numericValue = parseFloat(value) || 0;
                                          updateExpenseConsumption(expense.id, apartment.id, numericValue);
                                        }}
                                        className={`flex-1 p-2 border rounded text-sm ${hasBlankField ? 'border-red-300 bg-red-50' : ''}`}
                                      />
                                    )}
                                    {(parseFloat(expense.consumption[apartment.id]) || 0) > 0 && (
                                      <span className="text-sm text-green-600 w-20 text-right">
                                        {((parseFloat(expense.consumption[apartment.id]) || 0) * expense.unitPrice).toFixed(2)} RON
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                            })}
                          </div>
                          
                          {/* Totaluri pentru fiecare cheltuială */}
                          {expenseSettings.distributionType === "consumption" && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-blue-50 rounded">
                              <div className="text-sm text-gray-500">Total consum</div>
                              <div className="font-bold text-blue-600">
                                {Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}
                              </div>
                            </div>
                            <div className="p-3 bg-green-50 rounded">
                              <div className="text-sm text-gray-500">Total calculat</div>
                              <div className="font-bold text-green-600">
                                {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice).toFixed(2)} RON
                              </div>
                            </div>
                            <div className="p-3 bg-orange-50 rounded">
                              <div className="text-sm text-gray-500">Diferența vs factură</div>
                              <div className={`font-bold ${(() => {
                                const totalCalculat = Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice;
                                const diferenta = totalCalculat - expense.billAmount;
                                const procentDiferenta = expense.billAmount > 0 ? Math.abs(diferenta / expense.billAmount * 100) : 0;
                                
                                if (procentDiferenta < 5) return "text-green-600";
                                else if (procentDiferenta <= 10) return "text-yellow-600";
                                else return "text-red-600";
                              })()}`}>
                                {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount).toFixed(2)} RON
                              </div>
                            </div>
                          </div>
                            </div>
                          )}
                          
                          {expenseSettings.distributionType === "individual" && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-blue-50 rounded">
                              <div className="text-sm text-gray-500">Total introdus</div>
                              <div className="font-bold text-blue-600">
                                {Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} RON
                              </div>
                            </div>
                            <div className="p-3 bg-green-50 rounded">
                              <div className="text-sm text-gray-500">Total facturat</div>
                              <div className="font-bold text-green-600">{expense.amount} RON</div>
                            </div>
                            <div className="p-3 bg-orange-50 rounded">
                              <div className="text-sm text-gray-500">Diferența</div>
                              <div className={`font-bold ${(() => {
                                const totalIntrodus = Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                                const diferenta = totalIntrodus - expense.amount;
                                const procentDiferenta = expense.amount > 0 ? Math.abs(diferenta / expense.amount * 100) : 0;
                                
                                if (procentDiferenta < 5) return "text-green-600";
                                else if (procentDiferenta <= 10) return "text-yellow-600";
                                else return "text-red-600";
                              })()}`}>
                                {(Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - expense.amount).toFixed(2)} RON
                              </div>
                            </div>
                          </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConsumptionInput;