import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generator PDF pentru Raport Incasari lunar.
 *
 * Format: A4 portrait
 * - Antet: nume asociatie + CUI + adresa + IBAN | logo BlocApp dreapta + www.blocapp.ro
 * - Titlu: "RAPORT INCASARI - [LUNA]"
 * - Stats: Total incasat • Numar incasari • Apartamente diferite
 * - Tabel: Data | Ap | Proprietar | Restante | Intretinere | Penalitati | Total | Chitanta
 * - Footer: Administrator | Casier | Cenzor cu nume din association
 */

const COLORS = {
  primary: [37, 99, 235],
  primaryDark: [29, 78, 216],
  primaryLight: [219, 234, 254],
  green: [16, 185, 129],
  greenDark: [4, 120, 87],
  greenLight: [209, 250, 229],
  red: [220, 38, 38],
  orange: [249, 115, 22],
  indigo: [79, 70, 229],
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

const formatLei = (n) => Number(n || 0).toFixed(2);

const formatDate = (input) => {
  if (!input) return '-';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '-';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const composeAddress = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  const parts = [];
  if (address.street) {
    let streetPart = address.street;
    if (address.number) streetPart += ` nr. ${address.number}`;
    parts.push(streetPart);
  }
  if (address.city) parts.push(address.city);
  if (address.county) parts.push(address.county);
  return parts.join(', ');
};

const composeBankAccount = (association) => {
  const iban = association?.bankAccount || association?.bankAccountData?.iban || '';
  const bank = association?.bank || association?.bankAccountData?.bank || '';
  if (!iban) return '';
  return bank ? `${bank} - ${iban}` : `IBAN: ${iban}`;
};

const loadLogo = async () => {
  try {
    const response = await fetch('/blocapp-logo.png', { cache: 'no-store' });
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
 * @param {object} options
 * @param {Array} options.incasari - lista încasărilor lunii
 * @param {Array} options.apartments
 * @param {object} options.association - { name, cui, address, bankAccount, legalAdmin, president, censor }
 * @param {string} options.monthYear - ex: "aprilie 2026"
 */
export const generateIncasariPdf = async ({ incasari = [], apartments = [], association, monthYear }) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  const logo = await loadLogo();

  // ============== ANTET ==============
  let y = margin;

  // Logo dreapta sus + www.blocapp.ro
  if (logo?.dataUrl && logo.w && logo.h) {
    const logoH = 11;
    const logoW = (logo.w / logo.h) * logoH;
    doc.addImage(logo.dataUrl, 'PNG', pageW - margin - logoW, y, logoW, logoH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.gray);
    doc.text('www.blocapp.ro', pageW - margin, y + logoH + 3, { align: 'right' });
  }

  // Nume asociatie stanga sus
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.black);
  doc.text(fixRo((association?.name || 'ASOCIATIA DE PROPRIETARI').toUpperCase()), margin, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gray);
  let metaY = y + 10;
  if (association?.cui) {
    doc.text(fixRo(`CUI: ${association.cui}`), margin, metaY);
    metaY += 4;
  }
  const addr = composeAddress(association?.address);
  if (addr) {
    doc.text(fixRo(addr), margin, metaY);
    metaY += 4;
  }
  const bankLine = composeBankAccount(association);
  if (bankLine) {
    doc.text(fixRo(bankLine), margin, metaY);
    metaY += 4;
  }

  y = metaY - 1;
  doc.setDrawColor(...COLORS.grayMid);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ============== TITLU ==============
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(fixRo(`Raport incasari - ${monthYear || ''}`).toUpperCase(), margin, y);
  y += 7;

  // ============== STATS ==============
  const totalAmount = incasari.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const distinctApartments = new Set(incasari.map((i) => i.apartmentId)).size;

  doc.setFillColor(...COLORS.greenLight);
  doc.setDrawColor(...COLORS.grayMid);
  const statsBoxH = 14;
  doc.roundedRect(margin, y, pageW - 2 * margin, statsBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.grayDark);
  const statW = (pageW - 2 * margin) / 3;
  doc.text(fixRo('Total incasat'), margin + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.greenDark);
  doc.text(`${formatLei(totalAmount)} lei`, margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.grayDark);
  doc.text(fixRo('Numar incasari'), margin + statW + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(String(incasari.length), margin + statW + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.grayDark);
  doc.text(fixRo('Apartamente diferite'), margin + 2 * statW + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(String(distinctApartments), margin + 2 * statW + 4, y + 11);

  y += statsBoxH + 6;

  // ============== TABEL ==============
  const sorted = [...incasari].sort(
    (a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
  );

  let sumRest = 0;
  let sumIntr = 0;
  let sumPen = 0;
  let sumTotal = 0;

  const body = sorted.map((inc) => {
    const apt = apartments.find((a) => a.id === inc.apartmentId);
    const rest = Number(inc.restante) || 0;
    const intr = Number(inc.intretinere) || 0;
    const pen = Number(inc.penalitati) || 0;
    const tot = Number(inc.total) || rest + intr + pen;

    sumRest += rest;
    sumIntr += intr;
    sumPen += pen;
    sumTotal += tot;

    return [
      formatDate(inc.timestamp || inc.createdAt),
      fixRo(String(apt?.number || inc.apartmentNumber || '-')),
      fixRo(apt?.owner || inc.owner || '-'),
      formatLei(rest),
      formatLei(intr),
      formatLei(pen),
      formatLei(tot),
      fixRo(inc.receiptNumber ? `#${inc.receiptNumber}` : '-'),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [[
      fixRo('Data'),
      fixRo('Ap.'),
      fixRo('Proprietar'),
      fixRo('Restante'),
      fixRo('Intretinere'),
      fixRo('Penalitati'),
      fixRo('Total'),
      fixRo('Chitanta'),
    ]],
    body,
    foot: [[
      { content: fixRo('TOTAL'), colSpan: 3, styles: { halign: 'right' } },
      formatLei(sumRest),
      formatLei(sumIntr),
      formatLei(sumPen),
      formatLei(sumTotal),
      '',
    ]],
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 22 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 1.8,
      textColor: COLORS.grayDark,
      lineColor: COLORS.grayMid,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: COLORS.greenLight,
      textColor: COLORS.greenDark,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 22, halign: 'right', textColor: COLORS.red },
      4: { cellWidth: 22, halign: 'right', textColor: COLORS.indigo },
      5: { cellWidth: 22, halign: 'right', textColor: COLORS.orange },
      6: {
        cellWidth: 24,
        halign: 'right',
        fontStyle: 'bold',
        fillColor: COLORS.greenLight,
        textColor: COLORS.black,
      },
      7: { cellWidth: 18, halign: 'center' },
    },
    didDrawPage: () => {
      // Footer: Administrator | Casier | Cenzor (cu nume din association)
      const fY = pageH - 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.grayDark);
      const slotW = (pageW - 2 * margin) / 3;
      const slots = [
        { label: 'Administrator', name: association?.legalAdmin || '' },
        { label: 'Presedinte', name: association?.president || '' },
        { label: 'Cenzor', name: association?.censor || '' },
      ];
      slots.forEach((slot, idx) => {
        const slotX = margin + slotW * idx + slotW / 2;
        doc.setFont('helvetica', 'bold');
        doc.text(fixRo(slot.label), slotX, fY - 3, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        if (slot.name) {
          doc.setTextColor(...COLORS.black);
          doc.text(fixRo(slot.name), slotX, fY + 1, { align: 'center' });
          doc.setTextColor(...COLORS.grayDark);
        }
        doc.setDrawColor(...COLORS.grayMid);
        doc.setLineWidth(0.3);
        doc.line(slotX - slotW / 2 + 8, fY + 4, slotX + slotW / 2 - 8, fY + 4);
      });
    },
  });

  return doc;
};

/**
 * Genereaza si descarca direct PDF-ul.
 */
export const downloadIncasariPdf = async (params) => {
  const doc = await generateIncasariPdf(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  doc.save(`Raport_Incasari_${safeName}_${safeMonth}.pdf`);
};
