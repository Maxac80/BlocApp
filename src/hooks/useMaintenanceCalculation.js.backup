import { useCallback, useMemo, useState, useEffect } from "react";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 🧮 Custom Hook pentru Calculul Întreținerii
 *
 * RESPONSABILITĂȚI:
 * - Calculul întreținerii pentru apartamente
 * - Gestionarea tabelelor lunare
 * - Calculul detaliat al cheltuielilor
 * - Toggle plăți
 * - Gestionarea soldurilor
 */
export const useMaintenanceCalculation = ({
  association,
  blocks,
  stairs,
  apartments,
  expenses,
  currentMonth,
  calculateNextMonthBalances, // Funcția din useBalanceManagement
  // Parametri noi pentru integrarea cu sheet-uri
  currentSheet,
  publishedSheet,
  getSheetBalances,
  getCurrentSheetBalance,
  // Funcția pentru salvarea automată a tabelului calculat
  updateCurrentSheetMaintenanceTable
}) => {
  // 📊 STATE LOCAL PENTRU TABELE ȘI SOLDURI
  const [monthlyTables, setMonthlyTables] = useState({});
  const [monthlyBalances, setMonthlyBalances] = useState({});

  // 🔄 ÎNCARCĂ SOLDURILE PENTRU LUNA CURENTĂ DIN FIREBASE
  useEffect(() => {
    const loadCurrentMonthBalances = async () => {
      if (!association?.id || !currentMonth) return;

      const monthKey = `${association.id}-${currentMonth}`;
      
      // Verifică dacă sunt deja încărcate
      if (monthlyBalances[monthKey]) return;

      try {
        console.log(`📥 Încarc soldurile pentru luna curentă: ${currentMonth}`);
        
        const balancesQuery = query(
          collection(db, 'initialBalances'),
          where('associationId', '==', association.id),
          where('month', '==', currentMonth)
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
        
        if (Object.keys(loadedBalances).length > 0) {
          console.log(`✅ Solduri încărcate pentru ${currentMonth}:`, Object.keys(loadedBalances).length, 'apartamente');
          setMonthlyBalances(prev => ({
            ...prev,
            [monthKey]: loadedBalances
          }));
        } else {
          console.log(`ℹ️ Nu există solduri salvate pentru ${currentMonth} - pornesc cu 0`);
        }
        
      } catch (error) {
        console.error(`❌ Eroare la încărcarea soldurilor pentru ${currentMonth}:`, error);
      }
    };

    loadCurrentMonthBalances();
  }, [association?.id, currentMonth, monthlyBalances]);

  // 🏠 CALCULEAZĂ APARTAMENTELE ASOCIAȚIEI - CA FUNCȚIE
  const getAssociationApartments = useCallback(() => {
    if (!association?.id) {
      return [];
    }

    const associationBlocks = blocks.filter((block) => block.associationId === association.id);
    const associationStairs = stairs.filter((stair) =>
      associationBlocks.some((block) => block.id === stair.blockId)
    );
    const associationApartments = apartments.filter((apartment) =>
      associationStairs.some((stair) => stair.id === apartment.stairId)
    );

    return associationApartments.sort((a, b) => {
      const aStair = associationStairs.find((s) => s.id === a.stairId);
      const bStair = associationStairs.find((s) => s.id === b.stairId);
      const aBlock = associationBlocks.find((bl) => bl.id === aStair?.blockId);
      const bBlock = associationBlocks.find((bl) => bl.id === bStair?.blockId);

      if (aBlock?.name !== bBlock?.name) {
        return aBlock?.name.localeCompare(bBlock?.name) || 0;
      }
      if (aStair?.name !== bStair?.name) {
        return aStair?.name.localeCompare(bStair?.name) || 0;
      }
      return a.number - b.number;
    });
  }, [association?.id, blocks, stairs, apartments]);

  // 📋 OBȚINE TABELUL CURENT
  const getCurrentMonthTable = useCallback(() => {
    const key = `${association?.id}-${currentMonth}`;
    return monthlyTables[key] || null;
  }, [association?.id, currentMonth, monthlyTables]);

  // 🔄 SINCRONIZARE AUTOMATĂ A SOLDURILOR PENTRU LUNA CURENTĂ
  // DEZACTIVAT - folosim doar solduri 0 pentru luna curentă, fără încărcare din alte surse
  const syncCurrentMonthBalances = useCallback(() => {
    if (!association?.id || !currentMonth) return;
    
    const monthKey = `${association?.id}-${currentMonth}`;
    
    // Verifică dacă avem deja solduri pentru luna curentă
    if (monthlyBalances[monthKey]) {
      return; // Deja sunt încărcate
    }
    
    console.log(`🔄 syncCurrentMonthBalances - Inițializez solduri 0 pentru luna curentă: ${currentMonth}`);
    
    // Nu mai calculez din luna precedentă - toate soldurile încep cu 0
    // Soldurile reale vor veni doar din tabelul de întreținere cu încasările efectuate
    
  }, [association?.id, currentMonth, monthlyBalances]);

  // 💰 GESTIONAREA SOLDURILOR  
  const getApartmentBalance = useCallback(
    (apartmentId) => {
      console.log(`💰 🔴 getApartmentBalance ENTRY for apartment ${apartmentId}:`, {
        hasCurrentSheet: !!currentSheet,
        hasPublishedSheet: !!publishedSheet,
        currentSheetId: currentSheet?.id,
        publishedSheetId: publishedSheet?.id,
        currentMonth: currentMonth,
        publishedMonth: publishedSheet?.monthYear,
        currentSheetMonth: currentSheet?.monthYear,
        isViewingPublishedSheet: publishedSheet && publishedSheet.monthYear === currentMonth,
        hasCurrentMaintenanceTable: !!currentSheet?.maintenanceTable,
        hasPublishedMaintenanceTable: !!publishedSheet?.maintenanceTable,
        currentMaintenanceTableLength: currentSheet?.maintenanceTable?.length || 0,
        publishedMaintenanceTableLength: publishedSheet?.maintenanceTable?.length || 0
      });

      // 🔒 PRIORITATE ABSOLUTĂ: Când vizualizăm sheet-ul publicat (currentMonth === publishedSheet.monthYear)
      // ȘI currentSheet este același cu publishedSheet (nu calculăm pentru un sheet diferit)
      const isAbsolutePriority = publishedSheet && publishedSheet.monthYear === currentMonth &&
          (!currentSheet || currentSheet.id === publishedSheet.id);

      console.log(`🔒 ABSOLUTE PRIORITY CHECK for ${apartmentId}:`, {
        hasPublishedSheet: !!publishedSheet,
        publishedMonthMatchesCurrent: publishedSheet?.monthYear === currentMonth,
        noCurrentSheet: !currentSheet,
        currentSheetMatchesPublished: currentSheet?.id === publishedSheet?.id,
        willUseAbsolutePriority: isAbsolutePriority
      });

      if (isAbsolutePriority) {
        console.log(`🔒 🔴 USING ABSOLUTE PRIORITY - published sheet for ${apartmentId}`);
        console.log(`🔒 VIEWING PUBLISHED SHEET - using LOCKED data only for ${apartmentId}`);

        if (publishedSheet.maintenanceTable && publishedSheet.maintenanceTable.length > 0) {
          const apartmentRow = publishedSheet.maintenanceTable.find(row => row.apartmentId === apartmentId);
          if (apartmentRow) {
            console.log(`✅ Using LOCKED data from published sheet for apartment ${apartmentId}:`, {
              restante: apartmentRow.restante || 0,
              penalitati: apartmentRow.penalitati || 0
            });
            return {
              restante: apartmentRow.restante || 0,
              penalitati: apartmentRow.penalitati || 0
            };
          }
        } else {
          // Dacă sheet-ul publicat nu are maintenanceTable, folosește soldurile inițiale
          console.log(`⚠️ Published sheet missing maintenanceTable, using initial balances for ${apartmentId}`);
          const apartment = apartments.find(apt => apt.id === apartmentId);
          if (apartment?.initialBalance) {
            return {
              restante: apartment.initialBalance.restante || 0,
              penalitati: apartment.initialBalance.penalitati || 0
            };
          }
        }
      }

      // PRIORITATE 1: Pentru sheet-ul curent (IN_PROGRESS), citește din maintenanceTable salvat (DOAR dacă sunt ajustări manuale)
      // Această prioritate este cea mai mare pentru a păstra modificările manuale și rupe legătura cu sheet-ul anterior
      const hasPriority1 = currentSheet && currentSheet.maintenanceTable && currentSheet.maintenanceTable.length > 0;

      console.log(`🎯 PRIORITY 1 CHECK for ${apartmentId}:`, {
        hasCurrentSheet: !!currentSheet,
        hasMaintenanceTable: !!currentSheet?.maintenanceTable,
        maintenanceTableLength: currentSheet?.maintenanceTable?.length || 0,
        willCheckPriority1: hasPriority1
      });

      if (hasPriority1) {
        const apartmentRow = currentSheet.maintenanceTable.find(row => row.apartmentId === apartmentId);

        console.log(`🎯 PRIORITY 1 APARTMENT ROW for ${apartmentId}:`, {
          foundRow: !!apartmentRow,
          restante: apartmentRow?.restante || 0,
          penalitati: apartmentRow?.penalitati || 0,
          hasManualData: apartmentRow && (apartmentRow.restante > 0 || apartmentRow.penalitati > 0)
        });

        if (apartmentRow && (apartmentRow.restante > 0 || apartmentRow.penalitati > 0)) {
          console.log(`🎯 MANUAL ADJUSTMENTS - Using current sheet data for apartment ${apartmentId}:`, {
            restante: apartmentRow.restante || 0,
            penalitati: apartmentRow.penalitati || 0,
            apartmentNumber: apartmentRow.apartment,
            sheetId: currentSheet.id,
            note: "Legătura cu sheet-ul anterior este ruptă"
          });

          return {
            restante: apartmentRow.restante || 0,
            penalitati: apartmentRow.penalitati || 0
          };
        } else if (apartmentRow) {
          console.log(`🎯 PRIORITY 1 - Found row but no manual data (restante: ${apartmentRow.restante}, penalitati: ${apartmentRow.penalitati}), continuing to next priority`);
        }
      }

      // PRIORITATE 2: Pentru sheet-ul în lucru nou (sheet 2), folosește soldurile transferate din sheet-ul publicat
      // TEMPORAR DEZACTIVAT - folosim direct calculul din published sheet
      if (false && currentSheet && currentSheet.balances?.transferred && currentSheet.balances?.apartmentBalances) {
        console.log(`🔍 DEBUG currentSheet.balances pentru ${apartmentId}:`, {
          transferred: currentSheet.balances.transferred,
          apartmentBalances: currentSheet.balances.apartmentBalances,
          hasThisApartment: !!currentSheet.balances.apartmentBalances[apartmentId]
        });

        const transferredBalance = currentSheet.balances.apartmentBalances[apartmentId];
        console.log(`💰 Checking transferred balance for apartment ${apartmentId}:`, transferredBalance);

        // VERIFICARE SPECIALĂ: Dacă balances există dar sunt greșite, folosește fallback
        if (transferredBalance && transferredBalance.remaining > 0) {
          console.log(`🚫 SKIPPING transferred balance - using fallback instead for ${apartmentId}`);
          // Continuă la PRIORITATE 3 (fallback)
        } else {
          if (transferredBalance) {
            console.log(`✅ Using transferred balance for apartment ${apartmentId}:`, {
              original: transferredBalance.original,
              paid: transferredBalance.paid,
              remaining: transferredBalance.remaining,
              convertedToRestante: transferredBalance.remaining || 0
            });
            // Convertește din structura 'remaining' în 'restante'
            return {
              restante: transferredBalance.remaining || 0,
              penalitati: 0  // Pentru moment, penalitățile rămân 0
            };
          } else {
            console.log(`⚠️ No transferred balance found for apartment ${apartmentId}`);
          }
        }
      }

      // PRIORITATE 3: Pentru sheet-ul în lucru (sheet 2), calculează ÎNTOTDEAUNA din sheet-ul publicat
      const hasPriority3 = publishedSheet && currentSheet && currentSheet.monthYear !== publishedSheet.monthYear;

      console.log(`🔍 PRIORITY 3 CHECK for ${apartmentId}:`, {
        hasPublishedSheet: !!publishedSheet,
        hasCurrentSheet: !!currentSheet,
        differentMonths: publishedSheet?.monthYear !== currentSheet?.monthYear,
        publishedMonth: publishedSheet?.monthYear,
        currentMonth: currentSheet?.monthYear,
        willUsePriority3: hasPriority3
      });

      if (hasPriority3) {
        console.log(`🔍 🔴 USING PRIORITY 3 - calculating from published sheet for ${apartmentId}`);
        console.log(`🔍 Calculating from published sheet for current sheet ${apartmentId}:`, {
          publishedMonth: publishedSheet.monthYear,
          currentMonth: currentSheet.monthYear,
          hasMaintenanceTable: !!publishedSheet.maintenanceTable,
          maintenanceTableLength: publishedSheet.maintenanceTable?.length || 0
        });

        if (publishedSheet.maintenanceTable && publishedSheet.maintenanceTable.length > 0) {
        const apartmentRow = publishedSheet.maintenanceTable.find(row => row.apartmentId === apartmentId);

        if (apartmentRow) {
          // Calculează cât a plătit apartamentul în luna publicată
          const payments = publishedSheet.payments || [];
          const apartmentPayments = payments.filter(p => p.apartmentId === apartmentId);
          const totalPaid = apartmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

          // Calculează restanța = Total datorat - Total plătit
          const totalDatorat = apartmentRow.totalDatorat || 0;
          const restante = Math.max(0, totalDatorat - totalPaid);

          console.log(`💰 Published sheet calculation for apartment ${apartmentId}:`, {
            totalDatorat,
            totalPaid,
            restante: Math.round(restante * 100) / 100,
            apartmentNumber: apartmentRow.apartment
          });

          return {
            restante: Math.round(restante * 100) / 100,
            penalitati: 0
          };
        }
        } else {
          // FALLBACK: Dacă sheet-ul publicat nu are maintenanceTable salvat,
          // calculează dinamic folosind cheltuielile și soldurile inițiale
          console.log(`🔧 FALLBACK: Calculez dinamic pentru ${apartmentId} din published sheet`);

          const apartment = apartments.find(apt => apt.id === apartmentId);
          if (apartment && publishedSheet.expenses) {
            // Calculează întreținerea curentă din cheltuielile sheet-ului
            let currentMaintenance = 0;
            publishedSheet.expenses.forEach(expense => {
              if (expense.type === 'persoana') {
                currentMaintenance += (apartment.persons || 1) * (expense.amount || 0);
              } else if (expense.type === 'apartament') {
                currentMaintenance += expense.amount || 0;
              }
            });

            // Adaugă soldurile inițiale
            const initialRestante = apartment.initialBalance?.restante || 0;
            const initialPenalitati = apartment.initialBalance?.penalitati || 0;
            const totalDatorat = currentMaintenance + initialRestante + initialPenalitati;

            // Calculează plățile
            const payments = publishedSheet.payments || [];
            const apartmentPayments = payments.filter(p => p.apartmentId === apartmentId);
            const totalPaid = apartmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

            const restante = Math.max(0, totalDatorat - totalPaid);

            console.log(`💰 FALLBACK calculation for apartment ${apartmentId}:`, {
              currentMaintenance,
              initialRestante,
              initialPenalitati,
              totalDatorat,
              totalPaid,
              restante
            });

            return {
              restante: Math.round(restante * 100) / 100,
              penalitati: 0
            };
          }
        }
      }

      // PRIORITATE 4: Verifică în monthlyBalances pentru balance adjustments (fallback local)
      const monthKey = `${association?.id}-${currentMonth}`;
      const monthlyBalance = monthlyBalances?.[monthKey]?.[apartmentId];
      if (monthlyBalance) {
        console.log(`⚠️ Using local monthly balance (fallback) for apartment ${apartmentId}:`, monthlyBalance);
        return {
          restante: monthlyBalance.restante || 0,
          penalitati: monthlyBalance.penalitati || 0
        };
      }

      // PRIORITATE 5: Pentru primul sheet - folosește initialBalance din apartament
      console.log(`⚠️ 🔴 USING PRIORITY 5 - initial balance for ${apartmentId}`);
      const apartment = apartments.find(apt => apt.id === apartmentId);
      if (apartment?.initialBalance) {
        console.log(`✅ Using initial balance for apartment ${apartmentId}:`, apartment.initialBalance);
        return {
          restante: apartment.initialBalance.restante || 0,
          penalitati: apartment.initialBalance.penalitati || 0
        };
      }

      console.log(`⚠️ No balance found for apartment ${apartmentId}, returning zeros`);
      return { restante: 0, penalitati: 0 };
    },
    [publishedSheet, currentSheet, apartments, monthlyBalances, association?.id, currentMonth]
  );

  const setApartmentBalance = useCallback(
    (apartmentId, balance) => {
      const monthKey = `${association?.id}-${currentMonth}`;
      console.log(`💾 setApartmentBalance - apartmentId: ${apartmentId}, balance:`, balance);
      setMonthlyBalances((prev) => {
        const newBalances = {
          ...prev,
          [monthKey]: {
            ...prev[monthKey],
            [apartmentId]: balance,
          },
        };
        console.log('💾 Updated monthlyBalances:', newBalances);
        return newBalances;
      });
    },
    [association?.id, currentMonth]
  );

  // 🧮 CALCULUL PRINCIPAL AL ÎNTREȚINERII CU DETALII
  const calculateMaintenanceWithDetails = useCallback(() => {
    const associationApartments = getAssociationApartments();
    const associationExpenses = expenses.filter(
      (exp) => exp.associationId === association?.id && exp.month === currentMonth
    );

    if (!associationApartments.length) {
      return [];
    }

    const totalPersons = associationApartments.reduce((sum, apt) => sum + apt.persons, 0);
    const totalApartments = associationApartments.length;

    const tableData = associationApartments
      .map((apartment) => {
        let currentMaintenance = 0;
        const expenseDetails = {};

        associationExpenses.forEach((expense) => {
          let apartmentCost = 0;

          switch (expense.distributionType || "apartment") {
            case "apartment":
              apartmentCost = expense.amount / totalApartments;
              break;

            case "individual":
              apartmentCost = parseFloat(expense.individualAmounts?.[apartment.id]) || 0;
              break;

            case "person":
              const costPerPerson = expense.amount / totalPersons;
              apartmentCost = costPerPerson * apartment.persons;
              break;

            case "consumption":
              const consumption = parseFloat(expense.consumption[apartment.id]) || 0;
              apartmentCost = consumption * expense.unitPrice;
              break;

            default:
              apartmentCost = expense.amount / totalApartments;
          }

          currentMaintenance += apartmentCost;
          // Adaugă în expenseDetails doar dacă valoarea este diferită de 0
          if (apartmentCost > 0) {
            expenseDetails[expense.name] = Math.round(apartmentCost * 100) / 100;
          }
        });

        const balance = getApartmentBalance(apartment.id);
        console.log(`🎯 DIRECT CALL getApartmentBalance for apartment ${apartment.number} (${apartment.id}):`, balance);

        const stair = stairs.find((s) => s.id === apartment.stairId);
        const block = blocks.find((b) => b.id === stair?.blockId);

        // SIMPLIFICAT - folosim doar solduri 0 + ce vine din publicarea lunii precedente
        // Nu mai adunăm cu apartment.initialBalance sau alte surse
        const totalRestante = balance.restante || 0;  // Ce a fost transferat din luna precedentă
        const totalPenalitati = balance.penalitati || 0;  // Ce a fost transferat din luna precedentă

        console.log(`🧮 Calcul final pentru ap. ${apartment.number}:`, {
          balanceFromGetApartmentBalance: balance,
          totalRestante: totalRestante,
          totalPenalitati: totalPenalitati,
          willShowInTable: totalRestante
        });

        return {
          apartmentId: apartment.id,
          apartment: apartment.number,
          owner: apartment.owner,
          persons: apartment.persons,
          blockName: block?.name || "",
          stairName: stair?.name || "",
          currentMaintenance: Math.round(currentMaintenance * 100) / 100,
          restante: Math.round(totalRestante * 100) / 100,
          totalMaintenance: Math.round((currentMaintenance + totalRestante) * 100) / 100,
          penalitati: Math.round(totalPenalitati * 100) / 100,
          totalDatorat:
            Math.round((currentMaintenance + totalRestante + totalPenalitati) * 100) / 100,
          paid: false,
          expenseDetails: expenseDetails
          // Nu mai returnăm initialBalance - folosim doar solduri din luna precedentă
        };
      })
      .sort((a, b) => a.apartment - b.apartment);

    return tableData;
  }, [
    getAssociationApartments,
    expenses,
    association?.id,
    currentMonth,
    getApartmentBalance,
    stairs,
    blocks,
  ]);

  // 📊 CALCULUL PRINCIPAL (cu cache din tabel sau recalculare)
  const calculateMaintenance = useCallback(() => {
    const currentTable = getCurrentMonthTable();
    if (currentTable && currentTable.length > 0) {
      return currentTable;
    }
    return calculateMaintenanceWithDetails();
  }, [getCurrentMonthTable, calculateMaintenanceWithDetails]);

  // 💳 TOGGLE PAYMENT STATUS
  const togglePayment = useCallback(
    (apartmentId) => {
      const key = `${association?.id}-${currentMonth}`;
      const currentTable = getCurrentMonthTable() || calculateMaintenanceWithDetails();

      if (!currentTable.length) {
        return;
      }

      const updatedTable = currentTable.map((row) =>
        row.apartmentId === apartmentId ? { ...row, paid: !row.paid } : row
      );

      setMonthlyTables((prev) => ({
        ...prev,
        [key]: updatedTable,
      }));
    },
    [association?.id, currentMonth, getCurrentMonthTable, calculateMaintenanceWithDetails]
  );

  // 📅 ÎNCHIDEREA LUNII CURENTE
  const closeCurrentMonth = useCallback(() => {
    console.log('📅 closeCurrentMonth - Folosesc logica din useBalanceManagement');
    
    const currentTable = getCurrentMonthTable() || calculateMaintenanceWithDetails();

    if (currentTable && currentTable.length > 0 && calculateNextMonthBalances) {
      // Folosim funcția din useBalanceManagement care ia în calcul plățile parțiale
      const nextMonthBalances = calculateNextMonthBalances(currentTable, currentMonth);
      
      console.log('📅 closeCurrentMonth - Solduri calculate pentru luna următoare:', nextMonthBalances);
      
      // Actualizăm monthlyBalances cu noile solduri
      setMonthlyBalances((prev) => ({
        ...prev,
        ...nextMonthBalances  // nextMonthBalances vine deja cu cheia corectă
      }));
      
      return nextMonthBalances;
    } else {
      console.warn('📅 closeCurrentMonth - Nu pot calcula soldurile: currentTable sau calculateNextMonthBalances lipsește');
      return {};
    }
  }, [association?.id, getCurrentMonthTable, calculateMaintenanceWithDetails, currentMonth, calculateNextMonthBalances]);

  // 🔄 FORȚARE RECALCULARE COMPLETĂ
  const forceRecalculate = useCallback(() => {
    const key = `${association?.id}-${currentMonth}`;
    console.log(`🔄 forceRecalculate - Șterg cache pentru cheia: ${key}`);
    setMonthlyTables(prev => {
      const newTables = { ...prev };
      console.log('🔄 Cache înainte de ștergere:', prev);
      delete newTables[key];
      console.log('🔄 Cache după ștergere:', newTables);
      return newTables;
    });
  }, [association?.id, currentMonth]);

  // 📊 MEMOIZED MAINTENANCE DATA - SIMPLIFICAT PENTRU DEBUGGING
  const maintenanceData = useMemo(() => {
    console.log('🔄 maintenanceData useMemo - START:', {
      hasAssociation: !!association?.id,
      currentMonth,
      hasPublishedSheet: !!publishedSheet,
      publishedSheetMonth: publishedSheet?.monthYear,
      hasMaintenanceTable: !!publishedSheet?.maintenanceTable,
      maintenanceTableLength: publishedSheet?.maintenanceTable?.length || 0,
    });

    if (!association?.id || !currentMonth) {
      console.log('⚠️ No association or currentMonth, returning []');
      return [];
    }

    // PRIORITATE 1: Dacă avem sheet publicat pentru această lună, folosește-l
    if (publishedSheet && publishedSheet.monthYear === currentMonth) {
      if (publishedSheet.maintenanceTable && publishedSheet.maintenanceTable.length > 0) {
        console.log('✅ USING PUBLISHED SHEET DATA:', publishedSheet.maintenanceTable.length, 'rows');
        return publishedSheet.maintenanceTable;
      } else {
        console.log('⚠️ Published sheet found but no maintenance table data');
      }
    }

    // PRIORITATE 2: Încearcă calculul dinamic
    console.log('🧮 CALCULATING DYNAMIC DATA...');
    const dynamicResult = calculateMaintenanceWithDetails();
    console.log('📊 Dynamic calculation result:', dynamicResult?.length || 0, 'rows');

    return dynamicResult || [];
  }, [association?.id, currentMonth, publishedSheet, calculateMaintenanceWithDetails]);

  // 📈 STATISTICI ÎNTREȚINERE
  const maintenanceStats = useMemo(() => {
    if (!maintenanceData.length) return null;

    const totalMaintenance = maintenanceData.reduce((sum, row) => sum + row.totalDatorat, 0);
    const paidAmount = maintenanceData
      .filter((row) => row.paid)
      .reduce((sum, row) => sum + row.totalDatorat, 0);
    const unpaidAmount = totalMaintenance - paidAmount;
    const totalApartments = maintenanceData.length;
    const paidApartments = maintenanceData.filter((row) => row.paid).length;

    return {
      totalMaintenance: Math.round(totalMaintenance * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      unpaidAmount: Math.round(unpaidAmount * 100) / 100,
      totalApartments,
      paidApartments,
      unpaidApartments: totalApartments - paidApartments,
      paymentPercentage:
        totalApartments > 0 ? Math.round((paidApartments / totalApartments) * 100) : 0,
    };
  }, [maintenanceData]);

  // 🔄 SALVARE AUTOMATĂ ÎN FIREBASE - pentru sheet-ul curent (IN_PROGRESS)
  useEffect(() => {
    // Salvează automat doar pentru sheet-ul curent (IN_PROGRESS)
    // NU pentru sheet-ul publicat (care trebuie să rămână neschimbat)
    if (
      currentSheet &&
      currentSheet.status === 'IN_PROGRESS' &&
      maintenanceData &&
      maintenanceData.length > 0 &&
      updateCurrentSheetMaintenanceTable &&
      currentSheet.monthYear === currentMonth
    ) {
      console.log('💾 Auto-saving maintenance data to current sheet:', {
        sheetId: currentSheet.id,
        month: currentSheet.monthYear,
        rowsCount: maintenanceData.length
      });

      // Salvează cu un mic delay pentru a evita multiple salvări rapide
      const timeoutId = setTimeout(() => {
        updateCurrentSheetMaintenanceTable(maintenanceData).catch(error => {
          console.error('❌ Error auto-saving maintenance data:', error);
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [maintenanceData, currentSheet?.id, currentSheet?.status, currentSheet?.monthYear, currentMonth, updateCurrentSheetMaintenanceTable]);

  // 🎯 RETURN API
  return {
    // 📊 Date calculate
    maintenanceData,
    maintenanceStats,

    // 🔧 Funcții de calcul
    calculateMaintenance,
    calculateMaintenanceWithDetails,
    getCurrentMonthTable,

    // 💰 Gestionare solduri
    getApartmentBalance,
    setApartmentBalance,
    monthlyBalances,
    setMonthlyBalances,

    // 📋 Gestionare tabele
    monthlyTables,
    setMonthlyTables,

    // 🎮 Acțiuni
    togglePayment,
    closeCurrentMonth,
    forceRecalculate,

    // 🏠 Utilitare
    getAssociationApartments,
  };
};