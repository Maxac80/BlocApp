import React from 'react';
import { XCircle, Plus } from 'lucide-react';
import { defaultExpenseTypes } from '../../data/expenseTypes';

const ExpenseConfigModal = ({
  showExpenseConfig,
  setShowExpenseConfig,
  currentMonth,
  newCustomExpense,
  setNewCustomExpense,
  handleAddCustomExpense,
  selectedExpenseForConfig,
  setSelectedExpenseForConfig,
  getAssociationExpenseTypes,
  getExpenseConfig,
  updateExpenseConfig,
  getAssociationApartments,
  getApartmentParticipation,
  setApartmentParticipation,
  getDisabledExpenseTypes,
  toggleExpenseStatus,
  deleteCustomExpense
}) => {
  if (!showExpenseConfig) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 bg-indigo-50 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold">💰 Configurare Cheltuieli - {currentMonth}</h3>
          <button
            onClick={() => setShowExpenseConfig(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          <div className="space-y-3 mb-4">
            <div className="flex gap-2">
              <input
                value={newCustomExpense.name}
                onChange={(e) => setNewCustomExpense({...newCustomExpense, name: e.target.value})}
                placeholder="ex: Deratizare"
                className="flex-1 p-2 border rounded-lg text-sm"
              />
              <button 
                onClick={handleAddCustomExpense}
                className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
                disabled={!newCustomExpense.name}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Configurează cheltuială:</label>
              <select 
                value={selectedExpenseForConfig || ""}
                onChange={(e) => setSelectedExpenseForConfig(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm mb-2"
              >
                <option value="">Selectează cheltuiala</option>
                {getAssociationExpenseTypes().map(expenseType => (
                  <option key={expenseType.name} value={expenseType.name}>
                    {expenseType.name}
                  </option>
                ))}
              </select>
              
              {selectedExpenseForConfig && (
                <div className="space-y-2">
                  <select
                    value={getExpenseConfig(selectedExpenseForConfig).distributionType}
                    onChange={(e) => updateExpenseConfig(selectedExpenseForConfig, { distributionType: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="apartment">Pe apartament (egal)</option>
                    <option value="individual">Pe apartament (individual)</option>
                    <option value="person">Pe persoană</option>
                    <option value="consumption">Pe consum (mc/Gcal/kWh)</option>
                  </select>
                  
                  {getAssociationApartments().length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
                      <div className="text-xs font-medium text-gray-600 mb-1">Participarea apartamentelor:</div>
                      {getAssociationApartments().map(apartment => {
                        const participation = getApartmentParticipation(apartment.id, selectedExpenseForConfig);
                        return (
                          <div key={apartment.id} className="flex items-center gap-2 text-sm">
                            <span className="w-16">Apt {apartment.number}</span>
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
                              className="p-1 border rounded text-xs"
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
                                className="w-16 p-1 border rounded text-xs"
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
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <div className="text-xs text-gray-600 mb-2">Cheltuieli active pentru {currentMonth}:</div>
            {getAssociationExpenseTypes().map(expenseType => {
              const config = getExpenseConfig(expenseType.name);
              const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
              const isDefault = defaultExpenseTypes.find(def => def.name === expenseType.name);
              
              return (
                <div key={expenseType.name} className={`p-2 rounded text-sm ${isCustom ? "bg-red-50" : "bg-blue-50"} flex items-center justify-between`}>
                  <div className="flex-1">
                    <div className="font-medium">{expenseType.name}</div>
                    <div className="text-xs text-gray-600">
                      {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                       config.distributionType === "individual" ? "Pe apartament (individual)" :
                       config.distributionType === "person" ? "Pe persoană" : 
                       (expenseType.name === "Apă caldă" || expenseType.name === "Apă rece" || expenseType.name === "Canal") ? "Pe consum (mc)" : "Pe consum (mc/Gcal)"}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {isDefault && (
                      <button
                        onClick={() => toggleExpenseStatus(expenseType.name, true)}
                        className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
                        title="Elimină pentru această lună"
                      >
                        Elimină
                      </button>
                    )}
                    {isCustom && (
                      <>
                        <button
                          onClick={() => toggleExpenseStatus(expenseType.name, true)}
                          className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
                          title="Elimină pentru această lună"
                        >
                          Elimină
                        </button>
                        <button
                          onClick={() => {
                            deleteCustomExpense(expenseType.name);
                          }}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
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
                <div className="text-xs text-gray-600 mb-2 mt-4 pt-2 border-t">Cheltuieli dezactivate pentru {currentMonth}:</div>
                {getDisabledExpenseTypes().map(expenseType => {
                  const config = getExpenseConfig(expenseType.name);
                  const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                  
                  return (
                    <div key={expenseType.name} className="p-2 rounded text-sm bg-gray-50 flex items-center justify-between opacity-60">
                      <div className="flex-1">
                        <div className="font-medium line-through">{expenseType.name}</div>
                        <div className="text-xs text-gray-600">
                          {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                           config.distributionType === "individual" ? "Pe apartament (individual)" :
                           config.distributionType === "person" ? "Pe persoană" : 
                           (expenseType.name === "Apă caldă" || expenseType.name === "Apă rece" || expenseType.name === "Canal") ? "Pe consum (mc)" : "Pe consum (mc/Gcal)"}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleExpenseStatus(expenseType.name, false)}
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                          title="Reactivează pentru această lună"
                        >
                          Reactivează
                        </button>
                        {isCustom && (
                          <button
                            onClick={() => {
                              deleteCustomExpense(expenseType.name);
                            }}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
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
        
        <div className="p-6 bg-gray-50 border-t flex justify-end">
          <button
            onClick={() => setShowExpenseConfig(false)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseConfigModal;