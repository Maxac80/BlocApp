import React, { useState } from 'react';
import {
  Gauge, Droplets, Flame, Zap, Calendar, CheckCircle,
  AlertCircle, Clock, Send, History, Camera, Wifi
} from 'lucide-react';
// Note: Flame, Zap sunt folosite în getMeterStyle pentru gaz și electricitate
import { useOwnerContext } from '../OwnerApp';
import { useOwnerData, formatDate } from '../../../hooks/useOwnerData';

/**
 * Helper pentru a determina iconița și culoarea pentru un tip de contor
 */
const getMeterStyle = (meterType, meterName) => {
  const lowerName = (meterName || meterType || '').toLowerCase();

  if (lowerName.includes('rece') || lowerName.includes('cold')) {
    return { icon: Droplets, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
  }
  if (lowerName.includes('cald') || lowerName.includes('hot')) {
    return { icon: Droplets, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600' };
  }
  if (lowerName.includes('gaz') || lowerName.includes('gas')) {
    return { icon: Flame, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-600' };
  }
  if (lowerName.includes('electric') || lowerName.includes('curent')) {
    return { icon: Zap, color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' };
  }
  // Default
  return { icon: Gauge, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
};

/**
 * View pentru transmiterea indexurilor de contor
 */
export default function OwnerMetersView() {
  const { apartmentId, associationId, isDevMode } = useOwnerContext();

  const {
    loading,
    selectedMonth,
    currentSheet,
    meterReadings: meterHistory,      // Istoricul citirilor din Firebase
    availableMeters: metersFromHook,  // Contoarele disponibile din Firebase
    submitMeterReading,               // Funcția de salvare în Firebase
    submissionConfig                  // 📱 Configurația pentru transmitere
  } = useOwnerData(associationId, apartmentId);

  // State pentru valorile input de la utilizator
  const [inputReadings, setInputReadings] = useState({});

  // State pentru UI
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Procesează contoarele disponibile cu styling
  const availableMeters = metersFromHook.map(meter => {
    const style = getMeterStyle(meter.id, meter.name);
    return {
      ...meter,
      icon: style.icon,
      color: style.color,
      bgColor: style.bgColor,
      textColor: style.textColor
    };
  });

  // Handler pentru schimbare valoare
  const handleReadingChange = (meterId, value) => {
    // Permite doar numere și punct zecimal
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setInputReadings(prev => ({
        ...prev,
        [meterId]: value
      }));
    }
  };

  // Handler pentru trimitere
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validare minimă
    const readingsToSubmit = Object.entries(inputReadings).filter(([_, value]) => value !== '');
    if (readingsToSubmit.length === 0) {
      return;
    }

    setSubmitting(true);

    try {
      // Trimite fiecare index în Firebase
      const results = [];
      for (const [meterId, value] of readingsToSubmit) {
        // Găsește expenseId pentru acest contor
        const meter = availableMeters.find(m => m.id === meterId);
        if (!meter?.expenseId) {
          console.warn(`Nu s-a găsit expenseId pentru ${meterId}`);
          continue;
        }

        const result = await submitMeterReading(meterId, value, meter.expenseId, meter.name);
        results.push({ meterId, ...result });
      }

      // Verifică rezultatele
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        setSubmitError(`Eroare la transmitere: ${failures.map(f => f.message).join(', ')}`);
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setSubmitted(true);

      // Reset după 3 secunde
      setTimeout(() => {
        setSubmitted(false);
        setInputReadings({});
      }, 3000);

    } catch (err) {
      console.error('Eroare la transmitere:', err);
      setSubmitError(err.message || 'Eroare neașteptată la transmitere');
      setSubmitting(false);
    }
  };

  // 📱 Folosește submissionConfig din hook pentru status transmitere
  const isSubmissionOpen = submissionConfig?.isOpen ?? false;
  const daysLeft = submissionConfig?.daysLeft ?? 0;
  const workingMonth = currentSheet?.monthYear || selectedMonth || 'Luna curentă';

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-emerald-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contoare</h1>
          <p className="text-sm sm:text-base text-gray-600">Transmite indexurile lunare</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
            showHistory
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <History className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
          Istoric
        </button>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl shadow-lg overflow-hidden ${
        isSubmissionOpen ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-gray-500 to-gray-600'
      }`}>
        <div className="p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                <Gauge className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm opacity-80">Perioada de transmitere</p>
                <p className="text-lg sm:text-xl font-bold capitalize">
                  {workingMonth}
                </p>
              </div>
            </div>
            <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${
              isSubmissionOpen ? 'bg-green-400' : 'bg-gray-400'
            } bg-opacity-30`}>
              {isSubmissionOpen ? (
                <span className="flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Deschisă
                </span>
              ) : (
                <span className="flex items-center">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Închisă
                </span>
              )}
            </div>
          </div>

          {isSubmissionOpen && daysLeft !== null && (
            <div className="bg-white bg-opacity-10 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 opacity-80" />
                  <span className="opacity-90">
                    {submissionConfig?.periodType === 'manual'
                      ? submissionConfig?.deadline
                      : `Termen: ${submissionConfig?.endDay || 25} ${workingMonth?.split(' ')[0] || ''}`
                    }
                  </span>
                </div>
                {submissionConfig?.periodType !== 'manual' && (
                  <span className="font-bold">
                    {daysLeft === 0 ? 'Ultima zi!' : `${daysLeft} zile rămase`}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Istoric sau Formular */}
      {showHistory ? (
        /* Istoric Transmisii */
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-3 sm:p-4 border-b border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Istoric Citiri Contoare</h3>
          </div>

          {meterHistory.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <History className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Nicio citire</h3>
              <p className="text-sm sm:text-base text-gray-500">Nu există încă citiri de contoare înregistrate.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {meterHistory.map((entry, index) => (
                <div key={index} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900 capitalize">{entry.month}</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {entry.meters?.length || 0} contor(e)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-10 sm:ml-13 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {entry.meters?.map((meter, mIdx) => {
                      const style = getMeterStyle(meter.type, meter.name);
                      const Icon = style.icon;
                      const isOnline = meter.source === 'owner_portal';

                      return (
                        <div
                          key={mIdx}
                          className={`flex items-center p-2 sm:p-3 rounded-lg ${
                            style.color === 'blue' ? 'bg-blue-50' :
                            style.color === 'red' ? 'bg-red-50' :
                            style.color === 'orange' ? 'bg-orange-50' :
                            style.color === 'yellow' ? 'bg-yellow-50' :
                            'bg-gray-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 ${style.textColor}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {meter.name}
                              </p>
                              {isOnline && (
                                <span className="flex items-center px-1 sm:px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] sm:text-xs">
                                  <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                                  Online
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
                              <span>{meter.oldIndex} → {meter.newIndex} {meter.unit}</span>
                              <span className="text-emerald-600 font-medium">
                                (+{meter.consumption?.toFixed(2) || (meter.newIndex - meter.oldIndex).toFixed(2)})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Formular Transmitere */
        <>
          {/* Success Message */}
          {submitted && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 text-center">
              <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-bold text-green-800 mb-2">Indexuri transmise!</h3>
              <p className="text-sm sm:text-base text-green-600">
                Indexurile au fost salvate. Administratorul le va folosi în calculul întreținerii.
              </p>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-red-800">Eroare la transmitere</p>
                  <p className="text-xs sm:text-sm text-red-600 mt-1">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          {/* No Meters Available */}
          {availableMeters.length === 0 && !submitted && (
            <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center">
              <Gauge className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Niciun contor disponibil</h3>
              <p className="text-sm sm:text-base text-gray-500">
                Nu există contoare configurate pentru acest apartament în luna curentă.
                Contactează administratorul pentru mai multe detalii.
              </p>
            </div>
          )}

          {/* Form Card */}
          {!submitted && availableMeters.length > 0 && (
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Transmite Indexuri</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Introdu valorile citite de pe contoarele tale
                  </p>
                </div>

                <div className="p-3 sm:p-6">
                  {/* Meter Inputs - Grid 2 coloane */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {availableMeters.map((meter) => {
                      const Icon = meter.icon;
                      const reading = inputReadings[meter.id] || '';
                      const isValid = reading === '' || parseFloat(reading) >= (parseFloat(meter.lastReading) || 0);

                      return (
                        <div
                          key={meter.id}
                          className={`p-3 sm:p-4 rounded-xl border-2 transition-colors ${
                            reading && !isValid
                              ? 'border-red-300 bg-red-50'
                              : reading
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          {/* Header cu icon și index anterior */}
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mr-2 sm:mr-3 ${meter.bgColor}`}>
                                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${meter.textColor}`} />
                              </div>
                              <div>
                                <p className="text-sm sm:text-base font-medium text-gray-900">{meter.name}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">
                                  ID: {meter.id?.substring(0, 15)}...
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] sm:text-xs text-gray-500">Index anterior</p>
                              <p className="text-sm sm:text-base font-medium text-gray-700">{meter.lastReading ?? 0} {meter.unit}</p>
                            </div>
                          </div>

                          {/* Input pentru index nou */}
                          <div className="relative mb-2 sm:mb-3">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={reading}
                              onChange={(e) => handleReadingChange(meter.id, e.target.value)}
                              placeholder={`Ex: ${((parseFloat(meter.lastReading) || 0) + 3.5).toFixed(1)}`}
                              disabled={!isSubmissionOpen || submitting}
                              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-lg text-base sm:text-lg font-medium text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                                !isSubmissionOpen || submitting ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                              } ${
                                reading && !isValid ? 'border-red-300' : 'border-gray-200'
                              }`}
                            />
                            <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-gray-400 font-medium">
                              {meter.unit}
                            </span>
                          </div>

                          {/* Eroare validare */}
                          {reading && !isValid && (
                            <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-red-600 flex items-center">
                              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                              Index prea mic
                            </p>
                          )}

                          {/* Photo Upload Placeholder - per contor */}
                          <button
                            type="button"
                            disabled
                            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border border-dashed border-gray-300 rounded-lg text-xs sm:text-sm text-gray-500 hover:bg-gray-50 cursor-not-allowed"
                          >
                            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Adaugă poză</span>
                            <span className="text-[10px] sm:text-xs text-gray-400">(în curând)</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="p-3 sm:p-6 bg-gray-50 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={!isSubmissionOpen || submitting || !Object.values(inputReadings).some(v => v !== '')}
                    className="w-full bg-emerald-600 text-white py-3 sm:py-4 rounded-xl text-sm sm:text-base font-semibold hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                        Se transmite...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        Transmite Indexuri
                      </>
                    )}
                  </button>

                  {!isSubmissionOpen && (
                    <p className="text-center text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3">
                      {submissionConfig?.reason
                        ? submissionConfig.reason
                        : `Perioada de transmitere este închisă. Interval: ${submissionConfig?.deadline || '1-25 ale lunii'}`
                      }
                    </p>
                  )}
                </div>
              </div>
            </form>
          )}
        </>
      )}

      {/* Dev Mode Notice */}
      {isDevMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-amber-800">
              <strong>Mod development:</strong> Transmiterile nu sunt salvate în baza de date.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
