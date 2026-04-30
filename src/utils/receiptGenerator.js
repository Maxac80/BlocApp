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
  if (address.block || address.bloc) parts.push(`bl. ${address.block || address.bloc}`);
  if (address.stair || address.scara) parts.push(`sc. ${address.stair || address.scara}`);
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
 * Construiește prefixul de serie din numele asociației (primele 2-3 majuscule).
 * Ex: "Asociația Vulturul B4A" → "VBA"; default "BA" (BlocApp).
 */
const buildSeriesPrefix = (associationData) => {
  if (associationData?.receiptSeries) return String(associationData.receiptSeries).toUpperCase();
  const name = associationData?.name || '';
  const tokens = name.split(/\s+/).filter((t) => t && !/^(asociatia|asociația|de|proprietari)$/i.test(t));
  if (tokens.length === 0) return 'BA';
  const initials = tokens.slice(0, 3).map((t) => t.charAt(0).toUpperCase()).join('');
  return initials || 'BA';
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
    const doc = new jsPDF('portrait', 'mm', 'a5');
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentW = pageW - 2 * margin;

    const logo = await loadLogo();

    // ============== ANTET ==============
    let y = margin;

    // Logo în partea DREAPTA + URL sub logo
    let logoW = 0;
    let logoH = 0;
    if (logo?.dataUrl && logo.w && logo.h) {
      logoH = 10;
      logoW = (logo.w / logo.h) * logoH;
      doc.addImage(logo.dataUrl, 'PNG', pageW - margin - logoW, y + 1, logoW, logoH);
      // URL aliniat la dreapta paginii (cu margin-ul)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...COLORS.gray);
      doc.text('www.blocapp.ro', pageW - margin, y + logoH + 4, { align: 'right' });
    }

    // Bloc text STANGA: nume asociație + CUI + adresă
    const headerTextX = margin;
    const headerMaxX = pageW - margin - logoW - 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.black);
    const nameLines = doc.splitTextToSize(
      fixRo((associationData?.name || 'ASOCIATIA DE PROPRIETARI').toUpperCase()),
      headerMaxX - headerTextX
    );
    doc.text(nameLines, headerTextX, y + 4);
    let metaY = y + 4 + nameLines.length * 4 + 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.gray);
    if (associationData?.cui) {
      doc.text(fixRo(`CUI: ${associationData.cui}`), headerTextX, metaY);
      metaY += 3.5;
    }
    const addr = composeAddress(associationData?.address);
    if (addr) {
      const addrLines = doc.splitTextToSize(fixRo(addr), headerMaxX - headerTextX);
      doc.text(addrLines, headerTextX, metaY);
      metaY += addrLines.length * 3.5;
    }
    if (associationData?.bankAccount) {
      const bank = associationData.bank ? `${associationData.bank} — ` : '';
      doc.text(fixRo(`${bank}IBAN: ${associationData.bankAccount}`), headerTextX, metaY);
      metaY += 3.5;
    }

    y = Math.max(y + 14, metaY) + 1;

    // Linie separator (mai aproape de antet, departe de titlu)
    doc.setDrawColor(...COLORS.grayMid);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // ============== TITLU (cu serie) ==============
    const receiptNo = buildReceiptNumber(paymentData);
    const seriesPrefix = buildSeriesPrefix(associationData);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.primaryDark);
    doc.text(fixRo(`CHITANTA   SERIA ${seriesPrefix}   NR. ${receiptNo}`), pageW / 2, y, { align: 'center' });
    y += 7;

    // ============== METADATA (data emiterii) ==============
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.grayDark);
    doc.text(fixRo(`Data emiterii: ${formatDateRO(paymentData?.timestamp)}`), margin, y);
    if (paymentData?.month) {
      doc.text(fixRo(`Luna intretinerii: ${paymentData.month}`), pageW - margin, y, { align: 'right' });
    }
    y += 5;

    // ============== AM PRIMIT DE LA + SUMA ==============
    // Curățare nume bloc/scară (elimină prefixul "Bloc"/"Scara" dacă utilizatorul l-a inclus deja)
    const stripPrefix = (name, prefix) => {
      if (!name) return '';
      const re = new RegExp(`^${prefix}\\s+`, 'i');
      return String(name).replace(re, '').trim();
    };
    const blocClean = stripPrefix(apartmentData?.blockName, 'bloc');
    const scaraClean = stripPrefix(apartmentData?.stairName, 'scara|scar[ăa]');

    // Construiește propoziția identificare plătitor
    const idParts = [];
    if (apartmentData?.apartmentNumber) idParts.push(`apartamentul ${apartmentData.apartmentNumber}`);
    if (blocClean) idParts.push(`bloc ${blocClean}`);
    if (scaraClean) idParts.push(`scara ${scaraClean}`);
    const idSentence = `${apartmentData?.owner || '-'}, ${idParts.join(', ')}`;

    const totalAmount = (Number(paymentData?.restante) || 0)
      + (Number(paymentData?.intretinere) || 0)
      + (Number(paymentData?.penalitati) || 0);

    doc.setFillColor(...COLORS.grayLight);
    doc.setDrawColor(...COLORS.grayMid);
    const blockH = 18;
    doc.roundedRect(margin, y, contentW, blockH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.black);
    doc.text(fixRo('Am primit de la:'), margin + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    const idLines = doc.splitTextToSize(fixRo(idSentence), contentW - 32);
    doc.text(idLines, margin + 31, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.text(fixRo('Suma de:'), margin + 3, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primaryDark);
    doc.text(fixRo(`${(Number(paymentData?.total) || totalAmount).toFixed(2)} lei`), margin + 31, y + 14);

    // Eticheta "Reprezentand contravaloare:" deasupra tabelului
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.black);
    doc.text(fixRo('Reprezentand contravaloare:'), margin, y + blockH + 5);

    y += blockH + 8;

    // ============== TABEL BREAKDOWN ==============
    const restante = Number(paymentData?.restante) || 0;
    const intretinere = Number(paymentData?.intretinere) || 0;
    const penalitati = Number(paymentData?.penalitati) || 0;
    const total = Number(paymentData?.total) || (restante + intretinere + penalitati);

    const luna = paymentData?.month || '';
    const consumLuna = paymentData?.consumptionMonth || '';
    const intretinereLabel = luna
      ? (consumLuna && consumLuna !== luna
          ? `Intretinere luna ${luna} (consum ${consumLuna})`
          : `Intretinere luna ${luna}`)
      : 'Intretinere curenta';
    const restanteLabel = luna ? `Restante (anterior lunii ${luna})` : 'Restante';
    const penalitatiLabel = luna ? `Penalitati cumulate (la ${luna})` : 'Penalitati cumulate';

    const tableRows = [];
    if (intretinere > 0) tableRows.push([intretinereLabel, formatLei(intretinere)]);
    if (restante > 0) tableRows.push([restanteLabel, formatLei(restante)]);
    if (penalitati > 0) tableRows.push([penalitatiLabel, formatLei(penalitati)]);

    autoTable(doc, {
      startY: y,
      head: [[fixRo('Categorie'), fixRo('Suma incasata')]],
      body: tableRows.map((r) => [fixRo(r[0]), r[1]]),
      foot: [[
        { content: fixRo('TOTAL INCASAT'), styles: { halign: 'left' } },
        { content: formatLei(total), styles: { halign: 'right' } }
      ]],
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 2,
        textColor: COLORS.grayDark,
        lineColor: COLORS.grayMid,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 8.5,
      },
      footStyles: {
        fillColor: COLORS.primaryLight,
        textColor: COLORS.primaryDark,
        fontStyle: 'bold',
        fontSize: 9.5,
      },
      columnStyles: {
        0: { cellWidth: contentW * 0.65 },
        1: { cellWidth: contentW * 0.35, halign: 'right' },
      },
    });

    y = doc.lastAutoTable.finalY + 4;

    // ============== TOTAL ÎN LITERE ==============
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.grayDark);
    const inLitere = numberToWordsRo(total);
    const inLitereLines = doc.splitTextToSize(fixRo(`Adica: ${total.toFixed(2)} lei (${inLitere})`), contentW);
    doc.text(inLitereLines, margin, y);
    y += inLitereLines.length * 3.5 + 6;

    // ============== SEMNATURA CASIER ==============
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.grayDark);
    const cashierName = associationData?.cashier || associationData?.administrator || '';
    const cashierRole = associationData?.cashierRole || 'Administrator';
    const cashierLabel = `Casier / ${cashierRole}:`;
    doc.text(fixRo(cashierLabel), margin, y);
    const labelW = doc.getTextWidth(fixRo(cashierLabel)) + 2;
    if (cashierName) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.black);
      doc.text(fixRo(cashierName), margin + labelW, y);
    } else {
      // Linie goală pentru semnătura manuală
      doc.setDrawColor(...COLORS.grayDark);
      doc.setLineWidth(0.2);
      doc.line(margin + labelW, y + 1.5, margin + labelW + 60, y + 1.5);
    }
    y += 8;

    // ============== NOTA OMFP (jos pe pagina) ==============
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.gray);
    doc.text(
      fixRo('Conform OMFP nr. 2634/2015 si OMFP nr. 3103/2017 - formular financiar-contabil cod 14-4-1'),
      pageW / 2,
      pageH - 6,
      { align: 'center' }
    );

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
