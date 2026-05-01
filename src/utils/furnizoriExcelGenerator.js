import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generator Excel pentru pagina Furnizori.
 *
 * Output: .xlsx cu un singur sheet "Furnizori":
 * - Antet: nume asociație + CUI + adresă + IBAN | logo BlocApp dreapta
 * - Titlu: "LISTA FURNIZORI - [LUNA]" + subtitlu cu luna de consum
 * - Tabel ierarhic: rând furnizor (bold, fundal albastru-deschis) + sub-rânduri facturi
 * - Coloane: Nr | Furnizor / Factură | Cheltuieli / Distribuție | Total | Distribuit | Rămas | Status
 * - Footer: Administrator | Președinte | Cenzor
 */

const COLORS = {
  primary: 'FF2563EB',
  primaryLight: 'FFDBEAFE',
  primaryDark: 'FF1E40AF',
  blueLight: 'FFEFF6FF',
  red: 'FFDC2626',
  redLight: 'FFFEE2E2',
  green: 'FF059669',
  greenLight: 'FFD1FAE5',
  orange: 'FFF97316',
  orangeLight: 'FFFFEDD5',
  amber: 'FFD97706',
  amberLight: 'FFFEF3C7',
  yellow: 'FFCA8A04',
  yellowLight: 'FFFEF9C3',
  gray: 'FF6B7280',
  grayLight: 'FFF3F4F6',
  grayMid: 'FFD1D5DB',
  grayDark: 'FF374151',
  black: 'FF111827',
  white: 'FFFFFFFF',
};

const formatLei = (n) => Number(n || 0);

const formatDateRo = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

const composeAddress = (address, blocks = [], stairs = []) => {
  if (!address && (!blocks || blocks.length === 0)) return '';
  const parts = [];

  // Stradă + număr
  if (address) {
    if (typeof address === 'string') {
      parts.push(address);
    } else if (address.street) {
      let streetPart = address.street;
      if (address.number) streetPart += ` nr. ${address.number}`;
      parts.push(streetPart);
    }
  }

  // Bloc(uri) — păstrează prefix "Bloc" doar dacă numele nu îl are deja
  if (blocks && blocks.length > 0) {
    const blocNames = blocks
      .map(b => b.name || '')
      .filter(Boolean)
      .map(name => /^bloc\s+/i.test(name) ? name : `Bloc ${name}`);
    if (blocNames.length === 1) parts.push(blocNames[0]);
    else if (blocNames.length > 1) parts.push(`Blocuri ${blocNames.map(n => n.replace(/^bloc\s+/i, '')).join(', ')}`);
  }

  // Scară/scări — păstrează prefix "Scara" doar dacă numele nu îl are deja
  if (stairs && stairs.length > 0) {
    const stairNames = stairs
      .map(s => s.name || '')
      .filter(Boolean)
      .map(name => /^(scara|sc\.?)\s+/i.test(name) ? name : `Scara ${name}`);
    if (stairNames.length === 1) parts.push(stairNames[0]);
    else if (stairNames.length > 1) parts.push(`Scări ${stairNames.map(n => n.replace(/^(scara|sc\.?)\s+/i, '')).join(', ')}`);
  }

  // Oraș + județ
  if (address && typeof address === 'object') {
    if (address.city) parts.push(address.city);
    if (address.county) parts.push(address.county);
  }

  return parts.join(', ');
};

const composeBankAccount = (association) => {
  const iban = association?.bankAccount || association?.bankAccountData?.iban || '';
  const bank = association?.bank || association?.bankAccountData?.bank || '';
  if (!iban) return '';
  return bank ? `${bank} - ${iban}` : `IBAN: ${iban}`;
};

const loadLogo = async (workbook) => {
  try {
    const response = await fetch('/blocapp-logo.png');
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return workbook.addImage({ buffer, extension: 'png' });
  } catch {
    return null;
  }
};

const STATUS_STYLE = {
  full: { label: 'Distribuit', fg: COLORS.green, bg: COLORS.greenLight },
  partial: { label: 'Parțial', fg: COLORS.amber, bg: COLORS.amberLight },
  undistributed: { label: 'Nedistribuit', fg: COLORS.red, bg: COLORS.redLight },
  no_invoices: { label: 'Fără facturi', fg: COLORS.yellow, bg: COLORS.yellowLight },
  no_expenses: { label: 'Fără cheltuieli', fg: COLORS.gray, bg: COLORS.grayLight },
};

