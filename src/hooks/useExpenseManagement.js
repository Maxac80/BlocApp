import { useState, useCallback, useMemo } from 'react';
import { defaultExpenseTypes } from '../data/expenseTypes';

/**
 * 💰 Custom Hook pentru Gestionarea Cheltuielilor
 * 
 * RESPONSABILITĂȚI:
 * - Configurarea tipurilor de cheltuieli
 * - Gestionarea participării apartamentelor
 * - Calculul și distribuția cheltuielilor
 * - Adăugarea cheltuielilor noi
 * - Actualizarea consumurilor și sumelor individuale
 */
export const useExpenseManagement = ({
  association,
  expenses,
  customExpenses,
  currentMonth,
  disabledExpenses,
  addMonthlyExpense,
  updateMonthlyExpense,
  addCustomExpense,
  deleteCustomExpense
}) => {
  // 📊 STATE LOCAL PENTRU CONFIGURĂRI
  const [expenseConfig, setExpenseConfig] = useState({});
  const [expenseParticipation, setExpenseParticipation] = useState({});
  const [newExpense, setNewExpense] = useState({
    name: "",
    amount: "",
    distributionType: "",
    isUnitBased: false,
    unitPrice: "",
    billAmount: ""
  });
  const [newCustomExpense, setNewCustomExpense] = useState({ name: "" });

  // 🔧 GESTIONAREA CONFIGURAȚIEI CHELTUIELILOR
  const getExpenseConfig = useCallback((expenseType) => {
    const key = `${association?.id}-${expenseType}`;
    const config = expenseConfig[key];
    if (config) return config;
    
    const defaultExpense = defaultExpenseTypes.find(exp => exp.name === expenseType);
    const customExpense = customExpenses.find(exp => exp.name === expenseType);
    return {
      distributionType: defaultExpense?.defaultDistribution || customExpense?.defaultDistribution || "apartment"
    };
  }, [association?.id, expenseConfig, customExpenses]);

  const updateExpenseConfig = useCallback((expenseType, config) => {
    const key = `${association?.id}-${expenseType}`;
    setExpenseConfig(prev => ({
      ...prev,
      [key]: config
    }));
  }, [association?.id]);

  // 🏠 GESTIONAREA PARTICIPĂRII APARTAMENTELOR
  const setApartmentParticipation = useCallback((apartmentId, expenseType, participationType, value = null) => {
    const key = `${apartmentId}-${expenseType}`;
    setExpenseParticipation(prev => ({
      ...prev,
      [key]: { type: participationType, value: value }
    }));
  }, []);

  const getApartmentParticipation = useCallback((apartmentId, expenseType) => {
    const key = `${apartmentId}-${expenseType}`;
    return expenseParticipation[key] || { type: "integral", value: null };
  }, [expenseParticipation]);

  // 📋 TIPURILE DE CHELTUIELI ASOCIAȚIEI - OPTIMIZAT
  const getAssociationExpenseTypes = useCallback(() => {
    if (!defaultExpenseTypes || !association?.id) return [];
    
    const disabledKey = `${association.id}-${currentMonth}`;
    const monthDisabledExpenses = disabledExpenses[disabledKey] || [];
    
    const activeDefaultExpenses = defaultExpenseTypes.filter(exp => 
      !monthDisabledExpenses.includes(exp.name)
    );
    
    const customExpensesList = customExpenses.filter(exp => exp.associationId === association.id);
    const activeCustomExpenses = customExpensesList.filter(exp => 
      !monthDisabledExpenses.includes(exp.name)
    );
    
    return [...activeDefaultExpenses, ...activeCustomExpenses];
  }, [association?.id, currentMonth, disabledExpenses, customExpenses]);

  // 📋 TIPURILE DE CHELTUIELI DEZACTIVATE
  const getDisabledExpenseTypes = useCallback(() => {
    if (!association?.id) return [];
    
    const disabledKey = `${association.id}-${currentMonth}`;
    const monthDisabledExpenses = disabledExpenses[disabledKey] || [];
    
    // Cheltuieli standard dezactivate
    const disabledDefaultExpenses = defaultExpenseTypes.filter(exp => 
      monthDisabledExpenses.includes(exp.name)
    );
    
    // Cheltuieli custom dezactivate
    const customExpensesList = customExpenses.filter(exp => exp.associationId === association.id);
    const disabledCustomExpenses = customExpensesList.filter(exp => 
      monthDisabledExpenses.includes(exp.name)
    );
    
    return [...disabledDefaultExpenses, ...disabledCustomExpenses];
  }, [association?.id, customExpenses, currentMonth, disabledExpenses]);

  // 📋 TIPURILE DE CHELTUIELI DISPONIBILE PENTRU ADĂUGARE - OPTIMIZAT
  const getAvailableExpenseTypes = useCallback(() => {
    if (!association?.id) return [];
    
    const associationExpenses = expenses.filter(exp => 
      exp.associationId === association.id && exp.month === currentMonth
    );
    
    const allAvailableExpenses = getAssociationExpenseTypes();
    
    // Permite re-adăugarea pentru cheltuielile pe consum și individuale
    const usedExpenseNames = associationExpenses.filter(exp => {
      const config = getExpenseConfig(exp.name);
      // Exclude doar cheltuielile care NU sunt pe consum și NU sunt individuale
      return config.distributionType !== "consumption" && config.distributionType !== "individual";
    }).map(exp => exp.name);
    
    return allAvailableExpenses.filter(expenseType => 
      !usedExpenseNames.includes(expenseType.name)
    );
  }, [association?.id, expenses, currentMonth, getAssociationExpenseTypes, getExpenseConfig]);

  // ➕ ADĂUGAREA CHELTUIELILOR - OPTIMIZAT
  const handleAddExpense = useCallback(async () => {
    if (!newExpense.name || !association) {
      return false;
    }
    
    const expenseSettings = getExpenseConfig(newExpense.name);
    const isConsumptionBased = expenseSettings.distributionType === "consumption";
    const isIndividualBased = expenseSettings.distributionType === "individual";
    
    // Validări
    if (isConsumptionBased && (!newExpense.unitPrice || !newExpense.billAmount)) {
      alert("Pentru cheltuielile pe consum trebuie să introduci atât prețul pe unitate cât și totalul facturii!");
      return false;
    }
    
    if (!isConsumptionBased && !isIndividualBased && !newExpense.amount) {
      alert("Introduceți suma cheltuielii!");
      return false;
    }
    
    if (isIndividualBased && !newExpense.amount) {
      alert("Introduceți suma totală pentru cheltuiala individuală!");
      return false;
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
      
      // Reset form
      setNewExpense({
        name: "",
        amount: "",
        distributionType: "",
        isUnitBased: false,
        unitPrice: "",
        billAmount: ""
      });
      
      return true;
    } catch (error) {
      console.error('❌ Eroare la adăugarea cheltuielii:', error);
      alert('Eroare la adăugarea cheltuielii: ' + error.message);
      return false;
    }
  }, [newExpense, association, getExpenseConfig, addMonthlyExpense, currentMonth]);

  // ➕ ADĂUGAREA CHELTUIELILOR PERSONALIZATE - OPTIMIZAT
  const handleAddCustomExpense = useCallback(async () => {
    if (!newCustomExpense.name || !association) {
      return false;
    }
    
    try {
      await addCustomExpense({
        name: newCustomExpense.name,
        defaultDistribution: "apartment"
      });
      
      setNewCustomExpense({ name: "" });
      return true;
    } catch (error) {
      console.error('❌ Eroare la adăugarea cheltuielii personalizate:', error);
      alert('Eroare la adăugarea cheltuielii personalizate: ' + error.message);
      return false;
    }
  }, [newCustomExpense, association, addCustomExpense]);

  // 🔄 ACTUALIZAREA CONSUMURILOR - OPTIMIZAT
  const updateExpenseConsumption = useCallback(async (expenseId, apartmentId, consumption) => {
    try {
      const expense = expenses.find(exp => exp.id === expenseId);
      if (expense) {
        await updateMonthlyExpense(expenseId, {
          consumption: { ...expense.consumption, [apartmentId]: consumption }
        });
      }
    } catch (error) {
      console.error('❌ Eroare la actualizarea consumului:', error);
    }
  }, [expenses, updateMonthlyExpense]);

  // 💰 ACTUALIZAREA SUMELOR INDIVIDUALE - OPTIMIZAT
  const updateExpenseIndividualAmount = useCallback(async (expenseId, apartmentId, amount) => {
    try {
      const expense = expenses.find(exp => exp.id === expenseId);
      if (expense) {
        await updateMonthlyExpense(expenseId, {
          individualAmounts: { ...expense.individualAmounts, [apartmentId]: amount }
        });
      }
    } catch (error) {
      console.error('❌ Eroare la actualizarea sumei individuale:', error);
    }
  }, [expenses, updateMonthlyExpense]);

  // 🗑️ ȘTERGEREA CHELTUIELILOR PERSONALIZATE - OPTIMIZAT
  const handleDeleteCustomExpense = useCallback(async (expenseId, expenseName) => {
    if (window.confirm(`Ești sigur că vrei să ștergi cheltuiala personalizată "${expenseName}"?`)) {
      try {
        await deleteCustomExpense(expenseId);
        return true;
      } catch (error) {
        console.error('❌ Eroare la ștergerea cheltuielii personalizate:', error);
        alert('Eroare la ștergerea cheltuielii personalizate: ' + error.message);
        return false;
      }
    }
    return false;
  }, [deleteCustomExpense]);

  // 📊 STATISTICI CHELTUIELI - OPTIMIZAT
  const expenseStats = useMemo(() => {
    if (!association?.id) return null;
    
    const associationExpenses = expenses.filter(exp => 
      exp.associationId === association.id && exp.month === currentMonth
    );
    
    const totalAmount = associationExpenses.reduce((sum, exp) => {
      if (exp.distributionType === 'consumption') {
        return sum + (exp.billAmount || 0);
      }
      return sum + (exp.amount || 0);
    }, 0);
    
    const expensesByType = associationExpenses.reduce((acc, exp) => {
      const type = exp.distributionType || 'apartment';
      if (!acc[type]) acc[type] = [];
      acc[type].push(exp);
      return acc;
    }, {});
    
    return {
      totalExpenses: associationExpenses.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      byType: expensesByType,
      averagePerExpense: associationExpenses.length > 0 
        ? Math.round((totalAmount / associationExpenses.length) * 100) / 100 
        : 0
    };
  }, [association?.id, expenses, currentMonth]);

  // 🎯 RETURN API
  return {
    // 📊 State și configurări
    expenseConfig,
    setExpenseConfig,
    expenseParticipation,
    setExpenseParticipation,
    newExpense,
    setNewExpense,
    newCustomExpense,
    setNewCustomExpense,
    
    // 🔧 Funcții de configurare
    getExpenseConfig,
    updateExpenseConfig,
    getApartmentParticipation,
    setApartmentParticipation,
    
    // 📋 Funcții pentru tipuri de cheltuieli
    getAssociationExpenseTypes,
    getDisabledExpenseTypes,
    getAvailableExpenseTypes,
    
    // ➕ Funcții de adăugare și actualizare
    handleAddExpense,
    handleAddCustomExpense,
    handleDeleteCustomExpense,
    updateExpenseConsumption,
    updateExpenseIndividualAmount,
    
    // 📊 Statistici și date
    expenseStats
  };
};