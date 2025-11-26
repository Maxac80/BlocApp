import React, { useState } from 'react';
import {
  CreditCard, Download, FileText, AlertCircle, Clock,
  CheckCircle, Wallet, Bell, Calendar, Receipt
} from 'lucide-react';
import { useOwnerContext } from '../OwnerApp';
import { useOwnerData, formatCurrency, formatDate, getPaymentStatusInfo } from '../../../hooks/useOwnerData';

/**
 * View pentru plăți - istoric și plată online (dummy)
 */
export default function OwnerPaymentsView() {
  const { apartmentId, associationId, apartmentNumber } = useOwnerContext();

  const {
    loading,
    error,
    maintenanceData,
    paymentHistory
  } = useOwnerData(associationId, apartmentId);

  // State pentru modal plată dummy
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Eroare la încărcare</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Calculează totaluri
  const totalPaidAllTime = paymentHistory.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPaymentsCount = paymentHistory.length;
  const currentDue = maintenanceData?.totalDatorat || 0;
  const currentPaid = maintenanceData?.totalPaid || 0;
  const currentRemaining = Math.max(0, currentDue - currentPaid);

  // Calculează breakdown pe categorii pentru toate plățile
  const totalRestantePaid = paymentHistory.reduce((sum, p) => sum + (p.restante || 0), 0);
  const totalIntretinerePaid = paymentHistory.reduce((sum, p) => sum + (p.intretinere || 0), 0);
  const totalPenalitatiPaid = paymentHistory.reduce((sum, p) => sum + (p.penalitati || 0), 0);

  // Date luna curentă
  const currentMaintenance = maintenanceData?.currentMaintenance || 0;
  const currentRestante = maintenanceData?.restante || 0;
  const currentPenalitati = maintenanceData?.penalitati || 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plăți</h1>
        <p className="text-gray-600">Istoricul plăților și plata online</p>
      </div>

      {/* Card Plată Online - DUMMY */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-emerald-100 text-sm">De plată luna curentă</p>
              <p className="text-3xl font-bold">{formatCurrency(currentRemaining)}</p>
            </div>
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-7 h-7" />
            </div>
          </div>

          {/* Breakdown pentru luna curentă */}
          {currentDue > 0 && (
            <div className="bg-white bg-opacity-10 rounded-xl p-3 mb-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between">
                  <span className="text-emerald-100">Întreținere:</span>
                  <span className="font-medium">{formatCurrency(currentMaintenance)}</span>
                </div>
                {currentRestante > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-100">Restanțe:</span>
                    <span className="font-medium">{formatCurrency(currentRestante)}</span>
                  </div>
                )}
                {currentPenalitati > 0 && (
                  <div className="flex justify-between">
                    <span className="text-emerald-100">Penalități:</span>
                    <span className="font-medium">{formatCurrency(currentPenalitati)}</span>
                  </div>
                )}
                {currentPaid > 0 && (
                  <div className="flex justify-between text-green-200">
                    <span>Achitat:</span>
                    <span className="font-medium">-{formatCurrency(currentPaid)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentRemaining > 0 ? (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full bg-white text-emerald-600 py-4 rounded-xl font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Plătește Online
            </button>
          ) : (
            <div className="bg-white bg-opacity-20 rounded-xl p-4 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Totul plătit - La zi!</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistici */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total plătit</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPaidAllTime)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nr. plăți</p>
              <p className="text-lg font-bold text-gray-900">{totalPaymentsCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Restanțe curente</p>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(currentRestante)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Penalități curente</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(currentPenalitati)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown pe categorii - Total plătit */}
      {totalPaymentsCount > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Distribuție plăți efectuate</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">Întreținere</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(totalIntretinerePaid)}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-600 mb-1">Restanțe</p>
              <p className="text-lg font-bold text-orange-700">{formatCurrency(totalRestantePaid)}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 mb-1">Penalități</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(totalPenalitatiPaid)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Istoric Plăți */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Istoric Plăți</h3>
        </div>

        {paymentHistory.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nicio plată încă</h3>
            <p className="text-gray-500">
              Plățile efectuate vor apărea aici automat.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paymentHistory.map((payment, index) => (
              <div
                key={payment.id || index}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Plată #{payment.receiptNumber || index + 1}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(payment.paymentDate)}
                        {payment.sheetMonth && ` • ${payment.sheetMonth}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(payment.total)}</p>
                    <button className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center mt-1">
                      <Download className="w-4 h-4 mr-1" />
                      Chitanță
                    </button>
                  </div>
                </div>

                {/* Breakdown plată */}
                {(payment.restante > 0 || payment.intretinere > 0 || payment.penalitati > 0) && (
                  <div className="mt-3 ml-14 flex flex-wrap gap-3 text-xs">
                    {payment.restante > 0 && (
                      <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                        Restanțe: {formatCurrency(payment.restante)}
                      </span>
                    )}
                    {payment.intretinere > 0 && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                        Întreținere: {formatCurrency(payment.intretinere)}
                      </span>
                    )}
                    {payment.penalitati > 0 && (
                      <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">
                        Penalități: {formatCurrency(payment.penalitati)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Plată Online - DUMMY */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Plată Online</h3>
              <p className="text-emerald-100 mt-1">Apartamentul {apartmentNumber}</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">În dezvoltare</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Funcționalitatea de plată online va fi disponibilă în curând.
                      Poți fi notificat când devine activă.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600">Sumă de plată:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(currentRemaining)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Include: întreținere, restanțe și penalități (dacă există)
                </p>
              </div>

              {/* Metode de plată preview */}
              <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-gray-700">Metode disponibile în curând:</p>
                <div className="flex items-center p-3 bg-gray-100 rounded-lg opacity-60">
                  <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-500">Card bancar (Visa, Mastercard)</span>
                </div>
                <div className="flex items-center p-3 bg-gray-100 rounded-lg opacity-60">
                  <Wallet className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-500">Transfer bancar</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setShowNotifyModal(true);
                }}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center"
              >
                <Bell className="w-5 h-5 mr-2" />
                Notifică-mă
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notificare - DUMMY */}
      {showNotifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Înregistrat cu succes!</h3>
            <p className="text-gray-600 mb-6">
              Vei primi o notificare când funcționalitatea de plată online devine disponibilă.
            </p>
            <button
              onClick={() => setShowNotifyModal(false)}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              Perfect, mulțumesc!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
