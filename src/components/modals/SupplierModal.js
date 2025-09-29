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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header verde similar cu modalul de cheltuieli */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                {title || (supplier ? 'Editează furnizor' : 'Adaugă furnizor nou')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors hover:bg-white/20 p-2 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="space-y-6">
            {/* Nume furnizor - obligatoriu */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nume furnizor *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: EON Energie România"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* CUI */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CUI
                </label>
                <input
                  type="text"
                  value={formData.cui}
                  onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                  placeholder="ex: 22043010"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="ex: 0800 800 800"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>
            </div>

            {/* Adresă */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adresă
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="ex: Str. Example 123, București"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ex: contact@eon.ro"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="ex: www.eon.ro"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>
            </div>

            {/* IBAN */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                IBAN
              </label>
              <input
                type="text"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="ex: RO12BTRL0000000000000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informații adiționale..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Footer cu butoane */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            * Câmpuri obligatorii
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              {supplier ? 'Actualizează furnizor' : 'Adaugă furnizor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierModal;