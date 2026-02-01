/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import {
  Building2,
  ArrowLeft,
  Save,
  AlertTriangle,
  Trash2,
  Users,
  Shield,
  CreditCard,
  Bell,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  ChevronRight,
  UserPlus,
  UserMinus,
  Crown,
  AlertCircle
} from 'lucide-react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import OrgHeader from '../common/OrgHeader';

/**
 * ⚙️ SETĂRI ORGANIZAȚIE
 *
 * Tabs:
 * - Informații generale (nume, CUI, adresă, contact)
 * - Owners (Founder Privilege Light)
 * - Setări default
 * - Billing
 * - Danger zone (ștergere)
 */
const OrganizationSettingsView = ({
  organizationId,
  userId,
  userProfile,
  activeUser,
  onBack,
  onBackToSelector,
  onDeleted
}) => {
  const {
    currentOrganization,
    loading,
    loadOrganization,
    updateOrganization,
    softDeleteOrganization,
    addOwner,
    removeOwner,
    transferFounderStatus
  } = useOrganizations(userId);

  const { hasPermission } = usePermissions(userId);

  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Add owner modal
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [newOwnerEmail, setNewOwnerEmail] = useState('');

  // Load organization data
  useEffect(() => {
    if (organizationId) {
      loadOrganization(organizationId);
    }
  }, [organizationId]);

  // Initialize form data when organization loads
  useEffect(() => {
    if (currentOrganization) {
      setFormData({
        name: currentOrganization.name || '',
        cui: currentOrganization.cui || '',
        registrationNumber: currentOrganization.registrationNumber || '',
        address: {
          street: currentOrganization.address?.street || '',
          number: currentOrganization.address?.number || '',
          city: currentOrganization.address?.city || '',
          county: currentOrganization.address?.county || '',
          zipCode: currentOrganization.address?.zipCode || ''
        },
        contact: {
          phone: currentOrganization.contact?.phone || '',
          email: currentOrganization.contact?.email || '',
          website: currentOrganization.contact?.website || ''
        },
        settings: {
          requirePresidentApproval: currentOrganization.settings?.requirePresidentApproval || false,
          defaultPenaltyEnabled: currentOrganization.settings?.defaultPenaltyEnabled || false,
          defaultPenaltyPercentage: currentOrganization.settings?.defaultPenaltyPercentage || 0.1,
          notifyOwnersOnChanges: currentOrganization.settings?.notifyOwnersOnChanges ?? true
        }
      });
    }
  }, [currentOrganization]);

  const isFounder = currentOrganization?.createdBy === userId;
  const isOwner = currentOrganization?.ownerIds?.includes(userId);

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateOrganization(organizationId, formData);
      setSuccess('Modificările au fost salvate cu succes!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== currentOrganization.name) {
      setError('Numele organizației nu se potrivește');
      return;
    }

    try {
      await softDeleteOrganization(organizationId, userId);
      onDeleted?.();
    } catch (err) {
      if (err.message === 'ONLY_FOUNDER_CAN_DELETE') {
        setError('Doar fondatorul poate șterge organizația');
      } else {
        setError(err.message);
      }
    }
  };

  const handleRemoveOwner = async (ownerIdToRemove) => {
    try {
      await removeOwner(organizationId, ownerIdToRemove, userId);
      await loadOrganization(organizationId);
    } catch (err) {
      if (err.message === 'CANNOT_REMOVE_FOUNDER') {
        setError('Fondatorul nu poate fi eliminat');
      } else if (err.message === 'CAN_ONLY_SELF_REMOVE') {
        setError('Poți elimina doar propriul tău cont');
      } else {
        setError(err.message);
      }
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'owners', label: 'Proprietari', icon: Crown },
    { id: 'settings', label: 'Setări', icon: Shield },
    { id: 'billing', label: 'Facturare', icon: CreditCard },
    { id: 'danger', label: 'Ștergere', icon: AlertTriangle }
  ];

  if (loading && !currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă setările...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Header */}
      <OrgHeader
        userProfile={userProfile}
        activeUser={activeUser}
        onLogoClick={onBackToSelector}
        showBackButton={true}
        onBack={onBack}
        backLabel={currentOrganization?.name}
      />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                Setări Organizație
              </h1>
              <p className="text-sm text-gray-500 truncate">
                {currentOrganization?.name}
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white sm:mr-2" />
              ) : (
                <Save className="w-4 h-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Salvează</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Eroare</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <Shield className="w-5 h-5 text-green-600 mr-3" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Mobile Horizontal Tabs */}
        <div className="md:hidden mb-4">
          <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              // Hide danger tab for non-founders
              if (tab.id === 'danger' && !isFounder) return null;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-shrink-0 flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
                    }
                    ${tab.id === 'danger' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
                  `}
                >
                  <Icon className={`w-4 h-4 mr-2 ${tab.id === 'danger' && !isActive ? 'text-red-500' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar Tabs */}
          <div className="hidden md:block w-48 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                // Hide danger tab for non-founders
                if (tab.id === 'danger' && !isFounder) return null;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                      ${tab.id === 'danger' ? 'text-red-600 hover:bg-red-50' : ''}
                    `}
                  >
                    <Icon className={`w-4 h-4 mr-3 ${tab.id === 'danger' && !isActive ? 'text-red-500' : ''}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Informații Generale
                  </h3>

                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nume organizație *
                      </label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange(null, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CUI
                        </label>
                        <input
                          type="text"
                          value={formData.cui || ''}
                          onChange={(e) => handleInputChange(null, 'cui', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nr. Registru Comerț
                        </label>
                        <input
                          type="text"
                          value={formData.registrationNumber || ''}
                          onChange={(e) => handleInputChange(null, 'registrationNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                    Adresă
                  </h3>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stradă
                        </label>
                        <input
                          type="text"
                          value={formData.address?.street || ''}
                          onChange={(e) => handleInputChange('address', 'street', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Număr
                        </label>
                        <input
                          type="text"
                          value={formData.address?.number || ''}
                          onChange={(e) => handleInputChange('address', 'number', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Oraș
                        </label>
                        <input
                          type="text"
                          value={formData.address?.city || ''}
                          onChange={(e) => handleInputChange('address', 'city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Județ
                        </label>
                        <input
                          type="text"
                          value={formData.address?.county || ''}
                          onChange={(e) => handleInputChange('address', 'county', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cod poștal
                        </label>
                        <input
                          type="text"
                          value={formData.address?.zipCode || ''}
                          onChange={(e) => handleInputChange('address', 'zipCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Phone className="w-5 h-5 mr-2 text-gray-400" />
                    Contact
                  </h3>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefon
                        </label>
                        <input
                          type="text"
                          value={formData.contact?.phone || ''}
                          onChange={(e) => handleInputChange('contact', 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.contact?.email || ''}
                          onChange={(e) => handleInputChange('contact', 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        value={formData.contact?.website || ''}
                        onChange={(e) => handleInputChange('contact', 'website', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Owners Tab */}
            {activeTab === 'owners' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Proprietari Organizație
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Proprietarii au acces complet la organizație și toate asociațiile.
                    </p>
                  </div>

                  {isFounder && (
                    <button
                      onClick={() => setShowAddOwner(true)}
                      className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex-shrink-0"
                    >
                      <UserPlus className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Adaugă proprietar</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {currentOrganization?.ownerIds?.map(ownerId => {
                    const isCurrentFounder = currentOrganization.createdBy === ownerId;
                    const isCurrentUser = ownerId === userId;

                    return (
                      <div
                        key={ownerId}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            {isCurrentFounder ? (
                              <Crown className="w-5 h-5 text-yellow-600" />
                            ) : (
                              <Users className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {ownerId}
                              {isCurrentUser && ' (Tu)'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {isCurrentFounder ? 'Fondator' : 'Proprietar'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isFounder && !isCurrentFounder && (
                            <button
                              onClick={() => handleRemoveOwner(ownerId)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Elimină proprietar"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}

                          {!isFounder && isCurrentUser && (
                            <button
                              onClick={() => handleRemoveOwner(ownerId)}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Părăsește organizația
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isFounder && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <Crown className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-yellow-800">Despre Fondator</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Ca fondator, ești singurul care poate șterge organizația și
                          elimina alți proprietari. Poți transfera statutul de fondator
                          către alt proprietar dacă dorești.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Setări Default
                </h3>

                <div className="space-y-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.settings?.requirePresidentApproval || false}
                      onChange={(e) => handleInputChange('settings', 'requirePresidentApproval', e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-900">
                        Necesită aprobare președinte
                      </span>
                      <p className="text-sm text-gray-500">
                        Listele de întreținere vor necesita aprobare înainte de publicare
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.settings?.defaultPenaltyEnabled || false}
                      onChange={(e) => handleInputChange('settings', 'defaultPenaltyEnabled', e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-900">
                        Penalități activate implicit
                      </span>
                      <p className="text-sm text-gray-500">
                        Asociațiile noi vor avea penalitățile activate implicit
                      </p>
                    </div>
                  </label>

                  {formData.settings?.defaultPenaltyEnabled && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Procent penalitate default (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={(formData.settings?.defaultPenaltyPercentage || 0) * 100}
                        onChange={(e) => handleInputChange('settings', 'defaultPenaltyPercentage', parseFloat(e.target.value) / 100)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.settings?.notifyOwnersOnChanges ?? true}
                      onChange={(e) => handleInputChange('settings', 'notifyOwnersOnChanges', e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-900">
                        Notificări pentru proprietari
                      </span>
                      <p className="text-sm text-gray-500">
                        Trimite notificări proprietarilor când se fac modificări importante
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Informații Facturare
                </h3>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="text-lg font-semibold text-gray-900 capitalize">
                        {currentOrganization?.billing?.status || 'Trial'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tier</p>
                      <p className="text-lg font-semibold text-gray-900 capitalize">
                        {currentOrganization?.billing?.tier || 'Starter'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Apartamente totale</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {currentOrganization?.billing?.totalApartments || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cost lunar</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {currentOrganization?.billing?.monthlyAmount || 0} RON
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Pentru modificări la planul de facturare, contactează-ne la{' '}
                  <a href="mailto:support@blocapp.ro" className="text-blue-600 hover:underline">
                    support@blocapp.ro
                  </a>
                </p>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && isFounder && (
              <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                    <div>
                      <h3 className="font-semibold text-red-800">Zonă periculoasă</h3>
                      <p className="text-sm text-red-700 mt-1">
                        Acțiunile de aici sunt ireversibile. Fii foarte atent!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-red-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Șterge organizația
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Ștergerea organizației va transfera toate asociațiile către administratorii
                    lor ca asociații directe. Membrii vor fi eliminați. Această acțiune este
                    ireversibilă.
                  </p>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Șterge organizația
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-700">
                        Pentru a confirma, scrie numele organizației:{' '}
                        <strong>{currentOrganization?.name}</strong>
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Numele organizației"
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                        >
                          Anulează
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={deleteConfirmText !== currentOrganization?.name}
                          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Confirmă ștergerea
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettingsView;
