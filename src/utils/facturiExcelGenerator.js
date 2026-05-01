import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generator Excel pentru pagina Facturi.
 *
 * Output: .xlsx cu un singur sheet "Facturi":
 * - Antet: nume asociație + CUI + adresă (cu Bloc/Scară) + IBAN | logo BlocApp dreapta
 * - Titlu: "LISTA FACTURI - [LUNA]" + subtitlu cu luna de consum
 * - Tabel ierarhic: rând factură + sub-rânduri per cheltuială distribuită (dacă > 1)
 * - Coloane: Nr | Nr. factură | Furnizor | Data | Cheltuieli | Total | Distribuit | Rămas | Distribuție | Plată
 * - Sortare: după ordinea cheltuielii primare → dată desc → nr factură
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
  if (address) {
    if (typeof address === 'string') {
      parts.push(address);
    } else if (address.street) {
      let streetPart = address.street;
      if (address.number) streetPart += ` nr. ${address.number}`;
      parts.push(streetPart);
    }
  }
  if (blocks && blocks.length > 0) {
    const blocNames = blocks
      .map(b => b.name || '')
      .filter(Boolean)
      .map(name => /^bloc\s+/i.test(name) ? name : `Bloc ${name}`);
    if (blocNames.length === 1) parts.push(blocNames[0]);
    else if (blocNames.length > 1) parts.push(`Blocuri ${blocNames.map(n => n.replace(/^bloc\s+/i, '')).join(', ')}`);
  }
  if (stairs && stairs.length > 0) {
    const stairNames = stairs
      .map(s => s.name || '')
      .filter(Boolean)
      .map(name => /^(scara|sc\.?)\s+/i.test(name) ? name : `Scara ${name}`);
    if (stairNames.length === 1) parts.push(stairNames[0]);
    else if (stairNames.length > 1) parts.push(`Scări ${stairNames.map(n => n.replace(/^(scara|sc\.?)\s+/i, '')).join(', ')}`);
  }
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

const DIST_STATUS_STYLE = {
  full: { label: 'Distribuită', fg: COLORS.green, bg: COLORS.greenLight },
  partial: { label: 'Parțial', fg: COLORS.amber, bg: COLORS.amberLight },
  none: { label: 'Nedistribuită', fg: COLORS.red, bg: COLORS.redLight },
};

const PAY_STATUS_STYLE = {
  paid: { label: 'Plătită', fg: COLORS.green, bg: COLORS.greenLight },
  unpaid: { label: 'Neplătită', fg: COLORS.yellow, bg: COLORS.yellowLight },
  overdue: { label: 'Scadentă', fg: COLORS.red, bg: COLORS.redLight },
};

const HEADERS = [
  { label: 'Nr.', width: 4, align: 'center' },
  { label: 'Nr. factură', width: 12, align: 'left' },
  { label: 'Furnizor', width: 22, align: 'left' },
  { label: 'Data', width: 11, align: 'center' },
  { label: 'Cheltuieli / Distribuție', width: 26, align: 'left' },
  { label: 'Total', width: 11, align: 'right' },
  { label: 'Distribuit', width: 11, align: 'right' },
  { label: 'Rămas', width: 10, align: 'right' },
  { label: 'Distribuție', width: 13, align: 'center' },
  { label: 'Plată', width: 10, align: 'center' },
];

const computeInvoiceStatus = (invoice) => {
  const total = parseFloat(invoice.totalInvoiceAmount || invoice.totalAmount) || 0;
  const distHistory = (invoice.distributionHistory || []).filter(d => d.amount > 0);
  const distributed = distHistory.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const remaining = total - distributed;
  const isFull = remaining <= 0.01 && distributed > 0;
  const distStatus = isFull ? 'full' : distributed > 0 ? 'partial' : 'none';

  let payStatus = 'unpaid';
  if (invoice.isPaid) payStatus = 'paid';
  else if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) payStatus = 'overdue';

  return { total, distributed, remaining, distStatus, payStatus, distHistory };
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
 * Sortează facturile după ordinea cheltuielii primare a furnizorului,
 * apoi după dată descrescător, apoi după Nr. factură.
 */
const sortInvoices = (invoices, expenseTypes, getSupplierExpenseNames) => {
  const expenseOrder = new Map();
  expenseTypes.forEach((exp, idx) => {
    expenseOrder.set(exp.name, idx);
  });

  const getOrderKey = (invoice) => {
    // Caută prima cheltuială asociată în distributionHistory; fallback la getSupplierExpenseNames
    const distNames = (invoice.distributionHistory || [])
      .filter(d => d.amount > 0)
      .map(d => d.expenseName)
      .filter(Boolean);
    let names = distNames;
    if (names.length === 0 && invoice.supplierId && getSupplierExpenseNames) {
      names = getSupplierExpenseNames(invoice.supplierId);
    }
    if (names.length === 0) return Number.MAX_SAFE_INTEGER;
    const indices = names.map(n => expenseOrder.get(n)).filter(i => i !== undefined);
    return indices.length > 0 ? Math.min(...indices) : Number.MAX_SAFE_INTEGER;
  };

  return [...invoices].sort((a, b) => {
    const ka = getOrderKey(a);
    const kb = getOrderKey(b);
    if (ka !== kb) return ka - kb;
    const da = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
    const db = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
    if (da !== db) return db - da;
    return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '', 'ro');
  });
};

