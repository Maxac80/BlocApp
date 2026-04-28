import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWordsRo } from './numberToWordsRo';

/**
 * Generator chitanță PDF premium.
 *
 * Format: A4 portrait, 1 pagină.
 * - Antet: logo BlocApp Locatari (verde) + nume asociație + CUI + adresă
 * - Titlu: CHITANȚA NR. {receiptNumber}
 * - Bloc plătitor: apartament + proprietar + luna
 * - Tabel breakdown: Restanțe / Întreținere / Penalități + TOTAL ÎNCASAT
 * - Total în litere (română)
 * - Situație după încasare: total inițial / rest de încasat (sau ✓ Încasat integral)
 * - Footer: semnătură casier + logo mic BlocApp + timestamp
 */

const COLORS = {
  primary: [16, 185, 129],         // Emerald-500 (verde locatari)
  primaryDark: [4, 120, 87],       // Emerald-700
  primaryLight: [209, 250, 229],   // Emerald-100 (fundal subtil)
  blue: [37, 99, 235],
  red: [220, 38, 38],
  orange: [249, 115, 22],
  gray: [107, 114, 128],
  grayLight: [243, 244, 246],
  grayMid: [209, 213, 219],
  grayDark: [55, 65, 81],
  black: [17, 24, 39],
  white: [255, 255, 255],
};

const fixRo = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/ă/g, 'a').replace(/Ă/g, 'A')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/î/g, 'i').replace(/Î/g, 'I')
    .replace(/ș/g, 's').replace(/Ș/g, 'S')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ț/g, 't').replace(/Ț/g, 'T')
    .replace(/ţ/g, 't').replace(/Ţ/g, 'T');
};

const formatLei = (n) => `${Number(n || 0).toFixed(2)} lei`;

