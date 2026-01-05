import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';

const SupplierModal = ({
  isOpen,
  onClose,
  onSave,
  supplier = null, // null pentru adăugare, obiect pentru editare
  title
}) => {
  const [formData, setFormData] = useState({
    name: '',
    cui: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    iban: '',
    notes: ''
  });

  // Resetează formularul când modalul se deschide
  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        // Editare - populează cu datele existente
        setFormData({
          name: supplier.name || '',
          cui: supplier.cui || '',
          address: supplier.address || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
          website: supplier.website || '',
          iban: supplier.iban || '',
          notes: supplier.notes || ''
        });
      } else {
        // Adăugare - resetează formularul
        setFormData({
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
    }
  }, [isOpen, supplier]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Numele furnizorului este obligatoriu');
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Eroare la salvarea furnizorului:', error);
      alert('Eroare la salvarea furnizorului: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header verde similar cu modalul de cheltuieli */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
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

        <div className="flex-1 p-3 sm:p-4 overflow-y-auto min-h-0">
          <div className="space-y-3 sm:space-y-4">
            {/* Nume furnizor - obligatoriu */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nume furnizor *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: EON Energie România"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* CUI */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  CUI
                </label>
                <input
                  type="text"
                  value={formData.cui}
                  onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                  placeholder="ex: 22043010"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="ex: 0800 800 800"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>
            </div>

            {/* Adresă */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Adresă
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="ex: Str. Example 123, București"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ex: contact@eon.ro"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="ex: www.eon.ro"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>
            </div>

            {/* IBAN */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                IBAN
              </label>
              <input
                type="text"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="ex: RO12BTRL0000000000000"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Note
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informații adiționale..."
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                rows="2"
              />
            </div>
          </div>
        </div>

        {/* Footer cu butoane */}
        <div className="bg-gray-50 px-3 sm:px-4 py-3 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="text-xs text-gray-500">
            * Obligatoriu
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="px-3 py-1.5 text-xs sm:text-sm bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg whitespace-nowrap"
            >
              {supplier ? 'Salvează' : 'Salvează furnizor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierModal;