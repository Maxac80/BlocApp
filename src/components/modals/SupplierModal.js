import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';

const SupplierModal = ({
  isOpen,
  onClose,
  onSave,
  supplier = null, // null pentru adăugare, obiect pentru editare
  title
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(supplier?.name || '');
    }
  }, [isOpen, supplier]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Numele furnizorului este obligatoriu');
      return;
    }

    try {
      await onSave({ name: name.trim() });
      onClose();
    } catch (error) {
      console.error('Eroare la salvarea furnizorului:', error);
      alert('Eroare la salvarea furnizorului: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {title || (supplier ? 'Editează furnizor' : 'Creează furnizor')}
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

        <div className="p-4">
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

        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
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
