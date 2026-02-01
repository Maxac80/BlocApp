import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * 📄 GENERATOR PDF PENTRU FACTURI SUBSCRIPTION
 *
 * Generează facturi profesionale în format PDF pentru:
 * - Facturi lunare subscription
 * - Facturi manuale
 *
 * Format A4, limba română, preț în RON
 */

// Configurare culori BlocApp
const COLORS = {
  primary: [59, 130, 246],      // Blue-500
  primaryDark: [29, 78, 216],   // Blue-700
  gray: [107, 114, 128],        // Gray-500
  grayLight: [243, 244, 246],   // Gray-100
  grayDark: [55, 65, 81],       // Gray-700
  black: [17, 24, 39],          // Gray-900
  white: [255, 255, 255],
  success: [34, 197, 94],       // Green-500
  warning: [245, 158, 11],      // Amber-500
  danger: [239, 68, 68]         // Red-500
};

// Informații companie BlocApp (de personalizat)
const COMPANY_INFO = {
  name: 'BlocApp',
  legalName: 'SC BlocApp Solutions SRL', // De actualizat cu datele reale
  cui: 'RO12345678', // De actualizat
  regCom: 'J40/1234/2024', // De actualizat
  address: 'București, Sector 1', // De actualizat
  email: 'facturare@blocapp.ro',
  phone: '+40 123 456 789',
  website: 'www.blocapp.ro',
  bankName: 'Banca Transilvania',
  iban: 'RO12BTRL0000000000000000' // De actualizat
};

/**
 * Formatează un număr ca preț în RON
 */
const formatCurrency = (amount, currency = 'RON') => {
  return `${Number(amount).toFixed(2)} ${currency}`;
};

/**
 * Formatează o dată în format românesc
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formatează perioada de facturare
 */
const formatPeriod = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

/**
 * Obține label pentru status factură
 */
const getStatusLabel = (status) => {
  const labels = {
    draft: 'Ciornă',
    pending: 'În așteptare',
    paid: 'Plătită',
    failed: 'Eșuată',
    cancelled: 'Anulată'
  };
  return labels[status] || status;
};

/**
 * Obține culoare pentru status factură
 */
const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
      return COLORS.success;
    case 'pending':
      return COLORS.warning;
    case 'failed':
    case 'cancelled':
      return COLORS.danger;
    default:
      return COLORS.gray;
  }
};

/**
 * Generează PDF pentru o factură
 * @param {object} invoice - Obiectul factură din Firebase
 * @param {object} options - Opțiuni de generare
 * @returns {jsPDF} - Documentul PDF generat
 */
