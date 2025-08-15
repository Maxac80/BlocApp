// src/components/views/MaintenanceView.js
import React from 'react';
import { Calculator, Plus } from 'lucide-react';
import { MaintenanceTableSimple, MaintenanceTableDetailed, MaintenanceSummary } from '../tables';
import { ExpenseForm, ExpenseList, ConsumptionInput } from '../expenses';
import { ExpenseConfigModal, AdjustBalancesModal, InitialBalancesModal } from '../modals';
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
  
  // Expenses
  expenses,
  newExpense,
  setNewExpense,
  getAvailableExpenseTypes,
  getExpenseConfig,
  handleAddExpense,
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
          
          // ===== HEADER PRINCIPAL =====
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText("ASOCIAȚIA DE PROPRIETARI"), 105, 15, { align: "center" });
          
          doc.setFontSize(16);
          doc.text(fixRomanianText(association?.name?.toUpperCase()) || "NUME ASOCIATIE", 105, 23, { align: "center" });
          
          // Linie decorativă sub titlu
          doc.setLineWidth(0.5);
          doc.line(30, 27, 180, 27);
          
          // ===== INFORMAȚII RESPONSABILI =====
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          
          // Poziționare responsabili pe 3 coloane
          const responsabiliY = 35;
          doc.text(fixRomanianText(`Presedinte: ${association?.president || "_____________"}`), 20, responsabiliY);
          doc.text(fixRomanianText(`Administrator: ${association?.administrator || "_____________"}`), 105, responsabiliY, { align: "center" });
          doc.text(fixRomanianText(`Cenzor: ${association?.censor || "_____________"}`), 190, responsabiliY, { align: "right" });
          
          // ===== INFORMAȚII ASOCIAȚIE =====
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          const addressString = association?.address ? 
            `${association.address.street || ''} ${association.address.number || ''}, ${association.address.city || ''}, ${association.address.county || ''}`.trim() 
            : "Adresa asociatiei";
          doc.text(fixRomanianText(addressString), 105, 43, { align: "center" });
          
          const apartmentCount = getAssociationApartments().length;
          const personCount = getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0);
          doc.text(`${apartmentCount} apartamente • ${personCount} persoane`, 105, 50, { align: "center" });
          
          // ===== INFORMAȚII LUNĂ =====
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText(`INTRETINERE LUNA ${currentMonth.toUpperCase()}`), 105, 62, { align: "center" });
          
          // ===== INFORMAȚII IMPORTANTE =====
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(fixRomanianText("ATENTIE!!! Incasarile se fac pana pe data de 20 ale lunii in curs (pentru luna anterioara)"), 105, 70, { align: "center" });
          
          // ===== INFORMAȚII CONT BANCAR =====
          let currentY = 80;
          if (association?.bankAccount) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(fixRomanianText("Plata intretinerii poate fi efectuata si prin transfer bancar:"), 105, currentY, { align: "center" });
            currentY += 5;
            
            doc.setFont("helvetica", "bold");
            doc.text(fixRomanianText(`Beneficiar: ${association?.name}`), 105, currentY, { align: "center" });
            currentY += 5;
            doc.text(`Cont IBAN: ${association?.bankAccount}`, 105, currentY, { align: "center" });
            currentY += 5;
            
            doc.setFont("helvetica", "normal");
            doc.text(fixRomanianText("Va rog sa mentionati in detaliile platii numarul apartamentului!"), 105, currentY, { align: "center" });
            currentY += 10;
          }

          // ===== PREȚURI UTILITĂȚI =====
          const consumExpenses = associationExpenses.filter(exp => 
            getExpenseConfig(exp.name).distributionType === "consumption"
          );
          
          if (consumExpenses.length > 0) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text(fixRomanianText("PRETURI UTILITATI:"), 20, currentY);
            currentY += 6;
            
            doc.setFont("helvetica", "normal");
            const pricesPerRow = 3; // Câte prețuri pe rând
            let col = 0;
            
            consumExpenses.forEach((expense, index) => {
              const unit = expense.name.toLowerCase().includes("apă") || expense.name.toLowerCase().includes("canal") ? "mc" : "Gcal";
              const x = 20 + (col * 60); // Spațiere coloane
              doc.text(fixRomanianText(`${expense.name}: ${expense.unitPrice} lei/${unit}`), x, currentY);
              
              col++;
              if (col >= pricesPerRow) {
                col = 0;
                currentY += 5;
              }
            });
            
            if (col > 0) currentY += 5;
            currentY += 5;
          }

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
          
          currentY += rowHeight + 10;
          
          // ===== FOOTER INFORMATIV =====
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          
          if (association?.bankAccount) {
            doc.text(fixRomanianText("Pentru plati online, folositi OBLIGATORIU numarul apartamentului in detaliile transferului!"), 105, currentY, { align: "center" });
            currentY += 5;
          }
          
          doc.text(fixRomanianText("Pentru intrebari contactati administratorul asociatiei."), 105, currentY, { align: "center" });
          currentY += 8;
          
          // ===== FOOTER DOCUMENT =====
          const pageHeight = doc.internal.pageSize.height;
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100); // Gri pentru footer
          doc.text(fixRomanianText(`Document generat automat la: ${new Date().toLocaleDateString("ro-RO")} ${new Date().toLocaleTimeString("ro-RO")}`), 105, pageHeight - 8, { align: "center" });
          
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

          <div className="grid lg:grid-cols-3 gap-6 mb-6">

<ExpenseForm
  newExpense={newExpense}
  setNewExpense={setNewExpense}
  availableExpenseTypes={getAvailableExpenseTypes()}
  getExpenseConfig={getExpenseConfig}
  handleAddExpense={handleAddExpense}
  isMonthReadOnly={isMonthReadOnly}
  currentMonth={currentMonth}
  setShowExpenseConfig={setShowExpenseConfig}
/>

<ExpenseList
  associationExpenses={associationExpenses}
  currentMonth={currentMonth}
  getExpenseConfig={getExpenseConfig}
  getAssociationApartments={getAssociationApartments}
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
                    {/* Buton Export PDF Avizier */}
                    {maintenanceData.length > 0 && (
                      <button 
                        onClick={exportPDFAvizier}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                        title="Exportă PDF pentru avizier (fără nume proprietari)"
                      >
                        📄 Export PDF Avizier
                      </button>
                    )}
                    <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Export PDF Detaliat
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
    <MaintenanceTableSimple
      maintenanceData={maintenanceData}
      isMonthReadOnly={isMonthReadOnly}
      togglePayment={togglePayment}
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