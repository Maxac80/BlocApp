import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PDF_COLORS, fixRo, formatLei, loadLogo, drawHeader, drawTitle, drawSubtitle, drawRightDate, drawSignaturesFooter, TABLE_STYLES,
} from './pdfHelpers';

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

export const generateApartamentePdf = async ({
  association,
  monthYear,
  consumptionMonth,
  publicationDate,
  apartments = [],
  blocks = [],
  stairs = [],
}) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  const logo = await loadLogo();

  let y = drawHeader(doc, { association, logo, blocks, stairs, pageW, margin });
  y = drawTitle(doc, `Structura apartamente${monthYear ? ' - ' + monthYear : ''}`, margin, y);
  drawRightDate(doc, publicationDate, pageW, margin, y - 4);
  if (consumptionMonth) y = drawSubtitle(doc, `consum luna ${consumptionMonth}`, margin, y - 1);
  y += 2;

  const sortedApts = sortApartments(apartments, blocks, stairs);
  let totalPersons = 0;
  let totalSurface = 0;
  let totalCota = 0;
  let countWithSurface = 0;

  const body = sortedApts.map((apt, idx) => {
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

    return [
      { content: String(idx + 1), styles: { halign: 'center' } },
      { content: fixRo(bloc?.name || '-'), styles: { halign: 'center' } },
      { content: fixRo(stair?.name || '-'), styles: { halign: 'center' } },
      { content: fixRo(String(apt.number || '-')), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: fixRo(apt.owner || '-'), styles: { fontStyle: 'bold', textColor: PDF_COLORS.primaryDark } },
      { content: String(persons), styles: { halign: 'center' } },
      { content: fixRo(apt.apartmentType || '-'), styles: {} },
      { content: isNaN(surface) ? '-' : surface.toFixed(2), styles: { halign: 'right' } },
      { content: fixRo(apt.heatingSource || '-'), styles: {} },
      { content: isNaN(cota) ? '-' : cota.toFixed(4), styles: { halign: 'right' } },
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [[
      fixRo('Nr.'),
      fixRo('Bloc'),
      fixRo('Scara'),
      fixRo('Ap.'),
      fixRo('Proprietar'),
      fixRo('Persoane'),
      fixRo('Tip'),
      fixRo('Suprafata (mp)'),
      fixRo('Sursa incalzire'),
      fixRo('Cota parte'),
    ]],
    body,
    foot: [[
      { content: '', styles: {} },
      { content: fixRo('TOTAL'), colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: String(sortedApts.length), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: fixRo(`${blocks.length} bloc${blocks.length !== 1 ? 'uri' : ''} - ${stairs.length} sc.`), styles: {} },
      { content: String(totalPersons), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '', styles: {} },
      { content: countWithSurface > 0 ? totalSurface.toFixed(2) : '', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', styles: {} },
      { content: totalCota > 0 ? totalCota.toFixed(4) : '', styles: { halign: 'right', fontStyle: 'bold' } },
    ]],
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 22 },
    styles: TABLE_STYLES.styles,
    headStyles: TABLE_STYLES.headStyles,
    footStyles: TABLE_STYLES.footStyles,
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 'auto', halign: 'left' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 26, halign: 'left' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 30, halign: 'left' },
      9: { cellWidth: 22, halign: 'right' },
    },
    didDrawPage: () => drawSignaturesFooter(doc, association, pageW, pageH, margin),
  });

  return doc;
};

export const downloadApartamentePdf = async (params) => {
  const doc = await generateApartamentePdf(params);
  const safeName = (params.association?.name || 'Asociatie').replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = (params.monthYear || '').replace(/\s+/g, '_');
  doc.save(`Apartamente_${safeName}_${safeMonth}.pdf`);
};