const INVOICE_STATUS_STYLE = {
  full: { label: 'Distribuită', fg: COLORS.green, bg: COLORS.greenLight },
  partial: { label: 'Parțial', fg: COLORS.amber, bg: COLORS.amberLight },
  none: { label: 'Nedistribuită', fg: COLORS.red, bg: COLORS.redLight },
};

const HEADERS = [
  { label: 'Nr.', width: 5, align: 'center' },
  { label: 'Furnizor / Factură', width: 32, align: 'left' },
  { label: 'Cheltuieli / Distribuție', width: 42, align: 'left' },
  { label: 'Total', width: 13, align: 'right' },
  { label: 'Distribuit', width: 13, align: 'right' },
  { label: 'Rămas', width: 13, align: 'right' },
  { label: 'Status', width: 16, align: 'center' },
];

/**
 * Sortează furnizorii după prima cheltuială asociată în ordinea defaultExpenseTypes,
 * apoi alfabetic. Furnizorii fără cheltuieli sunt la final.
 */
const sortSuppliers = (suppliers, expenseTypes, getSupplierExpenseTypes) => {
  const expenseOrder = new Map();
  expenseTypes.forEach((exp, idx) => {
    expenseOrder.set(exp.name, idx);
  });

  const getOrderKey = (supplier) => {
    const supplierExpenses = getSupplierExpenseTypes(supplier.id);
    if (supplierExpenses.length === 0) return Number.MAX_SAFE_INTEGER;
    const indices = supplierExpenses
      .map(name => expenseOrder.get(name))
      .filter(idx => idx !== undefined);
    return indices.length > 0 ? Math.min(...indices) : Number.MAX_SAFE_INTEGER;
  };

  return [...suppliers].sort((a, b) => {
    const ka = getOrderKey(a);
    const kb = getOrderKey(b);
    if (ka !== kb) return ka - kb;
    return (a.name || '').localeCompare(b.name || '', 'ro');
  });
};

const computeInvoiceStatus = (invoice) => {
  const total = parseFloat(invoice.totalInvoiceAmount || invoice.totalAmount) || 0;
  const distHistory = (invoice.distributionHistory || []).filter(d => d.amount > 0);
  const distributed = distHistory.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const remaining = total - distributed;
  const isFull = remaining <= 0.01 && distributed > 0;
  const status = isFull ? 'full' : distributed > 0 ? 'partial' : 'none';
  return { total, distributed, remaining, status, distHistory };
};

const computeSupplierStatus = (supplier, expenseTypes, sheet, supplierInvoices) => {
  if (expenseTypes.length === 0) return 'no_expenses';
  const distributedExpenses = sheet?.expenses || [];
  const distributedCount = expenseTypes.filter(name =>
    distributedExpenses.some(exp => exp.name === name)
  ).length;

  if (distributedCount === expenseTypes.length) return 'full';
  if (distributedCount > 0) return 'partial';
  if (supplierInvoices.length === 0) return 'no_invoices';
  return 'undistributed';
};

const formatDistributionBreakdown = (distHistory) => {
  if (!distHistory || distHistory.length === 0) return '—';
  return distHistory
    .map(d => `${d.expenseName}: ${(parseFloat(d.amount) || 0).toFixed(2)} lei`)
    .join(' • ');
};

const setBorders = (cell, color = COLORS.grayMid) => {
  cell.border = {
    top: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  };
};

