import React from 'react';
import { ArrowLeft, Settings, Plus } from 'lucide-react';

const MaintenanceSummary = ({
  association,
  blocks,
  stairs,
  currentMonth,
  setCurrentMonth,
  isMonthReadOnly,
  shouldShowPublishButton,
  shouldShowAdjustButton,
  hasInitialBalances,
  publishMonth,
  onAdjustBalances,
  exportPDFAvizier,
  maintenanceData,
  handleNavigation,
  getAssociationApartments
}) => {
return (
  <div className="mb-6">
    {/* Prima secțiune - Header cu dropdown */}
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">📊 Tabel Întreținere - {association?.name}</h2>
        {association && getAssociationApartments().length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            {(() => {
              const associationBlocks = blocks.filter(block => block.associationId === association.id);
              const associationStairs = stairs.filter(stair => 
                associationBlocks.some(block => block.id === stair.blockId)
              );
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
              
              return `${structureText} • ${apartmentCount} apartamente - ${personCount} persoane`;
            })()}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value={new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}>
              Luna: {new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}
            </option>
            <option value={(() => {
              const nextMonth = new Date();
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              return nextMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
            })()}>
              Luna: {(() => {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                return nextMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
              })()}
            </option>
          </select>
          {currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }) ? (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              LUNA CURENTĂ
            </span>
          ) : (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              LUNA URMĂTOARE
            </span>
          )}
          {isMonthReadOnly(currentMonth) ? (
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
    </div>

    {/* A doua secțiune - Butoanele (mutate mai jos) */}
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Tab-uri pentru luni */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button 
            onClick={() => setCurrentMonth(new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }))}
            className={`px-4 py-2 rounded-md transition-all font-medium text-sm ${
              currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                ? "bg-blue-600 text-white shadow-md transform scale-105"
                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Luna Curentă
          </button>
          <button 
            onClick={() => {
              const nextMonth = new Date();
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setCurrentMonth(nextMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" }));
            }}
            className={`px-4 py-2 rounded-md transition-all font-medium text-sm ${
              currentMonth !== new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                ? "bg-green-600 text-white shadow-md transform scale-105"
                : "text-gray-600 hover:text-green-600 hover:bg-green-50"
            }`}
          >
            Luna Următoare
          </button>
        </div>

        {/* Buton Export PDF Avizier */}
        {maintenanceData.length > 0 && (
          <button 
            onClick={exportPDFAvizier}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
            title="Exportă PDF pentru avizier (fără nume proprietari)"
          >
            📄 Export PDF Avizier
          </button>
        )}

        {/* Buton Publică Luna */}
        {shouldShowPublishButton(currentMonth) && (
          <button 
            onClick={() => publishMonth(currentMonth)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
          >
            📋 Publică Luna
          </button>
        )}

        {/* Buton Ajustări Solduri */}
        {shouldShowAdjustButton(currentMonth) && (
          (currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }) ? hasInitialBalances : true)
        ) && (
          <button 
            onClick={onAdjustBalances}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
          >
            <Settings className="w-4 h-4 mr-2" />
            Ajustări Solduri
          </button>
        )}
      </div>
    </div>
  </div>
);
};

export default MaintenanceSummary;