// src/components/dashboard/DashboardMaintenanceTable.js
import React, { useState } from 'react';
import { Calculator, Search, ClipboardList, FileSpreadsheet } from 'lucide-react';
import { MaintenanceTableSimple } from '../tables';
import { matchesSearch } from '../../utils/searchHelpers';

// Iconiță inline file PDF cu badge "PDF"
const PdfFileIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <text x="12" y="18" fontSize="6" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">PDF</text>
  </svg>
);

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
  isLoadingPayments = false,
  payments = [],
  consumptionMonth,
  onExportPdf,
  canExportPdf = false,
  onExportExcel,
  exportingExcel = false,
  userProfile,
  currentUser
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
        return data.stairId === selectedStairTab;
      });


  // Filtrează datele în funcție de căutare
  const filteredData = stairFilteredData.filter(data => {
    if (!searchTerm) return true;
    return (
      data.apartment.toString().includes(searchTerm) ||
      matchesSearch(data.owner, searchTerm) ||
      matchesSearch(data.paymentStatus, searchTerm)
    );
  });

  // 🆕 FAZA 6: Obține scările asociației curente
  const associationBlocks = blocks?.filter(block => block.associationId === association?.id) || [];
  const associationStairs = stairs?.filter(stair =>
    associationBlocks.some(block => block.id === stair.blockId)
  ) || [];

  // Calculează statisticile pentru datele filtrate (respectă tab-ul de scară selectat)
  const paymentStats = getPaymentStats ? getPaymentStats() : null;


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

  const totalIncasat = totalIncasatFiltered || 0;
  const totalDatoratInitial = (totalDatoratRamas || 0) + (totalIncasat || 0); // Inițial = ce a rămas + ce s-a plătit
  const gradIncasare = totalDatoratInitial > 0 ? ((totalIncasat || 0) / totalDatoratInitial) * 100 : 0;
  const apartamenteTotal = stairFilteredData.length;
  const apartamenteCuIncasari = stairFilteredData.filter(d => d.isPaid || d.isPartiallyPaid).length;

  return (
    <div className="rounded-xl shadow-lg bg-white ring-2 ring-gray-200">
      <div
        className={`p-3 sm:p-4 border-b rounded-t-xl ${isMonthReadOnly ? 'bg-blue-50' : 'bg-indigo-50'}`}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <h3 className={`text-sm sm:text-lg font-bold flex items-center gap-2 ${isMonthReadOnly ? 'text-gray-800' : 'text-gray-900'}`}>
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <span>
              Tabel Întreținere{currentMonth ? ` - ${currentMonth}` : ''}
              {consumptionMonth && (
                <span className="text-xs sm:text-sm font-normal text-gray-500 ml-1 sm:ml-2">
                  · consum {consumptionMonth}
                </span>
              )}
            </span>
          </h3>
          {canExportPdf && (onExportPdf || onExportExcel) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {onExportPdf && (
                <button
                  onClick={() => onExportPdf(stairFilteredData)}
                  disabled={!maintenanceData || maintenanceData.length === 0}
                  className="bg-red-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center text-xs sm:text-sm"
                  title="Exportă tabel întreținere în PDF"
                >
                  <PdfFileIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Exportă PDF
                </button>
              )}
              {onExportExcel && (
                <button
                  onClick={() => onExportExcel(stairFilteredData)}
                  disabled={!maintenanceData || maintenanceData.length === 0 || exportingExcel}
                  className="bg-green-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center text-xs sm:text-sm"
                  title="Exportă tabel întreținere în Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {exportingExcel ? 'Se generează…' : 'Exportă Excel'}
                </button>
              )}
            </div>
          )}
        </div>
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

      <MaintenanceTableSimple
        maintenanceData={filteredData}
        isMonthReadOnly={isMonthReadOnly}
        togglePayment={() => {}} // Nu e disponibil în Dashboard
        onOpenPaymentModal={onOpenPaymentModal}
        onOpenMaintenanceBreakdown={onOpenMaintenanceBreakdown}
        isHistoricMonth={isHistoricMonth}
        getPaymentStats={getPaymentStats}
        isLoadingPayments={isLoadingPayments}
        disableSticky={false}
        payments={payments}
        handleNavigation={handleNavigation}
        apartments={getAssociationApartments ? getAssociationApartments() : []}
        blocks={blocks}
        stairs={stairs}
        userProfile={userProfile}
        currentUser={currentUser}
        association={association}
      />
    </div>
  );
};

export default DashboardMaintenanceTable;