/**
 * @param {object} options
 * @param {object} options.association
 * @param {string} options.monthYear
 * @param {string} options.consumptionMonth
 * @param {Date} options.publicationDate
 * @param {Array} options.invoices
 * @param {Array} options.expenseTypes
 * @param {Array} options.blocks
 * @param {Array} options.stairs
 * @param {Function} options.getSupplierExpenseNames
 */
export const generateFacturiExcel = async ({
  association,
  monthYear,
  consumptionMonth,
  publicationDate,
  invoices = [],
  expenseTypes = [],
  blocks = [],
  stairs = [],
  getSupplierExpenseNames,
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BlocApp';
  workbook.created = new Date();

  const logoId = await loadLogo(workbook);
  const totalCols = HEADERS.length;

  const sheet = workbook.addWorksheet('Facturi', {
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
    // oneCellAnchor + ext fix (140x47) — dimensiunea naturală păstrată.
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
  titleCell.value = `LISTA FACTURI - ${(monthYear || '').toUpperCase()}`;
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
  const sortedInvoices = sortInvoices(invoices, expenseTypes, getSupplierExpenseNames);

  let grandTotal = 0;
  let grandDistributed = 0;
  let grandRemaining = 0;

  sortedInvoices.forEach((invoice, idx) => {
    const { total, distributed, remaining, distStatus, payStatus, distHistory } = computeInvoiceStatus(invoice);
    const distStyle = DIST_STATUS_STYLE[distStatus];
    const payStyle = PAY_STATUS_STYLE[payStatus];
    const hasMultiple = distHistory.length > 1;

    grandTotal += total;
    grandDistributed += distributed;
    grandRemaining += remaining;

    // Pe rândul de factură:
    // - dacă o singură distribuție → numele cheltuielii pe col E
    // - dacă mai multe → col E rămâne goală, fiecare distribuție e pe rândul ei propriu dedesubt
    const firstDistText = !hasMultiple && distHistory.length === 1
      ? distHistory[0].expenseName
      : (distHistory.length === 0 ? '—' : '');

    const invRow = [
      idx + 1,
      invoice.invoiceNumber || '—',
      invoice.supplierName || '—',
      invoice.invoiceDate ? formatDateRo(invoice.invoiceDate) : '—',
      firstDistText,
      formatLei(total),
      formatLei(distributed),
      formatLei(remaining),
      distStyle.label,
      payStyle.label,
    ];

    invRow.forEach((val, i) => {
      const cell = sheet.getCell(r, i + 1);
      cell.value = val;
      const headerMeta = HEADERS[i];
      cell.alignment = { horizontal: headerMeta.align, vertical: 'middle', wrapText: i === 4 };

      if (i >= 5 && i <= 7) cell.numFmt = '#,##0.00';

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blueLight } };
      cell.font = {
        size: 10,
        bold: i === 1 || i === 2 || i === 5,
        color: { argb: i === 1 ? COLORS.primaryDark : COLORS.black },
      };

      if (i === 7 && remaining > 0.01) {
        cell.font = { size: 10, bold: true, color: { argb: COLORS.orange } };
      }

      // Status distribuție
      if (i === 8) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: distStyle.bg } };
        cell.font = { size: 9, bold: true, color: { argb: distStyle.fg } };
      }
      // Status plată
      if (i === 9) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: payStyle.bg } };
        cell.font = { size: 9, bold: true, color: { argb: payStyle.fg } };
      }

      setBorders(cell);
    });
    sheet.getRow(r).height = 22;
    r++;

    // ===== Sub-rânduri per cheltuială (doar dacă > 1) =====
    if (hasMultiple) {
      distHistory.forEach((d) => {
        const amount = parseFloat(d.amount) || 0;
        const distRow = [
          '', '', '', '',
          `      ${d.expenseName}`,
          '',
          formatLei(amount),
          '',
          '', '',
        ];
        distRow.forEach((val, i) => {
          const cell = sheet.getCell(r, i + 1);
          cell.value = val;
          cell.alignment = { horizontal: i === 4 ? 'left' : HEADERS[i].align, vertical: 'middle' };
          cell.font = { size: 9, italic: true, color: { argb: COLORS.gray } };
          if (i === 6 && typeof val === 'number') cell.numFmt = '#,##0.00';
          setBorders(cell);
        });
        sheet.getRow(r).height = 16;
        r++;
      });
    }
  });

  // ============ FOOTER TOTAL GENERAL ============
  const footerValues = [
    '',
    'TOTAL GENERAL',
    `${sortedInvoices.length} facturi`,
    '',
    '',
    formatLei(grandTotal),
    formatLei(grandDistributed),
    formatLei(grandRemaining),
    '',
    '',
  ];
  footerValues.forEach((val, i) => {
    const cell = sheet.getCell(r, i + 1);
    cell.value = val;
    if (i >= 5 && i <= 7) cell.numFmt = '#,##0.00';
    cell.alignment = { horizontal: HEADERS[i].align, vertical: 'middle' };
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

  // ============ FREEZE doar pe linie + GRIDLINES OFF ============
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIdx, showGridLines: false }];
  sheet.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 };
  sheet.pageSetup.printArea = `A1:${columnLetter(totalCols)}${r + 2}`;

  return workbook;
};

export const downloadFacturiExcel = async (params) => {
  const workbook = await generateFacturiExcel(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Facturi_${safeName}_${safeMonth}.xlsx`);
};
