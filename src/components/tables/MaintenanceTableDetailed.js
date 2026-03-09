/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React from 'react';
import { CheckCircle, Eye } from 'lucide-react';
import PaymentStatusDetail from '../common/PaymentStatusDetail';

const MaintenanceTableDetailed = ({
  maintenanceData,
  expenses,
  association,
  isMonthReadOnly,
  onOpenPaymentModal,
  onOpenMaintenanceBreakdown,
  isHistoricMonth = false,
  isLoadingPayments = false,
  disableSticky = false
}) => {
  // Lățimile fixe ale coloanelor de bază (identice cu MaintenanceTableSimple)
  const baseColWidths = { ap: 60, proprietar: 175, pers: 70, intretinere: 120, restanta: 110, total: 120, penalitati: 110, totalDatorat: 130 };
  const baseWidth = Object.values(baseColWidths).reduce((a, b) => a + b, 0);
  const extraWidth = (expenses.length * 120) + (isMonthReadOnly ? 240 : 0);
  const minTableWidth = baseWidth + extraWidth;

  return (
    <table className="border-collapse text-xs sm:text-sm" style={{ width: `max(100%, ${minTableWidth}px)`, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: `${baseColWidths.ap}px` }} />
          <col style={{ width: `${baseColWidths.proprietar}px` }} />
          <col style={{ width: `${baseColWidths.pers}px` }} />
          <col style={{ width: `${baseColWidths.intretinere}px` }} />
          <col style={{ width: `${baseColWidths.restanta}px` }} />
          <col style={{ width: `${baseColWidths.total}px` }} />
          <col style={{ width: `${baseColWidths.penalitati}px` }} />
          <col style={{ width: `${baseColWidths.totalDatorat}px` }} />
          {expenses.map(expense => {
            const expenseKey = expense.expenseTypeId || expense.id || expense.name;
            const hasDiff = maintenanceData.some(d => d.expenseDifferenceDetails?.[expenseKey]);
            return (
              <React.Fragment key={`col-${expense.id}`}>
                <col style={{ width: '120px' }} />
                {hasDiff && <col style={{ width: '120px' }} />}
              </React.Fragment>
            );
          })}
          {isMonthReadOnly && (
            <>
              <col style={{ width: '120px' }} />
              {!isHistoricMonth && <col style={{ width: '120px' }} />}
            </>
          )}
        </colgroup>
        <thead className={`${disableSticky ? '' : 'sticky top-0 z-10'} ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}>
          <tr>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">
              Ap.
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">
              Proprietar
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap">
              Pers.
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap">
              Întreținere
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap">
              Restanță
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap">
              Total
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap">
              Penalități
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap">
              Total Datorat
            </th>
            {expenses.map(expense => {
              const expenseKey = expense.expenseTypeId || expense.id || expense.name;
              const hasDifferences = maintenanceData.some(data =>
                data.expenseDifferenceDetails?.[expenseKey]
              );

              return (
                <React.Fragment key={expense.id}>
                  <th
                    className="px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 bg-blue-50"
                    title={expense.name}
                  >
                    {expense.name}
                  </th>
                  {hasDifferences && (
                    <th
                      className="px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 bg-orange-50"
                      title={`${expense.name} - Diferență`}
                    >
                      {expense.name} - Dif.
                    </th>
                  )}
                </React.Fragment>
              );
            })}
            {isMonthReadOnly && (
              <>
                <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                  Status
                </th>
                {!isHistoricMonth && (
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                    Acțiuni
                  </th>
                )}
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
        {maintenanceData.map(data => (
          <tr key={data.apartmentId} className="hover:bg-gray-50">
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap">
              {data.apartment}
            </td>
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
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right whitespace-nowrap">
              {data.persons}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-indigo-600 whitespace-nowrap">
              {data.currentMaintenance.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-red-600 whitespace-nowrap">
              {data.restante.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-purple-600 whitespace-nowrap">
              {data.totalMaintenance.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-orange-600 whitespace-nowrap">
              {data.penalitati.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 text-sm sm:text-base whitespace-nowrap">
              {data.totalDatorat.toFixed(2)}
            </td>
            {expenses.map(expense => {
              const expenseKey = expense.expenseTypeId || expense.id || expense.name;
              const hasDifferences = maintenanceData.some(d =>
                d.expenseDifferenceDetails?.[expenseKey]
              );

              const expenseDetail = data.expenseDetails?.[expenseKey];
              const expenseAmount = typeof expenseDetail === 'object' ? expenseDetail?.amount : expenseDetail;

              return (
                <React.Fragment key={expense.id}>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold bg-blue-50 whitespace-nowrap">
                    {expenseAmount !== undefined && expenseAmount !== null ?
                      Number(expenseAmount).toFixed(2) :
                      '0.00'
                    }
                  </td>
                  {hasDifferences && (
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold bg-orange-50 whitespace-nowrap">
                      {data.expenseDifferenceDetails?.[expenseKey] !== undefined ?
                        Number(data.expenseDifferenceDetails[expenseKey]).toFixed(2) :
                        '0.00'
                      }
                    </td>
                  )}
                </React.Fragment>
              );
            })}
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
          <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap"></td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap">
            TOTAL:
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.persons, 0)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-indigo-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.currentMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-red-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.restante, 0).toFixed(2)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-purple-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.totalMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-orange-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.penalitati, 0).toFixed(2)}
          </td>
          <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 text-sm sm:text-base whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
          </td>
          {expenses.map(expense => {
            const expenseKey = expense.expenseTypeId || expense.id || expense.name;
            const hasDifferences = maintenanceData.some(d =>
              d.expenseDifferenceDetails?.[expenseKey]
            );

            return (
              <React.Fragment key={expense.id}>
                <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold bg-blue-50 whitespace-nowrap">
                  {maintenanceData.reduce((sum, d) => {
                    const detail = d.expenseDetails?.[expenseKey];
                    const amount = typeof detail === 'object' ? detail?.amount : detail;
                    return sum + (amount || 0);
                  }, 0).toFixed(2)}
                </td>
                {hasDifferences && (
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold bg-orange-50 whitespace-nowrap">
                    {maintenanceData.reduce((sum, d) => sum + (d.expenseDifferenceDetails?.[expenseKey] || 0), 0).toFixed(2)}
                  </td>
                )}
              </React.Fragment>
            );
          })}
        </tr>
        </tfoot>
      </table>
  );
};

export default MaintenanceTableDetailed;
