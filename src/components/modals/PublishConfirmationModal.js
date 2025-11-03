// src/components/modals/PublishConfirmationModal.js
import React from 'react';
import { X, CheckCircle, AlertCircle, Calendar, FileText, Users } from 'lucide-react';

const PublishConfirmationModal = ({
  show,
  onClose,
  onConfirm,
  monthYear,
  association,
  validationResult,
  totalsValidation,
  expenseCount,
  apartmentCount,
  totalMaintenance
}) => {
  if (!show) return null;

  const hasErrors = validationResult?.errors && validationResult.errors.length > 0;
  const hasWarnings = validationResult?.warnings && validationResult.warnings.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Confirmare Publicare Lună
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Rezumat publicare */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Rezumat Publicare</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Luna */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Luna</span>
                </div>
                <p className="text-lg font-bold text-blue-900">{monthYear}</p>
              </div>

              {/* Asociație */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Asociație</span>
                </div>
                <p className="text-lg font-bold text-green-900">{association?.name || 'N/A'}</p>
              </div>

              {/* Cheltuieli */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-700 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Cheltuieli</span>
                </div>
                <p className="text-lg font-bold text-orange-900">{expenseCount || 0}</p>
              </div>

              {/* Apartamente */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-700 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Apartamente</span>
                </div>
                <p className="text-lg font-bold text-purple-900">{apartmentCount || 0}</p>
              </div>
            </div>

            {/* Verificare totale */}
            {totalsValidation && (
              <div className={`border rounded-lg p-4 ${
                totalsValidation.match
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {totalsValidation.match ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Validare Totale: OK ✓</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-800">Validare Totale: EROARE</span>
                    </>
                  )}
                </div>
                <div className="text-sm space-y-1">
                  <p className={totalsValidation.match ? 'text-green-700' : 'text-red-700'}>
                    <strong>Total Cheltuieli:</strong> {totalsValidation.totalCheltuieli} RON
                  </p>
                  <p className={totalsValidation.match ? 'text-green-700' : 'text-red-700'}>
                    <strong>Total Tabel:</strong> {totalsValidation.totalTabel} RON
                  </p>
                  {!totalsValidation.match && (
                    <p className="text-red-800 font-bold">
                      <strong>Diferență:</strong> {totalsValidation.diferenta} RON
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Consecințe publicare */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Ce se întâmplă la publicare?</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">
                  <strong>Sheet-ul devine read-only</strong> - nu se mai pot face editări (apartamente, cheltuieli, configurări)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">
                  <strong>Se poate începe colectarea plăților</strong> - butonul "Încasează" devine activ în Dashboard
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">
                  <strong>Se creează automat luna următoare</strong> - gata pentru configurare cheltuieli noi
                </p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {hasWarnings && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Avertismente
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                {validationResult.warnings.map((warning, index) => (
                  <p key={index} className="text-sm text-yellow-800">
                    • {warning.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {hasErrors && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Erori Critice
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                {validationResult.errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-800">
                    • {error.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Data publicării */}
          <div className="text-center text-sm text-gray-600 mb-4">
            <p>Data publicării: <strong>{new Date().toLocaleDateString('ro-RO', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</strong></p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={onConfirm}
            disabled={hasErrors}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              hasErrors
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
            }`}
          >
            {hasErrors ? 'Nu se poate publica' : '✓ Confirmă Publicarea'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishConfirmationModal;
