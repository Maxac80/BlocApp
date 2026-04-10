/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Coins, Download, Eye, Search, FileText, TrendingUp, AlertCircle, Building, Receipt, CreditCard, CheckCircle, XCircle, Calendar, Plus, Trash2, Pencil, MoreVertical, Share2 } from 'lucide-react';
import StatsCard from '../common/StatsCard';
import { defaultExpenseTypes } from '../../data/expenseTypes';
import { useIncasari } from '../../hooks/useIncasari';
import useExpenseConfigurations from '../../hooks/useExpenseConfigurations';
import useSuppliers from '../../hooks/useSuppliers';
import AddInvoiceModal from '../modals/AddInvoiceModal';
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
  isReadOnlyRole,
  getAssociationApartments,
  handleNavigation,
  getMonthType,
  publishedSheet,
  sheets = [],
  // Props pentru facturi
  invoices,
  addInvoice,
  getInvoicesByMonth,
  getInvoiceStats,
  markInvoiceAsPaid,
  markInvoiceAsUnpaid,
  deleteInvoice,
  updateInvoice,
  updateMissingSuppliersForExistingInvoices,
  currentSheet
}) => {
  const apartments = getAssociationApartments();

  // Găsește sheet-ul pentru luna selectată în currentMonth
  // Încasările pot fi înregistrate doar pe luni publicate, dar putem VIZUALIZA și pe luni arhivate
  const currentMonthSheet = sheets.find(
    sheet => sheet.monthYear === currentMonth &&
             (sheet.status === 'PUBLISHED' || sheet.status === 'published' || sheet.status === 'archived')
  ) || null;


  const {
    incasari,
    loading,
    error,
    getIncasariStats,
    generateReceiptNumber,
    deleteIncasare
  } = useIncasari(association, currentMonth, currentMonthSheet);


  // Hook pentru obținerea configurațiilor de cheltuieli (pentru furnizori)
  const { getExpenseConfig } = useExpenseConfigurations(association?.id);

  // Hook pentru gestionarea furnizorilor (creare furnizor nou din modal factura)
  const { addSupplier } = useSuppliers(currentSheet);

  const [activeTab, setActiveTab] = useState('facturi'); // 'facturi' sau 'incasari'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, unpaid
  const [filterDistribution, setFilterDistribution] = useState('all'); // all, distributed, partial, undistributed
  const [selectedIncasare, setSelectedIncasare] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Obține statisticile
  const stats = getIncasariStats(apartments);
  
  // Statistici facturi pentru luna curentă
  const monthlyInvoices = getInvoicesByMonth ? getInvoicesByMonth(currentMonth) : [];

  // Calculează statisticile local pe baza facturilor lunii curente
  const invoiceStats = {
    total: monthlyInvoices.length,
    paid: monthlyInvoices.filter(inv => inv.isPaid).length,
    unpaid: monthlyInvoices.filter(inv => !inv.isPaid).length,
    overdue: monthlyInvoices.filter(inv => !inv.isPaid && inv.dueDate && new Date(inv.dueDate) < new Date()).length,
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

  // Helper: calculează ratio-ul real distribuit dintr-o factură (din currentSheet.expenses, sursa de adevăr)
  const getInvoiceDistributionRatio = (invoice) => {
    const total = parseFloat(invoice.totalInvoiceAmount || invoice.totalAmount) || 0;
    if (total === 0) return 0;
    const sheetExps = currentSheet?.expenses || [];
    const distNames = (invoice.distributionHistory || [])
      .filter(d => d.amount > 0)
      .map(d => d.expenseName)
      .filter(Boolean);
    const realDistributed = sheetExps
      .filter(exp => distNames.includes(exp.name))
      .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    return realDistributed / total;
  };

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

    let matchesDistribution = true;
    if (filterDistribution !== 'all') {
      const ratio = getInvoiceDistributionRatio(invoice);
      if (filterDistribution === 'distributed') matchesDistribution = ratio >= 0.999;
      else if (filterDistribution === 'partial') matchesDistribution = ratio > 0 && ratio < 0.999;
      else if (filterDistribution === 'undistributed') matchesDistribution = ratio === 0;
    }

    return matchesSearch && matchesStatus && matchesDistribution;
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🧾 Facturi</h1>
        </div>

        {/* Guard: nu există apartamente configurate */}
        {apartments.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 text-center mb-6">
            <Building className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-2">
              Configurează mai întâi structura asociației
            </h3>
            <p className="text-sm text-blue-600 mb-4">
              Pentru a vizualiza încasările și a înregistra facturile, trebuie să adaugi blocurile, scările și apartamentele.
            </p>
            <button
              onClick={() => handleNavigation('setup')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Configurează Apartamentele
            </button>
          </div>
        ) : (
        <>
        {/* Statistici Facturi — deasupra cardului, la fel ca pe celelalte pagini */}
        {(() => {
          const sheetExps = currentSheet?.expenses || [];
          const distCount = filteredInvoices.filter(inv => {
            const total = parseFloat(inv.totalInvoiceAmount || inv.totalAmount) || 0;
            const distNames = (inv.distributionHistory || []).map(d => d.expenseName).filter(Boolean);
            const realDist = sheetExps
              .filter(exp => distNames.includes(exp.name))
              .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
            return realDist >= total - 0.01 && realDist > 0;
          }).length;
          return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <StatsCard label="Total Facturi" value={`${invoiceStats.totalAmount.toFixed(2)} lei`} borderColor="border-orange-500" />
              <StatsCard label="Facturi Plătite" value={`${invoiceStats.paid} / ${invoiceStats.total}`} borderColor="border-green-500" />
              <StatsCard label="Neplătite" value={`${invoiceStats.unpaidAmount.toFixed(2)} lei`} borderColor="border-yellow-500" />
              <StatsCard label="Restante" value={invoiceStats.overdue} borderColor="border-red-500" />
              <StatsCard label="Distribuite" value={`${distCount} / ${filteredInvoices.length}`} borderColor={distCount === filteredInvoices.length && distCount > 0 ? 'border-green-500' : distCount > 0 ? 'border-purple-500' : 'border-gray-400'} />
            </div>
          );
        })()}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6">
            {false && /* Încasări mutat la pagina Întreținere */ (
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
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Raport PDF
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

            {/* Facturi */}
              <div className="space-y-6">
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

                  <select
                    value={filterDistribution}
                    onChange={(e) => setFilterDistribution(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Toate distribuțiile</option>
                    <option value="distributed">Distribuite</option>
                    <option value="partial">Parțial distribuite</option>
                    <option value="undistributed">Nedistribuite</option>
                  </select>

                  {!isReadOnlyRole && !isMonthReadOnly && (
                    <button
                      onClick={() => setShowAddInvoiceModal(true)}
                      className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Adaugă factura
                    </button>
                  )}
                </div>

                {/* Card-uri Facturi */}
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nu există facturi înregistrate pentru {currentMonth}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredInvoices.map((invoice) => {
                      const isOverdue = !invoice.isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date();
                      const expConfig = getExpenseConfig(invoice.expenseType);
                      const finalSupplier = expConfig?.supplierName || invoice.supplierName || 'Fără furnizor';
                      const totalInvoice = invoice.totalInvoiceAmount || invoice.totalAmount;
                      // Verificăm distribuția din currentSheet.expenses (sursă de adevăr)
                      // Bug vechi: invoice.distributedAmount/distributionHistory.amount pot conține totalul facturii, nu suma reală distribuită
                      const sheetExpenses = currentSheet?.expenses || [];
                      const distributedExpenseNames = (invoice.distributionHistory || [])
                        .filter(d => d.amount > 0)
                        .map(d => d.expenseName)
                        .filter(Boolean);
                      // Suma reală distribuită = suma cheltuielilor din sheet care au invoiceData legat de această factură
                      const realDistributed = sheetExpenses
                        .filter(exp => distributedExpenseNames.includes(exp.name))
                        .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
                      const distributed = realDistributed > 0 ? realDistributed : (invoice.distributedAmount || 0);
                      const remaining = totalInvoice - distributed;
                      const percentage = totalInvoice > 0 ? Math.round((distributed / totalInvoice) * 100) : 0;
                      const isFullyDistributed = remaining <= 0.01 && distributed > 0;
                      const distributionHistory = (invoice.distributionHistory || []).filter(d => d.amount > 0);
                      const expenseNames = distributionHistory.length > 0
                        ? [...new Set(distributionHistory.map(d => d.expenseName).filter(Boolean))]
                        : (invoice.expenseName ? [invoice.expenseName] : []);
                      const dropdownId = `inv-${invoice.id}`;

                      return (
                        <div key={invoice.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                          {/* Row 1: Supplier · Invoice number + Amount */}
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="min-w-0">
                              <span className="font-semibold text-sm text-gray-900">{finalSupplier}</span>
                              <span className="text-gray-400 mx-1.5">·</span>
                              <span className="text-sm text-gray-600">{invoice.invoiceNumber}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900 whitespace-nowrap ml-2">
                              {totalInvoice.toFixed(2)} lei
                            </span>
                          </div>

                          {/* Row 2: Distribution status badge (în dreapta, uniform cu celelalte pagini) */}
                          <div className="flex items-center justify-end mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                              isFullyDistributed ? 'bg-green-100 text-green-700' :
                              distributed > 0 ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {isFullyDistributed ? 'Distribuită' :
                               distributed > 0 ? `Parțial distribuită (${percentage}%)` :
                               'Nedistribuită'}
                            </span>
                          </div>

                          {/* Row 3: Distribution details (if any) */}
                          {distributionHistory.length > 0 && (
                            <div className="mb-2 text-xs space-y-1">
                              {distributionHistory.map((dist, idx) => {
                                const distConfig = getExpenseConfig(dist.expenseName || dist.expenseType);
                                let target = 'Toată asociația';
                                if (distConfig?.appliesTo?.scope === 'stairs' && distConfig.appliesTo.stairs?.length > 0) {
                                  const names = distConfig.appliesTo.stairs.map(id => stairs.find(s => s.id === id)?.name || id);
                                  target = names.length === 1 ? `Scara ${names[0]}` : `${names.length} scări`;
                                } else if (distConfig?.appliesTo?.scope === 'bloc' && distConfig.appliesTo.bloc) {
                                  const bloc = blocks.find(b => b.id === distConfig.appliesTo.bloc);
                                  target = bloc ? `Bloc ${bloc.name}` : 'Bloc';
                                }
                                // Suma reală din sheet expense (nu din distributionHistory care poate fi incorectă)
                                const sheetExp = sheetExpenses.find(e => e.name === dist.expenseName);
                                const realAmount = sheetExp ? parseFloat(sheetExp.amount) || 0 : parseFloat(dist.amount) || 0;
                                return (
                                  <div key={idx} className="flex items-center justify-between text-gray-600">
                                    <span>{dist.expenseName || dist.notes} · {realAmount.toFixed(2)} lei</span>
                                    <span className="text-gray-400 ml-2">{target}</span>
                                  </div>
                                );
                              })}
                              {remaining > 0 && (
                                <div className="text-orange-600 font-medium">Rămas: {remaining.toFixed(2)} lei</div>
                              )}
                            </div>
                          )}

                          {/* Separator + Row 4 */}
                          <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {invoice.invoiceDate && (
                                <span>{new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}</span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                invoice.isPaid ? 'bg-green-100 text-green-700' :
                                isOverdue ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {invoice.isPaid ? 'Plătită' : isOverdue ? 'Scadentă' : 'Neplătită'}
                              </span>
                            </div>

                            {!isReadOnlyRole && (
                              <div className="relative">
                                <button
                                  onClick={() => setOpenDropdown(openDropdown === dropdownId ? null : dropdownId)}
                                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {openDropdown === dropdownId && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                    <div className="absolute right-0 bottom-full mb-1 z-20 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                      <button
                                        onClick={() => { setEditingInvoice(invoice); setShowEditInvoiceModal(true); setOpenDropdown(null); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        <Pencil className="w-3.5 h-3.5" /> Editează factura
                                      </button>
                                      <button
                                        onClick={() => { toggleInvoicePaymentStatus(invoice.id, invoice.isPaid); setOpenDropdown(null); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        {invoice.isPaid ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                        {invoice.isPaid ? 'Marchează neplătită' : 'Marchează plătită'}
                                      </button>
                                      {deleteInvoice && (
                                        <button
                                          onClick={() => { if (window.confirm(`Sigur vrei să ștergi factura "${invoice.invoiceNumber}"?`)) deleteInvoice(invoice.id); setOpenDropdown(null); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Șterge factura
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
          </div>
        </div>
        </>
      )}

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

      {/* Modal Adauga Factura */}
      <AddInvoiceModal
        isOpen={showAddInvoiceModal}
        onClose={() => setShowAddInvoiceModal(false)}
        onSave={addInvoice}
        suppliers={currentSheet?.configSnapshot?.suppliers || []}
        onAddSupplier={addSupplier}
        currentMonth={currentMonth}
        expenseTypes={(() => {
          const configs = Object.values(currentSheet?.configSnapshot?.expenseConfigurations || {}).filter(c => c.isEnabled !== false);
          const defaultOrder = defaultExpenseTypes.map(d => d.id);
          return configs
            .map(c => ({ id: c.id, name: c.name }))
            .sort((a, b) => {
              const aIdx = defaultOrder.indexOf(a.id);
              const bIdx = defaultOrder.indexOf(b.id);
              if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
              if (aIdx !== -1) return -1;
              if (bIdx !== -1) return 1;
              return (a.name || '').localeCompare(b.name || '');
            });
        })()}
      />
    </div>
  );
};

export default AccountingView;