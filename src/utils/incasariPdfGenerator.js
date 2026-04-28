import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generator PDF pentru Raport Incasari lunar.
 *
 * Format: A4 portrait (mai putine coloane decat tabele intretinere)
 * - Antet: logo BlocApp Admin (albastru) + nume asociatie + CUI + adresa
 * - Stats compact: Total incasat • Numar incasari • Apartamente diferite
 * - Tabel: Data | Ap | Proprietar | Restante | Intretinere | Penalitati | Total | Chitanta
 * - Footer: semnatura casier + logo + timestamp
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

const formatDateTimeRO = () => {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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

const loadLogo = async () => {
  try {
    const response = await fetch('/logo-admin.png', { cache: 'no-store' });
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
 * @param {Array} options.apartments - apartamentele asociației (pentru lookup nume)
 * @param {object} options.association - { name, cui, address }
 * @param {string} options.monthYear - ex: "aprilie 2026"
 */
export const generateIncasariPdf = async ({ incasari = [], apartments = [], association, monthYear }) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  const logo = await loadLogo();

  // ============== ANTET ==============
  let y = margin;
  let textX = margin;
  if (logo?.dataUrl && logo.w && logo.h) {
    const logoH = 10;
    const logoW = (logo.w / logo.h) * logoH;
    doc.addImage(logo.dataUrl, 'PNG', margin, y + 1, logoW, logoH);
    textX = margin + logoW + 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.black);
  doc.text(fixRo((association?.name || 'ASOCIATIA DE PROPRIETARI').toUpperCase()), textX, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gray);
  let metaY = y + 10;
  if (association?.cui) {
    doc.text(fixRo(`CUI: ${association.cui}`), textX, metaY);
    metaY += 4;
  }
  const addr = composeAddress(association?.address);
  if (addr) {
    doc.text(fixRo(addr), textX, metaY);
    metaY += 4;
  }

  y = Math.max(y + 13, metaY) + 2;

  doc.setDrawColor(...COLORS.grayMid);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ============== TITLU ==============
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(fixRo(`Raport incasari — ${monthYear || ''}`), margin, y);
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
  // Total încasat
  doc.text(fixRo('Total incasat'), margin + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.greenDark);
  doc.text(`${formatLei(totalAmount)} lei`, margin + 4, y + 11);
  // Numar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.grayDark);
  doc.text(fixRo('Numar incasari'), margin + statW + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(String(incasari.length), margin + statW + 4, y + 11);
  // Apartamente
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
  // Sortez incasari descrescator dupa timestamp
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
      fixRo('TOTAL'),
      '',
      '',
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
      fontSize: 8,
      cellPadding: 2,
      textColor: COLORS.grayDark,
      lineColor: COLORS.grayMid,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'left',
    },
    footStyles: {
      fillColor: COLORS.greenLight,
      textColor: COLORS.greenDark,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 22, halign: 'right', textColor: COLORS.red },
      4: { cellWidth: 22, halign: 'right', textColor: COLORS.indigo },
      5: { cellWidth: 22, halign: 'right', textColor: COLORS.orange },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: COLORS.greenDark },
      7: { cellWidth: 18, halign: 'center' },
    },
    didDrawPage: () => {
      const fY = pageH - 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.text(fixRo('Casier / Administrator: ___________________'), margin, fY);
      if (logo?.dataUrl && logo.w && logo.h) {
        const fLogoH = 5;
        const fLogoW = (logo.w / logo.h) * fLogoH;
        doc.addImage(logo.dataUrl, 'PNG', (pageW - fLogoW) / 2, fY - 2, fLogoW, fLogoH);
      }
      doc.text(fixRo(`Generat de BlocApp - ${formatDateTimeRO()}`), pageW - margin, fY, { align: 'right' });
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
