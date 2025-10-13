import React, { useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import ErrorBoundary from "./components/common/ErrorBoundary";

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

// Migration tools
import { exposeMigrationTools } from './utils/dataMigration';
import './utils/testMigration';
import './utils/cleanupOldCollections';
import './utils/structureMigration';

// Components
import Sidebar from './components/common/Sidebar';
import {
  SetupView,
  AssociationView,
  ExpensesView,
  DashboardView,
  MaintenanceView,
  ProfileView,
  TutorialsView,
  AccountingView,
  SettingsView
} from './components/views';

export default function BlocApp() {
  const { userProfile, currentUser } = useAuthEnhanced();
  const activeUser = currentUser;

  // 🔗 REF pentru sheet operations (pentru a evita dependența circulară)
  const sheetOperationsRef = useRef(null);
  
  // 🔥 HOOK PRINCIPAL PENTRU DATE FIRESTORE (primul pentru a obține association)
  const {
    loading,
    error,
    association,
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
  } = useAssociationData(sheetOperationsRef);

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

  // 🔥 HOOK PENTRU GESTIONAREA LUNILOR (după ce avem association)
  const {
    currentMonth,
    setCurrentMonth,
    initializeMonths,
    getMonthStatus,
    setMonthStatus,
    publishMonth,
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

    // Expune migration tools pentru debugging
    exposeMigrationTools();

  }, [fixTransferredBalances, createInitialSheet, association, currentSheet, publishedSheet, sheets]);


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

  // 📝 HOOK PENTRU CONFIGURAȚII CHELTUIELI (trebuie înainte de useMaintenanceCalculation și useExpenseManagement)
  const {
    configurations: expenseConfigurations,
    loading: configLoading,
    getExpenseConfig: getFirestoreExpenseConfig,
    updateExpenseConfig: updateFirestoreExpenseConfig,
    deleteExpenseConfig: deleteFirestoreExpenseConfig,
    saveApartmentParticipations,
    fixFirestoreConfigurations
  } = useExpenseConfigurations(currentSheet);

  // 🔥 HOOK PENTRU CALCULUL ÎNTREȚINERII
  const {
    getAssociationApartments,
    getApartmentBalance,
    setApartmentBalance,
    maintenanceData,
    calculateMaintenanceWithDetails,
    calculateTotalExpenses,
    calculateTotalMaintenance,
    maintenanceStats,
    monthlyBalances
  } = useMaintenanceCalculation({
    association: association || null,
    blocks: blocks || [],
    stairs: stairs || [],
    apartments: apartments || [],
    expenses: expenses || [],
    currentMonth: currentMonth || null,
    calculateNextMonthBalances, // Pasăm funcția din useBalanceManagement
    // Pasăm soldurile din sheet-uri pentru corelația corectă
    currentSheet,
    publishedSheet,
    getSheetBalances: getSheetBalances || (() => null),
    getCurrentSheetBalance: getCurrentSheetBalance || (() => ({ restante: 0, penalitati: 0 })),
    // Adăugăm funcția pentru salvarea automată a tabelului calculat
    updateCurrentSheetMaintenanceTable,
    // Pasăm funcția pentru a obține configurația cheltuielii (inclusiv participarea)
    getExpenseConfig: getFirestoreExpenseConfig
  });

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
    updateExpenseConsumption,
    updateExpenseIndividualAmount,
    updatePendingConsumption,
    updatePendingIndividualAmount,
    updateExpenseIndexes,
    updatePendingIndexes,
    expenseStats
  } = useExpenseManagement({
    association,
    expenses: currentSheet?.expenses || [], // SHEET-BASED: folosește cheltuielile din sheet
    customExpenses,
    currentMonth,
    currentSheet, // SHEET-BASED: adăugat pentru a folosi sheet.id în loc de monthYear
    disabledExpenses,
    addMonthlyExpense: addExpenseToSheet, // SHEET-BASED: folosește addExpenseToSheet
    updateMonthlyExpense,
    updateExpenseInSheet, // SHEET-BASED: adăugat pentru actualizare cheltuieli în sheet
    deleteMonthlyExpense: removeExpenseFromSheet, // SHEET-BASED: folosește removeExpenseFromSheet
    addCustomExpense,
    deleteCustomExpense,
    getExpenseConfig: getFirestoreExpenseConfig  // FIREBASE: funcția pentru configurări din useExpenseConfigurations
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
    updateMissingSuppliersForExistingInvoices
  } = useInvoices(association?.id, currentSheet);

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
      // 1. Șterge cheltuiala custom (din sheet și din state-ul customExpenses)
      await handleDeleteCustomExpense(expenseName);

      // 2. Șterge și configurația cheltuielii din expenseConfigurations
      try {
        await deleteFirestoreExpenseConfig(expenseName);
        console.log(`✅ Configurația pentru "${expenseName}" ștearsă cu succes`);
      } catch (configError) {
        console.warn(`⚠️ Nu s-a putut șterge configurația pentru "${expenseName}":`, configError);
        // Nu opresc procesul pentru această eroare non-critică
      }

      // 3. Actualizează și state-ul pentru disabledExpenses să elimine cheltuiala ștearsă
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
        handleNavigation={handleNavigation}
        association={association}
        getAssociationApartments={getAssociationApartments}
        deleteAllBlocAppData={deleteAllBlocAppData}
        userProfile={userProfile}
        activeUser={activeUser}
        setCurrentMonth={setCurrentMonth}
      />
      
      {/* Overlay pentru mobile */}
      <Overlay />
      
      {/* Conținut principal */}
      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ease-in-out ${
        sidebarExpanded ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        {/* Buton mobile menu */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        
        {/* Zona de conținut */}
        <main className="flex-1 overflow-y-scroll">
          
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
              expenses={expenses}
              maintenanceData={maintenanceData}
              userProfile={userProfile}
              getMonthType={getMonthType}
              currentSheet={currentSheet}
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
              isMonthReadOnly={currentSheet?.status !== 'in_progress'}
              shouldShowPublishButton={shouldShowPublishButton}
              shouldShowAdjustButton={shouldShowAdjustButton}
              getCurrentActiveMonth={getCurrentActiveMonth}
              getNextActiveMonth={getNextActiveMonth}
              getMonthType={getMonthType}
              publishMonth={async (month) => {
                // Apelăm publishMonth din hook care gestionează tot (inclusiv mesajele)
                return await publishMonth(month, association, expenses, hasInitialBalances, getAssociationApartments || (() => []), calculateMaintenanceWithDetails());
              }}
              getAvailableMonths={getAvailableMonths}
              expenses={currentSheet?.expenses || []}
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              getAvailableExpenseTypes={getAvailableExpenseTypes}
              areAllExpensesFullyCompleted={areAllExpensesFullyCompleted}
              getExpenseConfig={getFirestoreExpenseConfig}
              handleAddExpense={handleAddExpense}
              handleUpdateExpense={handleUpdateExpense}
              handleDeleteMonthlyExpense={handleDeleteMonthlyExpense}
              updateExpenseConsumption={updateExpenseConsumption}
              updateExpenseIndividualAmount={updateExpenseIndividualAmount}
              updatePendingConsumption={updatePendingConsumption}
              updatePendingIndividualAmount={updatePendingIndividualAmount}
              updateExpenseIndexes={updateExpenseIndexes}
              updatePendingIndexes={updatePendingIndexes}
              maintenanceData={maintenanceData}
              togglePayment={() => {}}
              activeMaintenanceTab={activeMaintenanceTab}
              setActiveMaintenanceTab={setActiveMaintenanceTab}
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
              setMonthlyTables={() => {}}
              selectedExpenseForConfig={selectedExpenseForConfig}
              setSelectedExpenseForConfig={setSelectedExpenseForConfig}
              newCustomExpense={newCustomExpense}
              setNewCustomExpense={setNewCustomExpense}
              handleAddCustomExpense={handleAddCustomExpense}
              getAssociationExpenseTypes={getAssociationExpenseTypes}
              updateExpenseConfig={updateFirestoreExpenseConfig}
              getApartmentParticipation={getApartmentParticipation}
              setApartmentParticipation={setApartmentParticipation}
              getDisabledExpenseTypes={getDisabledExpenseTypes}
              toggleExpenseStatus={toggleExpenseStatus}
              deleteCustomExpense={handleDeleteCustomExpenseWithCleanup}
              handleNavigation={handleNavigation}
              monthlyBalances={monthlyBalances}
            />
          )}

          {/* Setup View */}
          {currentView === "setup" && (
            <SetupView
              association={association}
              blocks={blocks}
              stairs={stairs}
              apartments={apartments}
              firestoreApartments={firestoreApartments}
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
              blocks={blocks}
              stairs={stairs}
            />
          )}

          {/* Association View */}
          {currentView === "association" && (
            <AssociationView
              association={association}
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
            />
          )}

          {/* Profile View */}
          {currentView === "profile" && (
            <ProfileView
              association={association}
              blocks={blocks}
              stairs={stairs}
              updateAssociation={updateAssociation}
              userProfile={userProfile}
              currentUser={currentUser}
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
            />
          )}

          {/* Tutorials View */}
          {currentView === "tutorials" && (
            <TutorialsView
              association={association}
              updateAssociation={updateAssociation}
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
              // Props pentru facturi
              invoices={invoices}
              getInvoicesByMonth={getInvoicesByMonth}
              getInvoiceStats={getInvoiceStats}
              markInvoiceAsPaid={markInvoiceAsPaid}
              markInvoiceAsUnpaid={markInvoiceAsUnpaid}
              updateMissingSuppliersForExistingInvoices={updateMissingSuppliersForExistingInvoices}
            />
          )}

          {/* Settings View */}
          {currentView === "settings" && (
            <SettingsView
              association={association}
              blocks={blocks}
              stairs={stairs}
              updateAssociation={updateAssociation}
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
              currentSheet={currentSheet}
              publishedSheet={publishedSheet}
              sheets={sheets || []}
              updateSheetCustomName={updateSheetCustomName}
              updateSheetMonthSettings={updateSheetMonthSettings}
            />
          )}

        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}