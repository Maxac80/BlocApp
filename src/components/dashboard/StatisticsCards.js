// src/components/dashboard/StatisticsCards.js
import React from 'react';

const StatisticsCards = ({
  association,
  blocks,
  stairs,
  getAssociationApartments,
  expenses,
  currentMonth,
  maintenanceData
}) => {
  if (!association || getAssociationApartments().length === 0) {
    return null;
  }

  const associationBlocks = blocks.filter(b => b.associationId === association.id);
  const associationStairs = stairs.filter(s => 
    associationBlocks.some(b => b.id === s.blockId)
  );
  const apartmentCount = getAssociationApartments().length;
  const personCount = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
  const expenseCount = expenses.filter(e => e.associationId === association.id && e.month === currentMonth).length;
  const totalIncasari = maintenanceData.filter(d => d.paid).reduce((sum, d) => sum + d.totalDatorat, 0);

  return (
    <div className="grid grid-cols-6 gap-4 mb-8 overflow-x-auto">
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-2xl font-bold text-green-600">{associationBlocks.length}</div>
        <div className="text-sm text-gray-600">Blocuri</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-2xl font-bold text-purple-600">{associationStairs.length}</div>
        <div className="text-sm text-gray-600">Scări</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-2xl font-bold text-orange-600">{apartmentCount}</div>
        <div className="text-sm text-gray-600">Apartamente</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-2xl font-bold text-teal-600">{personCount}</div>
        <div className="text-sm text-gray-600">Persoane</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-2xl font-bold text-blue-600">{expenseCount}</div>
        <div className="text-sm text-gray-600">Cheltuieli {currentMonth}</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-2xl font-bold text-emerald-600">{totalIncasari.toFixed(0)}</div>
        <div className="text-sm text-gray-600">Încasări RON</div>
      </div>
    </div>
  );
};

export default StatisticsCards;