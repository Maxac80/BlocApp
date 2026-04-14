/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import ErrorBoundary from "./components/common/ErrorBoundary";
import MobileHeader from "./components/common/MobileHeader";
import BottomNavigation from "./components/common/BottomNavigation";

// Hooks
import { useAssociationData } from "./hooks/useFirestore";
import { useMaintenanceCalculation } from './hooks/useMaintenanceCalculation';
import { useBalanceManagement } from './hooks/useBalanceManagement';
import { useExpenseManagement } from './hooks/useExpenseManagement';
import { useNavigationAndUI } from './hooks/useNavigationAndUI';
import { useMonthManagement } from './hooks/useMonthManagement';
import { useDataOperations } from './hooks/useDataOperations';
import { useAuthEnhanced } from "./context/AuthContextEnhanced";
import useExpenseConfigurations from './hooks/useExpenseConfigurations';
import useInvoices from './hooks/useInvoices';
import { useSubscription } from './hooks/useSubscription';

// Components
import SubscriptionBanner from './components/subscription/SubscriptionBanner';
import SubscriptionSettings from './components/subscription/SubscriptionSettings';
import Sidebar from './components/common/Sidebar';
import DashboardHeader from './components/dashboard/DashboardHeader';
import {
  SetupView,
  AssociationView,
  ExpensesView,
  DashboardView,
  MaintenanceView,
  ProfileView,
  TutorialsView,
  AccountingView,
  MessagesView
} from './components/views';
import SuppliersView from './components/views/SuppliersView';

