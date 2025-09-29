// src/components/views/MaintenanceView.js
import React, { useState } from 'react';
import { Calculator, Plus, Settings } from 'lucide-react';
import { MaintenanceTableSimple, MaintenanceTableDetailed, MaintenanceSummary } from '../tables';
import { ExpenseForm, ExpenseList, ConsumptionInput } from '../expenses';
import { ExpenseConfigModal, AdjustBalancesModal, PaymentModal } from '../modals';
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
  getAvailableMonths,
  getCurrentActiveMonth,
  getNextActiveMonth,
  getMonthType,
  
  // Expenses
  expenses,
  newExpense,
  setNewExpense,
  getAvailableExpenseTypes,
  areAllExpensesFullyCompleted,
  getExpenseConfig,
  handleAddExpense,
  handleDeleteMonthlyExpense,
  updateExpenseConsumption,
  updateExpenseIndividualAmount,
  
  // Maintenance calculation
  maintenanceData,
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
  setMonthlyTables,
  
  // Expense configuration
  selectedExpenseForConfig,
  setSelectedExpenseForConfig,
  newCustomExpense,
  setNewCustomExpense,
  handleAddCustomExpense,
  getAssociationExpenseTypes,
  updateExpenseConfig,
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
  // 🔍 DEBUGGING MAINTENANCE DATA
  console.log('🔍 MaintenanceView received:', {
    maintenanceDataLength: maintenanceData?.length,
    maintenanceDataSample: maintenanceData?.[0],
    associationId: association?.id,
    currentMonth,
    getAssociationApartments: typeof getAssociationApartments
  });

  // TOATE HOOK-URILE TREBUIE SĂ FIE APELATE ÎNAINTE DE ORICE RETURN CONDIȚIONAL

  // State pentru modalul de plăți
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);

  // Hook pentru gestionarea încasărilor
  const { addIncasare } = useIncasari(association || null, currentMonth);

  // Hook pentru gestionarea facturilor cu suport complet pentru distribuție parțială
  const {
    addInvoice,
    updateInvoiceDistribution,
    getPartiallyDistributedInvoices,
    getInvoiceByNumber,
    syncSuppliersForExpenseType
  } = useInvoices(association?.id);

  // Hook pentru sincronizarea plăților cu tabelul de întreținere
  const {
    getUpdatedMaintenanceData,
    getApartmentPayments,
    getPaymentStats
  } = usePaymentSync(association || null, currentMonth);

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
    return await handleAddExpense(addInvoice);
  };

  // Calculează datele actualizate pentru afișare în tabel
  // Acestea vor reflecta datoriile reale după încasări
  const updatedMaintenanceData = getUpdatedMaintenanceData(maintenanceData);

  // DEBUGGING TEMPORAR
  console.log('🔍 DEBUGGING:', {
    maintenanceDataLength: maintenanceData?.length,
    updatedMaintenanceDataLength: updatedMaintenanceData?.length,
    maintenanceDataFirst: maintenanceData?.[0],
    updatedFirst: updatedMaintenanceData?.[0]
  });

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

  // ✅ SHEET-BASED: Folosește cheltuielile din sheet-ul curent
  const associationExpenses = currentSheet?.expenses || [];
  
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
              const unit = expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal";
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
              const unit = expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal";
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
        <div className={`min-h-screen pt-2 px-6 pb-6 ${
          monthType === 'current'
            ? "bg-gradient-to-br from-indigo-50 to-blue-100"
            : monthType === 'next'
            ? "bg-gradient-to-br from-green-50 to-emerald-100"
            : monthType === 'historic'
            ? "bg-gradient-to-br from-gray-50 to-gray-100"
            : "bg-gradient-to-br from-indigo-50 to-blue-100"
        }`}>
      <div className="w-full">
        <DashboardHeader
          association={association}
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
          getCurrentActiveMonth={getCurrentActiveMonth}
          getNextActiveMonth={getNextActiveMonth}
          getMonthType={getMonthType}
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
            <>
              {/* Adaugă Cheltuială - pe întreaga lățime */}
              <div className="p-6 border-b">
                <ExpenseForm
                  newExpense={newExpense}
                  setNewExpense={setNewExpense}
                  availableExpenseTypes={getAvailableExpenseTypes()}
                  associationExpenses={associationExpenses}
                  getExpenseConfig={getExpenseConfig}
                  handleAddExpense={handleAddExpenseWithInvoice}
                  isMonthReadOnly={isMonthReadOnly}
                  currentMonth={currentMonth}
                  setShowExpenseConfig={setShowExpenseConfig}
                  setSelectedExpenseForConfig={setSelectedExpenseForConfig}
                  monthType={monthType}
                  // Funcții noi pentru facturi parțiale
                  getPartiallyDistributedInvoices={getPartiallyDistributedInvoices}
                  getInvoiceByNumber={getInvoiceByNumber}
                  syncSuppliersForExpenseType={syncSuppliersForExpenseType}
                  getAssociationApartments={getAssociationApartments}
                />
              </div>

              {/* Cheltuieli și Consumuri - pe 2 coloane */}
              <div className="p-6 border-b">
                <div className="grid lg:grid-cols-2 gap-6">
                  <ExpenseList
                    associationExpenses={associationExpenses}
                    currentMonth={currentMonth}
                    getExpenseConfig={getExpenseConfig}
                    getAssociationApartments={getAssociationApartments}
                    handleDeleteMonthlyExpense={handleDeleteMonthlyExpense}
                    isMonthReadOnly={isMonthReadOnly}
                    monthType={monthType}
                  />

                  <ConsumptionInput
                    associationExpenses={associationExpenses}
                    getExpenseConfig={getExpenseConfig}
                    getAssociationApartments={getAssociationApartments}
                    updateExpenseConsumption={updateExpenseConsumption}
                    updateExpenseIndividualAmount={updateExpenseIndividualAmount}
                    isMonthReadOnly={isMonthReadOnly}
                    currentMonth={currentMonth}
                    monthType={monthType}
                  />
                </div>
              </div>

              {/* Tabelul de întreținere */}
              <div className="p-6">
                {updatedMaintenanceData.length > 0 ? (
                  <div className={`rounded-xl shadow-lg overflow-hidden ${
                    monthType === 'historic'
                      ? 'bg-gray-50 border-2 border-gray-300'
                      : isMonthReadOnly
                      ? 'bg-purple-50 border-2 border-purple-200'
                      : 'bg-white'
                  }`}>
                    <div className={`p-4 border-b ${
                      monthType === 'historic'
                        ? 'bg-gray-100'
                        : isMonthReadOnly
                        ? 'bg-purple-100'
                        : 'bg-indigo-50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className={`text-lg font-semibold ${
                            monthType === 'historic' ? 'text-gray-800' : isMonthReadOnly ? 'text-purple-800' : ''
                          }`}>
                            🧾 Tabel Întreținere - {currentMonth}
                            {monthType === 'historic' ? (
                              <span className="text-sm bg-gray-200 px-2 py-1 rounded-full ml-2">(ARHIVATĂ)</span>
                            ) : isMonthReadOnly ? (
                              <span className="text-sm bg-purple-200 px-2 py-1 rounded-full ml-2">(PUBLICATĂ)</span>
                            ) : null}
                          </h3>
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
                            {monthType === 'historic' ? (
                              <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                📚 ARHIVATĂ
                              </span>
                            ) : isMonthReadOnly ? (
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
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                              title="Exportă PDF pentru avizier (fără nume proprietari)"
                            >
                              📄 Export PDF
                            </button>
                          )}
                          {/* Buton Export PDF Detaliat - doar pentru luna publicată și Tabel Detaliat */}
                          {updatedMaintenanceData.length > 0 && activeMaintenanceTab === "detailed" && isMonthReadOnly && (
                            <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center">
                              <Plus className="w-4 h-4 mr-2" />
                              Export PDF Detaliat
                            </button>
                          )}
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
                        <MaintenanceTableSimple
                          maintenanceData={updatedMaintenanceData}
                          isMonthReadOnly={isMonthReadOnly}
                          togglePayment={togglePayment}
                          onOpenPaymentModal={handleOpenPaymentModal}
                          isHistoricMonth={monthType === 'historic'}
                        />
                      ) : (
                        <MaintenanceTableDetailed
                          maintenanceData={updatedMaintenanceData}
                          expenses={expenses}
                          association={association}
                          isMonthReadOnly={isMonthReadOnly}
                          onOpenPaymentModal={handleOpenPaymentModal}
                          isHistoricMonth={monthType === 'historic'}
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
            </>
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
          onClose={() => setShowExpenseConfig(false)}
          expenseName={selectedExpenseForConfig}
          expenseConfig={selectedExpenseForConfig ? getExpenseConfig(selectedExpenseForConfig) : null}
          updateExpenseConfig={updateExpenseConfig}
          getAssociationApartments={getAssociationApartments}
          getApartmentParticipation={getApartmentParticipation}
          setApartmentParticipation={setApartmentParticipation}
          currentSheet={currentSheet}
        />

        <PaymentModal
          showPaymentModal={showPaymentModal}
          setShowPaymentModal={setShowPaymentModal}
          currentMonth={currentMonth}
          selectedApartment={selectedApartment}
          onSavePayment={handleSavePayment}
        />

        {/* All modals are already rendered above in the component, no duplicates needed */}
      </div>
    </div>
  );
};

export default MaintenanceView;