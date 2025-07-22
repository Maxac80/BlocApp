import React from 'react';

const ConsumptionInput = ({
  associationExpenses,
  getExpenseConfig,
  getAssociationApartments,
  updateExpenseConsumption,
  updateExpenseIndividualAmount,
  isMonthReadOnly,
  currentMonth
}) => {
  const consumptionExpenses = associationExpenses.filter(expense => 
    getExpenseConfig(expense.name).distributionType === "consumption" || 
    getExpenseConfig(expense.name).distributionType === "individual"
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold mb-4">
        {isMonthReadOnly(currentMonth) ? 
          "📊 Consumuri & Sume (PUBLICATĂ)" :
          "📊 Introducere Consumuri & Sume"
        }
      </h3>
      {consumptionExpenses.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">📏</div>
          <p className="text-gray-600 text-sm">Nu există cheltuieli pe consum sau individuale</p>
          <p className="text-gray-500 text-xs">Adaugă cheltuieli precum Apă, Căldură, etc.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {consumptionExpenses.map(expense => {
            const expenseSettings = getExpenseConfig(expense.name);
            return (
              <div key={expense.id} className="border rounded-lg p-3">
                <div className="font-medium text-sm mb-3 text-indigo-600 flex items-center">
                  {isMonthReadOnly(currentMonth) && (
                    <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded mr-2">🔒 PUBLICATĂ</span>
                  )}
                  {expense.name} - {expenseSettings.distributionType === "individual" ? 
                    `Sume individuale - Total: ${expense.amount} RON` :
                    expense.isUnitBased ? 
                      `${expense.unitPrice} RON/${expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"} | Factură: ${expense.billAmount} RON` :
                      `${expense.amount} RON total`
                  }
                </div>
                <div className="space-y-2">
                  {getAssociationApartments().map(apartment => {
                    if (expenseSettings.distributionType === "individual") {
                      return (
                        <div key={apartment.id} className="flex items-center gap-2">
                          <span className="text-xs w-12">Apt {apartment.number}</span>
                          {isMonthReadOnly(currentMonth) ? (
                            <div className="flex-1 p-1 bg-gray-100 border rounded text-xs text-gray-600">
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
                              className="flex-1 p-1 border rounded text-xs"
                            />
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div key={apartment.id} className="flex items-center gap-2">
                          <span className="text-xs w-12">Apt {apartment.number}</span>
                          {isMonthReadOnly(currentMonth) ? (
                            <div className="flex-1 p-1 bg-gray-100 border rounded text-xs text-gray-600">
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
                              className="flex-1 p-1 border rounded text-xs"
                            />
                          )}
                          {(parseFloat(expense.consumption[apartment.id]) || 0) > 0 && (
                            <span className="text-xs text-green-600 w-16">
                              {((parseFloat(expense.consumption[apartment.id]) || 0) * expense.unitPrice).toFixed(2)} RON
                            </span>
                          )}
                        </div>
                      );
                    }
                  })}
                </div>
                
                {/* Total pentru consumuri */}
                {expenseSettings.distributionType === "consumption" && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs">
                    <div className="text-gray-700">Total consum: {Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}</div>
                    <div className="text-gray-700">Total calculat: {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice).toFixed(2)} RON</div>
                    <div className={`font-medium ${(() => {
                      const totalCalculat = Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice;
                      const diferenta = totalCalculat - expense.billAmount;
                      const procentDiferenta = expense.billAmount > 0 ? Math.abs(diferenta / expense.billAmount * 100) : 0;
                      
                      if (procentDiferenta < 5) return "text-green-600";
                      else if (procentDiferenta <= 10) return "text-yellow-600";
                      else return "text-red-600";
                    })()}`}>
                      Diferența: {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount).toFixed(2)} RON ({expense.billAmount > 0 ? Math.abs((Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount) / expense.billAmount * 100).toFixed(1) : "0.0"}%)
                    </div>
                  </div>
                )}
                
                {/* Total pentru sume individuale */}
                {expenseSettings.distributionType === "individual" && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs">
                    <div className="text-gray-700">Total introdus: {Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} RON</div>
                    <div className={`font-medium ${(() => {
                      const totalIntrodus = Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                      const diferenta = totalIntrodus - expense.amount;
                      const procentDiferenta = expense.amount > 0 ? Math.abs(diferenta / expense.amount * 100) : 0;
                      
                      if (procentDiferenta < 5) return "text-green-600";
                      else if (procentDiferenta <= 10) return "text-yellow-600";
                      else return "text-red-600";
                    })()}`}>
                      Diferența: {(Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - expense.amount).toFixed(2)} RON ({expense.amount > 0 ? Math.abs((Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - expense.amount) / expense.amount * 100).toFixed(1) : "0.0"}%)
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConsumptionInput;