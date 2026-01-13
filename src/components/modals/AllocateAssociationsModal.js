import React, { useState, useEffect } from 'react';
import {
  X,
  Home,
  Search,
  Check,
  Square,
  CheckSquare,
  Building2,
  Users,
  MapPin,
  AlertCircle,
  Save
} from 'lucide-react';

/**
 * 🏠 MODAL ALOCARE ASOCIAȚII LA MEMBRU
 *
 * Features:
 * - Lista toate asociațiile organizației
 * - Selectare multiplă
 * - Căutare
 * - Afișare asociații deja alocate
 * - Salvare modificări
 */
const AllocateAssociationsModal = ({
  isOpen,
  onClose,
  member,
  organizationAssociations = [],
  onSave,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssociations, setSelectedAssociations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Inițializează cu asociațiile deja alocate
  useEffect(() => {
    if (member?.assignedAssociations) {
      setSelectedAssociations([...member.assignedAssociations]);
    } else {
      setSelectedAssociations([]);
    }
  }, [member]);

  // Reset la închidere
  const handleClose = () => {
    setSearchTerm('');
    setError(null);
    onClose();
  };

  // Filtrare asociații
  const filteredAssociations = organizationAssociations.filter(assoc => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      assoc.name?.toLowerCase().includes(search) ||
      assoc.address?.city?.toLowerCase().includes(search) ||
      assoc.address?.street?.toLowerCase().includes(search)
    );
  });

  // Toggle selectare
  const toggleAssociation = (assocId) => {
    setSelectedAssociations(prev => {
      if (prev.includes(assocId)) {
        return prev.filter(id => id !== assocId);
      } else {
        return [...prev, assocId];
      }
    });
  };

  // Selectare toate / deselectare toate
  const toggleAll = () => {
    if (selectedAssociations.length === filteredAssociations.length) {
      setSelectedAssociations([]);
    } else {
      setSelectedAssociations(filteredAssociations.map(a => a.id));
    }
  };

  // Handler salvare
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await onSave(member.id, selectedAssociations);
      handleClose();
    } catch (err) {
      console.error('Error saving allocations:', err);
      setError('A apărut o eroare la salvarea alocărilor');
    } finally {
      setSaving(false);
    }
  };

  // Calculează modificările
  const getChanges = () => {
    const original = member?.assignedAssociations || [];
    const added = selectedAssociations.filter(id => !original.includes(id));
    const removed = original.filter(id => !selectedAssociations.includes(id));
    return { added, removed, hasChanges: added.length > 0 || removed.length > 0 };
  };

  const changes = getChanges();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mr-3">
              <Home className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Alocă Asociații
              </h2>
              <p className="text-sm text-gray-500">
                {member?.name || member?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Caută asociații..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Stats + Select all */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-gray-500">
              {selectedAssociations.length} din {organizationAssociations.length} selectate
            </p>
            <button
              onClick={toggleAll}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {selectedAssociations.length === filteredAssociations.length
                ? 'Deselectează toate'
                : 'Selectează toate'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Lista asociații */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredAssociations.length === 0 ? (
            <div className="text-center py-12">
              <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {organizationAssociations.length === 0
                  ? 'Nu există asociații în această organizație'
                  : 'Nicio asociație găsită'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssociations.map(assoc => {
                const isSelected = selectedAssociations.includes(assoc.id);
                const wasOriginallySelected = member?.assignedAssociations?.includes(assoc.id);
                const isNew = isSelected && !wasOriginallySelected;
                const isRemoved = !isSelected && wasOriginallySelected;

                return (
                  <div
                    key={assoc.id}
                    onClick={() => toggleAssociation(assoc.id)}
                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isRemoved ? 'opacity-50' : ''}`}
                  >
                    {/* Checkbox */}
                    <div className="mr-4">
                      {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                      isSelected ? 'bg-emerald-200' : 'bg-gray-100'
                    }`}>
                      <Building2 className={`w-5 h-5 ${
                        isSelected ? 'text-emerald-700' : 'text-gray-500'
                      }`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h4 className="font-medium text-gray-900 truncate">
                          {assoc.name}
                        </h4>
                        {isNew && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Nou
                          </span>
                        )}
                        {isRemoved && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            De eliminat
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        {assoc.address && (
                          <span className="flex items-center truncate">
                            <MapPin className="w-3 h-3 mr-1" />
                            {assoc.address.street} {assoc.address.number}, {assoc.address.city}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center text-sm text-gray-400 ml-4">
                      <Users className="w-4 h-4 mr-1" />
                      {assoc.stats?.totalApartments || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer cu rezumat modificări */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          {/* Rezumat modificări */}
          {changes.hasChanges && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Modificări de salvat:</strong>
                {changes.added.length > 0 && (
                  <span className="ml-2 text-green-600">
                    +{changes.added.length} noi
                  </span>
                )}
                {changes.removed.length > 0 && (
                  <span className="ml-2 text-red-600">
                    -{changes.removed.length} eliminate
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !changes.hasChanges}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Se salvează...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvează Alocările
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocateAssociationsModal;
