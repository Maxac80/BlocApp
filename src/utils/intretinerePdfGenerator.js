import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generator PDF pentru Lista Intretinere (tabel simplificat).
 *
 * Format: A4 landscape (multe randuri, citibilitate maxima)
 * - Antet: logo BlocApp Admin (albastru) + nume asociatie + CUI + adresa
 * - Tabel: Apartament | Proprietar | Persoane | Restante | Intretinere | Penalitati | Total Datorat
 * - Footer tabel: TOTAL agregat
 * - Footer pagina: Administrator + Presedinte semnaturi + logo + timestamp
 */

const COLORS = {
  primary: [37, 99, 235],          // Blue-600 (admin BlocApp)
  primaryDark: [29, 78, 216],      // Blue-700
  primaryLight: [219, 234, 254],   // Blue-100
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
 * @param {Array} options.maintenanceData - rows din tabelul Intretinere
 * @param {object} options.association - { name, cui, address }
 * @param {string} options.monthYear - ex: "aprilie 2026"
 * @param {string} [options.stairLabel] - ex: "Scara A" (optional)
 */
export const generateIntretinerePdf = async ({ maintenanceData = [], association, monthYear, stairLabel }) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
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
  const title = `Lista intretinere — ${monthYear || ''}${stairLabel ? ` (${stairLabel})` : ''}`;
  doc.text(fixRo(title), margin, y);
  y += 7;

  // ============== TABEL ==============
  let sumPersons = 0;
  let sumRestante = 0;
  let sumIntretinere = 0;
  let sumPenalitati = 0;
  let sumTotal = 0;

  const body = (maintenanceData || []).map((d) => {
    const paidR = Number(d.paymentInfo?.totalsByCategory?.totalRestante) || 0;
    const paidI = Number(d.paymentInfo?.totalsByCategory?.totalIntretinere) || 0;
    const paidP = Number(d.paymentInfo?.totalsByCategory?.totalPenalitati) || 0;
    const origRestante = (Number(d.restante) || 0) + paidR;
    const origIntretinere = (Number(d.currentMaintenance) || 0) + paidI;
    const origPenalitati = (Number(d.penalitati) || 0) + paidP;
    const origTotal = origRestante + origIntretinere + origPenalitati;
    const persons = Number(d.persons) || 0;

    sumPersons += persons;
    sumRestante += origRestante;
    sumIntretinere += origIntretinere;
    sumPenalitati += origPenalitati;
    sumTotal += origTotal;

    return [
      fixRo(String(d.apartment || '-')),
      fixRo(d.owner || '-'),
      String(persons),
      formatLei(origRestante),
      formatLei(origIntretinere),
      formatLei(origPenalitati),
      formatLei(origTotal),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [[
      fixRo('Ap.'),
      fixRo('Proprietar'),
      fixRo('Pers.'),
      fixRo('Restante'),
      fixRo('Intretinere'),
      fixRo('Penalitati'),
      fixRo('Total datorat'),
    ]],
    body,
    foot: [[
      fixRo('TOTAL'),
      '',
      String(sumPersons),
      formatLei(sumRestante),
      formatLei(sumIntretinere),
      formatLei(sumPenalitati),
      formatLei(sumTotal),
    ]],
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 22 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.5,
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
      fillColor: COLORS.primaryLight,
      textColor: COLORS.primaryDark,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 28, halign: 'right', textColor: COLORS.red },
      4: { cellWidth: 28, halign: 'right', textColor: COLORS.indigo },
      5: { cellWidth: 28, halign: 'right', textColor: COLORS.orange },
      6: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: () => {
      // Footer la fiecare pagina
      const fY = pageH - 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.text(fixRo('Administrator: ___________________'), margin, fY);
      doc.text(fixRo('Presedinte: ___________________'), margin + 90, fY);
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
export const downloadIntretinerePdf = async (params) => {
  const doc = await generateIntretinerePdf(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  doc.save(`Intretinere_${safeName}_${safeMonth}.pdf`);
};
