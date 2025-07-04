import React, { useState } from "react";
import { Building2, Calculator, Plus, CheckCircle, XCircle, ArrowLeft, Settings, AlertCircle, Home, ClipboardList, Menu, X } from "lucide-react";
import { useAssociationData } from "./useFirestore";
import { useAuth } from "./AuthContext";
import jsPDF from 'jspdf';


// ✅ UN SINGUR SET DE IMPORT-URI FIREBASE:
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// ✅ ADAUGĂ ACEASTĂ FUNCȚIE ÎNAINTE DE export default function BlocApp():
const deleteCollection = async (collectionName) => {
  try {
    console.log(`🗑️ Șterg colecția: ${collectionName}`);
    
    const querySnapshot = await getDocs(collection(db, collectionName));
    const deletePromises = [];
    
    querySnapshot.forEach((document) => {
      deletePromises.push(deleteDoc(doc(db, collectionName, document.id)));
    });
    
    await Promise.all(deletePromises);
    console.log(`✅ Colecția ${collectionName} ștearsă complet (${deletePromises.length} documente)`);
  } catch (error) {
    console.error(`❌ Eroare la ștergerea colecției ${collectionName}:`, error);
  }
};

export default function BlocApp() {
const { userProfile, user, currentUser } = useAuth(); // Obține și currentUser ca backup
  // Determină utilizatorul activ (user sau currentUser, oricare este disponibil)
  const activeUser = user || currentUser;
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
    addMonthlyExpense,
    updateMonthlyExpense
  } = useAssociationData();
// ✅ FUNCȚIE EXTINSĂ PENTRU ÎNCĂRCAREA TUTUROR CONFIGURĂRILOR
const loadInitialBalances = async () => {
  if (!association?.id) return;
  
  try {
    // 1. Încarcă soldurile inițiale
    const balancesQuery = query(
      collection(db, 'initialBalances'),
      where('associationId', '==', association.id)
    );
    const balancesSnapshot = await getDocs(balancesQuery);
    
    const loadedBalances = {};
    balancesSnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      loadedBalances[data.apartmentId] = {
        restante: data.restante || 0,
        penalitati: data.penalitati || 0
      };
    });
    
    // 2. Încarcă cheltuielile eliminate
    const disabledExpensesQuery = query(
      collection(db, 'disabledExpenses'),
      where('associationId', '==', association.id)
    );
    const disabledExpensesSnapshot = await getDocs(disabledExpensesQuery);
    
    const loadedDisabledExpenses = {};
    disabledExpensesSnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const key = `${data.associationId}-${data.month}`;
      loadedDisabledExpenses[key] = data.expenseNames || [];
    });
    
    // 3. Încarcă ajustările de solduri pentru toate lunile
    const adjustmentsQuery = query(
      collection(db, 'balanceAdjustments'),
      where('associationId', '==', association.id)
    );
    const adjustmentsSnapshot = await getDocs(adjustmentsQuery);
    
    const loadedAdjustments = {};
    adjustmentsSnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const monthKey = `${data.associationId}-${data.month}`;
      if (!loadedAdjustments[monthKey]) {
        loadedAdjustments[monthKey] = {};
      }
      loadedAdjustments[monthKey][data.apartmentId] = {
        restante: data.restante || 0,
        penalitati: data.penalitati || 0
      };
    });
    
    // Aplicăm toate datele încărcate
    setDisabledExpenses(loadedDisabledExpenses);
    setMonthlyBalances(prev => ({ ...prev, ...loadedAdjustments }));
    
    // Aplicăm soldurile inițiale la luna curentă dacă nu există ajustări
    const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    const monthKey = `${association.id}-${currentMonthStr}`;
    
    if (!loadedAdjustments[monthKey] && Object.keys(loadedBalances).length > 0) {
      setMonthlyBalances(prev => ({
        ...prev,
        [monthKey]: loadedBalances
      }));
    }
    
    if (Object.keys(loadedBalances).length > 0) {
      setHasInitialBalances(true);
    }
    
    console.log('✅ Configurații încărcate:', {
      solduri: Object.keys(loadedBalances).length,
      cheltuieliEliminate: Object.keys(loadedDisabledExpenses).length,
      ajustari: Object.keys(loadedAdjustments).length
    });
  } catch (error) {
    console.error('❌ Eroare la încărcarea configurărilor:', error);
  }
};

// ✅ ÎNCARCĂ SOLDURILE CÂND SE ÎNCARCĂ ASOCIAȚIA
React.useEffect(() => {
  if (association?.id) {
    loadInitialBalances();
  }
}, [association?.id]);

  console.log('🔍 DEBUG BlocApp:');
  console.log('- user:', user);
  console.log('- userProfile:', userProfile);
  console.log('- loading:', loading);
  console.log('- error:', error);
  console.log('- association:', association);
  console.log('- blocks count:', blocks?.length);
  console.log('- stairs count:', stairs?.length);
  console.log('- apartments count:', apartments?.length);
  

  const [currentView, setCurrentView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState("simple");
  const [showInitialBalances, setShowInitialBalances] = useState(false);
  const [showAdjustBalances, setShowAdjustBalances] = useState(false);
  const [adjustModalData, setAdjustModalData] = useState([]);
  const [hasInitialBalances, setHasInitialBalances] = useState(false);
  const [monthlyTables, setMonthlyTables] = useState({});
  const [monthlyBalances, setMonthlyBalances] = useState({});
  const [monthStatuses, setMonthStatuses] = useState({});
  const [availableMonths, setAvailableMonths] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }));
  const [expenseConfig, setExpenseConfig] = useState({});
  const [expenseParticipation, setExpenseParticipation] = useState({});
  const [selectedExpenseForConfig, setSelectedExpenseForConfig] = useState(null);
  const [disabledExpenses, setDisabledExpenses] = useState({});
  const [showExpenseConfig, setShowExpenseConfig] = useState(false);
  
  // State-uri noi pentru editarea apartamentelor
  const [editingApartment, setEditingApartment] = useState(null);
  const [editingApartmentData, setEditingApartmentData] = useState({});
  const [newAssociation, setNewAssociation] = useState({ name: "", address: "", bankAccount: "", administrator: "", president: "", censor: "" });
  const [newBlock, setNewBlock] = useState({ name: "" });
  const [newStair, setNewStair] = useState({ name: "", blockId: "" });
  const [newApartment, setNewApartment] = useState({ number: "", persons: "", stairId: "", owner: "", surface: "", apartmentType: "", heatingSource: "" });
  const [newExpense, setNewExpense] = useState({ name: "", amount: "", distributionType: "", isUnitBased: false, unitPrice: "", billAmount: "" });
  const [newCustomExpense, setNewCustomExpense] = useState({ name: "" });
  const [initialBalances, setInitialBalances] = useState({});



// ✅ FUNCȚIE PENTRU SALVAREA SOLDURILOR ÎN FIRESTORE
const saveInitialBalances = async () => {
  if (!association?.id) return;
  
  try {
    const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    const monthKey = `${association.id}-${currentMonthStr}`;
    const currentBalances = monthlyBalances[monthKey] || {};
    
    // Șterge soldurile existente pentru această asociație
    const existingBalancesQuery = query(
      collection(db, 'initialBalances'),
      where('associationId', '==', association.id)
    );
    const existingSnapshot = await getDocs(existingBalancesQuery);
    
    const deletePromises = existingSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'initialBalances', docSnapshot.id))
    );
    await Promise.all(deletePromises);
    
    // Salvează noile solduri
    const savePromises = Object.entries(currentBalances).map(([apartmentId, balance]) => {
      return addDoc(collection(db, 'initialBalances'), {
        associationId: association.id,
        apartmentId: apartmentId,
        restante: balance.restante || 0,
        penalitati: balance.penalitati || 0,
        savedAt: new Date().toISOString()
      });
    });
    
    await Promise.all(savePromises);
    
    setHasInitialBalances(true);
    setShowInitialBalances(false);
    console.log('✅ Solduri inițiale salvate în Firestore');
    alert('✅ Soldurile inițiale au fost salvate cu succes!');
  } catch (error) {
    console.error('❌ Eroare la salvarea soldurilor:', error);
    alert('❌ Eroare la salvarea soldurilor: ' + error.message);
  }
};

// ✅ FUNCȚIE NOUĂ PENTRU SALVAREA AJUSTĂRILOR DE SOLDURI
const saveBalanceAdjustments = async (month, adjustmentData) => {
  if (!association?.id) return;
  
  try {
    // Șterge ajustările existente pentru această lună
    const existingQuery = query(
      collection(db, 'balanceAdjustments'),
      where('associationId', '==', association.id),
      where('month', '==', month)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    const deletePromises = existingSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'balanceAdjustments', docSnapshot.id))
    );
    await Promise.all(deletePromises);
    
    // Salvează noile ajustări
    const savePromises = adjustmentData.map(apartmentData => {
      return addDoc(collection(db, 'balanceAdjustments'), {
        associationId: association.id,
        month: month,
        apartmentId: apartmentData.apartmentId,
        restante: apartmentData.restanteAjustate || 0,
        penalitati: apartmentData.penalitatiAjustate || 0,
        savedAt: new Date().toISOString()
      });
    });
    
    await Promise.all(savePromises);
    console.log(`✅ Ajustări solduri salvate pentru ${month}:`, adjustmentData.length, 'apartamente');
  } catch (error) {
    console.error('❌ Eroare la salvarea ajustărilor:', error);
    throw error;
  }
};

// Funcție pentru ștergerea tuturor datelor BlocApp
const deleteAllBlocAppData = async () => {
  if (!window.confirm('⚠️ ATENȚIE! Ești sigur că vrei să ștergi TOATE datele?\n\nAceasta va șterge:\n- Toate asociațiile\n- Toate blocurile\n- Toate scările\n- Toate apartamentele\n- Toate cheltuielile\n\nAceastă acțiune este IREVERSIBILĂ!')) {
    return;
  }
  
  // A doua confirmare pentru siguranță
  if (!window.confirm('🚨 ULTIMA CONFIRMARE!\n\nEști 100% sigur? Toate datele vor fi șterse definitiv!')) {
    return;
  }
  
  console.log('🚨 ȘTERGERE COMPLETĂ A DATELOR ÎNCEPUT...');
  
  try {
    // Șterge în ordine pentru a evita dependențele
    await deleteCollection('expenses');
    await deleteCollection('customExpenses');
    await deleteCollection('apartments');
    await deleteCollection('stairs');
    await deleteCollection('blocks');
    await deleteCollection('associations');
    await deleteCollection('test'); // Dacă există documente de test
    
    console.log('✅ TOATE DATELE AU FOST ȘTERSE!');
    alert('✅ Toate datele au fost șterse cu succes!\n\nPagina se va reîncărca...');
    
    // Reîncarcă pagina pentru a reseta starea
    window.location.reload();
  } catch (error) {
    console.error('❌ Eroare la ștergerea datelor:', error);
    alert('❌ Eroare la ștergerea datelor: ' + error.message);
  }
};

// Funcție pentru ștergerea doar a datelor asociației curente
const deleteCurrentAssociationData = async () => {
  if (!association) {
    alert('Nu există asociație de șters');
    return;
  }
  
  if (!window.confirm(`Ești sigur că vrei să ștergi datele asociației "${association.name}"?\n\nAceasta va șterge toate blocurile, scările, apartamentele și cheltuielile acestei asociații.`)) {
    return;
  }
  
  try {
    console.log('🗑️ Șterg datele asociației:', association.id, association.name);
    
    // Șterge cheltuielile asociației
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('associationId', '==', association.id)
    );
    const expensesSnapshot = await getDocs(expensesQuery);
    for (const expenseDoc of expensesSnapshot.docs) {
      await deleteDoc(doc(db, 'expenses', expenseDoc.id));
    }
    console.log(`✅ Șterse ${expensesSnapshot.docs.length} cheltuieli`);
    
    // Șterge cheltuielile custom ale asociației
    const customExpensesQuery = query(
      collection(db, 'customExpenses'),
      where('associationId', '==', association.id)
    );
    const customExpensesSnapshot = await getDocs(customExpensesQuery);
    for (const customExpenseDoc of customExpensesSnapshot.docs) {
      await deleteDoc(doc(db, 'customExpenses', customExpenseDoc.id));
    }
    console.log(`✅ Șterse ${customExpensesSnapshot.docs.length} cheltuieli custom`);
    
    // Șterge apartamentele (prin scări și blocuri)
    const blocksQuery = query(
      collection(db, 'blocks'),
      where('associationId', '==', association.id)
    );
    const blocksSnapshot = await getDocs(blocksQuery);
    const blockIds = blocksSnapshot.docs.map(doc => doc.id);
    
    if (blockIds.length > 0) {
      const stairsQuery = query(
        collection(db, 'stairs'),
        where('blockId', 'in', blockIds)
      );
      const stairsSnapshot = await getDocs(stairsQuery);
      const stairIds = stairsSnapshot.docs.map(doc => doc.id);
      
      if (stairIds.length > 0) {
        const apartmentsQuery = query(
          collection(db, 'apartments'),
          where('stairId', 'in', stairIds)
        );
        const apartmentsSnapshot = await getDocs(apartmentsQuery);
        for (const apartmentDoc of apartmentsSnapshot.docs) {
          await deleteDoc(doc(db, 'apartments', apartmentDoc.id));
        }
        console.log(`✅ Șterse ${apartmentsSnapshot.docs.length} apartamente`);
      }
      
      // Șterge scările
      for (const stairDoc of stairsSnapshot.docs) {
        await deleteDoc(doc(db, 'stairs', stairDoc.id));
      }
      console.log(`✅ Șterse ${stairsSnapshot.docs.length} scări`);
    }
    
    // Șterge blocurile
    for (const blockDoc of blocksSnapshot.docs) {
      await deleteDoc(doc(db, 'blocks', blockDoc.id));
    }
    console.log(`✅ Șterse ${blocksSnapshot.docs.length} blocuri`);
    
    // Șterge asociația
    await deleteDoc(doc(db, 'associations', association.id));
    console.log('✅ Asociația ștearsă');
    
    alert(`✅ Datele asociației "${association.name}" au fost șterse cu succes!\n\nPagina se va reîncărca...`);
    
    // Reîncarcă pagina
    window.location.reload();
  } catch (error) {
    console.error('❌ Eroare la ștergerea datelor asociației:', error);
    alert('❌ Eroare la ștergerea datelor: ' + error.message);
  }
};



