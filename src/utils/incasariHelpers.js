import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateDetailedReceipt } from './receiptGenerator';

export const regenerateReceipt = async (incasare, apartments, association, monthHint, blocks = [], stairs = [], cashierName = '', cashierRole = '', consumptionMonthFallback = '') => {
  const apartment = apartments.find((apt) => apt.id === incasare.apartmentId);
  if (!apartment) {
    return { success: false, error: 'Apartament negăsit' };
  }

  const stair = stairs.find((s) => String(s.id) === String(apartment.stairId));
  const bloc = blocks.find((b) => String(b.id) === String(stair?.blockId || apartment.blocId));

  const payment = {
    apartmentId: incasare.apartmentId,
    restante: incasare.restante,
    intretinere: incasare.intretinere,
    penalitati: incasare.penalitati,
    total: incasare.total,
    timestamp: incasare.timestamp,
    month: incasare.month || monthHint || '',
    consumptionMonth: incasare.consumptionMonth || consumptionMonthFallback || '',
    receiptNumber: incasare.receiptNumber
  };

  const apartmentData = {
    apartmentNumber: apartment.number,
    owner: apartment.owner || incasare.owner,
    persons: apartment.persons,
    blockName: bloc?.name || '',
    stairName: stair?.name || '',
    totalDatorat: incasare.restante + incasare.intretinere + incasare.penalitati,
    restante: incasare.restante,
    intretinere: incasare.intretinere,
    penalitati: incasare.penalitati
  };

  const associationData = {
    name: association?.name || 'Asociația Proprietarilor',
    cui: association?.cui || '',
    address: association?.address || '',
    bankAccount: association?.bankAccount || '',
    bank: association?.bank || '',
    administrator: association?.administrator || '',
    cashier: cashierName || incasare.recordedBy?.name || '',
    cashierRole: cashierRole || incasare.recordedBy?.role || ''
  };

  try {
    return await generateDetailedReceipt(payment, apartmentData, associationData);
  } catch (error) {
    console.error('Eroare la regenerarea chitanței:', error);
    return { success: false, error: error.message };
  }
};

export const generateMonthlyReport = ({
  currentMonth,
  association,
  stats,
  filteredIncasari,
  apartments,
  unpaidApartments
}) => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Raport Încasări - ${currentMonth}`, 14, 20);
  doc.setFontSize(12);
  doc.text(association?.name || '', 14, 28);

  doc.setFontSize(10);
  doc.text(`Total încasat: ${stats.totalAmount.toFixed(2)} lei`, 14, 40);
  doc.text(`Apartamente plătite: ${stats.paidApartments} din ${stats.totalApartments}`, 14, 46);
  doc.text(`Procent încasare: ${stats.percentagePaid}%`, 14, 52);

  const tableData = filteredIncasari.map((inc) => {
    const apartment = apartments.find((apt) => apt.id === inc.apartmentId);
    return [
      apartment?.number || '-',
      apartment?.owner || '-',
      inc.restante.toFixed(2),
      inc.intretinere.toFixed(2),
      inc.penalitati.toFixed(2),
      inc.total.toFixed(2),
      new Date(inc.timestamp).toLocaleDateString('ro-RO'),
      inc.receiptNumber || '-'
    ];
  });

  doc.autoTable({
    head: [['Ap.', 'Proprietar', 'Restanțe', 'Întreținere', 'Penalități', 'Total', 'Data', 'Chitanță']],
    body: tableData,
    startY: 60,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });

  if (unpaidApartments && unpaidApartments.length > 0) {
    const finalY = doc.lastAutoTable?.finalY || 60;
    doc.setFontSize(12);
    doc.text('Apartamente care nu au plătit:', 14, finalY + 10);

    const unpaidData = unpaidApartments.map((apt) => [
      apt.number,
      apt.owner || '-',
      apt.phone || '-'
    ]);

    doc.autoTable({
      head: [['Ap.', 'Proprietar', 'Telefon']],
      body: unpaidData,
      startY: finalY + 15,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] }
    });
  }

  doc.save(`Raport_Incasari_${(currentMonth || '').replace(' ', '_')}.pdf`);
};
