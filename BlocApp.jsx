import React, { useState } from "react";
import { Building2, Calculator, Plus, CheckCircle, XCircle, ArrowLeft, Settings } from "lucide-react";

export default function BlocApp() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState("simple");
  const [showInitialBalances, setShowInitialBalances] = useState(false);
  const [showAdjustBalances, setShowAdjustBalances] = useState(false);
  const [adjustModalData, setAdjustModalData] = useState([]);
  const [hasInitialBalances, setHasInitialBalances] = useState(false);
  const [associations, setAssociations] = useState([]);
  const [selectedAssociation, setSelectedAssociation] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [stairs, setStairs] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [monthlyTables, setMonthlyTables] = useState({});
  const [monthlyBalances, setMonthlyBalances] = useState({});
  const [monthStatuses, setMonthStatuses] = useState({});
  const [availableMonths, setAvailableMonths] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" }));
  const [customExpenses, setCustomExpenses] = useState([]);
  const [expenseConfig, setExpenseConfig] = useState({});
  const [expenseParticipation, setExpenseParticipation] = useState({});
  const [selectedExpenseForConfig, setSelectedExpenseForConfig] = useState(null);
  const [disabledExpenses, setDisabledExpenses] = useState({});
  const [showExpenseConfig, setShowExpenseConfig] = useState(false);

  const [newAssociation, setNewAssociation] = useState({ name: "", address: "" });
  const [newBlock, setNewBlock] = useState({ name: "" });
  const [newStair, setNewStair] = useState({ name: "", blockId: "" });
  const [newApartment, setNewApartment] = useState({ number: "", persons: "", stairId: "", owner: "" });
  const [newExpense, setNewExpense] = useState({ name: "", amount: "", distributionType: "", isUnitBased: false, unitPrice: "", billAmount: "" });
  const [newCustomExpense, setNewCustomExpense] = useState({ name: "" });
  
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
    const customExpensesList = customExpenses.filter(exp => exp.associationId === selectedAssociation?.id);
    const disabledKey = `${selectedAssociation?.id}-${currentMonth}`;
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
    const disabledKey = `${selectedAssociation?.id}-${currentMonth}`;
    const monthDisabledExpenses = disabledExpenses[disabledKey] || [];
    
    // Cheltuieli standard dezactivate
    const disabledDefaultExpenses = defaultExpenseTypes.filter(exp => 
      monthDisabledExpenses.includes(exp.name)
    );
    
    // Cheltuieli custom dezactivate
    const customExpensesList = customExpenses.filter(exp => exp.associationId === selectedAssociation?.id);
    const disabledCustomExpenses = customExpensesList.filter(exp => 
      monthDisabledExpenses.includes(exp.name)
    );
    
    return [...disabledDefaultExpenses, ...disabledCustomExpenses];
  };

  const toggleExpenseStatus = (expenseName, disable = true) => {
    const disabledKey = `${selectedAssociation?.id}-${currentMonth}`;
    
    setDisabledExpenses(prev => {
      const currentDisabled = prev[disabledKey] || [];
      
      if (disable) {
        // Adaugă în lista de dezactivate
        return {
          ...prev,
          [disabledKey]: [...currentDisabled, expenseName]
        };
      } else {
        // Elimină din lista de dezactivate (reactivează)
        return {
          ...prev,
          [disabledKey]: currentDisabled.filter(name => name !== expenseName)
        };
      }
    });
  };

  const getAvailableExpenseTypes = () => {
    const associationExpenses = expenses.filter(exp => exp.associationId === selectedAssociation?.id && exp.month === currentMonth);
    const usedExpenseNames = associationExpenses.map(exp => exp.name);
    
    return getAssociationExpenseTypes().filter(expenseType => 
      !usedExpenseNames.includes(expenseType.name)
    );
  };

  const addAssociation = () => {
    if (!newAssociation.name || !newAssociation.address) return;
    
    const association = {
      id: Date.now(),
      name: newAssociation.name,
      address: newAssociation.address,
      createdAt: new Date().toLocaleDateString("ro-RO")
    };
    setAssociations([...associations, association]);
    setSelectedAssociation(association);
    setNewAssociation({ name: "", address: "" });
    
    // Inițializează lunile pentru noua asociație
    initializeMonths();
  };

  const addBlock = () => {
    if (!newBlock.name || !selectedAssociation) return;
    
    const block = {
      id: Date.now(),
      name: newBlock.name,
      associationId: selectedAssociation.id
    };
    setBlocks([...blocks, block]);
    setNewBlock({ name: "" });
  };

  const addStair = () => {
    if (!newStair.name || !newStair.blockId) return;
    
    const stair = {
      id: Date.now(),
      name: newStair.name,
      blockId: parseInt(newStair.blockId)
    };
    setStairs([...stairs, stair]);
    setNewStair({ name: "", blockId: "" });
  };

  const addApartment = () => {
    if (!newApartment.number || !newApartment.persons || !newApartment.stairId || !newApartment.owner) return;
    
    const apartment = {
      id: Date.now(),
      number: parseInt(newApartment.number),
      persons: parseInt(newApartment.persons),
      stairId: parseInt(newApartment.stairId),
      owner: newApartment.owner
    };
    setApartments([...apartments, apartment]);
    setNewApartment({ number: "", persons: "", stairId: "", owner: "" });
  };

  const addCustomExpense = () => {
    if (!newCustomExpense.name || !selectedAssociation) return;
    
    const customExpense = {
      id: Date.now(),
      name: newCustomExpense.name,
      associationId: selectedAssociation.id,
      defaultDistribution: "apartment"
    };
    setCustomExpenses([...customExpenses, customExpense]);
    setNewCustomExpense({ name: "" });
  };

  const getExpenseConfig = (expenseType) => {
    const key = `${selectedAssociation?.id}-${expenseType}`;
    const config = expenseConfig[key];
    if (config) return config;
    
    const defaultExpense = defaultExpenseTypes.find(exp => exp.name === expenseType);
    const customExpense = customExpenses.find(exp => exp.name === expenseType);
    return {
      distributionType: defaultExpense?.defaultDistribution || customExpense?.defaultDistribution || "apartment"
    };
  };

  const updateExpenseConfig = (expenseType, config) => {
    const key = `${selectedAssociation?.id}-${expenseType}`;
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
    if (!selectedAssociation) return [];
    
    const associationBlocks = blocks.filter(block => block.associationId === selectedAssociation.id);
    const associationStairs = stairs.filter(stair => 
      associationBlocks.some(block => block.id === stair.blockId)
    );
    return apartments.filter(apt => 
      associationStairs.some(stair => stair.id === apt.stairId)
    );
  };

  const getCurrentMonthTable = () => {
    const key = `${selectedAssociation?.id}-${currentMonth}`;
    return monthlyTables[key] || null;
  };

  const getApartmentBalance = (apartmentId) => {
    const monthKey = `${selectedAssociation?.id}-${currentMonth}`;
    const monthBalances = monthlyBalances[monthKey] || {};
    return monthBalances[apartmentId] || { restante: 0, penalitati: 0 };
  };

  const setApartmentBalance = (apartmentId, balance) => {
    const monthKey = `${selectedAssociation?.id}-${currentMonth}`;
    setMonthlyBalances(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        [apartmentId]: balance
      }
    }));
  };

  const addExpense = () => {
    if (!newExpense.name || !selectedAssociation) return;
    
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
    
    const expense = {
      id: Date.now(),
      name: newExpense.name,
      amount: isConsumptionBased ? 0 : parseFloat(newExpense.amount || 0),
      distributionType: expenseSettings.distributionType,
      isUnitBased: isConsumptionBased,
      unitPrice: isConsumptionBased ? parseFloat(newExpense.unitPrice) : 0,
      billAmount: isConsumptionBased ? parseFloat(newExpense.billAmount) : 0,
      consumption: {},
      individualAmounts: {},
      associationId: selectedAssociation.id,
      month: currentMonth
    };
    setExpenses([...expenses, expense]);
    setNewExpense({ name: "", amount: "", distributionType: "", isUnitBased: false, unitPrice: "", billAmount: "" });
  };

  const updateExpenseConsumption = (expenseId, apartmentId, consumption) => {
    setExpenses(prev => prev.map(expense => 
      expense.id === expenseId 
        ? { ...expense, consumption: { ...expense.consumption, [apartmentId]: consumption } }
        : expense
    ));
  };

  const updateExpenseIndividualAmount = (expenseId, apartmentId, amount) => {
    setExpenses(prev => prev.map(expense => 
      expense.id === expenseId 
        ? { ...expense, individualAmounts: { ...expense.individualAmounts, [apartmentId]: amount } }
        : expense
    ));
  };

  const saveInitialBalances = () => {
    setHasInitialBalances(true);
    setShowInitialBalances(false);
  };

  const togglePayment = (apartmentId) => {
    const key = `${selectedAssociation?.id}-${currentMonth}`;
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
      const nextMonthKey = `${selectedAssociation?.id}-${nextMonth}`;
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
      exp.associationId === selectedAssociation?.id && exp.month === currentMonth
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

  if (currentView === "dashboard") {
    return (
      <div className={`min-h-screen p-4 ${
        currentMonth === new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
          ? "bg-gradient-to-br from-blue-50 to-indigo-100"
          : "bg-gradient-to-br from-green-50 to-emerald-100"
      }`}>
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
              <div className="flex items-center justify-center mb-4">
                <Building2 className="w-12 h-12 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">BlocApp</h1>
                  {selectedAssociation && (
                    <div className="flex items-center justify-center mt-1">
                      <div className="flex items-center space-x-3">
                        <select
                          value={currentMonth}
                          onChange={(e) => setCurrentMonth(e.target.value)}
                          className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          {getAvailableMonths().map(month => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
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
                  )}
                </div>
              </div>
              <p className="text-gray-600">Gestionează ușor întreținerea blocului</p>
            </div>
          </header>

          {!selectedAssociation && (
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-8">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">🚀 Configurare Inițială</h3>
              <p className="text-yellow-700 mb-4">
                Pentru a începe, trebuie să configurezi structura asociației (se face doar o dată).
              </p>
              
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    value={newAssociation.name}
                    onChange={(e) => setNewAssociation({...newAssociation, name: e.target.value})}
                    placeholder="Numele asociației (ex: Asociația Primăverii 12)"
                    className="w-full p-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                  <input
                    value={newAssociation.address}
                    onChange={(e) => setNewAssociation({...newAssociation, address: e.target.value})}
                    placeholder="Adresa completă"
                    className="w-full p-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
                <button 
                  onClick={addAssociation}
                  className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 flex items-center disabled:bg-gray-400"
                  disabled={!newAssociation.name || !newAssociation.address}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Creează Asociația
                </button>
              </div>
            </div>
          )}

          {selectedAssociation && getAssociationApartments().length === 0 && (
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl mb-8">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Completează Structura</h3>
              <p className="text-blue-700 mb-4">
                Asociația a fost creată! Acum adaugă blocurile, scările și apartamentele.
              </p>
              <button 
                onClick={() => setCurrentView("setup")}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Adaugă Blocuri și Apartamente
              </button>
            </div>
          )}

          {selectedAssociation && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">📍 {selectedAssociation.name}</h3>
                  <p className="text-gray-600">{selectedAssociation.address}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {getAssociationApartments().length} apartamente • 
                    {getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0)} persoane
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setCurrentView("maintenance")}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-lg"
                  >
                    📊 Tabel Întreținere
                  </button>
                  <button 
                    onClick={() => setCurrentView("setup")}
                    className="bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedAssociation && getAssociationApartments().length > 0 && (
            <div className="grid grid-cols-6 gap-4 mb-8 overflow-x-auto">
              <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
                <div className="text-2xl font-bold text-green-600">{blocks.filter(b => b.associationId === selectedAssociation.id).length}</div>
                <div className="text-sm text-gray-600">Blocuri</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow border text-center min-w-0">
                <div className="text-2xl font-bold text-purple-600">
                  {stairs.filter(s => blocks.some(b => b.id === s.blockId && b.associationId === selectedAssociation.id)).length}
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
                  {expenses.filter(e => e.associationId === selectedAssociation.id && e.month === currentMonth).length}
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
          )}

          {selectedAssociation && getAssociationApartments().length > 0 && (
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
          )}
        </div>
      </div>
    );
  }

  // Setup View
  if (currentView === "setup") {
    const associationBlocks = blocks.filter(block => block.associationId === selectedAssociation?.id);
    const availableStairs = stairs.filter(stair => 
      associationBlocks.some(block => block.id === stair.blockId)
    );
    const allApartments = getAssociationApartments();

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">⚙️ Configurare Asociație</h2>
            <button 
              onClick={() => setCurrentView("dashboard")}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Înapoi
            </button>
          </div>

          <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Blocks Section */}
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
                    onClick={addBlock}
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

            {/* Stairs Section */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-4 bg-purple-50 border-b">
                <h3 className="text-lg font-semibold">🔼 Scări ({availableStairs.length})</h3>
              </div>
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <select 
                    value={newStair.blockId}
                    onChange={(e) => setNewStair({...newStair, blockId: e.target.value})}
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
                      onClick={addStair}
                      className="bg-purple-500 text-white px-3 py-2 rounded-lg hover:bg-purple-600 text-sm"
                      disabled={!newStair.name || !newStair.blockId}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableStairs.map(stair => {
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

            {/* Apartments Section */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-4 bg-orange-50 border-b">
                <h3 className="text-lg font-semibold">👥 Apartamente ({allApartments.length})</h3>
              </div>
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <select 
                    value={newApartment.stairId}
                    onChange={(e) => setNewApartment({...newApartment, stairId: e.target.value})}
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
                  
                  <input
                    value={newApartment.owner}
                    onChange={(e) => setNewApartment({...newApartment, owner: e.target.value})}
                    placeholder="Numele proprietarului"
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                  
                  <div className="flex gap-2">
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
                      placeholder="Nr apt"
                      className="flex-1 p-2 border rounded-lg text-sm"
                    />
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
                      placeholder="Nr pers"
                      className="flex-1 p-2 border rounded-lg text-sm"
                    />
                    <button 
                      onClick={addApartment}
                      className="bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 text-sm"
                      disabled={!newApartment.number || !newApartment.persons || !newApartment.stairId || !newApartment.owner}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allApartments.map(apartment => {
                    const stair = stairs.find(s => s.id === apartment.stairId);
                    const block = blocks.find(b => b.id === stair?.blockId);
                    return (
                      <div key={apartment.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">Apt {apartment.number} - {apartment.owner}</div>
                        <div className="text-gray-600">{block?.name} - {stair?.name} • {apartment.persons} pers</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Expenses Section */}
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
                      onClick={addCustomExpense}
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
                                  setCustomExpenses(prev => prev.filter(exp => exp.name !== expenseType.name));
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
                                    setCustomExpenses(prev => prev.filter(exp => exp.name !== expenseType.name));
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
                onClick={() => setCurrentView("dashboard")}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
              >
                Mergi la Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Maintenance View 
  if (currentView === "maintenance") {
    const associationExpenses = expenses.filter(exp => exp.associationId === selectedAssociation?.id && exp.month === currentMonth);
    
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
                <h2 className="text-2xl font-bold text-gray-800">📊 Tabel Întreținere - {selectedAssociation?.name}</h2>
                {selectedAssociation && getAssociationApartments().length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {(() => {
                      const associationBlocks = blocks.filter(block => block.associationId === selectedAssociation.id);
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
                  onClick={() => setCurrentView("dashboard")}
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
                    onClick={() => {
                      adjustModalData.forEach(apartmentData => {
                        setApartmentBalance(apartmentData.apartmentId, {
                          restante: Math.round(apartmentData.restanteAjustate * 100) / 100,
                          penalitati: Math.round(apartmentData.penalitatiAjustate * 100) / 100
                        });
                      });
                      
                      setShowAdjustBalances(false);
                      setAdjustModalData([]);
                      
                      const key = `${selectedAssociation?.id}-${currentMonth}`;
                      setMonthlyTables(prev => {
                        const newTables = { ...prev };
                        delete newTables[key];
                        return newTables;
                      });
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
                        onClick={addCustomExpense}
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
                                    setCustomExpenses(prev => prev.filter(exp => exp.name !== expenseType.name));
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
                                      setCustomExpenses(prev => prev.filter(exp => exp.name !== expenseType.name));
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
                    onClick={addExpense}
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
                    {selectedAssociation && getAssociationApartments().length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {(() => {
                          const associationBlocks = blocks.filter(block => block.associationId === selectedAssociation.id);
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
                          
                          return `${selectedAssociation.name} • ${structureText} • ${apartmentCount} apartamente - ${personCount} persoane`;
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
                    <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Export PDF
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
                          .filter(exp => exp.associationId === selectedAssociation?.id && exp.month === currentMonth)
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
                            .filter(exp => exp.associationId === selectedAssociation?.id && exp.month === currentMonth)
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
                          .filter(exp => exp.associationId === selectedAssociation?.id && exp.month === currentMonth)
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
  }

  return null;
}
