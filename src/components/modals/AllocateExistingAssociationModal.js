import React, { useState, useEffect } from 'react';
import {
  X,
  Home,
  Search,
  Check,
  MapPin,
  AlertCircle,
  Loader2,
  Link2
} from 'lucide-react';
import { useAssociations } from '../../hooks/useAssociations';
import { useUserProfile } from '../../hooks/useUserProfile';

/**
 * 🏠 MODAL ALOCARE ASOCIAȚIE EXISTENTĂ LA ORGANIZAȚIE
 *
 * Permite owner-ului să mute o asociație directă (fără firmă) în organizație.
 * Asociația va primi organizationId și va fi gestionată prin firmă.
 */
const AllocateExistingAssociationModal = ({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  userId,
  onSuccess
}) => {
  const { associations, loading: loadingAssociations, loadUserDirectAssociations, updateAssociation } = useAssociations(userId);
  const { removeDirectAssociation } = useUserProfile();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssociation, setSelectedAssociation] = useState(null);
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState(null);

  // Încarcă asociațiile directe ale utilizatorului
  useEffect(() => {
    if (isOpen && userId) {
      loadUserDirectAssociations(userId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  // Reset la închidere
  const handleClose = () => {
    setSearchTerm('');
    setSelectedAssociation(null);
    setError(null);
    onClose();
  };

  // Filtrare asociații care NU au deja organizationId
  const availableAssociations = (associations || []).filter(assoc => {
    // Doar asociațiile fără organizație
    if (assoc.organizationId) return false;

    // Filtrare după termen de căutare
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      assoc.name?.toLowerCase().includes(search) ||
      assoc.address?.city?.toLowerCase().includes(search) ||
      assoc.address?.county?.toLowerCase().includes(search)
    );
  });

  // Handler pentru alocare
  const handleAllocate = async () => {
    if (!selectedAssociation || !organizationId || !userId) return;

    setAllocating(true);
    setError(null);

    try {
      // 1. Actualizează asociația cu organizationId
      await updateAssociation(selectedAssociation.id, {
        organizationId: organizationId
      });

      // 2. Elimină asociația din directAssociations[] ale utilizatorului
      await removeDirectAssociation(userId, selectedAssociation.id);

      onSuccess?.(selectedAssociation);
      handleClose();
    } catch (err) {
      console.error('Error allocating association:', err);
      setError(err.message || 'Eroare la alocarea asociației');
    } finally {
      setAllocating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mr-3 flex-shrink-0">
              <Link2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                Alocă Asociație Existentă
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {organizationName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>ℹ️ Cum funcționează:</strong><br />
              Selectează o asociație pe care o administrezi direct pentru a o muta în această organizație.
              Asociația va fi gestionată prin firma "{organizationName}".
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Caută asociație..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Lista asociații */}
          {loadingAssociations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : availableAssociations.length === 0 ? (
            <div className="text-center py-8">
              <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {searchTerm ? 'Nicio asociație găsită' : 'Nu ai asociații disponibile'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm
                  ? 'Încearcă alt termen de căutare'
                  : 'Toate asociațiile tale sunt deja în organizații'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableAssociations.map(assoc => (
                <button
                  key={assoc.id}
                  onClick={() => setSelectedAssociation(
                    selectedAssociation?.id === assoc.id ? null : assoc
                  )}
                  className={`w-full flex items-center p-4 border-2 rounded-xl transition-all text-left ${
                    selectedAssociation?.id === assoc.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                    selectedAssociation?.id === assoc.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {selectedAssociation?.id === assoc.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Home className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      selectedAssociation?.id === assoc.id
                        ? 'text-emerald-900'
                        : 'text-gray-900'
                    }`}>
                      {assoc.name}
                    </p>
                    {(assoc.address?.city || assoc.address?.county) && (
                      <p className="text-sm text-gray-500 flex items-center mt-0.5">
                        <MapPin className="w-3 h-3 mr-1" />
                        {[assoc.address?.city, assoc.address?.county].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-center"
          >
            Anulează
          </button>
          <button
            onClick={handleAllocate}
            disabled={!selectedAssociation || allocating}
            className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allocating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Se alocă...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Alocă în Organizație</span>
                <span className="sm:hidden">Alocă</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllocateExistingAssociationModal;