const formatDateRO = (input) => {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const formatDateTimeRO = (input) => {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Încarcă logo-ul BlocApp Locatari (verde) ca base64 cu dimensiunile naturale.
 */
const loadLogo = async () => {
  try {
    const response = await fetch('/blocapp-logo-locatari.png', { cache: 'no-store' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
};

/**
 * Compune adresa asociație ca string (suport struct sau string).
 */
const composeAddress = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.number) parts.push(`nr. ${address.number}`);
  if (address.city) parts.push(address.city);
  if (address.county) parts.push(address.county);
  return parts.join(', ');
};

/**
 * Generează un număr de chitanță sigur (preluat din paymentData sau format an-luna-id).
 */
const buildReceiptNumber = (paymentData) => {
  if (paymentData?.receiptNumber) return String(paymentData.receiptNumber);
  const d = paymentData?.timestamp ? new Date(paymentData.timestamp) : new Date();
  const pad = (x) => String(x).padStart(2, '0');
  const seq = paymentData?.seq || Math.floor(Math.random() * 1000);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}-${String(seq).padStart(3, '0')}`;
};

/**
 * Generează chitanța PDF premium și o descarcă.
 * Semnătură păstrată identică (call sites: PaymentModal, incasariHelpers, MaintenanceTableSimple).
 *
 * @param {object} paymentData - { restante, intretinere, penalitati, total, month, timestamp, receiptNumber, seq }
 * @param {object} apartmentData - { apartmentNumber, owner, persons, totalDatorat, restante, intretinere, penalitati, initialBalance }
 * @param {object} associationData - { name, cui, address, bankAccount, bank, administrator }
 */
export const generateDetailedReceipt = async (paymentData, apartmentData, associationData) => {
  try {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pageW - 2 * margin;

    const logo = await loadLogo();

    // ============== ANTET ==============
    let y = margin;

    // Logo stânga
    let headerTextX = margin;
    if (logo?.dataUrl && logo.w && logo.h) {
      const logoH = 10;
      const logoW = (logo.w / logo.h) * logoH;
      doc.addImage(logo.dataUrl, 'PNG', margin, y + 1, logoW, logoH);
      headerTextX = margin + logoW + 6;
    }

    // Bloc text dreapta: nume asociație + CUI + adresă
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.black);
    doc.text(fixRo((associationData?.name || 'ASOCIATIA DE PROPRIETARI').toUpperCase()), headerTextX, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    let metaY = y + 10;
    if (associationData?.cui) {
      doc.text(fixRo(`CUI: ${associationData.cui}`), headerTextX, metaY);
      metaY += 4;
    }
    const addr = composeAddress(associationData?.address);
    if (addr) {
      doc.text(fixRo(addr), headerTextX, metaY);
      metaY += 4;
    }
    if (associationData?.bankAccount) {
      const bank = associationData.bank ? `${associationData.bank} — ` : '';
      doc.text(fixRo(`${bank}IBAN: ${associationData.bankAccount}`), headerTextX, metaY);
      metaY += 4;
    }

    y = Math.max(y + 18, metaY) + 2;

    // Linie separator
    doc.setDrawColor(...COLORS.grayMid);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // ============== TITLU ==============
    const receiptNo = buildReceiptNumber(paymentData);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.primaryDark);
    doc.text(fixRo(`CHITANTA NR. ${receiptNo}`), pageW / 2, y, { align: 'center' });
    y += 10;

    // ============== METADATA (data + luna) ==============
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.grayDark);
    doc.text(fixRo(`Data emiterii: ${formatDateRO(paymentData?.timestamp)}`), margin, y);
    doc.text(fixRo(`Luna: ${paymentData?.month || '-'}`), pageW - margin, y, { align: 'right' });
    y += 8;

    // ============== BLOC PLATITOR ==============
    doc.setFillColor(...COLORS.grayLight);
    doc.setDrawColor(...COLORS.grayMid);
    const blockH = 18;
    doc.roundedRect(margin, y, contentW, blockH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.black);
    doc.text(fixRo('Apartament:'), margin + 4, y + 6);
    doc.text(fixRo('Proprietar:'), margin + 4, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.text(fixRo(String(apartmentData?.apartmentNumber || '-')), margin + 32, y + 6);
    doc.text(fixRo(apartmentData?.owner || '-'), margin + 32, y + 12);

    if (apartmentData?.persons) {
      doc.setFont('helvetica', 'bold');
      doc.text(fixRo('Persoane:'), margin + 100, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(fixRo(String(apartmentData.persons)), margin + 124, y + 6);
    }

    y += blockH + 8;

    // ============== TABEL BREAKDOWN ==============
    const restante = Number(paymentData?.restante) || 0;
    const intretinere = Number(paymentData?.intretinere) || 0;
    const penalitati = Number(paymentData?.penalitati) || 0;
    const total = Number(paymentData?.total) || (restante + intretinere + penalitati);

    const tableRows = [];
    if (restante > 0) tableRows.push(['Restante', formatLei(restante)]);
    if (intretinere > 0) tableRows.push(['Intretinere curenta', formatLei(intretinere)]);
    if (penalitati > 0) tableRows.push(['Penalitati', formatLei(penalitati)]);

    autoTable(doc, {
      startY: y,
      head: [[fixRo('Categorie'), fixRo('Suma incasata')]],
      body: tableRows.map((r) => [fixRo(r[0]), r[1]]),
      foot: [[fixRo('TOTAL INCASAT'), formatLei(total)]],
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 3,
        textColor: COLORS.grayDark,
        lineColor: COLORS.grayMid,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        halign: 'left',
      },
      footStyles: {
        fillColor: COLORS.primaryLight,
        textColor: COLORS.primaryDark,
        fontStyle: 'bold',
        fontSize: 11,
      },
      columnStyles: {
        0: { cellWidth: contentW * 0.65 },
        1: { cellWidth: contentW * 0.35, halign: 'right' },
      },
    });

    y = doc.lastAutoTable.finalY + 6;

    // ============== TOTAL ÎN LITERE ==============
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.grayDark);
    const inLitere = numberToWordsRo(total);
    const inLitereLines = doc.splitTextToSize(fixRo(`Suma incasata: ${total.toFixed(2)} lei (${inLitere})`), contentW);
    doc.text(inLitereLines, margin, y);
    y += inLitereLines.length * 4 + 4;

    // ============== SITUAȚIE DUPĂ ÎNCASARE ==============
    const totalDatorat = Number(apartmentData?.totalDatorat) || 0;
    const remaining = Math.max(0, totalDatorat - total);

    doc.setFillColor(...(remaining > 0.01 ? COLORS.grayLight : COLORS.primaryLight));
    doc.setDrawColor(...COLORS.grayMid);
    doc.roundedRect(margin, y, contentW, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.grayDark);
    doc.text(fixRo('Total datorat luna:'), margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(formatLei(totalDatorat), margin + 50, y + 6);

    doc.setFont('helvetica', 'bold');
    if (remaining > 0.01) {
      doc.setTextColor(...COLORS.orange);
      doc.text(fixRo('Rest de incasat:'), margin + 4, y + 11.5);
      doc.text(formatLei(remaining), margin + 50, y + 11.5);
    } else {
      doc.setTextColor(...COLORS.primaryDark);
      doc.text(fixRo('Incasat integral'), margin + 4, y + 11.5);
    }

    y += 22;

    // ============== FOOTER ==============
    const footerY = doc.internal.pageSize.getHeight() - 30;

    // Semnătură stânga
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.grayDark);
    const adminLabel = associationData?.administrator
      ? `Casier / Administrator: ${associationData.administrator}`
      : 'Casier / Administrator:';
    doc.text(fixRo(adminLabel), margin, footerY);
    doc.setDrawColor(...COLORS.grayDark);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY + 10, margin + 70, footerY + 10);

    // Logo BlocApp mic centrat + timestamp
    if (logo?.dataUrl) {
      const fLogoH = 6;
      const fLogoW = (logo.w / logo.h) * fLogoH;
      doc.addImage(logo.dataUrl, 'PNG', (pageW - fLogoW) / 2, footerY + 4, fLogoW, fLogoH);
    }
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    doc.text(fixRo(`Generat de BlocApp - ${formatDateTimeRO()}`), pageW / 2, footerY + 14, { align: 'center' });

    // ============== SAVE ==============
    const fileName = `Chitanta_Ap${apartmentData?.apartmentNumber || 'X'}_${receiptNo}.pdf`;
    doc.save(fileName);

    return { success: true, fileName, totalAmount: total };
  } catch (error) {
    console.error('Eroare la generarea chitantei:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper pentru formatarea datelor apartamentului din maintenance data.
 * Păstrat identic pentru backward-compat.
 */
export const formatApartmentDataForReceipt = (maintenanceData, apartmentId) => {
  const apartment = maintenanceData.find(apt => apt.apartmentId === apartmentId);
  if (!apartment) {
    throw new Error('Apartament nu a fost gasit in datele de intretinere');
  }
  return {
    apartmentNumber: apartment.apartment,
    owner: apartment.owner,
    persons: apartment.persons,
    totalDatorat: apartment.totalDatorat,
    restante: apartment.restante,
    intretinere: apartment.currentMaintenance,
    penalitati: apartment.penalitati,
    initialBalance: apartment.initialBalance,
  };
};
