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
  // Calculează lățimea minimă necesară pentru toate coloanele
  const minTableWidth = 100 + 150 + 90 + 120 + 100 + 120 + 100 + 120 + (expenses.length * 120) + (isMonthReadOnly ? 240 : 0);

  return (
    <table className="border-collapse text-xs sm:text-sm" style={{ width: `${minTableWidth}px`, tableLayout: 'auto' }}>
        <thead className={`${disableSticky ? '' : 'sticky top-0 z-10'} ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}>
          <tr>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '80px' }}>
              Apartament
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '120px' }}>
              Proprietar
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '70px' }}>
              Persoane
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
              Întreținere Curentă
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '80px' }}>
              Restanță
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
              Total Întreținere
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '80px' }}>
              Penalități
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
              Total Datorat
            </th>
            {expenses.map(expense => {
              // Folosește aceeași cheie ca în useMaintenanceCalculation
              const expenseKey = expense.expenseTypeId || expense.id || expense.name;
              // Verifică dacă există diferențe pentru această cheltuială
              const hasDifferences = maintenanceData.some(data =>
                data.expenseDifferenceDetails?.[expenseKey]
              );

              return (
                <React.Fragment key={expense.id}>
                  <th
                    className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 bg-blue-50"
                    title={expense.name}
                    style={{ minWidth: '80px', maxWidth: '120px' }}
                  >
                    {expense.name}
                  </th>
                  {hasDifferences && (
                    <th
                      className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 bg-orange-50"
                      title={`${expense.name} - Diferență`}
                      style={{ minWidth: '80px', maxWidth: '120px' }}
                    >
                      {expense.name} - Dif.
                    </th>
                  )}
                </React.Fragment>
              );
            })}
            {isMonthReadOnly && (
              <>
                <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
                  Status
                </th>
                {!isHistoricMonth && (
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
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
              Ap. {data.apartment}
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
            <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
              {data.persons}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-indigo-600 whitespace-nowrap">
              {data.currentMaintenance.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-red-600 whitespace-nowrap">
              {data.restante.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-purple-600 whitespace-nowrap">
              {data.totalMaintenance.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-orange-600 whitespace-nowrap">
              {data.penalitati.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-gray-800 text-sm sm:text-base whitespace-nowrap">
              {data.totalDatorat.toFixed(2)}
            </td>
            {expenses.map(expense => {
              // Folosește aceeași cheie ca în useMaintenanceCalculation
              const expenseKey = expense.expenseTypeId || expense.id || expense.name;
              const hasDifferences = maintenanceData.some(d =>
                d.expenseDifferenceDetails?.[expenseKey]
              );

              // expenseDetails stochează un obiect { amount, name, expense }
              const expenseDetail = data.expenseDetails?.[expenseKey];
              const expenseAmount = typeof expenseDetail === 'object' ? expenseDetail?.amount : expenseDetail;

              return (
                <React.Fragment key={expense.id}>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold bg-blue-50 whitespace-nowrap">
                    {expenseAmount !== undefined && expenseAmount !== null ?
                      Number(expenseAmount).toFixed(2) :
                      '0.00'
                    }
                  </td>
                  {hasDifferences && (
                    <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold bg-orange-50 whitespace-nowrap">
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
          <td colSpan="2" className="px-2 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap">
            TOTAL:
          </td>
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
          {expenses.map(expense => {
            // Folosește aceeași cheie ca în useMaintenanceCalculation
            const expenseKey = expense.expenseTypeId || expense.id || expense.name;
            const hasDifferences = maintenanceData.some(d =>
              d.expenseDifferenceDetails?.[expenseKey]
            );

            return (
              <React.Fragment key={expense.id}>
                <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold bg-blue-50 whitespace-nowrap">
                  {maintenanceData.reduce((sum, d) => {
                    const detail = d.expenseDetails?.[expenseKey];
                    const amount = typeof detail === 'object' ? detail?.amount : detail;
                    return sum + (amount || 0);
                  }, 0).toFixed(2)}
                </td>
                {hasDifferences && (
                  <td className="px-2 sm:px-3 py-2 sm:py-3 font-bold bg-orange-50 whitespace-nowrap">
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
