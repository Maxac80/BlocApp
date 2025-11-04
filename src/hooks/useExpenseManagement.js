import { useState, useCallback, useMemo, useEffect } from 'react';
import { defaultExpenseTypes } from '../data/expenseTypes';
import { getSheetRef } from '../utils/firestoreHelpers';

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
  getExpenseConfig,  // Funcția din useExpenseConfigurations pentru configurări Firebase
  expenseConfigurations  // 🆕 Obiectul configurations din useExpenseConfigurations (pentru date instant)
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

  // 🔄 SINCRONIZARE PARTICIPĂRI DIN FIREBASE LA SCHIMBAREA SHEET-ULUI
  useEffect(() => {
    if (currentSheet?.configSnapshot?.apartmentParticipations) {
      setExpenseParticipation(currentSheet.configSnapshot.apartmentParticipations);
    } else {
      setExpenseParticipation({});
    }
  }, [currentSheet?.id, currentSheet?.configSnapshot?.apartmentParticipations]);

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

  // 📋 TIPURILE DE CHELTUIELI ASOCIAȚIEI - OPTIMIZAT - CITEȘTE DIN expenseConfigurations
  const getAssociationExpenseTypes = useCallback(() => {
    if (!defaultExpenseTypes) return [];

    // Dacă nu există asociație, returnează doar cheltuielile default (pentru primul setup)
    if (!association?.id) {
      return defaultExpenseTypes;
    }

    // 🆕 UNIFIED STRUCTURE: Folosește expenseConfigurations din parametru (state actualizat instant)
    // Fallback la currentSheet pentru backwards compatibility
    const configs = expenseConfigurations || currentSheet?.configSnapshot?.expenseConfigurations || {};

    // Dacă nu există configurații (sheet vechi), folosește logica veche (backwards compatibility)
    if (Object.keys(configs).length === 0) {

      const disabledKey = currentSheet?.id ? `${association.id}-${currentSheet.id}` : `${association.id}-${currentMonth}`;
      const monthDisabledExpenses = disabledExpenses[disabledKey] || [];

      const activeDefaultExpenses = defaultExpenseTypes.filter(exp =>
        !monthDisabledExpenses.includes(exp.name)
      );

      const activeCustomExpenses = customExpenses.filter(exp =>
        !monthDisabledExpenses.includes(exp.name)
      );

      return [...activeDefaultExpenses, ...activeCustomExpenses];
    }

    // 🆕 UNIFIED STRUCTURE: Filtrează doar cheltuielile active (isEnabled: true)
    const activeExpenses = Object.values(configs)
      .filter(config => config.isEnabled === true)
      .map(config => {
        // Pentru cheltuielile custom, returnăm structura completă
        if (config.isCustom) {
          return {
            id: config.id,
            name: config.name,
            defaultDistribution: config.defaultDistribution || config.distributionType || 'equal',
            consumptionUnit: config.consumptionUnit,
            invoiceEntryMode: config.invoiceEntryMode,
            expenseEntryMode: config.expenseEntryMode,
            fixedAmountMode: config.fixedAmountMode
          };
        }

        // Pentru cheltuielile standard, folosim defaultExpenseTypes pentru detalii complete
        const defaultExpenseType = defaultExpenseTypes.find(exp => exp.id === config.id);
        if (defaultExpenseType) {
          return defaultExpenseType;
        }

        // Fallback: returnăm config-ul ca expense type (pentru date vechi)
        return {
          id: config.id,
          name: config.name,
          defaultDistribution: config.defaultDistribution || config.distributionType || 'equal'
        };
      });

    // Sortează cheltuielile: standard în ordinea din defaultExpenseTypes, apoi custom
    const sortedExpenses = activeExpenses.sort((a, b) => {
      // Cheltuielile custom merg la final
      if (a.id.startsWith('custom-') && !b.id.startsWith('custom-')) return 1;
      if (!a.id.startsWith('custom-') && b.id.startsWith('custom-')) return -1;

      // Ambele sunt custom - sortează după nume
      if (a.id.startsWith('custom-') && b.id.startsWith('custom-')) {
        return a.name.localeCompare(b.name);
      }

      // Ambele sunt standard - sortează după ordinea din defaultExpenseTypes
      const indexA = defaultExpenseTypes.findIndex(exp => exp.id === a.id);
      const indexB = defaultExpenseTypes.findIndex(exp => exp.id === b.id);
      return indexA - indexB;
    });

    return sortedExpenses;
  }, [association?.id, currentMonth, currentSheet, disabledExpenses, customExpenses, defaultExpenseTypes, expenseConfigurations]);

  // 📋 TIPURILE DE CHELTUIELI DEZACTIVATE - CITEȘTE DIN expenseConfigurations
  const getDisabledExpenseTypes = useCallback(() => {
    if (!association?.id) return [];

    // 🆕 UNIFIED STRUCTURE: Citește configurațiile din expenseConfigurations
    const expenseConfigurations = currentSheet?.configSnapshot?.expenseConfigurations || {};

    // Dacă nu există configurații (sheet vechi), folosește logica veche (backwards compatibility)
    if (Object.keys(expenseConfigurations).length === 0) {

      const disabledKey = currentSheet?.id ? `${association.id}-${currentSheet.id}` : `${association.id}-${currentMonth}`;
      const monthDisabledExpenses = disabledExpenses[disabledKey] || [];

      const disabledDefaultExpenses = defaultExpenseTypes.filter(exp =>
        monthDisabledExpenses.includes(exp.name)
      );

      const disabledCustomExpenses = customExpenses.filter(exp =>
        monthDisabledExpenses.includes(exp.name)
      );

      return [...disabledDefaultExpenses, ...disabledCustomExpenses];
    }

    // 🆕 UNIFIED STRUCTURE: Filtrează doar cheltuielile dezactivate (isEnabled: false)
    const disabledExpensesUnsorted = Object.values(expenseConfigurations)
      .filter(config => config.isEnabled === false)
      .map(config => {
        // Pentru cheltuielile custom, returnăm structura completă
        if (config.isCustom) {
          return {
            id: config.id,
            name: config.name,
            defaultDistribution: config.defaultDistribution || config.distributionType || 'equal',
            consumptionUnit: config.consumptionUnit,
            invoiceEntryMode: config.invoiceEntryMode,
            expenseEntryMode: config.expenseEntryMode,
            fixedAmountMode: config.fixedAmountMode
          };
        }

        // Pentru cheltuielile standard, folosim defaultExpenseTypes pentru detalii complete
        const defaultExpenseType = defaultExpenseTypes.find(exp => exp.id === config.id);
        if (defaultExpenseType) {
          return defaultExpenseType;
        }

        // Fallback: returnăm config-ul ca expense type (pentru date vechi)
        return {
          id: config.id,
          name: config.name,
          defaultDistribution: config.defaultDistribution || config.distributionType || 'equal'
        };
      });

    // Sortează cheltuielile: standard în ordinea din defaultExpenseTypes, apoi custom
    const sortedDisabledExpenses = disabledExpensesUnsorted.sort((a, b) => {
      // Cheltuielile custom merg la final
      if (a.id.startsWith('custom-') && !b.id.startsWith('custom-')) return 1;
      if (!a.id.startsWith('custom-') && b.id.startsWith('custom-')) return -1;

      // Ambele sunt custom - sortează după nume
      if (a.id.startsWith('custom-') && b.id.startsWith('custom-')) {
        return a.name.localeCompare(b.name);
      }

      // Ambele sunt standard - sortează după ordinea din defaultExpenseTypes
      const indexA = defaultExpenseTypes.findIndex(exp => exp.id === a.id);
      const indexB = defaultExpenseTypes.findIndex(exp => exp.id === b.id);
      return indexA - indexB;
    });

    return sortedDisabledExpenses;
  }, [association?.id, currentMonth, currentSheet, disabledExpenses, customExpenses, defaultExpenseTypes]);

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
    if (!association?.id || !getAssociationApartments || !currentSheet) return false;

    // 🆕 SHEET-BASED: Folosim cheltuielile din sheet, nu din global expenses
    const sheetExpenses = currentSheet.expenses || [];

    if (sheetExpenses.length === 0) return false;

    const apartments = getAssociationApartments();
    if (apartments.length === 0) return false;

    // Verifică fiecare cheltuială să fie complet completată
    const result = sheetExpenses.every(expense => {
      const expenseSettings = getExpenseConfig(expense.name);

      const apartmentResults = apartments.map(apartment => {
        const participation = expense.config?.apartmentParticipation?.[apartment.id];

        // Apartamentele excluse sunt considerate OK
        if (participation?.type === 'excluded') {
          return true;
        }

        if (expenseSettings.distributionType === "individual") {
          const value = expense.individualAmounts?.[apartment.id];
          return value !== undefined && parseFloat(value) >= 0;
        } else if (expenseSettings.distributionType === "consumption") {
          const value = expense.consumption?.[apartment.id];
          return value !== undefined && parseFloat(value) >= 0;
        } else {
          // Pentru cheltuieli pe apartament, nu trebuie verificate consumuri
          return true;
        }
      });

      return apartmentResults.every(r => r);
    });

    return result;
  }, [association?.id, currentSheet, getExpenseConfig]);

  // ➕ ADĂUGAREA CHELTUIELILOR - OPTIMIZAT (cu factură)
  // NOTE: NU folosim useCallback aici pentru a evita probleme cu parametrii
  const addExpenseInternal = async (expenseDataParam, addInvoiceFn = null, invoiceFunctions = null) => {
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
      console.log('💾 useExpenseManagement - handleAddExpense received expenseData:', expenseData);
      console.log('💾 expenseData.invoiceData:', expenseData.invoiceData);
      console.log('💾 expenseData.separateInvoicesData:', expenseData.separateInvoicesData);

      // 1. Adaugă cheltuiala lunară
      const expensePayload = {
        name: expenseData.name,
        expenseTypeId: expenseSettings.id,  // ID unic al tipului de cheltuială
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
        isDistributed: true,  // Marchează cheltuiala ca fiind distribuită
        // Salvează datele facturii în expense pentru acces rapid la editare
        invoiceData: expenseData.invoiceData || null,
        separateInvoicesData: expenseData.separateInvoicesData || null
      };

      console.log('🔥 Calling addMonthlyExpense with expensePayload:', expensePayload);
      console.log('🔥 expensePayload.invoiceData:', expensePayload.invoiceData);
      console.log('🔥 expensePayload.separateInvoicesData:', expensePayload.separateInvoicesData);
      const newExpense = await addMonthlyExpense(expensePayload);
      const expenseId = newExpense.id;
      console.log('🔥 addMonthlyExpense returned expense:', newExpense);
      console.log('🔥 Expense ID:', expenseId);

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

      // NOTĂ: Factura a fost deja salvată în InvoiceDetailsModal prin handleSaveInvoice
      // Aici doar actualizăm distributionHistory pentru factura existentă
      if (expenseData.invoiceData && expenseData.invoiceData.invoiceNumber && invoiceFunctions) {
        console.log('📊 useExpenseManagement - Actualizare distributionHistory pentru factura:', expenseData.invoiceData.invoiceNumber);

        const { updateInvoiceDistribution, getInvoiceByNumber } = invoiceFunctions;

        if (updateInvoiceDistribution && getInvoiceByNumber) {
          try {
            // Găsește factura după număr
            const invoice = await getInvoiceByNumber(expenseData.invoiceData.invoiceNumber);

            if (invoice) {
              console.log('📊 Găsită factură existentă:', invoice.id);

              // Calculează suma distribuită
              const currentDistribution = parseFloat(expenseData.amount || expenseData.billAmount || 0);

              // Actualizează distributionHistory
              await updateInvoiceDistribution(invoice.id, {
                sheetId: currentSheet?.id || null,
                month: currentMonth,
                amount: currentDistribution,
                expenseId: expenseId,
                expenseTypeId: expenseSettings.id,  // ID-ul tipului de cheltuială
                expenseName: expenseData.name,  // Păstrăm numele pentru afișare
                notes: `Distribuție pentru ${expenseData.name}`
              });

              console.log('✅ distributionHistory actualizat pentru factura', invoice.id);
            } else {
              console.warn('⚠️ Nu s-a găsit factura cu numărul:', expenseData.invoiceData.invoiceNumber);
            }
          } catch (error) {
            console.error('❌ Eroare la actualizare distributionHistory:', error);
          }
        }
      }

      // Salvează facturi separate per bloc/scară dacă există
      if (expenseData.separateInvoicesData && Object.keys(expenseData.separateInvoicesData).length > 0 && addInvoiceFn) {
        console.log('💼 Salvez facturi separate:', expenseData.separateInvoicesData);

        for (const [entityId, invoiceInfo] of Object.entries(expenseData.separateInvoicesData)) {
          if (!invoiceInfo || !invoiceInfo.invoiceNumber) continue;

          // Găsește suma pentru această entitate (bloc/scară)
          const entityAmount = parseFloat(expenseData.entityAmounts?.[entityId] || 0);

          const separateInvoiceData = {
            expenseId: expenseId,
            supplierId: expenseSettings.supplierId || null,
            supplierName: expenseSettings.supplierName || null,
            expenseName: expenseData.name,  // Păstrăm numele pentru afișare, dar ID-ul e cheia
            invoiceNumber: invoiceInfo.invoiceNumber,
            invoiceAmount: invoiceInfo.invoiceAmount,
            invoiceDate: invoiceInfo.invoiceDate,
            dueDate: invoiceInfo.dueDate,
            amount: entityAmount,
            vatAmount: 0,
            totalAmount: entityAmount,
            totalInvoiceAmount: invoiceInfo.invoiceAmount || entityAmount,
            currentDistribution: entityAmount,
            distributedAmount: 0,
            notes: invoiceInfo.notes || '',
            month: currentMonth,
            entityId: entityId  // Adaugă ID-ul entității (bloc/scară)
          };

          try {
            await addInvoiceFn(separateInvoiceData, invoiceInfo.pdfFile);
            console.log(`✅ Factură salvată pentru entitatea ${entityId}`);
          } catch (invoiceError) {
            console.warn(`⚠️ Eroare la salvarea facturii pentru entitatea ${entityId}:`, invoiceError);
          }
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

  // 📝 SALVARE CONSUMURI PENDING (pentru cheltuieli nedistribuite)
  const updatePendingConsumption = useCallback(async (expenseTypeName, apartmentId, consumption) => {
    try {
      if (!currentSheet?.id) {
        console.error('❌ No current sheet');
        return;
      }

      // Obține datele existente
      const pendingConsumptions = currentSheet.pendingConsumptions || {};
      const expenseConsumptions = pendingConsumptions[expenseTypeName] || {};

      // Actualizează cu noua valoare
      const updatedPendingConsumptions = {
        ...pendingConsumptions,
        [expenseTypeName]: {
          ...expenseConsumptions,
          [apartmentId]: consumption
        }
      };

      // Salvează în sheet folosind updateDoc direct pe sheet
      const { updateDoc } = await import('firebase/firestore');

      await updateDoc(getSheetRef(association.id, currentSheet.id), {
        pendingConsumptions: updatedPendingConsumptions
      });

      console.log('✅ Pending consumption saved for:', expenseTypeName, apartmentId);
    } catch (error) {
      console.error('❌ Error saving pending consumption:', error);
    }
  }, [currentSheet]);

  // 📝 SALVARE SUME INDIVIDUALE PENDING (pentru cheltuieli nedistribuite)
  const updatePendingIndividualAmount = useCallback(async (expenseTypeName, apartmentId, amount) => {
    try {
      if (!currentSheet?.id) {
        console.error('❌ No current sheet');
        return;
      }

      // Obține datele existente
      const pendingIndividualAmounts = currentSheet.pendingIndividualAmounts || {};
      const expenseAmounts = pendingIndividualAmounts[expenseTypeName] || {};

      // Actualizează cu noua valoare
      const updatedPendingAmounts = {
        ...pendingIndividualAmounts,
        [expenseTypeName]: {
          ...expenseAmounts,
          [apartmentId]: amount
        }
      };

      // Salvează în sheet folosind updateDoc direct pe sheet
      const { updateDoc } = await import('firebase/firestore');

      await updateDoc(getSheetRef(association.id, currentSheet.id), {
        pendingIndividualAmounts: updatedPendingAmounts
      });

      console.log('✅ Pending individual amount saved for:', expenseTypeName, apartmentId);
    } catch (error) {
      console.error('❌ Error saving pending individual amount:', error);
    }
  }, [currentSheet]);

  // 📊 ACTUALIZAREA INDECȘILOR - SHEET-BASED
  const updateExpenseIndexes = useCallback(async (expenseId, apartmentId, indexes) => {
    try {
      if (!currentSheet || !currentSheet.expenses) {
        console.error('❌ No current sheet or expenses');
        return;
      }

      const expense = currentSheet.expenses.find(exp => exp.id === expenseId);
      if (!expense) {
        console.error('❌ Expense not found in sheet:', expenseId);
        return;
      }

      // Actualizează indecșii în sheet folosind updateExpenseInSheet
      const updatedExpense = {
        ...expense,
        indexes: {
          ...expense.indexes,
          [apartmentId]: indexes
        }
      };

      await updateExpenseInSheet(expenseId, updatedExpense);
      console.log('✅ Indexes updated in sheet for apartment:', apartmentId);
    } catch (error) {
      console.error('❌ Eroare la actualizarea indecșilor:', error);
    }
  }, [currentSheet, updateExpenseInSheet]);

  // 📝 SALVARE INDECȘI PENDING (pentru cheltuieli nedistribuite)
  const updatePendingIndexes = useCallback(async (expenseTypeName, apartmentId, indexes) => {
    try {
      if (!currentSheet?.id) {
        console.error('❌ No current sheet');
        return;
      }

      // Obține datele existente
      const pendingIndexes = currentSheet.pendingIndexes || {};
      const expenseIndexes = pendingIndexes[expenseTypeName] || {};

      // Actualizează cu noile valori
      const updatedPendingIndexes = {
        ...pendingIndexes,
        [expenseTypeName]: {
          ...expenseIndexes,
          [apartmentId]: indexes
        }
      };

      // Salvează în sheet folosind updateDoc direct pe sheet
      const { updateDoc } = await import('firebase/firestore');

      await updateDoc(getSheetRef(association.id, currentSheet.id), {
        pendingIndexes: updatedPendingIndexes
      });

      console.log('✅ Pending indexes saved for:', expenseTypeName, apartmentId);
    } catch (error) {
      console.error('❌ Error saving pending indexes:', error);
    }
  }, [currentSheet]);

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
  const handleAddExpense = async (expenseDataParam, addInvoiceFn = null, invoiceFunctions = null) => {
    console.log('🎯 WRAPPER in hook - param1 type:', typeof expenseDataParam);
    console.log('🎯 WRAPPER in hook - param1 value:', expenseDataParam);
    console.log('🎯 WRAPPER in hook - param2 type:', typeof addInvoiceFn);
    console.log('🎯 WRAPPER in hook - param2 value:', addInvoiceFn);
    console.log('🎯 WRAPPER in hook - invoiceFunctions:', invoiceFunctions);

    return addExpenseInternal(expenseDataParam, addInvoiceFn, invoiceFunctions);
  };

  // ✏️ ACTUALIZAREA CHELTUIELII
  const handleUpdateExpense = async (expenseId, expenseDataParam, invoiceFunctions = null) => {
    console.log('✏️ handleUpdateExpense START:', {
      expenseId,
      expenseData: expenseDataParam,
      hasInvoiceFunctions: !!invoiceFunctions
    });

    const expenseData = expenseDataParam;

    if (!expenseId || !expenseData?.name || !association) {
      console.log('❌ Validation failed:', {
        expenseId,
        expenseDataName: expenseData?.name,
        hasAssociation: !!association
      });
      return false;
    }

    const expenseSettings = getExpenseConfig(expenseData.name);
    const isConsumptionBased = expenseSettings.distributionType === "consumption";
    const isIndividualBased = expenseSettings.distributionType === "individual";

    console.log('✏️ Expense settings:', { expenseSettings, isConsumptionBased, isIndividualBased });

    // Calculează amount-ul total bazat pe receptionMode
    let totalAmount = 0;

    if (expenseData.amountsByBlock) {
      totalAmount = Object.values(expenseData.amountsByBlock).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    } else if (expenseData.amountsByStair) {
      totalAmount = Object.values(expenseData.amountsByStair).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    } else if (expenseData.amount) {
      totalAmount = parseFloat(expenseData.amount);
    } else if (expenseData.billAmount) {
      totalAmount = parseFloat(expenseData.billAmount);
    }

    console.log('✏️ Calculated total amount:', totalAmount);

    // Validări
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

    // Funcție helper pentru a elimina recursiv toate valorile undefined
    const removeUndefined = (obj) => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(removeUndefined);

      return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        if (value !== undefined) {
          // Dacă valoarea este un obiect, curăță-l recursiv
          if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            acc[key] = removeUndefined(value);
          } else {
            acc[key] = value;
          }
        }
        return acc;
      }, {});
    };

    try {
      console.log('✏️ handleUpdateExpense - expenseData received:', expenseData);
      console.log('✏️ expenseData.invoiceData:', expenseData.invoiceData);
      console.log('✏️ expenseData.separateInvoicesData:', expenseData.separateInvoicesData);

      // Găsește cheltuiala existentă pentru a păstra consumption și individualAmounts
      const existingExpense = currentSheet?.expenses?.find(exp => exp.id === expenseId);

      // Actualizează cheltuiala
      const updatedExpenseRaw = {
        ...existingExpense,
        name: expenseData.name,
        expenseTypeId: expenseSettings.id,  // ID unic al tipului de cheltuială
        amount: isConsumptionBased ? 0 : totalAmount,
        distributionType: expenseSettings.distributionType,
        receptionMode: expenseSettings.receptionMode,
        expenseEntryMode: expenseSettings.expenseEntryMode,
        isUnitBased: isConsumptionBased,
        unitPrice: isConsumptionBased ? parseFloat(expenseData.unitPrice) : 0,
        billAmount: isConsumptionBased ? parseFloat(expenseData.billAmount) : 0,
        amountsByBlock: expenseData.amountsByBlock || {},
        amountsByStair: expenseData.amountsByStair || {},
        // Păstrează consumption și individualAmounts existente
        consumption: existingExpense?.consumption || {},
        individualAmounts: existingExpense?.individualAmounts || {},
        // Actualizează datele facturii
        invoiceData: expenseData.invoiceData || existingExpense?.invoiceData || null,
        separateInvoicesData: expenseData.separateInvoicesData || existingExpense?.separateInvoicesData || null
      };

      // Curăță recursiv toate valorile undefined pentru Firestore
      const updatedExpense = removeUndefined(updatedExpenseRaw);

      console.log('✏️ Calling updateExpenseInSheet with:', updatedExpense);
      console.log('✏️ updatedExpense.invoiceData:', updatedExpense.invoiceData);
      console.log('✏️ updatedExpense.separateInvoicesData:', updatedExpense.separateInvoicesData);
      await updateExpenseInSheet(expenseId, updatedExpense);
      console.log('✏️ Expense updated successfully in sheet');

      // Update invoices collection dacă există invoice data și funcții pentru update
      if (invoiceFunctions && expenseData.invoiceData && expenseData.invoiceData.invoiceNumber) {
        console.log('✏️ Updating invoice in invoices collection...');
        try {
          const { updateInvoiceByNumber, updateInvoiceDistribution, getInvoiceByNumber } = invoiceFunctions;

          if (updateInvoiceByNumber) {
            // Update invoice folosind invoiceNumber (unic per asociație)
            await updateInvoiceByNumber(
              expenseData.invoiceData.invoiceNumber,
              {
                invoiceDate: expenseData.invoiceData.invoiceDate,
                dueDate: expenseData.invoiceData.dueDate,
                notes: expenseData.invoiceData.notes,
                updatedAt: new Date().toISOString()
              }
            );

            console.log('✏️ Invoice updated successfully in collection');
          } else {
            console.log('⚠️ updateInvoiceByNumber function not available');
          }

          // Actualizează și distributionHistory dacă suma s-a schimbat
          if (updateInvoiceDistribution && getInvoiceByNumber) {
            console.log('📊 Actualizare distributionHistory pentru editare...');
            console.log('📊 expenseId pentru căutare:', expenseId);
            console.log('📊 invoiceNumber:', expenseData.invoiceData.invoiceNumber);

            const invoice = await getInvoiceByNumber(expenseData.invoiceData.invoiceNumber);

            if (invoice) {
              console.log('📊 Găsită factură existentă pentru update distribution:', invoice.id);
              console.log('📊 invoice.distributionHistory:', invoice.distributionHistory);

              // Calculează suma distribuită (noua sumă sau suma veche)
              const currentDistribution = parseFloat(expenseData.amount || expenseData.billAmount || 0);
              console.log('📊 currentDistribution (noua sumă):', currentDistribution);

              // Actualizează sau adaugă în distributionHistory
              // Verifică dacă deja există o intrare pentru acest expenseId
              const existingDistribution = invoice.distributionHistory?.find(
                dist => {
                  console.log('📊 Comparing dist.expenseId:', dist.expenseId, 'with expenseId:', expenseId);
                  return dist.expenseId === expenseId;
                }
              );

              console.log('📊 existingDistribution found:', existingDistribution);

              if (existingDistribution) {
                // Deja există - trebuie să actualizăm suma distribuită
                console.log('📊 Actualizare distribuție existentă în history');

                // Recalculează distributedAmount (scădem vechea sumă și adăugăm noua)
                const oldDistribution = existingDistribution.amount || 0;
                const newDistributedAmount = (invoice.distributedAmount || 0) - oldDistribution + currentDistribution;

                await updateInvoiceDistribution(invoice.id, {
                  sheetId: currentSheet?.id || null,
                  month: currentMonth,
                  amount: currentDistribution,
                  expenseId: expenseId,
                  expenseTypeId: expenseSettings.id,  // ID-ul tipului de cheltuială
                  expenseName: expenseData.name,  // Păstrăm numele pentru afișare
                  notes: `Distribuție actualizată pentru ${expenseData.name}`
                });

                console.log('✅ distributionHistory actualizat pentru editare');
              } else {
                // Nu există - este o nouă distribuție (nu ar trebui să se întâmple în edit, dar handle-uim)
                console.log('📊 Adăugare distribuție nouă în history (editare)');

                await updateInvoiceDistribution(invoice.id, {
                  sheetId: currentSheet?.id || null,
                  month: currentMonth,
                  amount: currentDistribution,
                  expenseId: expenseId,
                  expenseTypeId: expenseSettings.id,  // ID-ul tipului de cheltuială
                  expenseName: expenseData.name,  // Păstrăm numele pentru afișare
                  notes: `Distribuție pentru ${expenseData.name}`
                });

                console.log('✅ distributionHistory adăugat pentru editare');
              }
            }
          }
        } catch (invoiceError) {
          console.warn('⚠️ Could not update invoice in collection:', invoiceError);
          // Nu blocăm update-ul expense-ului dacă invoice update eșuează
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Eroare la actualizarea cheltuielii:', error);
      alert('Eroare la actualizarea cheltuielii: ' + error.message);
      return false;
    }
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

    // 📊 Statistici și date
    expenseStats
  };
};