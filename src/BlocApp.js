import React, { useEffect } from "react";
import { Menu } from "lucide-react";

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
  AccountingView
} from './components/views';

export default function BlocApp() {
  const { userProfile, currentUser } = useAuthEnhanced();
  const activeUser = currentUser;
  
  // 🔥 HOOK PRINCIPAL PENTRU DATE FIRESTORE
  const {
    loading,
    error,
    association,
    blocks,np,
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
    addMonthlyExpense,
    updateMonthlyExpense,
    deleteMonthlyExpense,
    updateBlock,
    deleteBlock,
    updateStair,
    deleteStair
  } = useAssociationData();

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

  // 🔥 HOOK PENTRU GESTIONAREA LUNILOR
  const {
    currentMonth,
    setCurrentMonth,
    initializeMonths,
    getMonthStatus,
    setMonthStatus,
    publishMonth,
    unpublishMonth,
    getMonthType,
    getAvailableMonths,
    shouldShowAdjustButton,
    shouldShowPublishButton,
    isMonthReadOnly,
    getCurrentActiveMonth,
    getNextActiveMonth
  } = useMonthManagement(association?.id);


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
  } = useBalanceManagement(association);

  // 🔥 HOOK PENTRU CALCULUL ÎNTREȚINERII
  const {
    maintenanceData,
    maintenanceStats,
    calculateMaintenance,
    calculateMaintenanceWithDetails,
    getCurrentMonthTable,
    getApartmentBalance,
    setApartmentBalance,
    monthlyBalances,
    setMonthlyBalances,
    monthlyTables,
    setMonthlyTables,
    togglePayment,
    closeCurrentMonth,
    forceRecalculate,
    getAssociationApartments
  } = useMaintenanceCalculation({
    association,
    blocks,
    stairs,
    apartments,
    expenses,
    currentMonth,
    calculateNextMonthBalances, // Pasăm funcția din useBalanceManagement
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
    handleAddExpense,
    handleAddCustomExpense,
    handleDeleteCustomExpense,
    handleDeleteMonthlyExpense,
    updateExpenseConsumption,
    updateExpenseIndividualAmount,
    expenseStats
  } = useExpenseManagement({
    association,
    expenses,
    customExpenses,
    currentMonth,
    disabledExpenses,
    addMonthlyExpense,
    updateMonthlyExpense,
    deleteMonthlyExpense,
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
  } = useExpenseConfigurations(association?.id);

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
    getInvoiceStats
  } = useInvoices(association?.id);

  // 🔥 HOOK PENTRU OPERAȚIUNI DE DATE
  const {
    deleteAllBlocAppData,
    deleteCurrentAssociationData,
    handleAddAssociation,
    handleAddBlock,
    handleAddStair,
    handleAddApartment,
    saveApartmentEdit,
    handleDeleteApartment,
    getAvailableStairs
  } = useDataOperations({
    association,
    blocks,
    stairs,
    apartments,
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
  if (association?.id && blocks.length > 0) {
    autoExpandEntities(blocks, stairs, association.id);
  }
}, [association?.id]);

// 🔥 ÎNCĂRCAREA AJUSTĂRILOR DE SOLDURI LA SCHIMBAREA ASOCIAȚIEI
// DEZACTIVAT - folosim doar calculul din tabelul curent, fără încărcări din Firebase
/*
useEffect(() => {
  const loadAdjustments = async () => {
    if (association?.id) {
      try {
        console.log('📋 Încarc ajustările de solduri pentru asociația:', association.id);
        const adjustments = await loadBalanceAdjustments();
        
        // Integrează ajustările în monthlyBalances
        Object.entries(adjustments).forEach(([monthKey, monthAdjustments]) => {
          Object.entries(monthAdjustments).forEach(([apartmentId, balance]) => {
            setApartmentBalance(apartmentId, balance);
          });
        });
        
        console.log('✅ Ajustări de solduri încărcate și integrate:', Object.keys(adjustments).length, 'luni');
      } catch (error) {
        console.error('❌ Eroare la încărcarea ajustărilor de solduri:', error);
      }
    }
  };
  
  loadAdjustments();
}, [association?.id, loadBalanceAdjustments, setApartmentBalance]);
*/


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
        deleteCurrentAssociationData={deleteCurrentAssociationData}
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
              getAssociationApartments={getAssociationApartments}
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
            />
          )}

          {/* Maintenance View */}
          {currentView === "maintenance" && (
            <MaintenanceView
              association={association}
              blocks={blocks}
              stairs={stairs}
              getAssociationApartments={getAssociationApartments}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              isMonthReadOnly={isMonthReadOnly(currentMonth)}
              shouldShowPublishButton={shouldShowPublishButton}
              shouldShowAdjustButton={shouldShowAdjustButton}
              getCurrentActiveMonth={getCurrentActiveMonth}
              getNextActiveMonth={getNextActiveMonth}
              getMonthType={getMonthType}
              publishMonth={(month) => {
                console.log('🔍 BlocApp publishMonth - hasInitialBalances:', hasInitialBalances, typeof hasInitialBalances);
                const result = publishMonth(month, association, expenses, hasInitialBalances, getAssociationApartments, maintenanceData);
                if (result) {
                  // ✅ TRANSFER AUTOMAT SOLDURI - REACTIVAT ȘI REPARAT
                  console.log('🔄 Începe transferul automat de solduri...');
                  
                  if (maintenanceData && maintenanceData.length > 0) {
                    try {
                      // Calculează soldurile pentru luna următoare folosind logica reparată
                      const nextMonthBalances = calculateNextMonthBalances(maintenanceData, month);
                      
                      console.log('💰 Solduri calculate pentru luna următoare:', nextMonthBalances);
                      
                      if (nextMonthBalances && Object.keys(nextMonthBalances).length > 0) {
                        // Salvează soldurile în Firebase pentru luna următoare
                        const monthlyBalances = nextMonthBalances; // nextMonthBalances vine cu cheia corectă
                        const nextMonthKey = Object.keys(nextMonthBalances)[0]; // Ia prima cheie care conține luna
                        const nextMonth = nextMonthKey.split('-').slice(1).join('-'); // Extrage luna din cheie
                        
                        saveInitialBalances(monthlyBalances, nextMonth).then(() => {
                          console.log(`✅ Soldurile au fost transferate automat în luna următoare: ${nextMonth}`);
                          alert(`✅ Luna ${month} a fost publicată cu succes!\n\n💰 Soldurile au fost transferate automat în luna următoare.`);
                        }).catch((error) => {
                          console.error('❌ Eroare la salvarea soldurilor:', error);
                          alert(`✅ Luna ${month} a fost publicată cu succes!\n\n⚠️ Atenție: A apărut o eroare la transferul automat al soldurilor. Verifică luna următoare.`);
                        });
                      } else {
                        console.log('ℹ️ Nu sunt solduri de transferat (toate plătite integral)');
                        alert(`✅ Luna ${month} a fost publicată cu succes!`);
                      }
                    } catch (error) {
                      console.error('❌ Eroare la transferul soldurilor:', error);
                      alert(`✅ Luna ${month} a fost publicată cu succes!\n\n⚠️ Atenție: A apărut o eroare la transferul automat al soldurilor. Verifică luna următoare.`);
                    }
                  } else {
                    console.log('ℹ️ Nu există date de întreținere pentru transfer');
                    alert(`✅ Luna ${month} a fost publicată cu succes!`);
                  }
                  
                  // TODO: Generare automată PDF (va trebui să mutăm funcția exportPDFAvizier într-un loc accesibil)
                }
                return result;
              }}
              unpublishMonth={unpublishMonth}
              getAvailableMonths={getAvailableMonths}
              expenses={expenses}
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              getAvailableExpenseTypes={getAvailableExpenseTypes}
              getExpenseConfig={getFirestoreExpenseConfig}
              handleAddExpense={() => handleAddExpense(addInvoice)}
              handleDeleteMonthlyExpense={handleDeleteMonthlyExpense}
              updateExpenseConsumption={updateExpenseConsumption}
              updateExpenseIndividualAmount={updateExpenseIndividualAmount}
              maintenanceData={maintenanceData}
              togglePayment={togglePayment}
              activeMaintenanceTab={activeMaintenanceTab}
              setActiveMaintenanceTab={setActiveMaintenanceTab}
              forceRecalculate={forceRecalculate}
              showInitialBalances={showInitialBalances}
              setShowInitialBalances={setShowInitialBalances}
              showAdjustBalances={showAdjustBalances}
              setShowAdjustBalances={setShowAdjustBalances}
              showExpenseConfig={showExpenseConfig}
              setShowExpenseConfig={setShowExpenseConfig}
              hasInitialBalances={hasInitialBalances}
              adjustModalData={adjustModalData}
              setAdjustModalData={setAdjustModalData}
              getApartmentBalance={getApartmentBalance}
              setApartmentBalance={setApartmentBalance}
              saveInitialBalances={saveInitialBalances}
              saveBalanceAdjustments={saveBalanceAdjustments}
              setMonthlyTables={setMonthlyTables}
              selectedExpenseForConfig={selectedExpenseForConfig}
              setSelectedExpenseForConfig={setSelectedExpenseForConfig}
              newCustomExpense={newCustomExpense}
              setNewCustomExpense={setNewCustomExpense}
              handleAddCustomExpense={handleAddCustomExpense}
              getAssociationExpenseTypes={getAssociationExpenseTypes}
              updateExpenseConfig={updateExpenseConfig}
              getApartmentParticipation={getApartmentParticipation}
              setApartmentParticipation={setApartmentParticipation}
              getDisabledExpenseTypes={getDisabledExpenseTypes}
              toggleExpenseStatus={toggleExpenseStatus}
              deleteCustomExpense={deleteCustomExpense}
              handleNavigation={handleNavigation}
            />
          )}

          {/* Setup View */}
          {currentView === "setup" && (
            <SetupView
              association={association}
              blocks={blocks}
              stairs={stairs}
              apartments={apartments}
              getAssociationApartments={getAssociationApartments}
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
              getAssociationApartments={getAssociationApartments}
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
              getAssociationApartments={getAssociationApartments}
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
              getAssociationApartments={getAssociationApartments}
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
              getAssociationApartments={getAssociationApartments}
              handleNavigation={handleNavigation}
              getMonthType={getMonthType}
              // Props pentru facturi
              invoices={invoices}
              getInvoicesByMonth={getInvoicesByMonth}
              getInvoiceStats={getInvoiceStats}
              markInvoiceAsPaid={markInvoiceAsPaid}
              markInvoiceAsUnpaid={markInvoiceAsUnpaid}
            />
          )}

        </main>
      </div>
    </div>
  );
}