import React, { useState } from 'react';
import { X, Home, Loader2, AlertCircle } from 'lucide-react';
import { useAssociations } from '../../hooks/useAssociations';
import { judeteRomania } from '../../data/counties';

/**
 * Modal pentru crearea unei asociații
 * - Dacă organizationId este furnizat, asociația va fi legată de organizație
 * - Dacă nu, va fi o asociație directă (fără firmă)
 */
const CreateAssociationModal = ({ isOpen, onClose, userId, organizationId, onSuccess }) => {
  const { createAssociation, createDirectAssociation, loading: creating } = useAssociations(userId);

  const [formData, setFormData] = useState({
    name: '',
    cui: '',
    registrationNumber: '',
    address: {
      street: '',
      number: '',
      city: '',
      county: '',
      zipCode: ''
    },
    email: '',
    phone: '',
    bank: '',
    bankAccount: ''
  });

  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validare
    if (!formData.name.trim()) {
      setError('Numele asociației este obligatoriu');
      return;
    }

    try {
      let result;

      if (organizationId) {
        // Creare asociație în cadrul organizației
        result = await createAssociation(formData, userId, organizationId);
        if (result) {
          onSuccess?.(result);
          onClose();
          // Reset form
          setFormData({
            name: '',
            cui: '',
            registrationNumber: '',
            address: { street: '', number: '', city: '', county: '', zipCode: '' },
            email: '',
            phone: '',
            bank: '',
            bankAccount: ''
          });
        }
      } else {
        // Creare asociație directă (fără organizație)
        result = await createDirectAssociation(formData);
        if (result.success) {
          onSuccess?.(result.association);
          onClose();
          // Reset form
          setFormData({
            name: '',
            cui: '',
            registrationNumber: '',
            address: { street: '', number: '', city: '', county: '', zipCode: '' },
            email: '',
            phone: '',
            bank: '',
            bankAccount: ''
          });
        } else {
          setError(result.error || 'Eroare la crearea asociației');
        }
      }
    } catch (err) {
      setError(err.message || 'Eroare la crearea asociației');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle bg-white rounded-2xl shadow-xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                <Home className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Creează Asociație
                </h3>
                <p className="text-sm text-gray-500">
                  {organizationId
                    ? 'Asociație în cadrul organizației'
                    : 'Asociație de proprietari directă'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Nume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numele asociației *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ex: Asociația de Proprietari Bloc A1"
              />
            </div>

            {/* CUI și Nr. Registru */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CUI
                </label>
                <input
                  type="text"
                  value={formData.cui}
                  onChange={(e) => handleChange('cui', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nr. Înregistrare
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => handleChange('registrationNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="123/A/2020"
                />
              </div>
            </div>

            {/* Adresă */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresa sediului
              </label>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleChange('address.street', e.target.value)}
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Strada"
                />
                <input
                  type="text"
                  value={formData.address.number}
                  onChange={(e) => handleChange('address.number', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Nr."
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleChange('address.city', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Oraș"
                />
                <select
                  value={formData.address.county}
                  onChange={(e) => handleChange('address.county', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Județ</option>
                  {judeteRomania.map(judet => (
                    <option key={judet.cod} value={judet.nume}>{judet.nume}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.address.zipCode}
                  onChange={(e) => handleChange('address.zipCode', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Cod poștal"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="0722 123 456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="asociatie@email.ro"
                />
              </div>
            </div>

            {/* Date bancare */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banca
                </label>
                <input
                  type="text"
                  value={formData.bank}
                  onChange={(e) => handleChange('bank', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex: BRD, BCR, ING"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IBAN
                </label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => handleChange('bankAccount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="RO00XXXX0000000000000000"
                />
              </div>
            </div>
          </form>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={handleSubmit}
              disabled={creating}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se creează...
                </>
              ) : (
                'Creează Asociație'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssociationModal;
