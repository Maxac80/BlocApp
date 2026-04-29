import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generator PDF pentru Distributie Cheltuieli (tabel detaliat).
 *
 * Format: A4 landscape, o pagina per scara.
 * - Antet: nume asociatie + CUI + adresa cu bloc/scara | logo BlocApp dreapta sus
 * - Titlu: "Lista de plata a cotelor de intretinere - [luna] [an]" (subtitlu cu luna consum)
 * - Tabel: Ap | Proprietar | Pers | Intretinere | Restanta | Total | Penalitati | Total Datorat | (cheltuieli + diferente)
 * - Footer: Administrator + Presedinte + Cenzor (semnaturi cu nume din association)
 */

const COLORS = {
  primary: [37, 99, 235],
  primaryDark: [29, 78, 216],
  primaryLight: [219, 234, 254],
  red: [220, 38, 38],
  orange: [249, 115, 22],
  indigo: [79, 70, 229],
  blue: [59, 130, 246],
  blueLight: [239, 246, 255],
  orangeLight: [255, 247, 237],
  amber: [217, 119, 6],
  amberLight: [254, 243, 199],
  amberMid: [253, 224, 71],
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

const formatDateRo = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

const composeBankAccount = (association) => {
  const iban = association?.bankAccount || association?.bankAccountData?.iban || '';
  const bank = association?.bank || association?.bankAccountData?.bank || '';
  if (!iban) return '';
  return bank ? `${bank} - ${iban}` : `IBAN: ${iban}`;
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
 * Construieste headerul tabelului cu coloanele in ordinea ceruta.
 * Returnează: { headRow, expenseColumns, totalCols }
 *   - headRow: array de stringuri pentru thead
 *   - expenseColumns: [{ key, hasDiff }] info pentru body/foot
 */
const buildColumnsConfig = (maintenanceData, expenses) => {
  const expenseColumns = expenses.map((expense) => {
    const expenseKey = expense.expenseTypeId || expense.id || expense.name;
    const hasDiff = maintenanceData.some((d) => d.expenseDifferenceDetails?.[expenseKey]);
    return { expense, expenseKey, hasDiff };
  });

  const headRow = [
    fixRo('Ap.'),
    fixRo('Proprietar'),
    fixRo('Pers.'),
    fixRo('Intretinere'),
    fixRo('Restanta'),
    fixRo('Total Intr.\n+ Restanta'),
    fixRo('Penalitati'),
    fixRo('Total\nDatorat'),
  ];
  expenseColumns.forEach(({ expense, hasDiff }) => {
    headRow.push(fixRo(expense.name || '-'));
    if (hasDiff) headRow.push(fixRo(`${expense.name || '-'} - Dif.`));
  });

  return { headRow, expenseColumns };
};

const buildBodyRows = (maintenanceData, expenseColumns, sums) => {
  return maintenanceData.map((d) => {
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

    const row = [
      fixRo(String(d.apartment || '-')),
      fixRo(d.owner || '-'),
      String(persons),
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
      row.push(formatLei(numericAmount));

      if (hasDiff) {
        const diff = Number(d.expenseDifferenceDetails?.[expenseKey]) || 0;
        sums.differences[idx] = (sums.differences[idx] || 0) + diff;
        row.push(formatLei(diff));
      }
    });

    return row;
  });
};

const buildFootRow = (sums, expenseColumns) => {
  const foot = [
    '',
    fixRo('TOTAL'),
    String(sums.persons),
    formatLei(sums.intretinere),
    formatLei(sums.restante),
    formatLei(sums.total),
    formatLei(sums.penalitati),
    formatLei(sums.totalDatorat),
  ];
  expenseColumns.forEach(({ hasDiff }, idx) => {
    foot.push(formatLei(sums.expenses[idx] || 0));
    if (hasDiff) foot.push(formatLei(sums.differences[idx] || 0));
  });
  return foot;
};

const drawHeader = (doc, { association, blocName, stairName, monthYear, consumptionMonth, publicationDate, dueDate, logo, pageW, margin }) => {
  let y = margin;

  // Logo dreapta sus (mic) + URL website sub el
  if (logo?.dataUrl && logo.w && logo.h) {
    const logoH = 9;
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
  const addr = composeAddressForStair(association?.address, blocName, stairName);
  if (addr) {
    doc.text(fixRo(addr), margin, metaY);
    metaY += 4;
  }
  const bankLine = composeBankAccount(association);
  if (bankLine) {
    doc.text(fixRo(bankLine), margin, metaY);
    metaY += 4;
  }

  // Spațiu redus sub bank → linie separator → spațiu egal înainte de titlu
  y = metaY - 1;
  doc.setDrawColor(...COLORS.grayMid);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Titlu principal stanga + date publicare/scadenta dreapta (pe acelasi rand)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(fixRo(`Lista de plata a cotelor de intretinere - ${monthYear || ''}`).toUpperCase(), margin, y);

  // Date dreapta
  if (publicationDate || dueDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.grayDark);
    let dateY = y - 1;
    const rightX = pageW - margin;
    if (publicationDate) {
      const txt = `Data afisarii: ${formatDateRo(publicationDate)}`;
      doc.text(fixRo(txt), rightX, dateY, { align: 'right' });
      dateY += 4;
    }
    if (dueDate) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.red);
      const txt = `Scadenta: ${formatDateRo(dueDate)}`;
      doc.text(fixRo(txt), rightX, dateY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.grayDark);
    }
  }

  y += 5;

  // Subtitlu cu luna consum
  if (consumptionMonth) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text(fixRo(`(consum luna ${consumptionMonth})`), margin, y);
    y += 2;
  }

  return y;
};

