// src/components/views/DashboardView.js
import React, { useState } from 'react';
import { 
  AssociationCreator, 
  StatisticsCards, 
  RecentActivity, 
  DashboardHeader,
  DashboardMaintenanceTable 
} from '../dashboard';
import { PaymentModal, VersionHistoryModal } from '../modals';

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
  maintenanceData,
  
  // Versioning
  getAvailableVersions,
  loadVersion,
  exportHistory,
  importHistory,
  isLoadingVersion,
  
  // User profile
  userProfile
}) => {
  const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  
  // State pentru modalul de plăți
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);

  // State pentru modalul de versioning
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Handler pentru deschiderea modalului de plăți
  const handleOpenPaymentModal = (apartmentData) => {
    setSelectedApartment(apartmentData);
    setShowPaymentModal(true);
  };

  // Handler pentru salvarea plății
  const handleSavePayment = (paymentData) => {
    console.log('💰 Salvare plată:', paymentData);
    // TODO: Implementează logica de salvare în Firebase
    alert(`✅ Plată înregistrată: ${paymentData.total.toFixed(2)} lei pentru Ap. ${selectedApartment.apartmentNumber}`);
  };

  // Funcție simplificată pentru export PDF (pentru Dashboard)
  const exportPDFAvizier = () => {
    alert('🔄 Funcția de export PDF va fi implementată în versiunea completă. Te redirectăm către ecranul de Întreținere...');
    handleNavigation("maintenance");
  };

  // Handler pentru selectarea unei versiuni
  const handleSelectVersion = (month, versionData) => {
    console.log(`📊 Versiunea selectată: ${month}`, versionData);
    alert(`📊 Versiunea pentru ${month} a fost încărcată!\n\nStatistici:\n• ${versionData.statistics.totalApartments} apartamente\n• ${versionData.statistics.apartmentePlatite} plătite\n• ${versionData.statistics.apartamenteRestante} restante\n• ${versionData.statistics.totalIncasat.toFixed(2)} lei încasați`);
    // TODO: Implementează afișarea datelor versiunii în interfață
  };
  
  return (
    <div className={`min-h-screen p-4 ${
      currentMonth === currentMonthStr
        ? "bg-gradient-to-br from-indigo-50 to-blue-100"
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
          onShowVersionHistory={() => setShowVersionHistory(true)}
        />

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        </div>

        {/* Condiție principală: Dacă nu există asociație și utilizatorul nu a trecut prin onboarding */}
        {!association && !userProfile?.metadata?.onboardingCompleted && (
          <AssociationCreator
            newAssociation={newAssociation}
            setNewAssociation={setNewAssociation}
            handleAddAssociation={handleAddAssociation}
          />
        )}

        {/* Dacă utilizatorul a trecut prin onboarding dar nu are asociație */}
        {!association && userProfile?.metadata?.onboardingCompleted && (
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-8">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              🔄 Se încarcă datele asociației...
            </h3>
            <p className="text-yellow-700 mb-4">
              Asociația ta a fost creată în timpul configurării inițiale. Dacă nu se încarcă în câteva secunde, încearcă să reîmprospătezi pagina.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 font-medium"
            >
              🔄 Reîmprospătează Pagina
            </button>
          </div>
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

            {/* Verifică dacă există cel puțin o lună publicată */}
            {(() => {
              const availableMonths = getAvailableMonths();
              const hasPublishedMonth = availableMonths.some(month => isMonthReadOnly(month.value));
              
              if (!hasPublishedMonth) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-2xl">📊</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-amber-800">Tabel Întreținere</h3>
                        <p className="text-amber-700">Va fi disponibil după publicarea primei luni</p>
                      </div>
                    </div>
                    <div className="bg-amber-100 rounded-lg p-4 mb-4">
                      <p className="text-amber-800 font-medium mb-2">📝 Pentru a vedea tabelul de întreținere:</p>
                      <ol className="text-amber-700 text-sm space-y-1 ml-4">
                        <li>1. Mergi la secțiunea <strong>Întreținere</strong></li>
                        <li>2. Calculează întreținerea pentru luna curentă</li>
                        <li>3. Publică luna când este gata</li>
                        <li>4. Tabelul va apărea aici în Dashboard</li>
                      </ol>
                    </div>
                    <button 
                      onClick={() => handleNavigation("maintenance")}
                      className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                    >
                      📊 Mergi la Întreținere
                    </button>
                  </div>
                );
              }
              
              return (
                <DashboardMaintenanceTable
                  maintenanceData={maintenanceData}
                  currentMonth={currentMonth}
                  isMonthReadOnly={isMonthReadOnly}
                  onOpenPaymentModal={handleOpenPaymentModal}
                  exportPDFAvizier={exportPDFAvizier}
                  handleNavigation={handleNavigation}
                />
              );
            })()}

            <div className="mt-8">
              <RecentActivity maintenanceData={maintenanceData} />
            </div>
          </>
        )}
      </div>
      
      {/* Modal pentru plăți */}
      <PaymentModal
        showPaymentModal={showPaymentModal}
        setShowPaymentModal={setShowPaymentModal}
        currentMonth={currentMonth}
        selectedApartment={selectedApartment}
        onSavePayment={handleSavePayment}
      />

      {/* Modal pentru istoric versiuni */}
      <VersionHistoryModal
        showVersionHistory={showVersionHistory}
        setShowVersionHistory={setShowVersionHistory}
        getAvailableVersions={getAvailableVersions}
        loadVersion={loadVersion}
        exportHistory={exportHistory}
        importHistory={importHistory}
        isLoadingVersion={isLoadingVersion}
        onSelectVersion={handleSelectVersion}
        currentMonth={currentMonth}
      />
    </div>
  );
};

export default DashboardView;