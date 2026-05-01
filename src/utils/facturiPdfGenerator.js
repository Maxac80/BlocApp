import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PDF_COLORS, fixRo, formatLei, formatDateRo, loadLogo, drawHeader, drawTitle, drawSubtitle, drawRightDate, drawSignaturesFooter, TABLE_STYLES,
} from './pdfHelpers';

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

const DIST_LABELS = { full: 'Distribuita', partial: 'Partial', none: 'Nedistribuita' };
const PAY_LABELS = { paid: 'Platita', unpaid: 'Neplatita', overdue: 'Scadenta' };

const sortInvoices = (invoices, expenseTypes, getSupplierExpenseNames) => {
  const expenseOrder = new Map();
  expenseTypes.forEach((exp, idx) => expenseOrder.set(exp.name, idx));

  const getOrderKey = (invoice) => {
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

export const generateFacturiPdf = async ({
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
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  const logo = await loadLogo();

  let y = drawHeader(doc, { association, logo, blocks, stairs, pageW, margin });
  y = drawTitle(doc, `Lista facturi - ${monthYear || ''}`, margin, y);
  drawRightDate(doc, publicationDate, pageW, margin, y - 4);
  if (consumptionMonth) y = drawSubtitle(doc, `consum luna ${consumptionMonth}`, margin, y - 1);
  y += 2;

  const sortedInvoices = sortInvoices(invoices, expenseTypes, getSupplierExpenseNames);

  const body = [];
  let grandTotal = 0;
  let grandDistributed = 0;
  let grandRemaining = 0;

  sortedInvoices.forEach((invoice, idx) => {
    const { total, distributed, remaining, distStatus, payStatus, distHistory } = computeInvoiceStatus(invoice);
    const hasMultiple = distHistory.length > 1;
    const firstDistText = !hasMultiple && distHistory.length === 1
      ? distHistory[0].expenseName
      : (distHistory.length === 0 ? '-' : '');

    grandTotal += total;
    grandDistributed += distributed;
    grandRemaining += remaining;

    body.push([
      { content: String(idx + 1), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: fixRo(invoice.invoiceNumber || '-'), styles: { fontStyle: 'bold', textColor: PDF_COLORS.primaryDark } },
      { content: fixRo(invoice.supplierName || '-'), styles: { fontStyle: 'bold' } },
      { content: invoice.invoiceDate ? formatDateRo(invoice.invoiceDate) : '-', styles: { halign: 'center' } },
      { content: fixRo(firstDistText), styles: {} },
      { content: formatLei(total), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(distributed), styles: { halign: 'right' } },
      { content: formatLei(remaining), styles: { halign: 'right', textColor: remaining > 0.01 ? PDF_COLORS.orange : PDF_COLORS.grayDark } },
      { content: fixRo(DIST_LABELS[distStatus]), styles: { halign: 'center', fontSize: 8 } },
      { content: fixRo(PAY_LABELS[payStatus]), styles: { halign: 'center', fontSize: 8 } },
    ]);

    if (hasMultiple) {
      distHistory.forEach((d) => {
        const amount = parseFloat(d.amount) || 0;
        body.push([
          { content: '', styles: {} },
          { content: '', styles: {} },
          { content: '', styles: {} },
          { content: '', styles: {} },
          { content: fixRo(`      ${d.expenseName}`), styles: { fontSize: 7.5, textColor: PDF_COLORS.gray, fontStyle: 'italic' } },
          { content: '', styles: {} },
          { content: formatLei(amount), styles: { halign: 'right', fontSize: 7.5, textColor: PDF_COLORS.gray, fontStyle: 'italic' } },
          { content: '', styles: {} },
          { content: '', styles: {} },
          { content: '', styles: {} },
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: y,
    head: [[
      fixRo('Nr.'),
      fixRo('Nr. factura'),
      fixRo('Furnizor'),
      fixRo('Data'),
      fixRo('Cheltuieli / Distributie'),
      fixRo('Total'),
      fixRo('Distribuit'),
      fixRo('Ramas'),
      fixRo('Distrib.'),
      fixRo('Plata'),
    ]],
    body,
    foot: [[
      { content: '', styles: {} },
      { content: fixRo('TOTAL GENERAL'), styles: { fontStyle: 'bold' } },
      { content: fixRo(`${sortedInvoices.length} facturi`), colSpan: 3, styles: {} },
      { content: formatLei(grandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(grandDistributed), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(grandRemaining), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', styles: {} },
      { content: '', styles: {} },
    ]],
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 22 },
    styles: TABLE_STYLES.styles,
    headStyles: TABLE_STYLES.headStyles,
    footStyles: TABLE_STYLES.footStyles,
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25, halign: 'left' },
      2: { cellWidth: 38, halign: 'left' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 'auto', halign: 'left' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 22, halign: 'center' },
      9: { cellWidth: 18, halign: 'center' },
    },
    didDrawPage: () => drawSignaturesFooter(doc, association, pageW, pageH, margin),
  });

  return doc;
};

export const downloadFacturiPdf = async (params) => {
  const doc = await generateFacturiPdf(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  doc.save(`Facturi_${safeName}_${safeMonth}.pdf`);
};
