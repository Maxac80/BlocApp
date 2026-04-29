import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generator Excel pentru Distributie Cheltuieli (tabel detaliat).
 *
 * Output: .xlsx cu structură similară PDF-ului:
 * - Antet: nume asociatie + CUI + adresa (Bloc/Scara) + IBAN | logo BlocApp dreapta
 * - Titlu: "LISTA DE PLATA A COTELOR DE INTRETINERE - [LUNA]" + data afisarii + scadenta
 * - Tabel: Ap | Proprietar | Pers | Intretinere | Restanta | Total | Penalitati | Total Datorat | cheltuieli + diferente
 * - Footer: Administrator | Presedinte | Cenzor (cu nume din association)
 *
 * Un sheet per scara.
 */

const COLORS = {
  primary: 'FF2563EB',
  primaryLight: 'FFDBEAFE',
  primaryDark: 'FF1E40AF',
  red: 'FFDC2626',
  amber: 'FFD97706',
  amberLight: 'FFFEF3C7',
  blueLight: 'FFEFF6FF',
  orangeLight: 'FFFFF7ED',
  gray: 'FF6B7280',
  grayLight: 'FFF3F4F6',
  grayMid: 'FFD1D5DB',
  grayDark: 'FF374151',
  black: 'FF111827',
  white: 'FFFFFFFF',
  indigo: 'FF4F46E5',
  orange: 'FFF97316',
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
  if (!address) return '';
  if (typeof address === 'string') return address;
  const parts = [];
  if (address.street) {
    let streetPart = address.street;
    if (address.number) streetPart += ` nr. ${address.number}`;
    parts.push(streetPart);
  }
  if (blocName) {
    const hasPrefix = /^bloc\s+/i.test(blocName);
    parts.push(hasPrefix ? blocName : `Bloc ${blocName}`);
  }
  if (stairName) {
    const hasPrefix = /^(scara|sc\.?)\s+/i.test(stairName);
    parts.push(hasPrefix ? stairName : `Scara ${stairName}`);
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

const buildColumnsConfig = (maintenanceData, expenses) => {
  const expenseColumns = expenses.map((expense) => {
    const expenseKey = expense.expenseTypeId || expense.id || expense.name;
    const hasDiff = maintenanceData.some((d) => d.expenseDifferenceDetails?.[expenseKey]);
    return { expense, expenseKey, hasDiff };
  });

  const headers = [
    { label: 'Ap.', width: 6 },
    { label: 'Proprietar', width: 18 },
    { label: 'Pers.', width: 6 },
    { label: 'Intretinere', width: 11 },
    { label: 'Restanta', width: 11 },
    { label: 'Total Intr.+Restanta', width: 14 },
    { label: 'Penalitati', width: 11 },
    { label: 'Total Datorat', width: 13 },
  ];
  expenseColumns.forEach(({ expense, hasDiff }) => {
    headers.push({ label: expense.name || '-', width: 11, expense: true });
    if (hasDiff) headers.push({ label: `${expense.name || '-'} - Dif.`, width: 11, diff: true });
  });

  return { headers, expenseColumns };
};

const renderStairSheet = (workbook, group, ctx) => {
  const { association, monthYear, consumptionMonth, publicationDate, dueDate, logoId, expenses } = ctx;
  const { headers, expenseColumns } = buildColumnsConfig(group.maintenanceData, expenses);
  const totalCols = headers.length;

  const sheetName = group.blocName || group.stairName
    ? `${group.blocName || ''}${group.stairName ? '-' + group.stairName : ''}`.replace(/[\\/?*[\]:]/g, '_').slice(0, 30)
    : 'Distributie';
  const sheet = workbook.addWorksheet(sheetName || 'Distributie', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    properties: { defaultRowHeight: 16 },
  });

  // Setăm lățimile coloanelor
  headers.forEach((h, idx) => {
    sheet.getColumn(idx + 1).width = h.width;
  });

  // ============ ANTET ============
  // Logo aliniat la dreapta, cu aspect natural păstrat (3:1, logo nativ 963x323)
  if (logoId !== null && logoId !== undefined) {
    // One-cell anchor cu ext fix → ExcelJS păstrează dimensiunile, fără stretching
    // tl pornește în col U cu colOff ~24px → logo width 140 ajunge la marginea dreaptă a col V
    // tl rowOff 38100 EMU (~4px) → mic offset în jos față de marginea sus
    sheet.addImage(logoId, {
      tl: { col: totalCols - 2, row: 0, nativeColOff: 228600, nativeRowOff: 38100 },
      ext: { width: 140, height: 47 },
      editAs: 'oneCell',
    });
    sheet.getRow(1).height = 26;
    sheet.getRow(2).height = 24;
    // www.blocapp.ro cu hyperlink, aliniat la dreapta sub logo
    const wwwCell = sheet.getCell(3, totalCols);
    wwwCell.value = { text: 'www.blocapp.ro', hyperlink: 'https://blocapp.ro' };
    wwwCell.font = { size: 9, color: { argb: COLORS.primary }, underline: 'single' };
    wwwCell.alignment = { horizontal: 'right' };
  }

  // Numele asociației
  sheet.mergeCells(1, 1, 1, Math.max(1, totalCols - 3));
  const nameCell = sheet.getCell(1, 1);
  nameCell.value = (association?.name || 'ASOCIATIA DE PROPRIETARI').toUpperCase();
  nameCell.font = { size: 14, bold: true, color: { argb: COLORS.black } };
  nameCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // CUI
  let r = 2;
  if (association?.cui) {
    sheet.mergeCells(r, 1, r, totalCols - 3);
    const c = sheet.getCell(r, 1);
    c.value = `CUI: ${association.cui}`;
    c.font = { size: 9, color: { argb: COLORS.gray } };
    r++;
  }
  // Adresa cu Bloc/Scara
  const addr = composeAddressForStair(association?.address, group.blocName, group.stairName);
  if (addr) {
    sheet.mergeCells(r, 1, r, totalCols - 3);
    const c = sheet.getCell(r, 1);
    c.value = addr;
    c.font = { size: 9, color: { argb: COLORS.gray } };
    r++;
  }
  // IBAN
  const bankLine = composeBankAccount(association);
  if (bankLine) {
    sheet.mergeCells(r, 1, r, totalCols - 3);
    const c = sheet.getCell(r, 1);
    c.value = bankLine;
    c.font = { size: 9, color: { argb: COLORS.gray } };
    r++;
  }

  // Linie separator (border bottom pe rândul curent)
  for (let col = 1; col <= totalCols; col++) {
    sheet.getCell(r, col).border = { bottom: { style: 'thin', color: { argb: COLORS.grayMid } } };
  }
  sheet.getRow(r).height = 4;
  r++;

  // ============ TITLU + DATE ============
  // Titlu stânga
  sheet.mergeCells(r, 1, r, Math.max(1, totalCols - 4));
  const titleCell = sheet.getCell(r, 1);
  titleCell.value = `LISTA DE PLATA A COTELOR DE INTRETINERE - ${(monthYear || '').toUpperCase()}`;
  titleCell.font = { size: 13, bold: true, color: { argb: COLORS.primaryDark } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(r).height = 22;

  // Data afișării (dreapta) - merge ÎNAINTE de set value, value pe topleft
  if (publicationDate) {
    sheet.mergeCells(r, totalCols - 3, r, totalCols);
    const dateCell = sheet.getCell(r, totalCols - 3);
    dateCell.value = `Data afisarii: ${formatDateRo(publicationDate)}`;
    dateCell.font = { size: 9, color: { argb: COLORS.grayDark } };
    dateCell.alignment = { horizontal: 'right' };
  }
  r++;

  // Subtitlu consum + scadență
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
    c.value = `Scadenta: ${formatDateRo(dueDate)}`;
    c.font = { size: 10, bold: true, color: { argb: COLORS.red } };
    c.alignment = { horizontal: 'right' };
  }
  r += 2;

  // ============ HEADER TABEL ============
  const headerRowIdx = r;
  headers.forEach((h, idx) => {
    const cell = sheet.getCell(r, idx + 1);
    cell.value = h.label;
    cell.font = { size: 9, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.grayMid } },
      bottom: { style: 'thin', color: { argb: COLORS.grayMid } },
      left: { style: 'thin', color: { argb: COLORS.grayMid } },
      right: { style: 'thin', color: { argb: COLORS.grayMid } },
    };
  });
  sheet.getRow(r).height = 32;
  r++;

  // ============ BODY ============
  const sums = { persons: 0, intretinere: 0, restante: 0, total: 0, penalitati: 0, totalDatorat: 0, expenses: [], differences: [] };

  group.maintenanceData.forEach((d) => {
    const persons = Number(d.persons) || 0;
    const intretinere = Number(d.currentMaintenance) || 0;
    const restante = Number(d.restante) || 0;
    const total = Number(d.totalMaintenance) || 0;
    const penalitati = Number(d.penalitati) || 0;
    const totalDatorat = Number(d.totalDatorat) || 0;

    sums.persons += persons;
    sums.intretinere += intretinere;
    sums.restante += restante;
    sums.total += total;
    sums.penalitati += penalitati;
    sums.totalDatorat += totalDatorat;

    // Apartament: număr pur (1, 2, 3...) → stocat ca Number ca să nu apară warning "Number stored as text"
    // Alfanumeric (ex. 1A, B12) → text natural (warning nu apare oricum)
    const apartmentRaw = String(d.apartment ?? '').trim();
    const apartmentValue = /^\d+$/.test(apartmentRaw) ? parseInt(apartmentRaw, 10) : (apartmentRaw || '-');

    const rowValues = [
      apartmentValue,
      d.owner || '-',
      persons,
      formatLei(intretinere),
      formatLei(restante),
      formatLei(total),
      formatLei(penalitati),
      formatLei(totalDatorat),
    ];

    expenseColumns.forEach(({ expenseKey, hasDiff }, idx) => {
      const detail = d.expenseDetails?.[expenseKey];
      const amount = typeof detail === 'object' ? detail?.amount : detail;
      const numericAmount = Number(amount) || 0;
      sums.expenses[idx] = (sums.expenses[idx] || 0) + numericAmount;
      rowValues.push(formatLei(numericAmount));
      if (hasDiff) {
        const diff = Number(d.expenseDifferenceDetails?.[expenseKey]) || 0;
        sums.differences[idx] = (sums.differences[idx] || 0) + diff;
        rowValues.push(formatLei(diff));
      }
    });

    rowValues.forEach((val, idx) => {
      const cell = sheet.getCell(r, idx + 1);
      cell.value = val;

      // Format numbers
      if (idx === 0 && typeof val === 'number') {
        cell.numFmt = '0';
      } else if (idx >= 2 && typeof val === 'number') {
        cell.numFmt = idx === 2 ? '0' : '#,##0.00';
      }

      // Aliniere
      cell.alignment = idx === 0 ? { horizontal: 'center', vertical: 'middle' }
        : idx === 1 ? { horizontal: 'left', vertical: 'middle' }
        : { horizontal: 'right', vertical: 'middle' };

      // Borduri
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.grayMid } },
        bottom: { style: 'thin', color: { argb: COLORS.grayMid } },
        left: { style: 'thin', color: { argb: COLORS.grayMid } },
        right: { style: 'thin', color: { argb: COLORS.grayMid } },
      };

      // Culori specifice pe coloane
      if (idx === 0) cell.font = { size: 10, bold: true };
      else if (idx === 1) cell.font = { size: 10 };
      else if (idx === 3) cell.font = { size: 10, bold: true, color: { argb: COLORS.indigo } };
      else if (idx === 4) cell.font = { size: 10, bold: true, color: { argb: COLORS.red } };
      else if (idx === 5) cell.font = { size: 10, bold: true };
      else if (idx === 6) cell.font = { size: 10, bold: true, color: { argb: COLORS.orange } };
      else if (idx === 7) {
        cell.font = { size: 11, bold: true, color: { argb: COLORS.black } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amberLight } };
      } else {
        // Coloane cheltuieli/diferențe
        const colMeta = headers[idx];
        if (colMeta?.expense) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blueLight } };
        else if (colMeta?.diff) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orangeLight } };
        cell.font = { size: 10, bold: true };
      }
    });
    r++;
  });

  // ============ FOOTER TABEL (TOTAL) ============
  const footRowIdx = r;
  const footValues = [
    '',
    'TOTAL',
    sums.persons,
    formatLei(sums.intretinere),
    formatLei(sums.restante),
    formatLei(sums.total),
    formatLei(sums.penalitati),
    formatLei(sums.totalDatorat),
  ];
  expenseColumns.forEach(({ hasDiff }, idx) => {
    footValues.push(formatLei(sums.expenses[idx] || 0));
    if (hasDiff) footValues.push(formatLei(sums.differences[idx] || 0));
  });

  footValues.forEach((val, idx) => {
    const cell = sheet.getCell(r, idx + 1);
    cell.value = val;
    if (idx >= 2 && typeof val === 'number') {
      cell.numFmt = idx === 2 ? '0' : '#,##0.00';
    }
    cell.alignment = idx === 1 ? { horizontal: 'left', vertical: 'middle' } : { horizontal: 'right', vertical: 'middle' };
    cell.font = { size: 10, bold: true, color: { argb: COLORS.primaryDark } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.primary } },
      bottom: { style: 'thin', color: { argb: COLORS.grayMid } },
      left: { style: 'thin', color: { argb: COLORS.grayMid } },
      right: { style: 'thin', color: { argb: COLORS.grayMid } },
    };
  });
  sheet.getRow(r).height = 22;
  r += 2;

  // ============ FOOTER SEMNĂTURI ============
  // 3 sloturi: Administrator | Presedinte | Cenzor
  const slotWidth = Math.floor(totalCols / 3);
  const slots = [
    { label: 'Administrator', name: association?.legalAdmin || '' },
    { label: 'Presedinte', name: association?.president || '' },
    { label: 'Cenzor', name: association?.censor || '' },
  ];

  slots.forEach((slot, idx) => {
    const startCol = idx * slotWidth + 1;
    const endCol = idx === 2 ? totalCols : (idx + 1) * slotWidth;

    // Label
    sheet.mergeCells(r, startCol, r, endCol);
    const labelCell = sheet.getCell(r, startCol);
    labelCell.value = slot.label;
    labelCell.font = { size: 11, bold: true, color: { argb: COLORS.grayDark } };
    labelCell.alignment = { horizontal: 'center' };

    // Nume
    sheet.mergeCells(r + 1, startCol, r + 1, endCol);
    const nameCell = sheet.getCell(r + 1, startCol);
    nameCell.value = slot.name;
    nameCell.font = { size: 10, color: { argb: COLORS.black } };
    nameCell.alignment = { horizontal: 'center' };

    // Linie de semnătură
    sheet.mergeCells(r + 2, startCol, r + 2, endCol);
    const lineCell = sheet.getCell(r + 2, startCol);
    lineCell.border = { bottom: { style: 'thin', color: { argb: COLORS.grayMid } } };
  });

  sheet.getRow(r).height = 18;
  sheet.getRow(r + 1).height = 16;
  sheet.getRow(r + 2).height = 18;

  // Freeze pane: header + 1 row + gridlines off
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: headerRowIdx, showGridLines: false }];

  // Print options
  sheet.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 };
  sheet.pageSetup.printArea = `A1:${columnLetter(totalCols)}${r + 2}`;
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
 * @param {Array} options.groups - [{ blocName, stairName, maintenanceData }, ...]
 * @param {Array} options.expenses
 * @param {object} options.association
 * @param {string} options.monthYear
 * @param {string} options.consumptionMonth
 * @param {Date} options.publicationDate
 * @param {Date} options.dueDate
 */
export const generateDistributieExcel = async ({ groups = [], expenses = [], association, monthYear, consumptionMonth, publicationDate, dueDate }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BlocApp';
  workbook.created = new Date();

  const logoId = await loadLogo(workbook);

  const validGroups = groups.filter((g) => g.maintenanceData?.length > 0);
  if (validGroups.length === 0) {
    // Sheet placeholder
    workbook.addWorksheet('Distributie').getCell('A1').value = 'Nu există date de afișat';
    return workbook;
  }

  validGroups.forEach((group) => {
    renderStairSheet(workbook, group, {
      association, monthYear, consumptionMonth, publicationDate, dueDate, logoId, expenses
    });
  });

  return workbook;
};

/**
 * Generează și descarcă direct fișierul Excel.
 */
export const downloadDistributieExcel = async (params) => {
  const workbook = await generateDistributieExcel(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Cote_intretinere_${safeName}_${safeMonth}.xlsx`);
};
