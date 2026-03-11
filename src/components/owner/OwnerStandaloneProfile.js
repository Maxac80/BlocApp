import React, { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, DoorOpen, Camera, ChevronDown, LogOut, User, Pencil, Check, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Pagina standalone de profil pentru Portal Locatari
 * Afișată în afara layout-ului cu sidebar, similar cu ProfileView standalone din admin.
 * Primește datele ca props (nu folosește OwnerContext).
 */
export default function OwnerStandaloneProfile({ ownerProfile, selectedApartment, onBack, onLogout, userEmail, onProfileUpdated }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    firstName: ownerProfile?.firstName || '',
    lastName: ownerProfile?.lastName || '',
    phone: ownerProfile?.phone || '',
  });
  const [saveError, setSaveError] = useState(null);

  const displayName = ownerProfile?.firstName && ownerProfile?.lastName
    ? `${ownerProfile.firstName} ${ownerProfile.lastName}`.trim()
    : ownerProfile?.firstName || ownerProfile?.lastName || 'Locatar';
  const initials = (ownerProfile?.firstName?.[0] || userEmail?.[0] || 'L').toUpperCase();

  const apt = selectedApartment;
  const address = apt?.associationData?.address;
  const addressStr = address
    ? typeof address === 'string'
      ? address
      : `${address.street || ''} ${address.number || ''}, ${address.city || ''}, ${address.county || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
    : null;

  const handleStartEdit = () => {
    setEditData({
      firstName: ownerProfile?.firstName || '',
      lastName: ownerProfile?.lastName || '',
      phone: ownerProfile?.phone || '',
    });
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!ownerProfile?.id) {
      setSaveError('Nu s-a putut salva - ID profil lipsă.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateDoc(doc(db, 'owners', ownerProfile.id), {
        firstName: editData.firstName.trim(),
        lastName: editData.lastName.trim(),
        phone: editData.phone.trim(),
      });
      onProfileUpdated?.({
        firstName: editData.firstName.trim(),
        lastName: editData.lastName.trim(),
        phone: editData.phone.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('[OwnerProfile] Save error:', err);
      setSaveError('Eroare la salvare. Încearcă din nou.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => dropdownOpen && setDropdownOpen(false)}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Înapoi</span>
            </button>
            <img src="/blocapp-logo-locatari.png" alt="BlocApp" className="h-9 sm:h-10 object-contain" />
          </div>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
            >
              <div className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[150px] truncate">{displayName}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 hidden sm:block transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Deconectare
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Profilul meu</h2>
          <p className="text-sm text-gray-500">Informații cont și apartament</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Avatar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Fotografia ta
                </h3>
              </div>
              <div className="px-4 sm:px-6 py-6 flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {initials}
                  </div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                    <Camera className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">JPG, PNG până la 2MB</p>
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg border border-emerald-200 opacity-50 cursor-not-allowed"
                >
                  <Camera className="w-4 h-4" />
                  Adaugă foto
                </button>
              </div>
            </div>
          </div>

          {/* Right: Info + Apartment */}
          <div className="lg:col-span-2 space-y-4">
            {/* Personal info */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Date personale</h3>
                {!isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editează
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Anulează
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {saving ? 'Se salvează...' : 'Salvează'}
                    </button>
                  </div>
                )}
              </div>

              <div className="px-4 sm:px-6 py-5 space-y-4">
                {saveError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Prenume</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.firstName}
                        onChange={(e) => setEditData(d => ({ ...d, firstName: e.target.value }))}
                        className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Prenume"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2">
                        {ownerProfile?.firstName || <span className="text-gray-400 italic">—</span>}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nume</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.lastName}
                        onChange={(e) => setEditData(d => ({ ...d, lastName: e.target.value }))}
                        className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Nume"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2">
                        {ownerProfile?.lastName || <span className="text-gray-400 italic">—</span>}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </p>
                    {/* Email is always read-only */}
                    <p className="text-sm font-medium text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      {ownerProfile?.email || userEmail}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Telefon
                    </p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => setEditData(d => ({ ...d, phone: e.target.value }))}
                        className="w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="07xx xxx xxx"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2">
                        {ownerProfile?.phone || <span className="text-gray-400 italic">—</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Apartment Card */}
            {apt && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <DoorOpen className="w-4 h-4" />
                    Apartament
                  </h3>
                </div>
                <div className="px-4 sm:px-6 py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 font-bold">{apt.apartmentNumber}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Apartamentul {apt.apartmentNumber}</p>
                      <p className="text-xs text-gray-500">{apt.associationName}</p>
                    </div>
                  </div>
                  {addressStr && (
                    <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Adresă</p>
                        <p className="text-sm text-gray-900">{addressStr}</p>
                      </div>
                    </div>
                  )}
                  {apt.apartmentData?.surface && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
                      <span className="text-gray-500">Suprafață</span>
                      <span className="font-medium text-gray-900">{apt.apartmentData.surface} m²</span>
                    </div>
                  )}
                  {(apt.apartmentData?.ownerName || apt.apartmentData?.owner) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Proprietar</span>
                      <span className="font-medium text-gray-900">{apt.apartmentData.ownerName || apt.apartmentData.owner}</span>
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
}