const drawFooter = (doc, { association, pageW, pageH, margin }) => {
  const fY = pageH - 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.grayDark);

  // 3 sloturi: Administrator | Presedinte | Cenzor
  const slotW = (pageW - 2 * margin) / 3;
  const labels = [
    { label: 'Administrator', name: association?.legalAdmin || '' },
    { label: 'Presedinte', name: association?.president || '' },
    { label: 'Cenzor', name: association?.censor || '' },
  ];

  labels.forEach((slot, idx) => {
    const slotX = margin + slotW * idx + slotW / 2;
    doc.setFont('helvetica', 'bold');
    doc.text(fixRo(slot.label), slotX, fY - 3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    if (slot.name) {
      doc.setTextColor(...COLORS.black);
      doc.text(fixRo(slot.name), slotX, fY + 1, { align: 'center' });
      doc.setTextColor(...COLORS.grayDark);
    }
    // Linie de semnatura
    doc.setDrawColor(...COLORS.grayMid);
    doc.setLineWidth(0.3);
    doc.line(slotX - slotW / 2 + 8, fY + 4, slotX + slotW / 2 - 8, fY + 4);
  });
};

const renderStairTable = (doc, { groupData, expenses, association, monthYear, consumptionMonth, publicationDate, dueDate, logo, isFirst }) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;

  if (!isFirst) doc.addPage();

  const startY = drawHeader(doc, {
    association,
    blocName: groupData.blocName,
    stairName: groupData.stairName,
    monthYear,
    consumptionMonth,
    publicationDate,
    dueDate,
    logo,
    pageW,
    margin,
  });

  const { headRow, expenseColumns } = buildColumnsConfig(groupData.maintenanceData, expenses);
  const sums = { persons: 0, intretinere: 0, restante: 0, total: 0, penalitati: 0, totalDatorat: 0, expenses: [], differences: [] };
  const body = buildBodyRows(groupData.maintenanceData, expenseColumns, sums);
  const foot = buildFootRow(sums, expenseColumns);

  // Coloane fixe (în mm): Ap, Proprietar, Pers, Intretinere, Restanta, Total(Intr+Rest), Penalitati, Total Datorat
  const fixedWidths = [8, 24, 7, 12, 12, 14, 12, 13];
  const fixedTotal = fixedWidths.reduce((a, b) => a + b, 0); // 102mm

  // Coloane cheltuieli + diferențe — lățime calculată să umple toată pagina
  const totalExpenseCols = expenseColumns.reduce((sum, c) => sum + 1 + (c.hasDiff ? 1 : 0), 0);
  const usableWidth = pageW - 2 * margin; // ~281mm pe A4 landscape
  const remainingWidth = usableWidth - fixedTotal;
  const expenseColWidth = totalExpenseCols > 0 ? Math.max(10, remainingWidth / totalExpenseCols) : 12;

  // Font + padding: scop = tabelul să umple pagina vertical fără să depășească 1 pagină
  // A4 landscape: ~210mm vertical - antet (~25mm) - footer signatures (19mm) = ~166mm pentru tabel
  // Per rând target = 166 / (rowCount + 2 head/foot ~3 lines)
  const rowCount = body.length;
  let tableFontSize, cellPadding;
  if (rowCount > 30) {
    tableFontSize = 6;
    cellPadding = 0.7;
  } else if (rowCount > 20) {
    tableFontSize = 6.5;
    cellPadding = 1.0;
  } else if (rowCount > 12) {
    tableFontSize = 7;
    cellPadding = 1.3;
  } else {
    tableFontSize = 7.5;
    cellPadding = 1.5;
  }

  // Construim columnStyles
  const columnStyles = {};
  fixedWidths.forEach((w, idx) => {
    let style = { cellWidth: w };
    if (idx === 0) style.halign = 'center';
    else if (idx === 1) style.halign = 'left';
    else style.halign = 'right';

    // Întreținere (3): indigo, Restanță (4): red, Penalități (6): orange
    // Total Datorat (7): EVIDENȚIAT - bg amber, bold, font mai mare
    if (idx === 3) style.textColor = COLORS.indigo;
    else if (idx === 4) style.textColor = COLORS.red;
    else if (idx === 6) style.textColor = COLORS.orange;
    else if (idx === 7) {
      style.fontStyle = 'bold';
      style.fillColor = COLORS.amberLight;
      style.textColor = COLORS.black;
    }

    columnStyles[idx] = style;
  });

  // Coloane cheltuieli/diferente
  let colIdx = 8;
  expenseColumns.forEach(({ hasDiff }) => {
    columnStyles[colIdx] = { cellWidth: expenseColWidth, halign: 'right', fillColor: COLORS.blueLight };
    colIdx++;
    if (hasDiff) {
      columnStyles[colIdx] = { cellWidth: expenseColWidth, halign: 'right', fillColor: COLORS.orangeLight };
      colIdx++;
    }
  });

  autoTable(doc, {
    startY,
    head: [headRow],
    body,
    foot: [foot],
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 22 },
    styles: {
      font: 'helvetica',
      fontSize: tableFontSize,
      cellPadding,
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
      fontSize: tableFontSize,
    },
    footStyles: {
      fillColor: COLORS.primaryLight,
      textColor: COLORS.primaryDark,
      fontStyle: 'bold',
    },
    columnStyles,
    didDrawPage: () => {
      drawFooter(doc, { association, pageW, pageH, margin });
    },
  });
};

/**
 * @param {object} options
 * @param {Array} options.groups - [{ blocName, stairName, maintenanceData }, ...]
 * @param {Array} options.expenses - cheltuielile lunii
 * @param {object} options.association - { name, cui, address, legalAdmin, president, censor }
 * @param {string} options.monthYear - ex: "aprilie 2026"
 * @param {string} options.consumptionMonth - ex: "martie 2026" (optional)
 */
export const generateDistributiePdf = async ({ groups = [], expenses = [], association, monthYear, consumptionMonth, publicationDate, dueDate }) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const logo = await loadLogo();

  const validGroups = groups.filter((g) => g.maintenanceData?.length > 0);
  if (validGroups.length === 0) return doc;

  validGroups.forEach((group, idx) => {
    renderStairTable(doc, {
      groupData: group,
      expenses,
      association,
      monthYear,
      consumptionMonth,
      publicationDate,
      dueDate,
      logo,
      isFirst: idx === 0,
    });
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
  doc.save(`Cote_intretinere_${safeName}_${safeMonth}.pdf`);
};
