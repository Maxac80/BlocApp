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
  currentSheet,
  disabledExpenses,
  addMonthlyExpense,
  updateMonthlyExpense,
  updateExpenseInSheet,  // SHEET-BASED: funcție pentru actualizare cheltuieli în sheet
  deleteMonthlyExpense,
  addCustomExpense,
  deleteCustomExpense,
  getExpenseConfig  // Funcția din useExpenseConfigurations pentru configurări Firebase
}) => {
  // 📊 STATE LOCAL PENTRU PARTICIPARE APARTAMENTE (configurările sunt în useExpenseConfigurations)
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

  // ⚠️ DEPRECATED: getExpenseConfig și updateExpenseConfig au fost mutate în useExpenseConfigurations
  // Nu mai folosim state local pentru configurări - totul e în Firebase prin useExpenseConfigurations

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
    if (!defaultExpenseTypes) return [];

    // Dacă nu există asociație, returnează doar cheltuielile default (pentru primul setup)
    if (!association?.id) {
      return defaultExpenseTypes;
    }

    // SHEET-BASED: folosim ID-ul sheet-ului în loc de lună
    const disabledKey = currentSheet?.id ? `${association.id}-${currentSheet.id}` : `${association.id}-${currentMonth}`;
    const monthDisabledExpenses = disabledExpenses[disabledKey] || [];

    const activeDefaultExpenses = defaultExpenseTypes.filter(exp =>
      !monthDisabledExpenses.includes(exp.name)
    );

    // SHEET-BASED: customExpenses din sheet nu mai au associationId (sheet-ul aparține deja asociației)
    const activeCustomExpenses = customExpenses.filter(exp =>
      !monthDisabledExpenses.includes(exp.name)
    );
    
    return [...activeDefaultExpenses, ...activeCustomExpenses];
  }, [association?.id, currentMonth, currentSheet?.id, disabledExpenses, customExpenses]);

  // 📋 TIPURILE DE CHELTUIELI DEZACTIVATE
  const getDisabledExpenseTypes = useCallback(() => {
    if (!association?.id) return [];

    // SHEET-BASED: folosim ID-ul sheet-ului în loc de lună
    const disabledKey = currentSheet?.id ? `${association.id}-${currentSheet.id}` : `${association.id}-${currentMonth}`;
    const monthDisabledExpenses = disabledExpenses[disabledKey] || [];
    
    // Cheltuieli standard dezactivate
    const disabledDefaultExpenses = defaultExpenseTypes.filter(exp => 
      monthDisabledExpenses.includes(exp.name)
    );
    
    // Cheltuieli custom dezactivate
    // SHEET-BASED: customExpenses din sheet nu mai au associationId (sheet-ul aparține deja asociației)
    const disabledCustomExpenses = customExpenses.filter(exp =>
      monthDisabledExpenses.includes(exp.name)
    );
    
    return [...disabledDefaultExpenses, ...disabledCustomExpenses];
  }, [association?.id, customExpenses, currentMonth, currentSheet?.id, disabledExpenses]);

  // 📋 TIPURILE DE CHELTUIELI DISPONIBILE PENTRU ADĂUGARE - SHEET-BASED
  const getAvailableExpenseTypes = useCallback(() => {
    if (!association?.id) return [];

    // SHEET-BASED: Folosește cheltuielile din sheet-ul curent, nu din colecția veche
    const sheetExpenses = currentSheet?.expenses || [];

    const allAvailableExpenses = getAssociationExpenseTypes();

    // Exclude toate cheltuielile deja adăugate în sheet-ul curent
    const usedExpenseNames = sheetExpenses.map(exp => exp.name);

    // console.log('🔍 getAvailableExpenseTypes:', {
    //   allAvailable: allAvailableExpenses.map(e => e.name),
    //   usedNames: usedExpenseNames,
    //   filtered: allAvailableExpenses.filter(expenseType => !usedExpenseNames.includes(expenseType.name)).map(e => e.name)
    // });

    return allAvailableExpenses.filter(expenseType =>
      !usedExpenseNames.includes(expenseType.name)
    );
  }, [association?.id, currentSheet, getAssociationExpenseTypes]);

  // 🔍 VERIFICARE DACĂ TOATE CHELTUIELILE SUNT COMPLET COMPLETATE
  const areAllExpensesFullyCompleted = useCallback((getAssociationApartments) => {
    if (!association?.id || !getAssociationApartments) return false;

    const associationExpenses = expenses.filter(exp =>
      exp.associationId === association.id && exp.month === currentMonth
    );

    if (associationExpenses.length === 0) return false;

    const apartments = getAssociationApartments();
    if (apartments.length === 0) return false;

    // Verifică fiecare cheltuială să fie complet completată
    return associationExpenses.every(expense => {
      const expenseSettings = getExpenseConfig(expense.name);

      return apartments.every(apartment => {
        if (expenseSettings.distributionType === "individual") {
          const value = expense.individualAmounts?.[apartment.id];
          return value && parseFloat(value) > 0;
        } else if (expenseSettings.distributionType === "consumption") {
          const value = expense.consumption?.[apartment.id];
          return value && parseFloat(value) > 0;
        } else {
          // Pentru cheltuieli pe apartament, nu trebuie verificate consumuri
          return true;
        }
      });
    });
  }, [association?.id, expenses, currentMonth, getExpenseConfig]);

  // ➕ ADĂUGAREA CHELTUIELILOR - OPTIMIZAT (cu factură)
  // NOTE: NU folosim useCallback aici pentru a evita probleme cu parametrii
  const addExpenseInternal = async (expenseDataParam, addInvoiceFn = null) => {
    console.log('🔥 handleAddExpense RAW params:', {
      param1: expenseDataParam,
      param1Type: typeof expenseDataParam,
      param2: addInvoiceFn,
      param2Type: typeof addInvoiceFn
    });

    // Primește datele direct ca prim parametru
    const expenseData = expenseDataParam;

    console.log('🔥 handleAddExpense START:', {
      expenseData,
      hasName: !!expenseData?.name,
      hasAssociation: !!association
    });

    if (!expenseData?.name || !association) {
      console.log('❌ Validation failed:', {
        expenseDataName: expenseData?.name,
        hasAssociation: !!association
      });
      return false;
    }

    const expenseSettings = getExpenseConfig(expenseData.name);
    const isConsumptionBased = expenseSettings.distributionType === "consumption";
    const isIndividualBased = expenseSettings.distributionType === "individual";

    console.log('🔥 Expense settings:', { expenseSettings, isConsumptionBased, isIndividualBased });
    console.log('🔥 Expense data received:', expenseData);

    // Calculează amount-ul total bazat pe receptionMode
    let totalAmount = 0;

    if (expenseData.amountsByBlock) {
      // Sumă per bloc
      totalAmount = Object.values(expenseData.amountsByBlock).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    } else if (expenseData.amountsByStair) {
      // Sumă per scară
      totalAmount = Object.values(expenseData.amountsByStair).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    } else if (expenseData.amount) {
      // Sumă totală directă
      totalAmount = parseFloat(expenseData.amount);
    } else if (expenseData.billAmount) {
      // Pentru consumption - billAmount
      totalAmount = parseFloat(expenseData.billAmount);
    }

    console.log('🔥 Calculated total amount:', totalAmount);

    // Validări actualizate
    if (isConsumptionBased && (!expenseData.unitPrice || !expenseData.billAmount)) {
      alert("Pentru cheltuielile pe consum trebuie să introduci atât prețul pe unitate cât și totalul facturii!");
      return false;
    }

    if (!isConsumptionBased && !isIndividualBased && totalAmount === 0) {
      alert("Introduceți suma cheltuielii!");
      return false;
    }

    if (isIndividualBased && totalAmount === 0) {
      alert("Introduceți suma totală pentru cheltuiala individuală!");
      return false;
    }

    try {

      // 1. Adaugă cheltuiala lunară
      const expensePayload = {
        name: expenseData.name,
        amount: isConsumptionBased ? 0 : totalAmount,
        distributionType: expenseSettings.distributionType,
        receptionMode: expenseSettings.receptionMode,
        expenseEntryMode: expenseSettings.expenseEntryMode,  // Adaugă expenseEntryMode pentru a ști cum să distribuie
        isUnitBased: isConsumptionBased,
        unitPrice: isConsumptionBased ? parseFloat(expenseData.unitPrice) : 0,
        billAmount: isConsumptionBased ? parseFloat(expenseData.billAmount) : 0,
        consumption: {},
        individualAmounts: {},
        amountsByBlock: expenseData.amountsByBlock || {},
        amountsByStair: expenseData.amountsByStair || {},
        month: currentMonth,
        isDistributed: true  // Marchează cheltuiala ca fiind distribuită
      };

      console.log('🔥 Calling addMonthlyExpense with:', expensePayload);
      const expenseId = await addMonthlyExpense(expensePayload);
      console.log('🔥 addMonthlyExpense returned ID:', expenseId);

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
      
      if (expenseData.invoiceData && expenseData.invoiceData.invoiceNumber && addInvoiceFn) {
        // console.log('🔍 expenseSettings detailed breakdown:', {
        //   expenseType: expenseData.name,
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
        const currentDistribution = parseFloat(expenseData.amount || expenseData.billAmount || 0);
        const totalInvoiceAmount = parseFloat(expenseData.invoiceData.totalInvoiceAmount || currentDistribution);
        const distributedAmount = parseFloat(expenseData.invoiceData.distributedAmount || 0);

        const invoiceData = {
          expenseId: expenseId,
          supplierId: expenseSettings.supplierId || null,
          supplierName: expenseSettings.supplierName || null, // NU pune 'Fără furnizor' aici!
          expenseType: expenseData.name,
          invoiceNumber: expenseData.invoiceData.invoiceNumber,
          invoiceDate: expenseData.invoiceData.invoiceDate,
          dueDate: expenseData.invoiceData.dueDate,
          amount: currentDistribution,
          vatAmount: 0,
          totalAmount: currentDistribution,
          // Câmpuri noi pentru distribuție parțială
          totalInvoiceAmount: totalInvoiceAmount,
          currentDistribution: currentDistribution,
          distributedAmount: distributedAmount,
          notes: expenseData.invoiceData.notes || '',
          month: currentMonth
        };

        try {
          // console.log('🚀 ABOUT TO CALL addInvoiceFn with:', {
          //   invoiceData: invoiceData,
          //   pdfFile: expenseData.pdfFile?.name,
          //   addInvoiceFnExists: !!addInvoiceFn
          // });
          await addInvoiceFn(invoiceData, expenseData.pdfFile);
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
  };

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
      // SHEET-BASED: Actualizează cheltuiala în sheet-ul curent
      if (!currentSheet || !currentSheet.expenses) {
        console.error('❌ No current sheet or expenses');
        return;
      }

      const expense = currentSheet.expenses.find(exp => exp.id === expenseId);
      if (!expense) {
        console.error('❌ Expense not found in sheet:', expenseId);
        return;
      }

      // Actualizează consumul în sheet folosind updateExpenseInSheet
      const updatedExpense = {
        ...expense,
        consumption: { ...expense.consumption, [apartmentId]: consumption }
      };

      await updateExpenseInSheet(expenseId, updatedExpense);
      console.log('✅ Consumption updated in sheet for apartment:', apartmentId);
    } catch (error) {
      console.error('❌ Eroare la actualizarea consumului:', error);
    }
  }, [currentSheet, updateExpenseInSheet]);

  // 💰 ACTUALIZAREA SUMELOR INDIVIDUALE - SHEET-BASED
  const updateExpenseIndividualAmount = useCallback(async (expenseId, apartmentId, amount) => {
    try {
      // SHEET-BASED: Actualizează cheltuiala în sheet-ul curent
      if (!currentSheet || !currentSheet.expenses) {
        console.error('❌ No current sheet or expenses');
        return;
      }

      const expense = currentSheet.expenses.find(exp => exp.id === expenseId);
      if (!expense) {
        console.error('❌ Expense not found in sheet:', expenseId);
        return;
      }

      // Actualizează suma individuală în sheet folosind updateExpenseInSheet
      const updatedExpense = {
        ...expense,
        individualAmounts: { ...expense.individualAmounts, [apartmentId]: amount }
      };

      await updateExpenseInSheet(expenseId, updatedExpense);
      console.log('✅ Individual amount updated in sheet for apartment:', apartmentId);
    } catch (error) {
      console.error('❌ Eroare la actualizarea sumei individuale:', error);
    }
  }, [currentSheet, updateExpenseInSheet]);

  // 🗑️ ȘTERGEREA CHELTUIELILOR PERSONALIZATE - OPTIMIZAT
  const handleDeleteCustomExpense = useCallback(async (expenseName) => {
    try {
      await deleteCustomExpense(expenseName);
      return true;
    } catch (error) {
      console.error('❌ Eroare la ștergerea cheltuielii personalizate:', error);
      alert('Eroare la ștergerea cheltuielii personalizate: ' + error.message);
      return false;
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
    
    try {
      await deleteMonthlyExpense(expenseId);
      return true;
    } catch (error) {
      console.error('❌ Eroare la ștergerea cheltuielii lunare:', error);
      alert('Eroare la ștergerea cheltuielii lunare: ' + error.message);
      return false;
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

  // Wrapper pentru a expune funcția cu numele corect - CU PARAMETRI EXPLICIȚI
  const handleAddExpense = async (expenseDataParam, addInvoiceFn = null) => {
    console.log('🎯 WRAPPER in hook - param1 type:', typeof expenseDataParam);
    console.log('🎯 WRAPPER in hook - param1 value:', expenseDataParam);
    console.log('🎯 WRAPPER in hook - param2 type:', typeof addInvoiceFn);
    console.log('🎯 WRAPPER in hook - param2 value:', addInvoiceFn);

    return addExpenseInternal(expenseDataParam, addInvoiceFn);
  };

  // 🎯 RETURN API
  return {
    // 📊 State și configurări (doar participare - configurările sunt în useExpenseConfigurations)
    expenseParticipation,
    setExpenseParticipation,
    newExpense,
    setNewExpense,
    newCustomExpense,
    setNewCustomExpense,

    // 🔧 Funcții de configurare
    getApartmentParticipation,
    setApartmentParticipation,

    // 📋 Funcții pentru tipuri de cheltuieli
    getAssociationExpenseTypes,
    getDisabledExpenseTypes,
    getAvailableExpenseTypes,
    areAllExpensesFullyCompleted,

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