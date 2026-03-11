import React from 'react';
import { User, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { useOwnerContext } from '../OwnerApp';

/**
 * View Profil - Owner Portal
 *
 * Afișează informații profil owner + info apartament.
 * Read-only pentru moment.
 */
export default function OwnerProfileView() {
  const {
    apartmentNumber,
    apartmentData,
    associationName,
    associationData,
    ownerProfile
  } = useOwnerContext();

  const displayName = ownerProfile?.firstName && ownerProfile?.lastName
    ? `${ownerProfile.firstName} ${ownerProfile.lastName}`
    : ownerProfile?.firstName || apartmentData?.owner || 'Locatar';

  const initials = ownerProfile?.firstName
    ? ownerProfile.firstName.charAt(0).toUpperCase()
    : displayName.charAt(0).toUpperCase();

  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Profilul meu</h2>
        <p className="text-xs sm:text-sm text-gray-500">Informații cont și apartament</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-emerald-50 px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
            <p className="text-sm text-gray-500">Locatar</p>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-3">
          {ownerProfile?.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{ownerProfile.email}</p>
              </div>
            </div>
          )}
          {ownerProfile?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Telefon</p>
                <p className="text-sm text-gray-900">{ownerProfile.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apartment Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Apartament
          </h3>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-emerald-700 font-bold">{apartmentNumber}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Apartamentul {apartmentNumber}</p>
              <p className="text-xs text-gray-500">{associationName}</p>
            </div>
          </div>

          {associationData?.address && (
            <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Adresă</p>
                <p className="text-sm text-gray-900">
                  {typeof associationData.address === 'string'
                    ? associationData.address
                    : `${associationData.address.street || ''} ${associationData.address.number || ''}, ${associationData.address.city || ''}, ${associationData.address.county || ''}`
                  }
                </p>
              </div>
            </div>
          )}

          {apartmentData?.surface && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
              <span className="text-gray-500">Suprafață</span>
              <span className="font-medium text-gray-900">{apartmentData.surface} m²</span>
            </div>
          )}

          {apartmentData?.ownerName && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Proprietar</span>
              <span className="font-medium text-gray-900">{apartmentData.ownerName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