const columnLetter = (n) => {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

/**
 * @param {object} options
 * @param {object} options.association
 * @param {string} options.monthYear
 * @param {string} options.consumptionMonth
 * @param {Date} options.publicationDate
 * @param {Array} options.suppliers
 * @param {Array} options.invoices
 * @param {Array} options.expenseTypes - sortate (din getAssociationExpenseTypes)
 * @param {object} options.activeSheet
 * @param {Function} options.getSupplierExpenseTypes - (supplierId) => string[] nume cheltuieli
 */
export const generateFurnizoriExcel = async ({
  association,
  monthYear,
  consumptionMonth,
  publicationDate,
  suppliers = [],
  invoices = [],
  expenseTypes = [],
  activeSheet,
  getSupplierExpenseTypes,
  blocks = [],
  stairs = [],
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BlocApp';
  workbook.created = new Date();

  const logoId = await loadLogo(workbook);
  const totalCols = HEADERS.length;

  const sheet = workbook.addWorksheet('Furnizori', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    properties: { defaultRowHeight: 16 },
  });

  HEADERS.forEach((h, idx) => {
    sheet.getColumn(idx + 1).width = h.width;
  });

  // ============ ANTET ============
  if (logoId !== null && logoId !== undefined) {
    // oneCellAnchor + ext fix (140x47) — dimensiunea naturală a logo-ului păstrată.
    // Aceeași convenție ca în distributieExcelGenerator (offset 24 px în col penultimă).
    sheet.addImage(logoId, {
      tl: { col: totalCols - 2, row: 0, nativeColOff: 228600, nativeRowOff: 38100 },
      ext: { width: 140, height: 47 },
      editAs: 'oneCell',
    });
    sheet.getRow(1).height = 26;
    sheet.getRow(2).height = 24;
    const wwwCell = sheet.getCell(3, totalCols);
    wwwCell.value = { text: 'www.blocapp.ro', hyperlink: 'https://blocapp.ro' };
    wwwCell.font = { size: 9, color: { argb: COLORS.primary }, underline: 'single' };
    wwwCell.alignment = { horizontal: 'right' };
  }

  sheet.mergeCells(1, 1, 1, Math.max(1, totalCols - 2));
  const nameCell = sheet.getCell(1, 1);
  nameCell.value = (association?.name || 'ASOCIATIA DE PROPRIETARI').toUpperCase();
  nameCell.font = { size: 14, bold: true, color: { argb: COLORS.black } };
  nameCell.alignment = { horizontal: 'left', vertical: 'middle' };

  let r = 2;
  if (association?.cui) {
    sheet.mergeCells(r, 1, r, totalCols - 2);
    const c = sheet.getCell(r, 1);
    c.value = `CUI: ${association.cui}`;
    c.font = { size: 9, color: { argb: COLORS.gray } };
    r++;
  }
  const addr = composeAddress(association?.address, blocks, stairs);
  if (addr) {
    sheet.mergeCells(r, 1, r, totalCols - 2);
    const c = sheet.getCell(r, 1);
    c.value = addr;
    c.font = { size: 9, color: { argb: COLORS.gray } };
    r++;
  }
  const bankLine = composeBankAccount(association);
  if (bankLine) {
    sheet.mergeCells(r, 1, r, totalCols - 2);
    const c = sheet.getCell(r, 1);
    c.value = bankLine;
    c.font = { size: 9, color: { argb: COLORS.gray } };
    r++;
  }

  // Linie separator
  for (let col = 1; col <= totalCols; col++) {
    sheet.getCell(r, col).border = { bottom: { style: 'thin', color: { argb: COLORS.grayMid } } };
  }
  sheet.getRow(r).height = 4;
  r++;

  // ============ TITLU + DATA ============
  sheet.mergeCells(r, 1, r, Math.max(1, totalCols - 2));
  const titleCell = sheet.getCell(r, 1);
  titleCell.value = `LISTA FURNIZORI - ${(monthYear || '').toUpperCase()}`;
  titleCell.font = { size: 13, bold: true, color: { argb: COLORS.primaryDark } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(r).height = 22;

  if (publicationDate) {
    sheet.mergeCells(r, totalCols - 1, r, totalCols);
    const dateCell = sheet.getCell(r, totalCols - 1);
    dateCell.value = `Data: ${formatDateRo(publicationDate)}`;
    dateCell.font = { size: 9, color: { argb: COLORS.grayDark } };
    dateCell.alignment = { horizontal: 'right' };
  }
  r++;

  if (consumptionMonth) {
    sheet.mergeCells(r, 1, r, totalCols);
    const c = sheet.getCell(r, 1);
    c.value = `(consum luna ${consumptionMonth})`;
    c.font = { size: 9, italic: true, color: { argb: COLORS.gray } };
    c.alignment = { horizontal: 'left' };
    r++;
  }
  r++;

  // ============ HEADER TABEL ============
  const headerRowIdx = r;
  HEADERS.forEach((h, idx) => {
    const cell = sheet.getCell(r, idx + 1);
    cell.value = h.label;
    cell.font = { size: 9, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    setBorders(cell);
  });
  sheet.getRow(r).height = 28;
  r++;

  // ============ BODY ============
  const sortedSuppliers = sortSuppliers(suppliers, expenseTypes, getSupplierExpenseTypes);

  let grandTotal = 0;
  let grandDistributed = 0;
  let grandRemaining = 0;
  let supplierIdx = 0;

  sortedSuppliers.forEach((supplier) => {
    const supplierExpenses = getSupplierExpenseTypes(supplier.id);
    const supplierInvoices = invoices.filter(inv => inv.supplierId === supplier.id);

    // Agregat per furnizor
    let supplierTotal = 0;
    let supplierDistributed = 0;
    supplierInvoices.forEach(inv => {
      const { total, distributed } = computeInvoiceStatus(inv);
      supplierTotal += total;
      supplierDistributed += distributed;
    });
    const supplierRemaining = supplierTotal - supplierDistributed;
    const supplierStatus = computeSupplierStatus(supplier, supplierExpenses, activeSheet, supplierInvoices);
    const supplierStatusStyle = STATUS_STYLE[supplierStatus] || STATUS_STYLE.no_expenses;

    grandTotal += supplierTotal;
    grandDistributed += supplierDistributed;
    grandRemaining += supplierRemaining;
    supplierIdx++;

    // ===== Rând furnizor =====
    const supplierRow = [
      supplierIdx,
      supplier.name || '-',
      supplierExpenses.length > 0 ? supplierExpenses.join(', ') : '—',
      formatLei(supplierTotal),
      formatLei(supplierDistributed),
      formatLei(supplierRemaining),
      supplierStatusStyle.label,
    ];

    // Furnizori fără facturi/cheltuieli → afișați palid (gri-deschis, nu bold albastru)
    const isInactive = supplierStatus === 'no_invoices' || supplierStatus === 'no_expenses';
    const rowFill = isInactive ? COLORS.grayLight : COLORS.primaryLight;
    const rowNameColor = isInactive ? COLORS.gray : COLORS.primaryDark;
    const rowDataColor = isInactive ? COLORS.gray : COLORS.black;
    const rowBold = !isInactive;

    supplierRow.forEach((val, idx) => {
      const cell = sheet.getCell(r, idx + 1);
      cell.value = val;
      const headerMeta = HEADERS[idx];
      cell.alignment = { horizontal: headerMeta.align, vertical: 'middle', wrapText: idx === 2 };

      if (idx >= 3 && idx <= 5) cell.numFmt = '#,##0.00';

      // Fundal & font: bold albastru pentru activi, palid gri pentru inactivi
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
      cell.font = {
        size: 10,
        bold: rowBold,
        color: { argb: idx === 1 ? rowNameColor : rowDataColor },
        italic: isInactive && idx === 1,
      };

      // Status cell — culoare specifică (păstrată chiar și pentru inactivi)
      if (idx === 6) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: supplierStatusStyle.bg } };
        cell.font = { size: 9, bold: true, color: { argb: supplierStatusStyle.fg } };
      }

      setBorders(cell);
    });
    sheet.getRow(r).height = 22;
    r++;

    // ===== Sub-rânduri facturi =====
    if (supplierInvoices.length === 0) {
      // Marchează lipsa facturilor
      const noInvCell = sheet.getCell(r, 2);
      sheet.mergeCells(r, 2, r, totalCols);
      noInvCell.value = '   (fără facturi în luna curentă)';
      noInvCell.font = { size: 9, italic: true, color: { argb: COLORS.gray } };
      noInvCell.alignment = { horizontal: 'left', vertical: 'middle' };
      setBorders(noInvCell);
      // Bordură pe celula goală din coloana 1
      const emptyCell = sheet.getCell(r, 1);
      setBorders(emptyCell);
      r++;
    } else {
      supplierInvoices.forEach((inv) => {
        const { total, distributed, remaining, status, distHistory } = computeInvoiceStatus(inv);
        const invStatusStyle = INVOICE_STATUS_STYLE[status];
        const hasMultiple = distHistory.length > 1;

        // ===== Rând principal factură =====
        // Dacă o singură distribuție → o arătăm în coloana 3 pe rândul facturii
        // Dacă mai multe → coloana 3 rămâne goală pe rândul facturii și fiecare distribuție e pe rândul ei propriu dedesubt
        const firstDistText = !hasMultiple && distHistory.length === 1
          ? `${distHistory[0].expenseName}: ${(parseFloat(distHistory[0].amount) || 0).toFixed(2)} lei`
          : (distHistory.length === 0 ? '—' : '');

        const invRow = [
          '',
          `   └ Nr. ${inv.invoiceNumber || '—'}`,
          firstDistText,
          formatLei(total),
          formatLei(distributed),
          formatLei(remaining),
          invStatusStyle.label,
        ];

        invRow.forEach((val, idx) => {
          const cell = sheet.getCell(r, idx + 1);
          cell.value = val;
          const headerMeta = HEADERS[idx];
          cell.alignment = { horizontal: headerMeta.align, vertical: 'middle' };

          if (idx >= 3 && idx <= 5) cell.numFmt = '#,##0.00';

          cell.font = { size: 9, color: { argb: COLORS.grayDark } };

          if (idx === 6) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: invStatusStyle.bg } };
            cell.font = { size: 9, bold: true, color: { argb: invStatusStyle.fg } };
          }

          if (idx === 5 && remaining > 0.01) {
            cell.font = { size: 9, bold: true, color: { argb: COLORS.orange } };
          }

          setBorders(cell);
        });
        sheet.getRow(r).height = 18;
        r++;

        // ===== Sub-rânduri per cheltuială (doar dacă > 1) =====
        // Numele cheltuielii pe col C, suma pe col E (Distribuit) — aliniate cu tabelul
        if (hasMultiple) {
          distHistory.forEach((d) => {
            const amount = parseFloat(d.amount) || 0;
            const distRow = [
              '',
              '',
              `      ${d.expenseName}`,
              '',
              formatLei(amount),
              '',
              '',
            ];
            distRow.forEach((val, idx) => {
              const cell = sheet.getCell(r, idx + 1);
              cell.value = val;
              cell.alignment = { horizontal: idx === 2 ? 'left' : HEADERS[idx].align, vertical: 'middle' };
              cell.font = { size: 9, italic: true, color: { argb: COLORS.gray } };
              if (idx === 4 && typeof val === 'number') cell.numFmt = '#,##0.00';
              setBorders(cell);
            });
            sheet.getRow(r).height = 16;
            r++;
          });
        }
      });
    }
  });

  // ============ FOOTER TOTAL GENERAL ============
  const footerValues = [
    '',
    'TOTAL GENERAL',
    `${sortedSuppliers.length} furnizori • ${invoices.length} facturi`,
    formatLei(grandTotal),
    formatLei(grandDistributed),
    formatLei(grandRemaining),
    '',
  ];

  footerValues.forEach((val, idx) => {
    const cell = sheet.getCell(r, idx + 1);
    cell.value = val;
    if (idx >= 3 && idx <= 5) cell.numFmt = '#,##0.00';
    cell.alignment = { horizontal: HEADERS[idx].align, vertical: 'middle' };
    cell.font = { size: 11, bold: true, color: { argb: COLORS.primaryDark } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.primary } },
      bottom: { style: 'thin', color: { argb: COLORS.grayMid } },
      left: { style: 'thin', color: { argb: COLORS.grayMid } },
      right: { style: 'thin', color: { argb: COLORS.grayMid } },
    };
  });
  sheet.getRow(r).height = 24;
  r += 2;

  // ============ FOOTER SEMNĂTURI ============
  const slotWidth = Math.max(1, Math.floor(totalCols / 3));
  const slots = [
    { label: 'Administrator', name: association?.legalAdmin || '' },
    { label: 'Președinte', name: association?.president || '' },
    { label: 'Cenzor', name: association?.censor || '' },
  ];

  slots.forEach((slot, idx) => {
    const startCol = idx * slotWidth + 1;
    const endCol = idx === 2 ? totalCols : (idx + 1) * slotWidth;

    sheet.mergeCells(r, startCol, r, endCol);
    const labelCell = sheet.getCell(r, startCol);
    labelCell.value = slot.label;
    labelCell.font = { size: 11, bold: true, color: { argb: COLORS.grayDark } };
    labelCell.alignment = { horizontal: 'center' };

    sheet.mergeCells(r + 1, startCol, r + 1, endCol);
    const nameCell = sheet.getCell(r + 1, startCol);
    nameCell.value = slot.name;
    nameCell.font = { size: 10, color: { argb: COLORS.black } };
    nameCell.alignment = { horizontal: 'center' };

    sheet.mergeCells(r + 2, startCol, r + 2, endCol);
    const lineCell = sheet.getCell(r + 2, startCol);
    lineCell.border = { bottom: { style: 'thin', color: { argb: COLORS.grayMid } } };
  });

  sheet.getRow(r).height = 18;
  sheet.getRow(r + 1).height = 16;
  sheet.getRow(r + 2).height = 18;

  // ============ GRIDLINES OFF + FREEZE doar pe linie (sub header tabel) ============
  // Fără freeze pe coloane (xSplit = 0), doar ySplit ca să rămână header-ul vizibil la scroll
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIdx, showGridLines: false }];
  sheet.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 };
  sheet.pageSetup.printArea = `A1:${columnLetter(totalCols)}${r + 2}`;

  return workbook;
};

/**
 * Generează și descarcă direct fișierul Excel.
 */
export const downloadFurnizoriExcel = async (params) => {
  const workbook = await generateFurnizoriExcel(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Furnizori_${safeName}_${safeMonth}.xlsx`);
};
