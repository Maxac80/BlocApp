import React, { useState, useEffect } from 'react';
import { X, Settings, Users, Building2 } from 'lucide-react';
import useSuppliers from '../../hooks/useSuppliers';
import SupplierModal from './SupplierModal';

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
  saveApartmentParticipations,
  blocks = [],
  stairs = []
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [localConfig, setLocalConfig] = useState({
    distributionType: 'apartment',
    invoiceMode: 'single',
    receptionMode: 'total',
    appliesTo: {
      blocks: [],
      stairs: []
    },
    supplierId: null,
    supplierName: '',
    contractNumber: '',
    contactPerson: ''
  });

  // 🏠 State local pentru participările apartamentelor (se salvează în Firebase)
  const [localParticipations, setLocalParticipations] = useState({});

  const { suppliers, loading, addSupplier } = useSuppliers(currentSheet);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const justAddedSupplierRef = React.useRef(false);



  useEffect(() => {
    if (expenseConfig && !justAddedSupplierRef.current) {
      setLocalConfig({
        distributionType: expenseConfig.distributionType || 'apartment',
        invoiceMode: expenseConfig.invoiceMode || 'single',
        receptionMode: expenseConfig.receptionMode || 'total',
        appliesTo: expenseConfig.appliesTo || {
          blocks: [],
          stairs: []
        },
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

  const handleAddNewSupplier = async (supplierData) => {
    try {
      const newSupplier = await addSupplier({
        ...supplierData,
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
    } catch (error) {
      console.error('Error adding supplier:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        supplierData,
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

  const handleReceptionModeChange = (mode) => {
    setLocalConfig({
      ...localConfig,
      receptionMode: mode,
      appliesTo: {
        blocks: mode === 'per_block' ? blocks.map(b => b.id) : [],
        stairs: mode === 'per_stair' ? stairs.map(s => s.id) : []
      }
    });
  };

  const handleBlockToggle = (blockId) => {
    const currentBlocks = localConfig.appliesTo.blocks;
    const newBlocks = currentBlocks.includes(blockId)
      ? currentBlocks.filter(id => id !== blockId)
      : [...currentBlocks, blockId];

    setLocalConfig({
      ...localConfig,
      appliesTo: {
        ...localConfig.appliesTo,
        blocks: newBlocks
      }
    });
  };

  const handleStairToggle = (stairId) => {
    const currentStairs = localConfig.appliesTo.stairs;
    const newStairs = currentStairs.includes(stairId)
      ? currentStairs.filter(id => id !== stairId)
      : [...currentStairs, stairId];

    setLocalConfig({
      ...localConfig,
      appliesTo: {
        ...localConfig.appliesTo,
        stairs: newStairs
      }
    });
  };

  // Grupare scări pe blocuri
  const blocksWithStairs = blocks.map(block => ({
    ...block,
    stairs: stairs.filter(stair => stair.blockId === block.id)
  }));

  if (!isOpen) return null;

  const apartments = getAssociationApartments();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mod introducere facturi
                </label>
                <select
                  value={localConfig.invoiceMode}
                  onChange={(e) => setLocalConfig({ ...localConfig, invoiceMode: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="single">Factură unică (defalcată)</option>
                  <option value="separate">Facturi separate (per scară/bloc)</option>
                </select>
                <p className="mt-2 text-sm text-gray-600">
                  {localConfig.invoiceMode === 'single' && 'O singură factură pentru întreaga cheltuială, distribuită pe entități'}
                  {localConfig.invoiceMode === 'separate' && 'Facturi separate pentru fiecare entitate (scară/bloc)'}
                </p>
              </div>

              {/* Mod introducere cheltuială */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mod introducere cheltuială
                </label>
                <select
                  value={localConfig.receptionMode}
                  onChange={(e) => handleReceptionModeChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="total">Pe asociație (total)</option>
                  {(blocks.length > 1 || localConfig.receptionMode === 'per_block') && <option value="per_block">Defalcat pe blocuri</option>}
                  {(stairs.length > 1 || localConfig.receptionMode === 'per_stair') && <option value="per_stair">Defalcat pe scări</option>}
                </select>
                <p className="mt-2 text-sm text-gray-600">
                  {localConfig.receptionMode === 'total' && 'Suma se introduce o singură dată pentru întreaga asociație'}
                  {localConfig.receptionMode === 'per_block' && 'Sume separate pentru fiecare bloc'}
                  {localConfig.receptionMode === 'per_stair' && 'Sume separate pentru fiecare scară'}
                </p>
              </div>

              {/* Se aplică pe (bife) - doar pentru per_block și per_stair */}
              {localConfig.receptionMode !== 'total' && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    🏢 Se aplică pe: (bifează)
                  </label>

                  {localConfig.receptionMode === 'per_block' && (
                    <div className="space-y-2">
                      {blocks.map(block => (
                        <label key={block.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-purple-50">
                          <input
                            type="checkbox"
                            checked={localConfig.appliesTo.blocks.includes(block.id)}
                            onChange={() => handleBlockToggle(block.id)}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm">{block.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {localConfig.receptionMode === 'per_stair' && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {blocksWithStairs.map(block => (
                        <div key={block.id} className="space-y-1">
                          <div className="text-xs font-medium text-gray-600 px-2">{block.name}</div>
                          {block.stairs.map(stair => (
                            <label key={stair.id} className="flex items-center gap-2 p-2 ml-4 border rounded-lg cursor-pointer hover:bg-purple-50">
                              <input
                                type="checkbox"
                                checked={localConfig.appliesTo.stairs.includes(stair.id)}
                                onChange={() => handleStairToggle(stair.id)}
                                className="w-4 h-4 text-purple-600 rounded"
                              />
                              <span className="text-sm">{stair.name}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    + Adaugă furnizor
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

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSave={handleAddNewSupplier}
        supplier={null}
        title="Adaugă furnizor nou"
      />
    </div>
  );
};

export default ExpenseConfigModal;