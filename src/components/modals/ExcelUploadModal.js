import React, { useState, useRef } from 'react';
import { parseExcelFile, prepareApartmentsForImport, generateImportReport } from '../../utils/excelParser';

/**
 * 📊 MODAL PENTRU UPLOAD EXCEL
 * 
 * Permite încărcarea și procesarea fișierelor Excel
 * cu apartamente pentru import în bulk
 */
const ExcelUploadModal = ({
  isOpen,
  onClose,
  association,
  blocks,
  stairs,
  onImportApartments
}) => {
  const [file, setFile] = useState(null);
  const [parseResults, setParseResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importReport, setImportReport] = useState('');
  const [showReport, setShowReport] = useState(false);
  const fileInputRef = useRef(null);

  // Reset la închiderea modalului
  const handleClose = () => {
    setFile(null);
    setParseResults(null);
    setIsProcessing(false);
    setImportReport('');
    setShowReport(false);
    onClose();
  };

  // 📁 GESTIONAREA SELECTĂRII FIȘIERULUI
  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    
    if (selectedFile) {
      // Verifică extensia fișierului
      const fileName = selectedFile.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        alert('Vă rugăm să selectați un fișier Excel (.xlsx sau .xls)');
        return;
      }
      
      setFile(selectedFile);
      setParseResults(null);
      setShowReport(false);
    }
  };

  // 📊 PROCESAREA FIȘIERULUI EXCEL
  const handleProcessFile = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setShowReport(false);
    
    try {
      // Parsează fișierul Excel
      const results = await parseExcelFile(file, blocks, stairs);
      setParseResults(results);
      
      // Generează raport
      const report = generateImportReport(results);
      setImportReport(report);
      setShowReport(true);
      
    } catch (error) {
      console.error('❌ Eroare la procesarea fișierului:', error);
      alert('Eroare la procesarea fișierului: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ IMPORTUL APARTAMENTELOR
  const handleImport = async () => {
    if (!parseResults || parseResults.totalErrors > 0) return;
    
    setIsProcessing(true);
    
    try {
      // Pregătește apartamentele pentru import
      const apartments = prepareApartmentsForImport(parseResults);
      
      // Apelează funcția de import
      await onImportApartments(apartments);
      
      alert(`✅ Import reușit! Au fost importate ${apartments.length} apartamente.`);
      handleClose();
      
    } catch (error) {
      console.error('❌ Eroare la importul apartamentelor:', error);
      alert('Eroare la importul apartamentelor: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                📊 Import Apartamente din Excel
              </h2>
              <p className="text-green-100 mt-1">
                Încarcă fișierul Excel completat cu datele apartamentelor
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Zona de upload */}
          <div className="mb-6">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
              }`}
            >
              {!file ? (
                <>
                  <div className="text-4xl mb-4">📁</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Selectează fișierul Excel
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Încarcă template-ul Excel completat cu datele apartamentelor
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                  >
                    Alege Fișier Excel
                  </button>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold text-green-700 mb-2">
                    Fișier selectat
                  </h3>
                  <p className="text-gray-700 font-medium mb-4">
                    📄 {file.name}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Dimensiune: {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Schimbă Fișier
                    </button>
                    <button
                      onClick={handleProcessFile}
                      disabled={isProcessing}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                    >
                      {isProcessing ? 'Se procesează...' : '🔍 Verifică Fișierul'}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>

          {/* Rezultate parsare */}
          {parseResults && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">📋 Rezultate Verificare</h3>
              
              {/* Statistici */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {parseResults.sheets.length}
                  </div>
                  <div className="text-sm text-gray-600">Sheet-uri procesate</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {parseResults.totalApartments}
                  </div>
                  <div className="text-sm text-gray-600">Apartamente găsite</div>
                </div>
                <div className={`border rounded-lg p-4 ${
                  parseResults.totalErrors > 0 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-2xl font-bold ${
                    parseResults.totalErrors > 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {parseResults.totalErrors}
                  </div>
                  <div className="text-sm text-gray-600">Erori</div>
                </div>
                <div className={`border rounded-lg p-4 ${
                  parseResults.totalWarnings > 0 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-2xl font-bold ${
                    parseResults.totalWarnings > 0 ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {parseResults.totalWarnings}
                  </div>
                  <div className="text-sm text-gray-600">Avertismente</div>
                </div>
              </div>

              {/* Raport detaliat */}
              {showReport && importReport && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-3">📊 Raport Detaliat</h4>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {importReport}
                  </pre>
                </div>
              )}

              {/* Mesaje de stare */}
              {parseResults.totalErrors > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="text-red-500 mr-3">❌</div>
                    <div>
                      <h4 className="font-medium text-red-800 mb-1">
                        Erori găsite în fișier
                      </h4>
                      <p className="text-sm text-red-700">
                        Vă rugăm să corectați erorile din fișierul Excel și să încercați din nou.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {parseResults.totalWarnings > 0 && parseResults.totalErrors === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="text-yellow-500 mr-3">⚠️</div>
                    <div>
                      <h4 className="font-medium text-yellow-800 mb-1">
                        Avertismente
                      </h4>
                      <p className="text-sm text-yellow-700">
                        Am găsit câteva avertismente, dar puteți continua cu importul.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {parseResults.totalErrors === 0 && parseResults.totalApartments > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="text-green-500 mr-3">✅</div>
                    <div>
                      <h4 className="font-medium text-green-800 mb-1">
                        Fișier valid
                      </h4>
                      <p className="text-sm text-green-700">
                        Fișierul a fost verificat cu succes. Puteți continua cu importul.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instrucțiuni */}
          {!file && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3">📌 Instrucțiuni</h4>
              <ol className="text-sm text-blue-700 space-y-2">
                <li>1. Descarcă template-ul Excel din pagina de Configurare Apartamente</li>
                <li>2. Completează datele apartamentelor conform instrucțiunilor din template</li>
                <li>3. Salvează fișierul și încarcă-l aici</li>
                <li>4. Verifică rezultatele și apasă Import pentru a adăuga apartamentele</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex justify-between">
          <button
            onClick={handleClose}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            Anulează
          </button>
          
          {parseResults && parseResults.totalErrors === 0 && parseResults.totalApartments > 0 && (
            <button
              onClick={handleImport}
              disabled={isProcessing}
              className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Se importă...
                </>
              ) : (
                <>
                  ✅ Import {parseResults.totalApartments} Apartamente
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelUploadModal;