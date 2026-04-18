import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generator PDF pentru Detalii Intretinere (admin + locatar)
 *
 * Format: A4 portrait, o singura pagina
 * - Header cu logo BlocApp
 * - Datele asociatiei + statistici
 * - Info apartament
 * - Tabel cheltuieli cu distributie si calcul
 * - Situatie la zi (restante, penalitati, total)
 * - Footer cu IBAN
 */

const COLORS = {
  primary: [16, 185, 129],        // Emerald-500 (verde BlocApp)
  primaryDark: [4, 120, 87],      // Emerald-700
  blue: [37, 99, 235],            // Blue-600
  orange: [249, 115, 22],         // Orange-500
  red: [220, 38, 38],             // Red-600
  gray: [107, 114, 128],          // Gray-500
  grayLight: [243, 244, 246],     // Gray-100
  grayMid: [209, 213, 219],       // Gray-300
  grayDark: [55, 65, 81],         // Gray-700
  black: [17, 24, 39],            // Gray-900
  white: [255, 255, 255]
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

const formatLei = (n) => `${Number(n || 0).toFixed(2)} lei`;

// Ordine de sortare pentru cheltuieli in PDF (identica cu modalul UI)
const DISTRIBUTION_ORDER = {
  consumption: 1,
  byConsumption: 1,
  consumption_cumulative: 2,
  person: 3,
  perPerson: 3,
  byPersons: 3,
  apartment: 4,
  equal: 4,
  perApartament: 4,
  individual: 5,
  suma_individuala: 5,
  cotaParte: 6,
  byArea: 6,
  fixed: 7
};

const sortExpensesForPdf = (a, b) => {
  const oa = DISTRIBUTION_ORDER[a.distributionType] || 99;
  const ob = DISTRIBUTION_ORDER[b.distributionType] || 99;
  if (oa !== ob) return oa - ob;
  const av = (Number(a.amount) || 0) + (Number(a.difference) || 0);
  const bv = (Number(b.amount) || 0) + (Number(b.difference) || 0);
  return bv - av;
};

const formatDateNow = () => {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Incarca logo-ul BlocApp ca base64 si returneaza si dimensiunile naturale
 */
const loadLogo = async () => {
  try {
    const response = await fetch('/blocapp-logo-locatari.png', { cache: 'no-store' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    // Obtine dimensiunile naturale
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
 * Construieste textul "Calcul" pentru o cheltuiala pe baza distributionType
 * Daca unitPrice lipseste, il calculeaza invers din amount
 */
const buildCalculText = (exp) => {
  const dt = exp.distributionType;
  const amount = Number(exp.amount || 0);

  if (dt === 'consumption' || dt === 'byConsumption' || dt === 'consumption_cumulative') {
    const unit = exp.consumptionUnit || 'mc';
    const cons = Number(exp.consumption || 0);
    let price = Number(exp.unitPrice || 0);
    if (price === 0 && cons > 0 && amount > 0) {
      price = amount / cons;
    }
    return `${cons.toFixed(2)} ${unit} x ${price.toFixed(2)} lei/${unit}`;
  }

  if (dt === 'person' || dt === 'perPerson' || dt === 'byPersons') {
    const persons = exp.persons || 0;
    let price = Number(exp.unitPrice || 0);
    if (price === 0 && persons > 0 && amount > 0) {
      price = amount / persons;
    }
    const persWord = persons === 1 ? 'persoana' : 'persoane';
    return `${persons} ${persWord} x ${price.toFixed(2)} lei`;
  }

  if (dt === 'apartment' || dt === 'equal' || dt === 'perApartament') {
    return `${amount.toFixed(2)} lei / apartament`;
  }

  if (dt === 'cotaParte' || dt === 'byArea') {
    const surface = Number(exp.surface || 0);
    let price = Number(exp.unitPrice || 0);
    if (price === 0 && surface > 0 && amount > 0) {
      price = amount / surface;
    }
    return `${surface} mp x ${price.toFixed(4)} lei/mp`;
  }

  if (dt === 'individual' || dt === 'suma_individuala') {
    return `${amount.toFixed(2)} lei (suma individuala)`;
  }

  if (dt === 'fixed') {
    return `${amount.toFixed(2)} lei (suma fixa)`;
  }

  return '-';
};

/**
 * Returneaza culoarea pentru o distributie (stil badge)
 */
const getDistributionColor = (distributionType) => {
  if (distributionType === 'consumption' || distributionType === 'byConsumption') {
    return COLORS.orange;
  }
  if (distributionType === 'consumption_cumulative') {
    return COLORS.orange;
  }
  if (distributionType === 'person' || distributionType === 'perPerson' || distributionType === 'byPersons') {
    return COLORS.primary;
  }
  if (distributionType === 'apartment' || distributionType === 'equal' || distributionType === 'perApartament') {
    return COLORS.blue;
  }
  if (distributionType === 'individual' || distributionType === 'suma_individuala') {
    return [168, 85, 247]; // Purple-500
  }
  if (distributionType === 'cotaParte' || distributionType === 'byArea') {
    return [20, 184, 166]; // Teal-500
  }
  return COLORS.gray;
};

/**
 * Label pentru distributie
 */
const getDistributionLabel = (distributionType) => {
  const labels = {
    consumption: 'Pe consum',
    byConsumption: 'Pe consum',
    consumption_cumulative: 'Pe consum cumulat',
    person: 'Pe persoana',
    perPerson: 'Pe persoana',
    byPersons: 'Pe persoana',
    apartment: 'Pe apartament',
    equal: 'Pe apartament',
    perApartament: 'Pe apartament',
    individual: 'Suma individuala',
    suma_individuala: 'Suma individuala',
    cotaParte: 'Cota parte',
    byArea: 'Cota parte',
    fixed: 'Suma fixa'
  };
  return labels[distributionType] || 'Pe apartament';
};

/**
 * Genereaza PDF-ul raport intretinere
 *
 * @param {object} params
 * @param {object} params.association - {name, cui, address, email, phone, bankAccount, bank}
 * @param {object} params.stats - {blocs, stairs, apartments, persons}
 * @param {object} params.apartment - {number, owner, persons, rooms, surface, heatingType}
 * @param {string} params.monthYear - ex: "aprilie 2026"
 * @param {string} params.consumptionMonth - ex: "martie 2026"
 * @param {Array} params.expenses - cheltuielile formatate (vezi buildCalculText input)
 * @param {object} params.totals - {currentMaintenance, restante, penalitati, totalDatorat}
 * @returns {Promise<jsPDF>}
 */
export const generateMaintenancePdf = async ({
  association = {},
  stats = {},
  apartment = {},
  monthYear = '',
  consumptionMonth = '',
  expenses = [],
  totals = {}
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();   // 210
  const pageH = doc.internal.pageSize.getHeight();  // 297
  const margin = 12;
  const contentW = pageW - 2 * margin;

  // Incarca logo (pentru footer)
  const logo = await loadLogo();

  // ====== HEADER (text only, fara logo) ======
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text('BlocApp', margin, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.gray);
  doc.text(fixRo('Administrare asociatii de proprietari'), margin, y + 12);

  // Titlu dreapta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.black);
  doc.text(fixRo('RAPORT INTRETINERE'), pageW - margin, y + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.grayDark);
  const monthText = consumptionMonth
    ? fixRo(`${monthYear} - consum ${consumptionMonth}`)
    : fixRo(monthYear);
  doc.text(monthText, pageW - margin, y + 13, { align: 'right' });

  y += 18;

  // Separator
  doc.setDrawColor(...COLORS.grayMid);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ====== CARD ASOCIATIE + STATS ======
  // Stanga: info asociatie, Dreapta: statistici
  const leftX = margin;
  const rightX = margin + contentW * 0.6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.black);
  doc.text(fixRo(association.name || 'Asociatia proprietarilor'), leftX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.grayDark);
  let yL = y + 4.5;

  if (association.cui) {
    doc.text(fixRo(`CUI: ${association.cui}`), leftX, yL);
    yL += 3.8;
  }

  // Adresa completa cu strada + numar + bloc + scara + oras + judet
  const addr = association.address;
  let addressLine = '';
  if (typeof addr === 'string') {
    addressLine = addr;
  } else if (addr && typeof addr === 'object') {
    const street = addr.street || '';
    const number = addr.number ? ` ${addr.number}` : '';
    const streetPart = street ? `${street}${number}` : '';
    const blockStair = [
      apartment.blockName || '',
      apartment.stairName || ''
    ].filter(Boolean).join(', ');
    const location = [addr.city, addr.county].filter(Boolean).join(', ');
    addressLine = [streetPart, blockStair, location].filter(Boolean).join(', ');
  }
  if (addressLine) {
    const splitAddr = doc.splitTextToSize(fixRo(addressLine), contentW * 0.58);
    doc.text(splitAddr, leftX, yL);
    yL += 3.8 * splitAddr.length;
  }

  const contactLine = [association.email, association.phone].filter(Boolean).join(' | ');
  if (contactLine) {
    doc.text(fixRo(contactLine), leftX, yL);
    yL += 3.8;
  }

  // IBAN in header (daca exista)
  if (association.bankAccount) {
    const ibanText = association.bank
      ? `IBAN: ${association.bankAccount} (${association.bank})`
      : `IBAN: ${association.bankAccount}`;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.grayDark);
    doc.text(fixRo(ibanText), leftX, yL);
    doc.setFont('helvetica', 'normal');
    yL += 3.8;
  }

  // Statistici dreapta (doar daca exista valori, cu singular/plural)
  const plural = (n, sg, pl) => (n === 1 ? sg : pl);
  const allBadges = [
    { label: plural(stats.blocs, 'Bloc', 'Blocuri'), value: stats.blocs || 0 },
    { label: plural(stats.stairs, 'Scara', 'Scari'), value: stats.stairs || 0 },
    { label: plural(stats.apartments, 'Apartament', 'Apartamente'), value: stats.apartments || 0 },
    { label: plural(stats.persons, 'Persoana', 'Persoane'), value: stats.persons || 0 }
  ];
  const badges = allBadges.filter(b => b.value > 0);
  let badgesY = y;

  if (badges.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.grayDark);
    doc.text(fixRo('Structura asociatiei'), rightX, y);

    const badgeW = 18;
    const badgeH = 11;
    const badgeGap = 2;
    let bx = rightX;
    const by = y + 2;

    badges.forEach((b) => {
      doc.setFillColor(...COLORS.grayLight);
      doc.roundedRect(bx, by, badgeW, badgeH, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.primaryDark);
      doc.text(String(b.value), bx + badgeW / 2, by + 5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...COLORS.gray);
      doc.text(fixRo(b.label), bx + badgeW / 2, by + 9, { align: 'center' });

      bx += badgeW + badgeGap;
    });

    badgesY = by + badgeH;
  }

  y = Math.max(yL, badgesY) + 4;

  // ====== CARD APARTAMENT ======
  doc.setFillColor(...COLORS.grayLight);
  doc.roundedRect(margin, y, contentW, 13, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.black);
  doc.text(fixRo(`Apartament ${apartment.number || '-'}`), margin + 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.grayDark);
  doc.text(fixRo(`Proprietar: ${apartment.owner || '-'}`), margin + 3, y + 10);

  // Info dreapta: persoane, camere, mp, incalzire
  const infoParts = [];
  if (apartment.persons !== undefined) {
    const p = apartment.persons;
    infoParts.push(`${p} ${p === 1 ? 'persoana' : 'persoane'}`);
  }
  if (apartment.rooms !== undefined && apartment.rooms > 0) {
    infoParts.push(`${apartment.rooms} camere`);
  }
  if (apartment.surface !== undefined && apartment.surface > 0) {
    infoParts.push(`${apartment.surface} mp`);
  }
  if (apartment.heatingType) {
    infoParts.push(fixRo(apartment.heatingType));
  }
  if (infoParts.length > 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.grayDark);
    doc.text(fixRo(infoParts.join('  |  ')), pageW - margin - 3, y + 8, { align: 'right' });
  }

  y += 16;

  // ====== TABEL CHELTUIELI ======
  const tableHead = [[
    'Nr.',
    fixRo('Cheltuiala'),
    fixRo('Distributie'),
    fixRo('Calcul'),
    fixRo('Valoare')
  ]];

  const sortedExpenses = [...expenses].sort(sortExpensesForPdf);
  const tableBody = sortedExpenses.map((exp, idx) => {
    const amount = Number(exp.amount || 0);
    const differenceStored = Number(exp.difference || 0);
    // finalAmount = ce plateste apartamentul (amount + difference stocata)
    const finalAmount = amount + differenceStored;

    const dt = exp.distributionType;
    const isConsumption = dt === 'consumption' || dt === 'byConsumption' || dt === 'consumption_cumulative';
    const cons = Number(exp.consumption || 0);
    const unitPrice = Number(exp.unitPrice || 0);

    let calcText;
    if (isConsumption) {
      const unit = exp.consumptionUnit || 'mc';
      const subtotal = cons * unitPrice;
      calcText = `${cons.toFixed(2)} ${unit} x ${unitPrice.toFixed(2)} lei/${unit} = ${subtotal.toFixed(2)} lei`;
      // Diferenta reala = ce plateste apartamentul - subtotal
      const actualDiff = finalAmount - subtotal;
      if (Math.abs(actualDiff) >= 0.01) {
        const sign = actualDiff > 0 ? '+' : '-';
        calcText += `\n${sign} ${Math.abs(actualDiff).toFixed(2)} lei diferenta`;
      }
    } else {
      calcText = buildCalculText(exp);
      if (Math.abs(differenceStored) >= 0.01) {
        const sign = differenceStored > 0 ? '+' : '-';
        calcText += `\n${sign} ${Math.abs(differenceStored).toFixed(2)} lei diferenta`;
      }
    }

    const isExcluded = exp.isExcluded || exp.participationType === 'excluded';
    const valueText = isExcluded ? 'Exclus' : formatLei(finalAmount);

    return [
      String(idx + 1),
      fixRo(exp.name || '-'),
      fixRo(getDistributionLabel(exp.distributionType)),
      fixRo(calcText),
      valueText
    ];
  });

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: COLORS.black,
      lineColor: COLORS.grayMid,
      lineWidth: 0.1,
      valign: 'middle'
    },
    headStyles: {
      fillColor: COLORS.primaryDark,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 34 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    didParseCell: (data) => {
      const rowIdx = data.row.index;
      if (data.section !== 'body') return;
      const exp = sortedExpenses[rowIdx];
      if (!exp) return;
      const rowExcluded = exp.isExcluded || exp.participationType === 'excluded';

      // Bara colorata pe prima coloana pentru tip distributie
      if (data.column.index === 2) {
        const c = getDistributionColor(exp.distributionType);
        data.cell.styles.textColor = c;
        data.cell.styles.fontStyle = 'bold';
      }

      // Exclus: gri
      if (rowExcluded && data.column.index === 4) {
        data.cell.styles.textColor = COLORS.gray;
        data.cell.styles.fontStyle = 'normal';
      }
      if (rowExcluded && data.column.index === 1) {
        data.cell.styles.textColor = COLORS.gray;
      }
    }
  });

  y = doc.lastAutoTable.finalY + 4;

  // Total intretinere curenta (sub tabel, dreapta)
  const totalCurrent = Number(totals.currentMaintenance || 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.black);
  doc.text(fixRo('Total intretinere curenta:'), pageW - margin - 40, y + 3, { align: 'right' });
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(formatLei(totalCurrent), pageW - margin, y + 3, { align: 'right' });

  y += 8;

  // ====== SITUATIE LA ZI ======
  const restante = Number(totals.restante || 0);
  const penalitati = Number(totals.penalitati || 0);
  const totalDatorat = Number(totals.totalDatorat || (totalCurrent + restante + penalitati));

  const hasArrears = restante > 0 || penalitati > 0;
  const cardColor = hasArrears ? [254, 242, 242] : [236, 253, 245]; // red-50 / emerald-50
  const borderColor = hasArrears ? COLORS.red : COLORS.primary;

  const cardH = 30;
  doc.setFillColor(...cardColor);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, cardH, 2, 2, 'FD');

  // Titlu card
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.black);
  doc.text(fixRo('Situatie la zi'), margin + 3, y + 5.5);

  // Linii restante + penalitati
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.grayDark);

  doc.text(fixRo('Restante luni anterioare:'), margin + 3, y + 12);
  doc.setFont('helvetica', 'bold');
  const restanteColor = restante > 0 ? COLORS.red : COLORS.grayDark;
  doc.setTextColor(...restanteColor);
  doc.text(formatLei(restante), margin + contentW / 2 - 3, y + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.grayDark);
  doc.text(fixRo('Penalitati acumulate:'), margin + 3, y + 17);
  doc.setFont('helvetica', 'bold');
  const penColor = penalitati > 0 ? COLORS.red : COLORS.grayDark;
  doc.setTextColor(...penColor);
  doc.text(formatLei(penalitati), margin + contentW / 2 - 3, y + 17, { align: 'right' });

  // Separator vertical
  doc.setDrawColor(...COLORS.grayMid);
  doc.setLineWidth(0.2);
  doc.line(margin + contentW / 2 + 3, y + 3, margin + contentW / 2 + 3, y + cardH - 3);

  // TOTAL mare in dreapta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.grayDark);
  doc.text(fixRo('TOTAL GENERAL DE PLATA'), margin + contentW / 2 + 6, y + 10);

  doc.setFontSize(18);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(formatLei(totalDatorat), pageW - margin - 3, y + 22, { align: 'right' });

  y += cardH + 4;

  // ====== FOOTER ======
  const footerTop = pageH - 18;
  doc.setDrawColor(...COLORS.grayMid);
  doc.setLineWidth(0.2);
  doc.line(margin, footerTop, pageW - margin, footerTop);

  // Logo BlocApp centrat jos, la dimensiune naturala (height = 7mm)
  if (logo && logo.dataUrl && logo.w > 0 && logo.h > 0) {
    const logoH = 7;
    const logoW = (logo.w / logo.h) * logoH;
    try {
      doc.addImage(logo.dataUrl, 'PNG', (pageW - logoW) / 2, footerTop + 2, logoW, logoH);
    } catch {
      // ignora daca addImage esueaza
    }
  }

  // Text footer sub logo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gray);
  doc.text(
    fixRo(`Generat automat de BlocApp - ${formatDateNow()}`),
    pageW / 2,
    pageH - 5,
    { align: 'center' }
  );

  return doc;
};

/**
 * Genereaza si descarca PDF-ul
 */
export const downloadMaintenancePdf = async (params) => {
  const doc = await generateMaintenancePdf(params);
  const filename = `Intretinere_Apt${params.apartment?.number || ''}_${(params.monthYear || '').replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  return filename;
};

export default generateMaintenancePdf;
