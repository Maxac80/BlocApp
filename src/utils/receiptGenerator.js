import jsPDF from 'jspdf';

/**
 * Generează o chitanță PDF detaliată cu breakdown-ul soldurilor istorice vs curente
 */
export const generateDetailedReceipt = (paymentData, apartmentData, associationData) => {
  try {
    const doc = new jsPDF();
    
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

    // Configurare font
    doc.setFont("helvetica");
    
    // Header asociație
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(fixRomanianText(associationData.name?.toUpperCase() || "ASOCIAȚIA PROPRIETARILOR"), 105, 25, { align: "center" });
    
    // Adresă asociație (dacă există)
    if (associationData.address) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(fixRomanianText(associationData.address), 105, 32, { align: "center" });
    }
    
    // Titlu chitanță
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("CHITANTA", 105, 45, { align: "center" });
    
    // Numărul chitanței și data
    const receiptNumber = `#${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    const currentDate = new Date().toLocaleDateString('ro-RO');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Chitanta: ${receiptNumber}`, 20, 55);
    doc.text(`Data: ${currentDate}`, 160, 55);
    
    // Linie separator
    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);
    
    // Informații apartament
    let currentY = 70;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMAȚII PLATĂ:", 20, currentY);
    
    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Apartament: ${apartmentData.apartmentNumber}`, 20, currentY);
    doc.text(`Proprietar: ${fixRomanianText(apartmentData.owner)}`, 20, currentY + 7);
    doc.text(`Luna: ${paymentData.month}`, 20, currentY + 14);
    
    // Detaliere plată
    currentY += 30;
    doc.setFont("helvetica", "bold");
    doc.text("DETALIERE PLATĂ:", 20, currentY);
    
    currentY += 10;
    doc.setFont("helvetica", "normal");
    
    let totalAchitat = 0;
    
    // Afișează soldurile istorice dacă există
    if (apartmentData.initialBalance && (apartmentData.initialBalance.restante > 0 || apartmentData.initialBalance.penalitati > 0)) {
      doc.setFont("helvetica", "bold");
      doc.text("Solduri anterioare BlocApp:", 20, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 7;
      
      if (apartmentData.initialBalance.restante > 0 && paymentData.restante > 0) {
        const restanteIstoricePlatite = Math.min(paymentData.restante, apartmentData.initialBalance.restante);
        doc.text(`✓ Restante anterioare (pana in ${apartmentData.initialBalance.setupMonth || 'iulie'}):`, 25, currentY);
        doc.text(`${restanteIstoricePlatite.toFixed(2)} lei`, 160, currentY);
        totalAchitat += restanteIstoricePlatite;
        currentY += 7;
      }
      
      if (apartmentData.initialBalance.penalitati > 0 && paymentData.penalitati > 0) {
        const penalitatiIstoricePlatite = Math.min(paymentData.penalitati, apartmentData.initialBalance.penalitati);
        doc.text(`✓ Penalitati anterioare:`, 25, currentY);
        doc.text(`${penalitatiIstoricePlatite.toFixed(2)} lei`, 160, currentY);
        totalAchitat += penalitatiIstoricePlatite;
        currentY += 7;
      }
      
      currentY += 5;
    }
    
    // Solduri post-BlocApp
    doc.setFont("helvetica", "bold");
    doc.text("Solduri BlocApp:", 20, currentY);
    doc.setFont("helvetica", "normal");
    currentY += 7;
    
    // Restanțe post-BlocApp (dacă sunt)
    const restantePostBlocApp = apartmentData.initialBalance?.restante > 0 ? 
      Math.max(0, paymentData.restante - apartmentData.initialBalance.restante) : 
      paymentData.restante;
    
    if (restantePostBlocApp > 0) {
      doc.text(`✓ Restante post-BlocApp:`, 25, currentY);
      doc.text(`${restantePostBlocApp.toFixed(2)} lei`, 160, currentY);
      totalAchitat += restantePostBlocApp;
      currentY += 7;
    }
    
    // Întreținere curentă
    if (paymentData.intretinere > 0) {
      doc.text(`✓ Intretinere ${paymentData.month}:`, 25, currentY);
      doc.text(`${paymentData.intretinere.toFixed(2)} lei`, 160, currentY);
      totalAchitat += paymentData.intretinere;
      currentY += 7;
    }
    
    // Penalități post-BlocApp (dacă sunt)
    const penalitatiPostBlocApp = apartmentData.initialBalance?.penalitati > 0 ? 
      Math.max(0, paymentData.penalitati - apartmentData.initialBalance.penalitati) : 
      paymentData.penalitati;
    
    if (penalitatiPostBlocApp > 0) {
      doc.text(`✓ Penalitati post-BlocApp:`, 25, currentY);
      doc.text(`${penalitatiPostBlocApp.toFixed(2)} lei`, 160, currentY);
      totalAchitat += penalitatiPostBlocApp;
      currentY += 7;
    }
    
    // Linie separator pentru total
    currentY += 5;
    doc.setLineWidth(0.3);
    doc.line(20, currentY, 190, currentY);
    
    // Total achitat
    currentY += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL ACHITAT:", 20, currentY);
    doc.text(`${totalAchitat.toFixed(2)} lei`, 160, currentY);
    
    // Sold rămas (dacă este cazul)
    const soldRamas = apartmentData.totalDatorat - totalAchitat;
    if (soldRamas > 0) {
      currentY += 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SOLD RĂMAS:", 20, currentY);
      doc.text(`${soldRamas.toFixed(2)} lei`, 160, currentY);
      
      // Detalii sold rămas
      currentY += 7;
      doc.setFont("helvetica", "normal");
      
      const restanteRamase = Math.max(0, apartmentData.restante - paymentData.restante);
      const intretinereRamasa = Math.max(0, apartmentData.intretinere - paymentData.intretinere);
      const penalitatiRamase = Math.max(0, apartmentData.penalitati - paymentData.penalitati);
      
      if (restanteRamase > 0) {
        doc.text(`• Restante: ${restanteRamase.toFixed(2)} lei`, 25, currentY);
        currentY += 5;
      }
      if (intretinereRamasa > 0) {
        doc.text(`• Intretinere: ${intretinereRamasa.toFixed(2)} lei`, 25, currentY);
        currentY += 5;
      }
      if (penalitatiRamase > 0) {
        doc.text(`• Penalitati: ${penalitatiRamase.toFixed(2)} lei`, 25, currentY);
        currentY += 5;
      }
    } else {
      currentY += 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 150, 0); // Verde
      doc.text("✅ PLATĂ COMPLETĂ!", 20, currentY);
      doc.setTextColor(0, 0, 0); // Reset la negru
    }
    
    // Footer cu semnătură
    currentY += 30;
    if (currentY > 250) {
      doc.addPage();
      currentY = 30;
    }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Semnatura administrator:", 20, currentY);
    doc.text("_________________________", 20, currentY + 15);
    
    // Data generării
    doc.text(`Generat cu BlocApp la ${new Date().toLocaleString('ro-RO')}`, 105, currentY + 25, { align: "center" });
    
    // Salvează PDF-ul
    const fileName = `Chitanta_Ap${apartmentData.apartmentNumber}_${receiptNumber.replace('#', '')}.pdf`;
    doc.save(fileName);
    
    return {
      success: true,
      fileName,
      totalAmount: totalAchitat
    };
    
  } catch (error) {
    console.error('Eroare la generarea chitanței:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Funcție helper pentru formatarea datelor apartamentului pentru chitanță
 */
export const formatApartmentDataForReceipt = (maintenanceData, apartmentId) => {
  const apartment = maintenanceData.find(apt => apt.apartmentId === apartmentId);
  if (!apartment) {
    throw new Error('Apartament nu a fost găsit în datele de întreținere');
  }
  
  return {
    apartmentNumber: apartment.apartment,
    owner: apartment.owner,
    totalDatorat: apartment.totalDatorat,
    restante: apartment.restante,
    intretinere: apartment.currentMaintenance,
    penalitati: apartment.penalitati,
    initialBalance: apartment.initialBalance
  };
};