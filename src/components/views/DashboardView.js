// src/components/views/DashboardView.js
import React from 'react';
import { 
  AssociationCreator, 
  StatisticsCards, 
  RecentActivity, 
  DashboardHeader 
} from '../dashboard';

const DashboardView = ({
  // Association data
  association,
  blocks,
  stairs,
  getAssociationApartments,
  
  // Month management
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  isMonthReadOnly,
  
  // Association creation
  newAssociation,
  setNewAssociation,
  handleAddAssociation,
  
  // Navigation
  handleNavigation,
  
  // Data
  expenses,
  maintenanceData
}) => {
  const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  
  return (
    <div className={`min-h-screen p-4 ${
      currentMonth === currentMonthStr
        ? "bg-gradient-to-br from-blue-50 to-indigo-100"
        : "bg-gradient-to-br from-green-50 to-emerald-100"
    }`}>
      <div className="max-w-6xl mx-auto">
        <DashboardHeader
          association={association}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          getAvailableMonths={getAvailableMonths}
          isMonthReadOnly={isMonthReadOnly}
          getAssociationApartments={getAssociationApartments}
          handleNavigation={handleNavigation}
        />

        {/* Condiție principală: Dacă nu există asociație, afișează creatorul */}
        {!association && (
          <AssociationCreator
            newAssociation={newAssociation}
            setNewAssociation={setNewAssociation}
            handleAddAssociation={handleAddAssociation}
          />
        )}

        {/* Dacă există asociație fără apartamente */}
        {association && getAssociationApartments().length === 0 && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-xl mb-8">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              ✅ Asociația "{association.name}" a fost creată!
            </h3>
            <p className="text-green-700 mb-4">
              Acum să adaugăm structura: blocurile, scările și apartamentele.
            </p>
            <button 
              onClick={() => handleNavigation("setup")}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
            >
              📋 Configurează Blocurile și Apartamentele
            </button>
          </div>
        )}

        {/* Dacă există asociație cu apartamente - dashboard normal */}
        {association && getAssociationApartments().length > 0 && (
          <>
            <StatisticsCards
              association={association}
              blocks={blocks}
              stairs={stairs}
              getAssociationApartments={getAssociationApartments}
              expenses={expenses}
              currentMonth={currentMonth}
              maintenanceData={maintenanceData}
            />

            <RecentActivity maintenanceData={maintenanceData} />
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardView;