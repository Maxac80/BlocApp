// src/components/dashboard/DashboardMaintenanceTable.js
import React from 'react';
import { CheckCircle, XCircle, Calculator, FileDown } from 'lucide-react';

const DashboardMaintenanceTable = ({
  maintenanceData,
  currentMonth,
  isMonthReadOnly,
  onOpenPaymentModal,
  exportPDFAvizier,
  handleNavigation
}) => {
  if (!maintenanceData || maintenanceData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">📊 Tabel Întreținere - {currentMonth}</h3>
          <button 
            onClick={() => handleNavigation("maintenance")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Calculator className="w-4 h-4 mr-2 inline-block" />
            Calculează Întreținere
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">Nu există date de întreținere</p>
          <p className="text-sm mt-1">Calculează întreținerea pentru a vedea tabelul</p>
        </div>
      </div>
    );
  }

  const totalIncasat = maintenanceData.filter(d => d.paid).reduce((sum, d) => sum + d.totalDatorat, 0);
  const totalRestante = maintenanceData.filter(d => !d.paid).reduce((sum, d) => sum + d.totalDatorat, 0);
  const apartmentePlatite = maintenanceData.filter(d => d.paid).length;
  const apartamenteRestante = maintenanceData.filter(d => !d.paid).length;

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Header cu statistici rapide */}
      <div className="p-6 bg-blue-50 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-blue-800">📊 Tabel Întreținere - {currentMonth}</h3>
          <div className="flex items-center gap-3">
            {isMonthReadOnly(currentMonth) && (
              <button 
                onClick={exportPDFAvizier}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                <FileDown className="w-4 h-4 mr-2 inline-block" />
                Export PDF
              </button>
            )}
            <button 
              onClick={() => handleNavigation("maintenance")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Detalii Complete
            </button>
          </div>
        </div>
        
        {/* Statistici rapide */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-600">{apartmentePlatite}</div>
            <div className="text-xs text-gray-600">Ap. Plătite</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-600">{apartamenteRestante}</div>
            <div className="text-xs text-gray-600">Ap. Restante</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-600">{totalIncasat.toFixed(0)}</div>
            <div className="text-xs text-gray-600">Total Încasat</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-600">{totalRestante.toFixed(0)}</div>
            <div className="text-xs text-gray-600">Total Restante</div>
          </div>
        </div>
      </div>

      {/* Tabelul de întreținere */}
      <div className="p-6 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Apartament</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Proprietar</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Pers.</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Întreținere</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Restanță</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Penalități</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Total</th>
              {isMonthReadOnly(currentMonth) && (
                <>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Acțiuni</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {maintenanceData.map(data => (
              <tr key={data.apartmentId} className={`hover:bg-gray-50 ${data.paid ? 'bg-green-50' : ''}`}>
                <td className="px-3 py-3 font-semibold">Ap. {data.apartment}</td>
                <td className="px-3 py-3 text-blue-600 font-medium text-sm">{data.owner}</td>
                <td className="px-3 py-3 text-center text-sm">{data.persons}</td>
                <td className="px-3 py-3 font-medium text-indigo-600 text-sm">{data.currentMaintenance?.toFixed(2) || '0.00'}</td>
                <td className="px-3 py-3 font-medium text-red-600 text-sm">{data.restante?.toFixed(2) || '0.00'}</td>
                <td className="px-3 py-3 font-medium text-orange-600 text-sm">{data.penalitati?.toFixed(2) || '0.00'}</td>
                <td className="px-3 py-3 font-bold text-gray-800">{data.totalDatorat?.toFixed(2) || '0.00'}</td>
                {isMonthReadOnly(currentMonth) && (
                  <>
                    <td className="px-3 py-3">
                      {data.paid ? (
                        <span className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Plătit
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 text-sm">
                          <XCircle className="w-4 h-4 mr-1" />
                          Restant
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button 
                        onClick={() => onOpenPaymentModal && onOpenPaymentModal({
                          apartmentId: data.apartmentId,
                          apartmentNumber: data.apartment,
                          owner: data.owner,
                          restante: data.restante,
                          intretinere: data.currentMaintenance,
                          penalitati: data.penalitati,
                          totalDatorat: data.totalDatorat,
                          initialBalance: data.initialBalance
                        })}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        💰 Încasează
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          
          {/* Footer cu totaluri */}
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan="3" className="px-3 py-3 font-semibold text-sm">TOTAL ASOCIAȚIE:</td>
              <td className="px-3 py-3 font-bold text-indigo-600 text-sm">
                {maintenanceData.reduce((sum, d) => sum + (d.currentMaintenance || 0), 0).toFixed(2)}
              </td>
              <td className="px-3 py-3 font-bold text-red-600 text-sm">
                {maintenanceData.reduce((sum, d) => sum + (d.restante || 0), 0).toFixed(2)}
              </td>
              <td className="px-3 py-3 font-bold text-orange-600 text-sm">
                {maintenanceData.reduce((sum, d) => sum + (d.penalitati || 0), 0).toFixed(2)}
              </td>
              <td className="px-3 py-3 font-bold text-gray-800">
                {maintenanceData.reduce((sum, d) => sum + (d.totalDatorat || 0), 0).toFixed(2)}
              </td>
              {isMonthReadOnly(currentMonth) && (
                <td colSpan="2" className="px-3 py-3 font-semibold text-green-600 text-sm">
                  Încasat: {totalIncasat.toFixed(2)} lei
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default DashboardMaintenanceTable;