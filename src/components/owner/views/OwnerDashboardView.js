/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import {
  TrendingUp, Users, Home, FileText, Download,
  AlertCircle, CheckCircle, Clock, X, ChevronDown, Flame
} from 'lucide-react';
import { useOwnerContext } from '../OwnerApp';
import { useOwnerData, formatCurrency, getPaymentStatusInfo } from '../../../hooks/useOwnerData';

/**
 * Dashboard pentru proprietar - vizualizare situație curentă
 */
export default function OwnerDashboardView({ onNavigate }) {
  const {
    apartmentId,
    apartmentNumber,
    apartmentData,
    associationId
  } = useOwnerContext();

  const {
    loading,
    error,
    maintenanceData,
    selectedMonth,
    availableMonths,
    switchMonth,
    expenseDetails: realExpenseDetails,
    getExpenseDetailsForMonth,
    paymentHistory
  } = useOwnerData(associationId, apartmentId);

  // State pentru modale
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPdfMessage, setShowPdfMessage] = useState(false);
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-emerald-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4 sm:p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Eroare la încărcare</h2>
          <p className="text-gray-600 text-sm sm:text-base">{error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!maintenanceData) {
    return (
      <div className="flex items-center justify-center h-full p-4 sm:p-6">
        <div className="text-center max-w-md">
          <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">În așteptare</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Nu există încă date de întreținere pentru acest apartament.
            Administratorul va publica în curând situația lunară.
          </p>
        </div>
      </div>
    );
  }

  // Calculează status plată
  const totalDue = maintenanceData.totalDatorat || 0;
  const totalPaid = maintenanceData.totalPaid || 0;
  const remaining = Math.max(0, totalDue - totalPaid);
  const paymentPercentage = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0;

  const paymentStatus = totalPaid >= totalDue
    ? 'paid'
    : totalPaid > 0 ? 'partial' : 'unpaid';
  const statusInfo = getPaymentStatusInfo(paymentStatus);

  // Componente breakdown
  const restante = maintenanceData.restante || 0;
  const currentMaintenance = maintenanceData.currentMaintenance || 0;
  const penalitati = maintenanceData.penalitati || 0;

  // Folosește datele reale de cheltuieli sau cele pentru luna selectată
  const expenseDetails = selectedMonth
    ? (getExpenseDetailsForMonth(selectedMonth).length > 0
        ? getExpenseDetailsForMonth(selectedMonth)
        : realExpenseDetails)
    : realExpenseDetails;

  // Calculează plățile pentru luna selectată
  const currentMonthPayments = paymentHistory?.filter(p => p.sheetMonth === selectedMonth) || [];
  const totalIncasatIntretinere = currentMonthPayments.reduce((sum, p) => sum + (p.intretinere || 0), 0);
  const totalIncasatRestante = currentMonthPayments.reduce((sum, p) => sum + (p.restante || 0), 0);
  const totalIncasatPenalitati = currentMonthPayments.reduce((sum, p) => sum + (p.penalitati || 0), 0);
  const totalIncasat = currentMonthPayments.reduce((sum, p) => sum + (p.total || 0), 0);

  // Handler pentru descărcare PDF
  const handleDownloadPdf = () => {
    setShowPdfMessage(true);
    setTimeout(() => setShowPdfMessage(false), 3000);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header cu luna curentă + selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {selectedMonth || 'Luna curentă'}
          </p>
        </div>

        {/* Selector lună */}
        {availableMonths.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowMonthSelector(!showMonthSelector)}
              className="flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs sm:text-sm font-medium text-gray-700 mr-1.5 sm:mr-2">
                {selectedMonth || 'Selectează luna'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 transition-transform ${showMonthSelector ? 'rotate-180' : ''}`} />
            </button>

            {showMonthSelector && (
              <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                {availableMonths.map((month) => (
                  <button
                    key={month}
                    onClick={() => {
                      switchMonth(month);
                      setShowMonthSelector(false);
                    }}
                    className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors ${
                      month === selectedMonth
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {month}
                    {month === selectedMonth && (
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline ml-2 text-emerald-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Principal - Total de Plată */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
        {/* Header cu gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm">Total de plată</p>
              <p className="text-2xl sm:text-4xl font-bold">{formatCurrency(totalDue)}</p>
            </div>
            <div className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm ${
              paymentStatus === 'paid' ? 'bg-green-400' :
              paymentStatus === 'partial' ? 'bg-orange-400' : 'bg-red-400'
            } bg-opacity-30`}>
              <span className="font-medium">
                {paymentStatus === 'paid' && <CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 inline mr-0.5 sm:mr-1" />}
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 sm:mt-4">
            <div className="flex justify-between text-xs sm:text-sm text-emerald-100 mb-1.5 sm:mb-2">
              <span>Plătit: {formatCurrency(totalPaid)}</span>
              <span>{paymentPercentage}%</span>
            </div>
            <div className="h-2 sm:h-3 bg-emerald-400 bg-opacity-30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${paymentPercentage}%` }}
              />
            </div>
            {remaining > 0 && (
              <p className="text-emerald-100 text-xs sm:text-sm mt-1.5 sm:mt-2">
                Rămas de plată: {formatCurrency(remaining)}
              </p>
            )}
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">
            Componente
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {/* Restanțe */}
            {restante > 0 && (
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full mr-2 sm:mr-3"></div>
                  <span className="text-gray-700 text-sm sm:text-base">Restanțe</span>
                </div>
                <span className="font-semibold text-red-600 text-sm sm:text-base">{formatCurrency(restante)}</span>
              </div>
            )}

            {/* Întreținere curentă */}
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full mr-2 sm:mr-3"></div>
                <span className="text-gray-700 text-sm sm:text-base">Întreținere {selectedMonth}</span>
              </div>
              <span className="font-semibold text-blue-600 text-sm sm:text-base">{formatCurrency(currentMaintenance)}</span>
            </div>

            {/* Total Întreținere (Restanțe + Întreținere curentă) */}
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-indigo-500 rounded-full mr-2 sm:mr-3"></div>
                <span className="text-gray-700 font-medium text-sm sm:text-base">Total Întreținere</span>
              </div>
              <span className="font-bold text-indigo-600 text-sm sm:text-base">{formatCurrency(restante + currentMaintenance)}</span>
            </div>

            {/* Penalități */}
            {penalitati > 0 && (
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-orange-500 rounded-full mr-2 sm:mr-3"></div>
                  <span className="text-gray-700 text-sm sm:text-base">Penalități</span>
                </div>
                <span className="font-semibold text-orange-600 text-sm sm:text-base">{formatCurrency(penalitati)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => setShowDetailsModal(true)}
            className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-medium text-sm sm:text-base hover:bg-emerald-700 transition-colors"
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Vezi Detalii
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm sm:text-base hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Descarcă PDF
          </button>
        </div>

        {/* Toast PDF */}
        {showPdfMessage && (
          <div className="px-4 sm:px-6 pb-3 sm:pb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-3 flex items-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-amber-800">
                Funcționalitatea PDF va fi disponibilă în curând.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card Info Apartament */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
          <Home className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-emerald-600" />
          La o privire
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          {/* Persoane */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1.5 sm:mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {apartmentData?.persons || maintenanceData.persons || 0}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">Persoane</p>
          </div>

          {/* Suprafață */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
            <Home className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1.5 sm:mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {apartmentData?.surface || '-'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">mp</p>
          </div>

          {/* Cotă parte */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1.5 sm:mb-2" />
            <p className="text-lg sm:text-xl font-bold text-gray-900">
              {apartmentData?.cotaParte
                ? `${apartmentData.cotaParte.toFixed(4)}%`
                : '-'}
            </p>
            {apartmentData?.surface && apartmentData?.totalStairSurface ? (
              <p className="text-[10px] sm:text-xs text-gray-500">
                ({apartmentData.surface} / {apartmentData.totalStairSurface.toFixed(2)} mp)
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500">Cotă parte</p>
            )}
          </div>

          {/* Tip apartament */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
            <Home className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1.5 sm:mb-2" />
            <p className="text-base sm:text-lg font-bold text-gray-900">
              {maintenanceData?.apartmentType || apartmentData?.apartmentType || '-'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">Tip</p>
          </div>

          {/* Sursa încălzire */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1.5 sm:mb-2" />
            <p className="text-xs sm:text-sm font-bold text-gray-900">
              {apartmentData?.heatingSource || '-'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">Încălzire</p>
          </div>
        </div>
      </div>

      {/* Modal Detalii Cheltuieli */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">Detalii Cheltuieli</h3>
                  <p className="text-emerald-100 text-xs sm:text-sm mt-0.5 sm:mt-1">
                    {selectedMonth || 'Luna curentă'} • Ap. {apartmentNumber}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Content Modal - Scrollabil */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Sumar */}
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                  <span className="text-gray-600 text-sm sm:text-base">Total întreținere:</span>
                  <span className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(currentMaintenance)}</span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  Calculat pentru {maintenanceData.persons || 0} persoane, {apartmentData?.surface || '-'} mp
                </p>
              </div>

              {/* Lista cheltuieli */}
              <h4 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
                Breakdown pe categorii
              </h4>
              <div className="space-y-1.5 sm:space-y-2">
                {expenseDetails.length > 0 ? (
                  expenseDetails.map((expense, index) => (
                    <div
                      key={expense.id || index}
                      className="flex items-center justify-between p-2.5 sm:p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 sm:mr-3 ${
                          expense.type === 'consum' ? 'bg-blue-500' :
                          expense.type === 'persoană' ? 'bg-purple-500' :
                          expense.type === 'apartament' ? 'bg-green-500' :
                          expense.type === 'cotă' ? 'bg-orange-500' :
                          expense.type === 'individual' ? 'bg-pink-500' : 'bg-gray-500'
                        }`}></div>
                        <div>
                          <p className="text-gray-900 font-medium text-sm sm:text-base">{expense.name}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">
                            {expense.label || expense.type}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">{formatCurrency(expense.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 sm:py-6 text-gray-500">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 sm:mb-2 text-gray-300" />
                    <p className="text-sm sm:text-base">Nu sunt cheltuieli de afișat pentru această lună.</p>
                  </div>
                )}
              </div>

              {/* Legendă */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-xl">
                <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1.5 sm:mb-2">Tipuri de distribuție:</h5>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mr-1.5 sm:mr-2"></div>
                    <span className="text-blue-800">După consum (mc)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full mr-1.5 sm:mr-2"></div>
                    <span className="text-blue-800">Per persoană</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1.5 sm:mr-2"></div>
                    <span className="text-blue-800">Per apartament</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full mr-1.5 sm:mr-2"></div>
                    <span className="text-blue-800">După cotă parte</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-6 border-t border-gray-100">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full bg-gray-100 text-gray-700 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base hover:bg-gray-200 transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
