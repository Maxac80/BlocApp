import React from 'react';
import { Calculator } from 'lucide-react';

const ExpenseList = ({
  associationExpenses,
  currentMonth,
  getExpenseConfig,
  getAssociationApartments
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">📋 Cheltuieli {currentMonth}</h3>
        <div className="text-right text-sm">
          <div className="text-gray-600">
            {associationExpenses.length} cheltuieli
          </div>
          <div className="font-semibold text-indigo-600">
            Total: {associationExpenses.reduce((sum, expense) => {
              return sum + (expense.isUnitBased ? expense.billAmount : expense.amount);
            }, 0).toFixed(2)} RON
          </div>
        </div>
      </div>
      {associationExpenses.length === 0 ? (
        <div className="text-center py-8">
          <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nu există cheltuieli adăugate</p>
          <p className="text-gray-500 text-sm">Adaugă prima cheltuială pentru a calcula întreținerea</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {associationExpenses.map(expense => {
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
              <div key={expense.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{expense.name}</span>
                  <span className="text-indigo-600 font-bold">
                    {expense.isUnitBased ? 
                      `${expense.billAmount} RON` :
                      `${expense.amount} RON`
                    }
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                   config.distributionType === "individual" ? "Pe apartament (individual)" :
                   config.distributionType === "person" ? "Pe persoană" : "Pe consum"}
                  <span className="text-green-600 font-medium">{perUnitText}</span>
                </div>
                
                {config.distributionType === "consumption" && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
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
                
                {config.distributionType === "individual" && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
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

export default ExpenseList;