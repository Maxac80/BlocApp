/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
// src/components/views/DashboardView.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  DashboardMaintenanceTable
} from '../dashboard';
import { PaymentModal, MaintenanceBreakdownModal } from '../modals';
import { useIncasari } from '../../hooks/useIncasari';
import { usePaymentSync } from '../../hooks/usePaymentSync';
import { Building, Calculator, Coins, Filter, ClipboardList } from 'lucide-react';
import StatsCard from '../common/StatsCard';

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

  // State pentru cautarea apartamentului in tabel
  const [apartmentSearchTerm, setApartmentSearchTerm] = useState('');
  // Filtru de status plata: 'all' | 'unpaid' | 'partial' | 'paid'
  const [paymentFilter, setPaymentFilter] = useState('all');

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
      // Tabelul se va actualiza automat prin usePaymentSync
      // Pagina Încasări va afișa plata cu nr chitanță
      setShowPaymentModal(false);
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
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-start gap-2 min-w-0">
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-1" />
            <span>
              Întreținere{currentMonth ? ` ${currentMonth}` : ''}
              {activeSheet?.consumptionMonth && (
                <span className="block sm:inline text-xs sm:text-base font-normal text-gray-500 sm:ml-2">
                  <span className="hidden sm:inline">· </span>consum {activeSheet.consumptionMonth}
                </span>
              )}
            </span>
          </h1>
          {activeSheet?.status === 'PUBLISHED' || activeSheet?.status === 'published' || activeSheet?.status === 'archived' ? (
            <button
              onClick={() => handleNavigation('incasari')}
              className="flex-shrink-0 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-green-700 hover:shadow-md flex items-center justify-center gap-2 whitespace-nowrap transition-all"
              title="Vezi Încasări"
            >
              <Coins className="w-4 h-4" />
              <span className="hidden sm:inline">Vezi Încasări</span>
            </button>
          ) : null}
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
              
              // Statistici: folosesc valorile INIȚIALE (din maintenanceData raw)
              // ca să fie consistent cu pagina Încasări și să nu dubleze scăderea plăților.
              const originalData = maintenanceData || [];
              const totalCurrent = originalData.reduce((s, d) => s + (Number(d.currentMaintenance) || 0), 0);
              const totalRestante = originalData.reduce((s, d) => s + (Number(d.restante) || 0), 0);
              const totalPenalitati = originalData.reduce((s, d) => s + (Number(d.penalitati) || 0), 0);
              const totalDatorat = totalCurrent + totalRestante + totalPenalitati;

              const payments = activeSheet?.payments || [];
              const totalIncasatIntretinere = payments.reduce((s, p) => s + (Number(p.intretinere) || 0), 0);
              const totalIncasatRestante = payments.reduce((s, p) => s + (Number(p.restante) || 0), 0);
              const totalIncasatPenalitati = payments.reduce((s, p) => s + (Number(p.penalitati) || 0), 0);
              const totalIncasat = totalIncasatIntretinere + totalIncasatRestante + totalIncasatPenalitati;

              const ramas = Math.max(0, totalDatorat - totalIncasat);

              // Search/filtre/counts pe datele actualizate (cu paymentInfo)
              const data = updatedMaintenanceData || [];
              const totalApts = data.length;
              // Apt cu rest de încasat = mai au datorii după plăți
              const aptsCuRestante = data.filter(d => (Number(d.totalDatorat) || 0) > 0.01).length;
              const procentRestante = totalApts > 0 ? Math.round((aptsCuRestante / totalApts) * 100) : 0;

              const fmt = (n) => `${Number(n).toFixed(2)} lei`;

              // Filtru search pe apartament / proprietar (normalizare diacritice)
              const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
              const term = (apartmentSearchTerm || '').trim();
              let filteredData = term
                ? data.filter(d =>
                    normalize(d.apartment).includes(normalize(term)) ||
                    normalize(d.owner).includes(normalize(term))
                  )
                : data;

              // Counts pt chip-uri filtru (pe datele filtrate cu search)
              const countAll = filteredData.length;
              const countPaid = filteredData.filter(d => d.isPaid).length;
              const countPartial = filteredData.filter(d => !d.isPaid && d.isPartiallyPaid).length;
              const countUnpaid = filteredData.filter(d => !d.isPaid && !d.isPartiallyPaid).length;

              // Aplicare filtru status
              if (paymentFilter === 'paid') filteredData = filteredData.filter(d => d.isPaid);
              else if (paymentFilter === 'partial') filteredData = filteredData.filter(d => !d.isPaid && d.isPartiallyPaid);
              else if (paymentFilter === 'unpaid') filteredData = filteredData.filter(d => !d.isPaid && !d.isPartiallyPaid);

              return (
                <>
                  {/* Breakdown pentru Total Datorat si Total Incasat (doar categorii cu suma > 0) */}
                  {(() => {
                    const breakdownDatorat = [
                      totalCurrent > 0 && { label: 'Întreținere', value: fmt(totalCurrent) },
                      totalRestante > 0 && { label: 'Restanțe', value: fmt(totalRestante) },
                      totalPenalitati > 0 && { label: 'Penalități', value: fmt(totalPenalitati) }
                    ].filter(Boolean);

                    const breakdownIncasat = [
                      totalIncasatIntretinere > 0 && { label: 'Întreținere', value: fmt(totalIncasatIntretinere) },
                      totalIncasatRestante > 0 && { label: 'Restanțe', value: fmt(totalIncasatRestante) },
                      totalIncasatPenalitati > 0 && { label: 'Penalități', value: fmt(totalIncasatPenalitati) }
                    ].filter(Boolean);

                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <StatsCard
                          label="Total Datorat"
                          value={fmt(totalDatorat)}
                          breakdown={breakdownDatorat}
                          borderColor="border-blue-500"
                        />
                        <StatsCard
                          label="Total Încasat"
                          value={fmt(totalIncasat)}
                          breakdown={breakdownIncasat}
                          borderColor="border-green-500"
                        />
                        <StatsCard
                          label="Rămas de Încasat"
                          value={fmt(ramas)}
                          borderColor={ramas > 0 ? "border-orange-500" : "border-green-500"}
                        />
                        <StatsCard
                          label="Apartamente cu Restanțe"
                          value={`${aptsCuRestante} / ${totalApts}`}
                          sublabel={`${procentRestante}% din total`}
                          borderColor={aptsCuRestante > 0 ? "border-red-500" : "border-green-500"}
                        />
                      </div>
                    );
                  })()}

                  {/* Search + Filtru status + Vezi Incasari */}
                  <div className="mb-4 flex flex-row gap-2 sm:gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={apartmentSearchTerm}
                        onChange={(e) => setApartmentSearchTerm(e.target.value)}
                        placeholder="Caută apartament sau proprietar..."
                        className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      />
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                      </svg>
                      {apartmentSearchTerm && (
                        <button
                          onClick={() => setApartmentSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {/* Mobile: filter compact (icoana + badge) */}
                    <div className="relative sm:hidden flex-shrink-0">
                      <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="appearance-none w-10 h-full px-2 border border-gray-300 rounded-lg bg-white text-transparent focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                        aria-label="Filtru status încasare"
                      >
                        <option value="all" className="text-gray-700">Toate ({countAll})</option>
                        <option value="unpaid" className="text-gray-700">Neîncasate ({countUnpaid})</option>
                        <option value="partial" className="text-gray-700">Parțial încasate ({countPartial})</option>
                        <option value="paid" className="text-gray-700">Încasate integral ({countPaid})</option>
                      </select>
                      <Filter className="w-4 h-4 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                      {paymentFilter !== 'all' && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white pointer-events-none" />
                      )}
                    </div>
                    {/* Desktop: filter cu text */}
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="hidden sm:block px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-shrink-0"
                    >
                      <option value="all">Toate ({countAll})</option>
                      <option value="unpaid">Neîncasate ({countUnpaid})</option>
                      <option value="partial">Parțial încasate ({countPartial})</option>
                      <option value="paid">Încasate integral ({countPaid})</option>
                    </select>
                  </div>

                  <DashboardMaintenanceTable
                    maintenanceData={filteredData}
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
                    payments={activeSheet?.payments || []}
                    consumptionMonth={activeSheet?.consumptionMonth}
                  />
                </>
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
            association={association}
            blocks={blocks}
            stats={{
              blocs: (blocks || []).filter(b => b.associationId === association?.id).length,
              apartments: (getAssociationApartments?.() || []).length,
              persons: (getAssociationApartments?.() || []).reduce((sum, apt) => sum + (apt.persons || 0), 0)
            }}
          />
        );
      })()}

    </div>
  );
};

export default DashboardView;