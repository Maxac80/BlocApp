import React from 'react';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import PaymentStatusDetail from '../common/PaymentStatusDetail';

const MaintenanceTableSimple = ({
  maintenanceData,
  isMonthReadOnly,
  togglePayment,
  onOpenPaymentModal,
  onOpenMaintenanceBreakdown,
  isHistoricMonth = false,
  getPaymentStats,
  isLoadingPayments = false,
  disableSticky = false
}) => {
  // Calculează statisticile de plată dacă funcția este disponibilă
  const paymentStats = getPaymentStats ? getPaymentStats() : null;
  return (
    <table className="w-full text-xs sm:text-sm">
      <thead className={`${disableSticky ? '' : 'sticky top-0 z-10'} ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}>
        <tr>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Apartament</th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Proprietar</th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Persoane</th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Întreținere Curentă</th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Restanță</th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Total Întreținere</th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Penalități</th>
          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Total Datorat</th>
          {isMonthReadOnly && (
            <>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Status</th>
              {!isHistoricMonth && (
                <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Acțiuni</th>
              )}
            </>
          )}
        </tr>
      </thead>
      <tbody className="divide-y">
        {maintenanceData.map(data => (
          <tr key={data.apartmentId} className="hover:bg-gray-50">
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap">Ap. {data.apartment}</td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-blue-600 font-medium whitespace-nowrap">
              <div className="flex items-center gap-1 sm:gap-2">
                {onOpenMaintenanceBreakdown && (
                  <button
                    onClick={() => onOpenMaintenanceBreakdown(data)}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded p-0.5 sm:p-1 transition-colors flex-shrink-0"
                    title="Vezi detalii întreținere"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
                <span>{data.owner}</span>
              </div>
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{data.persons}</td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-indigo-600 whitespace-nowrap">{data.currentMaintenance.toFixed(2)}</td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-red-600 whitespace-nowrap">{data.restante.toFixed(2)}</td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-purple-600 whitespace-nowrap">{data.totalMaintenance.toFixed(2)}</td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap">{data.penalitati.toFixed(2)}</td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-gray-800 text-sm sm:text-base whitespace-nowrap">{data.totalDatorat.toFixed(2)}</td>
            {isMonthReadOnly && (
              <>
                <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                  <PaymentStatusDetail
                    paymentStatus={data.paymentStatus}
                    isPaid={data.isPaid}
                    isPartiallyPaid={data.isPartiallyPaid}
                    paymentInfo={data.paymentInfo}
                    apartmentData={data}
                  />
                </td>
                {!isHistoricMonth && (
                  <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                    <button
                      onClick={() => data.paymentInfo?.canReceivePayment && onOpenPaymentModal && onOpenPaymentModal({
                        apartmentId: data.apartmentId,
                        apartmentNumber: data.apartment,
                        owner: data.owner,
                        restante: data.restante,
                        intretinere: data.currentMaintenance,
                        penalitati: data.penalitati,
                        totalDatorat: data.totalDatorat
                      })}
                      disabled={!data.paymentInfo?.canReceivePayment}
                      className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium shadow-md transition-none ${
                        isLoadingPayments
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed invisible'
                          : data.paymentInfo?.canReceivePayment
                            ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={!data.paymentInfo?.canReceivePayment ? 'Apartamentul are soldul zero' : 'Înregistrează încasare'}
                    >
                      Încasează
                    </button>
                  </td>
                )}
              </>
            )}
          </tr>
        ))}
      </tbody>
      <tfoot className={`${disableSticky ? '' : 'sticky bottom-0 z-10'} ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}>
        <tr>
          <td colSpan="2" className="px-2 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap">TOTAL:</td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-gray-800 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.persons, 0)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-indigo-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.currentMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-red-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.restante, 0).toFixed(2)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-purple-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.totalMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.penalitati, 0).toFixed(2)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-gray-800 text-sm sm:text-base whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
          </td>
          {isMonthReadOnly && (
            <>
              <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap"></td>
              {!isHistoricMonth && <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap"></td>}
            </>
          )}
        </tr>
        {isMonthReadOnly && (
          <tr className="bg-blue-50">
            <td colSpan="3" className="px-2 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap">TOTAL ÎNCASAT:</td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-green-600 whitespace-nowrap">
              {paymentStats ? paymentStats.totalIncasat.toFixed(2) : '0.00'}
            </td>
            <td colSpan="2" className="px-2 sm:px-3 py-2 sm:py-3 font-semibold text-right whitespace-nowrap">TOTAL RESTANȚE:</td>
            <td colSpan={isHistoricMonth ? "3" : "4"} className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-red-600 whitespace-nowrap">
              {maintenanceData.filter(d => !d.paid).reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
            </td>
          </tr>
        )}
      </tfoot>
    </table>
  );
};

export default MaintenanceTableSimple;
