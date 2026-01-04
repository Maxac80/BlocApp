// src/components/views/MaintenanceView.js
import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, Plus, Settings, Info, X } from 'lucide-react';
import { MaintenanceTableSimple, MaintenanceTableDetailed, MaintenanceSummary } from '../tables';
import { ExpenseForm, ExpenseList } from '../expenses';
import { ExpenseConfigModal, AdjustBalancesModal, PaymentModal, ExpenseEntryModal, MaintenanceBreakdownModal } from '../modals';
import DashboardHeader from '../dashboard/DashboardHeader';
import { useIncasari } from '../../hooks/useIncasari';
import { usePaymentSync } from '../../hooks/usePaymentSync';
import useInvoices from '../../hooks/useInvoices';
import jsPDF from 'jspdf';

const MaintenanceView = ({
  // Association data
  association,
  blocks,
  stairs,
  getAssociationApartments,

  // Month management
  currentMonth,
  setCurrentMonth,
  isMonthReadOnly,
  shouldShowPublishButton,
  shouldShowAdjustButton,
  publishMonth,
  unpublishSheet, // Funcție pentru depublicare
  getAvailableMonths,
  getCurrentActiveMonth,
  getNextActiveMonth,
  getMonthType,

  // Pending apartment for maintenance breakdown
  pendingMaintenanceApartmentId,
  setPendingMaintenanceApartmentId,

  // Sheets
  activeSheet, // 🆕 Sheet activ calculat de BlocApp (poate fi archived, published sau in_progress)

  // Expenses
  expenses,
  newExpense,
  setNewExpense,
  getAvailableExpenseTypes,
  areAllExpensesFullyCompleted,
  getExpenseConfig,
  handleAddExpense: addExpenseFromHook,  // Redenumit pentru a evita conflict de nume
  handleUpdateExpense,
  handleDeleteMonthlyExpense,
  updateExpenseConsumption,
  updateExpenseIndividualAmount,
  updatePendingConsumption,
  updatePendingIndividualAmount,
  updateExpenseIndexes,
  updatePendingIndexes,

  // Maintenance calculation
  maintenanceData,
  calculateExpenseDifferences,
  togglePayment,
  activeMaintenanceTab,
  setActiveMaintenanceTab,
  forceRecalculate,
  
  // Modals and balances
  showAdjustBalances,
  setShowAdjustBalances,
  showExpenseConfig,
  setShowExpenseConfig,
  adjustModalData,
  setAdjustModalData,
  getApartmentBalance,
  setApartmentBalance,
  saveBalanceAdjustments,
  updateCurrentSheetMaintenanceTable,
  createInitialSheet,
  currentSheet,
  publishedSheet, // Sheet publicat pentru ID
  setMonthlyTables,
  
  // Expense configuration
  selectedExpenseForConfig,
  setSelectedExpenseForConfig,
  newCustomExpense,
  setNewCustomExpense,
  handleAddCustomExpense,
  getAssociationExpenseTypes,
  updateExpenseConfig,
  saveApartmentParticipations,
  getApartmentParticipation,
  setApartmentParticipation,
  getDisabledExpenseTypes,
  toggleExpenseStatus,
  deleteCustomExpense,

  // Navigation
  handleNavigation,

  // Monthly balances
  monthlyBalances
}) => {

  // TOATE HOOK-URILE TREBUIE SĂ FIE APELATE ÎNAINTE DE ORICE RETURN CONDIȚIONAL

  // State pentru modalul de plăți
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);

  // State pentru modalul de breakdown întreținere
  const [showMaintenanceBreakdown, setShowMaintenanceBreakdown] = useState(false);
  const [selectedMaintenanceData, setSelectedMaintenanceData] = useState(null);

  // State pentru modalul de adăugare cheltuială
  const [showExpenseEntryModal, setShowExpenseEntryModal] = useState(false);

  // State pentru modalul de cheltuieli disponibile
  const [showAvailableExpensesModal, setShowAvailableExpensesModal] = useState(false);

  // State pentru editarea cheltuielilor
  const [editingExpense, setEditingExpense] = useState(null);

  // Handler pentru editarea cheltuielilor
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseEntryModal(true);
  };

  // State pentru tab-urile de scări
  const [selectedStairTab, setSelectedStairTab] = useState('all');

  // State pentru tab-ul inițial al modalului de configurare
  const [configModalInitialTab, setConfigModalInitialTab] = useState('general');

  // State pentru a păstra cheltuielile expandate (persistă între tab-uri)
  const [expandedExpenses, setExpandedExpenses] = useState({});

  // Reset expandedExpenses când se schimbă luna
  useEffect(() => {
    setExpandedExpenses({});
  }, [currentMonth]);

  // 🆕 Hook pentru gestionarea încasărilor - folosește activeSheet pasat de BlocApp (include locked sheets: published + archived)
  // Pentru locked sheets (published/archived), permitem citirea plăților (read-only pentru archived)
  // Pentru in_progress sheets, nu există încă plăți (sheet-ul nu e finalizat)
  const publishedSheetForPayments = (activeSheet?.status === 'published' || activeSheet?.status === 'archived')
    ? activeSheet
    : null;

  console.log('🔍 DEBUG Payment Sheet Selection:', {
    currentMonth,
    activeSheetMonth: activeSheet?.monthYear,
    activeSheetStatus: activeSheet?.status,
    isLockedSheet: activeSheet?.status === 'published' || activeSheet?.status === 'archived',
    publishedSheetForPayments: publishedSheetForPayments ? 'FOUND' : 'NULL',
    paymentsCount: activeSheet?.payments?.length || 0
  });

  const { addIncasare, incasari, loading: incasariLoading } = useIncasari(association || null, currentMonth, publishedSheetForPayments);

  // Hook pentru gestionarea facturilor cu suport complet pentru distribuție parțială
  const {
    invoices,
    addInvoice,
    updateInvoice,
    updateInvoiceByNumber,
    updateInvoiceDistribution,
    getPartiallyDistributedInvoices,
    getInvoiceByNumber,
    syncSuppliersForExpenseType,
    migrateDistributionHistoryToExpenseTypeId
  } = useInvoices(association?.id);

  // Hook pentru sincronizarea plăților cu tabelul de întreținere
  // Folosim același sheet ca pentru payments (publishedSheetForPayments)
  const {
    getUpdatedMaintenanceData,
    getApartmentPayments,
    getPaymentStats,
    loading: paymentSyncLoading
  } = usePaymentSync(association || null, currentMonth, publishedSheetForPayments);

  // State pentru a urmări dacă datele inițiale au fost încărcate complet
  const [isDataReady, setIsDataReady] = useState(false);

  // Monitorizează când toate datele sunt gata
  useEffect(() => {
    if (!incasariLoading && !paymentSyncLoading) {
      const timer = setTimeout(() => {
        setIsDataReady(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsDataReady(false);
    }
  }, [incasariLoading, paymentSyncLoading]);

  // Reset isDataReady când se schimbă luna
  useEffect(() => {
    setIsDataReady(false);
  }, [currentMonth]);

  // Calculează datele actualizate pentru afișare în tabel (înainte de early return)
  // Acestea vor reflecta datoriile reale după încasări
  // IMPORTANT: Calculăm întotdeauna datele, NU le schimbăm condiționat
  const updatedMaintenanceData = useMemo(() => {
    return getUpdatedMaintenanceData(maintenanceData);
  }, [maintenanceData, getUpdatedMaintenanceData]);

  console.log('🔍 MaintenanceView data check:', {
    isMonthReadOnly,
    maintenanceDataLength: maintenanceData?.length || 0,
    firstRowHasExpenseDetails: !!maintenanceData?.[0]?.expenseDetails,
    firstRowExpenseDetailsKeys: Object.keys(maintenanceData?.[0]?.expenseDetails || {}),
    updatedFirstRowHasExpenseDetails: !!updatedMaintenanceData?.[0]?.expenseDetails,
    updatedFirstRowExpenseDetailsKeys: Object.keys(updatedMaintenanceData?.[0]?.expenseDetails || {})
  });

  // Grupează scările pentru tab-uri (înainte de early return pentru Rules of Hooks)
  const stairTabs = useMemo(() => {
    if (!association || !blocks || !stairs) return [];

    const associationBlocks = blocks.filter(block => block.associationId === association.id);
    const associationStairs = stairs.filter(stair =>
      associationBlocks.some(block => block.id === stair.blockId)
    );

    return associationStairs.map(stair => {
      const block = blocks.find(b => b.id === stair.blockId);
      return {
        id: stair.id,
        name: stair.name,
        blockName: block?.name || '',
        label: `${block?.name || ''} - ${stair.name}`
      };
    });
  }, [association, blocks, stairs]);

  // Get all apartments for the association
  const apartments = useMemo(() => {
    if (!getAssociationApartments || typeof getAssociationApartments !== 'function') {
      return [];
    }
    return getAssociationApartments();
  }, [getAssociationApartments]);

  // Filtrează datele de întreținere pe scara selectată (înainte de early return pentru Rules of Hooks)
  const filteredMaintenanceData = useMemo(() => {
    if (selectedStairTab === 'all') return updatedMaintenanceData;

    const stairApartments = apartments.filter(apt => apt.stairId === selectedStairTab);
    const apartmentNumbers = stairApartments.map(apt => apt.number);

    return updatedMaintenanceData.filter(data =>
      apartmentNumbers.includes(data.apartment)
    );
  }, [selectedStairTab, updatedMaintenanceData, apartments]);

  // Cheltuieli distribuite (cele care au fost introduse și au sume)
  const distributedExpenses = useMemo(() => {
    if (!expenses) return [];

    console.log('📋 MaintenanceView distributedExpenses:', {
      expensesLength: expenses.length,
      expensesNames: expenses.map(e => e.name),
      isMonthReadOnly
    });

    // Returnează TOATE cheltuielile din sheet (sunt deja ale acestei asociații)
    return expenses;
  }, [expenses, isMonthReadOnly]);

  // 🔄 MIGRARE AUTOMATĂ - Rulează o singură dată când se încarcă facturile
  // MUTAT AICI pentru a respecta Rules of Hooks (trebuie să fie înainte de early return)
  const [migrationRun, setMigrationRun] = useState(false);
  useEffect(() => {
    if (invoices && invoices.length > 0 && !migrationRun && migrateDistributionHistoryToExpenseTypeId) {
      console.log('🔄 Pornesc migrarea automată a distributionHistory...');
      migrateDistributionHistoryToExpenseTypeId()
        .then(result => {
          console.log('✅ Migrare completă:', result);
          setMigrationRun(true);
        })
        .catch(error => {
          console.error('❌ Eroare la migrare:', error);
          setMigrationRun(true); // Marchează ca rulat chiar și în caz de eroare pentru a nu reîncerca continuu
        });
    }
  }, [invoices, migrationRun, migrateDistributionHistoryToExpenseTypeId]);

  // ✅ SHEET-BASED: Folosește cheltuielile din sheet-ul activ pasat de BlocApp
  // MUTAT AICI pentru a respecta Rules of Hooks
  const associationExpenses = useMemo(() => {
    console.log('📦 MaintenanceView - Using expenses from BlocApp:', {
      currentMonth,
      expensesLength: expenses?.length || 0,
      expensesNames: expenses?.map(e => e.name) || []
    });

    return expenses || [];
  }, [expenses, currentMonth]);

  // Detectează și deschide modalul pentru apartamentul selectat din SetupView
  // MUTAT AICI pentru a respecta Rules of Hooks (trebuie să fie înainte de early return)
  useEffect(() => {
    if (pendingMaintenanceApartmentId && maintenanceData && maintenanceData.length > 0) {
      // Folosim maintenanceData direct (care vine din props) și calculăm versiunea updatată
      const currentUpdatedData = getUpdatedMaintenanceData(maintenanceData);

      // Găsește datele de întreținere pentru apartamentul selectat
      const apartmentMaintenanceData = currentUpdatedData.find(
        data => data.apartmentId === pendingMaintenanceApartmentId
      );

      if (apartmentMaintenanceData) {
        // Deschide modalul cu datele găsite (setăm direct stările)
        setSelectedMaintenanceData(apartmentMaintenanceData);
        setShowMaintenanceBreakdown(true);
        // Resetează pending ID-ul
        if (setPendingMaintenanceApartmentId) {
          setPendingMaintenanceApartmentId(null);
        }
      }
    }
  }, [pendingMaintenanceApartmentId, maintenanceData, getUpdatedMaintenanceData, setPendingMaintenanceApartmentId]);

  // Early return if critical dependencies are missing - DUPĂ HOOK-URI
  if (!getAssociationApartments || typeof getAssociationApartments !== 'function') {
    console.error('⚠️ MaintenanceView: getAssociationApartments is not available');
    console.error('⚠️ Props received:', {
      hasAssociation: !!association,
      hasBlocks: blocks?.length > 0,
      hasStairs: stairs?.length > 0,
      getAssociationApartmentsType: typeof getAssociationApartments,
      getAssociationApartments
    });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă datele asociației...</p>
          <p className="mt-2 text-sm text-gray-500">Dacă această problemă persistă, reîmprospătați pagina</p>
        </div>
      </div>
    );
  }

  // Nu mai e nevoie de wrapper - folosim direct getAssociationApartments din props
  // Funcția vine deja din useMaintenanceCalculation hook

  // Debug: Verifică dacă funcțiile sunt disponibile
  // console.log('🔧 MaintenanceView functions check:', {
  //   hasAddInvoice: !!addInvoice,
  //   hasGetPartiallyDistributedInvoices: !!getPartiallyDistributedInvoices,
  //   hasGetInvoiceByNumber: !!getInvoiceByNumber,
  //   associationId: association?.id
  // });

  // Wrapper îmbunătățit pentru handleAddExpense care gestionează facturi parțiale
  const handleAddExpenseWithInvoice = async () => {
    // console.log('🚀 handleAddExpenseWithInvoice called', {
    //   hasInvoiceData: !!newExpense.invoiceData,
    //   invoiceNumber: newExpense.invoiceData?.invoiceNumber,
    //   selectedExistingInvoice: newExpense.invoiceData?.selectedExistingInvoiceId
    // });
    // Verifică dacă este o distribuție parțială din factură existentă
    if (newExpense.invoiceData?.selectedExistingInvoiceId) {
      // Actualizează distribuția facturii existente
      const distributionData = {
        month: currentMonth,
        amount: parseFloat(newExpense.invoiceData.currentDistribution),
        expenseId: null, // Va fi setat după ce se creează expense-ul
        notes: `Distribuție pentru ${newExpense.name}`
      };

      try {
        await updateInvoiceDistribution(
          newExpense.invoiceData.selectedExistingInvoiceId,
          distributionData
        );
        console.log('✅ Distribuție parțială actualizată pentru factura existentă');
      } catch (error) {
        console.error('❌ Eroare la actualizarea distribuției:', error);
      }
    }

    // Apelează handler-ul original cu funcția addInvoice modificată
    return await addExpenseFromHook(addInvoice);
  };

  // DEBUGGING TEMPORAR
  // console.log('🔍 DEBUGGING:', {
  //   maintenanceDataLength: maintenanceData?.length,
  //   updatedMaintenanceDataLength: updatedMaintenanceData?.length,
  //   maintenanceDataFirst: maintenanceData?.[0],
  //   updatedFirst: updatedMaintenanceData?.[0]
  // });

  // Handler pentru deschiderea modalului de plăți
  const handleOpenPaymentModal = (apartmentData) => {
    setSelectedApartment(apartmentData);
    setShowPaymentModal(true);
  };

  // Handler pentru salvarea plății cu integrare Firestore
  const handleSavePayment = async (paymentData) => {
    console.log('💰 Salvare plată:', paymentData);

    // Salvează încasarea în Firestore
    const incasareData = {
      ...paymentData,
      apartmentNumber: selectedApartment.apartmentNumber,
      owner: selectedApartment.owner,
      associationName: association.name
    };

    const result = await addIncasare(incasareData);

    if (result.success) {
      console.log(`✅ Încasare salvată cu succes. Chitanță nr: ${result.receiptNumber}`);
      // Tabelul se va actualiza automat prin usePaymentSync
      // Nu mai trebuie să marcăm manual plata - sistemul calculează automat datoriile rămase
    } else {
      console.error('❌ Eroare la salvarea încasării:', result.error);
      alert(`Eroare la salvarea încasării: ${result.error}`);
    }
  };

  // Handler pentru deschiderea modalului de breakdown întreținere
  const handleOpenMaintenanceBreakdown = (apartmentData) => {
    console.log('📊 Opening maintenance breakdown - received data:', {
      apartmentId: apartmentData.apartmentId,
      hasExpenseDetails: !!apartmentData.expenseDetails,
      expenseDetailsKeys: Object.keys(apartmentData.expenseDetails || {}),
      isMonthReadOnly
    });

    // apartmentData vine deja din updatedMaintenanceData (prin filteredMaintenanceData)
    // și ar trebui să conțină expenseDetails
    setSelectedMaintenanceData(apartmentData);
    setShowMaintenanceBreakdown(true);
  };

  // Helper: Obține unitatea de măsură configurată
  const getUnitLabel = (expenseName) => {
    const config = getExpenseConfig(expenseName);
    if (config?.consumptionUnit === 'custom' && config?.customConsumptionUnit) {
      return config.customConsumptionUnit;
    } else if (config?.consumptionUnit) {
      return config.consumptionUnit;
    }
    return 'mc'; // default
  };

  // ✅ FUNCȚIE EXPORT PDF PENTRU AVIZIER (COPIATĂ EXACT)
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
          
          // ===== PAGINA 1 - TABEL =====
          // Header aliniat stânga cu numele asociației
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText(association?.name?.toUpperCase()) || "NUME ASOCIATIE", 20, 25);
          
          // Document description - intretinere și consum (centrat)
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.text(fixRomanianText("Document cumulativ reprezentand"), 105, 35, { align: "center" });
          
          // Calculez luna anterioară pentru consum
          const getCurrentMonthDate = () => {
            const monthNames = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", 
                              "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
            const parts = currentMonth.split(" ");
            const monthName = parts[0];
            const year = parseInt(parts[1]);
            const monthIndex = monthNames.indexOf(monthName.toLowerCase());
            return { monthIndex, year };
          };
          
          const getPreviousMonth = () => {
            const { monthIndex, year } = getCurrentMonthDate();
            const prevDate = new Date(year, monthIndex - 1);
            return prevDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
          };
          
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText(`Intretinere luna ${currentMonth.toUpperCase()} consum luna ${getPreviousMonth().toUpperCase()}`), 105, 42, { align: "center" });
          
          let currentY = 55;

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
          
          currentY += rowHeight + 15;
          
          // ===== INFORMAȚII RESPONSABILI (SUB TABEL) =====
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          
          // Poziționare responsabili pe 3 coloane - Administrator primul
          doc.text(fixRomanianText(`Administrator: ${association?.administrator || "_____________"}`), 20, currentY);
          doc.text(fixRomanianText(`Presedinte: ${association?.president || "_____________"}`), 105, currentY, { align: "center" });
          doc.text(fixRomanianText(`Cenzor: ${association?.censor || "_____________"}`), 190, currentY, { align: "right" });
          
          // ===== PAGINA 2 - INFORMAȚII =====
          doc.addPage();
          
          // Header pagina 2 - același format ca pagina 1
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText(association?.name?.toUpperCase()) || "NUME ASOCIATIE", 20, 25);
          
          // Document description - centrat
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.text(fixRomanianText("Baza de calcul"), 105, 35, { align: "center" });
          
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText(`Intretinere luna ${currentMonth.toUpperCase()} consum luna ${getPreviousMonth().toUpperCase()}`), 105, 42, { align: "center" });
          
          // Adresa
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          const addressString = association?.address ? 
            `${association.address.street || ''} ${association.address.number || ''}, ${association.address.city || ''}, ${association.address.county || ''}`.trim() 
            : "Adresa asociatiei";
          doc.text(fixRomanianText(`Adresa: ${addressString}`), 105, 52, { align: "center" });
          
          // Număr apartamente și persoane
          const apartmentCount = getAssociationApartments().length;
          const personCount = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
          doc.text(`${apartmentCount} apartamente • ${personCount} persoane`, 105, 58, { align: "center" });
          
          // Linie decorativă
          doc.setLineWidth(0.5);
          doc.line(30, 62, 180, 62);
          
          currentY = 72;
          
          // ===== TABEL DETALIAT CHELTUIELI =====
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText("DETALIU CHELTUIELI SI MOD DE CALCUL"), 105, currentY, { align: "center" });
          currentY += 8;
          
          // Configurare tabel cheltuieli
          doc.setFontSize(8);
          const expenseTableStartX = 15;
          const expenseTableWidth = 180;
          const expenseColWidths = [45, 35, 30, 35, 35]; // Cheltuiala, Mod împărțire, Valoare factură, Cost/unitate, Observații
          const expenseRowHeight = 6;
          
          // Header tabel
          doc.setFillColor(220, 220, 220);
          doc.rect(expenseTableStartX, currentY, expenseTableWidth, expenseRowHeight, 'F');
          
          doc.setFont("helvetica", "bold");
          const expenseHeaders = [
            'Cheltuiala',
            'Mod impartire',
            'Valoare factura',
            'Cost/unitate',
            'Observatii'
          ];
          
          x = expenseTableStartX + 1;
          expenseHeaders.forEach((header, i) => {
            const centerX = x + (expenseColWidths[i] / 2);
            doc.text(fixRomanianText(header), centerX, currentY + 4, { align: "center" });
            x += expenseColWidths[i];
          });
          
          // Contur header
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.rect(expenseTableStartX, currentY, expenseTableWidth, expenseRowHeight);
          
          // Linii verticale header
          x = expenseTableStartX;
          for (let i = 0; i <= expenseColWidths.length; i++) {
            doc.line(x, currentY, x, currentY + expenseRowHeight);
            if (i < expenseColWidths.length) x += expenseColWidths[i];
          }
          
          currentY += expenseRowHeight;
          
          // Rânduri cu date cheltuieli
          doc.setFont("helvetica", "normal");
          const totalApartments = getAssociationApartments().length;
          const totalPersons = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
          
          associationExpenses.forEach((expense, index) => {
            const config = getExpenseConfig(expense.name);
            
            // Fundal alternativ
            if (index % 2 === 1) {
              doc.setFillColor(248, 248, 248);
              doc.rect(expenseTableStartX, currentY, expenseTableWidth, expenseRowHeight, 'F');
            }
            
            // Calculez cost per unitate și observații
            let modImpartire = "";
            let costPerUnit = "";
            let observatii = "";
            let valoareFactura = "";
            
            if (config.distributionType === "apartment") {
              modImpartire = "Pe apartament";
              valoareFactura = `${expense.amount} RON`;
              if (totalApartments > 0) {
                costPerUnit = `${(expense.amount / totalApartments).toFixed(2)} RON/ap`;
                observatii = `${totalApartments} apartamente`;
              }
            } else if (config.distributionType === "person") {
              modImpartire = "Pe persoana";
              valoareFactura = `${expense.amount} RON`;
              if (totalPersons > 0) {
                costPerUnit = `${(expense.amount / totalPersons).toFixed(2)} RON/pers`;
                observatii = `${totalPersons} persoane`;
              }
            } else if (config.distributionType === "consumption") {
              modImpartire = "Pe consum";
              valoareFactura = `${expense.billAmount} RON`;
              const unit = getUnitLabel(expense.name);
              costPerUnit = `${expense.unitPrice} RON/${unit}`;
              const totalConsum = Object.values(expense.consumption || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
              observatii = `${totalConsum.toFixed(2)} ${unit}`;
            } else if (config.distributionType === "individual") {
              modImpartire = "Sume individuale";
              valoareFactura = `${expense.amount} RON`;
              costPerUnit = "Variabil";
              observatii = "Vezi detaliu";
            }
            
            const rowData = [
              fixRomanianText(expense.name),
              fixRomanianText(modImpartire),
              valoareFactura,
              costPerUnit,
              fixRomanianText(observatii)
            ];
            
            x = expenseTableStartX + 1;
            rowData.forEach((cell, i) => {
              if (i === 0) {
                // Prima coloană aliniată la stânga
                doc.text(cell, x + 2, currentY + 4);
              } else {
                // Restul centrate
                const centerX = x + (expenseColWidths[i] / 2);
                doc.text(cell, centerX, currentY + 4, { align: "center" });
              }
              x += expenseColWidths[i];
            });
            
            // Contur rând
            doc.rect(expenseTableStartX, currentY, expenseTableWidth, expenseRowHeight);
            
            // Linii verticale
            x = expenseTableStartX;
            for (let i = 0; i <= expenseColWidths.length; i++) {
              doc.line(x, currentY, x, currentY + expenseRowHeight);
              if (i < expenseColWidths.length) x += expenseColWidths[i];
            }
            
            currentY += expenseRowHeight;
          });
          
          // Rând total
          doc.setFillColor(200, 200, 200);
          doc.rect(expenseTableStartX, currentY, expenseTableWidth, expenseRowHeight, 'F');
          doc.setFont("helvetica", "bold");
          
          const totalAmount = associationExpenses.reduce((sum, expense) => {
            return sum + (expense.isUnitBased ? expense.billAmount : expense.amount);
          }, 0);
          
          const expenseTotalData = [
            'TOTAL',
            '',
            `${totalAmount.toFixed(2)} RON`,
            '',
            ''
          ];
          
          x = expenseTableStartX + 1;
          expenseTotalData.forEach((cell, i) => {
            if (i === 0 || i === 2) {
              if (i === 0) {
                doc.text(cell, x + 2, currentY + 4);
              } else {
                const centerX = x + (expenseColWidths[i] / 2);
                doc.text(cell, centerX, currentY + 4, { align: "center" });
              }
            }
            x += expenseColWidths[i];
          });
          
          // Contur total
          doc.setLineWidth(0.5);
          doc.rect(expenseTableStartX, currentY, expenseTableWidth, expenseRowHeight);
          
          // Linii verticale total
          x = expenseTableStartX;
          for (let i = 0; i <= expenseColWidths.length; i++) {
            doc.line(x, currentY, x, currentY + expenseRowHeight);
            if (i < expenseColWidths.length) x += expenseColWidths[i];
          }
          
          currentY += expenseRowHeight + 10;
          
          // ===== PREȚURI UTILITĂȚI =====
          const consumExpenses = associationExpenses.filter(exp => 
            getExpenseConfig(exp.name).distributionType === "consumption"
          );
          
          if (consumExpenses.length > 0) {
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(fixRomanianText("PRETURI UTILITATI:"), 105, currentY, { align: "center" });
            currentY += 8;
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            
            consumExpenses.forEach((expense) => {
              const unit = getUnitLabel(expense.name);
              doc.text(fixRomanianText(`${expense.name}: ${expense.unitPrice} lei/${unit}`), 105, currentY, { align: "center" });
              currentY += 6;
            });
            
            currentY += 10;
          }
          
          // ===== INFORMAȚII IMPORTANTE (PLĂȚI) =====
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText("ATENTIE!"), 105, currentY, { align: "center" });
          currentY += 6;
          
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(fixRomanianText("Incasarile se fac pana pe data de 20 ale lunii in curs"), 105, currentY, { align: "center" });
          currentY += 5;
          doc.text(fixRomanianText("(pentru luna anterioara)"), 105, currentY, { align: "center" });
          currentY += 10;
          
          // ===== INFORMAȚII CONT BANCAR =====
          if (association?.bankAccount) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(fixRomanianText("Plata intretinerii poate fi efectuata si prin transfer bancar:"), 105, currentY, { align: "center" });
            currentY += 8;
            
            doc.setFont("helvetica", "normal");
            doc.text(fixRomanianText(`Beneficiar: ${association?.name}`), 105, currentY, { align: "center" });
            currentY += 6;
            doc.text(`Cont IBAN: ${association?.bankAccount}`, 105, currentY, { align: "center" });
            currentY += 8;
            
            doc.setFont("helvetica", "bold");
            doc.text(fixRomanianText("IMPORTANT: Mentionati numarul apartamentului in detaliile platii!"), 105, currentY, { align: "center" });
            currentY += 10;
          }
          
          // ===== FOOTER INFORMATIV =====
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(fixRomanianText("Pentru intrebari contactati administratorul asociatiei."), 105, currentY, { align: "center" });
          
          // ===== FOOTER DOCUMENT =====
          const pageHeight = doc.internal.pageSize.height;
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100); // Gri pentru footer
          doc.text(fixRomanianText(`Document generat automat la: ${new Date().toLocaleDateString("ro-RO")} ${new Date().toLocaleTimeString("ro-RO")}`), 105, pageHeight - 10, { align: "center" });
          
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

  const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  const monthType = getMonthType ? getMonthType(currentMonth) : null;

  return (
        <div className={`min-h-screen ${
          monthType === 'current'
            ? "bg-gradient-to-br from-indigo-50 to-blue-100"
            : monthType === 'next'
            ? "bg-gradient-to-br from-green-50 to-emerald-100"
            : monthType === 'historic'
            ? "bg-gradient-to-br from-gray-50 to-gray-100"
            : "bg-gradient-to-br from-indigo-50 to-blue-100"
        }`}>
      <div className="w-full px-3 sm:px-4 lg:px-6 pb-4 sm:pb-6">
        <DashboardHeader
          key={`header-${publishedSheet?.id || 'no-published'}`}
          association={association}
          blocks={blocks}
          stairs={stairs}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          getAvailableMonths={getAvailableMonths}
          expenses={expenses}
          isMonthReadOnly={isMonthReadOnly}
          getAssociationApartments={getAssociationApartments}
          handleNavigation={handleNavigation}
          getMonthType={getMonthType}
        />

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🧮 Calcul întreținere</h1>
        </div>


        <MaintenanceSummary
          association={association}
          blocks={blocks}
          stairs={stairs}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          isMonthReadOnly={isMonthReadOnly}
          shouldShowPublishButton={(month) => shouldShowPublishButton(month, getAvailableExpenseTypes, areAllExpensesFullyCompleted, getAssociationApartments)}
          shouldShowAdjustButton={shouldShowAdjustButton}
          publishMonth={publishMonth}
          unpublishSheet={unpublishSheet}
          getCurrentActiveMonth={getCurrentActiveMonth}
          getNextActiveMonth={getNextActiveMonth}
          getMonthType={getMonthType}
          expenses={associationExpenses}
          currentSheet={currentSheet}
          publishedSheet={publishedSheet}
          onAdjustBalances={() => {
            const modalData = getAssociationApartments().map(apartment => {
              // Găsește datele din tabelul de întreținere pentru sincronizare (folosind datele actualizate)
              const maintenanceItem = updatedMaintenanceData.find(item => item.apartment === apartment.number);
              
              // Folosește datele din tabelul de întreținere dacă există, altfel fallback la getApartmentBalance
              const restanteCurente = maintenanceItem ? maintenanceItem.restante : getApartmentBalance(apartment.id).restante;
              const penalitatiCurente = maintenanceItem ? maintenanceItem.penalitati : getApartmentBalance(apartment.id).penalitati;
              
              return {
                apartmentId: apartment.id,
                apartmentNumber: apartment.number,
                owner: apartment.owner,
                restanteCurente: restanteCurente,
                penalitatiCurente: penalitatiCurente,
                restanteAjustate: restanteCurente,
                penalitatiAjustate: penalitatiCurente
              };
            });
            setAdjustModalData(modalData);
            setShowAdjustBalances(true);
          }}
          exportPDFAvizier={exportPDFAvizier}
          maintenanceData={updatedMaintenanceData}
          handleNavigation={handleNavigation}
          getAssociationApartments={getAssociationApartments}

          // Conținutul care va fi afișat în tab-uri
          tabContent={
            <div className="pb-2">
              {/* Tab-uri pentru scări */}
              <div className={`sticky top-0 z-10 bg-white rounded-t-xl mb-3 ${(blocks?.length > 1 || stairs?.length > 1) ? 'shadow-md border-b border-gray-200' : ''}`} style={{ position: 'sticky' }}>
                <div className={`flex items-center ${(blocks?.length > 1 || stairs?.length > 1) ? 'justify-between' : 'justify-end'}`}>
                  {/* Tab-uri scări - stânga - ascunse când avem 1 bloc + 1 scară */}
                  {(blocks?.length > 1 || stairs?.length > 1) && (
                  <div className="flex overflow-x-auto">
                    {/* Tab "Toate" */}
                    <button
                      onClick={() => setSelectedStairTab('all')}
                      className={`px-6 py-4 font-medium whitespace-nowrap transition-colors border-b-2 rounded-tl-xl ${
                        selectedStairTab === 'all'
                          ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                          : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Toate
                    </button>

                    {/* Tab pentru fiecare scară */}
                    {stairs.map(stair => {
                      const block = blocks.find(b => b.id === stair.blockId);
                      return (
                        <button
                          key={stair.id}
                          onClick={() => setSelectedStairTab(stair.id)}
                          className={`px-6 py-4 font-medium whitespace-nowrap transition-colors border-b-2 ${
                            selectedStairTab === stair.id
                              ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                              : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          {block?.name} - {stair.name}
                        </button>
                      );
                    })}
                  </div>
                  )}

                  {/* Butoane acțiuni - dreapta */}
                  <div className="flex items-center gap-3 px-6 pt-4 pb-2">
                    {/* Buton Distribuie Cheltuială - afișat când luna nu e read-only */}
                    {!isMonthReadOnly && getAvailableExpenseTypes && getAvailableExpenseTypes().length > 0 && (
                      <button
                        onClick={() => {
                          setEditingExpense(null);
                          setShowExpenseEntryModal(true);
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${
                          monthType === 'next'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        Distribuie Cheltuială
                      </button>
                    )}

                    {/* Buton Publică Luna */}
                    {shouldShowPublishButton && shouldShowPublishButton(currentMonth, getAvailableExpenseTypes, areAllExpensesFullyCompleted, getAssociationApartments) && (
                      <button
                        onClick={async () => {
                          const result = await publishMonth(currentMonth);
                          console.log('Publish result:', result);
                        }}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium shadow-md transition-all hover:shadow-lg text-sm whitespace-nowrap"
                      >
                        📋 Publică Luna
                      </button>
                    )}

                    {/* Buton Depublică Luna - ascuns dacă există încasări sau datele nu sunt gata */}
                    {isMonthReadOnly && getMonthType(currentMonth) === 'current' && unpublishSheet && isDataReady && incasari.length === 0 && (
                      <button
                        onClick={async () => {
                          if (!window.confirm(
                            '⚠️ ATENȚIE: Depublicarea va șterge sheet-ul lunar următor creat automat.\n\n' +
                            'Această acțiune este permisă doar dacă nu există plăți înregistrate.\n\n' +
                            'Continuați cu depublicarea?'
                          )) {
                            return;
                          }

                          try {
                            const sheetId = publishedSheet?.id || currentSheet?.id;
                            if (!sheetId) {
                              alert('❌ Nu s-a găsit ID-ul sheet-ului pentru depublicare');
                              return;
                            }

                            console.log('🔄 Depublicare în curs...', { sheetId });
                            await unpublishSheet(sheetId);
                            console.log('✅ Depublicare completă - UI-ul ar trebui să se actualizeze automat');
                          } catch (error) {
                            console.error('❌ Eroare depublicare:', error);
                            alert(`❌ Eroare la depublicare: ${error.message}`);
                          }
                        }}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 font-medium shadow-md transition-all hover:shadow-lg text-sm whitespace-nowrap"
                      >
                        ↩️ Depublică Luna
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de cheltuieli unificată */}
              <div className="mb-6 mx-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <ExpenseList
                    associationExpenses={associationExpenses}
                    currentMonth={currentMonth}
                    currentSheet={currentSheet}
                    getExpenseConfig={getExpenseConfig}
                    updateExpenseConfig={updateExpenseConfig}
                    getAssociationApartments={getAssociationApartments}
                    handleDeleteMonthlyExpense={handleDeleteMonthlyExpense}
                    isMonthReadOnly={isMonthReadOnly}
                    monthType={monthType}
                    selectedStairTab={selectedStairTab}
                    blocks={blocks}
                    stairs={stairs}
                    calculateExpenseDifferences={calculateExpenseDifferences}
                    onEditExpense={handleEditExpense}
                    onConfigureExpense={(expenseName) => {
                      setSelectedExpenseForConfig(expenseName);
                      setConfigModalInitialTab('general');
                      setShowExpenseConfig(true);
                    }}
                    expandedExpenses={expandedExpenses}
                    setExpandedExpenses={setExpandedExpenses}
                    updateExpenseConsumption={updateExpenseConsumption}
                    updateExpenseIndividualAmount={updateExpenseIndividualAmount}
                    updatePendingConsumption={updatePendingConsumption}
                    updatePendingIndividualAmount={updatePendingIndividualAmount}
                    updateExpenseIndexes={updateExpenseIndexes}
                    updatePendingIndexes={updatePendingIndexes}
                    getDisabledExpenseTypes={getDisabledExpenseTypes}
                    getApartmentParticipation={getApartmentParticipation}
                    totalExpenseTypes={getAssociationExpenseTypes ? getAssociationExpenseTypes().length : 0}
                    invoices={invoices}
                    getInvoiceForExpense={(expense) => {
                      // Compatibilitate backwards: caută după expenseId (nou) SAU expenseTypeId SAU expenseType/expenseName (vechi)
                      const expenseId = expense?.id || expense;
                      const expenseTypeId = expense?.expenseTypeId;
                      const expenseName = expense?.name;

                      return invoices?.find(inv =>
                        inv.distributionHistory?.some(entry =>
                          // Nou: caută după expenseId (ID document Firebase)
                          entry.expenseId === expenseId ||
                          // Nou: caută după expenseTypeId (ID tip cheltuială)
                          (expenseTypeId && entry.expenseTypeId === expenseTypeId) ||
                          // Vechi: caută după expenseType sau expenseName (backwards compatibility)
                          (expenseName && (entry.expenseType === expenseName || entry.expenseName === expenseName))
                        )
                      );
                    }}
                    maintenanceData={maintenanceData}
                  />
                </div>
              </div>

              {/* Tabelul de întreținere - card separat */}
              <div className="mx-2 mb-2">
                {filteredMaintenanceData.length > 0 ? (
                  <div className="rounded-xl shadow-lg border-2 border-gray-200 bg-white">
                    <div className={`p-4 border-b ${
                      monthType === 'historic'
                        ? 'bg-gray-100'
                        : isMonthReadOnly
                        ? 'bg-blue-50'
                        : 'bg-indigo-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-lg font-semibold ${
                            monthType === 'historic' ? 'text-gray-800' : isMonthReadOnly ? 'text-gray-800' : ''
                          }`}>
                            🧾 Tabel Întreținere
                          </h3>
                        </div>
                        <div className="flex space-x-2">
                          {/* Buton Ajustări Solduri - doar pentru luna în lucru */}
                          {shouldShowAdjustButton(currentMonth) && !isMonthReadOnly && (
                            <button
                              onClick={() => {
                                const modalData = getAssociationApartments().map(apartment => {
                                  const balance = getApartmentBalance(apartment.id);
                                  return {
                                    apartmentId: apartment.id,
                                    apartmentNumber: apartment.number,
                                    restanteCurente: balance.restante || 0,
                                    penalitatiCurente: balance.penalitati || 0,
                                    restanteAjustate: balance.restante || 0,
                                    penalitatiAjustate: balance.penalitati || 0
                                  };
                                });
                                setAdjustModalData(modalData);
                                setShowAdjustBalances(true);
                              }}
                              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 flex items-center"
                              title="Ajustează soldurile inițiale"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Ajustări Solduri
                            </button>
                          )}

                          {/* Buton Export PDF - doar pentru luna publicată și Tabel Simplificat */}
                          {maintenanceData.length > 0 && activeMaintenanceTab === "simple" && isMonthReadOnly && (
                            <button
                              onClick={exportPDFAvizier}
                              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
                              title="Exportă PDF pentru avizier (fără nume proprietari)"
                            >
                              📄 Export PDF
                            </button>
                          )}
                          {/* Buton Export PDF Detaliat - doar pentru luna publicată și Tabel Detaliat */}
                          {filteredMaintenanceData.length > 0 && activeMaintenanceTab === "detailed" && isMonthReadOnly && (
                            <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center">
                              <Plus className="w-4 h-4 mr-2" />
                              Export PDF Detaliat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tab-uri pentru vizualizarea tabelului */}
                    <div className="sticky top-0 z-20 bg-white shadow-sm border-b border-gray-200">
                      <div className="flex">
                        <button
                          onClick={() => setActiveMaintenanceTab("simple")}
                          className={`px-6 py-4 font-medium whitespace-nowrap transition-colors border-b-2 ${
                            activeMaintenanceTab === "simple"
                              ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                              : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          Simplificat
                        </button>
                        <button
                          onClick={() => setActiveMaintenanceTab("detailed")}
                          className={`px-6 py-4 font-medium whitespace-nowrap transition-colors border-b-2 ${
                            activeMaintenanceTab === "detailed"
                              ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                              : 'bg-gray-50 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          Detaliat
                        </button>
                      </div>
                    </div>

                    {/* Container cu scroll orizontal pentru tabel */}
                    <div
                      className={
                        filteredMaintenanceData.length > 10
                          ? "overflow-x-auto overflow-y-auto"
                          : activeMaintenanceTab === "detailed"
                          ? "overflow-x-auto"
                          : ""
                      }
                      style={filteredMaintenanceData.length > 10 ? { maxHeight: '70vh' } : {}}
                    >
                      {activeMaintenanceTab === "simple" ? (
                        <MaintenanceTableSimple
                          maintenanceData={filteredMaintenanceData}
                          isMonthReadOnly={isMonthReadOnly}
                          togglePayment={togglePayment}
                          onOpenPaymentModal={handleOpenPaymentModal}
                          onOpenMaintenanceBreakdown={handleOpenMaintenanceBreakdown}
                          isHistoricMonth={monthType === 'historic'}
                          getPaymentStats={getPaymentStats}
                          isLoadingPayments={!isDataReady}
                          disableSticky={filteredMaintenanceData.length <= 10}
                        />
                      ) : (
                        <MaintenanceTableDetailed
                          maintenanceData={filteredMaintenanceData}
                          expenses={distributedExpenses}
                          association={association}
                          isMonthReadOnly={isMonthReadOnly}
                          onOpenPaymentModal={handleOpenPaymentModal}
                          onOpenMaintenanceBreakdown={handleOpenMaintenanceBreakdown}
                          isHistoricMonth={monthType === 'historic'}
                          isLoadingPayments={!isDataReady}
                          disableSticky={filteredMaintenanceData.length <= 10}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-200">
                    <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există date de întreținere</h3>
                    <p className="text-gray-500">
                      {areAllExpensesFullyCompleted(getAssociationApartments)
                        ? "Completează toate consumurile pentru a genera tabelul de întreținere."
                        : "Adaugă cheltuieli și completează consumurile pentru a calcula întreținerea."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          }
        />

        {/* Modalurile rămân în afara tab-urilor */}
        <AdjustBalancesModal
          showAdjustBalances={showAdjustBalances}
          setShowAdjustBalances={setShowAdjustBalances}
          currentMonth={currentMonth}
          adjustModalData={adjustModalData}
          setAdjustModalData={setAdjustModalData}
          setApartmentBalance={setApartmentBalance}
          saveBalanceAdjustments={saveBalanceAdjustments}
          updateCurrentSheetMaintenanceTable={updateCurrentSheetMaintenanceTable}
          createInitialSheet={createInitialSheet}
          currentSheet={currentSheet}
          maintenanceData={maintenanceData}
          association={association}
          setMonthlyTables={setMonthlyTables}
          forceRecalculate={forceRecalculate}
        />

        <ExpenseConfigModal
          isOpen={showExpenseConfig}
          onClose={() => {
            setShowExpenseConfig(false);
            setConfigModalInitialTab('general'); // Reset tab-ul la închidere
          }}
          expenseName={selectedExpenseForConfig}
          expenseConfig={selectedExpenseForConfig ? getExpenseConfig(selectedExpenseForConfig) : null}
          updateExpenseConfig={updateExpenseConfig}
          saveApartmentParticipations={saveApartmentParticipations}
          getAssociationApartments={getAssociationApartments}
          getApartmentParticipation={getApartmentParticipation}
          setApartmentParticipation={setApartmentParticipation}
          currentSheet={currentSheet}
          blocks={blocks}
          stairs={stairs}
          initialTab={configModalInitialTab}
          updateExpenseConsumption={updateExpenseConsumption}
          updatePendingConsumption={updatePendingConsumption}
        />

        <PaymentModal
          showPaymentModal={showPaymentModal}
          setShowPaymentModal={setShowPaymentModal}
          currentMonth={currentMonth}
          selectedApartment={selectedApartment}
          onSavePayment={handleSavePayment}
        />

        <ExpenseEntryModal
          isOpen={showExpenseEntryModal}
          onClose={() => {
            setShowExpenseEntryModal(false);
            setEditingExpense(null);
          }}
          blocks={blocks}
          stairs={stairs}
          availableExpenseTypes={getAvailableExpenseTypes()}
          getExpenseConfig={getExpenseConfig}
          editingExpense={editingExpense}
          handleAddExpense={async (newExpenseData) => {
            console.log('🎯 WRAPPER received from modal:', newExpenseData);

            // Pasează funcțiile pentru invoice distribution update
            const invoiceFunctions = {
              addInvoice,
              updateInvoiceDistribution,
              getInvoiceByNumber
            };

            const result = await addExpenseFromHook(newExpenseData, addInvoice, invoiceFunctions);

            console.log('🎯 WRAPPER returned:', result);
            if (result !== false) {
              setShowExpenseEntryModal(false);
              setEditingExpense(null);
            }
            return result;
          }}
          handleUpdateExpense={async (expenseId, updatedExpenseData) => {
            console.log('✏️ UPDATE WRAPPER received:', { expenseId, updatedExpenseData });

            // Pasează funcțiile pentru invoice update
            const invoiceFunctions = {
              updateInvoice,
              updateInvoiceByNumber,
              updateInvoiceDistribution,
              getInvoiceByNumber
            };

            const result = await handleUpdateExpense(expenseId, updatedExpenseData, invoiceFunctions);

            console.log('✏️ UPDATE WRAPPER returned:', result);
            if (result !== false) {
              setShowExpenseEntryModal(false);
              setEditingExpense(null);
            }
            return result;
          }}
          currentMonth={currentMonth}
          monthType={monthType}
          getPartiallyDistributedInvoices={getPartiallyDistributedInvoices}
          getInvoiceByNumber={getInvoiceByNumber}
          syncSuppliersForExpenseType={syncSuppliersForExpenseType}
          addInvoice={addInvoice}
          updateInvoice={updateInvoice}
          updateInvoiceDistribution={updateInvoiceDistribution}
          currentSheet={currentSheet}
          association={association}
          setShowExpenseConfig={setShowExpenseConfig}
          setSelectedExpenseForConfig={setSelectedExpenseForConfig}
        />

        <MaintenanceBreakdownModal
          isOpen={showMaintenanceBreakdown}
          onClose={() => setShowMaintenanceBreakdown(false)}
          apartmentData={selectedMaintenanceData}
          expensesList={distributedExpenses}
          apartmentParticipations={
            // Build participations for ALL apartments, not just the selected one
            apartments.reduce((acc, apt) => {
              acc[apt.id] = distributedExpenses.reduce((expAcc, expense) => {
                // Folosește expenseTypeId pentru a căuta participarea corect
                const expenseKey = expense.expenseTypeId || expense.name;
                expAcc[expense.name] = getApartmentParticipation?.(apt.id, expenseKey) || {};
                return expAcc;
              }, {});
              return acc;
            }, {})
          }
          allApartments={apartments}
          allMaintenanceData={updatedMaintenanceData}
          getExpenseConfig={getExpenseConfig}
          stairs={stairs}
          payments={activeSheet?.payments || []}
          currentMonth={currentMonth}
        />

        {/* Modal pentru cheltuieli disponibile */}
        {showAvailableExpensesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 50 }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">📋 Cheltuieli disponibile</h2>
                  <button
                    onClick={() => setShowAvailableExpensesModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-2 mb-4">
                  {getAvailableExpenseTypes().map((expense, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="font-medium text-gray-900">{typeof expense === 'string' ? expense : expense.name}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    💡 Pentru a adăuga sau elimina cheltuieli, accesează secțiunea <strong>Configurare cheltuieli</strong>
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowAvailableExpensesModal(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={() => {
                    setShowAvailableExpensesModal(false);
                    handleNavigation('expenses');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Configurare cheltuieli
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All modals are already rendered above in the component, no duplicates needed */}
      </div>
    </div>
  );
};

export default MaintenanceView;