import React, { useState, useEffect } from 'react';
import { X, Plus, Settings, Users, Building2 } from 'lucide-react';
import useSuppliers from '../../hooks/useSuppliers';
import { defaultExpenseTypes } from '../../data/expenseTypes';

// Funcție pentru normalizarea textului (elimină diacriticele și convertește la lowercase)
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const ExpenseAddModal = ({
  isOpen,
  onClose,
  onAddExpense,
  getAssociationApartments,
  getApartmentParticipation,
  setApartmentParticipation,
  getAssociationExpenseTypes,
  currentSheet
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [expenseName, setExpenseName] = useState('');
  const [localConfig, setLocalConfig] = useState({
    distributionType: 'apartment',
    supplierId: null,
    supplierName: '',
    contractNumber: '',
    contactPerson: ''
  });

  const { suppliers, loading, addSupplier } = useSuppliers(currentSheet);
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    cui: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    iban: '',
    notes: ''
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setExpenseName('');
      setLocalConfig({
        distributionType: 'apartment',
        supplierId: null,
        supplierName: '',
        contractNumber: '',
        contactPerson: ''
      });
      setActiveTab('general');
      setIsAddingNewSupplier(false);
      setNewSupplierData({
        name: '',
        cui: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        iban: '',
        notes: ''
      });
    }
  }, [isOpen]);

  const handleAddNewSupplier = async () => {
    if (!newSupplierData.name.trim()) {
      alert('Numele furnizorului este obligatoriu');
      return;
    }

    try {
      const newSupplier = await addSupplier(newSupplierData);
      setLocalConfig(prev => ({
        ...prev,
        supplierId: newSupplier.id,
        supplierName: newSupplier.name
      }));

      // Reset supplier form and go back to supplier selection
      setIsAddingNewSupplier(false);
      setNewSupplierData({
        name: '',
        cui: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        iban: '',
        notes: ''
      });

      console.log('✅ Furnizor nou adăugat și selectat:', newSupplier.name);
    } catch (error) {
      console.error('Eroare la adăugarea furnizorului:', error);
      if (error.code === 'permission-denied') {
        alert('Permisiuni insuficiente. Contactați administratorul.');
      } else {
        alert(`Eroare la adăugarea furnizorului: ${error.message || 'Eroare necunoscută'}. Verificați consola pentru detalii.`);
      }
    }
  };

  const handleSave = async () => {
    if (!expenseName.trim()) {
      alert('Numele cheltuielii este obligatoriu');
      return;
    }

    const normalizedInputName = normalizeText(expenseName);

    // Verifică dacă numele există în cheltuielile standard (inclusiv cele dezactivate)
    const standardExpenseExists = defaultExpenseTypes.some(expense =>
      normalizeText(expense.name) === normalizedInputName
    );

    if (standardExpenseExists) {
      alert(`Cheltuiala cu numele "${expenseName.trim()}" există deja în cheltuielile standard. Vă rugăm să alegeți un alt nume.`);
      return;
    }

    // Verifică dacă numele cheltuielii există deja în cheltuielile custom
    if (getAssociationExpenseTypes) {
      const existingExpenseTypes = getAssociationExpenseTypes();
      const nameExists = existingExpenseTypes.some(expense =>
        normalizeText(expense.name) === normalizedInputName
      );

      if (nameExists) {
        alert(`Cheltuiala cu numele "${expenseName.trim()}" există deja. Vă rugăm să alegeți un alt nume.`);
        return;
      }
    }

    try {
      // Add the expense with configuration
      await onAddExpense({
        name: expenseName.trim(),
        defaultDistribution: localConfig.distributionType
      }, localConfig);

      console.log('✅ Cheltuială adăugată cu succes:', expenseName.trim());
      onClose();
    } catch (error) {
      console.error('Eroare la adăugarea cheltuielii:', error);
      alert('Eroare la adăugarea cheltuielii: ' + error.message);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setLocalConfig({
        ...localConfig,
        supplierId: supplier.id,
        supplierName: supplier.name
      });
    }
  };

  if (!isOpen) return null;

  const apartments = getAssociationApartments();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">➕ Adaugă cheltuială nouă</h2>
              <p className="text-green-100 mt-1">Configurează complet noua cheltuială</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-green-800 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              General
            </button>
            <button
              onClick={() => setActiveTab('participation')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'participation'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Participare
            </button>
            <button
              onClick={() => setActiveTab('supplier')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'supplier'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Furnizor
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Expense Name Field - NEW */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nume cheltuială *
                </label>
                <input
                  type="text"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="ex: Deratizare, Curățenie, Întreținere lift..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Distribution Type - SAME AS CONFIG MODAL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mod de distribuție
                </label>
                <select
                  value={localConfig.distributionType}
                  onChange={(e) => setLocalConfig({ ...localConfig, distributionType: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="apartment">Pe apartament (egal)</option>
                  <option value="individual">Pe apartament (individual)</option>
                  <option value="person">Pe persoană</option>
                  <option value="consumption">Pe consum (mc/Gcal/kWh)</option>
                </select>
                <p className="mt-2 text-sm text-gray-600">
                  {localConfig.distributionType === 'apartment' && 'Cheltuiala se împarte egal între toate apartamentele'}
                  {localConfig.distributionType === 'individual' && 'Fiecare apartament are suma proprie'}
                  {localConfig.distributionType === 'person' && 'Cheltuiala se împarte pe numărul de persoane'}
                  {localConfig.distributionType === 'consumption' && 'Cheltuiala se calculează pe baza consumului'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'participation' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Configurează participarea fiecărui apartament la această cheltuială
              </div>
              {apartments.length > 0 ? (
                <div className="space-y-2">
                  {apartments.map(apartment => {
                    const participation = getApartmentParticipation ? getApartmentParticipation(apartment.id, expenseName) : { type: 'integral', value: null };
                    return (
                      <div key={apartment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="w-20 font-medium">Apt {apartment.number}</span>
                        <select
                          value={participation.type}
                          onChange={(e) => {
                            const type = e.target.value;
                            if (type === "integral" || type === "excluded") {
                              if (setApartmentParticipation) {
                                setApartmentParticipation(apartment.id, expenseName, type);
                              }
                            } else {
                              if (setApartmentParticipation) {
                                setApartmentParticipation(apartment.id, expenseName, type, participation.value || (type === "percentage" ? 50 : 0));
                              }
                            }
                          }}
                          className="flex-1 p-2 border border-gray-300 rounded-lg"
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
                            onChange={(e) => {
                              if (setApartmentParticipation) {
                                setApartmentParticipation(apartment.id, expenseName, participation.type, parseFloat(e.target.value) || 0);
                              }
                            }}
                            placeholder={participation.type === "percentage" ? "%" : "RON"}
                            className="w-24 p-2 border border-gray-300 rounded-lg"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nu există apartamente configurate în asociație
                </p>
              )}
            </div>
          )}

          {activeTab === 'supplier' && (
            <div className="space-y-6">
              {!isAddingNewSupplier ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selectează furnizor
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={localConfig.supplierId || ''}
                        onChange={(e) => handleSupplierChange(e.target.value)}
                        className="flex-1 p-3 border border-gray-300 rounded-lg"
                        disabled={loading}
                      >
                        <option value="">Fără furnizor</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setIsAddingNewSupplier(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Adaugă nou
                      </button>
                    </div>
                  </div>

                  {localConfig.supplierId && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Număr contract
                        </label>
                        <input
                          type="text"
                          value={localConfig.contractNumber}
                          onChange={(e) => setLocalConfig({ ...localConfig, contractNumber: e.target.value })}
                          placeholder="ex: 12345/2024"
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Persoană de contact
                        </label>
                        <input
                          type="text"
                          value={localConfig.contactPerson}
                          onChange={(e) => setLocalConfig({ ...localConfig, contactPerson: e.target.value })}
                          placeholder="ex: Ion Popescu"
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Adaugă furnizor nou</h3>
                    <button
                      onClick={() => {
                        setIsAddingNewSupplier(false);
                        setNewSupplierData({
                          name: '',
                          cui: '',
                          address: '',
                          phone: '',
                          email: '',
                          website: '',
                          iban: '',
                          notes: ''
                        });
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nume furnizor *
                      </label>
                      <input
                        type="text"
                        value={newSupplierData.name}
                        onChange={(e) => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                        placeholder="ex: EON Energie"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CUI
                      </label>
                      <input
                        type="text"
                        value={newSupplierData.cui}
                        onChange={(e) => setNewSupplierData({ ...newSupplierData, cui: e.target.value })}
                        placeholder="ex: 22043010"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adresă
                      </label>
                      <input
                        type="text"
                        value={newSupplierData.address}
                        onChange={(e) => setNewSupplierData({ ...newSupplierData, address: e.target.value })}
                        placeholder="ex: Str. Example 123, București"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <input
                        type="text"
                        value={newSupplierData.phone}
                        onChange={(e) => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                        placeholder="ex: 0800 800 800"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newSupplierData.email}
                        onChange={(e) => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                        placeholder="ex: contact@eon.ro"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="text"
                        value={newSupplierData.website}
                        onChange={(e) => setNewSupplierData({ ...newSupplierData, website: e.target.value })}
                        placeholder="ex: www.eon.ro"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IBAN
                      </label>
                      <input
                        type="text"
                        value={newSupplierData.iban}
                        onChange={(e) => setNewSupplierData({ ...newSupplierData, iban: e.target.value })}
                        placeholder="ex: RO12BTRL0000000000000"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Note
                      </label>
                      <textarea
                        value={newSupplierData.notes}
                        onChange={(e) => setNewSupplierData({ ...newSupplierData, notes: e.target.value })}
                        placeholder="Informații adiționale..."
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleAddNewSupplier}
                      disabled={!newSupplierData.name.trim()}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Salvează furnizor
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            disabled={!expenseName.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adaugă cheltuială
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseAddModal;