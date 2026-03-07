import React, { useState, useCallback } from 'react';
import { X, Building, Loader2, AlertCircle } from 'lucide-react';
import { useAssociations } from '../../hooks/useAssociations';
import AssociationStep from '../onboarding/AssociationStep';

/**
 * Modal pentru crearea unei asociații
 * Reutilizează AssociationStep din onboarding pentru consistență
 */
const CreateAssociationModal = ({ isOpen, onClose, userId, organizationId, onSuccess }) => {
  const { createAssociation, createDirectAssociation, loading: creating } = useAssociations(userId);

  const [associationData, setAssociationData] = useState({});
  const [error, setError] = useState('');
  const [formKey, setFormKey] = useState(0); // pentru reset form

  const handleUpdateData = useCallback((data) => {
    setAssociationData(data);
  }, []);

  const resetForm = () => {
    setAssociationData({});
    setError('');
    setFormKey(prev => prev + 1); // forțează remount AssociationStep
  };

  const handleSubmit = async () => {
    setError('');

    if (!associationData.isValid) {
      setError('Completează toate câmpurile obligatorii');
      return;
    }

    // Pregătește datele pentru salvare (fără meta-câmpuri)
    const { isValid, progress, touchedFields, ...formData } = associationData;

    try {
      let result;

      if (organizationId) {
        result = await createAssociation(formData, userId, organizationId);
        if (result) {
          onSuccess?.(result);
          onClose();
          resetForm();
        }
      } else {
        result = await createDirectAssociation(formData);
        if (result.success) {
          onSuccess?.(result.association);
          onClose();
          resetForm();
        } else {
          setError(result.error || 'Eroare la crearea asociației');
        }
      }
    } catch (err) {
      setError(err.message || 'Eroare la crearea asociației');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle bg-white rounded-2xl shadow-xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Asociație nouă
                </h3>
                <p className="text-sm text-gray-500">
                  Completează datele asociației de proprietari
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error global */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Reutilizăm AssociationStep din onboarding */}
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <AssociationStep
              key={formKey}
              stepData={{}}
              onUpdateData={handleUpdateData}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={handleSubmit}
              disabled={creating || !associationData.isValid}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
