import React, { useState } from 'react';
import { Plus, Settings, FileText, Upload, X } from 'lucide-react';

const ExpenseForm = ({
  newExpense,
  setNewExpense,
  availableExpenseTypes,
  associationExpenses,
  getExpenseConfig,
  handleAddExpense,
  isMonthReadOnly,
  currentMonth,
  setShowExpenseConfig,
  monthType
}) => {
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    notes: ''
  });
  const [pdfFile, setPdfFile] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      alert('Te rog selectează doar fișiere PDF');
      event.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setPdfFile(null);
    document.getElementById('pdf-upload').value = '';
  };

  const resetInvoiceData = () => {
    setInvoiceData({
      invoiceNumber: '',
      invoiceDate: '',
      dueDate: '',
      notes: ''
    });
    setPdfFile(null);
    setShowInvoiceDetails(false);
    // Resetează și input-ul de file
    const fileInput = document.getElementById('pdf-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Resetează toate datele formei când se resetează newExpense  
  React.useEffect(() => {
    // Doar resetează datele locale când newExpense.name devine gol
    if (newExpense.name === "" && (invoiceData.invoiceNumber || pdfFile || showInvoiceDetails)) {
      console.log('🔄 Resetez datele locale ale facturii după reset newExpense');
      resetInvoiceData();
    }
  }, [newExpense.name]); // Doar dependența necesară

  // Transmite datele facturii în props pentru ca părinte să le folosească
  React.useEffect(() => {
    // Doar actualiza când există date de factură și nu e în reset
    if (setNewExpense && newExpense.name && showInvoiceDetails) {
      console.log('📤 Actualizez newExpense cu datele facturii');
      setNewExpense(prev => ({
        ...prev,
        invoiceData: invoiceData,
        pdfFile: pdfFile
      }));
    }
  }, [invoiceData, pdfFile, showInvoiceDetails, newExpense.name]); // Fără isResetting
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">💰 Adaugă Cheltuială</h3>
        {!isMonthReadOnly && (
          <button
            onClick={() => setShowExpenseConfig(true)}
            className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center text-sm"
            title="Configurează cheltuieli"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {availableExpenseTypes.length === 0 ? (
        isMonthReadOnly ? (
          monthType === 'historic' ? (
            <div className="py-4 px-6 bg-gray-50 border-2 border-gray-300 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        LUNĂ ISTORICĂ
                      </span>
                      <span className="text-sm font-semibold text-gray-800">Aceasta este o lună arhivată</span>
                    </div>
                    <p className="text-sm text-gray-600">Nu se mai pot face modificări • Datele sunt doar pentru consultare</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 px-6 bg-purple-50 border-2 border-purple-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        LUNĂ PUBLICATĂ
                      </span>
                      <span className="text-sm font-semibold text-purple-800">Luna este publicată și afișată proprietarilor</span>
                    </div>
                    <p className="text-sm text-purple-600">Nu se pot adăuga cheltuieli noi • Poți doar înregistra încasări</p>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : associationExpenses.length === 0 ? (
          <div className="text-center py-8 bg-orange-50 border-2 border-orange-200 rounded-xl">
            <div className="mb-4">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">⚠️</span>
              </div>
              <div className="mb-2">
                <span className="bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                  ⚠️ CONFIGURARE NECESARĂ
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-orange-800 mb-2">Nu există cheltuieli active configurate</h3>
            <p className="text-orange-700 font-medium">Toate cheltuielile au fost dezactivate pentru această lună</p>
            <p className="text-orange-600 text-sm mt-2">Mergi la Configurare Asociație → Cheltuieli pentru a reactiva cheltuielile necesare</p>
          </div>
        ) : (
          <div className="text-center py-8 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">✅</span>
              </div>
              <div className="mb-2">
                <span className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                  ✅ TOATE CHELTUIELILE ADĂUGATE
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-green-800 mb-2">Toate cheltuielile disponibile au fost adăugate</h3>
            <p className="text-green-700 font-medium">Ai adăugat toate cheltuielile configurate pentru această lună</p>
            <p className="text-green-600 text-sm mt-2">Poți modifica cheltuielile existente sau configura cheltuieli noi</p>
          </div>
        )
      ) : isMonthReadOnly ? (
        monthType === 'historic' ? (
          <div className="py-4 px-6 bg-gray-50 border-2 border-gray-300 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      LUNĂ ISTORICĂ
                    </span>
                    <span className="text-sm font-semibold text-gray-800">Aceasta este o lună arhivată</span>
                  </div>
                  <p className="text-sm text-gray-600">Nu se mai pot face modificări • Datele sunt doar pentru consultare</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 px-6 bg-purple-50 border-2 border-purple-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🔒</span>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      LUNĂ PUBLICATĂ
                    </span>
                    <span className="text-sm font-semibold text-purple-800">Luna este publicată și afișată proprietarilor</span>
                  </div>
                  <p className="text-sm text-purple-600">Nu se pot adăuga cheltuieli noi • Poți doar înregistra încasări</p>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <select 
            value={newExpense.name}
            onChange={(e) => setNewExpense({...newExpense, name: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          >
            <option value="">Selectează cheltuiala</option>
            {availableExpenseTypes.map(expenseType => (
              <option key={expenseType.name} value={expenseType.name}>
                {expenseType.name}
              </option>
            ))}
          </select>
          
          {newExpense.name && getExpenseConfig(newExpense.name).distributionType === "consumption" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>{newExpense.name}</strong> - cheltuială pe consum
                </div>
              </div>
              <input
                value={newExpense.unitPrice}
                onChange={(e) => setNewExpense({...newExpense, unitPrice: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder={`Preț pe ${newExpense.name.toLowerCase().includes("apă") || newExpense.name.toLowerCase().includes("canal") ? "mc" : "Gcal"} (RON)`}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <input
                value={newExpense.billAmount}
                onChange={(e) => setNewExpense({...newExpense, billAmount: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder="Totalul facturii (RON)"
                className="w-full p-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
              <div className="text-xs text-gray-600 space-y-1">
                <div>💡 <strong>Preț pe unitate:</strong> pentru calculul individual pe consum</div>
                <div>🧾 <strong>Total factură:</strong> suma reală de plată</div>
              </div>
            </div>
          )}
          
          {newExpense.name && getExpenseConfig(newExpense.name).distributionType === "individual" && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-800">
                  <strong>{newExpense.name}</strong> - sume individuale per apartament
                </div>
              </div>
              <input
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder="Suma totală (RON)"
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              <div className="text-xs text-gray-600">
                💡 Suma totală pentru verificare. Vei introduce sumele individuale în panoul de introducere.
              </div>
            </div>
          )}
          
          {newExpense.name && getExpenseConfig(newExpense.name).distributionType !== "consumption" && getExpenseConfig(newExpense.name).distributionType !== "individual" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>{newExpense.name}</strong> se împarte: {
                    getExpenseConfig(newExpense.name).distributionType === "apartment" ? "Pe apartament (egal)" :
                    getExpenseConfig(newExpense.name).distributionType === "person" ? "Pe persoană" : "Pe consum"
                  }
                </div>
              </div>
              <input
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                type="text"
                inputMode="decimal"
                placeholder="Suma totală (RON)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          {/* Secțiunea Factură (opțională) */}
          {newExpense.name && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Detalii Factură</span>
                  <span className="text-xs text-gray-500">(opțional)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    console.log('🖱️ Click pe butonul Adaugă factură, showInvoiceDetails:', showInvoiceDetails);
                    setShowInvoiceDetails(!showInvoiceDetails);
                    console.log('🔄 Schimbat showInvoiceDetails la:', !showInvoiceDetails);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    showInvoiceDetails 
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {showInvoiceDetails ? 'Ascunde' : 'Adaugă factură'}
                </button>
              </div>

              {showInvoiceDetails && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
                  {/* Furnizor info */}
                  {getExpenseConfig(newExpense.name).supplierName && (
                    <div className="text-sm text-blue-700 font-medium">
                      🏢 Furnizor: {getExpenseConfig(newExpense.name).supplierName}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Număr factură
                      </label>
                      <input
                        type="text"
                        value={invoiceData.invoiceNumber}
                        onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
                        placeholder="ex: FAC-2024-001234"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data facturii
                      </label>
                      <input
                        type="date"
                        value={invoiceData.invoiceDate}
                        onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data scadență
                      </label>
                      <input
                        type="date"
                        value={invoiceData.dueDate}
                        onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PDF factură
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="pdf-upload"
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        {pdfFile ? (
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex-1 px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {pdfFile.name}
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveFile}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                              title="Elimină fișier"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => document.getElementById('pdf-upload').click()}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600 flex items-center justify-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Selectează PDF
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observații
                    </label>
                    <textarea
                      value={invoiceData.notes}
                      onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                      placeholder="Observații sau detalii suplimentare despre factură..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button 
            onClick={handleAddExpense}
            className="w-full mt-4 bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 flex items-center justify-center disabled:bg-gray-400"
            disabled={!newExpense.name || 
              (getExpenseConfig(newExpense.name).distributionType === "consumption" ? (!newExpense.unitPrice || !newExpense.billAmount) : 
               !newExpense.amount)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Cheltuială
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpenseForm;