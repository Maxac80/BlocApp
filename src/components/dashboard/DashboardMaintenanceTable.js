// src/components/dashboard/DashboardMaintenanceTable.js
import React, { useState } from 'react';
import { Calculator, Search } from 'lucide-react';
import { MaintenanceTableSimple, MaintenanceTableDetailed } from '../tables';

const DashboardMaintenanceTable = ({
  maintenanceData,
  currentMonth,
  isMonthReadOnly,
  onOpenPaymentModal,
  exportPDFAvizier,
  handleNavigation,
  association,
  blocks,
  stairs,
  getAssociationApartments,
  expenses,
  isHistoricMonth = false
}) => {
  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState("simple");
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
    : maintenanceData.filter(data => data.stairId === selectedStairTab);

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

  return (
    <div className={`rounded-xl shadow-lg overflow-hidden ${isMonthReadOnly ? 'bg-purple-50 border-2 border-purple-200' : 'bg-white'}`}>
      <div className={`p-4 border-b ${isMonthReadOnly ? 'bg-purple-100' : 'bg-indigo-50'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`text-lg font-semibold ${isMonthReadOnly ? 'text-purple-800' : ''}`}>
              📊 Tabel Întreținere - {currentMonth} 
              {isMonthReadOnly && <span className="text-sm bg-purple-200 px-2 py-1 rounded-full ml-2">(PUBLICATĂ)</span>}
            </h3>
            {association && getAssociationApartments().length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {(() => {
                  const associationBlocks = blocks?.filter(block => block.associationId === association.id) || [];
                  const associationStairs = stairs?.filter(stair => 
                    associationBlocks.some(block => block.id === stair.blockId)
                  ) || [];
                  const apartmentCount = getAssociationApartments().length;
                  const personCount = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
                  
                  let structureText = "";
                  if (associationBlocks.length === 1 && associationStairs.length === 1) {
                    structureText = `${associationBlocks[0].name} - ${associationStairs[0].name}`;
                  } else if (associationBlocks.length === 1) {
                    structureText = `${associationBlocks[0].name} - ${associationStairs.length} scări`;
                  } else {
                    structureText = `${associationBlocks.length} blocuri - ${associationStairs.length} scări`;
                  }
                  
                  return `${association.name} • ${structureText} • ${apartmentCount} apartamente - ${personCount} persoane`;
                })()}
              </p>
            )}
            <div className="flex items-center space-x-2 mt-1">
              {isMonthReadOnly ? (
                <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  📋 PUBLICATĂ
                </span>
              ) : (
                <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  🔧 ÎN LUCRU
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            {/* Buton Export PDF */}
            {maintenanceData.length > 0 && activeMaintenanceTab === "simple" && (
              <button 
                onClick={exportPDFAvizier}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                title="Exportă PDF pentru avizier"
              >
                📄 Export PDF
              </button>
            )}
            {/* Buton către pagina completă */}
            <button 
              onClick={() => handleNavigation("maintenance")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Detalii Complete
            </button>
          </div>
        </div>
        
        {/* Căutare și tabs */}
        <div className="flex items-center justify-between border-t border-indigo-100 pt-3">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveMaintenanceTab("simple")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeMaintenanceTab === "simple" 
                  ? "bg-indigo-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tabel Simplificat
            </button>
            <button
              onClick={() => setActiveMaintenanceTab("detailed")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeMaintenanceTab === "detailed" 
                  ? "bg-indigo-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tabel Detaliat
            </button>
          </div>
          
          {/* Bara de căutare */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Caută apartament, proprietar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64"
            />
          </div>
        </div>
      </div>

      {/* 🆕 FAZA 6: Tab-uri pentru scări */}
      {associationStairs.length > 0 && (
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200" style={{ position: 'sticky' }}>
          <div className="flex overflow-x-auto px-4">
            {/* Tab "Toate" */}
            <button
              onClick={() => setSelectedStairTab('all')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                selectedStairTab === 'all'
                  ? 'bg-blue-50 text-blue-700 border-blue-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Toate ({maintenanceData.length})
            </button>

            {/* Tab pentru fiecare scară */}
            {associationStairs.map(stair => {
              const block = associationBlocks.find(b => b.id === stair.blockId);
              const stairDataCount = maintenanceData.filter(data => data.stairId === stair.id).length;

              return (
                <button
                  key={stair.id}
                  onClick={() => setSelectedStairTab(stair.id)}
                  className={`px-6 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                    selectedStairTab === stair.id
                      ? 'bg-blue-50 text-blue-700 border-blue-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {block?.name} - {stair.name} ({stairDataCount})
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {activeMaintenanceTab === "simple" ? (
          <MaintenanceTableSimple
            maintenanceData={filteredData}
            isMonthReadOnly={isMonthReadOnly}
            togglePayment={() => {}} // Nu e disponibil în Dashboard
            onOpenPaymentModal={onOpenPaymentModal}
            isHistoricMonth={isHistoricMonth}
          />
        ) : (
          <MaintenanceTableDetailed
            maintenanceData={filteredData}
            expenses={expenses || []}
            association={association}
            isMonthReadOnly={isMonthReadOnly}
            onOpenPaymentModal={onOpenPaymentModal}
            isHistoricMonth={isHistoricMonth}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardMaintenanceTable;