import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PDF_COLORS, fixRo, formatLei, loadLogo, drawHeader, drawTitle, drawSubtitle, drawRightDate, drawSignaturesFooter, TABLE_STYLES,
} from './pdfHelpers';

/**
 * Generator PDF pentru pagina Furnizori (A4 landscape).
 * Coloane: Nr | Furnizor / Factură | Cheltuieli / Distribuție | Total | Distribuit | Rămas | Status
 */

const sortSuppliers = (suppliers, expenseTypes, getSupplierExpenseTypes) => {
  const expenseOrder = new Map();
  expenseTypes.forEach((exp, idx) => expenseOrder.set(exp.name, idx));

  const getOrderKey = (supplier) => {
    const supplierExpenses = getSupplierExpenseTypes(supplier.id);
    if (supplierExpenses.length === 0) return Number.MAX_SAFE_INTEGER;
    const indices = supplierExpenses.map(name => expenseOrder.get(name)).filter(idx => idx !== undefined);
    return indices.length > 0 ? Math.min(...indices) : Number.MAX_SAFE_INTEGER;
  };

  return [...suppliers].sort((a, b) => {
    const ka = getOrderKey(a);
    const kb = getOrderKey(b);
    if (ka !== kb) return ka - kb;
    return (a.name || '').localeCompare(b.name || '', 'ro');
  });
};

const computeInvoiceStatus = (invoice) => {
  const total = parseFloat(invoice.totalInvoiceAmount || invoice.totalAmount) || 0;
  const distHistory = (invoice.distributionHistory || []).filter(d => d.amount > 0);
  const distributed = distHistory.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const remaining = total - distributed;
  const isFull = remaining <= 0.01 && distributed > 0;
  const status = isFull ? 'full' : distributed > 0 ? 'partial' : 'none';
  return { total, distributed, remaining, status, distHistory };
};

const computeSupplierStatus = (expenseTypes, sheet, supplierInvoices) => {
  if (expenseTypes.length === 0) return 'no_expenses';
  const distributedExpenses = sheet?.expenses || [];
  const distributedCount = expenseTypes.filter(name =>
    distributedExpenses.some(exp => exp.name === name)
  ).length;
  if (distributedCount === expenseTypes.length) return 'full';
  if (distributedCount > 0) return 'partial';
  if (supplierInvoices.length === 0) return 'no_invoices';
  return 'undistributed';
};

const STATUS_LABELS = {
  full: 'Distribuit',
  partial: 'Partial',
  undistributed: 'Nedistribuit',
  no_invoices: 'Fara facturi',
  no_expenses: 'Fara cheltuieli',
};
const INVOICE_STATUS_LABELS = {
  full: 'Distribuita',
  partial: 'Partial',
  none: 'Nedistribuita',
};

