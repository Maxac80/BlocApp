// src/components/dashboard/RecentActivity.js
import React from 'react';

const RecentActivity = ({ maintenanceData }) => {
  if (!maintenanceData || maintenanceData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📝 Activitate Recentă</h3>
        <p className="text-gray-600">Adaugă cheltuieli pentru a genera primul tabel de întreținere.</p>
      </div>
    );
  }

  const totalDatorat = maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0);
  const totalIncasat = maintenanceData.filter(d => d.paid).reduce((sum, d) => sum + d.totalDatorat, 0);
  const platiInregistrate = maintenanceData.filter(d => d.paid).length;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">📝 Activitate Recentă</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <span>Tabel întreținere pentru {maintenanceData.length} apartamente</span>
          <span className="text-green-600 font-medium">
            Total: {totalDatorat.toFixed(2)} RON
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <span>Plăți înregistrate: {platiInregistrate} / {maintenanceData.length}</span>
          <span className="text-blue-600 font-medium">
            Încasat: {totalIncasat.toFixed(2)} RON
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;