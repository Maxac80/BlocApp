/**
 * Helper-i comuni pentru generatoarele PDF (Furnizori, Facturi, Apartamente, Cheltuieli, Distribuție).
 * Refolosesc convențiile validate (logo BlocApp dreapta, header asociație stânga, footer cu 3 sloturi semnături).
 */

export const PDF_COLORS = {
  primary: [37, 99, 235],
  primaryDark: [29, 78, 216],
  primaryLight: [219, 234, 254],
  blueLight: [239, 246, 255],
  red: [220, 38, 38],
  redLight: [254, 226, 226],
  green: [5, 150, 105],
  greenLight: [209, 250, 229],
  greenDark: [4, 120, 87],
  emerald: [16, 185, 129],
  emeraldLight: [167, 243, 208],
  orange: [249, 115, 22],
  orangeLight: [255, 237, 213],
  amber: [217, 119, 6],
  amberLight: [254, 243, 199],
  yellow: [202, 138, 4],
  yellowLight: [254, 249, 195],
  indigo: [79, 70, 229],
  indigoLight: [224, 231, 255],
  gray: [107, 114, 128],
  grayLight: [243, 244, 246],
  grayMid: [209, 213, 219],
  grayDark: [55, 65, 81],
  black: [17, 24, 39],
  white: [255, 255, 255],
};

export const fixRo = (text) => {
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

export const formatLei = (n) => Number(n || 0).toFixed(2);

export const formatDateRo = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

export const composeAddress = (address, blocks = [], stairs = []) => {
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

export const composeBankAccount = (association) => {
  const iban = association?.bankAccount || association?.bankAccountData?.iban || '';
  const bank = association?.bank || association?.bankAccountData?.bank || '';
  if (!iban) return '';
  return bank ? `${bank} - ${iban}` : `IBAN: ${iban}`;
};

export const loadLogo = async () => {
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
 * Desenează antetul standard: nume asociație stânga + logo dreapta + linie separator.
 * @returns {number} Y-ul de unde poți continua să desenezi.
 */
export const drawHeader = (doc, { association, logo, blocks = [], stairs = [], pageW, margin }) => {
  let y = margin;

  // Logo dreapta sus + www.blocapp.ro
  if (logo?.dataUrl && logo.w && logo.h) {
    const logoH = 11;
    const logoW = (logo.w / logo.h) * logoH;
    doc.addImage(logo.dataUrl, 'PNG', pageW - margin - logoW, y, logoW, logoH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.gray);
    doc.text('www.blocapp.ro', pageW - margin, y + logoH + 3, { align: 'right' });
  }

  // Nume asociație stânga sus
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.black);
  doc.text(fixRo((association?.name || 'ASOCIATIA DE PROPRIETARI').toUpperCase()), margin, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.gray);
  let metaY = y + 10;
  if (association?.cui) {
    doc.text(fixRo(`CUI: ${association.cui}`), margin, metaY);
    metaY += 4;
  }
  const addr = composeAddress(association?.address, blocks, stairs);
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
  doc.setDrawColor(...PDF_COLORS.grayMid);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  return y + 6;
};

/**
 * Desenează titlul mare (primary dark).
 */
export const drawTitle = (doc, title, x, y) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(fixRo(title).toUpperCase(), x, y);
  return y + 7;
};

/**
 * Desenează subtitlu italic gri (consum aprilie 2026).
 */
export const drawSubtitle = (doc, subtitle, x, y) => {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(fixRo(`(${subtitle})`), x, y);
  return y + 5;
};

/**
 * Desenează data în dreapta sus (Data: 01.05.2026).
 */
export const drawRightDate = (doc, date, pageW, margin, y) => {
  if (!date) return;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.grayDark);
  doc.text(`Data: ${formatDateRo(date)}`, pageW - margin, y, { align: 'right' });
};

/**
 * Desenează footer-ul cu 3 sloturi semnături (Administrator | Președinte | Cenzor).
 * Apelat din `didDrawPage` în autoTable.
 */
export const drawSignaturesFooter = (doc, association, pageW, pageH, margin) => {
  const fY = pageH - 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.grayDark);
  const slotW = (pageW - 2 * margin) / 3;
  const slots = [
    { label: 'Administrator', name: association?.legalAdmin || '' },
    { label: 'Presedinte', name: association?.president || '' },
    { label: 'Cenzor', name: association?.censor || '' },
  ];
  slots.forEach((slot, idx) => {
    const slotX = margin + slotW * idx + slotW / 2;
    doc.setFont('helvetica', 'bold');
    doc.text(fixRo(slot.label), slotX, fY - 3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    if (slot.name) {
      doc.setTextColor(...PDF_COLORS.black);
      doc.text(fixRo(slot.name), slotX, fY + 1, { align: 'center' });
      doc.setTextColor(...PDF_COLORS.grayDark);
    }
    doc.setDrawColor(...PDF_COLORS.grayMid);
    doc.setLineWidth(0.3);
    doc.line(slotX - slotW / 2 + 8, fY + 4, slotX + slotW / 2 - 8, fY + 4);
  });
};

/**
 * Stiluri standard pentru autoTable. Toate generatoarele le folosesc.
 */
export const TABLE_STYLES = {
  styles: {
    font: 'helvetica',
    fontSize: 8.5,
    cellPadding: 1.8,
    textColor: PDF_COLORS.grayDark,
    lineColor: PDF_COLORS.grayMid,
    lineWidth: 0.15,
  },
  headStyles: {
    fillColor: PDF_COLORS.primary,
    textColor: PDF_COLORS.white,
    fontStyle: 'bold',
    halign: 'center',
    fontSize: 8.5,
  },
  footStyles: {
    fillColor: PDF_COLORS.primaryLight,
    textColor: PDF_COLORS.primaryDark,
    fontStyle: 'bold',
  },
};
