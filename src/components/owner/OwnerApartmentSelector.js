import React from 'react';
import { Building2, MapPin, Users, LogOut, ChevronRight, Ruler, Home } from 'lucide-react';

/**
 * Selector pentru proprietari cu mai multe apartamente
 * Afișează toate apartamentele asociate email-ului și permite selectarea
 *
 * Pattern similar cu ContextSelectorView.js (admin), dar cu emerald theme
 */
export default function OwnerApartmentSelector({ apartments, onSelect, onLogout, userEmail }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/blocapp-logo-locatari.png" alt="BlocApp" className="h-9 sm:h-10 object-contain" />
          </div>
          <button
            onClick={onLogout}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline text-sm">Deconectare</span>
          </button>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Bine ai venit!
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Ai acces la <strong>{apartments.length}</strong> {apartments.length === 1 ? 'apartament' : 'apartamente'}. Selectează unul pentru a continua.
          </p>
          {userEmail && (
            <p className="text-xs text-gray-500 mt-1">
              Conectat ca: {userEmail}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {apartments.map((apt) => {
            const address = apt.associationData?.address;
            const addressStr = typeof address === 'string'
              ? address
              : address
                ? `${address.street || ''} ${address.number || ''}, ${address.city || ''}, ${address.county || ''}`.trim()
                : null;

            return (
              <div
                key={`${apt.associationId}-${apt.apartmentId}`}
                onClick={() => onSelect(apt)}
                className="bg-white rounded-xl border-2 border-gray-100 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 cursor-pointer border-l-[3px] border-l-emerald-500 p-4 sm:p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-xl flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                      <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                        {apt.associationName || 'Asociație'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500">Proprietar</p>
                    </div>
                  </div>
                </div>

                {/* Apartment Number - prominent */}
                <div className="flex items-center gap-3 mb-3 sm:mb-4 px-1">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-700">{apt.apartmentNumber}</span>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">Apartamentul {apt.apartmentNumber}</p>
                    {apt.apartmentData?.ownerName && (
                      <p className="text-xs sm:text-sm text-gray-500">{apt.apartmentData.ownerName}</p>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                {(apt.apartmentData?.surface || apt.apartmentData?.persons) && (
                  <div className="grid grid-cols-2 gap-2 mb-3 sm:mb-4">
                    {apt.apartmentData?.surface && (
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                          <Ruler className="w-3 h-3" />
                          Suprafață
                        </p>
                        <p className="text-sm sm:text-base font-bold text-gray-900">{apt.apartmentData.surface} m²</p>
                      </div>
                    )}
                    {apt.apartmentData?.persons && (
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
