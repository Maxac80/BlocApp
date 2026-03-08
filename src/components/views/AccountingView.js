/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Coins, Download, Eye, Search, FileText, TrendingUp, AlertCircle, Receipt, CreditCard, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useIncasari } from '../../hooks/useIncasari';
import useExpenseConfigurations from '../../hooks/useExpenseConfigurations';
import { generateDetailedReceipt } from '../../utils/receiptGenerator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AccountingView = ({
  association,
  blocks = [],
  stairs = [],
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses,
  isMonthReadOnly,
  getAssociationApartments,
  handleNavigation,
  getMonthType,
  publishedSheet,
  sheets = [],
  // Props pentru facturi
  invoices,
  getInvoicesByMonth,
  getInvoiceStats,
  markInvoiceAsPaid,
  markInvoiceAsUnpaid,
  updateMissingSuppliersForExistingInvoices
}) => {
  const apartments = getAssociationApartments();

  // Găsește sheet-ul pentru luna selectată în currentMonth
  // Încasările pot fi înregistrate doar pe luni publicate, dar putem VIZUALIZA și pe luni arhivate
  const currentMonthSheet = sheets.find(
    sheet => sheet.monthYear === currentMonth &&
             (sheet.status === 'PUBLISHED' || sheet.status === 'published' || sheet.status === 'archived')
  ) || null;

  console.log('📊 AccountingView - Sheet Detection:', {
    currentMonth,
    totalSheets: sheets.length,
    publishedSheetMonth: publishedSheet?.monthYear,
    allSheets: sheets.map(s => ({ month: s.monthYear, status: s.status, payments: s.payments?.length || 0 })),
    foundSheetForCurrentMonth: currentMonthSheet ? {
      month: currentMonthSheet.monthYear,
      paymentsCount: currentMonthSheet.payments?.length || 0
    } : null
  });

  const {
    incasari,
    loading,
    error,
    getIncasariStats,
    generateReceiptNumber,
    deleteIncasare
  } = useIncasari(association, currentMonth, currentMonthSheet);

  console.log('💰 useIncasari result:', {
    incasariCount: incasari.length,
    loading,
    error,
    currentMonth,
    hasSheet: !!currentMonthSheet
  });

  // Hook pentru obținerea configurațiilor de cheltuieli (pentru furnizori)
  const { getExpenseConfig } = useExpenseConfigurations(association?.id);

  const [activeTab, setActiveTab] = useState('incasari'); // 'incasari' sau 'facturi'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, unpaid
  const [selectedIncasare, setSelectedIncasare] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Obține statisticile
  const stats = getIncasariStats(apartments);
  
  // Statistici facturi pentru luna curentă
  const monthlyInvoices = getInvoicesByMonth ? getInvoicesByMonth(currentMonth) : [];

  // Calculează statisticile local pe baza facturilor lunii curente
  const invoiceStats = {
    total: monthlyInvoices.length,
    paid: monthlyInvoices.filter(inv => inv.isPaid).length,
    unpaid: monthlyInvoices.filter(inv => !inv.isPaid).length,
    overdue: monthlyInvoices.filter(inv => !inv.isPaid && new Date(inv.dueDate) < new Date()).length,
    totalAmount: monthlyInvoices.reduce((sum, inv) => sum + (inv.totalInvoiceAmount || inv.totalAmount || 0), 0),
    paidAmount: monthlyInvoices.filter(inv => inv.isPaid).reduce((sum, inv) => sum + (inv.totalInvoiceAmount || inv.totalAmount || 0), 0),
    unpaidAmount: monthlyInvoices.filter(inv => !inv.isPaid).reduce((sum, inv) => sum + (inv.totalInvoiceAmount || inv.totalAmount || 0), 0)
  };

  // DEBUG: Log pentru facturile din luna curentă
  // console.log('🔍 AccountingView DEBUG:', {
  //   currentMonth,
  //   currentMonthType: typeof currentMonth,
  //   totalInvoices: invoices?.length || 0,
  //   monthlyInvoicesCount: monthlyInvoices.length,
  //   getInvoicesByMonthExists: !!getInvoicesByMonth,
  //   allInvoicesMonths: invoices?.map(inv => inv.month) || [],
  //   monthlyInvoices: monthlyInvoices.map(inv => ({
  //     id: inv.id,
  //     month: inv.month,
  //     invoiceNumber: inv.invoiceNumber,
  //     supplierName: inv.supplierName,
  //     supplierId: inv.supplierId,
  //     totalAmount: inv.totalAmount,
  //     totalInvoiceAmount: inv.totalInvoiceAmount,
  //     isPaid: inv.isPaid
  //   })),
  //   invoiceStats
  // });
  
  // DEBUG: Loghează fiecare factură în detaliu
  monthlyInvoices.forEach(invoice => {
    // console.log(`🧾 Factură ${invoice.invoiceNumber}:`, {
    //   supplierName: invoice.supplierName,
    //   supplierId: invoice.supplierId,
    //   hasSupplierName: !!invoice.supplierName,
    //   supplierNameLength: invoice.supplierName?.length
    // });
  });


  // Filtrează și sortează încasările
  const filteredIncasari = incasari
    .filter(inc => {
      const apartment = apartments.find(apt => apt.id === inc.apartmentId);
      if (!apartment) return false;
      
      const matchesSearch = 
        apartment.number.toString().includes(searchTerm) ||
        apartment.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.receiptNumber?.toString().includes(searchTerm);
      
      return matchesSearch;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Filtrează facturile
  const filteredInvoices = monthlyInvoices.filter(invoice => {
    const matchesSearch =
      invoice.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.expenseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.expenseType?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'paid' && invoice.isPaid) ||
      (filterStatus === 'unpaid' && !invoice.isPaid);

    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  // Obține apartamentele care nu au plătit
  const unpaidApartments = apartments.filter(apt => 
    !incasari.some(inc => inc.apartmentId === apt.id)
  );

  // Generează raport PDF pentru toate încasările
  const generateMonthlyReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text(`Raport Încasări - ${currentMonth}`, 14, 20);
    doc.setFontSize(12);
    doc.text(association.name, 14, 28);
    
    // Statistici
    doc.setFontSize(10);
    doc.text(`Total încasat: ${stats.totalAmount.toFixed(2)} lei`, 14, 40);
    doc.text(`Apartamente plătite: ${stats.paidApartments} din ${stats.totalApartments}`, 14, 46);
    doc.text(`Procent încasare: ${stats.percentagePaid}%`, 14, 52);
    
    // Tabel încasări
    const tableData = filteredIncasari.map(inc => {
      const apartment = apartments.find(apt => apt.id === inc.apartmentId);
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
    
    // Lista apartamente neplătite
    if (unpaidApartments.length > 0) {
      const finalY = doc.lastAutoTable.finalY || 60;
      doc.setFontSize(12);
      doc.text('Apartamente care nu au plătit:', 14, finalY + 10);
      
      const unpaidData = unpaidApartments.map(apt => [
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
    
    doc.save(`Raport_Incasari_${currentMonth.replace(' ', '_')}.pdf`);
  };

  // Regenerează chitanța pentru o încasare
  const regenerateReceipt = (incasare) => {
    const apartment = apartments.find(apt => apt.id === incasare.apartmentId);
    if (!apartment) {
      alert('Nu s-a găsit apartamentul pentru această încasare');
      return;
    }

    const payment = {
      apartmentId: incasare.apartmentId,
      restante: incasare.restante,
      intretinere: incasare.intretinere,
      penalitati: incasare.penalitati,
      total: incasare.total,
      timestamp: incasare.timestamp,
      month: incasare.month,
      receiptNumber: incasare.receiptNumber
    };

    const apartmentData = {
      apartmentNumber: apartment.number,
      owner: apartment.owner || incasare.owner,
      totalDatorat: incasare.restante + incasare.intretinere + incasare.penalitati,
      restante: incasare.restante,
      intretinere: incasare.intretinere,
      penalitati: incasare.penalitati
    };

    const associationData = {
      name: association.name,
      address: association.address || ""
    };

    try {
      const result = generateDetailedReceipt(payment, apartmentData, associationData);
      if (result.success) {
        alert(`Chitanța a fost regenerată: ${result.fileName}`);
      } else {
        alert(`Eroare la generarea chitanței: ${result.error}`);
      }
    } catch (error) {
      console.error('Eroare la regenerarea chitanței:', error);
      alert('Eroare la regenerarea chitanței');
    }
  };

  // Funcție pentru marcarea facturii ca plătită/neplătită
  const toggleInvoicePaymentStatus = async (invoiceId, currentStatus) => {
    try {
      if (currentStatus) {
        await markInvoiceAsUnpaid(invoiceId);
      } else {
        await markInvoiceAsPaid(invoiceId, {
          paymentMethod: 'Transfer bancar',
          notes: `Plată înregistrată din contabilitate la ${new Date().toLocaleDateString('ro-RO')}`
        });
      }
    } catch (error) {
      console.error('Eroare la actualizarea statusului plată:', error);
      alert('Eroare la actualizarea statusului plată: ' + error.message);
    }
  };

  // Funcție pentru descărcarea PDF-ului Base64
  const handleDownloadPDF = (invoice) => {
    try {
      console.log('📄 Descarcă PDF pentru factura:', invoice.invoiceNumber);
      
      let base64Data = invoice.pdfUrl;
      let fileName = `Factura_${invoice.invoiceNumber}.pdf`;
      
      // Dacă avem pdfData cu informații complete
      if (invoice.pdfData && invoice.pdfData.base64) {
        base64Data = invoice.pdfData.base64;
        fileName = invoice.pdfData.fileName || fileName;
      }
      
      if (!base64Data) {
        alert('PDF-ul nu este disponibil pentru această factură.');
        return;
      }
      
      // Verifică dacă Base64 are header-ul corect
      let cleanBase64 = base64Data;
      if (!base64Data.startsWith('data:')) {
        cleanBase64 = `data:application/pdf;base64,${base64Data}`;
      }
      
      // Creează link pentru download
      const link = document.createElement('a');
      link.href = cleanBase64;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ PDF descărcat:', fileName);
      
    } catch (error) {
      console.error('❌ Eroare la descărcarea PDF-ului:', error);
      alert('Eroare la descărcarea PDF-ului: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Eroare la încărcarea încasărilor: {error}</p>
      </div>
    );
  }


  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="w-full">
        {/* Header standard */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📊 Contabilitate</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('incasari')}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'incasari'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Receipt className="w-4 h-4" />
                Încasări ({stats.totalCount || filteredIncasari.length})
              </button>
              <button
                onClick={() => setActiveTab('facturi')}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'facturi'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Facturi ({invoiceStats.total})
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'incasari' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Statistici Încasări */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Încasat</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-800">
                    {stats.totalAmount.toFixed(2)} lei
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 opacity-50" />
              </div>
            </div>
          
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Apartamente Plătite</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {stats.paidApartments} / {stats.totalApartments}
                        </p>
                      </div>
                      <FileText className="w-8 h-8 text-green-500 opacity-50" />
                    </div>
                  </div>
          
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Procent Încasare</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {stats.percentagePaid}%
                        </p>
                      </div>
                      <div className="w-12 h-12">
                        <svg className="transform -rotate-90 w-12 h-12">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 20}`}
                            strokeDashoffset={`${2 * Math.PI * 20 * (1 - stats.percentagePaid / 100)}`}
                            className="text-yellow-500"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Apartamente Restante</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {stats.unpaidApartments}
                        </p>
                      </div>
                      <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
                    </div>
                  </div>
                </div>

                {/* Bara de căutare și filtre pentru încasări */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Caută după număr apartament, proprietar sau număr chitanță..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <button
                    onClick={generateMonthlyReport}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>Raport PDF</span>
                  </button>
                </div>

                {/* Tabel Încasări */}
                <div className="bg-gray-50 rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ap.
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Proprietar
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Restanțe
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Întreținere
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Penalități
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nr. Chitanță
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acțiuni
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredIncasari.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                              Nu există încasări înregistrate pentru {currentMonth}
                            </td>
                          </tr>
                        ) : (
                filteredIncasari.map((incasare) => {
                  const apartment = apartments.find(apt => apt.id === incasare.apartmentId);
                  return (
                    <tr key={incasare.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {apartment?.number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {apartment?.owner || incasare.owner || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                        {incasare.restante > 0 ? `${incasare.restante.toFixed(2)} lei` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                        {incasare.intretinere > 0 ? `${incasare.intretinere.toFixed(2)} lei` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                        {incasare.penalitati > 0 ? `${incasare.penalitati.toFixed(2)} lei` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        {incasare.total.toFixed(2)} lei
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                        {new Date(incasare.timestamp).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          #{incasare.receiptNumber || generateReceiptNumber()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={() => regenerateReceipt(incasare)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Regenerează chitanța"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedIncasare(incasare);
                            setShowReceiptModal(true);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="Vezi detalii"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'facturi' && (
              <div className="space-y-6">
                {/* Statistici Facturi */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Facturi</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {invoiceStats.totalAmount.toFixed(2)} lei
                        </p>
                      </div>
                      <FileText className="w-8 h-8 text-orange-500 opacity-50" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Facturi Plătite</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {invoiceStats.paid} / {invoiceStats.total}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Neplătite</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {invoiceStats.unpaidAmount.toFixed(2)} lei
                        </p>
                      </div>
                      <XCircle className="w-8 h-8 text-yellow-500 opacity-50" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Restante</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {invoiceStats.overdue}
                        </p>
                      </div>
                      <Calendar className="w-8 h-8 text-red-500 opacity-50" />
                    </div>
                  </div>
                </div>


                {/* Bara de căutare și filtre pentru facturi */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Caută după furnizor, număr factură sau tip cheltuială..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Toate facturile</option>
                    <option value="paid">Plătite</option>
                    <option value="unpaid">Neplătite</option>
                  </select>
                  
                  <button
                    onClick={generateMonthlyReport}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>Raport PDF</span>
                  </button>
                </div>

                {/* Tabel Facturi */}
                <div className="bg-gray-50 rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Furnizor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nr. Factură
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tip Cheltuială
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sumă
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Distribuție
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Detalii Distribuții
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data Factură
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Scadență
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acțiuni
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                              Nu există facturi înregistrate pentru {currentMonth}
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((invoice) => {
                            const isOverdue = !invoice.isPaid && new Date(invoice.dueDate) < new Date();
                            
                            // 🔥 OBȚINE FURNIZORUL DIN CONFIGURAȚIA CHELTUIELII
                            const expenseConfig = getExpenseConfig(invoice.expenseType);
                            const supplierFromConfig = expenseConfig?.supplierName || null;
                            const finalSupplier = supplierFromConfig || invoice.supplierName || 'Fără furnizor';
                            
                            return (
                              <tr key={invoice.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {finalSupplier}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {invoice.invoiceNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {invoice.expenseName || invoice.expenseType || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                  <div>
                                    {(invoice.totalInvoiceAmount || invoice.totalAmount).toFixed(2)} lei
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Total factură
                                  </div>
                                </td>
                                {/* Coloană Distribuție - Compactă */}
                                <td className="px-6 py-4 text-sm text-center">
                                  {(() => {
                                    // Calculează valorile pentru distribuție
                                    const totalInvoice = invoice.totalInvoiceAmount || invoice.totalAmount;
                                    const distributed = invoice.distributedAmount || 0;
                                    const remaining = invoice.remainingAmount || 0;
                                    const isPartial = remaining > 0 || (invoice.totalInvoiceAmount && invoice.totalInvoiceAmount > invoice.totalAmount);
                                    const percentage = totalInvoice > 0 ? Math.round((distributed / totalInvoice) * 100) : 100;

                                    if (isPartial && remaining > 0) {
                                      // Distribuție parțială
                                      return (
                                        <div className="space-y-1">
                                          <div className="text-xs">
                                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                                              {percentage}% distribuit
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {distributed.toFixed(0)} / {totalInvoice.toFixed(0)} lei
                                          </div>
                                          <div className="text-xs text-orange-600 font-medium">
                                            Rămas: {remaining.toFixed(2)} lei
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      // Distribuție completă
                                      return (
                                        <div className="space-y-1">
                                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                            ✅ 100% distribuit
                                          </span>
                                          <div className="text-xs text-gray-600 mt-1">
                                            {distributed.toFixed(0)} / {totalInvoice.toFixed(0)} lei
                                          </div>
                                        </div>
                                      );
                                    }
                                  })()}
                                </td>

                                {/* Coloană Detalii Distribuții - Nouă */}
                                <td className="px-4 py-4 text-sm text-center">
                                  {(() => {
                                    // Filtrează distribuțiile cu amount === 0 (nu ar trebui să apară)
                                    const distributionHistory = (invoice.distributionHistory || [])
                                      .filter(dist => dist.amount && dist.amount > 0);

                                    if (distributionHistory.length === 0) {
                                      return <span className="text-gray-400 text-xs">-</span>;
                                    }

                                    // Determină targetul distribuției (asociație/scară)
                                    const expenseConfig = getExpenseConfig(invoice.expenseName || invoice.expenseType);
                                    let distributionTarget = 'Toată asociația';

                                    if (expenseConfig?.appliesTo) {
                                      const appliesTo = expenseConfig.appliesTo;
                                      if (appliesTo.scope === 'stairs' && appliesTo.stairs?.length > 0) {
                                        const stairNumbers = appliesTo.stairs.map(stairId => {
                                          const stair = stairs.find(s => s.id === stairId);
                                          return stair ? stair.name : stairId;
                                        });
                                        if (stairNumbers.length === 1) {
                                          distributionTarget = `Scara ${stairNumbers[0]}`;
                                        } else {
                                          distributionTarget = `${stairNumbers.length} scări`;
                                        }
                                      } else if (appliesTo.scope === 'bloc' && appliesTo.bloc) {
                                        const bloc = blocks.find(b => b.id === appliesTo.bloc);
                                        distributionTarget = bloc ? `Bloc ${bloc.name}` : 'Bloc';
                                      }
                                    }

                                    if (distributionHistory.length === 1) {
                                      const dist = distributionHistory[0];
                                      return (
                                        <div className="text-xs">
                                          <div className="text-blue-600 font-semibold">{dist.amount} lei</div>
                                          <div className="text-gray-700 font-medium mt-1">{distributionTarget}</div>
                                        </div>
                                      );
                                    }

                                    // Multiple distribuții
                                    return (
                                      <div className="p-2 bg-gray-50 rounded border text-xs">
                                        <div className="font-medium text-gray-700 mb-1">{distributionHistory.length} distribuții:</div>
                                        {distributionHistory.map((dist, idx) => (
                                          <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-0">
                                            <span className="text-gray-600">{dist.expenseName || dist.expenseType || dist.notes}</span>
                                            <span className="font-medium text-blue-600 ml-2">{dist.amount} lei</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                                  {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${
                                  isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                                }`}>
                                  {new Date(invoice.dueDate).toLocaleDateString('ro-RO')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    invoice.isPaid 
                                      ? 'bg-green-100 text-green-800' 
                                      : isOverdue 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {invoice.isPaid ? '✅ Plătită' : isOverdue ? '🔴 Scadentă' : '⏳ Neplătită'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2">
                                  {invoice.pdfUrl && (
                                    <button
                                      onClick={() => handleDownloadPDF(invoice)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Descarcă PDF"
                                    >
                                      <FileText className="w-5 h-5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => toggleInvoicePaymentStatus(invoice.id, invoice.isPaid)}
                                    className={`${
                                      invoice.isPaid 
                                        ? 'text-red-600 hover:text-red-900' 
                                        : 'text-green-600 hover:text-green-900'
                                    }`}
                                    title={invoice.isPaid ? 'Marchează ca neplătită' : 'Marchează ca plătită'}
                                  >
                                    {invoice.isPaid ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Modal detalii încasare */}
      {showReceiptModal && selectedIncasare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Detalii Încasare</h3>
            {(() => {
              const apartment = apartments.find(apt => apt.id === selectedIncasare.apartmentId);
              return (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Apartament:</span>
                    <span className="font-medium">{apartment?.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Proprietar:</span>
                    <span className="font-medium">{apartment?.owner || selectedIncasare.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chitanță:</span>
                    <span className="font-medium">#{selectedIncasare.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium">
                      {new Date(selectedIncasare.timestamp).toLocaleString('ro-RO')}
                    </span>
                  </div>
                  <hr />
                  {selectedIncasare.restante > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Restanțe:</span>
                      <span className="font-medium text-red-600">
                        {selectedIncasare.restante.toFixed(2)} lei
                      </span>
                    </div>
                  )}
                  {selectedIncasare.intretinere > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Întreținere:</span>
                      <span className="font-medium text-blue-600">
                        {selectedIncasare.intretinere.toFixed(2)} lei
                      </span>
                    </div>
                  )}
                  {selectedIncasare.penalitati > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Penalități:</span>
                      <span className="font-medium text-orange-600">
                        {selectedIncasare.penalitati.toFixed(2)} lei
                      </span>
                    </div>
                  )}
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-600">
                      {selectedIncasare.total.toFixed(2)} lei
                    </span>
                  </div>
                </div>
              );
            })()}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  regenerateReceipt(selectedIncasare);
                  setShowReceiptModal(false);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Regenerează Chitanța
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AccountingView;