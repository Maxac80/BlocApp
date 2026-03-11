/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
// src/components/views/DashboardView.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  DashboardMaintenanceTable
} from '../dashboard';
import { PaymentModal, MaintenanceBreakdownModal } from '../modals';
import { useIncasari } from '../../hooks/useIncasari';
import { usePaymentSync } from '../../hooks/usePaymentSync';
import { Building, Calculator, Coins } from 'lucide-react';

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
  publishedSheet,
  sheets = [],

  // User profile
  userProfile,

  // Expense configuration
  getExpenseConfig,
  getApartmentParticipation,
  calculateMaintenanceWithDetails,

  // Role-based access
  isReadOnlyRole
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

        {/* Dacă există asociație fără apartamente - ghid pas cu pas */}
        {association && getAssociationApartments().length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
            <div className="text-center mb-6">
              <Building className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-1">
                Configurează asociația pentru a genera tabelul de întreținere
              </h3>
              <p className="text-sm text-blue-500">Urmează pașii de mai jos pentru a începe</p>
            </div>
            <div className="space-y-3 mb-6 max-w-md mx-auto">
              {/* Pas 1 - curent */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Configurează blocurile, scările și apartamentele</p>
                  <p className="text-xs text-blue-500">Adaugă structura asociației tale</p>
                </div>
              </div>
              {/* Pas 2 - viitor */}
              <div className="flex items-start gap-3 opacity-50">
                <div className="w-7 h-7 rounded-full bg-gray-300 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Calculează întreținerea lunară</p>
                  <p className="text-xs text-gray-400">Configurează cheltuielile și distribuie pe apartamente</p>
                </div>
              </div>
              {/* Pas 3 - viitor */}
              <div className="flex items-start gap-3 opacity-50">
                <div className="w-7 h-7 rounded-full bg-gray-300 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Publică luna și vizualizează tabelul</p>
                  <p className="text-xs text-gray-400">Tabelul de întreținere va apărea aici</p>
                </div>
              </div>
            </div>
            {!isReadOnlyRole && (
              <div className="text-center">
                <button
                  onClick={() => handleNavigation("setup")}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Configurează Apartamentele
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dacă există asociație cu apartamente - dashboard normal */}
        {association && getAssociationApartments().length > 0 && (
          <>
            {/* Verifică dacă luna curentă este publicată sau arhivată */}
            {(() => {
              const isCurrentMonthPublished = isMonthReadOnly || activeSheet?.status === 'archived';

              if (!isCurrentMonthPublished) {
                // Verifică dacă există luni publicate anterior
                const hasPublishedHistory = sheets?.some(s =>
                  s.status === 'published' || s.status === 'archived'
                );

                // Găsește ultima lună publicată
                const lastPublishedSheet = sheets
                  ?.filter(s => s.status === 'published' || s.status === 'archived')
                  ?.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                  ?.[0];

                if (hasPublishedHistory) {
                  // Utilizator cu experiență - mesaj adaptat cu 2 acțiuni
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
                      <div className="text-center mb-6">
                        <Building className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                        <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-1">
                          Tabel Întreținere — {currentMonth}
                        </h3>
                        <p className="text-sm text-blue-500">
                          Luna {currentMonth} nu este încă publicată. Calculează întreținerea sau gestionează încasările pe luna publicată.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {!isReadOnlyRole && (
                          <button
                            onClick={() => handleNavigation("maintenance")}
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
                          >
                            <Calculator className="w-4 h-4" />
                            Calcul întreținere {currentMonth}
                          </button>
                        )}
                        {lastPublishedSheet && (
                          <button
                            onClick={() => {
                              setCurrentMonth(lastPublishedSheet.monthYear);
                            }}
                            className="flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 font-medium text-sm"
                          >
                            <Coins className="w-4 h-4" />
                            Încasări {lastPublishedSheet.monthYear}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // Prima utilizare - pași de onboarding
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
                    <div className="text-center mb-6">
                      <Building className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                      <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-1">
                        Tabel Întreținere — {currentMonth}
                      </h3>
                      <p className="text-sm text-blue-500">Calculează și publică întreținerea pentru a vizualiza tabelul</p>
                    </div>
                    <div className="space-y-3 mb-6 max-w-md mx-auto">
                      {/* Pas 1 - completat */}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-400 line-through">Configurează blocurile, scările și apartamentele</p>
                          <p className="text-xs text-green-500">Completat</p>
                        </div>
                      </div>
                      {/* Pas 2 - curent */}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                        <div>
                          <p className="text-sm font-semibold text-blue-800">Calculează și publică întreținerea lunară</p>
                          <p className="text-xs text-blue-500">Distribuie cheltuielile și publică luna {currentMonth}</p>
                        </div>
                      </div>
                      {/* Pas 3 - viitor */}
                      <div className="flex items-start gap-3 opacity-50">
                        <div className="w-7 h-7 rounded-full bg-gray-300 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Vizualizează tabelul de întreținere</p>
                          <p className="text-xs text-gray-400">Tabelul va apărea aici după publicare</p>
                        </div>
                      </div>
                    </div>
                    {!isReadOnlyRole && (
                      <div className="text-center">
                        <button
                          onClick={() => handleNavigation("maintenance")}
                          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
                        >
                          Mergi la Calcul Întreținere
                        </button>
                      </div>
                    )}
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