// src/components/dashboard/RecentActivity.js
import React from 'react';
import { useIncasari } from '../../hooks/useIncasari';
import { usePaymentSync } from '../../hooks/usePaymentSync';

const RecentActivity = ({ maintenanceData, association, currentMonth, getAssociationApartments }) => {
  // Hook pentru încasări din Firestore
  const { getIncasariStats } = useIncasari(association, currentMonth);
  
  // Hook pentru sincronizarea cu plățile
  const { getPaymentStats } = usePaymentSync(association, currentMonth);

  if (!maintenanceData || maintenanceData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📝 Activitate Recentă</h3>
        <p className="text-gray-600">Adaugă cheltuieli pentru a genera primul tabel de întreținere.</p>
      </div>
    );
  }

  // Calculează totalul curent rămas de plată
  const totalDatoratCurent = maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0);
  
  // Pentru a calcula totalul inițial și ce s-a încasat, trebuie să folosim datele originale
  // Logica: Dacă maintenanceData vine cu date actualizate prin usePaymentSync,
  // atunci totalul inițial = totalul curent + ce s-a plătit deja
  
  let totalDatoratInitial = totalDatoratCurent; // Default: presupunem că nu s-a plătit nimic
  let totalIncasat = 0;
  let platiInregistrate = 0;
  
  if (association && getAssociationApartments) {
    const apartments = getAssociationApartments();
    const incasariStats = getIncasariStats(apartments);
    const paymentStats = getPaymentStats(maintenanceData);
    
    // Calculăm totalul încasat din Firestore
    const totalIncasatFirestore = incasariStats.totalAmount || 0;
    const totalIncasatPaymentStats = paymentStats.totalPaid || 0;
    
    // Folosim valoarea mai mare dintre cele două surse
    totalIncasat = Math.max(totalIncasatFirestore, totalIncasatPaymentStats);
    
    // Calculăm totalul inițial: ce avem acum + ce s-a încasat
    totalDatoratInitial = totalDatoratCurent + totalIncasat;
    
    // Numărul de apartamente care au plătit
    platiInregistrate = incasariStats.paidApartments || paymentStats.paidApartments || 0;
  } else {
    // Fallback: calculăm din maintenanceData
    // Presupunem că dacă d.paid === true, atunci a plătit tot d.totalDatorat original
    const apartamentePlatite = maintenanceData.filter(d => d.paid);
    platiInregistrate = apartamentePlatite.length;
    
    // Pentru fallback, nu avem acces la sumele originale
    // Estimăm că totalul inițial era totalul curent pentru cei neplătiți
    totalDatoratInitial = totalDatoratCurent;
    totalIncasat = 0; // Nu putem ști exact cât s-a încasat
  }

  // Calculează procentul de încasare: cât s-a încasat din totalul inițial
  const procentIncasare = totalDatoratInitial > 0 ? ((totalIncasat / totalDatoratInitial) * 100) : 0;
  
  // Total restante = ce mai rămâne de încasat
  const totalRestante = totalDatoratCurent;

  // Debug pentru calculul progresului de încasare
  console.log('RecentActivity - Progres Încasare Debug:', {
    totalDatoratCurent,
    totalDatoratInitial,
    totalIncasat,
    procentIncasare,
    totalRestante,
    platiInregistrate,
    apartamenteTotal: maintenanceData.length
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">📝 Activitate Recentă - {currentMonth || 'Luna Curentă'}</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
          <span className="font-medium">Tabel întreținere generat</span>
          <span className="text-green-600 font-bold">
            {maintenanceData.length} apartamente
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <span className="font-medium">Total întreținere publicată</span>
          <span className="text-blue-600 font-bold">
            {totalDatoratInitial.toFixed(2)} RON
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
          <span className="font-medium">Total de încasat</span>
          <span className="text-orange-600 font-bold">
            {totalRestante.toFixed(2)} RON
          </span>
        </div>
        {totalIncasat > 0 && (
          <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
            <span className="font-medium">Deja încasat</span>
            <span className="text-emerald-600 font-bold">
              {totalIncasat.toFixed(2)} RON
            </span>
          </div>
        )}
        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
          <div>
            <span className="font-medium">Plăți înregistrate: {platiInregistrate} / {maintenanceData.length}</span>
            <div className="text-sm text-gray-600">Procent încasare: {procentIncasare.toFixed(1)}%</div>
          </div>
        </div>
      </div>
      
      {/* Bară de progres */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progres încasare</span>
          <span>{procentIncasare.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(procentIncasare, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;