import React, { useState, useEffect } from 'react';
import { X, Plus, Settings, Users, Building2 } from 'lucide-react';
import useSuppliers from '../../hooks/useSuppliers';
import { defaultExpenseTypes } from '../../data/expenseTypes';
import SupplierModal from './SupplierModal';

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
  currentSheet,
  blocks,
  stairs
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [expenseName, setExpenseName] = useState('');
  const [localConfig, setLocalConfig] = useState({
    distributionType: 'apartment',
    invoiceMode: 'single',
    supplierId: null,
    supplierName: '',
    contractNumber: '',
    contactPerson: '',
    receptionMode: 'total', // 'total' | 'per_block' | 'per_stair'
    appliesTo: {
      blocks: [],
      stairs: []
    }
  });

  const { suppliers, loading, addSupplier } = useSuppliers(currentSheet);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setExpenseName('');
      setLocalConfig({
        distributionType: 'apartment',
        invoiceMode: 'single',
        supplierId: null,
        supplierName: '',
        contractNumber: '',
        contactPerson: '',
        receptionMode: 'total',
        appliesTo: {
          blocks: [],
          stairs: []
        }
      });
      setActiveTab('general');
    }
  }, [isOpen]);

  const handleAddNewSupplier = async (supplierData) => {
    try {
      const newSupplier = await addSupplier(supplierData);
      setLocalConfig(prev => ({
        ...prev,
        supplierId: newSupplier.id,
        supplierName: newSupplier.name
      }));

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

    // Validare Mod introducere: dacă e per_block sau per_stair, trebuie să aibă cel puțin un element selectat
    if (localConfig.receptionMode === 'per_block' && localConfig.appliesTo.blocks.length === 0) {
      alert('Selectați cel puțin un bloc sau alegeți "Pe asociație (total)"');
      return;
    }
    if (localConfig.receptionMode === 'per_stair' && localConfig.appliesTo.stairs.length === 0) {
      alert('Selectați cel puțin o scară sau alegeți "Pe asociație (total)"');
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
      // Add the expense with configuration including reception mode and applies to
      await onAddExpense({
        name: expenseName.trim(),
        defaultDistribution: localConfig.distributionType,
        receptionMode: localConfig.receptionMode,
        appliesTo: localConfig.appliesTo
      }, localConfig);

      console.log('✅ Cheltuială adăugată cu succes:', expenseName.trim(), 'cu mod introducere:', localConfig.receptionMode, 'se aplică pe:', localConfig.appliesTo);
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

  // Funcții pentru gestionarea Mod introducere și bife
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
    const isSelected = localConfig.appliesTo.blocks.includes(blockId);
    setLocalConfig({
      ...localConfig,
      appliesTo: {
        ...localConfig.appliesTo,
        blocks: isSelected
          ? localConfig.appliesTo.blocks.filter(id => id !== blockId)
          : [...localConfig.appliesTo.blocks, blockId]
      }
    });
  };

  const handleStairToggle = (stairId) => {
    const isSelected = localConfig.appliesTo.stairs.includes(stairId);
    setLocalConfig({
      ...localConfig,
      appliesTo: {
        ...localConfig.appliesTo,
        stairs: isSelected
          ? localConfig.appliesTo.stairs.filter(id => id !== stairId)
          : [...localConfig.appliesTo.stairs, stairId]
      }
    });
  };

  if (!isOpen) return null;

  const apartments = getAssociationApartments();

  // Group stairs by block for display
  const blocksWithStairs = blocks.map(block => ({
    ...block,
    stairs: stairs.filter(stair => stair.blockId === block.id)
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
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

              {/* Invoice Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mod introducere facturi
                </label>
                <select
                  value={localConfig.invoiceMode}
                  onChange={(e) => setLocalConfig({ ...localConfig, invoiceMode: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                        <label key={block.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={localConfig.appliesTo.blocks.includes(block.id)}
                            onChange={() => handleBlockToggle(block.id)}
                            className="w-4 h-4 text-green-600 rounded"
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
                            <label key={stair.id} className="flex items-center gap-2 p-2 ml-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={localConfig.appliesTo.stairs.includes(stair.id)}
                                onChange={() => handleStairToggle(stair.id)}
                                className="w-4 h-4 text-green-600 rounded"
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
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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

export default ExpenseAddModal;