/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Coins, Download, Eye, Search, FileText, TrendingUp, AlertCircle, Building, Receipt, CreditCard, CheckCircle, XCircle, Calendar, Plus, Trash2, Pencil, MoreVertical, Share2, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import StatsCard from '../common/StatsCard';
import PageHeader from '../common/PageHeader';
import SearchFilterBar from '../common/SearchFilterBar';
import ContentCard from '../common/ContentCard';
import { defaultExpenseTypes } from '../../data/expenseTypes';
import { useIncasari } from '../../hooks/useIncasari';
import useExpenseConfigurations from '../../hooks/useExpenseConfigurations';
import useSuppliers from '../../hooks/useSuppliers';
import AddInvoiceModal from '../modals/AddInvoiceModal';
import { generateDetailedReceipt } from '../../utils/receiptGenerator';
import { matchesSearch } from '../../utils/searchHelpers';
import { downloadFacturiExcel } from '../../utils/facturiExcelGenerator';
import { downloadFacturiPdf } from '../../utils/facturiPdfGenerator';
import { FileSpreadsheet, FileDown } from 'lucide-react';
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

  // Helper: cheltuielile asociate unui furnizor (din config-ul cheltuielilor)
  // Folosește configSnapshot din sheet-ul curent ca sursă de adevăr
  const getSupplierExpenseNames = (supplierId) => {
    if (!supplierId) return [];
    const configs = Object.values(currentSheet?.configSnapshot?.expenseConfigurations || {});
    return configs
      .filter(c =>
        c.isEnabled !== false &&
        (c.suppliers?.some(s => s.supplierId === supplierId) || c.supplierId === supplierId)
      )
      .map(c => c.name)
      .filter(Boolean);
  };

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
  const [expandedInvoices, setExpandedInvoices] = useState({});
  const [exportingFacturi, setExportingFacturi] = useState(null);

  const handleExportFacturiPdf = async () => {
    if (filteredInvoices.length === 0) return;
    setExportingFacturi('pdf');
    try {
      const associationBlocks = (blocks || []).filter(b => b.associationId === association?.id);
      const associationStairs = (stairs || []).filter(s =>
        associationBlocks.some(b => b.id === s.blockId)
      );
      await downloadFacturiPdf({
        association,
        monthYear: currentMonth,
        consumptionMonth: currentMonthSheet?.consumptionMonth,
        publicationDate: new Date(),
        invoices: filteredInvoices,
        expenseTypes: Object.values(currentSheet?.configSnapshot?.expenseConfigurations || {})
          .filter(c => c.isEnabled !== false)
          .map(c => ({ id: c.id, name: c.name }))
          .sort((a, b) => {
            const order = defaultExpenseTypes.map(d => d.id);
            const ai = order.indexOf(a.id);
            const bi = order.indexOf(b.id);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return (a.name || '').localeCompare(b.name || '');
          }),
        blocks: associationBlocks,
        stairs: associationStairs,
        getSupplierExpenseNames,
      });
    } catch (err) {
      console.error('Eroare export PDF facturi:', err);
      alert('Eroare la generarea fișierului PDF.');
    } finally {
      setExportingFacturi(null);
    }
  };

  const handleExportFacturiExcel = async () => {
    if (filteredInvoices.length === 0) return;
    setExportingFacturi('excel');
    try {
      const associationBlocks = (blocks || []).filter(b => b.associationId === association?.id);
      const associationStairs = (stairs || []).filter(s =>
        associationBlocks.some(b => b.id === s.blockId)
      );
      await downloadFacturiExcel({
        association,
        monthYear: currentMonth,
        consumptionMonth: currentMonthSheet?.consumptionMonth,
        publicationDate: new Date(),
        invoices: filteredInvoices,
        expenseTypes: Object.values(currentSheet?.configSnapshot?.expenseConfigurations || {})
          .filter(c => c.isEnabled !== false)
          .map(c => ({ id: c.id, name: c.name }))
          .sort((a, b) => {
            const order = defaultExpenseTypes.map(d => d.id);
            const ai = order.indexOf(a.id);
            const bi = order.indexOf(b.id);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return (a.name || '').localeCompare(b.name || '');
          }),
        blocks: associationBlocks,
        stairs: associationStairs,
        getSupplierExpenseNames,
      });
    } catch (err) {
      console.error('Eroare export Excel facturi:', err);
      alert('Eroare la generarea fișierului Excel. Verifică consola.');
    } finally {
      setExportingFacturi(null);
    }
  };

  const toggleInvoiceExpand = (invoiceId) => {
    setExpandedInvoices(prev => ({ ...prev, [invoiceId]: !prev[invoiceId] }));
  };

  // Închide dropdown la click în afară
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown-container]')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
      
      return !searchTerm ||
        apartment.number.toString().includes(searchTerm) ||
        matchesSearch(apartment.owner, searchTerm) ||
        inc.receiptNumber?.toString().includes(searchTerm);
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Helper: calculează ratio-ul real distribuit dintr-o factură (din distributionHistory[].amount, per factură)
  const getInvoiceDistributionRatio = (invoice) => {
    const total = parseFloat(invoice.totalInvoiceAmount || invoice.totalAmount) || 0;
    if (total === 0) return 0;
    const realDistributed = (invoice.distributionHistory || [])
      .filter(d => d.amount > 0)
      .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    return realDistributed / total;
  };

  // Filtrează facturile
  const filteredInvoices = monthlyInvoices.filter(invoice => {
    const matchesSearchTerm = !searchTerm ||
      matchesSearch(invoice.supplierName, searchTerm) ||
      matchesSearch(invoice.invoiceNumber, searchTerm) ||
      matchesSearch(invoice.expenseName, searchTerm) ||
      matchesSearch(invoice.expenseType, searchTerm);

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

    return matchesSearchTerm && matchesStatus && matchesDistribution;
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
  const regenerateReceipt = async (incasare) => {
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

    const stair = stairs?.find((s) => s.id === apartment.stairId);
    const bloc = blocks?.find((b) => b.id === (stair?.blockId || apartment.blocId));

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
      name: association?.name || '',
      cui: association?.cui || '',
      address: association?.address || '',
      bankAccount: association?.bankAccount || '',
      bank: association?.bank || '',
      administrator: association?.administrator || ''
    };

    try {
      const result = await generateDetailedReceipt(payment, apartmentData, associationData);
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
        <PageHeader
          icon={FileText}
          iconColor="text-orange-600"
          title={`Facturi${currentMonth ? ` - ${currentMonth}` : ''}`}
          subtitle={currentMonthSheet?.consumptionMonth ? `consum ${currentMonthSheet.consumptionMonth}` : null}
        />

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
          const distCount = filteredInvoices.filter(inv => {
            const total = parseFloat(inv.totalInvoiceAmount || inv.totalAmount) || 0;
            const realDist = (inv.distributionHistory || [])
              .filter(d => d.amount > 0)
              .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
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

        <SearchFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Caută după furnizor, număr factură sau tip cheltuială..."
          focusRingColor="focus:ring-orange-400"
          filters={
            <>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm bg-white"
              >
                <option value="all">Toate facturile</option>
                <option value="paid">Plătite</option>
                <option value="unpaid">Neplătite</option>
              </select>
              <select
                value={filterDistribution}
                onChange={(e) => setFilterDistribution(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm bg-white"
              >
                <option value="all">Toate distribuțiile</option>
                <option value="distributed">Distribuite</option>
                <option value="partial">Parțial distribuite</option>
                <option value="undistributed">Nedistribuite</option>
              </select>
            </>
          }
          actions={
            !isReadOnlyRole && !isMonthReadOnly && (
              <button
                onClick={() => setShowAddInvoiceModal(true)}
                className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Adaugă factura
              </button>
            )
          }
        />

        <ContentCard
          icon={FileText}
          iconColor="text-orange-600"
          title="Lista facturi"
          headerBg="bg-orange-50"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportFacturiPdf}
                disabled={filteredInvoices.length === 0 || exportingFacturi !== null}
                className="bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center text-xs sm:text-sm transition-colors"
                title={filteredInvoices.length === 0 ? 'Nu există facturi' : 'Exportă lista facturilor în PDF'}
              >
                <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                {exportingFacturi === 'pdf' ? 'Se generează…' : 'Exportă PDF'}
              </button>
              <button
                onClick={handleExportFacturiExcel}
                disabled={filteredInvoices.length === 0 || exportingFacturi !== null}
                className="bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center text-xs sm:text-sm transition-colors"
                title={filteredInvoices.length === 0 ? 'Nu există facturi' : 'Exportă lista facturilor în Excel'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                {exportingFacturi === 'excel' ? 'Se generează…' : 'Exportă Excel'}
              </button>
            </div>
          }
        >
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
              <div>
                {/* Card-uri Facturi */}
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nu există facturi înregistrate pentru {currentMonth}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredInvoices.map((invoice, invIdx, invArr) => {
                      const isLastItem = invIdx >= invArr.length - 2;
                      const isOverdue = !invoice.isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date();
                      const expConfig = getExpenseConfig(invoice.expenseType);
                      const finalSupplier = expConfig?.supplierName || invoice.supplierName || 'Fără furnizor';
                      const totalInvoice = invoice.totalInvoiceAmount || invoice.totalAmount;
                      // Suma reală distribuită = suma amount-urilor din distributionHistory (per factură, NU cumulativ pe cheltuială)
                      const sheetExpenses = currentSheet?.expenses || [];
                      const realDistributed = (invoice.distributionHistory || [])
                        .filter(d => d.amount > 0)
                        .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
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
                        <div key={invoice.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div
                            className="cursor-pointer"
                            onClick={() => toggleInvoiceExpand(invoice.id)}
                          >
                            {/* Row 1: Nr factură (stânga) | Status badge + chevron + 3-dots (dreapta) */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-medium text-sm sm:text-base text-gray-900 min-w-0 flex-1">
                                {invoice.invoiceNumber}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium whitespace-nowrap ${
                                  isFullyDistributed ? 'bg-green-100 text-green-700' :
                                  distributed > 0 ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {isFullyDistributed ? 'Distribuită' :
                                   distributed > 0 ? `Parțial distribuită (${percentage}%)` :
                                   'Nedistribuită'}
                                </span>
                                {expandedInvoices[invoice.id]
                                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                                }
                                {!isReadOnlyRole && (
                                  <div className="relative" data-dropdown-container>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
                                      }}
                                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                      title="Opțiuni"
                                    >
                                      <MoreVertical className="w-5 h-5" />
                                    </button>
                                    {openDropdown === dropdownId && (
                                      <div
                                        className={`absolute right-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 ${
                                          isLastItem ? 'bottom-full mb-2' : 'top-full mt-2'
                                        }`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="py-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingInvoice(invoice);
                                              setShowEditInvoiceModal(true);
                                              setOpenDropdown(null);
                                            }}
                                            className="w-full px-4 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                                          >
                                            <Pencil className="w-4 h-4" />
                                            Editează factura
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleInvoicePaymentStatus(invoice.id, invoice.isPaid);
                                              setOpenDropdown(null);
                                            }}
                                            className="w-full px-4 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                                          >
                                            {invoice.isPaid ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                            {invoice.isPaid ? 'Marchează neplătită' : 'Marchează plătită'}
                                          </button>
                                          {deleteInvoice && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Sigur vrei să ștergi factura "${invoice.invoiceNumber}"?`)) deleteInvoice(invoice.id);
                                                setOpenDropdown(null);
                                              }}
                                              className="w-full px-4 py-2 text-left flex items-center gap-2 text-red-700 hover:bg-red-50"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              Șterge factura
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Row 2: Cheltuieli asociate */}
                            {(() => {
                              const supplierExpenses = getSupplierExpenseNames(invoice.supplierId);
                              const distributedNames = new Set(distributionHistory.map(d => d.expenseName).filter(Boolean));
                              return (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  {supplierExpenses.length === 0 ? (
                                    <span className="text-xs text-gray-400 italic">Furnizor fără cheltuieli asociate</span>
                                  ) : (
                                    <>
                                      <span className="text-xs text-gray-500">
                                        {supplierExpenses.length === 1 ? 'Cheltuială asociată:' : 'Cheltuieli asociate:'}
                                      </span>
                                      {supplierExpenses.map(name => {
                                        const isDist = distributedNames.has(name);
                                        return (
                                          <span
                                            key={name}
                                            className={`inline-block px-1.5 py-0.5 text-xs rounded ${
                                              isDist ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                            }`}
                                          >
                                            {name}
                                          </span>
                                        );
                                      })}
                                    </>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Row 3: Furnizor (stânga) | Suma (dreapta) */}
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="text-xs text-gray-500">Furnizor: </span>
                                <span className="text-xs text-gray-900 font-medium">{finalSupplier}</span>
                              </div>
                              <span className="text-sm font-bold text-gray-900 whitespace-nowrap flex-shrink-0">
                                {totalInvoice.toFixed(2)} lei
                              </span>
                            </div>

                            {/* Linie delimitatoare gri + Row 4: dată + status plată */}
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {invoice.invoiceDate && (
                                  <span>📅 {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}</span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  invoice.isPaid ? 'bg-green-100 text-green-700' :
                                  isOverdue ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {invoice.isPaid ? 'Plătită' : isOverdue ? 'Scadentă' : 'Neplătită'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Secțiune expandată — distribuție factură în chenar alb */}
                          {expandedInvoices[invoice.id] && (
                            <div className="border-t border-gray-200 mt-3 pt-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Share2 className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-xs font-semibold text-gray-600">Distribuție factură</span>
                              </div>
                              <div className="pl-5">
                                <div className="bg-white rounded border border-gray-200 p-2.5">
                                  {distributionHistory.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Factură nedistribuită</p>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {distributionHistory.map((dist, idx) => {
                                        const realAmount = parseFloat(dist.amount) || 0;
                                        return (
                                          <div key={idx} className="text-xs text-gray-600 flex justify-between">
                                            <span>{dist.expenseName || dist.notes}</span>
                                            <span className="font-medium text-green-700">{realAmount.toFixed(2)} lei</span>
                                          </div>
                                        );
                                      })}
                                      {remaining > 0.01 && (
                                        <div className="text-xs text-orange-600 font-medium flex justify-between pt-0.5 border-t border-gray-100">
                                          <span>Rămas nedistribuit</span>
                                          <span>{remaining.toFixed(2)} lei</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
        </ContentCard>
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

      {/* Modal Editează Factura — același component AddInvoiceModal cu prop invoice */}
      <AddInvoiceModal
        isOpen={showEditInvoiceModal}
        onClose={() => {
          setShowEditInvoiceModal(false);
          setEditingInvoice(null);
        }}
        onSave={addInvoice}
        onUpdate={updateInvoice}
        invoice={editingInvoice}
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