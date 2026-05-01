import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PDF_COLORS, fixRo, formatLei, formatDateRo, loadLogo, drawHeader, drawTitle, drawSubtitle, drawRightDate, drawSignaturesFooter, TABLE_STYLES,
} from './pdfHelpers';

const STATUS_LABELS = {
  full: 'Distribuita',
  partial: 'Partial',
  none: 'Nedistribuita',
  no_supplier: 'Fara furnizor',
};

const formatDistributionType = (config, allConfigs = {}) => {
  const t = config?.distributionType;
  if (t === 'apartment') return 'Pe apartament';
  if (t === 'individual') return 'Sume individuale';
  if (t === 'person') return 'Pe persoana';
  if (t === 'cotaParte') return 'Pe cota parte';
  if (t === 'consumption_cumulative') {
    const srcIds = config.cumulativeFromExpenseTypeIds || [];
    const srcNames = srcIds.map(id => allConfigs[id]?.name).filter(Boolean).join(' + ');
    return srcNames ? `Pe consum cumulat (${srcNames})` : 'Pe consum cumulat';
  }
  return 'Pe consum';
};

export const generateCheltuieliPdf = async ({
  association,
  monthYear,
  consumptionMonth,
  publicationDate,
  expenseTypes = [],
  getExpenseConfig,
  invoices = [],
  activeSheet,
  blocks = [],
  stairs = [],
}) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  const logo = await loadLogo();
  const allConfigs = activeSheet?.configSnapshot?.expenseConfigurations || {};

  let y = drawHeader(doc, { association, logo, blocks, stairs, pageW, margin });
  y = drawTitle(doc, `Configurare cheltuieli - ${monthYear || ''}`, margin, y);
  drawRightDate(doc, publicationDate, pageW, margin, y - 4);
  if (consumptionMonth) y = drawSubtitle(doc, `consum luna ${consumptionMonth}`, margin, y - 1);
  y += 2;

  const body = [];
  let grandTotal = 0;
  let grandDistributed = 0;
  let grandRemaining = 0;

  expenseTypes.forEach((expenseType, idx) => {
    const config = (getExpenseConfig && getExpenseConfig(expenseType.id || expenseType.name)) || {};
    const distributionText = formatDistributionType(config, allConfigs);
    const allSuppliers = config.suppliers?.length > 0
      ? config.suppliers.map(s => s.supplierName).filter(Boolean)
      : (config.supplierName ? [config.supplierName] : []);
    const hasSupplier = allSuppliers.length > 0;
    const linkedSupplierIds = new Set([
      ...(config.suppliers || []).map(s => s.supplierId).filter(Boolean),
      ...(config.supplierId ? [config.supplierId] : []),
    ]);

    const expenseInvoices = invoices.filter(inv =>
      inv.expenseTypeId === expenseType.id ||
      inv.distributionHistory?.some(d => d.expenseName === expenseType.name) ||
      (inv.supplierId && linkedSupplierIds.has(inv.supplierId))
    );

    let totalForExpense = 0;
    let distributedForExpense = 0;
    expenseInvoices.forEach(inv => {
      const distHistory = (inv.distributionHistory || []).filter(d => d.amount > 0);
      const distOnThis = distHistory
        .filter(d => d.expenseName === expenseType.name)
        .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      distributedForExpense += distOnThis;
      totalForExpense += parseFloat(inv.totalInvoiceAmount || inv.totalAmount) || 0;
    });
    const remainingForExpense = totalForExpense - distributedForExpense;

    let statusKey = 'none';
    if (!hasSupplier) statusKey = 'no_supplier';
    else if (distributedForExpense > 0 && remainingForExpense <= 0.01) statusKey = 'full';
    else if (distributedForExpense > 0) statusKey = 'partial';

    const isInactive = !hasSupplier || expenseInvoices.length === 0;

    grandTotal += totalForExpense;
    grandDistributed += distributedForExpense;
    grandRemaining += remainingForExpense;

    body.push([
      { content: String(idx + 1), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: fixRo(expenseType.name + (expenseType.isCustom ? ' (custom)' : '')), styles: { fontStyle: 'bold', textColor: isInactive ? PDF_COLORS.gray : PDF_COLORS.primaryDark } },
      { content: fixRo(distributionText), styles: {} },
      { content: fixRo(hasSupplier ? allSuppliers.join(', ') : '-'), styles: { textColor: isInactive ? PDF_COLORS.gray : PDF_COLORS.grayDark } },
      { content: String(expenseInvoices.length), styles: { halign: 'center' } },
      { content: formatLei(totalForExpense), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(distributedForExpense), styles: { halign: 'right' } },
      { content: formatLei(remainingForExpense), styles: { halign: 'right', textColor: remainingForExpense > 0.01 && !isInactive ? PDF_COLORS.orange : PDF_COLORS.grayDark } },
      { content: fixRo(STATUS_LABELS[statusKey]), styles: { halign: 'center', fontSize: 8 } },
    ]);

    expenseInvoices.forEach((inv) => {
      const distHistory = (inv.distributionHistory || []).filter(d => d.amount > 0);
      const distOnThis = distHistory
        .filter(d => d.expenseName === expenseType.name)
        .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      body.push([
        { content: '', styles: {} },
        { content: fixRo(`   - Nr. ${inv.invoiceNumber || '-'}`), styles: { fontSize: 8 } },
        { content: inv.invoiceDate ? formatDateRo(inv.invoiceDate) : '', styles: { fontSize: 8 } },
        { content: fixRo(inv.supplierName || '-'), styles: { fontSize: 8 } },
        { content: '', styles: {} },
        { content: formatLei(parseFloat(inv.totalInvoiceAmount || inv.totalAmount) || 0), styles: { halign: 'right', fontSize: 8 } },
        { content: formatLei(distOnThis), styles: { halign: 'right', fontSize: 8 } },
        { content: '', styles: {} },
        { content: '', styles: {} },
      ]);
    });
  });

  autoTable(doc, {
    startY: y,
    head: [[
      fixRo('Nr.'),
      fixRo('Cheltuiala'),
      fixRo('Mod distributie'),
      fixRo('Furnizori'),
      fixRo('Facturi'),
      fixRo('Total'),
      fixRo('Distribuit'),
      fixRo('Ramas'),
      fixRo('Status'),
    ]],
    body,
    foot: [[
      { content: '', styles: {} },
      { content: fixRo('TOTAL GENERAL'), styles: { fontStyle: 'bold' } },
      { content: fixRo(`${expenseTypes.length} cheltuieli`), colSpan: 2, styles: {} },
      { content: String(invoices.length), styles: { halign: 'center', fontStyle: 'bold' } },
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
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 38, halign: 'left' },
      2: { cellWidth: 35, halign: 'left' },
      3: { cellWidth: 'auto', halign: 'left' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 24, halign: 'center' },
    },
    didDrawPage: () => drawSignaturesFooter(doc, association, pageW, pageH, margin),
  });

  return doc;
};

export const downloadCheltuieliPdf = async (params) => {
  const doc = await generateCheltuieliPdf(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  doc.save(`Cheltuieli_${safeName}_${safeMonth}.pdf`);
};
