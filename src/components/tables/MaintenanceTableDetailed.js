import React from 'react';

const MaintenanceTableDetailed = ({ 
  maintenanceData, 
  expenses, 
  association 
}) => {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">Apartament</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Proprietar</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Persoane</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Întreținere Curentă</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Restanță</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Total Întreținere</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Penalități</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 border-r-2 border-gray-300">Total Datorat</th>
          {expenses
            .filter(exp => exp.associationId === association?.id)
            .map(expense => (
              <th key={expense.id} className="px-3 py-3 text-left text-sm font-medium text-gray-700 bg-blue-50">
                {expense.name}
              </th>
            ))
          }
        </tr>
      </thead>
      <tbody className="divide-y">
        {maintenanceData.map(data => (
          <tr key={data.apartmentId} className="hover:bg-gray-50">
            <td className="px-3 py-3 font-semibold sticky left-0 bg-white z-10">Ap. {data.apartment}</td>
            <td className="px-3 py-3 text-blue-600 font-medium text-sm">{data.owner}</td>
            <td className="px-3 py-3 text-center">{data.persons}</td>
            <td className="px-3 py-3 font-bold text-indigo-600">{data.currentMaintenance.toFixed(2)}</td>
            <td className="px-3 py-3 font-bold text-red-600">{data.restante.toFixed(2)}</td>
            <td className="px-3 py-3 font-bold text-purple-600">{data.totalMaintenance.toFixed(2)}</td>
            <td className="px-3 py-3 font-bold text-orange-600">{data.penalitati.toFixed(2)}</td>
            <td className="px-3 py-3 font-bold text-gray-800 text-lg border-r-2 border-gray-300">{data.totalDatorat.toFixed(2)}</td>
            {expenses
              .filter(exp => exp.associationId === association?.id)
              .map(expense => (
                <td key={expense.id} className="px-3 py-3 text-sm">
                  {data.expenseDetails?.[expense.name] !== undefined ? 
                    data.expenseDetails[expense.name].toFixed(2) : 
                    '0.00'
                  }
                </td>
              ))
            }
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-gray-50">
        <tr>
          <td colSpan="3" className="px-3 py-3 font-semibold sticky left-0 bg-gray-50 z-10">TOTAL:</td>
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
          <td className="px-3 py-3 font-bold text-gray-800 text-lg border-r-2 border-gray-300">
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