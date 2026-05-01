import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generator Excel pentru pagina Apartamente.
 *
 * Output: .xlsx cu un singur sheet "Apartamente":
 * - Antet: nume asociație + CUI + adresă (cu Bloc/Scară) + IBAN | logo BlocApp dreapta
 * - Titlu: "STRUCTURĂ APARTAMENTE - [LUNA]"
 * - Tabel: Nr | Bloc | Scară | Ap | Proprietar | Persoane | Tip | Suprafață | Sursă încălzire | Cotă parte
 * - Sortare: bloc → scară → număr apartament
 * - Footer: Administrator | Președinte | Cenzor + totaluri
 */

const COLORS = {
  primary: 'FF2563EB',
  primaryLight: 'FFDBEAFE',
  primaryDark: 'FF1E40AF',
  blueLight: 'FFEFF6FF',
  green: 'FF059669',
  greenLight: 'FFD1FAE5',
  orange: 'FFF97316',
  orangeLight: 'FFFFEDD5',
  gray: 'FF6B7280',
  grayLight: 'FFF3F4F6',
  grayMid: 'FFD1D5DB',
  grayDark: 'FF374151',
  black: 'FF111827',
  white: 'FFFFFFFF',
};

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
  { label: 'Nr.', width: 5, align: 'center' },
  { label: 'Bloc', width: 14, align: 'center' },
  { label: 'Scară', width: 14, align: 'center' },
  { label: 'Ap.', width: 6, align: 'center' },
  { label: 'Proprietar', width: 24, align: 'left' },
  { label: 'Persoane', width: 9, align: 'center' },
  { label: 'Tip', width: 16, align: 'left' },
  { label: 'Suprafață (mp)', width: 12, align: 'right' },
  { label: 'Sursă încălzire', width: 18, align: 'left' },
  { label: 'Cotă parte', width: 11, align: 'right' },
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

const sortApartments = (apartments, blocks, stairs) => {
  const blockOrder = new Map();
  blocks.forEach((b, i) => blockOrder.set(b.id, i));
  const stairOrder = new Map();
  stairs.forEach((s, i) => stairOrder.set(s.id, i));

  return [...apartments].sort((a, b) => {
    const stairA = stairs.find(s => s.id === a.stairId);
    const stairB = stairs.find(s => s.id === b.stairId);
    const blocA = stairA?.blockId || a.blocId;
    const blocB = stairB?.blockId || b.blocId;

    const blocIdxA = blockOrder.get(blocA) ?? Number.MAX_SAFE_INTEGER;
    const blocIdxB = blockOrder.get(blocB) ?? Number.MAX_SAFE_INTEGER;
    if (blocIdxA !== blocIdxB) return blocIdxA - blocIdxB;

    const stairIdxA = stairOrder.get(a.stairId) ?? Number.MAX_SAFE_INTEGER;
    const stairIdxB = stairOrder.get(b.stairId) ?? Number.MAX_SAFE_INTEGER;
    if (stairIdxA !== stairIdxB) return stairIdxA - stairIdxB;

    const numA = parseInt(a.number, 10);
    const numB = parseInt(b.number, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a.number).localeCompare(String(b.number), 'ro', { numeric: true });
  });
};

/**
 * @param {object} options
 * @param {object} options.association
 * @param {string} options.monthYear
 * @param {string} options.consumptionMonth
 * @param {Date} options.publicationDate
 * @param {Array} options.apartments
 * @param {Array} options.blocks
 * @param {Array} options.stairs
 */
export const generateApartamenteExcel = async ({
  association,
  monthYear,
  consumptionMonth,
  publicationDate,
  apartments = [],
  blocks = [],
  stairs = [],
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BlocApp';
  workbook.created = new Date();

  const logoId = await loadLogo(workbook);
  const totalCols = HEADERS.length;

  const sheet = workbook.addWorksheet('Apartamente', {
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
  titleCell.value = `STRUCTURĂ APARTAMENTE${monthYear ? ` - ${monthYear.toUpperCase()}` : ''}`;
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
  const sortedApts = sortApartments(apartments, blocks, stairs);
  let totalPersons = 0;
  let totalSurface = 0;
  let totalCota = 0;
  let countWithSurface = 0;

  sortedApts.forEach((apt, idx) => {
    const stair = stairs.find(s => s.id === apt.stairId);
    const bloc = blocks.find(b => b.id === (stair?.blockId || apt.blocId));
    const persons = Number(apt.persons) || 0;
    const surface = parseFloat(apt.surface);
    const cota = parseFloat(apt.cotaParte);

    totalPersons += persons;
    if (!isNaN(surface)) {
      totalSurface += surface;
      countWithSurface++;
    }
    if (!isNaN(cota)) totalCota += cota;

    const apartmentRaw = String(apt.number ?? '').trim();
    const apartmentValue = /^\d+$/.test(apartmentRaw) ? parseInt(apartmentRaw, 10) : (apartmentRaw || '-');

    const row = [
      idx + 1,
      bloc?.name || '—',
      stair?.name || '—',
      apartmentValue,
      apt.owner || '—',
      persons,
      apt.apartmentType || '—',
      isNaN(surface) ? '—' : surface,
      apt.heatingSource || '—',
      isNaN(cota) ? '—' : cota,
    ];

    row.forEach((val, i) => {
      const cell = sheet.getCell(r, i + 1);
      cell.value = val;
      cell.alignment = { horizontal: HEADERS[i].align, vertical: 'middle' };

      if (i === 7 && typeof val === 'number') cell.numFmt = '#,##0.00';
      if (i === 9 && typeof val === 'number') cell.numFmt = '0.0000';
      if (i === 0 && typeof val === 'number') cell.numFmt = '0';
      if (i === 3 && typeof val === 'number') cell.numFmt = '0';
      if (i === 5) cell.numFmt = '0';

      cell.font = {
        size: 10,
        bold: i === 3 || i === 4,
        color: { argb: i === 4 ? COLORS.primaryDark : COLORS.black },
      };

      // Alternative row coloring (zebra)
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blueLight } };
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
    `${blocks.length} bloc${blocks.length !== 1 ? 'uri' : ''} • ${stairs.length} sc.`,
    sortedApts.length,
    `${sortedApts.length} apt`,
    totalPersons,
    '',
    countWithSurface > 0 ? totalSurface : '',
    '',
    totalCota > 0 ? totalCota : '',
  ];
  footerValues.forEach((val, i) => {
    const cell = sheet.getCell(r, i + 1);
    cell.value = val;
    if (i === 7 && typeof val === 'number') cell.numFmt = '#,##0.00';
    if (i === 9 && typeof val === 'number') cell.numFmt = '0.0000';
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

export const downloadApartamenteExcel = async (params) => {
  const workbook = await generateApartamenteExcel(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Apartamente_${safeName}_${safeMonth}.xlsx`);
};
