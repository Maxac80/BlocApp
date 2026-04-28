import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generator PDF pentru Distributie Cheltuieli (tabel detaliat).
 *
 * Format: A4 landscape (multe coloane - una per cheltuiala)
 * - Antet: logo BlocApp Admin (albastru) + nume asociatie + CUI + adresa
 * - Tabel: Ap | Proprietar | Pers | (per expense) | Restante | Penalitati | Total Datorat
 * - Footer pagina: Administrator + Presedinte semnaturi + logo + timestamp
 */

const COLORS = {
  primary: [37, 99, 235],
  primaryDark: [29, 78, 216],
  primaryLight: [219, 234, 254],
  red: [220, 38, 38],
  orange: [249, 115, 22],
  indigo: [79, 70, 229],
  blue: [59, 130, 246],
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
 * @param {Array} options.maintenanceData - rândurile tabelului
 * @param {Array} options.expenses - cheltuielile lunii (cu name + expenseTypeId)
 * @param {object} options.association - { name, cui, address }
 * @param {string} options.monthYear - ex: "aprilie 2026"
 */
export const generateDistributiePdf = async ({ maintenanceData = [], expenses = [], association, monthYear }) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

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
  y += 7;

  // ============== TITLU ==============
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(fixRo(`Distributie cheltuieli — ${monthYear || ''}`), margin, y);
  y += 5;

  // ============== TABEL ==============
  // Coloane fixe + dynamic per cheltuiala
  const head = [
    fixRo('Ap.'),
    fixRo('Proprietar'),
    fixRo('Pers.'),
    ...expenses.map((e) => fixRo(e.name || '-')),
    fixRo('Restante'),
    fixRo('Penalitati'),
    fixRo('Total datorat'),
  ];

  const sums = {
    persons: 0,
    expenses: expenses.map(() => 0),
    restante: 0,
    penalitati: 0,
    total: 0,
  };

  const body = (maintenanceData || []).map((d) => {
    const persons = Number(d.persons) || 0;
    const restante = Number(d.restante) || 0;
    const penalitati = Number(d.penalitati) || 0;
    const totalDatorat = Number(d.totalDatorat) || 0;

    sums.persons += persons;
    sums.restante += restante;
    sums.penalitati += penalitati;
    sums.total += totalDatorat;

    const expenseCells = expenses.map((expense, idx) => {
      const expenseKey = expense.expenseTypeId || expense.id || expense.name;
      const expenseDetail = d.expenseDetails?.[expenseKey];
      const expenseAmount = typeof expenseDetail === 'object' ? expenseDetail?.amount : expenseDetail;
      const numericAmount = Number(expenseAmount) || 0;
      sums.expenses[idx] += numericAmount;
      return formatLei(numericAmount);
    });

    return [
      fixRo(String(d.apartment || '-')),
      fixRo(d.owner || '-'),
      String(persons),
      ...expenseCells,
      formatLei(restante),
      formatLei(penalitati),
      formatLei(totalDatorat),
    ];
  });

  const foot = [
    fixRo('TOTAL'),
    '',
    String(sums.persons),
    ...sums.expenses.map((s) => formatLei(s)),
    formatLei(sums.restante),
    formatLei(sums.penalitati),
    formatLei(sums.total),
  ];

  // Construim columnStyles dinamic
  const columnStyles = {
    0: { cellWidth: 12, halign: 'center' },
    1: { cellWidth: 'auto', minCellWidth: 28 },
    2: { cellWidth: 11, halign: 'center' },
  };
  // Coloane cheltuieli dinamice (3 ... 3 + n - 1)
  const expenseColWidth = expenses.length > 0 ? Math.max(15, Math.min(22, (pageW - 2 * margin - 90) / expenses.length)) : 18;
  expenses.forEach((_, idx) => {
    columnStyles[3 + idx] = {
      cellWidth: expenseColWidth,
      halign: 'right',
      fillColor: COLORS.primaryLight,
    };
  });
  const lastIdx = 3 + expenses.length;
  columnStyles[lastIdx] = { cellWidth: 18, halign: 'right', textColor: COLORS.red };
  columnStyles[lastIdx + 1] = { cellWidth: 18, halign: 'right', textColor: COLORS.orange };
  columnStyles[lastIdx + 2] = { cellWidth: 22, halign: 'right', fontStyle: 'bold' };

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    foot: [foot],
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 20 },
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.5,
      textColor: COLORS.grayDark,
      lineColor: COLORS.grayMid,
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7,
    },
    footStyles: {
      fillColor: COLORS.primaryLight,
      textColor: COLORS.primaryDark,
      fontStyle: 'bold',
    },
    columnStyles,
    didDrawPage: () => {
      const fY = pageH - 12;
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
export const downloadDistributiePdf = async (params) => {
  const doc = await generateDistributiePdf(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  doc.save(`Distributie_${safeName}_${safeMonth}.pdf`);
};
