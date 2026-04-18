/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import {
  TrendingUp, Users, Home, FileText, Download,
  AlertCircle, CheckCircle, Clock, X, ChevronDown, Flame,
  CreditCard, ClipboardList
} from 'lucide-react';
import { useOwnerContext } from '../OwnerApp';
import { useOwnerData, formatCurrency, getPaymentStatusInfo } from '../../../hooks/useOwnerData';
import OwnerPaymentModal from '../modals/OwnerPaymentModal';

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
    paymentHistory,
    currentSheet,
    publishedSheet
  } = useOwnerData(associationId, apartmentId);

  // Consumption month (e.g., "martie 2026" pentru "aprilie 2026")
  const activeSheet = publishedSheet?.monthYear === selectedMonth ? publishedSheet : currentSheet;
  const consumptionMonth = activeSheet?.consumptionMonth;

  // State pentru modale
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPdfMessage, setShowPdfMessage] = useState(false);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2 space-y-4 sm:space-y-6">
      {/* Header cu luna curentă + selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Întreținere</h1>
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
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-6 text-white">
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
            {/* Întreținere curentă */}
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full mr-2 sm:mr-3"></div>
                <span className="text-gray-700 text-sm sm:text-base">Întreținere {selectedMonth}</span>
              </div>
              <span className="font-semibold text-blue-600 text-sm sm:text-base">{formatCurrency(currentMaintenance)}</span>
            </div>

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

            {/* Total de plată */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg shadow-md mt-3 sm:mt-4">
              <span className="text-white font-semibold text-sm sm:text-base">Total de plată</span>
              <span className="font-bold text-white text-base sm:text-lg">{formatCurrency(restante + currentMaintenance + penalitati)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2 sm:space-y-3">
          {/* Plătește Online - buton principal când există sumă de plată */}
          {remaining > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-medium text-sm sm:text-base hover:bg-emerald-700 transition-colors"
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              Plătește Online
            </button>
          )}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => setShowDetailsModal(true)}
              className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm sm:text-base hover:bg-gray-200 transition-colors"
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


      {/* Modal Plată Online */}
      <OwnerPaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        apartmentNumber={apartmentNumber}
        intretinereTotal={restante + currentMaintenance}
        restante={restante}
        currentMaintenance={currentMaintenance}
        penalitati={penalitati}
      />

      {/* Modal Detalii Cheltuieli */}
      {showDetailsModal && (
        <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 z-[100] !mt-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold">
                    Întreținere · Apartament {apartmentNumber}
                  </h3>
                  {selectedMonth && (
                    <p className="text-emerald-100 text-[11px] sm:text-xs mt-0.5">
                      <span>{selectedMonth}</span>
                      {consumptionMonth && (
                        <>
                          <span className="mx-1">·</span>
                          <span>consum {consumptionMonth}</span>
                        </>
                      )}
                    </p>
                  )}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Content Modal - Scrollabil */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Header Cheltuieli + Total */}
              {(() => {
                const includedCount = expenseDetails.filter(e => e.participationType !== 'excluded').length;
                const totalCount = expenseDetails.length;
                return (
                  <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4">
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-800">
                        Cheltuieli incluse
                      </h4>
                      <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                        {includedCount === totalCount
                          ? `${totalCount} ${totalCount === 1 ? 'cheltuială' : 'cheltuieli'}`
                          : `${includedCount} din ${totalCount} cheltuieli`}
                      </p>
                    </div>
                    <div className="flex-shrink-0 bg-emerald-100 border border-emerald-300 rounded-lg px-2.5 sm:px-4 py-1 sm:py-1.5 shadow-sm">
                      <span className="text-base sm:text-2xl font-bold text-emerald-700">
                        {formatCurrency(currentMaintenance)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Lista cheltuieli */}
              <div className="space-y-2 sm:space-y-3">
                {expenseDetails.length > 0 ? (
                  expenseDetails.map((expense, index) => {
                    const totalDisplayed = expense.amount + expense.difference;
                    const badgeClass = {
                      consum: 'bg-orange-50 text-orange-600 border-orange-200',
                      persoană: 'bg-green-50 text-green-600 border-green-200',
                      apartament: 'bg-blue-50 text-blue-600 border-blue-200',
                      cotă: 'bg-teal-50 text-teal-600 border-teal-200',
                      individual: 'bg-indigo-50 text-indigo-600 border-indigo-200'
                    }[expense.type] || 'bg-gray-50 text-gray-600 border-gray-200';

                    const borderColor = {
                      consum: '#f97316',
                      persoană: '#16a34a',
                      apartament: '#2563eb',
                      cotă: '#14b8a6',
                      individual: '#6366f1'
                    }[expense.type] || '#9ca3af';

                    const persons = expense.persons || maintenanceData.persons || 0;

                    // Build detail line
                    let detailLine = null;
                    if (expense.distributionType === 'person' || expense.distributionType === 'perPerson' || expense.distributionType === 'byPersons') {
                      const pricePerPerson = persons > 0 ? (expense.amount / persons) : 0;
                      detailLine = `${persons} ${persons === 1 ? 'persoană' : 'persoane'} × ${pricePerPerson.toFixed(2)} lei = ${expense.amount.toFixed(2)} lei`;
                    } else if (expense.distributionType === 'consumption' || expense.distributionType === 'consumption_cumulative' || expense.distributionType === 'byConsumption') {
                      if (expense.unitPrice > 0) {
                        const subtotal = expense.consumption * expense.unitPrice;
                        detailLine = `${expense.consumption.toFixed(2)} ${expense.consumptionUnit} × ${expense.unitPrice.toFixed(2)} lei/${expense.consumptionUnit} = ${subtotal.toFixed(2)} lei`;
                      }
                    }

                    // Label badge with specific format
                    let labelBadge = expense.label;
                    if (expense.distributionType === 'apartment' || expense.distributionType === 'perApartament' || expense.distributionType === 'equal') {
                      labelBadge = `${expense.amount.toFixed(2)} lei/apartament`;
                    } else if ((expense.distributionType === 'person' || expense.distributionType === 'perPerson' || expense.distributionType === 'byPersons') && persons > 0) {
                      labelBadge = `${(expense.amount / persons).toFixed(2)} lei/persoană`;
                    }

                    const isExcluded = expense.participationType === 'excluded';
                    const participationBadge = isExcluded
                      ? 'Exclus'
                      : (expense.participationType === 'percentage' && expense.participationValue !== 100
                          ? `Participare ${expense.participationValue}%`
                          : (expense.participationType === 'fixed'
                              ? `Sumă fixă: ${expense.participationValue} lei`
                              : null));

                    return (
                      <div
                        key={expense.id || index}
                        className="bg-white border border-gray-100 rounded-lg p-2.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow border-l-4"
                        style={{ borderLeftColor: isExcluded ? '#9ca3af' : borderColor }}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-xs sm:text-base mb-1 sm:mb-2 truncate">
                              {expense.name}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <div className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium border ${badgeClass}`}>
                                {labelBadge}
                              </div>
                              {participationBadge && (
                                <div className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200">
                                  {participationBadge}
                                </div>
                              )}
                            </div>
                            {detailLine && !isExcluded && (
                              <div className="text-[10px] sm:text-xs text-gray-600 mt-1 ml-1 truncate">
                                {detailLine}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-sm sm:text-lg font-bold ${isExcluded ? 'text-gray-400 line-through' : 'text-emerald-700'}`}>
                              {totalDisplayed.toFixed(2)} lei
                            </div>
                            {!isExcluded && Math.abs(expense.difference) >= 0.01 && (
                              <div className="text-[10px] sm:text-xs text-gray-500 mt-1 whitespace-nowrap">
                                {expense.amount.toFixed(2)}
                                <span className={expense.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {' '}{expense.difference >= 0 ? '+' : '−'} {Math.abs(expense.difference).toFixed(2)}
                                </span>
                                <span className="text-gray-400"> dif.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 sm:py-6 text-gray-500">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 sm:mb-2 text-gray-300" />
                    <p className="text-sm sm:text-base">Nu sunt cheltuieli de afișat pentru această lună.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 sm:px-6 py-1.5 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base"
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
