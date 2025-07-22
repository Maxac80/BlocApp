import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const MaintenanceTableSimple = ({ 
  maintenanceData, 
  isMonthReadOnly, 
  togglePayment 
}) => {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Apartament</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Proprietar</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Persoane</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Întreținere Curentă</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Restanță</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Total Întreținere</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Penalități</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Total Datorat</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Status</th>
          <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Acțiuni</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {maintenanceData.map(data => (
          <tr key={data.apartmentId} className="hover:bg-gray-50">
            <td className="px-3 py-3 font-semibold">Ap. {data.apartment}</td>
            <td className="px-3 py-3 text-blue-600 font-medium text-sm">{data.owner}</td>
            <td className="px-3 py-3 text-center">{data.persons}</td>
            <td className="px-3 py-3 font-bold text-indigo-600">{data.currentMaintenance.toFixed(2)}</td>
            <td className="px-3 py-3 font-bold text-red-600">{data.restante.toFixed(2)}</td>
            <td className="px-3 py-3 font-bold text-purple-600">{data.totalMaintenance.toFixed(2)}</td>
            <td className="px-3 py-3 font-bold text-orange-600">{data.penalitati.toFixed(2)}</td>
            <td className="px-3 py-3 font-bold text-gray-800 text-lg">{data.totalDatorat.toFixed(2)}</td>
            <td className="px-3 py-3">
              {isMonthReadOnly ? (
                data.paid ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Plătit
                  </span>
                ) : (
                  <span className="flex items-center text-red-600">
                    <XCircle className="w-4 h-4 mr-1" />
                    Restant
                  </span>
                )
              ) : (
                <span className="flex items-center text-gray-500">
                  <div className="w-4 h-4 mr-1 bg-gray-300 rounded-full"></div>
                  În lucru
                </span>
              )}
            </td>
            <td className="px-3 py-3">
              {isMonthReadOnly ? (
                <button 
                  onClick={() => togglePayment(data.apartmentId)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    data.paid 
                      ? "bg-red-100 text-red-700 hover:bg-red-200" 
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {data.paid ? "Marchează restant" : "Marchează plătit"}
                </button>
              ) : (
                <span className="text-gray-500 text-sm">
                  Publică luna pentru încasări
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-gray-50">
        <tr>
          <td colSpan="3" className="px-3 py-3 font-semibold">TOTAL ÎNCASAT:</td>
          <td className="px-3 py-3 font-bold text-green-600">
            {maintenanceData.filter(d => d.paid).reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
          </td>
          <td colSpan="2" className="px-3 py-3 font-semibold text-right">TOTAL RESTANȚE:</td>
          <td colSpan="4" className="px-3 py-3 font-bold text-red-600">
            {maintenanceData.filter(d => !d.paid).reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
};

export default MaintenanceTableSimple;