export const generateInvoicePdf = (invoice, options = {}) => {
  // Creează document A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // === HEADER ===
  // Logo / Nume companie
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('BlocApp', margin, yPos);

  // Badge status (dreapta sus)
  const statusLabel = getStatusLabel(invoice.status);
  const statusColor = getStatusColor(invoice.status);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.white);
  doc.setFillColor(...statusColor);
  const statusWidth = doc.getTextWidth(statusLabel) + 10;
  doc.roundedRect(pageWidth - margin - statusWidth, yPos - 6, statusWidth, 8, 2, 2, 'F');
  doc.text(statusLabel, pageWidth - margin - statusWidth + 5, yPos - 1);

  yPos += 8;

  // Detalii companie
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.legalName, margin, yPos);
  yPos += 4;
  doc.text(`CUI: ${COMPANY_INFO.cui} | Reg. Com.: ${COMPANY_INFO.regCom}`, margin, yPos);
  yPos += 4;
  doc.text(COMPANY_INFO.address, margin, yPos);
  yPos += 4;
  doc.text(`${COMPANY_INFO.email} | ${COMPANY_INFO.phone}`, margin, yPos);

  yPos += 12;

  // Linie separatoare
  doc.setDrawColor(...COLORS.grayLight);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;

  // === DETALII FACTURĂ ===
  // Coloana stânga: Facturat către
  const col1X = margin;
  const col2X = pageWidth / 2 + 10;

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURAT CĂTRE:', col1X, yPos);

  // Coloana dreapta: Detalii factură
  doc.text('DETALII FACTURĂ:', col2X, yPos);

  yPos += 6;

  // Detalii client
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.black);

  const billingContact = invoice.billingContact || {};

  if (billingContact.type === 'company') {
    doc.setFont('helvetica', 'bold');
    doc.text(billingContact.companyName || 'Companie nespecificată', col1X, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 5;
    if (billingContact.cui) {
      doc.text(`CUI: ${billingContact.cui}`, col1X, yPos);
      yPos += 4;
    }
    if (billingContact.regCom) {
      doc.text(`Reg. Com.: ${billingContact.regCom}`, col1X, yPos);
      yPos += 4;
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text(billingContact.name || 'Client nespecificat', col1X, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 5;
  }

  // Adresa
  const address = billingContact.address || {};
  if (address.street || address.city) {
    const addressLine = [address.street, address.city, address.county].filter(Boolean).join(', ');
    doc.text(addressLine || '-', col1X, yPos);
    yPos += 4;
  }

  // Email și telefon
  if (billingContact.email) {
    doc.text(billingContact.email, col1X, yPos);
    yPos += 4;
  }
  if (billingContact.phone) {
    doc.text(billingContact.phone, col1X, yPos);
  }

  // Reset yPos pentru coloana dreapta
  let rightColY = yPos - (billingContact.type === 'company' ? 22 : 13);

  // Detalii factură (coloana dreapta)
  doc.setFontSize(10);

  // Număr factură
  doc.setTextColor(...COLORS.gray);
  doc.text('Număr factură:', col2X, rightColY);
  doc.setTextColor(...COLORS.black);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.invoiceNumber || '-', col2X + 35, rightColY);

  rightColY += 6;

  // Data emiterii
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text('Data emiterii:', col2X, rightColY);
  doc.setTextColor(...COLORS.black);
  doc.text(formatDate(invoice.issuedAt), col2X + 35, rightColY);

  rightColY += 6;

  // Scadența
  doc.setTextColor(...COLORS.gray);
  doc.text('Scadență:', col2X, rightColY);
  doc.setTextColor(...COLORS.black);
  doc.text(formatDate(invoice.dueAt), col2X + 35, rightColY);

  rightColY += 6;

  // Perioada
  doc.setTextColor(...COLORS.gray);
  doc.text('Perioada:', col2X, rightColY);
  doc.setTextColor(...COLORS.black);
  doc.text(formatPeriod(invoice.periodStart, invoice.periodEnd), col2X + 35, rightColY);

  // Dacă e plătită, adaugă data plății
  if (invoice.status === 'paid' && invoice.paidAt) {
    rightColY += 6;
    doc.setTextColor(...COLORS.gray);
    doc.text('Data plății:', col2X, rightColY);
    doc.setTextColor(...COLORS.success);
    doc.text(formatDate(invoice.paidAt), col2X + 35, rightColY);
  }

  yPos = Math.max(yPos, rightColY) + 15;

  // === TABEL SERVICII ===
  // Prepare data pentru tabel
  const tableHeaders = [
    ['Descriere', 'Cantitate', 'Preț unitar', 'Total']
  ];

  const tableData = (invoice.lineItems || []).map(item => [
    item.description,
    `${item.quantity} ap.`,
    formatCurrency(item.unitPrice),
    formatCurrency(item.amount)
  ]);

  // Generează tabel cu autoTable
  doc.autoTable({
    startY: yPos,
    head: tableHeaders,
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: COLORS.black,
      lineColor: COLORS.grayLight,
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: COLORS.grayLight
    }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // === TOTALURI ===
  const totalsX = pageWidth - margin - 80;

  // Subtotal
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  doc.text('Subtotal:', totalsX, yPos);
  doc.setTextColor(...COLORS.black);
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, yPos, { align: 'right' });

  yPos += 6;

  // Discount (dacă există)
  if (invoice.discountPercent > 0) {
    doc.setTextColor(...COLORS.gray);
    doc.text(`Discount (${invoice.discountPercent}%):`, totalsX, yPos);
    doc.setTextColor(...COLORS.success);
    doc.text(`-${formatCurrency(invoice.discountAmount)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
  }

  // TVA (dacă există)
  if (invoice.taxRate > 0) {
    doc.setTextColor(...COLORS.gray);
    doc.text(`TVA (${invoice.taxRate}%):`, totalsX, yPos);
    doc.setTextColor(...COLORS.black);
    doc.text(formatCurrency(invoice.taxAmount), pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
  }

  // Linie separatoare înainte de total
  doc.setDrawColor(...COLORS.gray);
  doc.setLineWidth(0.3);
  doc.line(totalsX, yPos, pageWidth - margin, yPos);

  yPos += 6;

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('TOTAL:', totalsX, yPos);
  doc.setTextColor(...COLORS.primary);
  doc.text(formatCurrency(invoice.totalAmount, invoice.currency), pageWidth - margin, yPos, { align: 'right' });

  yPos += 20;

  // === INFORMAȚII PLATĂ (doar dacă nu e plătită) ===
  if (invoice.status !== 'paid' && invoice.status !== 'cancelled') {
    // Box pentru informații plată
    doc.setFillColor(...COLORS.grayLight);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');

    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('Informații plată:', margin + 5, yPos);

    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.grayDark);

    doc.text(`Beneficiar: ${COMPANY_INFO.legalName}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`Bancă: ${COMPANY_INFO.bankName}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`IBAN: ${COMPANY_INFO.iban}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`Referință plată: ${invoice.invoiceNumber}`, margin + 5, yPos);
  }

  // === FOOTER ===
  const footerY = pageHeight - 15;

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'normal');

  // Linie separatoare
  doc.setDrawColor(...COLORS.grayLight);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  // Text footer
  doc.text(
    `Această factură a fost generată automat de ${COMPANY_INFO.name}. Pentru întrebări: ${COMPANY_INFO.email}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.text(
    `${COMPANY_INFO.website}`,
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  return doc;
};

/**
 * Generează și descarcă PDF pentru o factură
 */
export const downloadInvoicePdf = (invoice) => {
  const doc = generateInvoicePdf(invoice);
  const filename = `Factura_${invoice.invoiceNumber || 'draft'}.pdf`;
  doc.save(filename);
  return filename;
};

/**
 * Generează PDF ca blob (pentru upload sau preview)
 */
export const getInvoicePdfBlob = (invoice) => {
  const doc = generateInvoicePdf(invoice);
  return doc.output('blob');
};

/**
 * Generează PDF ca base64 (pentru email sau storage)
 */
export const getInvoicePdfBase64 = (invoice) => {
  const doc = generateInvoicePdf(invoice);
  return doc.output('datauristring');
};

/**
 * Deschide PDF într-o fereastră nouă (preview)
 */
export const previewInvoicePdf = (invoice) => {
  const doc = generateInvoicePdf(invoice);
  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl, '_blank');
  return pdfUrl;
};

export default generateInvoicePdf;