export const generateFurnizoriPdf = async ({
  association,
  monthYear,
  consumptionMonth,
  publicationDate,
  suppliers = [],
  invoices = [],
  expenseTypes = [],
  activeSheet,
  getSupplierExpenseTypes,
  blocks = [],
  stairs = [],
}) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  const logo = await loadLogo();

  let y = drawHeader(doc, { association, logo, blocks, stairs, pageW, margin });
  y = drawTitle(doc, `Lista furnizori - ${monthYear || ''}`, margin, y);
  drawRightDate(doc, publicationDate, pageW, margin, y - 4);
  if (consumptionMonth) y = drawSubtitle(doc, `consum luna ${consumptionMonth}`, margin, y - 1);
  y += 2;

  const sortedSuppliers = sortSuppliers(suppliers, expenseTypes, getSupplierExpenseTypes);

  const body = [];
  let supplierIdx = 0;
  let grandTotal = 0;
  let grandDistributed = 0;
  let grandRemaining = 0;

  sortedSuppliers.forEach((supplier) => {
    const supplierExpenses = getSupplierExpenseTypes(supplier.id);
    const supplierInvoices = invoices.filter(inv => inv.supplierId === supplier.id);

    let supplierTotal = 0;
    let supplierDistributed = 0;
    supplierInvoices.forEach(inv => {
      const { total, distributed } = computeInvoiceStatus(inv);
      supplierTotal += total;
      supplierDistributed += distributed;
    });
    const supplierRemaining = supplierTotal - supplierDistributed;
    const supplierStatus = computeSupplierStatus(supplierExpenses, activeSheet, supplierInvoices);
    const isInactive = supplierStatus === 'no_invoices' || supplierStatus === 'no_expenses';

    grandTotal += supplierTotal;
    grandDistributed += supplierDistributed;
    grandRemaining += supplierRemaining;
    supplierIdx++;

    // Rând furnizor
    body.push([
      { content: String(supplierIdx), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: fixRo(supplier.name || '-'), styles: { fontStyle: 'bold', textColor: isInactive ? PDF_COLORS.gray : PDF_COLORS.primaryDark } },
      { content: fixRo(supplierExpenses.length > 0 ? supplierExpenses.join(', ') : '-'), styles: { textColor: isInactive ? PDF_COLORS.gray : PDF_COLORS.grayDark } },
      { content: formatLei(supplierTotal), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(supplierDistributed), styles: { halign: 'right' } },
      { content: formatLei(supplierRemaining), styles: { halign: 'right', textColor: supplierRemaining > 0.01 ? PDF_COLORS.orange : PDF_COLORS.grayDark } },
      { content: fixRo(STATUS_LABELS[supplierStatus]), styles: { halign: 'center', fontStyle: 'bold', fillColor: isInactive ? PDF_COLORS.grayLight : PDF_COLORS.primaryLight } },
    ]);

    if (supplierInvoices.length === 0) {
      body.push([
        { content: '', colSpan: 0 },
        { content: fixRo('   (fara facturi in luna curenta)'), colSpan: 6, styles: { fontStyle: 'italic', textColor: PDF_COLORS.gray, halign: 'left' } },
      ]);
    } else {
      supplierInvoices.forEach((inv) => {
        const { total, distributed, remaining, status, distHistory } = computeInvoiceStatus(inv);
        const hasMultiple = distHistory.length > 1;
        const firstDistText = !hasMultiple && distHistory.length === 1
          ? `${distHistory[0].expenseName}: ${formatLei(parseFloat(distHistory[0].amount) || 0)} lei`
          : (distHistory.length === 0 ? '-' : '');

        body.push([
          { content: '', styles: {} },
          { content: fixRo(`   - Nr. ${inv.invoiceNumber || '-'}`), styles: { textColor: PDF_COLORS.grayDark, fontSize: 8 } },
          { content: fixRo(firstDistText), styles: { textColor: PDF_COLORS.grayDark, fontSize: 8 } },
          { content: formatLei(total), styles: { halign: 'right', fontSize: 8 } },
          { content: formatLei(distributed), styles: { halign: 'right', fontSize: 8 } },
          { content: formatLei(remaining), styles: { halign: 'right', fontSize: 8, textColor: remaining > 0.01 ? PDF_COLORS.orange : PDF_COLORS.grayDark } },
          { content: fixRo(INVOICE_STATUS_LABELS[status]), styles: { halign: 'center', fontSize: 8 } },
        ]);

        if (hasMultiple) {
          distHistory.forEach((d) => {
            const amount = parseFloat(d.amount) || 0;
            body.push([
              { content: '', styles: {} },
              { content: '', styles: {} },
              { content: fixRo(`      ${d.expenseName}`), styles: { fontSize: 7.5, textColor: PDF_COLORS.gray, fontStyle: 'italic' } },
              { content: '', styles: {} },
              { content: formatLei(amount), styles: { halign: 'right', fontSize: 7.5, textColor: PDF_COLORS.gray, fontStyle: 'italic' } },
              { content: '', styles: {} },
              { content: '', styles: {} },
            ]);
          });
        }
      });
    }
  });

  autoTable(doc, {
    startY: y,
    head: [[
      fixRo('Nr.'),
      fixRo('Furnizor / Factura'),
      fixRo('Cheltuieli / Distributie'),
      fixRo('Total'),
      fixRo('Distribuit'),
      fixRo('Ramas'),
      fixRo('Status'),
    ]],
    body,
    foot: [[
      { content: '', styles: {} },
      { content: fixRo('TOTAL GENERAL'), styles: { fontStyle: 'bold' } },
      { content: fixRo(`${sortedSuppliers.length} furnizori - ${invoices.length} facturi`), styles: {} },
      { content: formatLei(grandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(grandDistributed), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(grandRemaining), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', styles: {} },
    ]],
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 22 },
    styles: TABLE_STYLES.styles,
    headStyles: TABLE_STYLES.headStyles,
    footStyles: TABLE_STYLES.footStyles,
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 50, halign: 'left' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 28, halign: 'center' },
    },
    didDrawPage: () => drawSignaturesFooter(doc, association, pageW, pageH, margin),
  });

  return doc;
};

export const downloadFurnizoriPdf = async (params) => {
  const doc = await generateFurnizoriPdf(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  doc.save(`Furnizori_${safeName}_${safeMonth}.pdf`);
};
