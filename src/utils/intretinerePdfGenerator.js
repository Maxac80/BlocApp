import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generator PDF pentru Lista Intretinere (tabel simplificat).
 *
 * Format: A4 portrait
 * - Antet: nume asociatie + CUI + adresa (Bloc/Scara) + IBAN | logo BlocApp dreapta sus
 * - Titlu: "LISTA DE PLATA A COTELOR DE INTRETINERE - [LUNA]" + data afisarii + scadenta
 * - Tabel: Ap | Proprietar | Pers | Intretinere | Restanta | Total Intr.+Restanta | Penalitati | Total Datorat
 * - Footer: Administrator | Presedinte | Cenzor (cu nume din association)
 *
 * Un sheet per scara (page break automat).
 */

const COLORS = {
  primary: [37, 99, 235],
  primaryDark: [29, 78, 216],
  primaryLight: [219, 234, 254],
  red: [220, 38, 38],
  orange: [249, 115, 22],
  indigo: [79, 70, 229],
  amberLight: [254, 243, 199],
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

const drawHeader = (doc, { association, blocName, stairName, monthYear, consumptionMonth, publicationDate, dueDate, logo, pageW, margin }) => {
  let y = margin;

  // Logo dreapta sus + www.blocapp.ro
  if (logo?.dataUrl && logo.w && logo.h) {
    const logoH = 11;
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

  y = metaY - 1;
  doc.setDrawColor(...COLORS.grayMid);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Titlu stanga + date dreapta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(fixRo(`Lista de plata a cotelor de intretinere - ${monthYear || ''}`).toUpperCase(), margin, y);

  if (publicationDate || dueDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.grayDark);
    let dateY = y - 1;
    const rightX = pageW - margin;
    if (publicationDate) {
      doc.text(fixRo(`Data afisarii: ${formatDateRo(publicationDate)}`), rightX, dateY, { align: 'right' });
      dateY += 4;
    }
    if (dueDate) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.red);
      doc.text(fixRo(`Scadenta: ${formatDateRo(dueDate)}`), rightX, dateY, { align: 'right' });
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
    doc.setDrawColor(...COLORS.grayMid);
    doc.setLineWidth(0.3);
    doc.line(slotX - slotW / 2 + 8, fY + 4, slotX + slotW / 2 - 8, fY + 4);
  });
};

const buildBodyAndFoot = (maintenanceData) => {
  let sumPersons = 0;
  let sumIntretinere = 0;
  let sumRestante = 0;
  let sumTotal = 0;
  let sumPenalitati = 0;
  let sumTotalDatorat = 0;

  const body = (maintenanceData || []).map((d) => {
    // Sume originale (înainte de scadere incasari) — pentru paritate cu print Distributie
    const paidR = Number(d.paymentInfo?.totalsByCategory?.totalRestante) || 0;
    const paidI = Number(d.paymentInfo?.totalsByCategory?.totalIntretinere) || 0;
    const paidP = Number(d.paymentInfo?.totalsByCategory?.totalPenalitati) || 0;
    const intretinere = (Number(d.currentMaintenance) || 0) + paidI;
    const restante = (Number(d.restante) || 0) + paidR;
    const penalitati = (Number(d.penalitati) || 0) + paidP;
    const total = intretinere + restante;
    const totalDatorat = total + penalitati;
    const persons = Number(d.persons) || 0;

    sumPersons += persons;
    sumIntretinere += intretinere;
    sumRestante += restante;
    sumTotal += total;
    sumPenalitati += penalitati;
    sumTotalDatorat += totalDatorat;

    return [
      fixRo(String(d.apartment || '-')),
      fixRo(d.owner || '-'),
      String(persons),
      formatLei(intretinere),
      formatLei(restante),
      formatLei(total),
      formatLei(penalitati),
      formatLei(totalDatorat),
    ];
  });

  const foot = [
    String(body.length),
    fixRo('TOTAL'),
    String(sumPersons),
    formatLei(sumIntretinere),
    formatLei(sumRestante),
    formatLei(sumTotal),
    formatLei(sumPenalitati),
    formatLei(sumTotalDatorat),
  ];

  return { body, foot };
};

const renderStairTable = (doc, { groupData, association, monthYear, consumptionMonth, publicationDate, dueDate, logo, isFirst }) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

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

  const { body, foot } = buildBodyAndFoot(groupData.maintenanceData);

  // A4 portrait usable: 210 - 2*12 = 186mm
  // Coloane sumate exact 186mm — tabelul ajunge până la marginea dreaptă (aliniat cu logo/www/scadenta)
  // Ap (12) + Proprietar (44) + Pers (12) + Intretinere (22) + Restanta (22) + Total Intr.+Rest (26) + Penalitati (22) + Total Datorat (26) = 186mm
  const fixedWidths = [12, 44, 12, 22, 22, 26, 22, 26];

  const rowCount = body.length;
  let tableFontSize, cellPadding;
  if (rowCount > 30) {
    tableFontSize = 8;
    cellPadding = 1.3;
  } else if (rowCount > 20) {
    tableFontSize = 9;
    cellPadding = 1.6;
  } else if (rowCount > 12) {
    tableFontSize = 10;
    cellPadding = 1.9;
  } else {
    tableFontSize = 11;
    cellPadding = 2.2;
  }

  const columnStyles = {
    0: { cellWidth: fixedWidths[0], halign: 'center' },
    1: { cellWidth: fixedWidths[1], halign: 'left' },
    2: { cellWidth: fixedWidths[2], halign: 'center' },
    3: { cellWidth: fixedWidths[3], halign: 'right', textColor: COLORS.indigo },
    4: { cellWidth: fixedWidths[4], halign: 'right', textColor: COLORS.red },
    5: { cellWidth: fixedWidths[5], halign: 'right' },
    6: { cellWidth: fixedWidths[6], halign: 'right', textColor: COLORS.orange },
    7: {
      cellWidth: fixedWidths[7],
      halign: 'right',
      fontStyle: 'bold',
      fillColor: COLORS.amberLight,
      textColor: COLORS.black,
    },
  };

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
 * @param {object} options.association
 * @param {string} options.monthYear
 * @param {string} options.consumptionMonth
 * @param {Date} options.publicationDate
 * @param {Date} options.dueDate
 */
export const generateIntretinerePdf = async ({ groups = [], association, monthYear, consumptionMonth, publicationDate, dueDate, maintenanceData, stairLabel }) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const logo = await loadLogo();

  // Backward compat: dacă apelat cu maintenanceData direct (legacy), construim un singur grup
  let validGroups = (groups || []).filter((g) => g.maintenanceData?.length > 0);
  if (validGroups.length === 0 && maintenanceData?.length > 0) {
    validGroups = [{
      blocName: '',
      stairName: stairLabel || '',
      maintenanceData,
    }];
  }
  if (validGroups.length === 0) return doc;

  validGroups.forEach((group, idx) => {
    renderStairTable(doc, {
      groupData: group,
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
export const downloadIntretinerePdf = async (params) => {
  const doc = await generateIntretinerePdf(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  doc.save(`Intretinere_${safeName}_${safeMonth}.pdf`);
};
