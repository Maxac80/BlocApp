import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, Layers } from 'lucide-react';

const StairModal = ({
  isOpen,
  onClose,
  mode, // 'add' sau 'edit'
  stair, // pentru edit
  block, // pentru context (add mode)
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    floors: '',
    hasElevator: false
  });

  // Resetează sau populează datele când se deschide modalul
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && stair) {
        setFormData({
          name: stair.name || '',
          description: stair.description || '',
          floors: stair.floors || '',
          hasElevator: stair.hasElevator || false
        });
      } else {
        setFormData({
          name: '',
          description: '',
          floors: '',
          hasElevator: false
        });
      }
    }
  }, [isOpen, mode, stair]);


  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Completați numele scării');
      return;
    }

    const stairData = {
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      floors: formData.floors ? parseInt(formData.floors) : null,
      hasElevator: formData.hasElevator
    };

    // Pentru add mode, include blockId
    if (mode === 'add' && block) {
      stairData.blockId = block.id;
    }

    try {
      await onSave(stairData);
      onClose();
    } catch (error) {
      console.error('Error saving stair:', error);
      alert('Eroare la salvarea scării: ' + error.message);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header cu gradient verde */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 sm:p-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="bg-white bg-opacity-20 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-semibold truncate">
                {mode === 'edit' ? `Editează scara ${stair?.name}` : 'Configurare: Scară nouă'}
              </h3>
              <p className="text-green-100 text-xs sm:text-sm truncate">
                {mode === 'edit'
                  ? `Modifică datele scării`
                  : `Scară nouă pentru ${block?.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-200 transition-colors flex-shrink-0"
          >
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-2 sm:space-y-3">
            <h4 className="text-sm sm:text-base font-medium text-gray-800 mb-2 sm:mb-3">Informații scară</h4>

                {/* Numele scării */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Numele scării *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="ex: Scara A, Intrarea 1"
                    required
                  />
                </div>

                {/* Numărul de etaje și Lift pe aceeași linie */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Număr etaje
                    </label>
                    <input
                      type="text"
                      value={formData.floors}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({...formData, floors: value});
                      }}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="ex: 10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Acces
                    </label>
                    <div className="flex items-center h-[34px] sm:h-[38px]">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.hasElevator}
                          onChange={(e) => setFormData({...formData, hasElevator: e.target.checked})}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-green-300 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <span className="ml-2 text-xs sm:text-sm text-gray-700">Are lift</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Descrierea */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Descriere
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    placeholder="ex: Scară principală cu acces auto"
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
              className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
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

export default StairModal;