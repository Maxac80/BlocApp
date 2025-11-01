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
  isHistoricMonth = false
}) => {
  // Calculează lățimea minimă necesară pentru toate coloanele
  const minTableWidth = 100 + 150 + 90 + 120 + 100 + 120 + 100 + 120 + (expenses.length * 120) + (isMonthReadOnly ? 240 : 0);

  return (
    <table className="border-collapse" style={{ width: `${minTableWidth}px`, tableLayout: 'auto' }}>
        <thead className={`sticky top-0 z-10 ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}>
          <tr>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
              Apartament
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '150px' }}>
              Proprietar
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '90px' }}>
              Persoane
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '120px' }}>
              Întreținere Curentă
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
              Restanță
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '120px' }}>
              Total Întreținere
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
              Penalități
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '120px' }}>
              Total Datorat
            </th>
            {expenses.map(expense => {
              // Verifică dacă există diferențe pentru această cheltuială
              const hasDifferences = maintenanceData.some(data =>
                data.expenseDifferenceDetails?.[expense.name]
              );

              return (
                <React.Fragment key={expense.id}>
                  <th
                    className="px-3 py-3 text-left text-sm font-medium text-gray-700 bg-blue-50"
                    title={expense.name}
                    style={{ minWidth: '100px', maxWidth: '150px' }}
                  >
                    {expense.name}
                  </th>
                  {hasDifferences && (
                    <th
                      className="px-3 py-3 text-left text-sm font-medium text-gray-700 bg-orange-50"
                      title={`${expense.name} - Diferență`}
                      style={{ minWidth: '100px', maxWidth: '150px' }}
                    >
                      {expense.name} - Diferență
                    </th>
                  )}
                </React.Fragment>
              );
            })}
            {isMonthReadOnly && (
              <>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '120px' }}>
                  Status
                </th>
                {!isHistoricMonth && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap" style={{ minWidth: '120px' }}>
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
            <td className="px-3 py-3 font-semibold whitespace-nowrap">
              Ap. {data.apartment}
            </td>
            <td className="px-3 py-3 text-blue-600 font-medium text-sm whitespace-nowrap">
              <div className="flex items-center gap-2">
                {onOpenMaintenanceBreakdown && (
                  <button
                    onClick={() => onOpenMaintenanceBreakdown(data)}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded p-1 transition-colors flex-shrink-0"
                    title="Vezi detalii întreținere"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <span>{data.owner}</span>
              </div>
            </td>
            <td className="px-3 py-3 text-center whitespace-nowrap">
              {data.persons}
            </td>
            <td className="px-3 py-3 font-bold text-indigo-600 whitespace-nowrap">
              {data.currentMaintenance.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-bold text-red-600 whitespace-nowrap">
              {data.restante.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-bold text-purple-600 whitespace-nowrap">
              {data.totalMaintenance.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-bold text-orange-600 whitespace-nowrap">
              {data.penalitati.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-bold text-gray-800 text-lg whitespace-nowrap">
              {data.totalDatorat.toFixed(2)}
            </td>
            {expenses.map(expense => {
              const hasDifferences = maintenanceData.some(d =>
                d.expenseDifferenceDetails?.[expense.name]
              );

              return (
                <React.Fragment key={expense.id}>
                  <td className="px-3 py-3 font-bold text-sm bg-blue-50 whitespace-nowrap">
                    {data.expenseDetails?.[expense.name] !== undefined ?
                      data.expenseDetails[expense.name].toFixed(2) :
                      '0.00'
                    }
                  </td>
                  {hasDifferences && (
                    <td className="px-3 py-3 font-bold text-sm bg-orange-50 whitespace-nowrap">
                      {data.expenseDifferenceDetails?.[expense.name] !== undefined ?
                        data.expenseDifferenceDetails[expense.name].toFixed(2) :
                        '0.00'
                      }
                    </td>
                  )}
                </React.Fragment>
              );
            })}
            {isMonthReadOnly && (
              <>
                <td className="px-3 py-3 whitespace-nowrap">
                  <PaymentStatusDetail
                    paymentStatus={data.paymentStatus}
                    isPaid={data.isPaid}
                    isPartiallyPaid={data.isPartiallyPaid}
                    paymentInfo={data.paymentInfo}
                    apartmentData={data}
                  />
                </td>
                {!isHistoricMonth && (
                  <td className="px-3 py-3 whitespace-nowrap">
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
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md ${
                        data.paymentInfo?.canReceivePayment
                          ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={!data.paymentInfo?.canReceivePayment ? 'Apartamentul are soldul zero' : 'Înregistrează încasare'}
                    >
                      💰 Încasează
                    </button>
                  </td>
                )}
              </>
            )}
          </tr>
        ))}
      </tbody>
        <tfoot className={`sticky bottom-0 z-10 ${isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}`}>
        <tr>
          <td colSpan="2" className="px-3 py-3 font-semibold whitespace-nowrap">
            TOTAL:
          </td>
          <td className="px-3 py-3 font-bold text-gray-800 text-center whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.persons, 0)}
          </td>
          <td className="px-3 py-3 font-bold text-indigo-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.currentMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-3 py-3 font-bold text-red-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.restante, 0).toFixed(2)}
          </td>
          <td className="px-3 py-3 font-bold text-purple-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.totalMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-3 py-3 font-bold text-orange-600 whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.penalitati, 0).toFixed(2)}
          </td>
          <td className="px-3 py-3 font-bold text-gray-800 text-lg whitespace-nowrap">
            {maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
          </td>
          {expenses.map(expense => {
            const hasDifferences = maintenanceData.some(d =>
              d.expenseDifferenceDetails?.[expense.name]
            );

            return (
              <React.Fragment key={expense.id}>
                <td className="px-3 py-3 font-bold text-sm bg-blue-50 whitespace-nowrap">
                  {maintenanceData.reduce((sum, d) => sum + (d.expenseDetails?.[expense.name] || 0), 0).toFixed(2)}
                </td>
                {hasDifferences && (
                  <td className="px-3 py-3 font-bold text-sm bg-orange-50 whitespace-nowrap">
                    {maintenanceData.reduce((sum, d) => sum + (d.expenseDifferenceDetails?.[expense.name] || 0), 0).toFixed(2)}
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