import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PDF_COLORS, fixRo, formatLei, formatDateRo, loadLogo, drawHeader, drawTitle, drawSubtitle, drawRightDate, drawSignaturesFooter, TABLE_STYLES,
} from './pdfHelpers';

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

export const generateDistribuieCheltuieliPdf = async ({
  association,
  monthYear,
  consumptionMonth,
  publicationDate,
  distributedExpenses = [],
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
  y = drawTitle(doc, `Distributie cheltuieli - ${monthYear || ''}`, margin, y);
  drawRightDate(doc, publicationDate, pageW, margin, y - 4);
  if (consumptionMonth) y = drawSubtitle(doc, `consum luna ${consumptionMonth}`, margin, y - 1);
  y += 2;

  const body = [];
  let grandTotalFacturi = 0;
  let grandDistribuit = 0;
  let grandDiferenta = 0;

  distributedExpenses.forEach((expense, idx) => {
    const expenseTypeId = expense.expenseTypeId || expense.id;
    const config = (getExpenseConfig && getExpenseConfig(expenseTypeId || expense.name)) || expense;
    const distributionText = formatDistributionType(config, allConfigs);

    const allSuppliers = config.suppliers?.length > 0
      ? config.suppliers.map(s => s.supplierName).filter(Boolean)
      : (config.supplierName ? [config.supplierName] : []);

    const linkedSupplierIds = new Set([
      ...(config.suppliers || []).map(s => s.supplierId).filter(Boolean),
      ...(config.supplierId ? [config.supplierId] : []),
    ]);

    const expenseInvoices = invoices.filter(inv =>
      inv.expenseTypeId === expenseTypeId ||
      inv.distributionHistory?.some(d => d.expenseName === expense.name) ||
      (inv.supplierId && linkedSupplierIds.has(inv.supplierId))
    );

    const totalFacturi = expenseInvoices.reduce(
      (s, inv) => s + (parseFloat(inv.totalInvoiceAmount || inv.totalAmount) || 0),
      0
    );
    const distribuit = expenseInvoices.reduce((s, inv) => {
      const onThisExp = (inv.distributionHistory || [])
        .filter(d => d.expenseName === expense.name && d.amount > 0)
        .reduce((ss, d) => ss + (parseFloat(d.amount) || 0), 0);
      return s + onThisExp;
    }, 0);

    const isConsumption = expense.distributionType === 'consumption' ||
                          expense.distributionType === 'consumption_cumulative' ||
                          expense.isUnitBased;
    const sumaIntrodusa = isConsumption
      ? parseFloat(expense.billAmount) || 0
      : parseFloat(expense.amount) || 0;
    const diferenta = sumaIntrodusa - distribuit;

    grandTotalFacturi += totalFacturi;
    grandDistribuit += distribuit;
    grandDiferenta += diferenta;

    let statusKey = 'OK';
    if (Math.abs(diferenta) > 0.01) statusKey = 'Diferenta';
    if (distribuit === 0) statusKey = 'Nedistribuit';

    body.push([
      { content: String(idx + 1), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: fixRo(expense.name || '-'), styles: { fontStyle: 'bold', textColor: PDF_COLORS.primaryDark } },
      { content: fixRo(distributionText), styles: {} },
      { content: fixRo(allSuppliers.length > 0 ? allSuppliers.join(', ') : '-'), styles: {} },
      { content: String(expenseInvoices.length), styles: { halign: 'center' } },
      { content: formatLei(totalFacturi), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(distribuit), styles: { halign: 'right' } },
      { content: formatLei(diferenta), styles: { halign: 'right', textColor: Math.abs(diferenta) > 0.01 ? (diferenta > 0 ? PDF_COLORS.amber : PDF_COLORS.red) : PDF_COLORS.grayDark } },
      { content: fixRo(statusKey), styles: { halign: 'center', fontSize: 8 } },
    ]);

    expenseInvoices.forEach((inv) => {
      const distOnThis = (inv.distributionHistory || [])
        .filter(d => d.expenseName === expense.name && d.amount > 0)
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
      fixRo('Total facturi'),
      fixRo('Distribuit'),
      fixRo('Diferenta'),
      fixRo('Status'),
    ]],
    body,
    foot: [[
      { content: '', styles: {} },
      { content: fixRo('TOTAL GENERAL'), styles: { fontStyle: 'bold' } },
      { content: fixRo(`${distributedExpenses.length} cheltuieli`), colSpan: 2, styles: {} },
      { content: String(invoices.length), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: formatLei(grandTotalFacturi), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(grandDistribuit), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatLei(grandDiferenta), styles: { halign: 'right', fontStyle: 'bold' } },
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
      8: { cellWidth: 22, halign: 'center' },
    },
    didDrawPage: () => drawSignaturesFooter(doc, association, pageW, pageH, margin),
  });

  return doc;
};

export const downloadDistribuieCheltuieliPdf = async (params) => {
  const doc = await generateDistribuieCheltuieliPdf(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  doc.save(`Distributie_${safeName}_${safeMonth}.pdf`);
};
