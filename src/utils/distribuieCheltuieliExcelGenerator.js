import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generator Excel pentru pagina Distribuție cheltuieli (lista cheltuielilor distribuite).
 *
 * Output: .xlsx cu un singur sheet "Distribuție":
 * - Antet: nume asociație + CUI + adresă (cu Bloc/Scară) + IBAN | logo BlocApp dreapta
 * - Titlu: "DISTRIBUȚIE CHELTUIELI - [LUNA]"
 * - Tabel: Nr | Cheltuială | Mod distribuție | Furnizori | Facturi | Total facturi | Distribuit | Diferență | Status
 * - Sub-rânduri: facturi cu sumele lor distribuite pe această cheltuială
 * - Sortare: ordinea defaultExpenseTypes
 * - Footer: Administrator | Președinte | Cenzor + total general
 *
 * Diferența față de Cheltuieli (config):
 * - Aici listează DOAR cheltuielile distribuite (associationExpenses cu sumă > 0)
 * - Calculează diferența distribuită (pentru cheltuielile pe consum)
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

const HEADERS = [
  { label: 'Nr.', width: 4, align: 'center' },
  { label: 'Cheltuială', width: 22, align: 'left' },
  { label: 'Mod distribuție', width: 20, align: 'left' },
  { label: 'Furnizori', width: 20, align: 'left' },
  { label: 'Facturi', width: 9, align: 'center' },
  { label: 'Total facturi', width: 12, align: 'right' },
  { label: 'Distribuit', width: 11, align: 'right' },
  { label: 'Diferență', width: 11, align: 'right' },
  { label: 'Status', width: 14, align: 'center' },
];

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

const formatDistributionType = (config, allConfigs = {}) => {
  const t = config?.distributionType;
  if (t === 'apartment') return 'Pe apartament';
  if (t === 'individual') return 'Sume individuale';
  if (t === 'person') return 'Pe persoană';
  if (t === 'cotaParte') return 'Pe cotă parte';
  if (t === 'consumption_cumulative') {
    const srcIds = config.cumulativeFromExpenseTypeIds || [];
    const srcNames = srcIds.map(id => allConfigs[id]?.name).filter(Boolean).join(' + ');
    return srcNames ? `Pe consum cumulat (${srcNames})` : 'Pe consum cumulat';
  }
  return 'Pe consum';
};

/**
 * @param {object} options
 * @param {object} options.association
 * @param {string} options.monthYear
 * @param {string} options.consumptionMonth
 * @param {Date} options.publicationDate
 * @param {Array} options.distributedExpenses - lista cheltuielilor distribuite (associationExpenses)
 * @param {Function} options.getExpenseConfig
 * @param {Array} options.invoices
 * @param {object} options.activeSheet
 * @param {Array} options.blocks
 * @param {Array} options.stairs
 */
