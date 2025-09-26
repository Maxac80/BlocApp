import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col overflow-hidden">
        {/* Header cu gradient verde */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <span className="text-2xl">🪜</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {mode === 'edit' ? `Editează scara ${stair?.name}` : 'Configurare: Scară nouă'}
              </h3>
              <p className="text-green-100 text-sm">
                {mode === 'edit'
                  ? `Modifică datele scării`
                  : `Scară nouă pentru ${block?.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-200 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="p-6 pb-0 flex-1 overflow-auto">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Informații scară</h4>

                {/* Numele scării */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numele scării *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="ex: Scara A, Intrarea 1, Lift Principal"
                    required
                  />
                </div>

                {/* Numărul de etaje și Lift pe aceeași linie */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Număr etaje
                    </label>
                    <input
                      type="text"
                      value={formData.floors}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({...formData, floors: value});
                      }}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="ex: 10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Acces
                    </label>
                    <div className="flex items-center h-[42px]">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.hasElevator}
                          onChange={(e) => setFormData({...formData, hasElevator: e.target.checked})}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-green-300 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <span className="ml-2 text-sm text-gray-700">Are lift</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Descrierea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descriere
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    placeholder="ex: Scară principală cu acces auto, interfon modern"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">Opțional - detalii suplimentare despre scară</p>
                </div>
              </div>
            </div>

            {/* Butoane fixe la baza modalului */}
            <div className="bg-white border-t border-gray-200 p-6">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  {mode === 'edit' ? 'Salvează' : 'Adaugă'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StairModal;