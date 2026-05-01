import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generator Excel pentru pagina Întreținere (tabelul lunar simplificat).
 *
 * Output: .xlsx cu un sheet per scară (sau un singur sheet "Întreținere" dacă o scară):
 * - Antet: nume asociație + CUI + adresă (cu Bloc/Scară) + IBAN | logo BlocApp dreapta
 * - Titlu: "LISTA DE PLATĂ A COTELOR DE ÎNTREȚINERE - [LUNA]" + data afișării + scadență
 * - Tabel: Nr | Ap | Proprietar | Persoane | Întreținere | Restanță | Total | Penalități | Total Datorat | Status
 * - Footer: Administrator | Președinte | Cenzor + total general
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
  indigo: 'FF4F46E5',
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

const composeAddressForStair = (address, blocName, stairName) => {
  if (!address && !blocName && !stairName) return '';
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
  if (blocName) {
    const hasPrefix = /^bloc\s+/i.test(blocName);
    parts.push(hasPrefix ? blocName : `Bloc ${blocName}`);
  }
  if (stairName) {
    const hasPrefix = /^(scara|sc\.?)\s+/i.test(stairName);
    parts.push(hasPrefix ? stairName : `Scara ${stairName}`);
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
  { label: 'Nr.', width: 5, align: 'center' },
  { label: 'Ap.', width: 6, align: 'center' },
  { label: 'Proprietar', width: 24, align: 'left' },
  { label: 'Pers.', width: 7, align: 'center' },
  { label: 'Întreținere', width: 12, align: 'right' },
  { label: 'Restanță', width: 11, align: 'right' },
  { label: 'Total Înt.+Rest.', width: 14, align: 'right' },
  { label: 'Penalități', width: 11, align: 'right' },
  { label: 'Total Datorat', width: 14, align: 'right' },
  { label: 'Status', width: 12, align: 'center' },
];

const PAY_STATUS_STYLE = {
  paid: { label: 'Plătit', fg: COLORS.green, bg: COLORS.greenLight },
  partial: { label: 'Parțial', fg: COLORS.amber, bg: COLORS.amberLight },
  unpaid: { label: 'Neplătit', fg: COLORS.red, bg: COLORS.redLight },
  zero: { label: '—', fg: COLORS.gray, bg: COLORS.grayLight },
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

const renderStairSheet = (workbook, group, ctx) => {
  const { association, monthYear, consumptionMonth, publicationDate, dueDate, logoId } = ctx;
  const totalCols = HEADERS.length;

  const sheetName = group.blocName || group.stairName
    ? `${group.blocName || ''}${group.stairName ? '-' + group.stairName : ''}`.replace(/[\\/?*[\]:]/g, '_').slice(0, 30)
    : 'Intretinere';
  const sheet = workbook.addWorksheet(sheetName || 'Intretinere', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
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
  const addr = composeAddressForStair(association?.address, group.blocName, group.stairName);
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

  // ============ TITLU + DATA + SCADENȚĂ ============
  sheet.mergeCells(r, 1, r, Math.max(1, totalCols - 4));
  const titleCell = sheet.getCell(r, 1);
  titleCell.value = `LISTA DE PLATĂ A COTELOR DE ÎNTREȚINERE - ${(monthYear || '').toUpperCase()}`;
  titleCell.font = { size: 13, bold: true, color: { argb: COLORS.primaryDark } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(r).height = 22;

  if (publicationDate) {
    sheet.mergeCells(r, totalCols - 3, r, totalCols);
    const dateCell = sheet.getCell(r, totalCols - 3);
    dateCell.value = `Data afișării: ${formatDateRo(publicationDate)}`;
    dateCell.font = { size: 9, color: { argb: COLORS.grayDark } };
    dateCell.alignment = { horizontal: 'right' };
  }
  r++;

  if (consumptionMonth) {
    sheet.mergeCells(r, 1, r, Math.max(1, totalCols - 4));
    const c = sheet.getCell(r, 1);
    c.value = `(consum luna ${consumptionMonth})`;
    c.font = { size: 9, italic: true, color: { argb: COLORS.gray } };
    c.alignment = { horizontal: 'left' };
  }
  if (dueDate) {
    sheet.mergeCells(r, totalCols - 3, r, totalCols);
    const c = sheet.getCell(r, totalCols - 3);
    c.value = `Scadență: ${formatDateRo(dueDate)}`;
    c.font = { size: 10, bold: true, color: { argb: COLORS.red } };
    c.alignment = { horizontal: 'right' };
  }
  r += 2;

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
  const sums = { persons: 0, intretinere: 0, restante: 0, total: 0, penalitati: 0, totalDatorat: 0 };

  group.maintenanceData.forEach((d, idx) => {
    const persons = Number(d.persons) || 0;
    const intretinere = Number(d.currentMaintenance) || 0;
    const restante = Number(d.restante) || 0;
    const total = Number(d.totalMaintenance) || (intretinere + restante);
    const penalitati = Number(d.penalitati) || 0;
    const totalDatorat = Number(d.totalDatorat) || (total + penalitati);

    sums.persons += persons;
    sums.intretinere += intretinere;
    sums.restante += restante;
    sums.total += total;
    sums.penalitati += penalitati;
    sums.totalDatorat += totalDatorat;

    // Status plată
    const paid = Number(d.paid || 0);
    let payKey = 'unpaid';
    if (totalDatorat <= 0.01) payKey = 'zero';
    else if (paid >= totalDatorat - 0.01 && paid > 0) payKey = 'paid';
    else if (paid > 0) payKey = 'partial';
    const payStyle = PAY_STATUS_STYLE[payKey];

    const apartmentRaw = String(d.apartment ?? '').trim();
    const apartmentValue = /^\d+$/.test(apartmentRaw) ? parseInt(apartmentRaw, 10) : (apartmentRaw || '-');

    const row = [
      idx + 1,
      apartmentValue,
      d.owner || '—',
      persons,
      formatLei(intretinere),
      formatLei(restante),
      formatLei(total),
      formatLei(penalitati),
      formatLei(totalDatorat),
      payStyle.label,
    ];

    row.forEach((val, i) => {
      const cell = sheet.getCell(r, i + 1);
      cell.value = val;
      cell.alignment = { horizontal: HEADERS[i].align, vertical: 'middle' };

      if (i === 0 || i === 1 || i === 3) cell.numFmt = '0';
      if (i >= 4 && i <= 8) cell.numFmt = '#,##0.00';

      cell.font = { size: 10, bold: i === 1 || i === 8, color: { argb: COLORS.black } };

      if (i === 4) cell.font = { size: 10, bold: false, color: { argb: COLORS.indigo } };
      if (i === 5) cell.font = { size: 10, bold: true, color: { argb: COLORS.red } };
      if (i === 7) cell.font = { size: 10, bold: true, color: { argb: COLORS.orange } };
      if (i === 8) {
        cell.font = { size: 11, bold: true, color: { argb: COLORS.black } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amberLight } };
      }
      if (i === 9) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: payStyle.bg } };
        cell.font = { size: 9, bold: true, color: { argb: payStyle.fg } };
      }

      setBorders(cell);
    });
    sheet.getRow(r).height = 20;
    r++;
  });

  // ============ FOOTER TOTAL ============
  const footerValues = [
    '',
    'TOTAL',
    `${group.maintenanceData.length} apt.`,
    sums.persons,
    formatLei(sums.intretinere),
    formatLei(sums.restante),
    formatLei(sums.total),
    formatLei(sums.penalitati),
    formatLei(sums.totalDatorat),
    '',
  ];
  footerValues.forEach((val, i) => {
    const cell = sheet.getCell(r, i + 1);
    cell.value = val;
    if (i === 3) cell.numFmt = '0';
    if (i >= 4 && i <= 8) cell.numFmt = '#,##0.00';
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
};

/**
 * @param {object} options
 * @param {Array} options.groups - [{ blocName, stairName, maintenanceData }, ...]
 * @param {object} options.association
 * @param {string} options.monthYear
 * @param {string} options.consumptionMonth
 * @param {Date} options.publicationDate
 * @param {Date} options.dueDate
 */
export const generateIntretinereExcel = async ({ groups = [], association, monthYear, consumptionMonth, publicationDate, dueDate }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BlocApp';
  workbook.created = new Date();

  const logoId = await loadLogo(workbook);

  const validGroups = groups.filter(g => g.maintenanceData?.length > 0);
  if (validGroups.length === 0) {
    workbook.addWorksheet('Intretinere').getCell('A1').value = 'Nu există date de afișat';
    return workbook;
  }

  validGroups.forEach((group) => {
    renderStairSheet(workbook, group, {
      association, monthYear, consumptionMonth, publicationDate, dueDate, logoId,
    });
  });

  return workbook;
};

export const downloadIntretinereExcel = async (params) => {
  const workbook = await generateIntretinereExcel(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Intretinere_${safeName}_${safeMonth}.xlsx`);
};
