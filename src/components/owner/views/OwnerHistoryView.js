/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import {
  Calendar, CheckCircle, AlertCircle, Clock, ChevronRight,
  Filter, TrendingUp, TrendingDown, X, FileText
} from 'lucide-react';
import { useOwnerContext } from '../OwnerApp';
import { useOwnerData, formatCurrency, getPaymentStatusInfo } from '../../../hooks/useOwnerData';

/**
 * View pentru istoricul lunilor
 */
export default function OwnerHistoryView({ onNavigate }) {
  const { apartmentId, apartmentNumber, apartmentData, associationId } = useOwnerContext();

  const {
    loading,
    error,
    monthlyHistory,
    selectedMonth,
    switchMonth,
    getExpenseDetailsForMonth
  } = useOwnerData(associationId, apartmentId);

  // State pentru filtrare
  const [filterStatus, setFilterStatus] = useState('all'); // all | paid | partial | unpaid

  // State pentru modal detalii
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMonthDetails, setSelectedMonthDetails] = useState(null);
  const [monthExpenseDetails, setMonthExpenseDetails] = useState([]);

  // Handler pentru deschiderea modalului cu detalii
  const handleShowDetails = async (month) => {
    setSelectedMonthDetails(month);
    setShowDetailsModal(true);

    // Încarcă detaliile cheltuielilor pentru luna selectată
    if (getExpenseDetailsForMonth) {
      const details = await getExpenseDetailsForMonth(month.monthYear);
      setMonthExpenseDetails(details || []);
    }
  };

  // Filtrare istoric
  const filteredHistory = monthlyHistory.filter(month => {
    if (filterStatus === 'all') return true;
    return month.paymentStatus === filterStatus;
  });

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-emerald-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Se încarcă istoricul...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-3 sm:p-4 lg:p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Eroare la încărcare</h2>
          <p className="text-sm sm:text-base text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Calculează statistici
  const totalMonths = monthlyHistory.length;
  const paidMonths = monthlyHistory.filter(m => m.paymentStatus === 'paid').length;
  const totalAmount = monthlyHistory.reduce((sum, m) => sum + (m.totalDatorat || 0), 0);
  const totalPaid = monthlyHistory.reduce((sum, m) => sum + (m.totalPaid || 0), 0);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Istoric Luni</h1>
        <p className="text-sm sm:text-base text-gray-600">Vizualizează toate lunile anterioare</p>
      </div>

      {/* Statistici rapide */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total luni</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalMonths}</p>
            </div>
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Luni plătite</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{paidMonths}</p>
            </div>
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total facturat</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total plătit</p>
              <p className="text-lg sm:text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
            </div>
            <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-300" />
          </div>
        </div>
      </div>

      {/* Filtre */}
      <div className="bg-white rounded-xl shadow p-3 sm:p-4">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
          <div className="flex items-center">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mr-2" />
            <span className="text-sm sm:text-base text-gray-700 font-medium">Filtrează după status:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Toate' },
              { value: 'paid', label: 'Plătite', color: 'green' },
              { value: 'partial', label: 'Parțial', color: 'orange' },
              { value: 'unpaid', label: 'Neplătite', color: 'red' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterStatus === option.value
                    ? option.color === 'green' ? 'bg-green-100 text-green-700' :
                      option.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                      option.color === 'red' ? 'bg-red-100 text-red-700' :
                      'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista Luni */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 sm:p-12 text-center">
          <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Niciun rezultat</h3>
          <p className="text-sm sm:text-base text-gray-500">
            {filterStatus === 'all'
              ? 'Nu există încă date istorice pentru acest apartament.'
              : `Nu există luni cu status "${filterStatus === 'paid' ? 'plătit' : filterStatus === 'partial' ? 'parțial' : 'neplătit'}".`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredHistory.map((month, index) => {
            const statusInfo = getPaymentStatusInfo(month.paymentStatus);
            const paymentPercentage = month.totalDatorat > 0
              ? Math.round((month.totalPaid / month.totalDatorat) * 100)
              : 0;

            return (
              <div
                key={month.monthYear}
                className={`bg-white rounded-xl shadow hover:shadow-lg transition-all cursor-pointer ${
                  selectedMonth === month.monthYear ? 'ring-2 ring-emerald-500' : ''
                }`}
                onClick={() => switchMonth(month.monthYear)}
              >
                {/* Header Card */}
                <div className="p-3 sm:p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900 capitalize">
                          {month.monthYear}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {month.status === 'published' ? 'Luna curentă' : 'Arhivată'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Body Card */}
                <div className="p-3 sm:p-4">
                  {/* Total */}
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="text-sm sm:text-base text-gray-500">Total de plată</span>
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      {formatCurrency(month.totalDatorat)}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-3 sm:mb-4">
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-gray-500">Plătit</span>
                      <span className="text-emerald-600 font-medium">
                        {formatCurrency(month.totalPaid)} ({paymentPercentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          month.paymentStatus === 'paid' ? 'bg-green-500' :
                          month.paymentStatus === 'partial' ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${paymentPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Remaining */}
                  {month.remaining > 0 && (
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Rămas</span>
                      <span className="text-red-600 font-medium">
                        {formatCurrency(month.remaining)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Card */}
                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Previne declanșarea onClick pe card
                      handleShowDetails(month);
                    }}
                    className="w-full flex items-center justify-center py-1.5 sm:py-2 text-xs sm:text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    Vezi detalii
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detalii Cheltuieli */}
      {showDetailsModal && selectedMonthDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">Detalii Cheltuieli</h3>
                  <p className="text-emerald-100 text-xs sm:text-sm mt-1 capitalize">
                    {selectedMonthDetails.monthYear} • Ap. {apartmentNumber}
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
              {/* Totaluri */}
              <h4 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
                Totaluri
              </h4>
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 space-y-2">
                {/* Întreținere curentă */}
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">Întreținere Curentă</span>
                  <span className="text-sm sm:text-base font-semibold text-emerald-600">
                    {formatCurrency(selectedMonthDetails.maintenance?.currentMaintenance || 0)}
                  </span>
                </div>

                {/* Restanțe */}
                {(selectedMonthDetails.maintenance?.restante || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-600">Restanțe</span>
                    <span className="text-sm sm:text-base font-semibold text-red-600">
                      {formatCurrency(selectedMonthDetails.maintenance?.restante || 0)}
                    </span>
                  </div>
                )}

                {/* Penalități */}
                {(selectedMonthDetails.maintenance?.penalitati || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-600">Penalități</span>
                    <span className="text-sm sm:text-base font-semibold text-orange-600">
                      {formatCurrency(selectedMonthDetails.maintenance?.penalitati || 0)}
                    </span>
                  </div>
                )}

                {/* Total Datorat */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm sm:text-base text-gray-900 font-medium">Total Datorat</span>
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    {formatCurrency(selectedMonthDetails.totalDatorat)}
                  </span>
                </div>

                {/* Încasări cu breakdown */}
                {selectedMonthDetails.totalPaid > 0 && (
                  <>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <div className="flex items-center">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mr-1.5 sm:mr-2"></div>
                        <span className="text-sm sm:text-base text-gray-600">Încasări</span>
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-emerald-600">
                        -{formatCurrency(selectedMonthDetails.totalPaid)}
                      </span>
                    </div>
                    {/* Breakdown plăți - afișăm detalii dacă există payments */}
                    {selectedMonthDetails.sheet?.payments && (() => {
                      const aptPayments = selectedMonthDetails.sheet.payments.filter(p =>
                        p.apartmentId === apartmentId ||
                        String(p.apartmentNumber) === String(apartmentNumber)
                      );
                      if (aptPayments.length > 0) {
                        return aptPayments.map((payment, idx) => (
                          <div key={idx} className="ml-4 text-sm space-y-1">
                            {payment.intretinere > 0 && (
                              <div className="flex justify-between text-gray-500">
                                <span>• Întreținere</span>
                                <span>-{formatCurrency(payment.intretinere)}</span>
                              </div>
                            )}
                            {payment.restante > 0 && (
                              <div className="flex justify-between text-gray-500">
                                <span>• Restanță</span>
                                <span>-{formatCurrency(payment.restante)}</span>
                              </div>
                            )}
                            {payment.penalitati > 0 && (
                              <div className="flex justify-between text-gray-500">
                                <span>• Penalități</span>
                                <span>-{formatCurrency(payment.penalitati)}</span>
                              </div>
                            )}
                            {(payment.date || payment.timestamp) && (
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(
                                  payment.date?.seconds ? payment.date.seconds * 1000 :
                                  payment.timestamp ? payment.timestamp :
                                  payment.date
                                ).toLocaleDateString('ro-RO')}
                                {(payment.chitanta || payment.receiptNumber) && ` - Chitanța #${payment.chitanta || payment.receiptNumber}`}
                              </div>
                            )}
                          </div>
                        ));
                      }
                      return null;
                    })()}
                  </>
                )}

                {/* Rest de Plată */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm sm:text-base text-gray-900 font-medium">Rest de Plată</span>
                  <span className={`text-base sm:text-lg font-bold ${selectedMonthDetails.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(selectedMonthDetails.remaining)}
                  </span>
                </div>
              </div>

              {/* Lista cheltuieli detaliate */}
              <h4 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
                Detalii Cheltuieli
              </h4>
              <div className="space-y-2 sm:space-y-3">
                {monthExpenseDetails.length > 0 ? (
                  monthExpenseDetails.map((expense, index) => {
                    // Verifică dacă e cheltuială pe consum
                    const isConsumptionBased =
                      expense.distributionType === 'byConsumption' ||
                      expense.distributionType === 'consumption' ||
                      expense.label?.toLowerCase().includes('consum');

                    // Verifică dacă are consum valid
                    const hasConsumption = expense.consumption !== null &&
                      expense.consumption !== undefined &&
                      expense.consumption > 0;

                    // Verifică dacă are diferență (pierderi/scurgeri)
                    const hasDifference = expense.difference && expense.difference !== 0;

                    // Generează badge-ul pentru tipul de distribuție
                    const getDistributionBadge = () => {
                      const dt = expense.distributionType;
                      const label = expense.label?.toLowerCase() || '';
                      const amount = expense.amount;

                      // Pentru consum cu date complete: afișează detalii consum
                      if (isConsumptionBased && hasConsumption && expense.unitPrice) {
                        return {
                          icon: '📊',
                          text: `${expense.consumption.toFixed(2)} ${expense.consumptionUnit || 'mc'} × ${expense.unitPrice.toFixed(2)} lei/${expense.consumptionUnit || 'mc'}`,
                          className: 'text-orange-600'
                        };
                      }

                      // Verifică pe consum (fără date complete)
                      if (dt === 'byConsumption' || dt === 'consumption' || label.includes('consum')) {
                        return {
                          icon: '💧',
                          text: `Pe consum`,
                          className: 'text-orange-600'
                        };
                      }

                      // Verifică pe număr persoane
                      if (dt === 'byPersons' || dt === 'perPerson' || label.includes('persoan')) {
                        return {
                          icon: '👥',
                          text: `Pe număr persoane`,
                          className: 'text-purple-600'
                        };
                      }

                      // Verifică pe cotă parte / suprafață
                      if (dt === 'byArea' || dt === 'cotaParte' || label.includes('cotă') || label.includes('suprafață')) {
                        return {
                          icon: '📐',
                          text: `Pe cotă parte`,
                          className: 'text-indigo-600'
                        };
                      }

                      // Default: pe apartament (include 'equal', 'perApartment', 'standard', undefined, etc.)
                      return {
                        icon: '⏱',
                        text: `${formatCurrency(amount)}/apartament`,
                        className: 'text-blue-600'
                      };
                    };

                    const badge = getDistributionBadge();

                    return (
                      <div
                        key={expense.id || index}
                        className="p-2.5 sm:p-3 bg-white border border-gray-100 rounded-lg"
                      >
                        {/* Header: Nume și Sumă */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm sm:text-base text-gray-900 font-medium">{expense.name}</p>
                          <span className="text-sm sm:text-base font-semibold text-gray-900">{formatCurrency(expense.amount)}</span>
                        </div>

                        {/* Badge distribuție sub numele cheltuielii */}
                        {badge && (
                          <div className={`mt-1 flex items-center text-xs sm:text-sm ${badge.className}`}>
                            <span className="mr-1">{badge.icon}</span>
                            <span>{badge.text}</span>
                          </div>
                        )}

                        {/* Diferență (pierderi/scurgeri) - doar pentru consum */}
                        {hasDifference && (
                          <div className="mt-1 text-xs sm:text-sm text-orange-600">
                            <span>Diferență: {formatCurrency(expense.difference)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 sm:py-6 text-gray-500">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm sm:text-base">Nu sunt cheltuieli detaliate disponibile.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-6 border-t border-gray-100">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full bg-gray-100 text-gray-700 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium hover:bg-gray-200 transition-colors"
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
