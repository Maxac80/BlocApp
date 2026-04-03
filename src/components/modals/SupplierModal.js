import React, { useState, useEffect } from 'react';
import { X, Building2, Package } from 'lucide-react';

const normalizeText = (text) => {
  return (text || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const SupplierModal = ({
  isOpen,
  onClose,
  onSave,
  supplier = null, // null pentru adăugare, obiect pentru editare
  title,
  expenseTypes = [], // lista cheltuielilor disponibile din asociație
  existingSuppliers = [] // lista furnizorilor existenți pentru validare duplicat
}) => {
  const [name, setName] = useState('');
  const [selectedExpenses, setSelectedExpenses] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setName(supplier?.name || '');
      setSelectedExpenses(supplier?.serviceTypes || []);
    }
  }, [isOpen, supplier]);

  const handleToggleExpense = (expenseId) => {
    setSelectedExpenses(prev =>
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Numele furnizorului este obligatoriu');
      return;
    }

    // Validare duplicat (exclude furnizorul curent la editare)
    const isDuplicate = existingSuppliers.some(s => {
      if (supplier?.id && s.id === supplier.id) return false; // exclude self la editare
      return normalizeText(s.name) === normalizeText(name);
    });

    if (isDuplicate) {
      alert(`Furnizorul "${name.trim()}" există deja. Alege un alt nume.`);
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        serviceTypes: selectedExpenses
      });
      onClose();
    } catch (error) {
      console.error('Eroare la salvarea furnizorului:', error);
      alert('Eroare la salvarea furnizorului: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {title || (supplier ? 'Editează furnizor' : 'Adaugă furnizor nou')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors hover:bg-white/20 p-1.5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Nume furnizor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume furnizor *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleSave()}
              placeholder="ex: Apa Nova, Termoficare"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              autoFocus
            />
          </div>

          {/* Cheltuieli asociate */}
          {expenseTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-gray-500" />
                Cheltuieli furnizate
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Selectează cheltuielile pe care le generează acest furnizor
              </p>
              <div className="space-y-1 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {expenseTypes.map(expense => {
                  const expenseId = expense.id || expense;
                  const expenseName = expense.name || expense;
                  const isSelected = selectedExpenses.includes(expenseId);

                  return (
                    <label
                      key={expenseId}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleExpense(expenseId)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className={`text-sm ${isSelected ? 'font-medium text-green-800' : 'text-gray-700'}`}>
                        {expenseName}
                      </span>
                    </label>
                  );
                })}
              </div>
              {selectedExpenses.length > 0 && (
                <p className="text-xs text-green-600 mt-1.5">
                  {selectedExpenses.length === 1 ? '1 cheltuială selectată' : `${selectedExpenses.length} cheltuieli selectate`}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Anulează
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {supplier ? 'Salvează' : 'Creează furnizor'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierModal;
