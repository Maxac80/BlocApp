import React, { useState } from 'react';
import { Calculator, Trash2, Maximize2, Eye } from 'lucide-react';

const ExpenseList = ({
  associationExpenses,
  currentMonth,
  getExpenseConfig,
  getAssociationApartments,
  handleDeleteMonthlyExpense,
  isMonthReadOnly,
  monthType
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const totalAmount = associationExpenses.reduce((sum, expense) => {
    return sum + (expense.isUnitBased ? expense.billAmount : expense.amount);
  }, 0);

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

  return (
    <>
      <div className={`p-6 rounded-xl shadow-lg ${
        monthType === 'historic' 
          ? 'bg-gray-50 border-2 border-gray-300' 
          : isMonthReadOnly 
          ? 'bg-purple-50 border-2 border-purple-200' 
          : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${
            monthType === 'historic' 
              ? 'text-gray-800' 
              : isMonthReadOnly 
              ? 'text-purple-800' 
              : ''
          }`}>
            📋 Cheltuieli {currentMonth} {monthType === 'historic' ? (
              <span className="text-sm bg-gray-200 px-2 py-1 rounded-full ml-2">(ARHIVATĂ)</span>
            ) : isMonthReadOnly ? (
              <span className="text-sm bg-purple-100 px-2 py-1 rounded-full ml-2">(PUBLICATĂ)</span>
            ) : null}
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <div className="text-gray-600">
                {associationExpenses.length} cheltuieli
              </div>
              <div className="font-semibold text-indigo-600">
                Total: {totalAmount.toFixed(2)} RON
              </div>
            </div>
            {associationExpenses.length > 0 && (
              <button
                onClick={() => setShowDetailModal(true)}
                className="bg-indigo-500 text-white px-3 py-2 rounded-lg hover:bg-indigo-600 flex items-center gap-2 text-sm"
                title="Vezi detalii complete"
              >
                <Eye className="w-4 h-4" />
                Detalii
              </button>
            )}
          </div>
        </div>
      {associationExpenses.length === 0 ? (
        <div className="text-center py-8">
          <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nu există cheltuieli adăugate</p>
          <p className="text-gray-500 text-sm">Adaugă prima cheltuială pentru a calcula întreținerea</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {/* Afișez toate cheltuielile cu scroll */}
          {sortExpenses([...associationExpenses]).map(expense => {
            const config = getExpenseConfig(expense.name);
            
            return (
              <div key={expense.id} className={`p-3 rounded-lg ${
                monthType === 'historic' ? 'bg-gray-200' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{expense.name}</span>
                  <span className={`font-bold ${
                    monthType === 'historic' ? 'text-gray-700' : 'text-indigo-600'
                  }`}>
                    {expense.isUnitBased ? 
                      `${expense.billAmount} RON` :
                      `${expense.amount} RON`
                    }
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {(() => {
                    const totalApartments = getAssociationApartments().length;
                    const totalPersons = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
                    
                    if (config.distributionType === "apartment" && totalApartments > 0) {
                      return `Pe apartament (egal) • ${(expense.amount / totalApartments).toFixed(2)} RON/ap`;
                    } else if (config.distributionType === "individual") {
                      return "Pe apartament (individual) • Sume individuale";
                    } else if (config.distributionType === "person" && totalPersons > 0) {
                      return `Pe persoană • ${(expense.amount / totalPersons).toFixed(2)} RON/pers`;
                    } else if (config.distributionType === "consumption") {
                      return `Pe consum • ${expense.unitPrice} RON/${expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}`;
                    } else {
                      return "Pe consum";
                    }
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Modal detaliat pentru cheltuieli */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 bg-indigo-50 border-b flex items-center justify-between">
              <h3 className="text-xl font-semibold">📋 Cheltuieli Complete - {currentMonth}</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="mb-4 text-right">
                <div className="text-gray-600">{associationExpenses.length} cheltuieli total</div>
                <div className="font-semibold text-indigo-600 text-lg">
                  Total: {totalAmount.toFixed(2)} RON
                </div>
              </div>
              
              <div className="space-y-4">
                {sortExpenses([...associationExpenses]).map(expense => {
                  const config = getExpenseConfig(expense.name);
                  const totalApartments = getAssociationApartments().length;
                  const totalPersons = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
                  
                  let perUnitText = "";
                  if (config.distributionType === "apartment" && totalApartments > 0) {
                    perUnitText = ` • ${(expense.amount / totalApartments).toFixed(2)} RON/apt`;
                  } else if (config.distributionType === "person" && totalPersons > 0) {
                    perUnitText = ` • ${(expense.amount / totalPersons).toFixed(2)} RON/pers`;
                  } else if (config.distributionType === "consumption") {
                    perUnitText = ` • ${expense.unitPrice} RON/${expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}`;
                  } else if (config.distributionType === "individual") {
                    perUnitText = " • Sume individuale";
                  }
                  
                  return (
                    <div key={expense.id} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-lg">{expense.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-600 font-bold text-lg">
                            {expense.isUnitBased ? 
                              `${expense.billAmount} RON` :
                              `${expense.amount} RON`
                            }
                          </span>
                          {!isMonthReadOnly && handleDeleteMonthlyExpense && (
                            <button
                              onClick={() => {
                                handleDeleteMonthlyExpense(expense.id);
                                setShowDetailModal(false);
                              }}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Șterge cheltuiala"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                         config.distributionType === "individual" ? "Pe apartament (individual)" :
                         config.distributionType === "person" ? "Pe persoană" : "Pe consum"}
                        <span className="text-green-600 font-medium">{perUnitText}</span>
                      </div>
                      
                      {config.distributionType === "consumption" && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-gray-500">Total consum</div>
                              <div className="font-medium">{Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Total calculat</div>
                              <div className="font-medium">{(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice).toFixed(2)} RON</div>
                            </div>
                            <div>
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
                        </div>
                      )}
                      
                      {config.distributionType === "individual" && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-gray-500">Total introdus</div>
                              <div className="font-medium">{Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} RON</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Total planificat</div>
                              <div className="font-medium">{expense.amount} RON</div>
                            </div>
                            <div>
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

export default ExpenseList;