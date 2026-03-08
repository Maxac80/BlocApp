/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
// src/components/views/DashboardView.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  DashboardMaintenanceTable
} from '../dashboard';
import { PaymentModal, MaintenanceBreakdownModal } from '../modals';
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
  currentSheet,
  publishedSheet, // 🆕 Necesar pentru încasări

  // User profile
  userProfile,

  // Expense configuration
  getExpenseConfig,
  getApartmentParticipation,
  calculateMaintenanceWithDetails
}) => {
  // 🎯 DETERMINĂ SHEET-UL ACTIV bazat pe luna selectată
  const activeSheet = (publishedSheet?.monthYear === currentMonth)
    ? publishedSheet
    : currentSheet;

  // Hook-uri pentru gestionarea încasărilor
  // 🆕 Folosește activeSheet pentru a funcționa corect pe orice lună selectată (include archived sheets)
  const activePublishedSheet = (activeSheet?.status === 'PUBLISHED' || activeSheet?.status === 'published' || activeSheet?.status === 'archived') ? activeSheet : null;
  const { addIncasare, loading: incasariLoading } = useIncasari(association, currentMonth, activePublishedSheet);

  // Hook pentru sincronizarea plăților cu tabelul de întreținere
  // 🆕 Folosește activePublishedSheet pentru a citi plățile corecte din luna selectată (include archived sheets)
  const {
    getUpdatedMaintenanceData,
    getApartmentPayments,
    getPaymentStats,
    loading: paymentSyncLoading
  } = usePaymentSync(association, currentMonth, activePublishedSheet);

  // State pentru a urmări dacă datele inițiale au fost încărcate complet
  const [isDataReady, setIsDataReady] = useState(false);

  // Monitorizează când toate datele sunt gata
  useEffect(() => {
    if (!incasariLoading && !paymentSyncLoading) {
      const timer = setTimeout(() => {
        setIsDataReady(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsDataReady(false);
    }
  }, [incasariLoading, paymentSyncLoading]);

  // Reset isDataReady când se schimbă luna
  useEffect(() => {
    setIsDataReady(false);
  }, [currentMonth]);

  // State pentru modalul de plăți
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);

  // State pentru modalul de breakdown întreținere
  const [showMaintenanceBreakdown, setShowMaintenanceBreakdown] = useState(false);
  const [selectedMaintenanceData, setSelectedMaintenanceData] = useState(null);

  // Calculează datele actualizate pentru afișare în tabel
  // IMPORTANT: Calculăm întotdeauna datele, NU le schimbăm condiționat
  const updatedMaintenanceData = useMemo(() => {
    return getUpdatedMaintenanceData(maintenanceData);
  }, [maintenanceData, getUpdatedMaintenanceData]);

  // Handler pentru deschiderea modalului de plăți
  const handleOpenPaymentModal = (apartmentData) => {
    setSelectedApartment(apartmentData);
    setShowPaymentModal(true);
  };

  // Handler pentru deschiderea modalului de breakdown întreținere
  const handleOpenMaintenanceBreakdown = (apartmentData) => {
    // Pentru Dashboard, folosim datele din maintenanceData (publishedSheet.maintenanceTable)
    // care CONȚINE expenseDetails salvat la publicare
    const fullData = maintenanceData?.find(data => data.apartmentId === apartmentData.apartmentId) || apartmentData;

    // Merge datele: păstrează expenseDetails din published sheet, dar actualizează sumele modificate de plăți
    const mergedData = {
      ...fullData,
      // Actualizează sumele care pot fi modificate de plăți (din updatedMaintenanceData)
      restante: apartmentData.restante,
      currentMaintenance: apartmentData.currentMaintenance,
      penalitati: apartmentData.penalitati,
      totalDatorat: apartmentData.totalDatorat,
      totalMaintenance: apartmentData.totalMaintenance,
      isPaid: apartmentData.isPaid,
      isPartiallyPaid: apartmentData.isPartiallyPaid,
      paymentInfo: apartmentData.paymentInfo
    };

    console.log('📊 Opening maintenance breakdown in Dashboard:', {
      apartmentId: apartmentData.apartmentId,
      hasExpenseDetails: !!mergedData.expenseDetails,
      expenseDetailsCount: Object.keys(mergedData.expenseDetails || {}).length,
      expenseDetailsKeys: Object.keys(mergedData.expenseDetails || {}),
      expenseDifferenceDetailsKeys: Object.keys(mergedData.expenseDifferenceDetails || {})
    });

    setSelectedMaintenanceData(mergedData);
    setShowMaintenanceBreakdown(true);
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
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="w-full">
        {/* Page Title */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        </div>


        {/* Dacă utilizatorul a trecut prin onboarding dar nu are asociație */}
        {!association && userProfile?.metadata?.onboardingCompleted && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 sm:p-6 rounded-xl mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-yellow-800 mb-2">
              🔄 Se încarcă datele asociației...
            </h3>
            <p className="text-sm sm:text-base text-yellow-700 mb-3 sm:mb-4">
              Asociația ta a fost creată în timpul configurării inițiale. Dacă nu se încarcă în câteva secunde, încearcă să reîmprospătezi pagina.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-yellow-700 text-sm sm:text-base font-medium"
            >
              🔄 Reîmprospătează Pagina
            </button>
          </div>
        )}

        {/* Dacă există asociație fără apartamente */}
        {association && getAssociationApartments().length === 0 && (
          <div className="bg-green-50 border border-green-200 p-4 sm:p-6 rounded-xl mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-green-800 mb-2">
              ✅ Asociația "{association.name}" a fost creată!
            </h3>
            <p className="text-sm sm:text-base text-green-700 mb-3 sm:mb-4">
              Acum să adaugăm structura: blocurile, scările și apartamentele.
            </p>
            <button
              onClick={() => handleNavigation("setup")}
              className="bg-green-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-green-700 text-sm sm:text-base font-medium"
            >
              📋 Configurează Blocurile și Apartamentele
            </button>
          </div>
        )}

        {/* Dacă există asociație cu apartamente - dashboard normal */}
        {association && getAssociationApartments().length > 0 && (
          <>
            {/* Verifică dacă luna curentă este publicată sau arhivată */}
            {(() => {
              const isCurrentMonthPublished = isMonthReadOnly || activeSheet?.status === 'archived';

              if (!isCurrentMonthPublished) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex items-center mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                        <span className="text-xl sm:text-2xl">📊</span>
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-amber-800">Tabel Întreținere - {currentMonth}</h3>
                        <p className="text-sm sm:text-base text-amber-700">Va fi disponibil după publicarea acestei luni</p>
                      </div>
                    </div>
                    <div className="bg-amber-100 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                      <p className="text-sm sm:text-base text-amber-800 font-medium mb-2">📝 Pentru a vedea tabelul de întreținere pentru {currentMonth}:</p>
                      <ol className="text-amber-700 text-xs sm:text-sm space-y-1 ml-4">
                        <li>1. Mergi la secțiunea <strong>Întreținere</strong></li>
                        <li>2. Calculează întreținerea pentru {currentMonth}</li>
                        <li>3. Publică luna când este gata</li>
                        <li>4. Tabelul va apărea aici în Dashboard</li>
                      </ol>
                    </div>
                    <button
                      onClick={() => handleNavigation("maintenance")}
                      className="bg-amber-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-amber-700 transition-colors text-sm sm:text-base font-medium"
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
                  isMonthReadOnly={isMonthReadOnly || activeSheet?.status === 'archived'}
                  onOpenPaymentModal={handleOpenPaymentModal}
                  onOpenMaintenanceBreakdown={handleOpenMaintenanceBreakdown}
                  handleNavigation={handleNavigation}
                  association={association}
                  blocks={blocks}
                  stairs={stairs}
                  getAssociationApartments={getAssociationApartments}
                  expenses={expenses}
                  isHistoricMonth={monthType === 'historic' || activeSheet?.status === 'archived'}
                  getPaymentStats={getPaymentStats}
                  isLoadingPayments={!isDataReady}
                />
              );
            })()}
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

      {/* Modal pentru breakdown întreținere */}
      {showMaintenanceBreakdown && selectedMaintenanceData && (() => {
        // Extrage lista de cheltuieli din expenseDetails
        const expensesFromDetails = selectedMaintenanceData.expenseDetails
          ? Object.values(selectedMaintenanceData.expenseDetails)
              .map(detail => detail?.expense || detail)
              .filter(Boolean)
          : [];

        // Folosește expenses din details dacă există, altfel fallback la expenses din props
        const finalExpensesList = expensesFromDetails.length > 0 ? expensesFromDetails : (expenses || []);

        console.log('📋 Modal expenses:', {
          fromDetails: expensesFromDetails.length,
          fromProps: (expenses || []).length,
          using: finalExpensesList.length
        });

        return (
          <MaintenanceBreakdownModal
            isOpen={showMaintenanceBreakdown}
            onClose={() => setShowMaintenanceBreakdown(false)}
            apartmentData={selectedMaintenanceData}
            expensesList={finalExpensesList}
            apartmentParticipations={
              (getAssociationApartments?.() || []).reduce((acc, apt) => {
                acc[apt.id] = finalExpensesList.reduce((expAcc, expense) => {
                  // Folosește expenseTypeId pentru a căuta participarea corect
                  const expenseKey = expense.expenseTypeId || expense.id || expense.name;
                  expAcc[expense.name] = getApartmentParticipation?.(apt.id, expenseKey) || {};
                  return expAcc;
                }, {});
                return acc;
              }, {})
            }
            allApartments={getAssociationApartments?.() || []}
            allMaintenanceData={updatedMaintenanceData || []}
            getExpenseConfig={getExpenseConfig}
            stairs={stairs || []}
            payments={activeSheet?.payments || []} // 🆕 Trimite plățile din sheet-ul activ
            currentMonth={currentMonth}
          />
        );
      })()}

    </div>
  );
};

export default DashboardView;