// ✅ COMPONENTA SIDEBAR REPARATĂ
const Sidebar = () => (
  <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  } ${sidebarExpanded ? 'w-64' : 'w-16'}`}>
    
    {/* Header Sidebar cu buton expand/collapse */}
    <div className="flex items-center justify-between h-16 px-4 bg-blue-600 text-white">
      {sidebarExpanded ? (
        <div className="flex items-center">
          <Building2 className="w-8 h-8 mr-2 text-white" />
          <div>
            <h1 className="text-lg font-bold text-white">BlocApp</h1>
            <p className="text-xs text-blue-100">v2.0</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <Building2 className="w-8 h-8 text-white" />
        </div>
      )}
      
      {/* Buton expand/collapse pentru desktop */}
      <button
        onClick={() => setSidebarExpanded(!sidebarExpanded)}
        className="hidden lg:block p-1 rounded-md hover:bg-blue-700 transition-colors ml-2"
        title={sidebarExpanded ? "Micșorează meniul" : "Mărește meniul"}
      >
        {sidebarExpanded ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        )}
      </button>
      
      {/* Buton închidere pentru mobile */}
      <button
        onClick={() => setSidebarOpen(false)}
        className="lg:hidden p-1 rounded-md hover:bg-blue-700"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Meniu Navigare */}
    <nav className="flex-1 mt-6">
      <div className="px-2 space-y-1">
        {/* Tabel întreținere (fostul Dashboard) */}
        <button
          onClick={() => handleNavigation("dashboard")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "dashboard"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Tabel întreținere</div>
              <div className="text-xs text-gray-500">Prezentare generală</div>
            </div>
          )}
          
          {/* Tooltip pentru modul collapsed */}
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Tabel întreținere
            </div>
          )}
        </button>

        {/* Calcul întreținere */}
        <button
          onClick={() => handleNavigation("maintenance")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "maintenance"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Calculator className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Calcul întreținere</div>
              <div className="text-xs text-gray-500">Cheltuieli și calcule</div>
            </div>
          )}
          
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Calcul întreținere
            </div>
          )}
        </button>

        {/* Configurare */}
        <button
          onClick={() => handleNavigation("setup")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "setup"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Configurare</div>
              <div className="text-xs text-gray-500">Blocuri, scări, apartamente</div>
            </div>
          )}
          
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Configurare
            </div>
          )}
        </button>
      </div>

{/* Separator și Informații asociație - doar când este expandat */}
{sidebarExpanded && (
  <>
    <div className="mx-4 my-6 border-t border-gray-200"></div>

    {/* Informații asociație */}
    {association && (
      <div className="px-4 space-y-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-800 truncate">
            {association.name}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {getAssociationApartments().length} apartamente
          </div>
          <div className="text-xs text-gray-600">
            {getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0)} persoane
          </div>
        </div>

        {/* Butoane de ștergere */}
        <div className="space-y-2">
          <button
            onClick={deleteCurrentAssociationData}
            className="w-full bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium flex items-center justify-center"
            title={`Șterge doar "${association.name}"`}
          >
            🏢 Șterge "{association.name.length > 15 ? association.name.substring(0, 15) + '...' : association.name}"
          </button>
          
          <button
            onClick={deleteAllBlocAppData}
            className="w-full bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center justify-center"
            title="Șterge toate datele aplicației"
          >
            🗑️ Șterge TOATE datele
          </button>
          
          <div className="text-xs text-gray-500 text-center mt-2">
            ⚠️ Development tools
          </div>
        </div>
      </div>
    )}
  </>
)}



    </nav>

    {/* Footer cu utilizatorul - absolute bottom */}
    <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 bg-white">
      {sidebarExpanded ? (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {userProfile?.displayName?.charAt(0)?.toUpperCase() || activeUser?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {userProfile?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              Administrator
            </div>
          </div>
<button 
  onClick={async () => {
    try {
      // Importă signOut din firebase/auth dacă nu este deja importat
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('./firebase');
      
      await signOut(auth);
      console.log('✅ Utilizator deconectat cu succes');
      
      // Opțional: reîncarcă pagina pentru a reseta starea
      window.location.reload();
    } catch (error) {
      console.error('❌ Eroare la deconectare:', error);
      alert('Eroare la deconectare: ' + error.message);
    }
  }}
  className="text-gray-400 hover:text-red-600 transition-colors" 
  title="Deconectare"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
  </svg>
</button>
        </div>
) : (
  <div className="flex justify-center group relative">
    <button
      onClick={async () => {
        try {
          const { signOut } = await import('firebase/auth');
          const { auth } = await import('./firebase');
          
          await signOut(auth);
          console.log('✅ Utilizator deconectat cu succes');
          window.location.reload();
        } catch (error) {
          console.error('❌ Eroare la deconectare:', error);
          alert('Eroare la deconectare: ' + error.message);
        }
      }}
      className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm hover:bg-red-500 transition-colors"
      title="Deconectare"
    >
      {userProfile?.displayName?.charAt(0)?.toUpperCase() || activeUser?.email?.charAt(0)?.toUpperCase() || 'U'}
    </button>
    
    {/* Tooltip pentru user */}
    <div className="absolute left-12 bottom-0 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
      Click pentru deconectare - {userProfile?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator'}
    </div>
  </div>
)}
    </div>
  </div>
);





  // ✅ OVERLAY PENTRU MOBILE
  const Overlay = () => (
    sidebarOpen && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    )
  );

  
  
  // Loading state pentru toată aplicația
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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
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
  
    // ✅ ADAUGĂ ACEASTĂ FUNCȚIE PENTRU NAVIGARE
  const handleNavigation = (view) => {
    setCurrentView(view);
    setSidebarOpen(false); // Închide sidebar-ul pe mobile după selectare
  };
  
  // Helper pentru a genera lista de luni disponibile
  const getAvailableMonths = () => {
    return availableMonths;
  };

  // Funcții pentru gestionarea statusurilor lunilor
  const getMonthStatus = (month) => {
    return monthStatuses[month] || "in_lucru";
  };

  const setMonthStatus = (month, status) => {
    setMonthStatuses(prev => ({
      ...prev,
      [month]: status
    }));
  };

  // Inițializarea lunilor la crearea asociației
  const initializeMonths = () => {
    const currentDate = new Date();
    const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    const months = [
      { value: currentMonthStr, label: currentMonthStr, type: "current" },
      { value: nextMonthStr, label: nextMonthStr, type: "next" }
    ];
    
    setAvailableMonths(months);
    setMonthStatuses({
      [currentMonthStr]: "in_lucru",
      [nextMonthStr]: "in_lucru"
    });
  };

  // Funcția pentru publicarea unei luni
  const publishMonth = (month) => {
    setMonthStatus(month, "afisata");
    
    // Dacă publicăm a doua lună, generăm a treia
    const currentDate = new Date();
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    if (month === nextMonthStr) {
      // Generăm luna următoare
      const thirdMonthDate = new Date();
      thirdMonthDate.setMonth(thirdMonthDate.getMonth() + 2);
      const thirdMonthStr = thirdMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
      
      setAvailableMonths(prev => {
        const updated = prev.map(m => {
          if (m.type === "current") return { ...m, type: "historic" };
          if (m.type === "next") return { ...m, type: "current" };
          return m;
        });
        updated.push({ value: thirdMonthStr, label: thirdMonthStr, type: "next" });
        return updated;
      });
      
      setMonthStatus(thirdMonthStr, "in_lucru");
    }
  };

  // Helper pentru a determina tipul lunii
  const getMonthType = (month) => {
    const currentDate = new Date();
    const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    if (month === currentMonthStr) return "current";
    if (month === nextMonthStr) return "next";
    
    // Pentru lunile viitoare
    const monthObj = availableMonths.find(m => m.value === month);
    return monthObj?.type || "historic";
  };

  // Helper pentru a determina dacă butonul "Ajustări Solduri" trebuie să apară
  const shouldShowAdjustButton = (month) => {
    const monthType = getMonthType(month);
    const monthStatus = getMonthStatus(month);
    const currentDate = new Date();
    const currentMonthStr = currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    const currentMonthStatus = getMonthStatus(currentMonthStr);
    
    // Pentru luna curentă în lucru
    if (monthType === "current" && monthStatus === "in_lucru") {
      return true;
    }
    
    // Pentru luna următoare DOAR după ce luna curentă a fost publicată
    if (monthType === "next" && currentMonthStatus === "afisata") {
      return true;
    }
    
    // Pentru luna următoare dacă este selectată și luna curentă a fost publicată
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    if (month === nextMonthStr && currentMonthStatus === "afisata") {
      return true;
    }
    
    return false;
  };

  // Helper pentru a determina dacă butonul "Publică Luna" trebuie să apară
  const shouldShowPublishButton = (month) => {
    const monthStatus = getMonthStatus(month);
    return shouldShowAdjustButton(month) && monthStatus === "in_lucru";
  };

  // Helper pentru a determina dacă luna este read-only
  const isMonthReadOnly = (month) => {
    return getMonthStatus(month) === "afisata";
  };

  const defaultExpenseTypes = [
    { name: "Apă caldă", defaultDistribution: "consumption" },
    { name: "Apă rece", defaultDistribution: "consumption" },
    { name: "Canal", defaultDistribution: "consumption" },
    { name: "Întreținere lift", defaultDistribution: "apartment" },
    { name: "Energie electrică", defaultDistribution: "person" },
    { name: "Service interfon", defaultDistribution: "apartment" },
    { name: "Cheltuieli cu asociația", defaultDistribution: "apartment" },
    { name: "Salarii NETE", defaultDistribution: "apartment" },
    { name: "Impozit ANAF", defaultDistribution: "apartment" },
    { name: "Spații în folosință", defaultDistribution: "apartment" },
    { name: "Căldură", defaultDistribution: "individual" }
  ];

  const getAssociationExpenseTypes = () => {
    const customExpensesList = customExpenses.filter(exp => exp.associationId === association?.id);
    const disabledKey = `${association?.id}-${currentMonth}`;
    const monthDisabledExpenses = disabledExpenses[disabledKey] || [];
    
    // Filtrează cheltuielile standard care nu sunt dezactivate pentru luna curentă
    const activeDefaultExpenses = defaultExpenseTypes.filter(exp => 
      !monthDisabledExpenses.includes(exp.name)
    );
    
    // Filtrează cheltuielile custom care nu sunt dezactivate pentru luna curentă
    const activeCustomExpenses = customExpensesList.filter(exp => 
      !monthDisabledExpenses.includes(exp.name)
    );
    
    return [...activeDefaultExpenses, ...activeCustomExpenses];
  };

  const getDisabledExpenseTypes = () => {
    const disabledKey = `${association?.id}-${currentMonth}`;
    const monthDisabledExpenses = disabledExpenses[disabledKey] || [];
    
    // Cheltuieli standard dezactivate
    const disabledDefaultExpenses = defaultExpenseTypes.filter(exp => 
      monthDisabledExpenses.includes(exp.name)
    );
    
    // Cheltuieli custom dezactivate
    const customExpensesList = customExpenses.filter(exp => exp.associationId === association?.id);
    const disabledCustomExpenses = customExpensesList.filter(exp => 
      monthDisabledExpenses.includes(exp.name)
    );
    
    return [...disabledDefaultExpenses, ...disabledCustomExpenses];
  };

// ✅ FUNCȚIE MODIFICATĂ PENTRU SALVAREA CHELTUIELILOR ELIMINATE
const toggleExpenseStatus = async (expenseName, disable = true) => {
  const disabledKey = `${association?.id}-${currentMonth}`;
  
  try {
    // Actualizează starea locală
    setDisabledExpenses(prev => {
      const currentDisabled = prev[disabledKey] || [];
      
      let newDisabled;
      if (disable) {
        newDisabled = [...currentDisabled, expenseName];
      } else {
        newDisabled = currentDisabled.filter(name => name !== expenseName);
      }
      
      return {
        ...prev,
        [disabledKey]: newDisabled
      };
    });
    
    // Salvează în Firestore
    await saveDisabledExpenses(disabledKey, expenseName, disable);
    
  } catch (error) {
    console.error('❌ Eroare la actualizarea statusului cheltuielii:', error);
  }
};

// ✅ FUNCȚIE NOUĂ PENTRU SALVAREA CHELTUIELILOR ELIMINATE
const saveDisabledExpenses = async (monthKey, expenseName, disable) => {
  try {
    const [associationId, month] = monthKey.split('-');
    
    // Găsește documentul existent pentru această lună
    const existingQuery = query(
      collection(db, 'disabledExpenses'),
      where('associationId', '==', associationId),
      where('month', '==', month)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (existingSnapshot.empty) {
      // Creează document nou
      if (disable) {
        await addDoc(collection(db, 'disabledExpenses'), {
          associationId: associationId,
          month: month,
          expenseNames: [expenseName],
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      // Actualizează documentul existent
      const existingDoc = existingSnapshot.docs[0];
      const currentExpenseNames = existingDoc.data().expenseNames || [];
      
      let updatedExpenseNames;
      if (disable) {
        updatedExpenseNames = [...currentExpenseNames, expenseName];
      } else {
        updatedExpenseNames = currentExpenseNames.filter(name => name !== expenseName);
      }
      
      if (updatedExpenseNames.length === 0) {
        // Șterge documentul dacă nu mai există cheltuieli eliminate
        await deleteDoc(doc(db, 'disabledExpenses', existingDoc.id));
      } else {
        // Actualizează lista
        await updateDoc(doc(db, 'disabledExpenses', existingDoc.id), {
          expenseNames: updatedExpenseNames,
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    console.log(`✅ Cheltuiala "${expenseName}" ${disable ? 'eliminată' : 'reactivată'} pentru ${month}`);
  } catch (error) {
    console.error('❌ Eroare la salvarea cheltuielilor eliminate:', error);
  }
};

  const getAvailableExpenseTypes = () => {
    const associationExpenses = expenses.filter(exp => exp.associationId === association?.id && exp.month === currentMonth);
    const usedExpenseNames = associationExpenses.map(exp => exp.name);
    
    return getAssociationExpenseTypes().filter(expenseType => 
      !usedExpenseNames.includes(expenseType.name)
    );
  };

  // Funcții actualizate pentru a folosi hook-urile Firestore
const handleAddAssociation = async () => {
  console.log('🏢 handleAddAssociation called');
  console.log('📊 newAssociation:', newAssociation);
  console.log('📊 activeUser:', activeUser);
  
  if (!newAssociation.name || !newAssociation.address) {
    alert('Te rog completează numele și adresa asociației!');
    return;
  }
  
  if (!activeUser?.uid) {
    alert('Nu ești autentificat. Reîncarcă pagina și încearcă din nou.');
    return;
  }
  
  try {
    console.log('🚀 Creez asociația...');
    await createAssociation({
      name: newAssociation.name,
      address: newAssociation.address,
      bankAccount: newAssociation.bankAccount || "",
      administrator: newAssociation.administrator || "",
      president: newAssociation.president || "",
      censor: newAssociation.censor || ""
    });
    
    setNewAssociation({ 
      name: "", 
      address: "", 
      bankAccount: "", 
      administrator: "", 
      president: "", 
      censor: "" 
    });
    
    // Inițializează lunile pentru noua asociație
    initializeMonths();
    
    console.log('✅ Asociație creată cu succes!');
  } catch (error) {
    console.error('❌ Eroare la crearea asociației:', error);
    alert('Eroare la crearea asociației: ' + error.message);
  }
};

  const handleAddBlock = async () => {
    if (!newBlock.name || !association) return;
    
    try {
      await addBlock({
        name: newBlock.name
      });
      setNewBlock({ name: "" });
    } catch (error) {
      console.error('Error adding block:', error);
      alert('Eroare la adăugarea blocului. Încearcă din nou.');
    }
  };

const handleAddStair = async () => {
  console.log('🔼 handleAddStair - newStair:', newStair);
  console.log('🔼 handleAddStair - blockId type:', typeof newStair.blockId, newStair.blockId);
  
  if (!newStair.name || !newStair.blockId) {
    console.log('❌ Validare eșuată - lipsește numele sau blockId');
    alert('Te rog completează numele scării și selectează blocul!');
    return;
  }
  
  try {
    await addStair({
      name: newStair.name,
      blockId: newStair.blockId // NU mai convertesc la parseInt aici
    });
    setNewStair({ name: "", blockId: "" });
  } catch (error) {
    console.error('Error adding stair:', error);
    alert('Eroare la adăugarea scării: ' + error.message);
  }
};

const handleAddApartment = async () => {
  const availableStairs = getAvailableStairs(); // Adaugă această linie
  
  console.log('👥 handleAddApartment - newApartment:', newApartment);
  console.log('👥 handleAddApartment - stairId type:', typeof newApartment.stairId, newApartment.stairId);
  console.log('👥 handleAddApartment - availableStairs:', availableStairs);
  
  if (!newApartment.number || !newApartment.persons || !newApartment.stairId || !newApartment.owner) {
    console.log('❌ Validare eșuată - lipsesc datele obligatorii');
    alert('Te rog completează toate câmpurile obligatorii (nr apartament, proprietar, persoane, scara)!');
    return;
  }
  
  try {
    await addApartment({
      number: parseInt(newApartment.number),
      persons: parseInt(newApartment.persons),
      stairId: newApartment.stairId,
      owner: newApartment.owner,
      surface: newApartment.surface ? parseFloat(newApartment.surface) : null,
      apartmentType: newApartment.apartmentType || null,
      heatingSource: newApartment.heatingSource || null
    });
    
    setNewApartment({ 
      number: "", 
      persons: "", 
      stairId: newApartment.stairId,
      owner: "", 
      surface: "", 
      apartmentType: "", 
      heatingSource: "" 
    });
  } catch (error) {
    console.error('Error adding apartment:', error);
    alert('Eroare la adăugarea apartamentului: ' + error.message);
  }
};

  // Funcții noi pentru editarea apartamentelor
  const startEditingApartment = (apartment) => {
    setEditingApartment(apartment.id);
    setEditingApartmentData({
      owner: apartment.owner,
      persons: apartment.persons.toString(),
      apartmentType: apartment.apartmentType || "",
      surface: apartment.surface?.toString() || "",
      heatingSource: apartment.heatingSource || ""
    });
  };
const getAvailableStairs = () => {
  if (!association) return [];
  const associationBlocks = blocks.filter(block => block.associationId === association.id);
  return stairs.filter(stair => 
    associationBlocks.some(block => block.id === stair.blockId)
  );
};
  const cancelApartmentEdit = () => {
    setEditingApartment(null);
    setEditingApartmentData({});
  };

  const saveApartmentEdit = async (apartmentId) => {
    try {
      await updateApartment(apartmentId, {
        owner: editingApartmentData.owner,
        persons: parseInt(editingApartmentData.persons),
        apartmentType: editingApartmentData.apartmentType || null,
        surface: editingApartmentData.surface ? parseFloat(editingApartmentData.surface) : null,
        heatingSource: editingApartmentData.heatingSource || null
      });
      
      setEditingApartment(null);
      setEditingApartmentData({});
    } catch (error) {
      console.error('Error updating apartment:', error);
      alert('Eroare la actualizarea apartamentului. Încearcă din nou.');
    }
  };

  const handleDeleteApartment = async (apartmentId) => {
    if (window.confirm("Ești sigur că vrei să ștergi acest apartament?")) {
      try {
        await deleteApartment(apartmentId);
      } catch (error) {
        console.error('Error deleting apartment:', error);
        alert('Eroare la ștergerea apartamentului. Încearcă din nou.');
      }
    }
  };

  const handleAddCustomExpense = async () => {
    if (!newCustomExpense.name || !association) return;
    
    try {
      await addCustomExpense({
        name: newCustomExpense.name,
        defaultDistribution: "apartment"
      });
      setNewCustomExpense({ name: "" });
    } catch (error) {
      console.error('Error adding custom expense:', error);
      alert('Eroare la adăugarea cheltuielii personalizate. Încearcă din nou.');
    }
  };

  const getExpenseConfig = (expenseType) => {
    const key = `${association?.id}-${expenseType}`;
    const config = expenseConfig[key];
    if (config) return config;
    
    const defaultExpense = defaultExpenseTypes.find(exp => exp.name === expenseType);
    const customExpense = customExpenses.find(exp => exp.name === expenseType);
    return {
      distributionType: defaultExpense?.defaultDistribution || customExpense?.defaultDistribution || "apartment"
    };
  };

  const updateExpenseConfig = (expenseType, config) => {
    const key = `${association?.id}-${expenseType}`;
    setExpenseConfig(prev => ({
      ...prev,
      [key]: config
    }));
  };

  const setApartmentParticipation = (apartmentId, expenseType, participationType, value = null) => {
    const key = `${apartmentId}-${expenseType}`;
    setExpenseParticipation(prev => ({
      ...prev,
      [key]: { type: participationType, value: value }
    }));
  };

  const getApartmentParticipation = (apartmentId, expenseType) => {
    const key = `${apartmentId}-${expenseType}`;
    return expenseParticipation[key] || { type: "integral", value: null };
  };

  const getAssociationApartments = () => {
    if (!association) return [];
    
    const associationBlocks = blocks.filter(block => block.associationId === association.id);
    const associationStairs = stairs.filter(stair => 
      associationBlocks.some(block => block.id === stair.blockId)
    );
    return apartments.filter(apt => 
      associationStairs.some(stair => stair.id === apt.stairId)
    );
  };

  const getCurrentMonthTable = () => {
    const key = `${association?.id}-${currentMonth}`;
    return monthlyTables[key] || null;
  };

  const getApartmentBalance = (apartmentId) => {
    const monthKey = `${association?.id}-${currentMonth}`;
    const monthBalances = monthlyBalances[monthKey] || {};
    return monthBalances[apartmentId] || { restante: 0, penalitati: 0 };
  };

  const setApartmentBalance = (apartmentId, balance) => {
    const monthKey = `${association?.id}-${currentMonth}`;
    setMonthlyBalances(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        [apartmentId]: balance
      }
    }));
  };

  const handleAddExpense = async () => {
    if (!newExpense.name || !association) return;
    
    const expenseSettings = getExpenseConfig(newExpense.name);
    const isConsumptionBased = expenseSettings.distributionType === "consumption";
    const isIndividualBased = expenseSettings.distributionType === "individual";
    
    if (isConsumptionBased && (!newExpense.unitPrice || !newExpense.billAmount)) {
      alert("Pentru cheltuielile pe consum trebuie să introduci atât prețul pe unitate cât și totalul facturii!");
      return;
    }
    
    if (!isConsumptionBased && !isIndividualBased && !newExpense.amount) {
      alert("Introduceți suma cheltuielii!");
      return;
    }
    
    if (isIndividualBased && !newExpense.amount) {
      alert("Introduceți suma totală pentru cheltuiala individuală!");
      return;
    }
    
    try {
      await addMonthlyExpense({
        name: newExpense.name,
        amount: isConsumptionBased ? 0 : parseFloat(newExpense.amount || 0),
        distributionType: expenseSettings.distributionType,
        isUnitBased: isConsumptionBased,
        unitPrice: isConsumptionBased ? parseFloat(newExpense.unitPrice) : 0,
        billAmount: isConsumptionBased ? parseFloat(newExpense.billAmount) : 0,
        consumption: {},
        individualAmounts: {},
        month: currentMonth
      });
      
      setNewExpense({ name: "", amount: "", distributionType: "", isUnitBased: false, unitPrice: "", billAmount: "" });
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Eroare la adăugarea cheltuielii. Încearcă din nou.');
    }
  };

  const updateExpenseConsumption = async (expenseId, apartmentId, consumption) => {
    try {
      const expense = expenses.find(exp => exp.id === expenseId);
      if (expense) {
        await updateMonthlyExpense(expenseId, {
          consumption: { ...expense.consumption, [apartmentId]: consumption }
        });
      }
    } catch (error) {
      console.error('Error updating consumption:', error);
    }
  };

  const updateExpenseIndividualAmount = async (expenseId, apartmentId, amount) => {
    try {
      const expense = expenses.find(exp => exp.id === expenseId);
      if (expense) {
        await updateMonthlyExpense(expenseId, {
          individualAmounts: { ...expense.individualAmounts, [apartmentId]: amount }
        });
      }
    } catch (error) {
      console.error('Error updating individual amount:', error);
    }
  };



  const togglePayment = (apartmentId) => {
    const key = `${association?.id}-${currentMonth}`;
    const currentTable = getCurrentMonthTable() || calculateMaintenanceWithDetails();
    
    if (!currentTable.length) return;

    const updatedTable = currentTable.map(row => 
      row.apartmentId === apartmentId ? { ...row, paid: !row.paid } : row
    );

    setMonthlyTables(prev => ({
      ...prev,
      [key]: updatedTable
    }));
  };

  const closeCurrentMonth = () => {
    const currentTable = getCurrentMonthTable() || calculateMaintenanceWithDetails();
    
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonth = nextMonthDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    
    if (currentTable && currentTable.length > 0) {
      const nextMonthKey = `${association?.id}-${nextMonth}`;
      const nextMonthBalances = {};
      
      currentTable.forEach(row => {
        if (!row.paid) {
          nextMonthBalances[row.apartmentId] = {
            restante: Math.round(row.totalDatorat * 100) / 100,
            penalitati: Math.round((row.penalitati + (row.totalMaintenance * 0.01)) * 100) / 100
          };
        } else {
          nextMonthBalances[row.apartmentId] = { restante: 0, penalitati: 0 };
        }
      });
      
      setMonthlyBalances(prev => ({
        ...prev,
        [nextMonthKey]: nextMonthBalances
      }));
    }
    
    setCurrentMonth(nextMonth);
  };

  const calculateMaintenance = () => {
    const currentTable = getCurrentMonthTable();
    if (currentTable && currentTable.length > 0) {
      return currentTable;
    }
    return calculateMaintenanceWithDetails();
  };

  const calculateMaintenanceWithDetails = () => {
    const associationApartments = getAssociationApartments();
    const associationExpenses = expenses.filter(exp => 
      exp.associationId === association?.id && exp.month === currentMonth
    );
    
    if (!associationApartments.length) {
      return [];
    }

    const totalPersons = associationApartments.reduce((sum, apt) => sum + apt.persons, 0);
    const totalApartments = associationApartments.length;

    const tableData = associationApartments.map(apartment => {
      let currentMaintenance = 0;
      const expenseDetails = {};

      associationExpenses.forEach(expense => {
        let apartmentCost = 0;
        const participation = getApartmentParticipation(apartment.id, expense.name);
        const expenseSettings = getExpenseConfig(expense.name);
        
        if (participation.type === "excluded") {
          expenseDetails[expense.name] = 0;
          return;
        }
        
        let baseCost = 0;
        
        switch (expenseSettings.distributionType) {
          case "apartment":
            baseCost = expense.amount / totalApartments;
            break;
            
          case "individual":
            baseCost = parseFloat(expense.individualAmounts?.[apartment.id]) || 0;
            break;
            
          case "person":
            const costPerPerson = expense.amount / totalPersons;
            baseCost = costPerPerson * apartment.persons;
            break;
            
          case "consumption":
            const consumption = parseFloat(expense.consumption[apartment.id]) || 0;
            baseCost = consumption * expense.unitPrice;
            break;
            
          default:
            baseCost = expense.amount / totalApartments;
        }
        
        switch (participation.type) {
          case "integral":
            apartmentCost = baseCost;
            break;
          case "percentage":
            apartmentCost = baseCost * (participation.value / 100);
            break;
          case "fixed":
            apartmentCost = participation.value || 0;
            break;
          case "excluded":
            apartmentCost = 0;
            break;
          default:
            apartmentCost = baseCost;
        }

        currentMaintenance += apartmentCost;
        expenseDetails[expense.name] = Math.round(apartmentCost * 100) / 100;
      });

      const balance = getApartmentBalance(apartment.id);
      const stair = stairs.find(s => s.id === apartment.stairId);
      const block = blocks.find(b => b.id === stair?.blockId);

      return {
        apartmentId: apartment.id,
        apartment: apartment.number,
        owner: apartment.owner,
        persons: apartment.persons,
        blockName: block?.name || "",
        stairName: stair?.name || "",
        currentMaintenance: Math.round(currentMaintenance * 100) / 100,
        restante: Math.round(balance.restante * 100) / 100,
        totalMaintenance: Math.round((currentMaintenance + balance.restante) * 100) / 100,
        penalitati: Math.round(balance.penalitati * 100) / 100,
        totalDatorat: Math.round((currentMaintenance + balance.restante + balance.penalitati) * 100) / 100,
        paid: false,
        expenseDetails: expenseDetails
      };
    }).sort((a, b) => a.apartment - b.apartment);

    return tableData;
  };

  const maintenanceData = calculateMaintenance();

// ✅ ÎNLOCUIEȘTE SECȚIUNEA DASHBOARD (if (currentView === "dashboard")) din BlocApp.js cu aceasta:


// ✅ LAYOUT PRINCIPAL CU SIDEBAR
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Overlay pentru mobile */}
      <Overlay />
      
      {/* Conținut principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
{/* Buton mobile menu - doar pe mobile când sidebar este închis */}
{!sidebarOpen && (
  <button
    onClick={() => setSidebarOpen(true)}
    className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
  >
    <Menu className="w-6 h-6" />
  </button>
)}
        
        {/* Zona de conținut */}
        <main className="flex-1 overflow-y-auto">
          {/* TOATE VIEW-URILE TALE EXISTENTE */}
          
          {/* Dashboard View */}
          {currentView === "dashboard" && (
            <div className={`min-h-screen p-4 ${
              currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                ? "bg-gradient-to-br from-blue-50 to-indigo-100"
                : "bg-gradient-to-br from-green-50 to-emerald-100"
            }`}>
              <div className="max-w-6xl mx-auto">
<header className="mb-8">
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
    <div className="flex items-center justify-between">
      {/* Stânga: Numele asociației */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {association?.name || "Nume Asociație"}
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          {association?.address || "Adresa asociației"}
        </p>
      </div>

      {/* Dreapta: Status luna și selector */}
      <div className="flex items-center space-x-4">
        {/* Selector luna */}
        <select
          value={currentMonth}
          onChange={(e) => setCurrentMonth(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          {getAvailableMonths().map(month => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>

        {/* Status-uri luna */}
        <div className="flex items-center space-x-2">
          {currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }) ? (
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              LUNA CURENTĂ
            </span>
          ) : (
            <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
              LUNA URMĂTOARE
            </span>
          )}
          
          {isMonthReadOnly(currentMonth) ? (
            <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
              📋 PUBLICATĂ
            </span>
          ) : (
            <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
              🔧 ÎN LUCRU
            </span>
          )}
        </div>
      </div>
    </div>

    {/* Informații suplimentare asociație */}
    {association && getAssociationApartments().length > 0 && (
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {getAssociationApartments().length} apartamente • 
            {getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0)} persoane
          </span>
          
          {/* Buton rapid către întreținere */}
          <button 
            onClick={() => handleNavigation("maintenance")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            📊 Calcul Întreținere
          </button>
        </div>
      </div>
    )}
  </div>
</header>

                {/* Condiție principală: Dacă nu există asociație, afișează creatorul */}
                {!association && (
                  <div className="bg-blue-50 border border-blue-200 p-8 rounded-xl mb-8">
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-10 h-10 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-blue-800 mb-2">🎉 Bun venit în BlocApp!</h3>
                      <p className="text-blue-700 max-w-md mx-auto">
                        Pentru a începe, trebuie să creezi prima ta asociație de proprietari. 
                        Această informație se salvează doar o dată.
                      </p>
                    </div>
                    
                    <div className="max-w-2xl mx-auto">
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <input
                            value={newAssociation.name}
                            onChange={(e) => setNewAssociation({...newAssociation, name: e.target.value})}
                            placeholder="Numele asociației (ex: Asociația Primăverii 12) *"
                            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                          <input
                            value={newAssociation.address}
                            onChange={(e) => setNewAssociation({...newAssociation, address: e.target.value})}
                            placeholder="Adresa completă (ex: Strada Primăverii 12, Sector 1) *"
                            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <input
                            value={newAssociation.bankAccount}
                            onChange={(e) => setNewAssociation({...newAssociation, bankAccount: e.target.value})}
                            placeholder="Cont bancar (opțional)"
                            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                          <input
                            value={newAssociation.administrator}
                            onChange={(e) => setNewAssociation({...newAssociation, administrator: e.target.value})}
                            placeholder="Administrator (opțional)"
                            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <input
                            value={newAssociation.president}
                            onChange={(e) => setNewAssociation({...newAssociation, president: e.target.value})}
                            placeholder="Președinte (opțional)"
                            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                          <input
                            value={newAssociation.censor}
                            onChange={(e) => setNewAssociation({...newAssociation, censor: e.target.value})}
                            placeholder="Cenzor (opțional)"
                            className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>

                        <div className="flex justify-center pt-4">
                          <button 
                            onClick={handleAddAssociation}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 flex items-center disabled:bg-gray-400 text-lg font-medium"
                            disabled={!newAssociation.name || !newAssociation.address}
                          >
                            <Plus className="w-5 h-5 mr-2" />
                            Creează Asociația
                          </button>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-xs text-blue-600">
                            * Câmpurile marcate sunt obligatorii. Restul pot fi completate mai târziu.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dacă există asociație fără apartamente */}
                {association && getAssociationApartments().length === 0 && (
                  <div className="bg-green-50 border border-green-200 p-6 rounded-xl mb-8">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Asociația "{association.name}" a fost creată!</h3>
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


                    <div className="grid grid-cols-6 gap-4 mb-8 overflow-x-auto">
                      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
                        <div className="text-2xl font-bold text-green-600">{blocks.filter(b => b.associationId === association.id).length}</div>
                        <div className="text-sm text-gray-600">Blocuri</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
                        <div className="text-2xl font-bold text-purple-600">
                          {stairs.filter(s => blocks.some(b => b.id === s.blockId && b.associationId === association.id)).length}
                        </div>
                        <div className="text-sm text-gray-600">Scări</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
                        <div className="text-2xl font-bold text-orange-600">{getAssociationApartments().length}</div>
                        <div className="text-sm text-gray-600">Apartamente</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
                        <div className="text-2xl font-bold text-teal-600">{getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0)}</div>
                        <div className="text-sm text-gray-600">Persoane</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
                        <div className="text-2xl font-bold text-blue-600">
                          {expenses.filter(e => e.associationId === association.id && e.month === currentMonth).length}
                        </div>
                        <div className="text-sm text-gray-600">Cheltuieli {currentMonth}</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
                        <div className="text-2xl font-bold text-emerald-600">
                          {maintenanceData.filter(d => d.paid).reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-600">Încasări RON</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">📝 Activitate Recentă</h3>
                      {maintenanceData.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span>Tabel întreținere pentru {maintenanceData.length} apartamente</span>
                            <span className="text-green-600 font-medium">
                              Total: {maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)} RON
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span>Plăți înregistrate: {maintenanceData.filter(d => d.paid).length} / {maintenanceData.length}</span>
                            <span className="text-blue-600 font-medium">
                              Încasat: {maintenanceData.filter(d => d.paid).reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)} RON
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-600">Adaugă cheltuieli pentru a genera primul tabel de întreținere.</p>
                      )}
                    </div>
                  </>
                )}
              
			  
			  </div>
            </div>
          )}

{/* Setup View */}
{currentView === "setup" && (
  (() => {
    const associationBlocks = blocks.filter(block => block.associationId === association?.id);
    const availableStairs = getAvailableStairs();
    const allApartments = getAssociationApartments();

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">⚙️ Configurare Asociație</h2>
            <button 
              onClick={() => handleNavigation("dashboard")}
              className="w-full lg:w-auto bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Înapoi
            </button>
          </div>

          {/* Linia 1: Date Asociație (50%) + Blocuri (25%) + Scări (25%) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            {/* Date Asociație (50% = 2 coloane din 4) */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg">
              <div className="p-4 bg-blue-50 border-b">
                <h3 className="text-lg font-semibold">📋 Date Asociație</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Numele asociației *</label>
                    <input
                      value={association?.name || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ name: e.target.value });
                        }
                      }}
                      placeholder="ex: Asociația Primăverii 12"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Adresa completă *</label>
                    <input
                      value={association?.address || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ address: e.target.value });
                        }
                      }}
                      placeholder="Strada, numărul, sectorul"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cont bancar</label>
                    <input
                      value={association?.bankAccount || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ bankAccount: e.target.value });
                        }
                      }}
                      placeholder="RO49 AAAA 1B31..."
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Administrator</label>
                    <input
                      value={association?.administrator || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ administrator: e.target.value });
                        }
                      }}
                      placeholder="Numele administratorului"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Președinte</label>
                    <input
                      value={association?.president || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ president: e.target.value });
                        }
                      }}
                      placeholder="Numele președintelui"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cenzor</label>
                    <input
                      value={association?.censor || ""}
                      onChange={(e) => {
                        if (association) {
                          updateAssociation({ censor: e.target.value });
                        }
                      }}
                      placeholder="Numele cenzorului"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600 flex justify-between">
                  <span><strong>Creat:</strong> {association?.createdAt}</span>
                  <span className="text-gray-500">* Câmpurile marcate sunt obligatorii</span>
                </div>
              </div>
            </div>

            {/* Blocuri (25% = 1 coloană din 4) */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-4 bg-green-50 border-b">
                <h3 className="text-lg font-semibold">🏠 Blocuri ({associationBlocks.length})</h3>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-4">
                  <input
                    value={newBlock.name}
                    onChange={(e) => setNewBlock({...newBlock, name: e.target.value})}
                    placeholder="ex: Bloc B4"
                    className="flex-1 p-2 border rounded-lg text-sm"
                  />
                  <button 
                    onClick={handleAddBlock}
                    className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 text-sm"
                    disabled={!newBlock.name}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {associationBlocks.map(block => (
                    <div key={block.id} className="p-2 bg-gray-50 rounded text-sm">
                      {block.name} ({stairs.filter(s => s.blockId === block.id).length} scări)
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scări (25% = 1 coloană din 4) */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-4 bg-purple-50 border-b">
                <h3 className="text-lg font-semibold">🔼 Scări ({availableStairs.length})</h3>
              </div>
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <select 
                    value={newStair.blockId}
                    onChange={(e) => {
                      console.log('🔄 Selectare bloc - value:', e.target.value, 'type:', typeof e.target.value);
                      setNewStair({...newStair, blockId: e.target.value}); // păstrez ca string
                    }}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">Selectează bloc</option>
                    {associationBlocks.map(block => (
                      <option key={block.id} value={block.id}>{block.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      value={newStair.name}
                      onChange={(e) => setNewStair({...newStair, name: e.target.value})}
                      placeholder="ex: Scara A"
                      className="flex-1 p-2 border rounded-lg text-sm"
                    />
                    <button 
                      onClick={handleAddStair}
                      className="bg-purple-500 text-white px-3 py-2 rounded-lg hover:bg-purple-600 text-sm"
                      disabled={!newStair.name || !newStair.blockId}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stairs.filter(stair => 
                    blocks.some(block => block.id === stair.blockId && block.associationId === association?.id)
                  ).map(stair => {
                    const block = blocks.find(b => b.id === stair.blockId);
                    return (
                      <div key={stair.id} className="p-2 bg-gray-50 rounded text-sm">
                        {block?.name} - {stair.name} ({apartments.filter(a => a.stairId === stair.id).length} apt)
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Linia 2: Apartamente (50%) + Cheltuieli (50%) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Apartamente (50%) - SECȚIUNEA COMPLETĂ cu editare */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-4 bg-orange-50 border-b">
                <h3 className="text-lg font-semibold">👥 Apartamente ({allApartments.length})</h3>
              </div>
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <select 
                    value={newApartment.stairId}
                    onChange={(e) => {
                      console.log('🔄 Selectare scară - value:', e.target.value, 'type:', typeof e.target.value);
                      setNewApartment({...newApartment, stairId: e.target.value});
                    }}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">Selectează scara</option>
                    {availableStairs.map(stair => {
                      const block = blocks.find(b => b.id === stair.blockId);
                      return (
                        <option key={stair.id} value={stair.id}>
                          {block?.name} - {stair.name}
                        </option>
                      );
                    })}
                  </select>

                  {/* Prima linie: Nr apt + Nume proprietar */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={newApartment.number}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d+$/.test(value)) {
                          setNewApartment({...newApartment, number: value});
                        }
                      }}
                      type="text"
                      inputMode="numeric"
                      placeholder="Nr apartament *"
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                    <input
                      value={newApartment.owner}
                      onChange={(e) => setNewApartment({...newApartment, owner: e.target.value})}
                      placeholder="Nume proprietar *"
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>

                  {/* A doua linie: Nr persoane + Tip apartament */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={newApartment.persons}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d+$/.test(value)) {
                          setNewApartment({...newApartment, persons: value});
                        }
                      }}
                      type="text"
                      inputMode="numeric"
                      placeholder="Nr persoane *"
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                    <select
                      value={newApartment.apartmentType}
                      onChange={(e) => setNewApartment({...newApartment, apartmentType: e.target.value})}
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      <option value="">Tip apartament</option>
                      <option value="Garsoniera">Garsoniera</option>
                      <option value="2 camere">2 camere</option>
                      <option value="3 camere">3 camere</option>
                      <option value="4 camere">4 camere</option>
                      <option value="5 camere">5 camere</option>
                      <option value="Penthouse">Penthouse</option>
                    </select>
                  </div>

                  {/* A treia linie: Suprafața + Sursă încălzire */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={newApartment.surface}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                          setNewApartment({...newApartment, surface: value.replace(',', '.')});
                        }
                      }}
                      type="text"
                      inputMode="decimal"
                      placeholder="Suprafață mp"
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                    <select
                      value={newApartment.heatingSource}
                      onChange={(e) => setNewApartment({...newApartment, heatingSource: e.target.value})}
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      <option value="">Sursă încălzire</option>
                      <option value="Termoficare">Termoficare</option>
                      <option value="Centrala proprie">Centrală proprie</option>
                      <option value="Centrala bloc">Centrală bloc</option>
                      <option value="Debransat">Debranșat</option>
                    </select>
                  </div>

                  {/* Buton adăugare */}
                  <button 
                    onClick={handleAddApartment}
                    className="w-full bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 text-sm flex items-center justify-center"
                    disabled={!newApartment.number || !newApartment.persons || !newApartment.stairId || !newApartment.owner}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adaugă Apartament
                  </button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allApartments.map(apartment => {
                    const stair = stairs.find(s => s.id === apartment.stairId);
                    const block = blocks.find(b => b.id === stair?.blockId);
                    const isEditing = editingApartment === apartment.id;
                    
                    return (
                      <div key={apartment.id} className={`p-3 rounded text-sm ${isEditing ? "bg-blue-50 border-2 border-blue-200" : "bg-gray-50"}`}>
                        {isEditing ? (
                          // Modul de editare
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-blue-600">Editare Apartament {apartment.number}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => saveApartmentEdit(apartment.id)}
                                  className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                                  disabled={!editingApartmentData.owner || !editingApartmentData.persons}
                                >
                                  Salvează
                                </button>
                                <button
                                  onClick={() => cancelApartmentEdit()}
                                  className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                                >
                                  Anulează
                                </button>
                              </div>
                            </div>
                            
                            {/* Editare proprietar și persoane */}
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={editingApartmentData.owner}
                                onChange={(e) => setEditingApartmentData({...editingApartmentData, owner: e.target.value})}
                                placeholder="Nume proprietar *"
                                className="w-full p-2 border rounded-lg text-sm"
                              />
                              <input
                                value={editingApartmentData.persons}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || /^\d+$/.test(value)) {
                                    setEditingApartmentData({...editingApartmentData, persons: value});
                                  }
                                }}
                                type="text"
                                inputMode="numeric"
                                placeholder="Nr persoane *"
                                className="w-full p-2 border rounded-lg text-sm"
                              />
                            </div>
                            
                            {/* Editare tip apartament și suprafață */}
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editingApartmentData.apartmentType || ""}
                                onChange={(e) => setEditingApartmentData({...editingApartmentData, apartmentType: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                              >
                                <option value="">Tip apartament</option>
                                <option value="Garsoniera">Garsoniera</option>
                                <option value="2 camere">2 camere</option>
                                <option value="3 camere">3 camere</option>
                                <option value="4 camere">4 camere</option>
                                <option value="5 camere">5 camere</option>
                                <option value="Penthouse">Penthouse</option>
                              </select>
                              <input
                                value={editingApartmentData.surface || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                                    setEditingApartmentData({...editingApartmentData, surface: value.replace(',', '.')});
                                  }
                                }}
                                type="text"
                                inputMode="decimal"
                                placeholder="Suprafață mp"
                                className="w-full p-2 border rounded-lg text-sm"
                              />
                            </div>
                            
                            {/* Editare sursă încălzire */}
                            <select
                              value={editingApartmentData.heatingSource || ""}
                              onChange={(e) => setEditingApartmentData({...editingApartmentData, heatingSource: e.target.value})}
                              className="w-full p-2 border rounded-lg text-sm"
                            >
                              <option value="">Sursă încălzire</option>
                              <option value="Termoficare">Termoficare</option>
                              <option value="Centrala proprie">Centrală proprie</option>
                              <option value="Centrala bloc">Centrală bloc</option>
                              <option value="Debransat">Debranșat</option>
                            </select>
                          </div>
                        ) : (
                          // Modul de afișare
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">Apt {apartment.number} - {apartment.owner}</div>
                                <div className="text-gray-600">
                                  {block?.name} - {stair?.name} • {apartment.persons} pers
                                  {apartment.surface && ` • ${apartment.surface} mp`}
                                  {apartment.apartmentType && ` • ${apartment.apartmentType}`}
                                </div>
                                {apartment.heatingSource && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    🔥 {apartment.heatingSource}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startEditingApartment(apartment)}
                                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                                  title="Editează apartamentul"
                                >
                                  Editează
                                </button>
                                <button
                                  onClick={() => handleDeleteApartment(apartment.id)}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                  title="Șterge apartamentul"
                                >
                                  Șterge
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Cheltuieli (50%) - SECȚIUNEA COMPLETĂ */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-4 bg-red-50 border-b">
                <h3 className="text-lg font-semibold">💰 Cheltuieli ({getAssociationExpenseTypes().length})</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3 mb-4">
                  <div className="flex gap-2">
                    <input
                      value={newCustomExpense.name}
                      onChange={(e) => setNewCustomExpense({...newCustomExpense, name: e.target.value})}
                      placeholder="ex: Deratizare"
                      className="flex-1 p-2 border rounded-lg text-sm"
                    />
                    <button 
                      onClick={handleAddCustomExpense}
                      className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
                      disabled={!newCustomExpense.name}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Configurează cheltuială:</label>
                    <select 
                      value={selectedExpenseForConfig || ""}
                      onChange={(e) => setSelectedExpenseForConfig(e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm mb-2"
                    >
                      <option value="">Selectează cheltuiala</option>
                      {getAssociationExpenseTypes().map(expenseType => (
                        <option key={expenseType.name} value={expenseType.name}>
                          {expenseType.name}
                        </option>
                      ))}
                    </select>
                    
                    {selectedExpenseForConfig && (
                      <div className="space-y-2">
                        <select
                          value={getExpenseConfig(selectedExpenseForConfig).distributionType}
                          onChange={(e) => updateExpenseConfig(selectedExpenseForConfig, { distributionType: e.target.value })}
                          className="w-full p-2 border rounded-lg text-sm"
                        >
                          <option value="apartment">Pe apartament (egal)</option>
                          <option value="individual">Pe apartament (individual)</option>
                          <option value="person">Pe persoană</option>
                          <option value="consumption">Pe consum (mc/Gcal/kWh)</option>
                        </select>
                        
                        {allApartments.length > 0 && (
                          <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
                            <div className="text-xs font-medium text-gray-600 mb-1">Participarea apartamentelor:</div>
                            {allApartments.map(apartment => {
                              const participation = getApartmentParticipation(apartment.id, selectedExpenseForConfig);
                              return (
                                <div key={apartment.id} className="flex items-center gap-2 text-sm">
                                  <span className="w-16">Apt {apartment.number}</span>
                                  <select
                                    value={participation.type}
                                    onChange={(e) => {
                                      const type = e.target.value;
                                      if (type === "integral" || type === "excluded") {
                                        setApartmentParticipation(apartment.id, selectedExpenseForConfig, type);
                                      } else {
                                        setApartmentParticipation(apartment.id, selectedExpenseForConfig, type, participation.value || (type === "percentage" ? 50 : 0));
                                      }
                                    }}
                                    className="p-1 border rounded text-xs"
                                  >
                                    <option value="integral">Integral</option>
                                    <option value="percentage">Procent</option>
                                    <option value="fixed">Sumă fixă</option>
                                    <option value="excluded">Exclus</option>
                                  </select>
                                  {(participation.type === "percentage" || participation.type === "fixed") && (
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={participation.value || ""}
                                      onChange={(e) => setApartmentParticipation(apartment.id, selectedExpenseForConfig, participation.type, parseFloat(e.target.value) || 0)}
                                      placeholder={participation.type === "percentage" ? "%" : "RON"}
                                      className="w-16 p-1 border rounded text-xs"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <div className="text-xs text-gray-600 mb-2">Cheltuieli active pentru {currentMonth}:</div>
                  {getAssociationExpenseTypes().map(expenseType => {
                    const config = getExpenseConfig(expenseType.name);
                    const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                    const isDefault = defaultExpenseTypes.find(def => def.name === expenseType.name);
                    
                    return (
                      <div key={expenseType.name} className={`p-2 rounded text-sm ${isCustom ? "bg-red-50" : "bg-blue-50"} flex items-center justify-between`}>
                        <div className="flex-1">
                          <div className="font-medium">{expenseType.name}</div>
                          <div className="text-xs text-gray-600">
                            {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                             config.distributionType === "individual" ? "Pe apartament (individual)" :
                             config.distributionType === "person" ? "Pe persoană" : 
                             (expenseType.name === "Apă caldă" || expenseType.name === "Apă rece" || expenseType.name === "Canal") ? "Pe consum (mc)" : "Pe consum (mc/Gcal)"}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {isDefault && (
                            <button
                              onClick={() => toggleExpenseStatus(expenseType.name, true)}
                              className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
                              title="Elimină pentru această lună"
                            >
                              Elimină
                            </button>
                          )}
                          {isCustom && (
                            <>
                              <button
                                onClick={() => toggleExpenseStatus(expenseType.name, true)}
                                className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
                                title="Elimină pentru această lună"
                              >
                                Elimină
                              </button>
                              <button
                                onClick={() => {
                                  deleteCustomExpense(expenseType.name);
                                }}
                                className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                title="Șterge definitiv cheltuiala"
                              >
                                Șterge
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {getDisabledExpenseTypes().length > 0 && (
                    <>
                      <div className="text-xs text-gray-600 mb-2 mt-4 pt-2 border-t">Cheltuieli dezactivate pentru {currentMonth}:</div>
                      {getDisabledExpenseTypes().map(expenseType => {
                        const config = getExpenseConfig(expenseType.name);
                        const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                        
                        return (
                          <div key={expenseType.name} className="p-2 rounded text-sm bg-gray-50 flex items-center justify-between opacity-60">
                            <div className="flex-1">
                              <div className="font-medium line-through">{expenseType.name}</div>
                              <div className="text-xs text-gray-600">
                                {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                                 config.distributionType === "individual" ? "Pe apartament (individual)" :
                                 config.distributionType === "person" ? "Pe persoană" : 
                                 (expenseType.name === "Apă caldă" || expenseType.name === "Apă rece" || expenseType.name === "Canal") ? "Pe consum (mc)" : "Pe consum (mc/Gcal)"}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => toggleExpenseStatus(expenseType.name, false)}
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                                title="Reactivează pentru această lună"
                              >
                                Reactivează
                              </button>
                              {isCustom && (
                                <button
                                  onClick={() => {
                                    deleteCustomExpense(expenseType.name);
                                  }}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                  title="Șterge definitiv cheltuiala"
                                >
                                  Șterge
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {allApartments.length > 0 && (
            <div className="mt-6 bg-green-50 border border-green-200 p-6 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Configurare Completă!</h3>
              <p className="text-green-700 mb-4">
                Ai configurat {allApartments.length} apartamente. Acum poți începe să gestionezi întreținerea.
              </p>
              <button 
                onClick={() => handleNavigation("dashboard")}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
              >
                Mergi la Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  })()
)}

{/* Maintenance View */}
{currentView === "maintenance" && (
  (() => {
    const associationExpenses = expenses.filter(exp => exp.associationId === association?.id && exp.month === currentMonth);

    // ✅ FUNCȚIE EXPORT PDF PENTRU AVIZIER
    const exportPDFAvizier = () => {
      try {
        const doc = new jsPDF();
        
        // Configurare font pentru caractere românești
        doc.setFont("helvetica");
        
        // Funcție pentru encodarea corectă a diacriticelor românești
        const fixRomanianText = (text) => {
          if (!text) return text;
          return text
            .replace(/ă/g, 'a')
            .replace(/Ă/g, 'A')
            .replace(/â/g, 'a')
            .replace(/Â/g, 'A')
            .replace(/î/g, 'i')
            .replace(/Î/g, 'I')
            .replace(/ș/g, 's')
            .replace(/Ș/g, 'S')
            .replace(/ț/g, 't')
            .replace(/Ț/g, 'T');
        };
        
        // ===== HEADER PRINCIPAL =====
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(fixRomanianText("ASOCIAȚIA DE PROPRIETARI"), 105, 15, { align: "center" });
        
        doc.setFontSize(16);
        doc.text(fixRomanianText(association?.name?.toUpperCase()) || "NUME ASOCIATIE", 105, 23, { align: "center" });
        
        // Linie decorativă sub titlu
        doc.setLineWidth(0.5);
        doc.line(30, 27, 180, 27);
        
        // ===== INFORMAȚII RESPONSABILI =====
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        // Poziționare responsabili pe 3 coloane
        const responsabiliY = 35;
        doc.text(fixRomanianText(`Presedinte: ${association?.president || "_____________"}`), 20, responsabiliY);
        doc.text(fixRomanianText(`Administrator: ${association?.administrator || "_____________"}`), 105, responsabiliY, { align: "center" });
        doc.text(fixRomanianText(`Cenzor: ${association?.censor || "_____________"}`), 190, responsabiliY, { align: "right" });
        
        // ===== INFORMAȚII ASOCIAȚIE =====
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(fixRomanianText(association?.address) || "Adresa asociatiei", 105, 43, { align: "center" });
        
        const apartmentCount = getAssociationApartments().length;
        const personCount = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
        doc.text(`${apartmentCount} apartamente • ${personCount} persoane`, 105, 50, { align: "center" });
        
        // ===== INFORMAȚII LUNĂ =====
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(fixRomanianText(`INTRETINERE LUNA ${currentMonth.toUpperCase()}`), 105, 62, { align: "center" });
        
        // ===== INFORMAȚII IMPORTANTE =====
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(fixRomanianText("ATENTIE!!! Incasarile se fac pana pe data de 20 ale lunii in curs (pentru luna anterioara)"), 105, 70, { align: "center" });
        
        // ===== INFORMAȚII CONT BANCAR =====
        let currentY = 80;
        if (association?.bankAccount) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(fixRomanianText("Plata intretinerii poate fi efectuata si prin transfer bancar:"), 105, currentY, { align: "center" });
          currentY += 5;
          
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText(`Beneficiar: ${association?.name}`), 105, currentY, { align: "center" });
          currentY += 5;
          doc.text(`Cont IBAN: ${association?.bankAccount}`, 105, currentY, { align: "center" });
          currentY += 5;
          
          doc.setFont("helvetica", "normal");
          doc.text(fixRomanianText("Va rog sa mentionati in detaliile platii numarul apartamentului!"), 105, currentY, { align: "center" });
          currentY += 10;
        }

        // ===== PREȚURI UTILITĂȚI =====
        const consumExpenses = associationExpenses.filter(exp => 
          getExpenseConfig(exp.name).distributionType === "consumption"
        );
        
        if (consumExpenses.length > 0) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText("PRETURI UTILITATI:"), 20, currentY);
          currentY += 6;
          
          doc.setFont("helvetica", "normal");
          const pricesPerRow = 3; // Câte prețuri pe rând
          let col = 0;
          
          consumExpenses.forEach((expense, index) => {
            const unit = expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal";
            const x = 20 + (col * 60); // Spațiere coloane
            doc.text(fixRomanianText(`${expense.name}: ${expense.unitPrice} lei/${unit}`), x, currentY);
            
            col++;
            if (col >= pricesPerRow) {
              col = 0;
              currentY += 5;
            }
          });
          
          if (col > 0) currentY += 5;
          currentY += 5;
        }

        // ===== TABEL PRINCIPAL PROFESIONAL =====
        doc.setFontSize(8);
        
        // Configurare tabel
        const startX = 15;
        const tableWidth = 180;
        const colWidths = [20, 12, 30, 22, 28, 24, 32]; // Lățimi optimizate
        const rowHeight = 6;
        
        // Verifică că suma lățimilor = tableWidth
        const totalWidth = colWidths.reduce((a, b) => a + b, 0);
        if (totalWidth !== tableWidth) {
          console.log(`Ajustez lățimile: ${totalWidth} -> ${tableWidth}`);
        }
        
        const headers = [
          fixRomanianText('Apartament'), 
          fixRomanianText('Pers.'), 
          fixRomanianText('Intretinere Curenta'), 
          fixRomanianText('Restanta'), 
          fixRomanianText('Total Intretinere'), 
          fixRomanianText('Penalitati'), 
          fixRomanianText('TOTAL DATORAT')
        ];
        
        // ===== HEADER TABEL =====
        doc.setFillColor(220, 220, 220); // Gri deschis pentru header
        doc.rect(startX, currentY, tableWidth, rowHeight, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        
        let x = startX + 1;
        headers.forEach((header, i) => {
          // Centru text în coloană
          const centerX = x + (colWidths[i] / 2);
          doc.text(header, centerX, currentY + 4, { align: "center" });
          x += colWidths[i];
        });
        
        // Contur header
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(startX, currentY, tableWidth, rowHeight);
        
        // Linii verticale header
        x = startX;
        for (let i = 0; i <= colWidths.length; i++) {
          doc.line(x, currentY, x, currentY + rowHeight);
          if (i < colWidths.length) x += colWidths[i];
        }
        
        currentY += rowHeight;
        
        // ===== RÂNDURI DATE =====
        doc.setFont("helvetica", "normal");
        doc.setFillColor(255, 255, 255); // Alb pentru rânduri
        
        maintenanceData.forEach((data, index) => {
          // Fundal alternativ pentru rânduri
          if (index % 2 === 1) {
            doc.setFillColor(248, 248, 248); // Gri foarte deschis
            doc.rect(startX, currentY, tableWidth, rowHeight, 'F');
          }
          
          const rowData = [
            `Ap. ${data.apartment}`,
            data.persons.toString(),
            data.currentMaintenance.toFixed(2),
            data.restante.toFixed(2),
            data.totalMaintenance.toFixed(2),
            data.penalitati.toFixed(2),
            data.totalDatorat.toFixed(2)
          ];
          
          x = startX + 1;
          rowData.forEach((cell, i) => {
            const centerX = x + (colWidths[i] / 2);
            // Prima coloană (apartament) la stânga, restul centrat
            const align = i === 0 ? "left" : "center";
            const textX = i === 0 ? x + 2 : centerX;
            
            doc.text(cell, textX, currentY + 4, { align: align });
            x += colWidths[i];
          });
          
          // Contur rând
          doc.rect(startX, currentY, tableWidth, rowHeight);
          
          // Linii verticale
          x = startX;
          for (let i = 0; i <= colWidths.length; i++) {
            doc.line(x, currentY, x, currentY + rowHeight);
            if (i < colWidths.length) x += colWidths[i];
          }
          
          currentY += rowHeight;
        });
        
        // ===== RÂND TOTAL =====
        doc.setFillColor(200, 200, 200); // Gri pentru total
        doc.rect(startX, currentY, tableWidth, rowHeight, 'F');
        
        doc.setFont("helvetica", "bold");
        const totalData = [
          "TOTAL",
          maintenanceData.reduce((sum, d) => sum + d.persons, 0).toString(),
          maintenanceData.reduce((sum, d) => sum + d.currentMaintenance, 0).toFixed(2),
          maintenanceData.reduce((sum, d) => sum + d.restante, 0).toFixed(2),
          maintenanceData.reduce((sum, d) => sum + d.totalMaintenance, 0).toFixed(2),
          maintenanceData.reduce((sum, d) => sum + d.penalitati, 0).toFixed(2),
          maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)
        ];
        
        x = startX + 1;
        totalData.forEach((cell, i) => {
          const centerX = x + (colWidths[i] / 2);
          const align = i === 0 ? "left" : "center";
          const textX = i === 0 ? x + 2 : centerX;
          
          doc.text(cell, textX, currentY + 4, { align: align });
          x += colWidths[i];
        });
        
        // Contur total
        doc.setLineWidth(0.5); // Linie mai groasă pentru total
        doc.rect(startX, currentY, tableWidth, rowHeight);
        
        // Linii verticale total
        x = startX;
        for (let i = 0; i <= colWidths.length; i++) {
          doc.line(x, currentY, x, currentY + rowHeight);
          if (i < colWidths.length) x += colWidths[i];
        }
        
        currentY += rowHeight + 10;
        
        // ===== FOOTER INFORMATIV =====
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        
        if (association?.bankAccount) {
          doc.text(fixRomanianText("Pentru plati online, folositi OBLIGATORIU numarul apartamentului in detaliile transferului!"), 105, currentY, { align: "center" });
          currentY += 5;
        }
        
        doc.text(fixRomanianText("Pentru intrebari contactati administratorul asociatiei."), 105, currentY, { align: "center" });
        currentY += 8;
        
        // ===== FOOTER DOCUMENT =====
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100); // Gri pentru footer
        doc.text(fixRomanianText(`Document generat automat la: ${new Date().toLocaleDateString("ro-RO")} ${new Date().toLocaleTimeString("ro-RO")}`), 105, pageHeight - 8, { align: "center" });
        
        // ===== SALVARE PDF =====
        const fileName = `Avizier_${association?.name?.replace(/\s+/g, '_')}_${currentMonth.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
        
        console.log('✅ PDF profesional generat cu succes!');
        alert('✅ PDF pentru avizier generat cu succes!');
        
      } catch (error) {
        console.error('❌ Eroare la generarea PDF-ului:', error);
        alert('Eroare la generarea PDF-ului: ' + error.message);
      }
    };

    return (
      <div className={`min-h-screen p-4 ${
        currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
          ? "bg-gradient-to-br from-indigo-50 to-blue-100"
          : "bg-gradient-to-br from-green-50 to-emerald-100"
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">📊 Tabel Întreținere - {association?.name}</h2>
                {association && getAssociationApartments().length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {(() => {
                      const associationBlocks = blocks.filter(block => block.associationId === association.id);
                      const associationStairs = stairs.filter(stair => 
                        associationBlocks.some(block => block.id === stair.blockId)
                      );
                      const apartmentCount = getAssociationApartments().length;
                      const personCount = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
                      
                      let structureText = "";
                      if (associationBlocks.length === 1 && associationStairs.length === 1) {
                        structureText = `${associationBlocks[0].name} - ${associationStairs[0].name}`;
                      } else if (associationBlocks.length === 1) {
                        structureText = `${associationBlocks[0].name} - ${associationStairs.length} scări`;
                      } else {
                        structureText = `${associationBlocks.length} blocuri - ${associationStairs.length} scări`;
                      }
                      
                      return `${structureText} • ${apartmentCount} apartamente - ${personCount} persoane`;
                    })()}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                    className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value={new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}>
                      Luna: {new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}
                    </option>
                    <option value={(() => {
                      const nextMonth = new Date();
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      return nextMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
                    })()}>
                      Luna: {(() => {
                        const nextMonth = new Date();
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        return nextMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
                      })()}
                    </option>
                  </select>
                  {currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }) ? (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      LUNA CURENTĂ
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      LUNA URMĂTOARE
                    </span>
                  )}
                  {isMonthReadOnly(currentMonth) ? (
                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      📋 PUBLICATĂ
                    </span>
                  ) : (
                    <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      🔧 ÎN LUCRU
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Tab-uri pentru luni */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button 
                      onClick={() => setCurrentMonth(new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }))}
                      className={`px-4 py-2 rounded-md transition-all font-medium text-sm ${
                        currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                          ? "bg-blue-600 text-white shadow-md transform scale-105"
                          : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                      }`}
                    >
                      Luna Curentă
                    </button>
                    <button 
                      onClick={closeCurrentMonth}
                      className={`px-4 py-2 rounded-md transition-all font-medium text-sm ${
                        currentMonth !== new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                          ? "bg-green-600 text-white shadow-md transform scale-105"
                          : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                      }`}
                    >
                      Luna Următoare
                    </button>
                  </div>

                  {/* Buton Export PDF Avizier */}
                  {maintenanceData.length > 0 && (
                    <button 
                      onClick={exportPDFAvizier}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
                      title="Exportă PDF pentru avizier (fără nume proprietari)"
                    >
                      📄 Export PDF Avizier
                    </button>
                  )}

                  {/* Buton Publică Luna */}
                  {shouldShowPublishButton(currentMonth) && (
                    <button 
                      onClick={() => publishMonth(currentMonth)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
                    >
                      📋 Publică Luna
                    </button>
                  )}

                  {/* Buton Ajustări Solduri */}
                  {shouldShowAdjustButton(currentMonth) && (
                    (currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }) ? hasInitialBalances : true)
                  ) && (
                    <button 
                      onClick={() => {
                        const modalData = getAssociationApartments().map(apartment => {
                          const balance = getApartmentBalance(apartment.id);
                          return {
                            apartmentId: apartment.id,
                            apartmentNumber: apartment.number,
                            owner: apartment.owner,
                            restanteCurente: balance.restante,
                            penalitatiCurente: balance.penalitati,
                            restanteAjustate: balance.restante,
                            penalitatiAjustate: balance.penalitati
                          };
                        });
                        setAdjustModalData(modalData);
                        setShowAdjustBalances(true);
                      }}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Ajustări Solduri
                    </button>
                  )}
                </div>

                {/* Buton Înapoi */}
                <button 
                  onClick={() => handleNavigation("dashboard")}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center text-sm font-medium shadow-md whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Înapoi
                </button>
              </div>
            </div>
          </div>

          {!hasInitialBalances && getAssociationApartments().length > 0 && currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }) && !isMonthReadOnly(currentMonth) && (
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800">⚡ Configurare Solduri Inițiale</h3>
                  <p className="text-yellow-700 text-sm">Este prima utilizare a aplicației. Introduceți soldurile existente din luna anterioară.</p>
                </div>
                <button
                  onClick={() => setShowInitialBalances(!showInitialBalances)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                >
                  {showInitialBalances ? "Închide" : "Configurează Solduri"}
                </button>
              </div>
              
              {showInitialBalances && (
                <div className="mt-4 bg-white rounded-lg p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Apartament</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Proprietar</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Restanță anterioară (RON)</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Penalități anterioare (RON)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {getAssociationApartments().map(apartment => {
                          const balance = getApartmentBalance(apartment.id);
                          return (
                            <tr key={apartment.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-semibold">Ap. {apartment.number}</td>
                              <td className="px-3 py-2 text-sm">{apartment.owner}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={balance.restante || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                                      const normalizedValue = value.replace(',', '.');
                                      setApartmentBalance(apartment.id, {
                                        ...balance,
                                        restante: Math.round((parseFloat(normalizedValue) || 0) * 100) / 100
                                      });
                                    }
                                  }}
                                  className="w-full p-1 border rounded text-sm"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={balance.penalitati || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                                      const normalizedValue = value.replace(',', '.');
                                      setApartmentBalance(apartment.id, {
                                        ...balance,
                                        penalitati: Math.round((parseFloat(normalizedValue) || 0) * 100) / 100
                                      });
                                    }
                                  }}
                                  className="w-full p-1 border rounded text-sm"
                                  placeholder="0"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={saveInitialBalances}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                    >
                      Salvează Solduri Inițiale
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showAdjustBalances && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-6 bg-indigo-50 border-b flex items-center justify-between">
                  <h3 className="text-xl font-semibold">⚡ Ajustări Solduri - {currentMonth}</h3>
                  <button
                    onClick={() => setShowAdjustBalances(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                  <p className="text-sm text-gray-600 mb-4">
                    Ajustați manual restanțele și penalitățile pentru situații speciale (plăți parțiale, scutiri, corecții).
                  </p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Apartament</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Proprietar</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Restanță curentă</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Penalități curente</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Restanță ajustată</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Penalități ajustate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {adjustModalData.map(apartmentData => (
                          <tr key={apartmentData.apartmentId} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-semibold">Ap. {apartmentData.apartmentNumber}</td>
                            <td className="px-3 py-2 text-sm">{apartmentData.owner}</td>
                            <td className="px-3 py-2 font-medium text-red-600">
                              {apartmentData.restanteCurente}
                            </td>
                            <td className="px-3 py-2 font-medium text-orange-600">
                              {apartmentData.penalitatiCurente}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={apartmentData.restanteAjustate}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                                    const normalizedValue = value.replace(',', '.');
                                    setAdjustModalData(prev => prev.map(item => 
                                      item.apartmentId === apartmentData.apartmentId 
                                        ? { ...item, restanteAjustate: parseFloat(normalizedValue) || 0 }
                                        : item
                                    ));
                                  }
                                }}
                                className="w-full p-1 border rounded text-sm"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={apartmentData.penalitatiAjustate}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                                    const normalizedValue = value.replace(',', '.');
                                    setAdjustModalData(prev => prev.map(item => 
                                      item.apartmentId === apartmentData.apartmentId 
                                        ? { ...item, penalitatiAjustate: parseFloat(normalizedValue) || 0 }
                                        : item
                                    ));
                                  }
                                }}
                                className="w-full p-1 border rounded text-sm"
                                placeholder="0"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="p-6 bg-gray-50 border-t flex justify-between">
                  <button
                    onClick={() => {
                      setShowAdjustBalances(false);
                      setAdjustModalData([]);
                    }}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Anulează
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        // Salvează local
                        adjustModalData.forEach(apartmentData => {
                          setApartmentBalance(apartmentData.apartmentId, {
                            restante: Math.round(apartmentData.restanteAjustate * 100) / 100,
                            penalitati: Math.round(apartmentData.penalitatiAjustate * 100) / 100
                          });
                        });
                        
                        // Salvează în Firestore
                        await saveBalanceAdjustments(currentMonth, adjustModalData);
                        
                        setShowAdjustBalances(false);
                        setAdjustModalData([]);
                        
                        const key = `${association?.id}-${currentMonth}`;
                        setMonthlyTables(prev => {
                          const newTables = { ...prev };
                          delete newTables[key];
                          return newTables;
                        });
                        
                        alert('✅ Ajustările au fost salvate cu succes!');
                      } catch (error) {
                        console.error('❌ Eroare la salvarea ajustărilor:', error);
                        alert('❌ Eroare la salvarea ajustărilor: ' + error.message);
                      }
                    }}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    Salvează Ajustări
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Configurare Cheltuieli */}
          {showExpenseConfig && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-6 bg-indigo-50 border-b flex items-center justify-between">
                  <h3 className="text-xl font-semibold">💰 Configurare Cheltuieli - {currentMonth}</h3>
                  <button
                    onClick={() => setShowExpenseConfig(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                  <div className="space-y-3 mb-4">
                    <div className="flex gap-2">
                      <input
                        value={newCustomExpense.name}
                        onChange={(e) => setNewCustomExpense({...newCustomExpense, name: e.target.value})}
                        placeholder="ex: Deratizare"
                        className="flex-1 p-2 border rounded-lg text-sm"
                      />
                      <button 
                        onClick={handleAddCustomExpense}
                        className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
                        disabled={!newCustomExpense.name}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Configurează cheltuială:</label>
                      <select 
                        value={selectedExpenseForConfig || ""}
                        onChange={(e) => setSelectedExpenseForConfig(e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm mb-2"
                      >
                        <option value="">Selectează cheltuiala</option>
                        {getAssociationExpenseTypes().map(expenseType => (
                          <option key={expenseType.name} value={expenseType.name}>
                            {expenseType.name}
                          </option>
                        ))}
                      </select>
                      
                      {selectedExpenseForConfig && (
                        <div className="space-y-2">
                          <select
                            value={getExpenseConfig(selectedExpenseForConfig).distributionType}
                            onChange={(e) => updateExpenseConfig(selectedExpenseForConfig, { distributionType: e.target.value })}
                            className="w-full p-2 border rounded-lg text-sm"
                          >
                            <option value="apartment">Pe apartament (egal)</option>
                            <option value="individual">Pe apartament (individual)</option>
                            <option value="person">Pe persoană</option>
                            <option value="consumption">Pe consum (mc/Gcal/kWh)</option>
                          </select>
                          
                          {getAssociationApartments().length > 0 && (
                            <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
                              <div className="text-xs font-medium text-gray-600 mb-1">Participarea apartamentelor:</div>
                              {getAssociationApartments().map(apartment => {
                                const participation = getApartmentParticipation(apartment.id, selectedExpenseForConfig);
                                return (
                                  <div key={apartment.id} className="flex items-center gap-2 text-sm">
                                    <span className="w-16">Apt {apartment.number}</span>
                                    <select
                                      value={participation.type}
                                      onChange={(e) => {
                                        const type = e.target.value;
                                        if (type === "integral" || type === "excluded") {
                                          setApartmentParticipation(apartment.id, selectedExpenseForConfig, type);
                                        } else {
                                          setApartmentParticipation(apartment.id, selectedExpenseForConfig, type, participation.value || (type === "percentage" ? 50 : 0));
                                        }
                                      }}
                                      className="p-1 border rounded text-xs"
                                    >
                                      <option value="integral">Integral</option>
                                      <option value="percentage">Procent</option>
                                      <option value="fixed">Sumă fixă</option>
                                      <option value="excluded">Exclus</option>
                                    </select>
                                    {(participation.type === "percentage" || participation.type === "fixed") && (
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={participation.value || ""}
                                        onChange={(e) => setApartmentParticipation(apartment.id, selectedExpenseForConfig, participation.type, parseFloat(e.target.value) || 0)}
                                        placeholder={participation.type === "percentage" ? "%" : "RON"}
                                        className="w-16 p-1 border rounded text-xs"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <div className="text-xs text-gray-600 mb-2">Cheltuieli active pentru {currentMonth}:</div>
                    {getAssociationExpenseTypes().map(expenseType => {
                      const config = getExpenseConfig(expenseType.name);
                      const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                      const isDefault = defaultExpenseTypes.find(def => def.name === expenseType.name);
                      
                      return (
                        <div key={expenseType.name} className={`p-2 rounded text-sm ${isCustom ? "bg-red-50" : "bg-blue-50"} flex items-center justify-between`}>
                          <div className="flex-1">
                            <div className="font-medium">{expenseType.name}</div>
                            <div className="text-xs text-gray-600">
                              {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                               config.distributionType === "individual" ? "Pe apartament (individual)" :
                               config.distributionType === "person" ? "Pe persoană" : 
                               (expenseType.name === "Apă caldă" || expenseType.name === "Apă rece" || expenseType.name === "Canal") ? "Pe consum (mc)" : "Pe consum (mc/Gcal)"}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {isDefault && (
                              <button
                                onClick={() => toggleExpenseStatus(expenseType.name, true)}
                                className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
                                title="Elimină pentru această lună"
                              >
                                Elimină
                              </button>
                            )}
                            {isCustom && (
                              <>
                                <button
                                  onClick={() => toggleExpenseStatus(expenseType.name, true)}
                                  className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
                                  title="Elimină pentru această lună"
                                >
                                  Elimină
                                </button>
                                <button
                                  onClick={() => {
                                    deleteCustomExpense(expenseType.name);
                                  }}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                  title="Șterge definitiv cheltuiala"
                                >
                                  Șterge
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {getDisabledExpenseTypes().length > 0 && (
                      <>
                        <div className="text-xs text-gray-600 mb-2 mt-4 pt-2 border-t">Cheltuieli dezactivate pentru {currentMonth}:</div>
                        {getDisabledExpenseTypes().map(expenseType => {
                          const config = getExpenseConfig(expenseType.name);
                          const isCustom = !defaultExpenseTypes.find(def => def.name === expenseType.name);
                          
                          return (
                            <div key={expenseType.name} className="p-2 rounded text-sm bg-gray-50 flex items-center justify-between opacity-60">
                              <div className="flex-1">
                                <div className="font-medium line-through">{expenseType.name}</div>
                                <div className="text-xs text-gray-600">
                                  {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                                   config.distributionType === "individual" ? "Pe apartament (individual)" :
                                   config.distributionType === "person" ? "Pe persoană" : 
                                   (expenseType.name === "Apă caldă" || expenseType.name === "Apă rece" || expenseType.name === "Canal") ? "Pe consum (mc)" : "Pe consum (mc/Gcal)"}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => toggleExpenseStatus(expenseType.name, false)}
                                  className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                                  title="Reactivează pentru această lună"
                                >
                                  Reactivează
                                </button>
                                {isCustom && (
                                  <button
                                    onClick={() => {
                                      deleteCustomExpense(expenseType.name);
                                    }}
                                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                    title="Șterge definitiv cheltuiala"
                                  >
                                    Șterge
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="p-6 bg-gray-50 border-t flex justify-end">
                  <button
                    onClick={() => setShowExpenseConfig(false)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    Închide
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">💰 Adaugă Cheltuială Lunară</h3>
                {!isMonthReadOnly(currentMonth) && (
                  <button
                    onClick={() => setShowExpenseConfig(true)}
                    className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center text-sm"
                    title="Configurează cheltuieli"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {getAvailableExpenseTypes().length === 0 ? (
                isMonthReadOnly(currentMonth) ? (
                  <div className="text-center py-8 bg-purple-50 border-2 border-purple-200 rounded-xl">
                    <div className="mb-4">
                      <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-4xl">🔒</span>
                      </div>
                      <div className="mb-2">
                        <span className="bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                          📋 LUNĂ PUBLICATĂ
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-purple-800 mb-2">Luna este publicată și afișată proprietarilor</h3>
                    <p className="text-purple-700 font-medium">Nu se pot adăuga cheltuieli noi pentru lunile publicate</p>
                    <p className="text-purple-600 text-sm mt-2">Poți doar înregistra încasări pentru această lună</p>
                  </div>
                ) : getAssociationExpenseTypes().length === 0 ? (
                  <div className="text-center py-8 bg-orange-50 border-2 border-orange-200 rounded-xl">
                    <div className="mb-4">
                      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-4xl">⚠️</span>
                      </div>
                      <div className="mb-2">
                        <span className="bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                          ⚠️ CONFIGURARE NECESARĂ
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-orange-800 mb-2">Nu există cheltuieli active configurate</h3>
                    <p className="text-orange-700 font-medium">Toate cheltuielile au fost dezactivate pentru această lună</p>
                    <p className="text-orange-600 text-sm mt-2">Mergi la Configurare Asociație → Cheltuieli pentru a reactiva cheltuielile necesare</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-600">Toate cheltuielile au fost adăugate</p>
                    <p className="text-gray-500 text-sm">
                      Pentru luna {currentMonth} toate tipurile de cheltuieli sunt complete
                    </p>
                  </div>
                )
              ) : isMonthReadOnly(currentMonth) ? (
                <div className="text-center py-8 bg-purple-50 border-2 border-purple-200 rounded-xl">
                  <div className="mb-4">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-4xl">🔒</span>
                    </div>
                    <div className="mb-2">
                      <span className="bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                        📋 LUNĂ PUBLICATĂ
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-purple-800 mb-2">Luna este publicată și afișată proprietarilor</h3>
                  <p className="text-purple-700 font-medium">Nu se pot adăuga cheltuieli noi pentru lunile publicate</p>
                  <p className="text-purple-600 text-sm mt-2">Poți doar înregistra încasări pentru această lună</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <select 
                    value={newExpense.name}
                    onChange={(e) => setNewExpense({...newExpense, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="">Selectează cheltuiala</option>
                    {getAvailableExpenseTypes().map(expenseType => (
                      <option key={expenseType.name} value={expenseType.name}>
                        {expenseType.name}
                      </option>
                    ))}
                  </select>
                  
                  {newExpense.name && getExpenseConfig(newExpense.name).distributionType === "consumption" && (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <strong>{newExpense.name}</strong> - cheltuială pe consum
                        </div>
                      </div>
                      <input
                        value={newExpense.unitPrice}
                        onChange={(e) => setNewExpense({...newExpense, unitPrice: e.target.value})}
                        type="text"
                        inputMode="decimal"
                        placeholder={`Preț pe ${newExpense.name.toLowerCase().includes("apă") || newExpense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"} (RON)`}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                      <input
                        value={newExpense.billAmount}
                        onChange={(e) => setNewExpense({...newExpense, billAmount: e.target.value})}
                        type="text"
                        inputMode="decimal"
                        placeholder="Totalul facturii (RON)"
                        className="w-full p-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      />
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>💡 <strong>Preț pe unitate:</strong> pentru calculul individual pe consum</div>
                        <div>🧾 <strong>Total factură:</strong> suma reală de plată</div>
                      </div>
                    </div>
                  )}
                  
                  {newExpense.name && getExpenseConfig(newExpense.name).distributionType === "individual" && (
                    <div className="space-y-3">
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="text-sm text-purple-800">
                          <strong>{newExpense.name}</strong> - sume individuale per apartament
                        </div>
                      </div>
                      <input
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                        type="text"
                        inputMode="decimal"
                        placeholder="Suma totală (RON)"
                        className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                      <div className="text-xs text-gray-600">
                        💡 Suma totală pentru verificare. Vei introduce sumele individuale în panoul de introducere.
                      </div>
                    </div>
                  )}
                  
                  {newExpense.name && getExpenseConfig(newExpense.name).distributionType !== "consumption" && getExpenseConfig(newExpense.name).distributionType !== "individual" && (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <strong>{newExpense.name}</strong> se împarte: {
                            getExpenseConfig(newExpense.name).distributionType === "apartment" ? "Pe apartament (egal)" :
                            getExpenseConfig(newExpense.name).distributionType === "person" ? "Pe persoană" : "Pe consum"
                          }
                        </div>
                      </div>
                      <input
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                        type="text"
                        inputMode="decimal"
                        placeholder="Suma totală (RON)"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                    </div>
                  )}
                  
                  <button 
                    onClick={handleAddExpense}
                    className="w-full mt-4 bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 flex items-center justify-center disabled:bg-gray-400"
                    disabled={!newExpense.name || 
                      (getExpenseConfig(newExpense.name).distributionType === "consumption" ? (!newExpense.unitPrice || !newExpense.billAmount) : 
                       !newExpense.amount)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adaugă Cheltuială
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">📋 Cheltuieli {currentMonth}</h3>
                <div className="text-right text-sm">
                  <div className="text-gray-600">
                    {associationExpenses.length} cheltuieli
                  </div>
                  <div className="font-semibold text-indigo-600">
                    Total: {associationExpenses.reduce((sum, expense) => {
                      return sum + (expense.isUnitBased ? expense.billAmount : expense.amount);
                    }, 0).toFixed(2)} RON
                  </div>
                </div>
              </div>
              {associationExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nu există cheltuieli adăugate</p>
                  <p className="text-gray-500 text-sm">Adaugă prima cheltuială pentru a calcula întreținerea</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {associationExpenses.map(expense => {
                    const config = getExpenseConfig(expense.name);
                    const totalApartments = getAssociationApartments().length;
                    const totalPersons = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
                    
                    let perUnitText = "";
                    if (config.distributionType === "apartment" && totalApartments > 0) {
                      perUnitText = ` • ${(expense.amount / totalApartments).toFixed(2)} RON/apt`;
                    } else if (config.distributionType === "person" && totalPersons > 0) {
                      perUnitText = ` • ${(expense.amount / totalPersons).toFixed(2)} RON/pers`;
                    } else if (config.distributionType === "consumption") {
                      perUnitText = ` • ${expense.unitPrice} RON/${expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}`;
                    } else if (config.distributionType === "individual") {
                      perUnitText = " • Sume individuale";
                    }
                    
                    return (
                      <div key={expense.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{expense.name}</span>
                          <span className="text-indigo-600 font-bold">
                            {expense.isUnitBased ? 
                              `${expense.billAmount} RON` :
                              `${expense.amount} RON`
                            }
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {config.distributionType === "apartment" ? "Pe apartament (egal)" : 
                           config.distributionType === "individual" ? "Pe apartament (individual)" :
                           config.distributionType === "person" ? "Pe persoană" : "Pe consum"}
                          <span className="text-green-600 font-medium">{perUnitText}</span>
                        </div>
                        
                        {config.distributionType === "consumption" && (
                          <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                            <div className="text-gray-700">Total consum: {Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}</div>
                            <div className="text-gray-700">Total calculat: {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice).toFixed(2)} RON</div>
                            <div className={`font-medium ${(() => {
                              const totalCalculat = Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice;
                              const diferenta = totalCalculat - expense.billAmount;
                              const procentDiferenta = expense.billAmount > 0 ? Math.abs(diferenta / expense.billAmount * 100) : 0;
                              
                              if (procentDiferenta < 5) return "text-green-600";
                              else if (procentDiferenta <= 10) return "text-yellow-600";
                              else return "text-red-600";
                            })()}`}>
                              Diferența: {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount).toFixed(2)} RON ({expense.billAmount > 0 ? Math.abs((Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount) / expense.billAmount * 100).toFixed(1) : "0.0"}%)
                            </div>
                          </div>
                        )}
                        
                        {config.distributionType === "individual" && (
                          <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                            <div className="text-gray-700">Total introdus: {Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} RON</div>
                            <div className={`font-medium ${(() => {
                              const totalIntrodus = Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                              const diferenta = totalIntrodus - expense.amount;
                              const procentDiferenta = expense.amount > 0 ? Math.abs(diferenta / expense.amount * 100) : 0;
                              
                              if (procentDiferenta < 5) return "text-green-600";
                              else if (procentDiferenta <= 10) return "text-yellow-600";
                              else return "text-red-600";
                            })()}`}>
                              Diferența: {(Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - expense.amount).toFixed(2)} RON ({expense.amount > 0 ? Math.abs((Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - expense.amount) / expense.amount * 100).toFixed(1) : "0.0"}%)
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-4">
                {isMonthReadOnly(currentMonth) ? 
                  "📊 Consumuri & Sume (PUBLICATĂ)" :
                  "📊 Introducere Consumuri & Sume"
                }
              </h3>
              {associationExpenses.filter(exp => getExpenseConfig(exp.name).distributionType === "consumption" || getExpenseConfig(exp.name).distributionType === "individual").length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">📏</div>
                  <p className="text-gray-600 text-sm">Nu există cheltuieli pe consum sau individuale</p>
                  <p className="text-gray-500 text-xs">Adaugă cheltuieli precum Apă, Căldură, etc.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {associationExpenses
                    .filter(expense => getExpenseConfig(expense.name).distributionType === "consumption" || getExpenseConfig(expense.name).distributionType === "individual")
                    .map(expense => {
                      const expenseSettings = getExpenseConfig(expense.name);
                      return (
                        <div key={expense.id} className="border rounded-lg p-3">
                          <div className="font-medium text-sm mb-3 text-indigo-600 flex items-center">
                            {isMonthReadOnly(currentMonth) && (
                              <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded mr-2">🔒 PUBLICATĂ</span>
                            )}
                            {expense.name} - {expenseSettings.distributionType === "individual" ? 
                              `Sume individuale - Total: ${expense.amount} RON` :
                              expense.isUnitBased ? 
                                `${expense.unitPrice} RON/${expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"} | Factură: ${expense.billAmount} RON` :
                                `${expense.amount} RON total`
                            }
                          </div>
                          <div className="space-y-2">
                            {getAssociationApartments().map(apartment => {
                              if (expenseSettings.distributionType === "individual") {
                                return (
                                  <div key={apartment.id} className="flex items-center gap-2">
                                    <span className="text-xs w-12">Apt {apartment.number}</span>
                                    {isMonthReadOnly(currentMonth) ? (
                                      <div className="flex-1 p-1 bg-gray-100 border rounded text-xs text-gray-600">
                                        {expense.individualAmounts?.[apartment.id] || "0"} RON
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="RON"
                                        value={expense.individualAmounts?.[apartment.id] || ""}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                                            const normalizedValue = value.replace(',', '.');
                                            updateExpenseIndividualAmount(expense.id, apartment.id, normalizedValue);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const value = e.target.value.replace(',', '.');
                                          const numericValue = parseFloat(value) || 0;
                                          updateExpenseIndividualAmount(expense.id, apartment.id, numericValue);
                                        }}
                                        className="flex-1 p-1 border rounded text-xs"
                                      />
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={apartment.id} className="flex items-center gap-2">
                                    <span className="text-xs w-12">Apt {apartment.number}</span>
                                    {isMonthReadOnly(currentMonth) ? (
                                      <div className="flex-1 p-1 bg-gray-100 border rounded text-xs text-gray-600">
                                        {expense.consumption[apartment.id] || "0"} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}
                                        value={expense.consumption[apartment.id] || ""}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                                            const normalizedValue = value.replace(',', '.');
                                            updateExpenseConsumption(expense.id, apartment.id, normalizedValue);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const value = e.target.value.replace(',', '.');
                                          const numericValue = parseFloat(value) || 0;
                                          updateExpenseConsumption(expense.id, apartment.id, numericValue);
                                        }}
                                        className="flex-1 p-1 border rounded text-xs"
                                      />
                                    )}
                                    {(parseFloat(expense.consumption[apartment.id]) || 0) > 0 && (
                                      <span className="text-xs text-green-600 w-16">
                                        {((parseFloat(expense.consumption[apartment.id]) || 0) * expense.unitPrice).toFixed(2)} RON
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                            })}
                          </div>
                          
                          {/* Total pentru consumuri */}
                          {expenseSettings.distributionType === "consumption" && (
                            <div className="mt-3 pt-3 border-t border-gray-200 text-xs">
                              <div className="text-gray-700">Total consum: {Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} {expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"}</div>
                              <div className="text-gray-700">Total calculat: {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice).toFixed(2)} RON</div>
                              <div className={`font-medium ${(() => {
                                const totalCalculat = Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice;
                                const diferenta = totalCalculat - expense.billAmount;
                                const procentDiferenta = expense.billAmount > 0 ? Math.abs(diferenta / expense.billAmount * 100) : 0;
                                
                                if (procentDiferenta < 5) return "text-green-600";
                                else if (procentDiferenta <= 10) return "text-yellow-600";
                                else return "text-red-600";
                              })()}`}>
                                Diferența: {(Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount).toFixed(2)} RON ({expense.billAmount > 0 ? Math.abs((Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) * expense.unitPrice - expense.billAmount) / expense.billAmount * 100).toFixed(1) : "0.0"}%)
                              </div>
                            </div>
                          )}
                          
                          {/* Total pentru sume individuale */}
                          {expenseSettings.distributionType === "individual" && (
                            <div className="mt-3 pt-3 border-t border-gray-200 text-xs">
                              <div className="text-gray-700">Total introdus: {Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} RON</div>
                              <div className={`font-medium ${(() => {
                                const totalIntrodus = Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                                const diferenta = totalIntrodus - expense.amount;
                                const procentDiferenta = expense.amount > 0 ? Math.abs(diferenta / expense.amount * 100) : 0;
                                
                                if (procentDiferenta < 5) return "text-green-600";
                                else if (procentDiferenta <= 10) return "text-yellow-600";
                                else return "text-red-600";
                              })()}`}>
                                Diferența: {(Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - expense.amount).toFixed(2)} RON ({expense.amount > 0 ? Math.abs((Object.values(expense.individualAmounts || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - expense.amount) / expense.amount * 100).toFixed(1) : "0.0"}%)
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {maintenanceData.length > 0 ? (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 bg-indigo-50 border-b">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">🧾 Tabel Întreținere - {currentMonth}</h3>
                    {association && getAssociationApartments().length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {(() => {
                          const associationBlocks = blocks.filter(block => block.associationId === association.id);
                          const associationStairs = stairs.filter(stair => 
                            associationBlocks.some(block => block.id === stair.blockId)
                          );
                          const apartmentCount = getAssociationApartments().length;
                          const personCount = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
                          
                          let structureText = "";
                          if (associationBlocks.length === 1 && associationStairs.length === 1) {
                            structureText = `${associationBlocks[0].name} - ${associationStairs[0].name}`;
                          } else if (associationBlocks.length === 1) {
                            structureText = `${associationBlocks[0].name} - ${associationStairs.length} scări`;
                          } else {
                            structureText = `${associationBlocks.length} blocuri - ${associationStairs.length} scări`;
                          }
                          
                          return `${association.name} • ${structureText} • ${apartmentCount} apartamente - ${personCount} persoane`;
                        })()}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      {isMonthReadOnly(currentMonth) ? (
                        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          📋 PUBLICATĂ
                        </span>
                      ) : (
                        <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          🔧 ÎN LUCRU
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {/* Buton Export PDF Avizier */}
                    {maintenanceData.length > 0 && (
                      <button 
                        onClick={exportPDFAvizier}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                        title="Exportă PDF pentru avizier (fără nume proprietari)"
                      >
                        📄 Export PDF Avizier
                      </button>
                    )}
                    <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Export PDF Detaliat
                    </button>
                  </div>
                </div>
                
                <div className="flex space-x-4 border-t border-indigo-100 pt-3">
                  <button
                    onClick={() => setActiveMaintenanceTab("simple")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeMaintenanceTab === "simple" 
                        ? "bg-indigo-600 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Tabel Simplificat
                  </button>
                  <button
                    onClick={() => setActiveMaintenanceTab("detailed")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeMaintenanceTab === "detailed" 
                        ? "bg-indigo-600 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Tabel Detaliat
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                {activeMaintenanceTab === "simple" ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Apartament</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Proprietar</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Persoane</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Întreținere Curentă</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Restanță</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Total Întreținere</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Penalități</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Total Datorat</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {maintenanceData.map(data => (
                        <tr key={data.apartmentId} className="hover:bg-gray-50">
                          <td className="px-3 py-3 font-semibold">Ap. {data.apartment}</td>
                          <td className="px-3 py-3 text-blue-600 font-medium text-sm">{data.owner}</td>
                          <td className="px-3 py-3 text-center">{data.persons}</td>
                          <td className="px-3 py-3 font-bold text-indigo-600">{data.currentMaintenance.toFixed(2)}</td>
                          <td className="px-3 py-3 font-bold text-red-600">{data.restante.toFixed(2)}</td>
                          <td className="px-3 py-3 font-bold text-purple-600">{data.totalMaintenance.toFixed(2)}</td>
                          <td className="px-3 py-3 font-bold text-orange-600">{data.penalitati.toFixed(2)}</td>
                          <td className="px-3 py-3 font-bold text-gray-800 text-lg">{data.totalDatorat.toFixed(2)}</td>
                          <td className="px-3 py-3">
                            {isMonthReadOnly(currentMonth) ? (
                              data.paid ? (
                                <span className="flex items-center text-green-600">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Plătit
                                </span>
                              ) : (
                                <span className="flex items-center text-red-600">
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Restant
                                </span>
                              )
                            ) : (
                              <span className="flex items-center text-gray-500">
                                <div className="w-4 h-4 mr-1 bg-gray-300 rounded-full"></div>
                                În lucru
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {isMonthReadOnly(currentMonth) ? (
                              <button 
                                onClick={() => togglePayment(data.apartmentId)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                  data.paid 
                                    ? "bg-red-100 text-red-700 hover:bg-red-200" 
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                {data.paid ? "Marchează restant" : "Marchează plătit"}
                              </button>
                            ) : (
                              <span className="text-gray-500 text-sm">
                                Publică luna pentru încasări
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="px-3 py-3 font-semibold">TOTAL ÎNCASAT:</td>
                        <td className="px-3 py-3 font-bold text-green-600">
                          {maintenanceData.filter(d => d.paid).reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
                        </td>
                        <td colSpan="2" className="px-3 py-3 font-semibold text-right">TOTAL RESTANȚE:</td>
                        <td colSpan="4" className="px-3 py-3 font-bold text-red-600">
                          {maintenanceData.filter(d => !d.paid).reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">Apartament</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Proprietar</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Persoane</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Întreținere Curentă</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Restanță</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Total Întreținere</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Penalități</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-700 border-r-2 border-gray-300">Total Datorat</th>
                        {expenses
                          .filter(exp => exp.associationId === association?.id && exp.month === currentMonth)
                          .map(expense => (
                            <th key={expense.id} className="px-3 py-3 text-left text-sm font-medium text-gray-700 bg-blue-50">
                              {expense.name}
                            </th>
                          ))
                        }
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {maintenanceData.map(data => (
                        <tr key={data.apartmentId} className="hover:bg-gray-50">
                          <td className="px-3 py-3 font-semibold sticky left-0 bg-white z-10">Ap. {data.apartment}</td>
                          <td className="px-3 py-3 text-blue-600 font-medium text-sm">{data.owner}</td>
                          <td className="px-3 py-3 text-center">{data.persons}</td>
                          <td className="px-3 py-3 font-bold text-indigo-600">{data.currentMaintenance.toFixed(2)}</td>
                          <td className="px-3 py-3 font-bold text-red-600">{data.restante.toFixed(2)}</td>
                          <td className="px-3 py-3 font-bold text-purple-600">{data.totalMaintenance.toFixed(2)}</td>
                          <td className="px-3 py-3 font-bold text-orange-600">{data.penalitati.toFixed(2)}</td>
                          <td className="px-3 py-3 font-bold text-gray-800 text-lg border-r-2 border-gray-300">{data.totalDatorat.toFixed(2)}</td>
                          {expenses
                            .filter(exp => exp.associationId === association?.id && exp.month === currentMonth)
                            .map(expense => (
                              <td key={expense.id} className="px-3 py-3 text-sm">
                                {data.expenseDetails?.[expense.name] !== undefined ? 
                                  data.expenseDetails[expense.name].toFixed(2) : 
                                  '0.00'
                                }
                              </td>
                            ))
                          }
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="px-3 py-3 font-semibold sticky left-0 bg-gray-50 z-10">TOTAL:</td>
                        <td className="px-3 py-3 font-bold text-indigo-600">
                          {maintenanceData.reduce((sum, d) => sum + d.currentMaintenance, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-bold text-red-600">
                          {maintenanceData.reduce((sum, d) => sum + d.restante, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-bold text-purple-600">
                          {maintenanceData.reduce((sum, d) => sum + d.totalMaintenance, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-bold text-orange-600">
                          {maintenanceData.reduce((sum, d) => sum + d.penalitati, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-bold text-gray-800 text-lg border-r-2 border-gray-300">
                          {maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
                        </td>
                        {expenses
                          .filter(exp => exp.associationId === association?.id && exp.month === currentMonth)
                          .map(expense => (
                            <td key={expense.id} className="px-3 py-3 font-bold text-sm bg-blue-50">
                              {maintenanceData.reduce((sum, d) => sum + (d.expenseDetails?.[expense.name] || 0), 0).toFixed(2)}
                            </td>
                          ))
                        }
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Calculator className="w-20 h-20 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Nu există date pentru tabelul de întreținere</h3>
              <p className="text-gray-600">Adaugă cheltuieli lunare pentru a genera tabelul de întreținere.</p>
            </div>
          )}
        </div>
      </div>
    );
  })()
)}


        </main>
      </div>
    </div>
  );
}
