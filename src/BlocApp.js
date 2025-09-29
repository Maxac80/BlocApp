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
    blocks,
    stairs,
    apartments,
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

  // 🎯 USE SHEET DATA: Folosește datele din sheet dacă sunt disponibile, altfel fallback la colecții
  const finalBlocks = sheetBlocks.length > 0 ? sheetBlocks : (blocks || []);
  const finalStairs = sheetStairs.length > 0 ? sheetStairs : (stairs || []);
  const finalApartments = sheetApartments.length > 0 ? sheetApartments : (apartments || []);



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
        // STRUCTURE operations
        updateStructureSnapshot
      };
    }
  }, [addBlockToSheet, addStairToSheet, addApartmentToSheet, deleteBlockFromSheet, deleteStairFromSheet, deleteApartmentFromSheet, updateBlockInSheet, updateStairInSheet, updateApartmentInSheet, updateStructureSnapshot]);

  // Pentru debug - expune funcțiile în window
  useEffect(() => {
    if (fixTransferredBalances) {
      window.fixTransferredBalances = fixTransferredBalances;
      console.log('🔧 fixTransferredBalances available in window for debugging');
    }
    if (createInitialSheet && association) {
      window.createInitialSheet = () => createInitialSheet(association);
      console.log('🔧 createInitialSheet available in window for debugging');
    }

    // Expune migration tools pentru debugging
    exposeMigrationTools();
    console.log('🔧 Migration tools available in window.dataMigration for debugging');

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
    blocks: finalBlocks || [],
    stairs: finalStairs || [],
    apartments: finalApartments || [],
    expenses: expenses || [],
    currentMonth: currentMonth || null,
    calculateNextMonthBalances, // Pasăm funcția din useBalanceManagement
    // Pasăm soldurile din sheet-uri pentru corelația corectă
    currentSheet,
    publishedSheet,
    getSheetBalances: getSheetBalances || (() => null),
    getCurrentSheetBalance: getCurrentSheetBalance || (() => ({ restante: 0, penalitati: 0 })),
    // Adăugăm funcția pentru salvarea automată a tabelului calculat
    updateCurrentSheetMaintenanceTable
  });

  // 🔥 HOOK PENTRU GESTIONAREA CHELTUIELILOR
  const {
    expenseConfig,
    setExpenseConfig,
    expenseParticipation,
    setExpenseParticipation,
    newExpense,
    setNewExpense,
    newCustomExpense,
    setNewCustomExpense,
    getExpenseConfig,
    updateExpenseConfig,
    getApartmentParticipation,
    setApartmentParticipation,
    getAssociationExpenseTypes,
    getDisabledExpenseTypes,
    getAvailableExpenseTypes,
    areAllExpensesFullyCompleted,
    handleAddExpense,
    handleAddCustomExpense,
    handleDeleteCustomExpense,
    handleDeleteMonthlyExpense,
    updateExpenseConsumption,
    updateExpenseIndividualAmount,
    expenseStats
  } = useExpenseManagement({
    association,
    expenses: currentSheet?.expenses || [], // SHEET-BASED: folosește cheltuielile din sheet
    customExpenses,
    currentMonth,
    disabledExpenses,
    addMonthlyExpense: addExpenseToSheet, // SHEET-BASED: folosește addExpenseToSheet
    updateMonthlyExpense,
    deleteMonthlyExpense: removeExpenseFromSheet, // SHEET-BASED: folosește removeExpenseFromSheet
    addCustomExpense,
    deleteCustomExpense
  });

  // 📝 HOOK PENTRU CONFIGURAȚII CHELTUIELI
  const {
    configurations: expenseConfigurations,
    loading: configLoading,
    getExpenseConfig: getFirestoreExpenseConfig,
    updateExpenseConfig: updateFirestoreExpenseConfig,
    fixFirestoreConfigurations
  } = useExpenseConfigurations(currentSheet);

  // 🔧 Corectează configurațiile greșite din Firestore o singură dată
  React.useEffect(() => {
    if (association?.id && !configLoading && Object.keys(expenseConfigurations).length > 0) {
      fixFirestoreConfigurations();
    }
  }, [association?.id, configLoading, expenseConfigurations, fixFirestoreConfigurations]);

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
    blocks: finalBlocks,
    stairs: finalStairs,
    apartments: finalApartments,
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

// 🔥 AUTO-EXPAND ENTITIES LA ÎNCĂRCAREA DATELOR - OPTIMIZAT
useEffect(() => {
  if (association?.id && finalBlocks.length > 0) {
    autoExpandEntities(finalBlocks, finalStairs, association.id);
  }
}, [association?.id]);

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
              blocks={finalBlocks}
              stairs={finalStairs}
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
              blocks={finalBlocks}
              stairs={finalStairs}
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
              getAvailableMonths={getAvailableMonths}
              expenses={expenses}
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              getAvailableExpenseTypes={getAvailableExpenseTypes}
              areAllExpensesFullyCompleted={areAllExpensesFullyCompleted}
              getExpenseConfig={getFirestoreExpenseConfig}
              handleAddExpense={() => handleAddExpense(addInvoice)}
              handleDeleteMonthlyExpense={handleDeleteMonthlyExpense}
              updateExpenseConsumption={updateExpenseConsumption}
              updateExpenseIndividualAmount={updateExpenseIndividualAmount}
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
              deleteCustomExpense={deleteCustomExpense}
              handleNavigation={handleNavigation}
              monthlyBalances={monthlyBalances}
            />
          )}

          {/* Setup View */}
          {currentView === "setup" && (
            <SetupView
              association={association}
              blocks={finalBlocks}
              stairs={finalStairs}
              apartments={finalApartments}
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
              selectedExpenseForConfig={selectedExpenseForConfig}
              setSelectedExpenseForConfig={setSelectedExpenseForConfig}
              getAssociationExpenseTypes={getAssociationExpenseTypes}
              getExpenseConfig={getFirestoreExpenseConfig}
              updateExpenseConfig={updateFirestoreExpenseConfig}
              getApartmentParticipation={getApartmentParticipation}
              setApartmentParticipation={setApartmentParticipation}
              getDisabledExpenseTypes={getDisabledExpenseTypes}
              toggleExpenseStatus={toggleExpenseStatus}
              deleteCustomExpense={handleDeleteCustomExpense}
              getMonthType={getMonthType}
              currentSheet={currentSheet}
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
              blocks={finalBlocks}
              stairs={finalStairs}
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