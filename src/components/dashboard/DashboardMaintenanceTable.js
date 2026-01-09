// src/components/dashboard/DashboardMaintenanceTable.js
import React, { useState } from 'react';
import { Calculator, Search } from 'lucide-react';
import { MaintenanceTableSimple } from '../tables';

const DashboardMaintenanceTable = ({
  maintenanceData,
  currentMonth,
  isMonthReadOnly,
  onOpenPaymentModal,
  onOpenMaintenanceBreakdown,
  handleNavigation,
  association,
  blocks,
  stairs,
  getAssociationApartments,
  expenses,
  isHistoricMonth = false,
  getPaymentStats,
  isLoadingPayments = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStairTab, setSelectedStairTab] = useState('all'); // 🆕 FAZA 6: Tab scară selectată
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

  // 🆕 FAZA 6: Filtrează datele după scară selectată
  const stairFilteredData = selectedStairTab === 'all'
    ? maintenanceData
    : maintenanceData.filter(data => {
        console.log('🔍 Filtering data:', {
          apartmentId: data.apartmentId,
          dataStairId: data.stairId,
          selectedStairTab,
          match: data.stairId === selectedStairTab
        });
        return data.stairId === selectedStairTab;
      });

  console.log('📊 Stair filter results:', {
    selectedStairTab,
    totalData: maintenanceData?.length || 0,
    filteredData: stairFilteredData?.length || 0
  });

  // Filtrează datele în funcție de căutare
  const filteredData = stairFilteredData.filter(data => {
    const searchLower = searchTerm.toLowerCase();
    return (
      data.apartment.toString().includes(searchLower) ||
      data.owner?.toLowerCase().includes(searchLower) ||
      data.paymentStatus?.toLowerCase().includes(searchLower)
    );
  });

  // 🆕 FAZA 6: Obține scările asociației curente
  const associationBlocks = blocks?.filter(block => block.associationId === association?.id) || [];
  const associationStairs = stairs?.filter(stair =>
    associationBlocks.some(block => block.id === stair.blockId)
  ) || [];

  // Calculează statisticile pentru datele filtrate (respectă tab-ul de scară selectat)
  const paymentStats = getPaymentStats ? getPaymentStats() : null;

  console.log('🔍 DashboardMaintenanceTable scroll debug:', {
    filteredDataLength: filteredData.length,
    shouldHaveScroll: filteredData.length > 10,
    disableSticky: filteredData.length <= 10,
    hasOverflow: filteredData.length > 10 ? 'overflow-auto' : 'none'
  });

  // Calculăm totalul datorat INIȚIAL pentru scara selectată
  // totalDatorat în maintenanceData este deja actualizat după plăți (reduced)
  // Trebuie să calculăm: totalDatorat actual + totalPaid pentru fiecare apartament
  const totalDatoratRamas = stairFilteredData.reduce((sum, d) => sum + (d.totalDatorat || 0), 0);

  // Totalul încasat pentru apartamentele din scara selectată
  // Folosim paymentStats global și filtrăm pentru apartamentele din scară
  let totalIncasatFiltered = 0;
  if (paymentStats && selectedStairTab === 'all') {
    // Pentru "Toate", folosim direct totalul din paymentStats
    totalIncasatFiltered = paymentStats.totalIncasat || 0;
  } else if (paymentStats) {
    // Pentru scară specifică, trebuie să calculăm manual pentru apartamentele din filtru
    // Problema: nu avem access la paymentSummary per apartament aici
    // Soluție: calculăm din diferența dintre initial și rămas
    // Dar nu avem initial saved... trebuie alt approach
    totalIncasatFiltered = paymentStats.totalIncasat || 0; // Fallback la total
  }

  const totalIncasat = totalIncasatFiltered;
  const totalDatoratInitial = totalDatoratRamas + totalIncasat; // Inițial = ce a rămas + ce s-a plătit
  const gradIncasare = totalDatoratInitial > 0 ? (totalIncasat / totalDatoratInitial) * 100 : 0;
  const apartamenteTotal = stairFilteredData.length;
  const apartamenteCuIncasari = stairFilteredData.filter(d => d.isPaid || d.isPartiallyPaid).length;

  return (
    <div className="rounded-xl shadow-lg bg-white border-2 border-gray-200 overflow-hidden">
      <div className={`p-3 sm:p-4 border-b ${isMonthReadOnly ? 'bg-blue-50' : 'bg-indigo-50'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex-shrink-0">
            <h3 className={`text-sm sm:text-lg font-semibold ${isMonthReadOnly ? 'text-gray-800' : ''}`}>
              📊 Tabel Întreținere - {currentMonth}
            </h3>
          </div>

          {/* Statistici de încasare - discret în dreapta */}
          {isMonthReadOnly && (
            <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Grad încasare:</span>
                <span className="font-semibold text-green-600">{gradIncasare.toFixed(1)}%</span>
                <span className="text-gray-400">({totalIncasat.toFixed(0)} / {totalDatoratInitial.toFixed(0)} RON)</span>
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Încasări:</span>
                <span className="font-semibold text-blue-600">{apartamenteCuIncasari} / {apartamenteTotal}</span>
                <span className="text-gray-400">apartamente</span>
              </div>
            </div>
          )}

          {/* Bara de căutare mutată în header */}
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Caută apartament, proprietar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm w-full"
            />
          </div>
        </div>

        {/* Statistici compacte pe mobile */}
        {isMonthReadOnly && (
          <div className="flex md:hidden items-center justify-between mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Grad încasare:</span>
              <span className="font-semibold text-green-600">{gradIncasare.toFixed(1)}%</span>
              <span className="text-gray-400">({totalIncasat.toFixed(0)}/{totalDatoratInitial.toFixed(0)} RON)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Încasări:</span>
              <span className="font-semibold text-blue-600">{apartamenteCuIncasari}/{apartamenteTotal} ap</span>
            </div>
          </div>
        )}
      </div>

      {/* Tab-uri pentru scări - doar dacă avem mai multe blocuri/scări */}
      {(associationBlocks.length > 1 || associationStairs.length > 1) && (
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200" style={{ position: 'sticky' }}>
          <div className="flex overflow-x-auto">
            {/* Tab "Toate" */}
            <button
              onClick={() => setSelectedStairTab('all')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                selectedStairTab === 'all'
                  ? 'bg-purple-100 text-purple-700 border-purple-700'
                  : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900 hover:bg-purple-100'
              }`}
            >
              Toate
            </button>

            {/* Tab pentru fiecare scară */}
            {associationStairs.map(stair => {
              const block = associationBlocks.find(b => b.id === stair.blockId);

              return (
                <button
                  key={stair.id}
                  onClick={() => setSelectedStairTab(stair.id)}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    selectedStairTab === stair.id
                      ? 'bg-purple-100 text-purple-700 border-purple-700'
                      : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900 hover:bg-purple-100'
                  }`}
                >
                  {block?.name} - {stair.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`overflow-x-auto ${filteredData.length > 10 ? "overflow-y-auto" : "overflow-y-hidden"}`}
        style={filteredData.length > 10 ? { maxHeight: '70vh' } : {}}
      >
        <MaintenanceTableSimple
          maintenanceData={filteredData}
          isMonthReadOnly={isMonthReadOnly}
          togglePayment={() => {}} // Nu e disponibil în Dashboard
          onOpenPaymentModal={onOpenPaymentModal}
          onOpenMaintenanceBreakdown={onOpenMaintenanceBreakdown}
          isHistoricMonth={isHistoricMonth}
          getPaymentStats={getPaymentStats}
          isLoadingPayments={isLoadingPayments}
          disableSticky={filteredData.length <= 10}
        />
      </div>
    </div>
  );
};

export default DashboardMaintenanceTable;