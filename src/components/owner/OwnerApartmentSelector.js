import React from 'react';
import { Building2, MapPin, Users, LogOut, ArrowRight } from 'lucide-react';

/**
 * Selector pentru proprietari cu mai multe apartamente
 * Afișează toate apartamentele asociate email-ului și permite selectarea
 */
export default function OwnerApartmentSelector({ apartments, onSelect, onLogout, userEmail }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mr-2 sm:mr-3">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">BlocApp</h1>
              <p className="text-[10px] sm:text-xs text-gray-500">Portal Proprietari</p>
            </div>
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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Welcome message */}
        <div className="text-center mb-4 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            Bine ai venit!
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Ai acces la <strong>{apartments.length}</strong> apartamente. Selectează unul pentru a continua.
          </p>
          {userEmail && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Conectat ca: {userEmail}
            </p>
          )}
        </div>

        {/* Apartments grid */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {apartments.map((apt, index) => (
            <button
              key={`${apt.associationId}-${apt.apartmentId}`}
              onClick={() => onSelect(apt)}
              className="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 p-4 sm:p-6 text-left group border-2 border-transparent hover:border-emerald-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Association name */}
                  <div className="flex items-center text-emerald-600 mb-1.5 sm:mb-2">
                    <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium truncate">
                      {apt.associationName || 'Asociație'}
                    </span>
                  </div>

                  {/* Apartment number - main highlight */}
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Ap. {apt.apartmentNumber}
                  </h3>

                  {/* Details */}
                  <div className="space-y-0.5 sm:space-y-1">
                    {apt.associationData?.address && (
                      <div className="flex items-center text-gray-500 text-xs sm:text-sm">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                        <span className="truncate">{apt.associationData.address}</span>
                      </div>
                    )}
                    {apt.apartmentData?.ownerName && (
                      <div className="flex items-center text-gray-500 text-xs sm:text-sm">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                        <span className="truncate">{apt.apartmentData.ownerName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-emerald-500 transition-colors ml-3 sm:ml-4 flex-shrink-0">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
              </div>

              {/* Bottom indicator */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] sm:text-xs text-gray-400">
                  Click pentru a selecta
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Deschide
                </span>
              </div>
            </button>
          ))}
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
