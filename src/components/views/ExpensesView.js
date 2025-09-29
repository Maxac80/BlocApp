import React from 'react';
import { Plus } from 'lucide-react';
import { defaultExpenseTypes } from '../../data/expenseTypes';
import DashboardHeader from '../dashboard/DashboardHeader';

const ExpensesView = ({
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
const monthType = getMonthType ? getMonthType(currentMonth) : null;

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

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💰 Configurare cheltuieli</h1>
      </div>

        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 bg-purple-50 border-b border-purple-100">
            <h3 className="text-xl font-semibold text-purple-800">💰 Cheltuieli ({getAssociationExpenseTypes().length})</h3>
            <p className="text-purple-600 text-sm mt-1">Configurează tipurile de cheltuieli și modul de distribuție</p>
          </div>
          <div className="p-6">
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <input
                  value={newCustomExpense.name}
                  onChange={(e) => setNewCustomExpense({...newCustomExpense, name: e.target.value})}
                  placeholder="ex: Deratizare"
                  className="flex-1 p-3 border rounded-lg"
                />
                <button 
                  onClick={handleAddCustomExpense}
                  className="bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600"
                  disabled={!newCustomExpense.name}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-3">Configurează cheltuială:</label>
                <select 
                  value={selectedExpenseForConfig || ""}
                  onChange={(e) => setSelectedExpenseForConfig(e.target.value)}
                  className="w-full p-3 border rounded-lg mb-3"
                >
                  <option value="">Selectează cheltuiala</option>
                  {getAssociationExpenseTypes().map(expenseType => (
                    <option key={expenseType.name} value={expenseType.name}>
                      {expenseType.name}
                    </option>
                  ))}
                </select>
                
                {selectedExpenseForConfig && (
                  <div className="space-y-3">
                    <select
                      value={getExpenseConfig(selectedExpenseForConfig).distributionType}
                      onChange={(e) => updateExpenseConfig(selectedExpenseForConfig, { distributionType: e.target.value })}
                      className="w-full p-3 border rounded-lg"
                    >
                      <option value="apartment">Pe apartament (egal)</option>
                      <option value="individual">Pe apartament (individual)</option>
                      <option value="person">Pe persoană</option>
                      <option value="consumption">Pe consum (mc/Gcal/kWh)</option>
                    </select>
                    
                    {getAssociationApartments().length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-4 rounded">
                        <div className="text-sm font-medium text-gray-600 mb-2">Participarea apartamentelor:</div>
                        {getAssociationApartments().map(apartment => {
                          const participation = getApartmentParticipation(apartment.id, selectedExpenseForConfig);
                          return (
                            <div key={apartment.id} className="flex items-center gap-3">
                              <span className="w-20 text-sm">Apt {apartment.number}</span>
                              <select
                                value={participation.type}
                                onChange={(e) => {
                                  const type = e.target.value;
                                  if (type === "integral" || type === "excluded") {
                                    setApartmentParticipation(apartment.id, selectedExpenseForConfig, type);
                                  } else {
                                    setApartmentParticipation(apartment.id, selectedExpenseForConfig, type, participation.value || (type === "percentage" ? 50 : 0));
                                  }
                                }}
                                className="p-2 border rounded text-sm"
                              >
                                <option value="integral">Integral</option>
                                <option value="percentage">Procent</option>
                                <option value="fixed">Sumă fixă</option>
                                <option value="excluded">Exclus</option>
                              </select>
                              {(participation.type === "percentage" || participation.type === "fixed") && (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={participation.value || ""}
                                  onChange={(e) => setApartmentParticipation(apartment.id, selectedExpenseForConfig, participation.type, parseFloat(e.target.value) || 0)}
                                  placeholder={participation.type === "percentage" ? "%" : "RON"}
                                  className="w-20 p-2 border rounded text-sm"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <div className="text-sm text-gray-600 mb-3">Cheltuieli active pentru {currentMonth}:</div>
              {getAssociationExpenseTypes().map(expenseType => {
                const config = getExpenseConfig(expenseType.name);
                const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                const isDefault = defaultExpenseTypes.find(def => def.name === expenseType.name);
                
                return (
                  <div key={expenseType.name} className={`p-4 rounded-lg ${isCustom ? "bg-red-50" : "bg-blue-50"} flex items-center justify-between`}>
                    <div className="flex-1">
                      <div className="font-medium text-lg">{expenseType.name}</div>
                      <div className="text-sm text-gray-600">
                        {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                         config.distributionType === "individual" ? "Pe apartament (individual)" :
                         config.distributionType === "person" ? "Pe persoană" : 
                         (expenseType.name === "Apă caldă" || expenseType.name === "Apă rece" || expenseType.name === "Canal") ? "Pe consum (mc)" : "Pe consum (mc/Gcal)"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpenseStatus(expenseType.name, currentMonth, true);
                          }}
                          className="bg-gray-400 text-white px-3 py-2 rounded text-sm hover:bg-red-500"
                          title="Elimină pentru această lună"
                        >
                          Elimină
                        </button>
                      )}
                      {isCustom && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpenseStatus(expenseType.name, currentMonth, true);
                            }}
                            className="bg-gray-400 text-white px-3 py-2 rounded text-sm hover:bg-red-500"
                            title="Elimină pentru această lună"
                          >
                            Elimină
                          </button>
                          <button
                            onClick={() => {
                              deleteCustomExpense(expenseType.name);
                            }}
                            className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
                            title="Șterge definitiv cheltuiala"
                          >
                            Șterge
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {getDisabledExpenseTypes().length > 0 && (
                <>
                  <div className="text-sm text-gray-600 mb-3 mt-6 pt-4 border-t">Cheltuieli dezactivate pentru {currentMonth}:</div>
                  {getDisabledExpenseTypes().map(expenseType => {
                    const config = getExpenseConfig(expenseType.name);
                    const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                    
                    return (
                      <div key={expenseType.name} className="p-4 rounded-lg bg-gray-50 flex items-center justify-between opacity-60">
                        <div className="flex-1">
                          <div className="font-medium text-lg line-through">{expenseType.name}</div>
                          <div className="text-sm text-gray-600">
                            {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                             config.distributionType === "individual" ? "Pe apartament (individual)" :
                             config.distributionType === "person" ? "Pe persoană" : 
                             (expenseType.name === "Apă caldă" || expenseType.name === "Apă rece" || expenseType.name === "Canal") ? "Pe consum (mc)" : "Pe consum (mc/Gcal)"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleExpenseStatus(expenseType.name, currentMonth, false)}
                            className="bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
                            title="Reactivează pentru această lună"
                          >
                            Reactivează
                          </button>
                          {isCustom && (
                            <button
                              onClick={() => {
                                deleteCustomExpense(expenseType.name);
                              }}
                              className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
                              title="Șterge definitiv cheltuiala"
                            >
                              Șterge
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesView;