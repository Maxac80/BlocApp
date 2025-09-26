// src/components/views/DashboardView.js
import React, { useState } from 'react';
import {
  StatisticsCards,
  RecentActivity,
  DashboardHeader,
  DashboardMaintenanceTable
} from '../dashboard';
import { PaymentModal } from '../modals';
import { useIncasari } from '../../hooks/useIncasari';
import { usePaymentSync } from '../../hooks/usePaymentSync';

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
  getMonthType,
  
  
  // Navigation
  handleNavigation,
  
  // Data
  expenses,
  maintenanceData,
  
  // User profile
  userProfile
}) => {
  const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  
  // Hook-uri pentru gestionarea încasărilor
  const { addIncasare } = useIncasari(association, currentMonth);
  
  // Hook pentru sincronizarea plăților cu tabelul de întreținere
  const { 
    getUpdatedMaintenanceData, 
    getApartmentPayments,
    getPaymentStats 
  } = usePaymentSync(association, currentMonth);
  
  // State pentru modalul de plăți
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);


  // Calculează datele actualizate pentru afișare în tabel
  const updatedMaintenanceData = getUpdatedMaintenanceData(maintenanceData);

  // Handler pentru deschiderea modalului de plăți
  const handleOpenPaymentModal = (apartmentData) => {
    setSelectedApartment(apartmentData);
    setShowPaymentModal(true);
  };

  // Handler pentru salvarea plății cu integrare Firestore
  const handleSavePayment = async (paymentData) => {
    // console.log('💰 Salvare plată:', paymentData);
    
    if (!selectedApartment) {
      alert('Eroare: Nu s-a selectat apartamentul');
      return;
    }
    
    // Salvează încasarea în Firestore
    const incasareData = {
      ...paymentData,
      apartmentNumber: selectedApartment.apartmentNumber,
      owner: selectedApartment.owner,
      associationName: association?.name || ''
    };
    
    const result = await addIncasare(incasareData);
    
    if (result.success) {
      // console.log(`✅ Încasare salvată cu succes. Chitanță nr: ${result.receiptNumber}`);
      // Tabelul se va actualiza automat prin usePaymentSync
      setShowPaymentModal(false);
      alert(`✅ Plată înregistrată cu succes!\nChitanță nr: ${result.receiptNumber}`);
    } else {
      console.error('❌ Eroare la salvarea încasării:', result.error);
      alert(`Eroare la salvarea încasării: ${result.error}`);
    }
  };

  // Funcție simplificată pentru export PDF (pentru Dashboard)
  const exportPDFAvizier = () => {
    alert('🔄 Funcția de export PDF va fi implementată în versiunea completă. Te redirectăm către ecranul de Întreținere...');
    handleNavigation("maintenance");
  };

  // Handler pentru selectarea unei versiuni
  const handleSelectVersion = (month, versionData) => {
    // console.log(`📊 Versiunea selectată: ${month}`, versionData);
    alert(`📊 Versiunea pentru ${month} a fost încărcată!\n\nStatistici:\n• ${versionData.statistics.totalApartments} apartamente\n• ${versionData.statistics.apartmentePlatite} plătite\n• ${versionData.statistics.apartamenteRestante} restante\n• ${versionData.statistics.totalIncasat.toFixed(2)} lei încasați`);
    // TODO: Implementează afișarea datelor versiunii în interfață
  };
  
  const monthType = getMonthType ? getMonthType(currentMonth) : null;

  return (
    <div className={`min-h-screen pt-2 px-6 pb-6 ${
      monthType === 'current'
        ? "bg-gradient-to-br from-indigo-50 to-blue-100"
        : monthType === 'next'
        ? "bg-gradient-to-br from-green-50 to-emerald-100"
        : monthType === 'historic'
        ? "bg-gradient-to-br from-gray-50 to-gray-100"
        : "bg-gradient-to-br from-indigo-50 to-blue-100"
    }`}>
      <div className="w-full">
        <DashboardHeader
          association={association}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          getAvailableMonths={getAvailableMonths}
          isMonthReadOnly={isMonthReadOnly}
          getAssociationApartments={getAssociationApartments}
          handleNavigation={handleNavigation}
          getMonthType={getMonthType}
        />

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        </div>


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
              maintenanceData={updatedMaintenanceData}
            />

            {/* Verifică dacă luna curentă este publicată */}
            {(() => {
              const isCurrentMonthPublished = isMonthReadOnly;
              
              if (!isCurrentMonthPublished) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-2xl">📊</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-amber-800">Tabel Întreținere - {currentMonth}</h3>
                        <p className="text-amber-700">Va fi disponibil după publicarea acestei luni</p>
                      </div>
                    </div>
                    <div className="bg-amber-100 rounded-lg p-4 mb-4">
                      <p className="text-amber-800 font-medium mb-2">📝 Pentru a vedea tabelul de întreținere pentru {currentMonth}:</p>
                      <ol className="text-amber-700 text-sm space-y-1 ml-4">
                        <li>1. Mergi la secțiunea <strong>Întreținere</strong></li>
                        <li>2. Calculează întreținerea pentru {currentMonth}</li>
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
                  maintenanceData={updatedMaintenanceData}
                  currentMonth={currentMonth}
                  isMonthReadOnly={isMonthReadOnly}
                  onOpenPaymentModal={handleOpenPaymentModal}
                  exportPDFAvizier={exportPDFAvizier}
                  handleNavigation={handleNavigation}
                  association={association}
                  blocks={blocks}
                  stairs={stairs}
                  getAssociationApartments={getAssociationApartments}
                  expenses={expenses}
                  isHistoricMonth={monthType === 'historic'}
                />
              );
            })()}

            {/* Activitate Recentă - doar pentru luna publicată */}
            <div className="mt-8">
              {(() => {
                const isCurrentMonthPublished = isMonthReadOnly;
                
                if (!isCurrentMonthPublished) {
                  return (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">📝 Activitate Recentă - {currentMonth}</h3>
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">📝</span>
                        </div>
                        <p className="text-gray-600 mb-2">Nu există încă activitate pentru această lună</p>
                        <p className="text-sm text-gray-500">
                          Activitatea va fi disponibilă după publicarea lunii {currentMonth}
                        </p>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <RecentActivity 
                    maintenanceData={updatedMaintenanceData} 
                    association={association}
                    currentMonth={currentMonth}
                    getAssociationApartments={getAssociationApartments}
                  />
                );
              })()}
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

    </div>
  );
};

export default DashboardView;