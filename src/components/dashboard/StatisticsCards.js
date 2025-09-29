// src/components/dashboard/StatisticsCards.js
import React from 'react';
import { useIncasari } from '../../hooks/useIncasari';
import { usePaymentSync } from '../../hooks/usePaymentSync';

const StatisticsCards = ({
  association,
  blocks,
  stairs,
  getAssociationApartments,
  expenses,
  currentMonth,
  maintenanceData,
  currentSheet
}) => {
  // Hook pentru încasări din Firestore
  const { getIncasariStats } = useIncasari(association, currentMonth);
  
  // Hook pentru sincronizarea cu plățile
  const { getPaymentStats } = usePaymentSync(association, currentMonth);

  if (!association || getAssociationApartments().length === 0) {
    return null;
  }

  const apartments = getAssociationApartments();
  const associationBlocks = blocks.filter(b => b.associationId === association.id);
  const associationStairs = stairs.filter(s => 
    associationBlocks.some(b => b.id === s.blockId)
  );
  const apartmentCount = apartments.length;
  const personCount = apartments.reduce((sum, apt) => sum + apt.persons, 0);
  
  // SHEET-BASED: Folosește cheltuielile din sheet-ul curent
  const currentMonthExpenses = currentSheet?.expenses || [];
  const expenseCount = currentMonthExpenses.length;
  const totalExpenses = currentMonthExpenses.reduce((sum, expense) => {
    // Pentru cheltuielile pe consum folosește billAmount, pentru altele amount
    return sum + (expense.isUnitBased ? (expense.billAmount || 0) : (expense.amount || 0));
  }, 0);
  
  // Obține statisticile reale de încasări din Firestore
  const incasariStats = getIncasariStats(apartments);
  const paymentStats = getPaymentStats(maintenanceData);
  
  // Folosește datele din Firestore pentru încasări, fallback la maintenanceData
  const totalIncasari = incasariStats.totalAmount || paymentStats.totalPaid || 0;
  const apartmentePlatite = incasariStats.paidApartments || paymentStats.paidApartments || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-4 mb-8 overflow-x-auto">
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
        <div className="text-lg font-bold text-blue-600">{expenseCount}</div>
        <div className="text-xs text-gray-600">Cheltuieli</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-lg font-bold text-indigo-600">{totalExpenses.toFixed(0)}</div>
        <div className="text-xs text-gray-600">Val. Cheltuieli</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-lg font-bold text-emerald-600">{totalIncasari.toFixed(0)}</div>
        <div className="text-xs text-gray-600">Total Încasări</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-lg font-bold text-green-600">{apartmentePlatite}</div>
        <div className="text-xs text-gray-600">Ap. Plătite</div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
        <div className="text-lg font-bold text-red-600">{apartmentCount - apartmentePlatite}</div>
        <div className="text-xs text-gray-600">Ap. Restante</div>
      </div>
    </div>
  );
};

export default StatisticsCards;