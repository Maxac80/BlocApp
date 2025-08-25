import React from 'react';
import { Plus, Settings } from 'lucide-react';

const ExpenseForm = ({
  newExpense,
  setNewExpense,
  availableExpenseTypes,
  associationExpenses,
  getExpenseConfig,
  handleAddExpense,
  isMonthReadOnly,
  currentMonth,
  setShowExpenseConfig
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">💰 Adaugă Cheltuială Lunară</h3>
        {!isMonthReadOnly && (
          <button
            onClick={() => setShowExpenseConfig(true)}
            className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center text-sm"
            title="Configurează cheltuieli"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {availableExpenseTypes.length === 0 ? (
        isMonthReadOnly ? (
          <div className="text-center py-8 bg-purple-50 border-2 border-purple-200 rounded-xl">
            <div className="mb-4">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">🔒</span>
              </div>
              <div className="mb-2">
                <span className="bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                  📋 LUNĂ PUBLICATĂ
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-purple-800 mb-2">Luna este publicată și afișată proprietarilor</h3>
            <p className="text-purple-700 font-medium">Nu se pot adăuga cheltuieli noi pentru lunile publicate</p>
            <p className="text-purple-600 text-sm mt-2">Poți doar înregistra încasări pentru această lună</p>
          </div>
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
          <div className="text-center py-8 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">✅</span>
              </div>
              <div className="mb-2">
                <span className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                  ✅ TOATE CHELTUIELILE ADĂUGATE
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-green-800 mb-2">Toate cheltuielile disponibile au fost adăugate</h3>
            <p className="text-green-700 font-medium">Ai adăugat toate cheltuielile configurate pentru această lună</p>
            <p className="text-green-600 text-sm mt-2">Poți modifica cheltuielile existente sau configura cheltuieli noi</p>
          </div>
        )
      ) : isMonthReadOnly ? (
        <div className="text-center py-8 bg-purple-50 border-2 border-purple-200 rounded-xl">
          <div className="mb-4">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-4xl">🔒</span>
            </div>
            <div className="mb-2">
              <span className="bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                📋 LUNĂ PUBLICATĂ
              </span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-purple-800 mb-2">Luna este publicată și afișată proprietarilor</h3>
          <p className="text-purple-700 font-medium">Nu se pot adăuga cheltuieli noi pentru lunile publicate</p>
          <p className="text-purple-600 text-sm mt-2">Poți doar înregistra încasări pentru această lună</p>
        </div>
      ) : (
        <div className="space-y-4">
          <select 
            value={newExpense.name}
            onChange={(e) => setNewExpense({...newExpense, name: e.target.value})}
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
              </div>
              <input
                value={newExpense.unitPrice}
                onChange={(e) => setNewExpense({...newExpense, unitPrice: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder={`Preț pe ${newExpense.name.toLowerCase().includes("apă") || newExpense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"} (RON)`}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <input
                value={newExpense.billAmount}
                onChange={(e) => setNewExpense({...newExpense, billAmount: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder="Totalul facturii (RON)"
                className="w-full p-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
              <div className="text-xs text-gray-600 space-y-1">
                <div>💡 <strong>Preț pe unitate:</strong> pentru calculul individual pe consum</div>
                <div>🧾 <strong>Total factură:</strong> suma reală de plată</div>
              </div>
            </div>
          )}
          
          {newExpense.name && getExpenseConfig(newExpense.name).distributionType === "individual" && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-800">
                  <strong>{newExpense.name}</strong> - sume individuale per apartament
                </div>
              </div>
              <input
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder="Suma totală (RON)"
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
                    getExpenseConfig(newExpense.name).distributionType === "apartment" ? "Pe apartament (egal)" :
                    getExpenseConfig(newExpense.name).distributionType === "person" ? "Pe persoană" : "Pe consum"
                  }
                </div>
              </div>
              <input
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder="Suma totală (RON)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          )}
          
          <button 
            onClick={handleAddExpense}
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