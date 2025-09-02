import React from 'react';
import { CheckCircle } from 'lucide-react';
import PaymentStatusDetail from '../common/PaymentStatusDetail';

const MaintenanceTableDetailed = ({ 
  maintenanceData, 
  expenses, 
  association,
  isMonthReadOnly,
  onOpenPaymentModal,
  isHistoricMonth = false
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className={isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}>
          <tr>
            <th className={`px-2 py-3 text-left text-xs font-medium text-gray-700 sticky left-0 z-10 whitespace-nowrap min-w-[80px] ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
              Apt.
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 whitespace-nowrap min-w-[120px]">
              Proprietar
            </th>
            <th className="px-2 py-3 text-center text-xs font-medium text-gray-700 whitespace-nowrap min-w-[60px]">
              Pers.
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 whitespace-nowrap min-w-[90px]">
              Întreținere
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 whitespace-nowrap min-w-[80px]">
              Restanță
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 whitespace-nowrap min-w-[90px]">
              Total Întrețin.
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 whitespace-nowrap min-w-[80px]">
              Penalități
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-700 whitespace-nowrap min-w-[100px] border-r-2 border-gray-300">
              Total Datorat
            </th>
            {expenses
              .filter(exp => exp.associationId === association?.id)
              .map(expense => (
                <th 
                  key={expense.id} 
                  className="px-2 py-3 text-right text-xs font-medium text-gray-700 bg-blue-50 whitespace-nowrap min-w-[80px]"
                  title={expense.name}
                >
                  {expense.name.length > 12 ? expense.name.substring(0, 12) + '...' : expense.name}
                </th>
              ))
            }
            {isMonthReadOnly && (
              <>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                  Status
                </th>
                {!isHistoricMonth && (
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                    Acțiuni
                  </th>
                )}
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
        {maintenanceData.map(data => (
          <tr key={data.apartmentId} className="hover:bg-gray-50">
            <td className={`px-2 py-3 font-semibold text-sm sticky left-0 z-10 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-50' : 'bg-white'}`}>
              Ap. {data.apartment}
            </td>
            <td className="px-2 py-3 text-blue-600 font-medium text-sm whitespace-nowrap">
              {data.owner}
            </td>
            <td className="px-2 py-3 text-center text-sm">
              {data.persons}
            </td>
            <td className="px-2 py-3 font-bold text-indigo-600 text-right text-sm">
              {data.currentMaintenance.toFixed(2)}
            </td>
            <td className="px-2 py-3 font-bold text-red-600 text-right text-sm">
              {data.restante.toFixed(2)}
            </td>
            <td className="px-2 py-3 font-bold text-purple-600 text-right text-sm">
              {data.totalMaintenance.toFixed(2)}
            </td>
            <td className="px-2 py-3 font-bold text-orange-600 text-right text-sm">
              {data.penalitati.toFixed(2)}
            </td>
            <td className="px-2 py-3 font-bold text-gray-800 text-right text-sm border-r-2 border-gray-300">
              {data.totalDatorat.toFixed(2)}
            </td>
            {expenses
              .filter(exp => exp.associationId === association?.id)
              .map(expense => (
                <td key={expense.id} className="px-2 py-3 text-right text-sm bg-blue-25">
                  {data.expenseDetails?.[expense.name] !== undefined ? 
                    data.expenseDetails[expense.name].toFixed(2) : 
                    '0.00'
                  }
                </td>
              ))
            }
            {isMonthReadOnly && (
              <>
                <td className="px-2 py-3">
                  <PaymentStatusDetail
                    paymentStatus={data.paymentStatus}
                    isPaid={data.isPaid}
                    isPartiallyPaid={data.isPartiallyPaid}
                    paymentInfo={data.paymentInfo}
                    apartmentData={data}
                  />
                </td>
                {!isHistoricMonth && (
                  <td className="px-2 py-3 text-center">
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
        <tfoot className={isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}>
        <tr>
          <td colSpan="3" className={`px-2 py-3 font-semibold text-sm sticky left-0 z-10 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
            TOTAL:
          </td>
          <td className="px-2 py-3 font-bold text-indigo-600 text-right text-sm">
            {maintenanceData.reduce((sum, d) => sum + d.currentMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-2 py-3 font-bold text-red-600 text-right text-sm">
            {maintenanceData.reduce((sum, d) => sum + d.restante, 0).toFixed(2)}
          </td>
          <td className="px-2 py-3 font-bold text-purple-600 text-right text-sm">
            {maintenanceData.reduce((sum, d) => sum + d.totalMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-2 py-3 font-bold text-orange-600 text-right text-sm">
            {maintenanceData.reduce((sum, d) => sum + d.penalitati, 0).toFixed(2)}
          </td>
          <td className="px-2 py-3 font-bold text-gray-800 text-right text-sm border-r-2 border-gray-300">
            {maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
          </td>
          {expenses
            .filter(exp => exp.associationId === association?.id)
            .map(expense => (
              <td key={expense.id} className="px-2 py-3 font-bold text-right text-sm bg-blue-50">
                {maintenanceData.reduce((sum, d) => sum + (d.expenseDetails?.[expense.name] || 0), 0).toFixed(2)}
              </td>
            ))
          }
        </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default MaintenanceTableDetailed;