export const generateDistribuieCheltuieliExcel = async ({
  association,
  monthYear,
  consumptionMonth,
  publicationDate,
  distributedExpenses = [],
  getExpenseConfig,
  invoices = [],
  activeSheet,
  blocks = [],
  stairs = [],
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BlocApp';
  workbook.created = new Date();

  const logoId = await loadLogo(workbook);
  const totalCols = HEADERS.length;
  const allConfigs = activeSheet?.configSnapshot?.expenseConfigurations || {};

  const sheet = workbook.addWorksheet('Distribuție', {
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

  for (let col = 1; col <= totalCols; col++) {
    sheet.getCell(r, col).border = { bottom: { style: 'thin', color: { argb: COLORS.grayMid } } };
  }
  sheet.getRow(r).height = 4;
  r++;

  // ============ TITLU ============
  sheet.mergeCells(r, 1, r, Math.max(1, totalCols - 2));
  const titleCell = sheet.getCell(r, 1);
  titleCell.value = `DISTRIBUȚIE CHELTUIELI - ${(monthYear || '').toUpperCase()}`;
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
  let grandTotalFacturi = 0;
  let grandDistribuit = 0;
  let grandDiferenta = 0;

  distributedExpenses.forEach((expense, idx) => {
    const expenseTypeId = expense.expenseTypeId || expense.id;
    const config = (getExpenseConfig && getExpenseConfig(expenseTypeId || expense.name)) || expense;
    const distributionText = formatDistributionType(config, allConfigs);

    const allSuppliers = config.suppliers?.length > 0
      ? config.suppliers.map(s => s.supplierName).filter(Boolean)
      : (config.supplierName ? [config.supplierName] : []);

    const linkedSupplierIds = new Set([
      ...(config.suppliers || []).map(s => s.supplierId).filter(Boolean),
      ...(config.supplierId ? [config.supplierId] : []),
    ]);

    const expenseInvoices = invoices.filter(inv =>
      inv.expenseTypeId === expenseTypeId ||
      inv.distributionHistory?.some(d => d.expenseName === expense.name) ||
      (inv.supplierId && linkedSupplierIds.has(inv.supplierId))
    );

    // Total facturi asociate cheltuielii
    const totalFacturi = expenseInvoices.reduce(
      (s, inv) => s + (parseFloat(inv.totalInvoiceAmount || inv.totalAmount) || 0),
      0
    );

    // Suma distribuită pe ACEASTĂ cheltuială (din distributionHistory)
    const distribuit = expenseInvoices.reduce((s, inv) => {
      const onThisExp = (inv.distributionHistory || [])
        .filter(d => d.expenseName === expense.name && d.amount > 0)
        .reduce((ss, d) => ss + (parseFloat(d.amount) || 0), 0);
      return s + onThisExp;
    }, 0);

    // Diferență (introdus în calculul întreținerii vs distribuit din facturi)
    // Pentru cheltuielile pe consum, expense.billAmount = total ce s-a introdus
    // Pentru fixă, expense.amount
    const isConsumption = expense.distributionType === 'consumption' ||
                          expense.distributionType === 'consumption_cumulative' ||
                          expense.isUnitBased;
    const sumaIntrodusa = isConsumption
      ? parseFloat(expense.billAmount) || 0
      : parseFloat(expense.amount) || 0;
    const diferenta = sumaIntrodusa - distribuit;

    grandTotalFacturi += totalFacturi;
    grandDistribuit += distribuit;
    grandDiferenta += diferenta;

    // Status
    let statusKey = 'full';
    if (Math.abs(diferenta) > 0.01) statusKey = diferenta > 0 ? 'partial' : 'partial';
    if (distribuit === 0) statusKey = 'none';
    const statusStyles = {
      full: { label: 'OK', fg: COLORS.green, bg: COLORS.greenLight },
      partial: { label: 'Diferență', fg: COLORS.amber, bg: COLORS.amberLight },
      none: { label: 'Nedistribuit', fg: COLORS.red, bg: COLORS.redLight },
    };
    const statusStyle = statusStyles[statusKey];

    const expenseRow = [
      idx + 1,
      expense.name || '—',
      distributionText,
      allSuppliers.length > 0 ? allSuppliers.join(', ') : '—',
      expenseInvoices.length,
      formatLei(totalFacturi),
      formatLei(distribuit),
      formatLei(diferenta),
      statusStyle.label,
    ];

    expenseRow.forEach((val, i) => {
      const cell = sheet.getCell(r, i + 1);
      cell.value = val;
      cell.alignment = { horizontal: HEADERS[i].align, vertical: 'middle', wrapText: i === 1 || i === 2 || i === 3 };
      if (i >= 5 && i <= 7) cell.numFmt = '#,##0.00';

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
      cell.font = {
        size: 10,
        bold: true,
        color: { argb: i === 1 ? COLORS.primaryDark : COLORS.black },
      };

      // Diferență colorată
      if (i === 7) {
        if (Math.abs(val) > 0.01) {
          cell.font = { size: 10, bold: true, color: { argb: val > 0 ? COLORS.amber : COLORS.red } };
        }
      }

      // Status
      if (i === 8) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusStyle.bg } };
        cell.font = { size: 9, bold: true, color: { argb: statusStyle.fg } };
      }

      setBorders(cell);
    });
    sheet.getRow(r).height = 22;
    r++;

    // ===== Sub-rânduri facturi =====
    expenseInvoices.forEach((inv) => {
      const distOnThisExpense = (inv.distributionHistory || [])
        .filter(d => d.expenseName === expense.name && d.amount > 0)
        .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

      const invRow = [
        '',
        `   └ Nr. ${inv.invoiceNumber || '—'}`,
        inv.invoiceDate ? formatDateRo(inv.invoiceDate) : '',
        inv.supplierName || '—',
        '',
        formatLei(parseFloat(inv.totalInvoiceAmount || inv.totalAmount) || 0),
        formatLei(distOnThisExpense),
        '',
        '',
      ];
      invRow.forEach((val, i) => {
        const cell = sheet.getCell(r, i + 1);
        cell.value = val;
        cell.alignment = { horizontal: HEADERS[i].align, vertical: 'middle' };
        if ((i === 5 || i === 6) && typeof val === 'number') cell.numFmt = '#,##0.00';
        cell.font = { size: 9, italic: true, color: { argb: COLORS.gray } };
        setBorders(cell);
      });
      sheet.getRow(r).height = 16;
      r++;
    });
  });

  // ============ FOOTER TOTAL ============
  const footerValues = [
    '',
    'TOTAL GENERAL',
    `${distributedExpenses.length} cheltuieli distribuite`,
    '',
    invoices.length,
    formatLei(grandTotalFacturi),
    formatLei(grandDistribuit),
    formatLei(grandDiferenta),
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

  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIdx, showGridLines: false }];
  sheet.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 };
  sheet.pageSetup.printArea = `A1:${columnLetter(totalCols)}${r + 2}`;

  return workbook;
};

export const downloadDistribuieCheltuieliExcel = async (params) => {
  const workbook = await generateDistribuieCheltuieliExcel(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Distributie_${safeName}_${safeMonth}.xlsx`);
};
