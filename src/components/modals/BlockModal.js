import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';

const BlockModal = ({
  isOpen,
  onClose,
  mode, // 'add' sau 'edit'
  block, // pentru edit
  associationName, // pentru context
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: ''
  });

  // Resetează sau populează datele când se deschide modalul
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && block) {
        setFormData({
          name: block.name || '',
          address: block.address || '',
          description: block.description || ''
        });
      } else {
        setFormData({
          name: '',
          address: '',
          description: ''
        });
      }
    }
  }, [isOpen, mode, block]);


  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Completați numele blocului');
      return;
    }

    const blockData = {
      name: formData.name.trim(),
      address: formData.address?.trim() || null,
      description: formData.description?.trim() || null
    };

    try {
      await onSave(blockData);
      onClose();
    } catch (error) {
      console.error('Error saving block:', error);
      alert('Eroare la salvarea blocului: ' + error.message);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header cu gradient albastru */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="bg-white bg-opacity-20 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
              <span className="text-xl sm:text-2xl">🏢</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-semibold truncate">
                {mode === 'edit' ? `Editează bloc ${block?.name}` : 'Configurare: Bloc nou'}
              </h3>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                {mode === 'edit'
                  ? `Modifică datele blocului`
                  : `Bloc nou pentru ${associationName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors flex-shrink-0"
          >
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-2 sm:space-y-3">
            <h4 className="text-sm sm:text-base font-medium text-gray-800 mb-2 sm:mb-3">Informații bloc</h4>

            {/* Numele blocului */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Numele blocului *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="ex: Blocul A, Bloc 1"
                required
              />
            </div>

            {/* Adresa */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Adresa
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="ex: Str. Mihai Eminescu nr. 25"
              />
              <p className="text-xs text-gray-500 mt-0.5">Opțional - adresa completă</p>
            </div>

            {/* Descrierea */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Descriere
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="ex: Bloc de 10 etaje, lift funcțional"
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-0.5">Opțional - detalii suplimentare</p>
            </div>
          </div>
        </div>

        {/* Butoane fixe */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t flex justify-end gap-2 sm:gap-3 flex-shrink-0">
          <form onSubmit={handleSubmit} className="contents">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {mode === 'edit' ? 'Salvează' : 'Adaugă'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BlockModal;