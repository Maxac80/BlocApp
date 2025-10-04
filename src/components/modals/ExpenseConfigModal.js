import React, { useState, useEffect } from 'react';
import { X, Settings, Users, Building2 } from 'lucide-react';
import useSuppliers from '../../hooks/useSuppliers';

const ExpenseConfigModal = ({
  isOpen,
  onClose,
  expenseName,
  expenseConfig,
  updateExpenseConfig,
  getAssociationApartments,
  getApartmentParticipation,
  setApartmentParticipation,
  currentSheet,
  saveApartmentParticipations
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [localConfig, setLocalConfig] = useState({
    distributionType: 'apartment',
    supplierId: null,
    supplierName: '',
    contractNumber: '',
    contactPerson: ''
  });

  // 🏠 State local pentru participările apartamentelor (se salvează în Firebase)
  const [localParticipations, setLocalParticipations] = useState({});

  const { suppliers, loading, addSupplier } = useSuppliers(currentSheet);
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const justAddedSupplierRef = React.useRef(false);
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



  useEffect(() => {
    if (expenseConfig && !justAddedSupplierRef.current) {
      setLocalConfig({
        distributionType: expenseConfig.distributionType || 'apartment',
        supplierId: expenseConfig.supplierId || null,
        supplierName: expenseConfig.supplierName || '',
        contractNumber: expenseConfig.contractNumber || '',
        contactPerson: expenseConfig.contactPerson || ''
      });
    }
  }, [expenseConfig]);

  // 🔄 Încarcă participările din Firebase la deschiderea modalului
  useEffect(() => {
    if (isOpen && currentSheet && expenseName) {
      const savedParticipations = currentSheet.configSnapshot?.apartmentParticipations || {};

      // Filtrează doar participările pentru cheltuiala curentă
      const expenseParticipations = {};
      Object.keys(savedParticipations).forEach(key => {
        if (key.includes(`-${expenseName}`)) {
          expenseParticipations[key] = savedParticipations[key];
        }
      });

      setLocalParticipations(expenseParticipations);
    } else if (!isOpen) {
      // Resetează participările când modalul se închide
      setLocalParticipations({});
    }
  }, [isOpen, currentSheet, expenseName]);

  const handleAddNewSupplier = async () => {
    if (!newSupplierData.name.trim()) {
      alert('Numele furnizorului este obligatoriu');
      return;
    }

    try {
      const newSupplier = await addSupplier({
        ...newSupplierData,
        serviceTypes: [expenseName]
      });

      // Setează flag-ul că tocmai am adăugat un furnizor
      justAddedSupplierRef.current = true;

      // Update local config with new supplier
      setLocalConfig(prev => ({
        ...prev,
        supplierId: newSupplier.id,
        supplierName: newSupplier.name
      }));

      // Resetează flag-ul după 2 secunde
      setTimeout(() => {
        justAddedSupplierRef.current = false;
      }, 2000);

      // Reset the form and exit add mode
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
    } catch (error) {
      console.error('Error adding supplier:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        supplierData: newSupplierData,
        currentSheet: currentSheet?.id
      });

      // More specific error messages
      if (error.code === 'permission-denied') {
        alert('Nu aveți permisiunea de a adăuga furnizori. Verificați dacă sunteți autentificat.');
      } else if (error.message?.includes('Missing or insufficient permissions')) {
        alert('Permisiuni insuficiente. Contactați administratorul.');
      } else {
        alert(`Eroare la adăugarea furnizorului: ${error.message || 'Eroare necunoscută'}. Verificați consola pentru detalii.`);
      }
    }
  };

  const handleSave = async () => {
    try {
      // Validare participări - verifică dacă există sume/procente necompletate
      const apartments = getAssociationApartments();
      const incompleteParticipations = [];

      apartments.forEach(apartment => {
        const participationKey = `${apartment.id}-${expenseName}`;
        const participation = localParticipations[participationKey] || { type: 'integral', value: null };

        if (participation.type === 'percentage' || participation.type === 'fixed') {
          if (!participation.value || participation.value <= 0) {
            incompleteParticipations.push({
              apartment: apartment.number,
              type: participation.type === 'percentage' ? 'procent' : 'sumă fixă'
            });
          }
        }
      });

      // Dacă există participări incomplete, afișează eroare
      if (incompleteParticipations.length > 0) {
        const messages = incompleteParticipations.map(p =>
          `Apt ${p.apartment}: completați ${p.type}`
        ).join('\n');
        alert(`Participări incomplete:\n\n${messages}\n\nVă rog completați toate valorile înainte de a salva.`);
        return;
      }

      // Închide modalul IMEDIAT pentru a preveni afișarea valorilor vechi
      onClose();

      // Salvează în fundal (după închidere)
      // Save configuration
      await updateExpenseConfig(expenseName, localConfig);

      // Save apartment participations to Firebase
      if (saveApartmentParticipations) {
        // Merge cu participările existente pentru alte cheltuieli
        const allParticipations = currentSheet?.configSnapshot?.apartmentParticipations || {};
        const mergedParticipations = { ...allParticipations, ...localParticipations };
        await saveApartmentParticipations(mergedParticipations);
      }
    } catch (error) {
      console.error('Eroare la salvarea configurației:', error);
      alert('Eroare la salvarea configurației. Verificați consola.');
    }
  };

  const handleSupplierChange = (supplierId) => {
    if (!supplierId) {
      // Dacă se selectează "Fără furnizor"
      setLocalConfig({
        ...localConfig,
        supplierId: null,
        supplierName: ''
      });
    } else {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (supplier) {
        setLocalConfig({
          ...localConfig,
          supplierId: supplier.id,
          supplierName: supplier.name
        });
      }
    }
  };

  if (!isOpen) return null;

  const apartments = getAssociationApartments();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">⚙️ Configurare: {expenseName}</h2>
              <p className="text-purple-100 mt-1">Setări de distribuție și furnizor</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-purple-800 p-2 rounded-lg transition-colors"
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
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
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
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
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
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mod de distribuție
                </label>
                <select
                  value={localConfig.distributionType}
                  onChange={(e) => setLocalConfig({ ...localConfig, distributionType: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                    const participationKey = `${apartment.id}-${expenseName}`;
                    const participation = localParticipations[participationKey] || { type: 'integral', value: null };

                    return (
                      <div key={apartment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="w-20 font-medium">Apt {apartment.number}</span>
                        <select
                          value={participation.type}
                          onChange={(e) => {
                            const type = e.target.value;
                            const newValue = type === "percentage" ? 50 : type === "fixed" ? 0 : null;
                            setLocalParticipations({
                              ...localParticipations,
                              [participationKey]: { type, value: newValue }
                            });
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
                            inputMode="decimal"
                            value={participation.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Permite doar numere și punct zecimal
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setLocalParticipations({
                                  ...localParticipations,
                                  [participationKey]: {
                                    ...participation,
                                    value: value === '' ? 0 : parseFloat(value) || 0
                                  }
                                });
                              }
                            }}
                            placeholder={participation.type === "percentage" ? "%" : "RON"}
                            className={`w-24 p-2 border rounded-lg ${
                              (!participation.value || participation.value <= 0)
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-300'
                            }`}
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
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Adaugă furnizor
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
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Salvează configurație
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseConfigModal;