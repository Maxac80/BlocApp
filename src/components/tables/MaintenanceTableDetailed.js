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
    <table className="w-full">
        <thead className={isMonthReadOnly ? "bg-purple-100" : "bg-gray-50"}>
          <tr>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
              Apartament
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
              Proprietar
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
              Persoane
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
              Întreținere Curentă
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
              Restanță
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
              Total Întreținere
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
              Penalități
            </th>
            <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
              Total Datorat
            </th>
            {expenses.map(expense => (
              <th
                key={expense.id}
                className="px-3 py-3 text-left text-sm font-medium text-gray-700 bg-blue-50"
                title={expense.name}
              >
                {expense.name}
              </th>
            ))}
            {isMonthReadOnly && (
              <>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
                  Status
                </th>
                {!isHistoricMonth && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
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
            <td className="px-3 py-3 font-semibold">
              Ap. {data.apartment}
            </td>
            <td className="px-3 py-3 text-blue-600 font-medium text-sm">
              {data.owner}
            </td>
            <td className="px-3 py-3 text-center">
              {data.persons}
            </td>
            <td className="px-3 py-3 font-bold text-indigo-600">
              {data.currentMaintenance.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-bold text-red-600">
              {data.restante.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-bold text-purple-600">
              {data.totalMaintenance.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-bold text-orange-600">
              {data.penalitati.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-bold text-gray-800 text-lg">
              {data.totalDatorat.toFixed(2)}
            </td>
            {expenses.map(expense => (
              <td key={expense.id} className="px-3 py-3 font-bold text-sm bg-blue-50">
                {data.expenseDetails?.[expense.name] !== undefined ?
                  data.expenseDetails[expense.name].toFixed(2) :
                  '0.00'
                }
              </td>
            ))}
            {isMonthReadOnly && (
              <>
                <td className="px-3 py-3">
                  <PaymentStatusDetail
                    paymentStatus={data.paymentStatus}
                    isPaid={data.isPaid}
                    isPartiallyPaid={data.isPartiallyPaid}
                    paymentInfo={data.paymentInfo}
                    apartmentData={data}
                  />
                </td>
                {!isHistoricMonth && (
                  <td className="px-3 py-3">
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
          <td colSpan="2" className="px-3 py-3 font-semibold">
            TOTAL:
          </td>
          <td className="px-3 py-3 font-bold text-gray-800 text-center">
            {maintenanceData.reduce((sum, d) => sum + d.persons, 0)}
          </td>
          <td className="px-3 py-3 font-bold text-indigo-600">
            {maintenanceData.reduce((sum, d) => sum + d.currentMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-3 py-3 font-bold text-red-600">
            {maintenanceData.reduce((sum, d) => sum + d.restante, 0).toFixed(2)}
          </td>
          <td className="px-3 py-3 font-bold text-purple-600">
            {maintenanceData.reduce((sum, d) => sum + d.totalMaintenance, 0).toFixed(2)}
          </td>
          <td className="px-3 py-3 font-bold text-orange-600">
            {maintenanceData.reduce((sum, d) => sum + d.penalitati, 0).toFixed(2)}
          </td>
          <td className="px-3 py-3 font-bold text-gray-800 text-lg">
            {maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
          </td>
          {expenses
            .filter(exp => exp.associationId === association?.id)
            .map(expense => (
              <td key={expense.id} className="px-3 py-3 font-bold text-sm bg-blue-50">
                {maintenanceData.reduce((sum, d) => sum + (d.expenseDetails?.[expense.name] || 0), 0).toFixed(2)}
              </td>
            ))
          }
        </tr>
        </tfoot>
      </table>
  );
};

export default MaintenanceTableDetailed;