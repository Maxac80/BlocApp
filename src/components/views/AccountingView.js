import React, { useState, useEffect } from 'react';
import { Coins, Download, Eye, Search, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { useIncasari } from '../../hooks/useIncasari';
import { generateDetailedReceipt } from '../../utils/receiptGenerator';
import DashboardHeader from '../dashboard/DashboardHeader';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AccountingView = ({
  association,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses,
  isMonthReadOnly,
  getAssociationApartments,
  handleNavigation
}) => {
  const apartments = getAssociationApartments();
  const {
    incasari,
    loading,
    error,
    getIncasariStats,
    generateReceiptNumber,
    deleteIncasare
  } = useIncasari(association, currentMonth);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, unpaid
  const [selectedIncasare, setSelectedIncasare] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Obține statisticile
  const stats = getIncasariStats(apartments);

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

  const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  return (
    <div className={`min-h-screen p-6 ${
      currentMonth === currentMonthStr
        ? "bg-gradient-to-br from-indigo-50 to-blue-100"
        : "bg-gradient-to-br from-green-50 to-emerald-100"
    }`}>
      <div className="w-full">
        {/* Header standard */}
        <DashboardHeader
          association={association}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          getAvailableMonths={getAvailableMonths}
          expenses={expenses}
          isMonthReadOnly={isMonthReadOnly}
          getAssociationApartments={getAssociationApartments}
          handleNavigation={handleNavigation}
        />

        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <Coins className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Contabilitate</h1>
              <p className="text-sm text-gray-600">Istoric încasări și chitanțe</p>
            </div>
          </div>
        </div>

        {/* Statistici */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Încasat</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.totalAmount.toFixed(2)} lei
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
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
          
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
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
          
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
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

        {/* Bara de căutare și filtre */}
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
      </div>

      {/* Tabel încasări */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
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

      {/* Lista apartamente neplătite */}
      {unpaidApartments.length > 0 && (
        <div className="mt-6 bg-red-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-3">
            Apartamente care nu au plătit ({unpaidApartments.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {unpaidApartments.map(apt => (
              <div key={apt.id} className="bg-white px-3 py-2 rounded border border-red-200">
                <span className="font-medium">Ap. {apt.number}</span>
                {apt.owner && (
                  <div className="text-xs text-gray-600 truncate">{apt.owner}</div>
                )}
              </div>
            ))}
          </div>
        </div>
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
  );
};

export default AccountingView;