import React, { useState } from 'react';
import { DoorOpen, MapPin, Users, LogOut, ChevronRight, Ruler, ChevronDown, User, BedDouble } from 'lucide-react';

const getRoleLabel = (role) => ({
  proprietar: 'Proprietar',
  chirias: 'Chiriaș',
  membru_familie: 'Membru familie',
  altul: 'Alt rol',
}[role] || 'Proprietar');

function PaymentStatusBadge({ remaining, totalDatorat }) {
  if (remaining === null || remaining === undefined || totalDatorat === null) return null;
  if (remaining === 0) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Plătit</span>;
  if (remaining < totalDatorat) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">Parțial plătit</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Neplătit</span>;
}

const getRoleStyle = (role) => ({
  proprietar: 'bg-emerald-100 text-emerald-700',
  chirias: 'bg-blue-100 text-blue-700',
  membru_familie: 'bg-purple-100 text-purple-700',
  altul: 'bg-gray-100 text-gray-700',
}[role] || 'bg-emerald-100 text-emerald-700');

/**
 * Selector pentru proprietari cu mai multe apartamente
 * Afișează toate apartamentele asociate email-ului și permite selectarea
 *
 * Pattern similar cu ContextSelectorView.js (admin), dar cu emerald theme
 */
export default function OwnerApartmentSelector({ apartments, onSelect, onLogout, userEmail, ownerProfile, onNavigateStandalone }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const displayName = ownerProfile
    ? `${ownerProfile.firstName || ''} ${ownerProfile.lastName || ''}`.trim() || userEmail
    : userEmail;
  const initials = (ownerProfile?.firstName?.[0] || userEmail?.[0] || '?').toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => dropdownOpen && setDropdownOpen(false)}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center">
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
                {onNavigateStandalone && (
                  <button
                    onClick={() => { setDropdownOpen(false); onNavigateStandalone('profile'); }}
                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <User className="w-4 h-4 mr-2 text-gray-500" />
                    Profilul meu
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Deconectare
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Bine ai venit!
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Ai acces la <strong>{apartments.length}</strong> {apartments.length === 1 ? 'apartament' : 'apartamente'}. Selectează unul pentru a continua.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {apartments.map((apt) => {
            const address = apt.associationData?.address;
            const blockName = apt.apartmentData?.blockName;
            const stairName = apt.apartmentData?.stairName;
            const addressStr = typeof address === 'string'
              ? address
              : address
                ? [
                    `${address.street || ''} ${address.number || ''}`.trim(),
                    blockName || null,
                    stairName || null,
                    address.city || '',
                    address.county || '',
                  ].filter(Boolean).join(', ')
                : null;

            const hasSurface = !!apt.apartmentData?.surface;
            const hasPersons = !!apt.apartmentData?.persons;
            const hasType = !!apt.apartmentData?.apartmentType;
            const hasStats = hasSurface || hasPersons || hasType;
            const statCols = [hasType, hasSurface, hasPersons].filter(Boolean).length;
            const ownerName = apt.apartmentData?.ownerName || apt.apartmentData?.owner;

            return (
              <div
                key={`${apt.associationId}-${apt.apartmentId}`}
                onClick={() => onSelect(apt)}
                className="bg-white rounded-xl border-2 border-gray-100 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 cursor-pointer border-l-[3px] border-l-emerald-500 p-4 sm:p-5"
              >
                {/* Card Header: icon + apt number + association + role badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <DoorOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                        Apartamentul {apt.apartmentNumber}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {apt.associationName || 'Asociație'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 mt-0.5 ${getRoleStyle(apt.role)}`}>
                    {getRoleLabel(apt.role)}
                  </span>
                </div>

                {/* Owner name */}
                {ownerName && (
                  <p className="text-sm text-gray-700 mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {ownerName}
                  </p>
                )}

                {/* Stats Grid - Tip first, then Suprafață, then Persoane */}
                {hasStats && (
                  <div className={`grid gap-2 mb-3 ${statCols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {hasType && (
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                          <BedDouble className="w-3 h-3" />
                          Tip
                        </p>
                        <p className="text-sm sm:text-base font-bold text-gray-900">{apt.apartmentData.apartmentType}</p>
                      </div>
                    )}
                    {hasSurface && (
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                          <Ruler className="w-3 h-3" />
                          Suprafață
                        </p>
                        <p className="text-sm sm:text-base font-bold text-gray-900">{apt.apartmentData.surface} m²</p>
                      </div>
                    )}
                    {hasPersons && (
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Persoane
                        </p>
                        <p className="text-sm sm:text-base font-bold text-gray-900">{apt.apartmentData.persons}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Întreținere curentă + status */}
                {apt.totalDatorat !== null && apt.totalDatorat !== undefined && (
                  <div className="rounded-lg border border-gray-100 p-3 mb-3 sm:mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Întreținere {apt.monthYear || ''}
                      </p>
                      <PaymentStatusBadge remaining={apt.paymentRemaining} totalDatorat={apt.totalDatorat} />
                    </div>
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {apt.totalDatorat.toFixed(2)} lei
                    </p>
                    {apt.paymentRemaining !== null && apt.paymentRemaining > 0 && apt.paymentRemaining < apt.totalDatorat && (
                      <p className="text-xs text-gray-500 mt-1">
                        Rămas: {apt.paymentRemaining.toFixed(2)} lei
                      </p>
                    )}
                  </div>
                )}

                {/* Address */}
                {addressStr && (
                  <div className="flex items-start text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-2">{addressStr}</span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100">
                  <span className="text-xs sm:text-sm text-gray-400">
                    Selectează apartamentul
                  </span>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Help text */}
        <div className="mt-4 sm:mt-8 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Nu vezi toate apartamentele tale? Contactează administratorul asociației pentru a te adăuga.
          </p>
        </div>
      </div>
    </div>
  );
}
