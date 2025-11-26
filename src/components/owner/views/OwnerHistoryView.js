import React, { useState } from 'react';
import {
  Calendar, CheckCircle, AlertCircle, Clock, ChevronRight,
  Filter, TrendingUp, TrendingDown
} from 'lucide-react';
import { useOwnerContext } from '../OwnerApp';
import { useOwnerData, formatCurrency, getPaymentStatusInfo } from '../../../hooks/useOwnerData';

/**
 * View pentru istoricul lunilor
 */
export default function OwnerHistoryView({ onNavigate }) {
  const { apartmentId, associationId } = useOwnerContext();

  const {
    loading,
    error,
    monthlyHistory,
    selectedMonth,
    switchMonth
  } = useOwnerData(associationId, apartmentId);

  // State pentru filtrare
  const [filterStatus, setFilterStatus] = useState('all'); // all | paid | partial | unpaid

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă istoricul...</p>
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

  // Calculează statistici
  const totalMonths = monthlyHistory.length;
  const paidMonths = monthlyHistory.filter(m => m.paymentStatus === 'paid').length;
  const totalAmount = monthlyHistory.reduce((sum, m) => sum + (m.totalDatorat || 0), 0);
  const totalPaid = monthlyHistory.reduce((sum, m) => sum + (m.totalPaid || 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Istoric Luni</h1>
        <p className="text-gray-600">Vizualizează toate lunile anterioare</p>
      </div>

      {/* Statistici rapide */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total luni</p>
              <p className="text-2xl font-bold text-gray-900">{totalMonths}</p>
            </div>
            <Calendar className="w-8 h-8 text-gray-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Luni plătite</p>
              <p className="text-2xl font-bold text-green-600">{paidMonths}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total facturat</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total plătit</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-emerald-300" />
          </div>
        </div>
      </div>

      {/* Filtre */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-700 font-medium">Filtrează după status:</span>
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun rezultat</h3>
          <p className="text-gray-500">
            {filterStatus === 'all'
              ? 'Nu există încă date istorice pentru acest apartament.'
              : `Nu există luni cu status "${filterStatus === 'paid' ? 'plătit' : filterStatus === 'partial' ? 'parțial' : 'neplătit'}".`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {month.monthYear}
                        </p>
                        <p className="text-xs text-gray-500">
                          {month.status === 'published' ? 'Luna curentă' : 'Arhivată'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Body Card */}
                <div className="p-4">
                  {/* Total */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-500">Total de plată</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(month.totalDatorat)}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Plătit</span>
                      <span className="text-emerald-600 font-medium">
                        {formatCurrency(month.totalPaid)} ({paymentPercentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Rămas</span>
                      <span className="text-red-600 font-medium">
                        {formatCurrency(month.remaining)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Card */}
                <div className="px-4 pb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Previne declanșarea onClick pe card
                      switchMonth(month.monthYear);
                      onNavigate && onNavigate('dashboard');
                    }}
                    className="w-full flex items-center justify-center py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    Vezi detalii în Dashboard
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
