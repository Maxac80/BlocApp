// src/components/views/MaintenanceView.js
import React, { useState } from 'react';
import { Calculator, Plus } from 'lucide-react';
import { MaintenanceTableSimple, MaintenanceTableDetailed, MaintenanceSummary } from '../tables';
import { ExpenseForm, ExpenseList, ConsumptionInput } from '../expenses';
import { ExpenseConfigModal, AdjustBalancesModal, InitialBalancesModal, PaymentModal } from '../modals';
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
  unpublishMonth,
  getAvailableMonths,
  
  // Expenses
  expenses,
  newExpense,
  setNewExpense,
  getAvailableExpenseTypes,
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
  
  // Modals and balances
  showInitialBalances,
  setShowInitialBalances,
  showAdjustBalances,
  setShowAdjustBalances,
  showExpenseConfig,
  setShowExpenseConfig,
  hasInitialBalances,
  adjustModalData,
  setAdjustModalData,
  getApartmentBalance,
  setApartmentBalance,
  saveInitialBalances,
  saveBalanceAdjustments,
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
  handleNavigation
}) => {
  // State pentru modalul de plăți
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);

  // Handler pentru deschiderea modalului de plăți
  const handleOpenPaymentModal = (apartmentData) => {
    setSelectedApartment(apartmentData);
    setShowPaymentModal(true);
  };

  // Handler pentru salvarea plății
  const handleSavePayment = (paymentData) => {
    console.log('💰 Salvare plată:', paymentData);
    // TODO: Implementează logica de salvare în Firebase
    alert(`✅ Plată înregistrată: ${paymentData.total.toFixed(2)} lei pentru Ap. ${selectedApartment.apartmentNumber}`);
  };

  // ✅ PRELUAREA EXACTĂ A LOGICII DIN ORIGINALUL BlocApp.js
  return (
    (() => {
      const associationExpenses = expenses.filter(exp => exp.associationId === association?.id && exp.month === currentMonth);

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

      return (
        <div className={`min-h-screen p-4 ${
          currentMonth === currentMonthStr
            ? "bg-gradient-to-br from-indigo-50 to-blue-100"
            : "bg-gradient-to-br from-green-50 to-emerald-100"
        }`}>
          <div className="max-w-6xl mx-auto">




<MaintenanceSummary
  association={association}
  blocks={blocks}
  stairs={stairs}
  currentMonth={currentMonth}
  setCurrentMonth={setCurrentMonth}
  isMonthReadOnly={isMonthReadOnly}
  shouldShowPublishButton={shouldShowPublishButton}
  shouldShowAdjustButton={shouldShowAdjustButton}
  hasInitialBalances={hasInitialBalances}
  publishMonth={publishMonth}
  unpublishMonth={unpublishMonth}
  onAdjustBalances={() => {
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
  exportPDFAvizier={exportPDFAvizier}
  maintenanceData={maintenanceData}
  handleNavigation={handleNavigation}
  getAssociationApartments={getAssociationApartments}
/>



{/* Secțiune pentru gestionarea soldurilor inițiale - vizibilă permanent */}
{getAssociationApartments().length > 0 && currentMonth === currentMonthStr && (
  <div className="mb-6">
    <div className={`border rounded-xl p-6 ${hasInitialBalances ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            {hasInitialBalances ? (
              <>
                <span className="text-green-800">✅ Solduri Inițiale Configurate</span>
              </>
            ) : (
              <>
                <span className="text-yellow-800">⚡ Configurare Solduri Inițiale</span>
              </>
            )}
          </h3>
          <p className={`text-sm mt-1 ${hasInitialBalances ? 'text-green-700' : 'text-yellow-700'}`}>
            {hasInitialBalances 
              ? 'Soldurile inițiale sunt configurate. Puteți vizualiza sau modifica valorile.'
              : 'Este prima utilizare a aplicației. Introduceți soldurile existente din luna anterioară.'}
          </p>
        </div>
        <button
          onClick={() => setShowInitialBalances(!showInitialBalances)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            hasInitialBalances 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          {showInitialBalances ? "Închide" : hasInitialBalances ? "Vizualizează/Editează" : "Configurează Solduri"}
        </button>
      </div>
      
      {/* Modal pentru solduri inițiale - afișat doar când showInitialBalances este true */}
      {showInitialBalances && (
        <InitialBalancesModal
          showInitialBalances={showInitialBalances}
          setShowInitialBalances={setShowInitialBalances}
          getAssociationApartments={getAssociationApartments}
          getApartmentBalance={getApartmentBalance}
          setApartmentBalance={setApartmentBalance}
          saveInitialBalances={saveInitialBalances}
        />
      )}
    </div>
  </div>
)}

<AdjustBalancesModal
  showAdjustBalances={showAdjustBalances}
  setShowAdjustBalances={setShowAdjustBalances}
  currentMonth={currentMonth}
  adjustModalData={adjustModalData}
  setAdjustModalData={setAdjustModalData}
  setApartmentBalance={setApartmentBalance}
  saveBalanceAdjustments={saveBalanceAdjustments}
  association={association}
  setMonthlyTables={setMonthlyTables}
/>

          {/* Modal Configurare Cheltuieli */}
<ExpenseConfigModal
  showExpenseConfig={showExpenseConfig}
  setShowExpenseConfig={setShowExpenseConfig}
  currentMonth={currentMonth}
  newCustomExpense={newCustomExpense}
  setNewCustomExpense={setNewCustomExpense}
  handleAddCustomExpense={handleAddCustomExpense}
  selectedExpenseForConfig={selectedExpenseForConfig}
  setSelectedExpenseForConfig={setSelectedExpenseForConfig}
  getAssociationExpenseTypes={getAssociationExpenseTypes}
  getExpenseConfig={getExpenseConfig}
  updateExpenseConfig={updateExpenseConfig}
  getAssociationApartments={getAssociationApartments}
  getApartmentParticipation={getApartmentParticipation}
  setApartmentParticipation={setApartmentParticipation}
  getDisabledExpenseTypes={getDisabledExpenseTypes}
  toggleExpenseStatus={toggleExpenseStatus}
  deleteCustomExpense={deleteCustomExpense}
/>

{/* Payment Modal */}
<PaymentModal
  showPaymentModal={showPaymentModal}
  setShowPaymentModal={setShowPaymentModal}
  currentMonth={currentMonth}
  selectedApartment={selectedApartment}
  onSavePayment={handleSavePayment}
/>

          {/* Adaugă Cheltuială - pe întreaga lățime */}
          <div className="mb-6">
            <ExpenseForm
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              availableExpenseTypes={getAvailableExpenseTypes()}
              associationExpenses={associationExpenses}
              getExpenseConfig={getExpenseConfig}
              handleAddExpense={handleAddExpense}
              isMonthReadOnly={isMonthReadOnly}
              currentMonth={currentMonth}
              setShowExpenseConfig={setShowExpenseConfig}
            />
          </div>

          {/* Cheltuieli și Consumuri - pe 2 coloane */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <ExpenseList
              associationExpenses={associationExpenses}
              currentMonth={currentMonth}
              getExpenseConfig={getExpenseConfig}
              getAssociationApartments={getAssociationApartments}
              handleDeleteMonthlyExpense={handleDeleteMonthlyExpense}
              isMonthReadOnly={isMonthReadOnly}
            />

            <ConsumptionInput
              associationExpenses={associationExpenses}
              getExpenseConfig={getExpenseConfig}
              getAssociationApartments={getAssociationApartments}
              updateExpenseConsumption={updateExpenseConsumption}
              updateExpenseIndividualAmount={updateExpenseIndividualAmount}
              isMonthReadOnly={isMonthReadOnly}
              currentMonth={currentMonth}
            />
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
                    {/* Buton Export PDF - doar pentru Tabel Simplificat */}
                    {maintenanceData.length > 0 && activeMaintenanceTab === "simple" && (
                      <button 
                        onClick={exportPDFAvizier}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                        title="Exportă PDF pentru avizier (fără nume proprietari)"
                      >
                        📄 Export PDF
                      </button>
                    )}
                    {/* Buton Export PDF Detaliat - doar pentru Tabel Detaliat */}
                    {maintenanceData.length > 0 && activeMaintenanceTab === "detailed" && (
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
      maintenanceData={maintenanceData}
      isMonthReadOnly={isMonthReadOnly(currentMonth)}
      togglePayment={togglePayment}
      onOpenPaymentModal={handleOpenPaymentModal}
    />
  ) : (
    <MaintenanceTableDetailed
      maintenanceData={maintenanceData}
      expenses={expenses}
      association={association}
    />
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
  );
};

export default MaintenanceView;