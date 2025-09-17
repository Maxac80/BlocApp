import { useState, useCallback, useMemo, useEffect } from 'react';
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
  deleteMonthlyExpense,
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
    billAmount: "",
    invoiceData: null,
    pdfFile: null
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
      distributionType: defaultExpense?.defaultDistribution || customExpense?.defaultDistribution || "apartment",
      supplierId: null,
      supplierName: '',
      contractNumber: '',
      contactPerson: ''
    };
  }, [association?.id, expenseConfig, customExpenses]);

  const updateExpenseConfig = useCallback((expenseType, config) => {
    const key = `${association?.id}-${expenseType}`;
    setExpenseConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...config
      }
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
    
    // Exclude toate cheltuielile deja adăugate pentru această lună
    const usedExpenseNames = associationExpenses.map(exp => exp.name);
    
    return allAvailableExpenses.filter(expenseType => 
      !usedExpenseNames.includes(expenseType.name)
    );
  }, [association?.id, expenses, currentMonth, getAssociationExpenseTypes, getExpenseConfig]);

  // ➕ ADĂUGAREA CHELTUIELILOR - OPTIMIZAT (cu factură)
  const handleAddExpense = useCallback(async (addInvoiceFn = null) => {
    // console.log('🚀 handleAddExpense START', {
    //   hasName: !!newExpense.name,
    //   expenseName: newExpense.name,
    //   hasAssociation: !!association,
    //   hasInvoiceData: !!newExpense.invoiceData,
    //   hasAddInvoiceFn: !!addInvoiceFn
    // });
    
    if (!newExpense.name || !association) {
      console.log('❌ handleAddExpense EARLY EXIT - no name or association');
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
      console.log('💰 Adaug cheltuiala:', newExpense.name);
      
      // 1. Adaugă cheltuiala lunară
      const expenseData = {
        name: newExpense.name,
        amount: isConsumptionBased ? 0 : parseFloat(newExpense.amount || 0),
        distributionType: expenseSettings.distributionType,
        isUnitBased: isConsumptionBased,
        unitPrice: isConsumptionBased ? parseFloat(newExpense.unitPrice) : 0,
        billAmount: isConsumptionBased ? parseFloat(newExpense.billAmount) : 0,
        consumption: {},
        individualAmounts: {},
        month: currentMonth
      };
      
      const expenseId = await addMonthlyExpense(expenseData);
      
      // 2. Dacă avem detalii factură, salvăm și factura
      // console.log('🔍 DEBUG Condiții salvare factură:', {
      //   hasInvoiceData: !!newExpense.invoiceData,
      //   hasInvoiceNumber: !!newExpense.invoiceData?.invoiceNumber,
      //   invoiceNumber: newExpense.invoiceData?.invoiceNumber,
      //   hasAddInvoiceFn: !!addInvoiceFn,
      //   willSaveInvoice: !!(newExpense.invoiceData && newExpense.invoiceData.invoiceNumber && addInvoiceFn)
      // });
      
      // console.log('🔥 CRITICAL CHECK before invoice save condition:', {
      //   hasInvoiceData: !!newExpense.invoiceData,
      //   invoiceDataType: typeof newExpense.invoiceData,
      //   hasInvoiceNumber: !!newExpense.invoiceData?.invoiceNumber,
      //   invoiceNumber: newExpense.invoiceData?.invoiceNumber,
      //   hasAddInvoiceFn: !!addInvoiceFn,
      //   addInvoiceFnType: typeof addInvoiceFn,
      //   conditionResult: !!(newExpense.invoiceData && newExpense.invoiceData.invoiceNumber && addInvoiceFn)
      // });
      
      if (newExpense.invoiceData && newExpense.invoiceData.invoiceNumber && addInvoiceFn) {
        console.log('🧾 Salvez factura asociată:', newExpense.invoiceData.invoiceNumber);
        console.log('📄 Date factură:', newExpense.invoiceData);
        console.log('📎 Fișier PDF:', newExpense.pdfFile?.name || 'Nu există PDF');
        console.log('🏢 FULL expenseSettings object:', expenseSettings);
        // console.log('🔍 expenseSettings detailed breakdown:', {
        //   expenseType: newExpense.name,
        //   supplierId: expenseSettings.supplierId,
        //   supplierName: expenseSettings.supplierName,
        //   hasSupplier: !!(expenseSettings.supplierId && expenseSettings.supplierName),
        //   supplierNameEmpty: expenseSettings.supplierName === '',
        //   supplierNameNull: expenseSettings.supplierName === null,
        //   supplierNameUndefined: expenseSettings.supplierName === undefined
        // });
        // console.log('🏢 Furnizor din expenseSettings:', {
        //   supplierId: expenseSettings.supplierId,
        //   supplierName: expenseSettings.supplierName,
        //   hasSupplier: !!(expenseSettings.supplierId && expenseSettings.supplierName)
        // });
        
        // console.log('🏢 invoiceData will be created with supplier:', {
        //   supplierId: expenseSettings.supplierId || null,
        //   supplierName: expenseSettings.supplierName || 'Fără furnizor'
        // });
        
        // Calculează valorile pentru distribuție parțială
        const currentDistribution = parseFloat(newExpense.amount || newExpense.billAmount || 0);
        const totalInvoiceAmount = parseFloat(newExpense.invoiceData.totalInvoiceAmount || currentDistribution);
        const distributedAmount = parseFloat(newExpense.invoiceData.distributedAmount || 0);
        
        const invoiceData = {
          expenseId: expenseId,
          supplierId: expenseSettings.supplierId || null,
          supplierName: expenseSettings.supplierName || null, // NU pune 'Fără furnizor' aici!
          expenseType: newExpense.name,
          invoiceNumber: newExpense.invoiceData.invoiceNumber,
          invoiceDate: newExpense.invoiceData.invoiceDate,
          dueDate: newExpense.invoiceData.dueDate,
          amount: currentDistribution,
          vatAmount: 0,
          totalAmount: currentDistribution,
          // Câmpuri noi pentru distribuție parțială
          totalInvoiceAmount: totalInvoiceAmount,
          currentDistribution: currentDistribution,
          distributedAmount: distributedAmount,
          notes: newExpense.invoiceData.notes || '',
          month: currentMonth
        };
        
        try {
          // console.log('🚀 ABOUT TO CALL addInvoiceFn with:', {
          //   invoiceData: invoiceData,
          //   pdfFile: newExpense.pdfFile?.name,
          //   addInvoiceFnExists: !!addInvoiceFn
          // });
          await addInvoiceFn(invoiceData, newExpense.pdfFile);
          console.log('✅ Factură salvată cu succes');
        } catch (invoiceError) {
          console.warn('⚠️ Cheltuiala a fost salvată, dar factura nu a putut fi salvată:', invoiceError);
          
          // Afișează eroarea utilizatorului
          if (invoiceError.message.includes('permisiunea')) {
            alert('⚠️ Cheltuiala a fost salvată, dar nu s-a putut uploada PDF-ul.\n\nMotiv: Nu ai permisiunea să uploadezi fișiere.\nVerifică autentificarea Firebase.');
          } else if (invoiceError.message.includes('CORS')) {
            alert('⚠️ Cheltuiala a fost salvată, dar nu s-a putut uploada PDF-ul.\n\nMotiv: Problemă CORS cu Firebase Storage.\nContactează administratorul.');
          } else {
            alert(`⚠️ Cheltuiala a fost salvată, dar nu s-a putut uploada PDF-ul.\n\nMotiv: ${invoiceError.message}`);
          }
          
          // Nu oprim procesul pentru că cheltuiala a fost salvată cu succes
        }
      }
      
      // 3. Reset form
      console.log('🔄 Resetez forma completă după adăugarea cheltuielii');
      setNewExpense({
        name: "",
        amount: "",
        distributionType: "",
        isUnitBased: false,
        unitPrice: "",
        billAmount: "",
        invoiceData: null,
        pdfFile: null
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
  const handleDeleteCustomExpense = useCallback(async (expenseName) => {
    if (window.confirm(`Ești sigur că vrei să ștergi cheltuiala personalizată "${expenseName}"?`)) {
      try {
        await deleteCustomExpense(expenseName);
        return true;
      } catch (error) {
        console.error('❌ Eroare la ștergerea cheltuielii personalizate:', error);
        alert('Eroare la ștergerea cheltuielii personalizate: ' + error.message);
        return false;
      }
    }
    return false;
  }, [deleteCustomExpense]);

  // 🗑️ ȘTERGEREA CHELTUIELILOR LUNARE - NOU
  const handleDeleteMonthlyExpense = useCallback(async (expenseId) => {
    const expense = expenses.find(exp => exp.id === expenseId);
    if (!expense) return false;
    
    // Verifică dacă cheltuiala are consumuri
    const hasConsumption = expense.consumption && Object.keys(expense.consumption).length > 0 && 
                           Object.values(expense.consumption).some(val => parseFloat(val) > 0);
    
    // Verifică dacă cheltuiala are sume individuale
    const hasIndividualAmounts = expense.individualAmounts && Object.keys(expense.individualAmounts).length > 0 && 
                                 Object.values(expense.individualAmounts).some(val => parseFloat(val) > 0);
    
    let confirmMessage = `Ești sigur că vrei să ștergi cheltuiala "${expense.name}"?`;
    
    if (hasConsumption || hasIndividualAmounts) {
      confirmMessage = `⚠️ ATENȚIE: Cheltuiala "${expense.name}" are ${
        hasConsumption ? 'consumuri introduse' : ''
      }${hasConsumption && hasIndividualAmounts ? ' și ' : ''}${
        hasIndividualAmounts ? 'sume individuale setate' : ''
      }!\n\nDacă ștergi această cheltuială, toate datele vor fi pierdute.\n\nEști sigur că vrei să continui?`;
    }
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteMonthlyExpense(expenseId);
        return true;
      } catch (error) {
        console.error('❌ Eroare la ștergerea cheltuielii lunare:', error);
        alert('Eroare la ștergerea cheltuielii lunare: ' + error.message);
        return false;
      }
    }
    return false;
  }, [expenses, deleteMonthlyExpense]);

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
    handleDeleteMonthlyExpense,
    updateExpenseConsumption,
    updateExpenseIndividualAmount,
    
    // 📊 Statistici și date
    expenseStats
  };
};