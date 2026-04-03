/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
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

    // 🆕 UNIFIED STRUCTURE: Pentru published/archived sheets, folosește DOAR currentSheet.configSnapshot (locked data)
    // Pentru IN_PROGRESS sheets, folosește expenseConfigurations (live state) sau fallback la currentSheet
    const isLockedSheet = currentSheet?.status === 'published' || currentSheet?.status === 'archived';
    const configs = isLockedSheet
      ? (currentSheet?.configSnapshot?.expenseConfigurations || {})
      : (expenseConfigurations || currentSheet?.configSnapshot?.expenseConfigurations || {});

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

    const sheetExpenses = currentSheet.expenses || [];
    if (sheetExpenses.length === 0) return false;

    const apartments = getAssociationApartments();
    if (apartments.length === 0) return false;

    // Verifică fiecare cheltuială să fie complet completată
    const result = sheetExpenses.every(expense => {
      const expenseSettings = getExpenseConfig(expense.name);
      const distributionType = expenseSettings.distributionType;
      const isConsumption = distributionType === "consumption";
      const isIndividual = distributionType === "individual";

      // Pentru cheltuieli de tip apartment/person/cotaParte - nu e nevoie de date per apartament
      // Sunt complete dacă au suma setată (isDistributed este setat la adăugare)
      if (!isConsumption && !isIndividual) {
        // Cheltuiala a fost adăugată = este completă (suma a fost setată la adăugare)
        return expense.isDistributed === true ||
               (expense.amount && expense.amount > 0) ||
               (expense.billAmount && expense.billAmount > 0) ||
               (expense.amountsByBlock && Object.values(expense.amountsByBlock).some(v => v > 0)) ||
               (expense.amountsByStair && Object.values(expense.amountsByStair).some(v => v > 0));
      }

      // Pentru consumption și individual - verifică date per apartament
      const apartmentParticipations = expenseSettings.apartmentParticipation || expense.config?.apartmentParticipation || {};
      const nonExcludedApartments = apartments.filter(apt => {
        const participation = apartmentParticipations[apt.id];
        return participation?.type !== 'excluded';
      });

      if (nonExcludedApartments.length === 0) return true;

      const inputMode = expenseSettings.indexConfiguration?.inputMode || 'manual';
      const indexTypes = expenseSettings.indexConfiguration?.indexTypes || [];
      const hasIndexConfig = expenseSettings.indexConfiguration?.enabled && indexTypes.length > 0;

      let completed = 0;

      if (isConsumption && hasIndexConfig && inputMode !== 'manual') {
        // Modul INDECȘI sau MIXT: verifică indexurile
        const indexesData = expense.indexes || {};

        completed = nonExcludedApartments.filter(apt => {
          const apartmentIndexes = indexesData[apt.id] || {};

          if (inputMode === 'indexes') {
            return indexTypes.some(indexType => {
              const indexData = apartmentIndexes[indexType.id];
              const oldVal = indexData?.oldIndex;
              const newVal = indexData?.newIndex;
              const hasOld = oldVal !== undefined && oldVal !== null && String(oldVal).trim() !== '';
              const hasNew = newVal !== undefined && newVal !== null && String(newVal).trim() !== '';
              return hasOld && hasNew;
            });
          } else if (inputMode === 'mixed') {
            const hasIndexes = indexTypes.some(indexType => {
              const indexData = apartmentIndexes[indexType.id];
              const oldVal = indexData?.oldIndex;
              const newVal = indexData?.newIndex;
              const hasOld = oldVal !== undefined && oldVal !== null && String(oldVal).trim() !== '';
              const hasNew = newVal !== undefined && newVal !== null && String(newVal).trim() !== '';
              return hasOld && hasNew;
            });

            if (hasIndexes) return true;

            const value = expense.consumption?.[apt.id];
            return value !== undefined && parseFloat(value) >= 0;
          }

          return false;
        }).length;
      } else {
        // Modul MANUAL sau individual: verifică consumption/individualAmounts
        const dataObject = isConsumption
          ? (expense.consumption || {})
          : (expense.individualAmounts || {});

        completed = nonExcludedApartments.filter(apt => {
          const value = dataObject[apt.id];
          return value !== undefined && parseFloat(value) >= 0;
        }).length;
      }

      return completed === nonExcludedApartments.length;
    });

    return result;
  }, [association?.id, currentSheet, getExpenseConfig]);

  // ➕ ADĂUGAREA CHELTUIELILOR - OPTIMIZAT (cu factură)
  // NOTE: NU folosim useCallback aici pentru a evita probleme cu parametrii
  const addExpenseInternal = async (expenseDataParam, addInvoiceFn = null, invoiceFunctions = null) => {
    // Primește datele direct ca prim parametru
    const expenseData = expenseDataParam;

    if (!expenseData?.name || !association) {
      return false;
    }

    const expenseSettings = getExpenseConfig(expenseData.name);
    const isConsumptionBased = expenseSettings.distributionType === "consumption";
    const isIndividualBased = expenseSettings.distributionType === "individual";

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
        expenseTypeId: expenseSettings.id,  // ID unic al tipului de cheltuială
        amount: isConsumptionBased ? 0 : totalAmount,
        distributionType: expenseSettings.distributionType,
        receptionMode: expenseSettings.receptionMode,
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
        invoicesData: expenseData.invoicesData || null,
        separateInvoicesData: expenseData.separateInvoicesData || null
      };

      const newExpense = await addMonthlyExpense(expensePayload);
      const expenseId = newExpense.id;

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

      // Salvează/actualizează facturile în colecția invoices
      // Construiește lista de facturi de salvat (multi-supplier sau single)
      const invoicesToSave = expenseData.invoicesData && expenseData.invoicesData.length > 0
        ? expenseData.invoicesData
        : (expenseData.invoiceData && expenseData.invoiceData.invoiceNumber
          ? [expenseData.invoiceData]
          : []);

      if (invoicesToSave.length > 0 && invoiceFunctions) {
        const { updateInvoiceDistribution, getInvoiceByNumber } = invoiceFunctions;
        const currentDistribution = parseFloat(expenseData.amount || expenseData.billAmount || 0);

        for (const invoiceEntry of invoicesToSave) {
          if (!invoiceEntry.invoiceNumber) continue;
          const invoiceAmount = parseFloat(invoiceEntry.invoiceAmount || 0);
          try {
            if (invoiceEntry.isExistingInvoice && invoiceEntry.existingInvoiceId) {
              await updateInvoiceDistribution(invoiceEntry.existingInvoiceId, {
                sheetId: currentSheet?.id || null,
                month: currentMonth,
                amount: invoiceAmount || currentDistribution,
                expenseId: expenseId,
                expenseTypeId: expenseSettings.id,
                expenseName: expenseData.name,
                notes: `Distribuție pentru ${expenseData.name}`
              });
            } else if (addInvoiceFn) {
              await addInvoiceFn({
                expenseId: expenseId,
                expenseTypeId: expenseSettings.id,
                expenseName: expenseData.name,
                supplierId: invoiceEntry.supplierId || expenseSettings.supplierId || null,
                supplierName: invoiceEntry.supplierName || expenseSettings.supplierName || null,
                invoiceNumber: invoiceEntry.invoiceNumber,
                invoiceDate: invoiceEntry.invoiceDate || null,
                dueDate: invoiceEntry.dueDate || null,
                invoiceAmount: invoiceEntry.invoiceAmount || currentDistribution,
                amount: invoiceAmount || currentDistribution,
                totalAmount: invoiceAmount || currentDistribution,
                totalInvoiceAmount: parseFloat(invoiceEntry.totalInvoiceAmount || invoiceEntry.invoiceAmount) || currentDistribution,
                currentDistribution: invoiceAmount || currentDistribution,
                documentType: invoiceEntry.documentType || 'factura',
                month: currentMonth,
                sheetId: currentSheet?.id || null,
                notes: invoiceEntry.notes || ''
              });
            } else if (updateInvoiceDistribution && getInvoiceByNumber) {
              const invoice = await getInvoiceByNumber(invoiceEntry.invoiceNumber);
              if (invoice) {
                await updateInvoiceDistribution(invoice.id, {
                  sheetId: currentSheet?.id || null,
                  month: currentMonth,
                  amount: invoiceAmount || currentDistribution,
                  expenseId: expenseId,
                  expenseTypeId: expenseSettings.id,
                  expenseName: expenseData.name,
                  notes: `Distribuție pentru ${expenseData.name}`
                });
              }
            }
          } catch (error) {
            console.error('❌ Eroare la salvare/actualizare document:', invoiceEntry.invoiceNumber, error);
          }
        }
      }

      // Salvează facturi separate per bloc/scară dacă există
      if (expenseData.separateInvoicesData && Object.keys(expenseData.separateInvoicesData).length > 0 && addInvoiceFn) {

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

    } catch (error) {
      console.error('❌ Error saving pending indexes:', error);
    }
  }, [currentSheet]);

  // 📱 TOGGLE PORTAL SUBMISSION - pentru deschidere/închidere rapidă din ExpensesView
  const togglePortalSubmission = useCallback(async (expenseId) => {
    try {
      if (!currentSheet?.id || !association?.id) {
        console.error('❌ No current sheet or association');
        return false;
      }

      // Găsește configurația cheltuielii
      const expenseConfigs = currentSheet.configSnapshot?.expenseConfigurations || {};
      const expenseConfig = expenseConfigs[expenseId];

      if (!expenseConfig) {
        console.error('❌ Expense config not found for:', expenseId);
        return false;
      }

      // Toggle isOpen
      const currentIsOpen = expenseConfig.indexConfiguration?.portalSubmission?.isOpen ?? true;
      const newIsOpen = !currentIsOpen;


      // Actualizează în Firebase
      const { updateDoc } = await import('firebase/firestore');

      const updatedExpenseConfigs = {
        ...expenseConfigs,
        [expenseId]: {
          ...expenseConfig,
          indexConfiguration: {
            ...expenseConfig.indexConfiguration,
            portalSubmission: {
              ...expenseConfig.indexConfiguration?.portalSubmission,
              isOpen: newIsOpen
            }
          }
        }
      };

      await updateDoc(getSheetRef(association.id, currentSheet.id), {
        'configSnapshot.expenseConfigurations': updatedExpenseConfigs
      });

      return true;
    } catch (error) {
      console.error('❌ Error toggling portal submission:', error);
      return false;
    }
  }, [currentSheet, association?.id]);

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
  }, [deleteCustomExpense]);

  // 🗑️ ȘTERGEREA CHELTUIELILOR LUNARE - NOU
  const handleDeleteMonthlyExpense = useCallback(async (expenseId, invoiceFunctions = null) => {
    const expense = expenses.find(exp => exp.id === expenseId);
    if (!expense) return false;

    try {
      // Reversează distribuția pe facturile asociate
      if (invoiceFunctions?.removeInvoiceDistribution && invoiceFunctions?.invoices) {
        const expenseTypeId = expense.expenseTypeId || expense.expenseType || expense.name;
        const linkedInvoices = invoiceFunctions.invoices.filter(inv =>
          inv.distributionHistory?.some(entry =>
            entry.expenseId === expenseId ||
            entry.expenseTypeId === expenseId ||
            entry.expenseId === expenseTypeId ||
            entry.expenseTypeId === expenseTypeId
          )
        );
        for (const invoice of linkedInvoices) {
          await invoiceFunctions.removeInvoiceDistribution(invoice.id, expenseId, expenseTypeId);
        }
      }

      await deleteMonthlyExpense(expenseId);
      return true;
    } catch (error) {
      console.error('❌ Eroare la ștergerea cheltuielii lunare:', error);
      alert('Eroare la ștergerea cheltuielii lunare: ' + error.message);
      return false;
    }
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

    return addExpenseInternal(expenseDataParam, addInvoiceFn, invoiceFunctions);
  };

  // ✏️ ACTUALIZAREA CHELTUIELII
  const handleUpdateExpense = async (expenseId, expenseDataParam, invoiceFunctions = null) => {

    const expenseData = expenseDataParam;

    if (!expenseId || !expenseData?.name || !association) {
      return false;
    }

    const expenseSettings = getExpenseConfig(expenseData.name);
    const isConsumptionBased = expenseSettings.distributionType === "consumption";
    const isIndividualBased = expenseSettings.distributionType === "individual";


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

      await updateExpenseInSheet(expenseId, updatedExpense);

      // Update invoices collection dacă există invoice data și funcții pentru update
      if (invoiceFunctions && expenseData.invoiceData && expenseData.invoiceData.invoiceNumber) {
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

          } else {
          }

          // Actualizează și distributionHistory dacă suma s-a schimbat
          if (updateInvoiceDistribution && getInvoiceByNumber) {

            const invoice = await getInvoiceByNumber(expenseData.invoiceData.invoiceNumber);

            if (invoice) {

              // Calculează suma distribuită (noua sumă sau suma veche)
              const currentDistribution = parseFloat(expenseData.amount || expenseData.billAmount || 0);

              // Actualizează sau adaugă în distributionHistory
              // Verifică dacă deja există o intrare pentru acest expenseId
              const existingDistribution = invoice.distributionHistory?.find(
                dist => {
                  return dist.expenseId === expenseId;
                }
              );


              if (existingDistribution) {
                // Deja există - trebuie să actualizăm suma distribuită

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

              } else {
                // Nu există - este o nouă distribuție (nu ar trebui să se întâmple în edit, dar handle-uim)

                await updateInvoiceDistribution(invoice.id, {
                  sheetId: currentSheet?.id || null,
                  month: currentMonth,
                  amount: currentDistribution,
                  expenseId: expenseId,
                  expenseTypeId: expenseSettings.id,  // ID-ul tipului de cheltuială
                  expenseName: expenseData.name,  // Păstrăm numele pentru afișare
                  notes: `Distribuție pentru ${expenseData.name}`
                });

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
    togglePortalSubmission,

    // 📊 Statistici și date
    expenseStats
  };
};