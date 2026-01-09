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
          <th className={`pl-3 pr-1 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}>Ap.</th>
          <th className="px-1 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Proprietar</th>
          {/* Coloane ascunse pe mobil */}
          <th className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Pers.</th>
          <th className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Întreținere</th>
          <th className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Restanță</th>
          <th className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Total</th>
          <th className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Penalități</th>
          <th className="px-1 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Total Datorat</th>
          {isMonthReadOnly && (
            <>
              <th className="px-1 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">Status</th>
              {!isHistoricMonth && (
                <th className="px-1 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap"><span className="hidden sm:inline">Acțiuni</span><span className="sm:hidden"></span></th>
              )}
            </>
          )}
        </tr>
      </thead>
      <tbody className="divide-y">
        {maintenanceData.map(data => (
          <tr key={data.apartmentId} className="hover:bg-gray-50">
            <td className="pl-3 pr-1 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap bg-white">{data.apartment}</td>
            <td className="px-1 sm:px-3 py-2 sm:py-3 text-blue-600 font-medium">
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
                <span className="truncate max-w-[60px] sm:max-w-none text-xs sm:text-sm">{data.owner}</span>
              </div>
            </td>
            {/* Coloane ascunse pe mobil */}
            <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">{data.persons || 0}</td>
            <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 font-bold text-indigo-600 whitespace-nowrap">{(data.currentMaintenance || 0).toFixed(2)}</td>
            <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 font-bold text-red-600 whitespace-nowrap">{(data.restante || 0).toFixed(2)}</td>
            <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 font-bold text-purple-600 whitespace-nowrap">{(data.totalMaintenance || 0).toFixed(2)}</td>
            <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap">{(data.penalitati || 0).toFixed(2)}</td>
            <td className="px-1 sm:px-3 py-2 sm:py-3 font-bold text-gray-800 text-xs sm:text-base whitespace-nowrap">{(data.totalDatorat || 0).toFixed(2)}</td>
            {isMonthReadOnly && (
              <>
                <td className="px-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                  <PaymentStatusDetail
                    paymentStatus={data.paymentStatus}
                    isPaid={data.isPaid}
                    isPartiallyPaid={data.isPartiallyPaid}
                    paymentInfo={data.paymentInfo}
                    apartmentData={data}
                  />
                </td>
                {!isHistoricMonth && (
                  <td className="px-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
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
                      className={`px-1.5 sm:px-4 py-1 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium shadow-md transition-none ${
                        isLoadingPayments
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed invisible'
                          : data.paymentInfo?.canReceivePayment
                            ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={!data.paymentInfo?.canReceivePayment ? 'Apartamentul are soldul zero' : 'Înregistrează încasare'}
                    >
                      <span className="hidden sm:inline">Încasează</span>
                      <span className="sm:hidden">💰</span>
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
          <td className={`pl-3 pr-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}></td>
          <td className="px-1 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap">TOTAL:</td>
          {/* Coloane ascunse pe mobil */}
          <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 font-bold text-gray-800 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + (d.persons || 0), 0)}
          </td>
          <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 font-bold text-indigo-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + (d.currentMaintenance || 0), 0).toFixed(2)}
          </td>
          <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 font-bold text-red-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + (d.restante || 0), 0).toFixed(2)}
          </td>
          <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 font-bold text-purple-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + (d.totalMaintenance || 0), 0).toFixed(2)}
          </td>
          <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + (d.penalitati || 0), 0).toFixed(2)}
          </td>
          <td className="px-1 sm:px-3 py-2 sm:py-3 font-bold text-gray-800 text-xs sm:text-base whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + (d.totalDatorat || 0), 0).toFixed(2)}
          </td>
          {isMonthReadOnly && (
            <>
              <td className={`px-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}></td>
              {!isHistoricMonth && <td className={`px-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}></td>}
            </>
          )}
        </tr>
        {isMonthReadOnly && (
          <tr className="bg-blue-50">
            {/* Coloana 1: Ap (gol) */}
            <td className="pl-3 pr-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap bg-blue-50"></td>
            {/* Coloana 2: Proprietar - ÎNCASAT label + valoare pe mobil */}
            <td className="px-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap bg-blue-50">
              <span className="font-semibold text-xs sm:text-sm">ÎNCASAT:</span>
              <span className="sm:hidden font-bold text-green-600 ml-1 text-xs">
                {(paymentStats?.totalIncasat || 0).toFixed(2)}
              </span>
            </td>
            {/* Desktop only: Pers (gol) */}
            <td className="hidden sm:table-cell px-3 py-3 whitespace-nowrap bg-blue-50"></td>
            {/* Desktop only: Întreținere - valoare încasat */}
            <td className="hidden sm:table-cell px-3 py-3 font-bold text-green-600 whitespace-nowrap bg-blue-50">
              {(paymentStats?.totalIncasat || 0).toFixed(2)}
            </td>
            {/* Desktop only: Restanță (gol) */}
            <td className="hidden sm:table-cell px-3 py-3 whitespace-nowrap bg-blue-50"></td>
            {/* Desktop only: Total - RESTANȚE label */}
            <td className="hidden sm:table-cell px-3 py-3 font-semibold text-right whitespace-nowrap bg-blue-50">RESTANȚE:</td>
            {/* Desktop only: Penalități - valoare restanțe */}
            <td className="hidden sm:table-cell px-3 py-3 font-bold text-red-600 whitespace-nowrap bg-blue-50">
              {maintenanceData.filter(d => !d.paid).reduce((sum, d) => sum + (d.totalDatorat || 0), 0).toFixed(2)}
            </td>
            {/* Coloana Total Datorat - diferit pe mobil vs desktop */}
            <td className="px-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap bg-blue-50">
              {/* Pe mobil: Restanțe info pe aceeași linie - la fel ca ÎNCASAT */}
              <div className="sm:hidden">
                <span className="font-semibold text-xs">Restanțe: </span>
                <span className="font-bold text-red-600 text-xs">
                  {maintenanceData.filter(d => !d.paid).reduce((sum, d) => sum + (d.totalDatorat || 0), 0).toFixed(2)}
                </span>
              </div>
              {/* Pe desktop: gol */}
            </td>
            {/* Status (gol) */}
            <td className="px-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap bg-blue-50"></td>
            {/* Acțiuni (gol) - doar dacă nu e luna istorică */}
            {!isHistoricMonth && <td className="px-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap bg-blue-50"></td>}
          </tr>
        )}
      </tfoot>
    </table>
  );
};

export default MaintenanceTableSimple;