export default function BlocApp({ associationId, userRole, onSwitchContext, onStandaloneNavigate }) {
  const { userProfile, currentUser, clearContext } = useAuthEnhanced();
  const activeUser = currentUser;

  // 🔒 Read-only role detection (president, censor)
  const isReadOnlyRole = userRole === 'assoc_president' || userRole === 'assoc_censor';

  // 💳 SUBSCRIPTION STATUS (some values reserved for future use)
  // eslint-disable-next-line no-unused-vars
  const {
    status: subscriptionStatus,
    trialDaysRemaining,
    shouldShowTrialBanner,
    shouldShowExpiredBanner,
    shouldShowSuspendedBanner,
    canEdit: subscriptionCanEdit,
    canPublish: subscriptionCanPublish,
    isReadOnly: subscriptionIsReadOnly
  } = useSubscription(currentUser?.uid);

  // Folosește onSwitchContext din props sau clearContext din context
  const handleSwitchContext = onSwitchContext || clearContext;

  // 🔗 REF pentru sheet operations (pentru a evita dependența circulară)
  const sheetOperationsRef = useRef(null);

  // 🆕 STATE pentru a preveni crearea multiplă a sheet-ului inițial
  const [initialSheetCreationAttempted, setInitialSheetCreationAttempted] = useState(false);

  // 📨 STATE pentru navigare la mesaje cu apartament pre-selectat
  const [messagesTargetApartmentId, setMessagesTargetApartmentId] = useState(null);

  // 🔥 HOOK PRINCIPAL PENTRU DATE FIRESTORE (primul pentru a obține association)
  // Dacă avem associationId din props (din context selector), îl transmitem pentru a încărca asociația corectă
  const {
    loading,
    error,
    association,
    setAssociation,
    blocks: firestoreBlocks,
    stairs: firestoreStairs,
    apartments: firestoreApartments,
    expenses,
    customExpenses,
    createAssociation,
    updateAssociation,
    addBlock,
    addStair,
    addApartment,
    updateApartment,
    deleteApartment,
    addCustomExpense,
    deleteCustomExpense,
    updateMonthlyExpense,
    deleteMonthlyExpense,
    updateBlock,
    deleteBlock,
    updateStair,
    deleteStair
  } = useAssociationData(sheetOperationsRef, associationId);

  // 🔥 HOOK PENTRU NAVIGARE ȘI UI
  const {
    currentView,
    handleNavigation,
    sidebarOpen,
    setSidebarOpen,
    sidebarExpanded,
    setSidebarExpanded,
    activeMaintenanceTab,
    setActiveMaintenanceTab,
    pendingMaintenanceApartmentId,
    setPendingMaintenanceApartmentId,
    showInitialBalances,
    setShowInitialBalances,
    showAdjustBalances,
    setShowAdjustBalances,
    showExpenseConfig,
    setShowExpenseConfig,
    adjustModalData,
    setAdjustModalData,
    selectedExpenseForConfig,
    setSelectedExpenseForConfig,
    newAssociation,
    setNewAssociation,
    newBlock,
    setNewBlock,
    newStair,
    setNewStair,
    newApartment,
    setNewApartment,
    expandedBlocks,
    setExpandedBlocks,
    expandedStairs,
    setExpandedStairs,
    editingItem,
    setEditingItem,
    editingData,
    setEditingData,
    showAddForm,
    setShowAddForm,
    searchTerm,
    setSearchTerm,
    editingApartment,
    setEditingApartment,
    editingApartmentData,
    setEditingApartmentData,
    autoExpandEntities,
    resetNewAssociation,
    resetNewBlock,
    resetNewStair,
    resetNewApartment,
    startEditingApartment,
    cancelApartmentEdit
  } = useNavigationAndUI();

  // Wrapper care interceptează paginile standalone (profil, abonament, tutoriale)
  const handleNavigationWithStandalone = (view) => {
    if (['profile', 'subscription', 'tutorials'].includes(view) && onStandaloneNavigate) {
      onStandaloneNavigate(view);
    } else {
      handleNavigation(view);
    }
  };

  // 🔥 HOOK PENTRU GESTIONAREA LUNILOR (după ce avem association)
  const {
    currentMonth,
    setCurrentMonth,
    initializeMonths,
    getMonthStatus,
    setMonthStatus,
    publishMonth,
    unpublishSheet, // 🆕 Funcție pentru depublicare
    getMonthType,
    getAvailableMonths,
    shouldShowAdjustButton,
    shouldShowPublishButton,
    isMonthReadOnly,
    getCurrentActiveMonth,
    getNextActiveMonth,
    // Adaug variabilele pentru sheet-uri
    currentSheet,
    publishedSheet,
    sheets,
    getSheetBalances,
    getCurrentSheetBalance,
    updateSheetCustomName,
    updateSheetMonthSettings,
    updateCurrentSheetMaintenanceTable,
    createInitialSheet,
    fixTransferredBalances,
    addExpenseToSheet,
    removeExpenseFromSheet,
    updateExpenseInSheet,
    updateStructureSnapshot,
    updateConfigSnapshot,
    // 🆕 SHEET-BASED STRUCTURE OPERATIONS
    addBlockToSheet,
    addStairToSheet,
    addApartmentToSheet,
    deleteBlockFromSheet,
    deleteStairFromSheet,
    deleteApartmentFromSheet,
    updateBlockInSheet,
    updateStairInSheet,
    updateApartmentInSheet
  } = useMonthManagement(association?.id);

  // 🔄 SHEET-BASED DATA: Prioritizează datele din sheet în loc de colecții (DUPĂ useMonthManagement)
  const sheetBlocks = currentSheet?.associationSnapshot?.blocks || [];
  const sheetStairs = currentSheet?.associationSnapshot?.stairs || [];
  const sheetApartments = currentSheet?.associationSnapshot?.apartments || [];

  // 🎯 USE SHEET DATA: Folosește datele din sheet dacă sunt disponibile, altfel fallback la colecții Firestore
  // Simplificat: folosim direct blocks/stairs/apartments peste tot (nu mai există finalBlocks/finalStairs/finalApartments)
  const blocks = sheetBlocks.length > 0 ? sheetBlocks : (firestoreBlocks || []);
  const stairs = sheetStairs.length > 0 ? sheetStairs : (firestoreStairs || []);
  const apartments = sheetApartments.length > 0 ? sheetApartments : (firestoreApartments || []);



  // 🔄 ACTUALIZEAZĂ sheet operations în useAssociationData
  useEffect(() => {
    if (addBlockToSheet && addStairToSheet && addApartmentToSheet && updateStructureSnapshot) {
      // Actualizează ref-ul cu toate sheet operations
      sheetOperationsRef.current = {
        // CREATE operations
        addBlockToSheet,
        addStairToSheet,
        addApartmentToSheet,
        // DELETE operations
        deleteBlockFromSheet,
        deleteStairFromSheet,
        deleteApartmentFromSheet,
        // UPDATE operations
        updateBlockInSheet,
        updateStairInSheet,
        updateApartmentInSheet,
        // CONFIG operations
        updateConfigSnapshot,
        currentSheet,
        // STRUCTURE operations
        updateStructureSnapshot
      };

    }
  }, [addBlockToSheet, addStairToSheet, addApartmentToSheet, deleteBlockFromSheet, deleteStairFromSheet, deleteApartmentFromSheet, updateBlockInSheet, updateStairInSheet, updateApartmentInSheet, updateStructureSnapshot, updateConfigSnapshot, currentSheet]);

  // Pentru debug - expune funcțiile în window (silent)
  useEffect(() => {
    if (fixTransferredBalances) {
      window.fixTransferredBalances = fixTransferredBalances;
    }
    if (createInitialSheet && association) {
      window.createInitialSheet = () => createInitialSheet(association);
    }

  }, [fixTransferredBalances, createInitialSheet, association, currentSheet, publishedSheet, sheets]);

  // 🆕 AUTO-CREARE SHEET INIȚIAL pentru asociații noi
  // Când asociația este încărcată dar nu există niciun sheet, creăm automat primul sheet
  useEffect(() => {
    const autoCreateInitialSheet = async () => {
      // Verificări: asociația există, nu avem sheets, nu am încercat deja, funcția există
      if (
        association?.id &&
        sheets !== undefined &&
        sheets.length === 0 &&
        !currentSheet &&
        !publishedSheet &&
        !initialSheetCreationAttempted &&
        createInitialSheet &&
        !loading
      ) {
        console.log('🆕 Auto-creating initial sheet for new association:', association.name);
        setInitialSheetCreationAttempted(true);

        try {
          // Transmitem și association.id explicit (la fel ca în onboarding)
          await createInitialSheet(association, association.id);
          console.log('✅ Initial sheet created successfully');
        } catch (error) {
          console.error('❌ Failed to auto-create initial sheet:', error);
        }
      }
    };

    autoCreateInitialSheet();
  }, [association, sheets, currentSheet, publishedSheet, initialSheetCreationAttempted, createInitialSheet, loading]);

  // 🔥 HOOK PENTRU GESTIONAREA SOLDURILOR
  const {
    hasInitialBalances,
    setHasInitialBalances,
    disabledExpenses,
    setDisabledExpenses,
    initialBalances,
    setInitialBalances,
    loadInitialBalances,
    saveInitialBalances,
    saveBalanceAdjustments,
    loadBalanceAdjustments,
    calculateNextMonthBalances,
    toggleExpenseStatus,
    saveDisabledExpenses
  } = useBalanceManagement(association, {
    updateConfigSnapshot: updateConfigSnapshot,
    currentSheet: currentSheet
  });

  // 🎯 SHEET SELECTION: Determină sheet-ul pentru luna selectată
  // Logica:
  // 1. Caută în toate sheet-urile un sheet PUBLISHED sau ARCHIVED pentru luna selectată
  // 2. Dacă nu există, verifică dacă publishedSheet corespunde lunii selectate
  // 3. Altfel, folosește currentSheet (date calculate live pentru luna in-progress)
  const activeSheet = (() => {
    // Caută un sheet publicat SAU arhivat pentru luna selectată (important pentru luni istorice)
    const lockedSheetForMonth = sheets?.find(
      sheet => sheet.monthYear === currentMonth &&
               (sheet.status === 'published' || sheet.status === 'archived')
    );

    if (lockedSheetForMonth) {
      return lockedSheetForMonth;
    }

    // Fallback la logica veche pentru compatibilitate
    if (publishedSheet && currentMonth === publishedSheet.monthYear) {
      return publishedSheet;
    }

    return currentSheet;
  })();

  const activeExpenses = activeSheet?.expenses || [];

  // 📝 HOOK PENTRU CONFIGURAȚII CHELTUIELI (trebuie înainte de useMaintenanceCalculation și useExpenseManagement)
  const {
    configurations: expenseConfigurations,
    loading: configLoading,
    getExpenseConfig: getFirestoreExpenseConfig,
    updateExpenseConfig: updateFirestoreExpenseConfig,
    deleteExpenseConfig: deleteFirestoreExpenseConfig,
    saveApartmentParticipations,
    fixFirestoreConfigurations
  } = useExpenseConfigurations(activeSheet); // 🎯 DYNAMIC: folosește activeSheet pentru a citi configurațiile lunii selectate

  // 🔥 HOOK PENTRU CALCULUL ÎNTREȚINERII
  const {
    getAssociationApartments,
    getApartmentBalance,
    setApartmentBalance,
    maintenanceData: calculatedMaintenanceData,
    calculateMaintenanceWithDetails,
    calculateTotalExpenses,
    calculateTotalMaintenance,
    calculateExpenseDifferences,
    maintenanceStats,
    monthlyBalances
  } = useMaintenanceCalculation({
    association: association || null,
    blocks: blocks || [],
    stairs: stairs || [],
    apartments: apartments || [],
    expenses: activeExpenses, // 🎯 DYNAMIC: folosește expenses din sheet-ul activ
    currentMonth: currentMonth || null,
    calculateNextMonthBalances, // Pasăm funcția din useBalanceManagement
    // Pasăm soldurile din sheet-uri pentru corelația corectă
    activeSheet, // 🆕 CRITICAL: Pasăm activeSheet calculat de BlocApp pentru logică corectă
    currentSheet,
    publishedSheet,
    getSheetBalances: getSheetBalances || (() => null),
    getCurrentSheetBalance: getCurrentSheetBalance || (() => ({ restante: 0, penalitati: 0 })),
    // Adăugăm funcția pentru salvarea automată a tabelului calculat
    updateCurrentSheetMaintenanceTable,
    // Pasăm funcția pentru a obține configurația cheltuielii (inclusiv participarea)
    getExpenseConfig: getFirestoreExpenseConfig
  });

  // 🎯 MAINTENANCE DATA SELECTION: Pentru locked sheets (published/archived), folosim maintenanceTable salvat
  // Pentru in-progress sheet, folosim calculul live
  const isLockedSheet = activeSheet?.status === 'published' || activeSheet?.status === 'archived';
  const maintenanceData = (isLockedSheet && activeSheet?.maintenanceTable)
    ? activeSheet.maintenanceTable
    : calculatedMaintenanceData;

  // 🔥 HOOK PENTRU GESTIONAREA CHELTUIELILOR
  const {
    expenseParticipation,
    setExpenseParticipation,
    newExpense,
    setNewExpense,
    newCustomExpense,
    setNewCustomExpense,
    getApartmentParticipation,
    setApartmentParticipation,
    getAssociationExpenseTypes,
    getDisabledExpenseTypes,
    getAvailableExpenseTypes,
    areAllExpensesFullyCompleted,
    handleAddExpense,
    handleUpdateExpense,
    handleAddCustomExpense,
    handleDeleteCustomExpense,
    handleDeleteMonthlyExpense,
    updateExpenseConsumption: _updateExpenseConsumptionRaw,
    updateExpenseConsumptionBatch: _updateExpenseConsumptionBatchRaw,
    updateExpenseIndividualAmount: _updateExpenseIndividualAmountRaw,
    updateExpenseIndividualAmountsBatch: _updateExpenseIndividualAmountsBatchRaw,
    updatePendingConsumption,
    updatePendingIndividualAmount,
    updateExpenseIndexes,
    updatePendingIndexes,
    togglePortalSubmission,
    expenseStats
  } = useExpenseManagement({
    association,
    expenses: activeExpenses, // 🎯 DYNAMIC: folosește expenses din sheet-ul activ
    customExpenses,
    currentMonth,
    currentSheet: activeSheet, // 🎯 DYNAMIC: folosește activeSheet bazat pe luna selectată
    disabledExpenses,
    addMonthlyExpense: addExpenseToSheet, // SHEET-BASED: folosește addExpenseToSheet
    updateMonthlyExpense,
    updateExpenseInSheet, // SHEET-BASED: adăugat pentru actualizare cheltuieli în sheet
    deleteMonthlyExpense: removeExpenseFromSheet, // SHEET-BASED: folosește removeExpenseFromSheet
    addCustomExpense,
    deleteCustomExpense,
    getExpenseConfig: getFirestoreExpenseConfig,  // FIREBASE: funcția pentru configurări din useExpenseConfigurations
    expenseConfigurations  // 🆕 Obiectul configurations pentru feedback instant după salvare
  });

  // 🔧 Auto-fix configurations DISABLED - users can configure manually

  // 🧾 HOOK PENTRU FACTURI
  const {
    invoices,
    loading: invoicesLoading,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoiceAsPaid,
    markInvoiceAsUnpaid,
    getInvoicesByMonth,
    getUnpaidInvoices,
    getOverdueInvoices,
    getInvoiceStats,
    updateMissingSuppliersForExistingInvoices,
    removeInvoiceDistribution,
    syncInvoicesAfterExpenseChange
  } = useInvoices(association?.id, currentSheet);

  // 🔄 WRAPPERE: după update sume individuale/consum, sincronizează automat
  // distributionHistory[].amount al facturilor cu o singură intrare pe acea cheltuială
  const updateExpenseConsumption = React.useCallback(async (...args) => {
    await _updateExpenseConsumptionRaw(...args);
    if (syncInvoicesAfterExpenseChange && activeSheet) {
      await syncInvoicesAfterExpenseChange(activeSheet, args[0]);
    }
  }, [_updateExpenseConsumptionRaw, syncInvoicesAfterExpenseChange, activeSheet]);

  const updateExpenseIndividualAmount = React.useCallback(async (...args) => {
    await _updateExpenseIndividualAmountRaw(...args);
    if (syncInvoicesAfterExpenseChange && activeSheet) {
      await syncInvoicesAfterExpenseChange(activeSheet, args[0]);
    }
  }, [_updateExpenseIndividualAmountRaw, syncInvoicesAfterExpenseChange, activeSheet]);

  const updateExpenseIndividualAmountsBatch = React.useCallback(async (...args) => {
    await _updateExpenseIndividualAmountsBatchRaw(...args);
    if (syncInvoicesAfterExpenseChange && activeSheet) {
      await syncInvoicesAfterExpenseChange(activeSheet, args[0]);
    }
  }, [_updateExpenseIndividualAmountsBatchRaw, syncInvoicesAfterExpenseChange, activeSheet]);

  const updateExpenseConsumptionBatch = React.useCallback(async (...args) => {
    await _updateExpenseConsumptionBatchRaw(...args);
    if (syncInvoicesAfterExpenseChange && activeSheet) {
      await syncInvoicesAfterExpenseChange(activeSheet, args[0]);
    }
  }, [_updateExpenseConsumptionBatchRaw, syncInvoicesAfterExpenseChange, activeSheet]);

  // 🔥 HOOK PENTRU OPERAȚIUNI DE DATE
  const {
    deleteAllBlocAppData,
    handleAddAssociation,
    handleAddBlock,
    handleAddStair,
    handleAddApartment,
    saveApartmentEdit,
    handleDeleteApartment,
    getAvailableStairs
  } = useDataOperations({
    association,
    blocks: blocks,
    stairs: stairs,
    apartments: apartments,
    createAssociation,
    addBlock,
    addStair,
    addApartment,
    updateApartment,
    deleteApartment,
    updateBlock,
    deleteBlock,
    updateStair,
    deleteStair
  });

  // 🗑️ FUNCȚIE WRAPPER PENTRU ȘTERGEREA CHELTUIELILOR CUSTOM CU CLEANUP COMPLET
  const handleDeleteCustomExpenseWithCleanup = async (expenseName) => {
    try {
      // 🆕 UNIFIED STRUCTURE: Găsește ID-ul cheltuielii din expenseConfigurations
      const expenseConfigurations = currentSheet?.configSnapshot?.expenseConfigurations || {};
      let expenseId = null;

      // Caută ID-ul în expenseConfigurations
      const configEntry = Object.entries(expenseConfigurations).find(
        ([id, config]) => config.name === expenseName && config.isCustom
      );

      if (configEntry) {
        expenseId = configEntry[0];
      }

      console.log(`🗑️ Ștergere cheltuială custom "${expenseName}" (ID: ${expenseId || 'nu s-a găsit'})`);

      // Șterge cheltuiala custom folosind funcția din useFirestore
      // Aceasta va șterge direct din expenseConfigurations
      await handleDeleteCustomExpense(expenseName);

      console.log(`✅ Cheltuiala custom "${expenseName}" ștearsă cu succes`);

      // 4. Actualizează și state-ul pentru disabledExpenses să elimine cheltuiala ștearsă
      if (association?.id && currentSheet?.monthYear) {
        const key = `${association.id}-${currentSheet.monthYear}`;
        setDisabledExpenses(prev => {
          const currentDisabled = prev[key] || [];
          const updatedDisabled = currentDisabled.filter(name => name !== expenseName);
          return {
            ...prev,
            [key]: updatedDisabled
          };
        });
      }

      console.log(`✅ Cleanup complet pentru cheltuiala "${expenseName}"`);
      return true;
    } catch (error) {
      console.error('❌ Eroare la ștergerea cheltuielii custom cu cleanup:', error);
      return false;
    }
  };

// 🔥 AUTO-EXPAND ENTITIES LA ÎNCĂRCAREA DATELOR - OPTIMIZAT
useEffect(() => {
  if (association?.id && blocks.length > 0 && currentView === 'setup') {
    autoExpandEntities(blocks, stairs, association.id);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [association?.id, currentView, blocks.length, stairs.length, autoExpandEntities]);

// 🔥 ÎNCĂRCAREA AJUSTĂRILOR DE SOLDURI LA SCHIMBAREA ASOCIAȚIEI SAU SHEET-ULUI
// ACTIVAT - încarcă ajustările din sheet-ul curent
useEffect(() => {
  if (association?.id && currentSheet?.configSnapshot?.balanceAdjustments) {
    try {
      // Citește direct din currentSheet fără a apela funcția
      const sheetAdjustments = currentSheet.configSnapshot.balanceAdjustments;

      // Convertește și integrează direct în monthlyBalances
      Object.entries(sheetAdjustments).forEach(([apartmentId, adjustmentData]) => {
        const balance = {
          restante: adjustmentData.restante || 0,
          penalitati: adjustmentData.penalitati || 0
        };
        setApartmentBalance(apartmentId, balance);
      });

    } catch (error) {
      console.error('❌ Eroare la încărcarea ajustărilor de solduri:', error);
    }
  }
}, [association?.id, currentSheet?.id, currentSheet?.configSnapshot?.balanceAdjustments, setApartmentBalance]);


  // 🔥 OVERLAY PENTRU MOBILE
  const Overlay = () => (
    sidebarOpen && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    )
  );

  // 🔥 LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă datele asociației...</p>
        </div>
      </div>
    );
  }

  // 🔥 ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 text-red-500 mx-auto mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-800 mb-2">Eroare la încărcarea datelor</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Reîncarcă pagina
          </button>
        </div>
      </div>
    );
  }

  // 🔥 WRAPPER FUNCTIONS PENTRU COMPONENTE
  const handleAssociationSubmit = () => {
    handleAddAssociation(activeUser, newAssociation, resetNewAssociation, initializeMonths);
  };

  const handleBlockSubmit = () => {
    handleAddBlock(newBlock, resetNewBlock);
  };

  const handleStairSubmit = () => {
    handleAddStair(newStair, resetNewStair);
  };

  const handleApartmentSubmit = () => {
    handleAddApartment(newApartment, resetNewApartment);
  };

  const handleSaveApartmentEdit = (apartmentId) => {
    saveApartmentEdit(apartmentId, editingApartmentData, cancelApartmentEdit);
  };

  // 🔥 LAYOUT PRINCIPAL
  const monthType = getMonthType ? getMonthType(currentMonth) : 'current';
  // Culori fundal bazate pe status: albastru=în lucru, verde=publicată, gri=arhivată
  const isCurrentMonthReadOnly = isMonthReadOnly ? isMonthReadOnly(currentMonth) : false;
  const mainBgClass = (monthType === 'historic' && isCurrentMonthReadOnly)
    ? "bg-gradient-to-br from-gray-50 to-gray-100"
    : isCurrentMonthReadOnly
    ? "bg-gradient-to-br from-green-50 to-emerald-100"
    : "bg-gradient-to-br from-indigo-50 to-blue-100";

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        currentView={currentView}
        handleNavigation={handleNavigationWithStandalone}
        association={association}
        getAssociationApartments={getAssociationApartments}
        deleteAllBlocAppData={deleteAllBlocAppData}
        userProfile={userProfile}
        activeUser={activeUser}
        setCurrentMonth={setCurrentMonth}
        publishedSheet={publishedSheet}
        currentSheet={currentSheet}
        onSwitchContext={clearContext}
        userRole={userRole}
      />
      
      {/* Overlay pentru mobile */}
      <Overlay />
      
      {/* Mobile Header - visible only on mobile */}
      <MobileHeader
        onLogoClick={() => {
          if (publishedSheet?.monthYear) {
            setCurrentMonth(publishedSheet.monthYear);
          } else if (currentSheet?.monthYear) {
            setCurrentMonth(currentSheet.monthYear);
          }
          handleNavigation("dashboard");
        }}
        onAvatarClick={() => onStandaloneNavigate ? onStandaloneNavigate("profile") : handleNavigation("profile")}
        onSwitchContext={handleSwitchContext}
        association={association}
        userProfile={userProfile}
        activeUser={activeUser}
        handleNavigation={handleNavigationWithStandalone}
        deleteAllBlocAppData={deleteAllBlocAppData}
        userRole={userRole}
      />

      {/* Conținut principal */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out ${
        sidebarExpanded ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        {/* Zona de conținut - padding pentru mobile header și bottom nav cu safe-area */}
        <main className={`flex-1 overflow-y-auto main-content-mobile-padding ${mainBgClass}`} style={{ scrollbarGutter: 'stable' }}>
        <style>{`
          .main-content-mobile-padding {
            padding-top: calc(3.5rem + env(safe-area-inset-top, 0px));
            /* padding-bottom handled by individual views to extend gradient background */
          }
          @media (min-width: 1024px) {
            .main-content-mobile-padding {
              padding-top: 0;
            }
          }
        `}</style>

          {/* 💳 Subscription Banner - afișat când trial expiră sau cont suspendat */}
          <SubscriptionBanner
            onNavigateToSubscription={() => handleNavigation('subscription')}
          />

          {/* Header centralizat - afișat pe toate view-urile */}
          <DashboardHeader
            association={association}
            blocks={blocks}
            stairs={stairs}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            getAvailableMonths={getAvailableMonths}
            expenses={expenses}
            isMonthReadOnly={isMonthReadOnly(currentMonth)}
            getAssociationApartments={getAssociationApartments || (() => [])}
            handleNavigation={handleNavigation}
            getMonthType={getMonthType}
          />

          {/* Dashboard View */}
          {currentView === "dashboard" && (
            <DashboardView
              association={association}
              blocks={blocks}
              stairs={stairs}
              getAssociationApartments={getAssociationApartments || (() => {
                console.error('⚠️ getAssociationApartments is not available');
                return [];
              })}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              getAvailableMonths={getAvailableMonths}
              isMonthReadOnly={isMonthReadOnly(currentMonth)}
              newAssociation={newAssociation}
              setNewAssociation={setNewAssociation}
              handleAddAssociation={handleAssociationSubmit}
              handleNavigation={handleNavigation}
              expenses={currentSheet?.expenses || []}
              maintenanceData={maintenanceData}
              userProfile={userProfile}
              getMonthType={getMonthType}
              currentSheet={activeSheet}
              publishedSheet={publishedSheet}
              sheets={sheets || []}
              getExpenseConfig={getFirestoreExpenseConfig}
              getApartmentParticipation={getApartmentParticipation}
              calculateMaintenanceWithDetails={calculateMaintenanceWithDetails}
              isReadOnlyRole={isReadOnlyRole}
            />
          )}

          {/* Maintenance View */}
          {currentView === "maintenance" && (
            <MaintenanceView
              association={association}
              blocks={blocks}
              stairs={stairs}
              getAssociationApartments={getAssociationApartments || (() => {
                console.error('⚠️ getAssociationApartments is not available from useMaintenanceCalculation');
                return [];
              })}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              isMonthReadOnly={isMonthReadOnly(currentMonth)}
              shouldShowPublishButton={shouldShowPublishButton}
              shouldShowAdjustButton={shouldShowAdjustButton}
              getCurrentActiveMonth={getCurrentActiveMonth}
              getNextActiveMonth={getNextActiveMonth}
              getMonthType={getMonthType}
              publishMonth={async (month) => {
                // Apelăm publishMonth din hook care gestionează tot (inclusiv mesajele)
                return await publishMonth(month, association, expenses, hasInitialBalances, getAssociationApartments || (() => []), calculateMaintenanceWithDetails());
              }}
              unpublishSheet={unpublishSheet}
              getAvailableMonths={getAvailableMonths}
              activeSheet={activeSheet} // 🆕 CRITICAL: Sheet activ calculat de BlocApp (include archived/published/in_progress)
              expenses={activeSheet?.expenses || []}
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              getAvailableExpenseTypes={getAvailableExpenseTypes}
              areAllExpensesFullyCompleted={areAllExpensesFullyCompleted}
              getExpenseConfig={getFirestoreExpenseConfig}
              handleAddExpense={handleAddExpense}
              handleUpdateExpense={handleUpdateExpense}
              handleDeleteMonthlyExpense={(expenseId) => handleDeleteMonthlyExpense(expenseId, { invoices, removeInvoiceDistribution })}
              updateExpenseConsumption={updateExpenseConsumption}
              updateExpenseConsumptionBatch={updateExpenseConsumptionBatch}
              updateExpenseIndividualAmount={updateExpenseIndividualAmount}
              updateExpenseIndividualAmountsBatch={updateExpenseIndividualAmountsBatch}
              updatePendingConsumption={updatePendingConsumption}
              updatePendingIndividualAmount={updatePendingIndividualAmount}
              updateExpenseIndexes={updateExpenseIndexes}
              updatePendingIndexes={updatePendingIndexes}
              maintenanceData={maintenanceData}
              calculateExpenseDifferences={calculateExpenseDifferences}
              togglePayment={() => {}}
              activeMaintenanceTab={activeMaintenanceTab}
              setActiveMaintenanceTab={setActiveMaintenanceTab}
              pendingMaintenanceApartmentId={pendingMaintenanceApartmentId}
              setPendingMaintenanceApartmentId={setPendingMaintenanceApartmentId}
              forceRecalculate={() => {}}
              showAdjustBalances={showAdjustBalances}
              setShowAdjustBalances={setShowAdjustBalances}
              showExpenseConfig={showExpenseConfig}
              setShowExpenseConfig={setShowExpenseConfig}
              adjustModalData={adjustModalData}
              setAdjustModalData={setAdjustModalData}
              getApartmentBalance={getApartmentBalance}
              setApartmentBalance={setApartmentBalance}
              saveBalanceAdjustments={saveBalanceAdjustments}
              updateCurrentSheetMaintenanceTable={updateCurrentSheetMaintenanceTable}
              createInitialSheet={createInitialSheet}
              currentSheet={currentSheet}
              publishedSheet={publishedSheet}
              setMonthlyTables={() => {}}
              selectedExpenseForConfig={selectedExpenseForConfig}
              setSelectedExpenseForConfig={setSelectedExpenseForConfig}
              newCustomExpense={newCustomExpense}
              setNewCustomExpense={setNewCustomExpense}
              handleAddCustomExpense={handleAddCustomExpense}
              getAssociationExpenseTypes={getAssociationExpenseTypes}
              updateExpenseConfig={updateFirestoreExpenseConfig}
              saveApartmentParticipations={saveApartmentParticipations}
              getApartmentParticipation={getApartmentParticipation}
              setApartmentParticipation={setApartmentParticipation}
              getDisabledExpenseTypes={getDisabledExpenseTypes}
              toggleExpenseStatus={toggleExpenseStatus}
              deleteCustomExpense={handleDeleteCustomExpenseWithCleanup}
              handleNavigation={handleNavigation}
              monthlyBalances={monthlyBalances}
              isReadOnlyRole={isReadOnlyRole}
            />
          )}

          {/* Setup View */}
          {currentView === "setup" && (
            <SetupView
              association={association}
              blocks={blocks}
              stairs={stairs}
              getAssociationApartments={getAssociationApartments || (() => {
                console.error('⚠️ getAssociationApartments is not available');
                return [];
              })}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              getAvailableMonths={getAvailableMonths}
              expenses={expenses}
              isMonthReadOnly={isMonthReadOnly(currentMonth)}
              handleNavigation={handleNavigation}
              setPendingMaintenanceApartmentId={setPendingMaintenanceApartmentId}
              maintenanceData={maintenanceData}
              currentSheet={currentSheet}
              publishedSheet={publishedSheet}
              getApartmentParticipation={getApartmentParticipation}
              getExpenseConfig={getFirestoreExpenseConfig}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              expandedBlocks={expandedBlocks}
              setExpandedBlocks={setExpandedBlocks}
              expandedStairs={expandedStairs}
              setExpandedStairs={setExpandedStairs}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              editingData={editingData}
              setEditingData={setEditingData}
              showAddForm={showAddForm}
              setShowAddForm={setShowAddForm}
              updateBlock={updateBlock}
              deleteBlock={deleteBlock}
              updateStair={updateStair}
              deleteStair={deleteStair}
              updateApartment={updateApartment}
              deleteApartment={deleteApartment}
              addBlock={addBlock}
              addStair={addStair}
              addApartment={addApartment}
              setApartmentBalance={setApartmentBalance}
              saveInitialBalances={saveInitialBalances}
              getMonthType={getMonthType}
              isReadOnlyRole={isReadOnlyRole}
            />
          )}

          {/* Expenses View */}
          {currentView === "expenses" && (
            <ExpensesView
              association={association}
              blocks={blocks}
              stairs={stairs}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              getAvailableMonths={getAvailableMonths}
              expenses={expenses}
              isMonthReadOnly={isMonthReadOnly(currentMonth)}
              getAssociationApartments={getAssociationApartments || (() => {
                console.error('⚠️ getAssociationApartments is not available');
                return [];
              })}
              handleNavigation={handleNavigation}
              newCustomExpense={newCustomExpense}
              setNewCustomExpense={setNewCustomExpense}
              handleAddCustomExpense={handleAddCustomExpense}
              addCustomExpense={addCustomExpense}
              selectedExpenseForConfig={selectedExpenseForConfig}
              setSelectedExpenseForConfig={setSelectedExpenseForConfig}
              getAssociationExpenseTypes={getAssociationExpenseTypes}
              getExpenseConfig={getFirestoreExpenseConfig}
              updateExpenseConfig={updateFirestoreExpenseConfig}
              saveApartmentParticipations={saveApartmentParticipations}
              getApartmentParticipation={getApartmentParticipation}
              setApartmentParticipation={setApartmentParticipation}
              getDisabledExpenseTypes={getDisabledExpenseTypes}
              toggleExpenseStatus={toggleExpenseStatus}
              deleteCustomExpense={handleDeleteCustomExpenseWithCleanup}
              getMonthType={getMonthType}
              currentSheet={currentSheet}
              publishedSheet={publishedSheet}
              sheets={sheets}
              togglePortalSubmission={togglePortalSubmission}
              isReadOnlyRole={isReadOnlyRole}
              invoices={invoices}
            />
          )}

          {/* Suppliers View */}
          {currentView === "suppliers" && (
            <SuppliersView
              association={association}
              currentMonth={currentMonth}
              isMonthReadOnly={isMonthReadOnly(currentMonth)}
              isReadOnlyRole={isReadOnlyRole}
              getAssociationExpenseTypes={getAssociationExpenseTypes}
              getExpenseConfig={getFirestoreExpenseConfig}
              updateExpenseConfig={updateFirestoreExpenseConfig}
              currentSheet={currentSheet}
              publishedSheet={publishedSheet}
              sheets={sheets}
              blocks={blocks}
              stairs={stairs}
              invoices={invoices}
            />
          )}

          {/* Association View */}
          {currentView === "association" && (
            <AssociationView
              association={association}
              setAssociation={setAssociation}
              newAssociation={newAssociation}
              setNewAssociation={setNewAssociation}
              handleAddAssociation={handleAssociationSubmit}
              updateAssociation={updateAssociation}
              blocks={blocks}
              stairs={stairs}
              getAssociationApartments={getAssociationApartments || (() => {
                console.error('⚠️ getAssociationApartments is not available');
                return [];
              })}
              handleNavigation={handleNavigation}
              userProfile={userProfile}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              getAvailableMonths={getAvailableMonths}
              expenses={expenses}
              isMonthReadOnly={isMonthReadOnly(currentMonth)}
              getMonthType={getMonthType}
              userRole={userRole}
              currentUserId={currentUser?.uid}
              currentSheet={currentSheet}
              publishedSheet={publishedSheet}
              sheets={sheets || []}
              updateSheetMonthSettings={updateSheetMonthSettings}
              isReadOnlyRole={isReadOnlyRole}
            />
          )}

          {/* Accounting View */}
          {currentView === "accounting" && (
            <AccountingView
              association={association}
              blocks={blocks}
              stairs={stairs}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              getAvailableMonths={getAvailableMonths}
              expenses={expenses}
              isMonthReadOnly={isMonthReadOnly(currentMonth)}
              getAssociationApartments={getAssociationApartments || (() => {
                console.error('⚠️ getAssociationApartments is not available');
                return [];
              })}
              handleNavigation={handleNavigation}
              getMonthType={getMonthType}
              publishedSheet={publishedSheet}
              sheets={sheets || []}
              // Props pentru facturi
              invoices={invoices}
              addInvoice={addInvoice}
              getInvoicesByMonth={getInvoicesByMonth}
              getInvoiceStats={getInvoiceStats}
              markInvoiceAsPaid={markInvoiceAsPaid}
              markInvoiceAsUnpaid={markInvoiceAsUnpaid}
              deleteInvoice={deleteInvoice}
              updateInvoice={updateInvoice}
              updateMissingSuppliersForExistingInvoices={updateMissingSuppliersForExistingInvoices}
              currentSheet={currentSheet}
              isReadOnlyRole={isReadOnlyRole}
              onNavigateToApartmentMessages={(apartmentId) => {
                setMessagesTargetApartmentId(apartmentId);
                handleNavigation('messages');
              }}
            />
          )}

          {/* Messages View */}
          {currentView === "messages" && (
            <MessagesView
              association={association}
              blocks={blocks}
              stairs={stairs}
              apartments={getAssociationApartments ? getAssociationApartments() : []}
              currentUser={activeUser}
              userRole={userRole}
              handleNavigation={handleNavigation}
              preFilterApartmentId={messagesTargetApartmentId}
              onClearPreFilter={() => setMessagesTargetApartmentId(null)}
            />
          )}

        </main>
      </div>

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNavigation
        currentView={currentView}
        handleNavigation={handleNavigation}
      />
    </div>
    </ErrorBoundary>
  );
}