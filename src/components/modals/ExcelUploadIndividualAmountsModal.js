import React, { useState, useRef } from 'react';
import { parseIndividualAmountsExcel } from '../../utils/excelParserIndividualAmounts';
import { generateIndividualAmountsTemplate, generateConsumptionTemplate } from '../../utils/excelTemplateIndividualAmounts';

/**
 * 📊 MODAL UPLOAD EXCEL - SUME INDIVIDUALE / CONSUMURI
 *
 * Permite:
 * 1. Descărcarea template-ului Excel pre-populat cu apartamentele
 * 2. Încărcarea fișierului completat
 * 3. Previzualizarea cu comparație veche → nouă
 * 4. Confirmarea importului (batch save)
 *
 * Props:
 * - mode: 'individual' (default) — sume în RON; 'consumption' — consumuri în mc
 */
const ExcelUploadIndividualAmountsModal = ({
  isOpen,
  onClose,
  association,
  expense,
  apartments,
  blocks,
  stairs,
  existingAmounts = {}, // { [apartmentId]: number } - valorile actuale din sheet
  onImportConfirmed,  // async (amounts: { [apartmentId]: number }) => void
  mode = 'individual'
}) => {
  const [file, setFile] = useState(null);
  const [parseResults, setParseResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef(null);

  // 🏷️ Etichete adaptate după mod
  const isConsumption = mode === 'consumption';
  const labels = isConsumption
    ? {
        modalTitle: '📊 Importă consumuri din Excel',
        step1Title: '📥 Pasul 1: Descarcă template-ul',
        step1Desc: apartments.length,
        valueColumnLabel: 'Consum (mc)',
        valueColumnShort: 'Consum',
        valueUnit: 'mc',
        valueNounPlural: 'consumuri',
        valueNounShort: 'consumul',
        filledLabel: 'Consumuri completate',
        importBtnSuffix: 'consumuri',
        successMsg: 'consumuri au fost actualizate',
        emptyKept: '(gol — păstrat)'
      }
    : {
        modalTitle: '📊 Importă sume din Excel',
        step1Title: '📥 Pasul 1: Descarcă template-ul',
        step1Desc: apartments.length,
        valueColumnLabel: 'Sumă (RON)',
        valueColumnShort: 'Sumă',
        valueUnit: 'lei',
        valueNounPlural: 'sume',
        valueNounShort: 'suma',
        filledLabel: 'Sume completate',
        importBtnSuffix: 'sume',
        successMsg: 'sume au fost actualizate',
        emptyKept: '(gol — păstrat)'
      };

  const handleClose = () => {
    setFile(null);
    setParseResults(null);
    setIsProcessing(false);
    onClose();
  };

  // 📥 Descarcă template
  const handleDownloadTemplate = async () => {
    try {
      setIsGenerating(true);
      if (isConsumption) {
        await generateConsumptionTemplate(association, expense, apartments, blocks, stairs);
      } else {
        await generateIndividualAmountsTemplate(association, expense, apartments, blocks, stairs);
      }
    } catch (error) {
      console.error('❌ Eroare la generarea template-ului:', error);
      alert('Eroare la generarea template-ului: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 📁 Selectare fișier
  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      alert('Vă rugăm să selectați un fișier Excel (.xlsx sau .xls)');
      return;
    }

    setFile(selectedFile);
    setParseResults(null);
  };

  // 🔍 Procesare fișier
  const handleProcessFile = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const results = await parseIndividualAmountsExcel(file, apartments);
      setParseResults(results);
    } catch (error) {
      console.error('❌ Eroare la procesarea fișierului:', error);
      alert('Eroare la procesarea fișierului: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Import
  const handleImport = async () => {
    if (!parseResults || parseResults.errors.length > 0 || parseResults.stats.filled === 0) return;
    setIsProcessing(true);
    try {
      await onImportConfirmed(parseResults.amounts);
      alert(`✅ Import reușit! ${parseResults.stats.filled} ${labels.successMsg}.`);
      handleClose();
    } catch (error) {
      console.error('❌ Eroare la import:', error);
      alert('Eroare la import: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const canImport =
    parseResults &&
    parseResults.errors.length === 0 &&
    parseResults.stats.filled > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                {labels.modalTitle}
              </h2>
              <p className="text-green-100 mt-1">
                {expense?.name || 'Cheltuială'} • {association?.name || ''}
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
          {/* Pas 1: Descarcă template */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">{labels.step1Title}</h3>
            <p className="text-sm text-blue-800 mb-3">
              Template-ul conține toate cele {apartments.length} apartamente din asociație. Completează doar coloana
              <strong> „{labels.valueColumnLabel}"</strong> pentru fiecare apartament.
            </p>
            <button
              onClick={handleDownloadTemplate}
              disabled={isGenerating}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Se generează...
                </>
              ) : (
                <>📥 Descarcă template Excel</>
              )}
            </button>
          </div>

          {/* Pas 2: Upload */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">📤 Pasul 2: Încarcă fișierul completat</h3>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
              }`}
            >
              {!file ? (
                <>
                  <div className="text-4xl mb-4">📁</div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">Selectează fișierul Excel</h4>
                  <p className="text-gray-600 mb-4">Alege template-ul completat cu {labels.valueNounPlural}le</p>
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
                    Alege fișier Excel
                  </button>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">✅</div>
                  <h4 className="text-lg font-semibold text-green-700 mb-2">Fișier selectat</h4>
                  <p className="text-gray-700 font-medium mb-2">📄 {file.name}</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Dimensiune: {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <div className="flex justify-center gap-3 flex-wrap">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50"
                    >
                      Schimbă fișier
                    </button>
                    <button
                      onClick={handleProcessFile}
                      disabled={isProcessing}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                    >
                      {isProcessing ? 'Se procesează...' : '🔍 Verifică fișierul'}
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

          {/* Rezultate */}
          {parseResults && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">📋 Rezultate verificare</h3>

              {/* Statistici */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{parseResults.stats.filled}</div>
                  <div className="text-xs text-gray-600">{labels.filledLabel}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-600">{parseResults.stats.skipped}</div>
                  <div className="text-xs text-gray-600">Goale (păstrate)</div>
                </div>
                <div className={`border rounded-lg p-3 ${parseResults.stats.errors > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-2xl font-bold ${parseResults.stats.errors > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {parseResults.stats.errors}
                  </div>
                  <div className="text-xs text-gray-600">Erori</div>
                </div>
                <div className={`border rounded-lg p-3 ${parseResults.stats.warnings > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-2xl font-bold ${parseResults.stats.warnings > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                    {parseResults.stats.warnings}
                  </div>
                  <div className="text-xs text-gray-600">Avertizări</div>
                </div>
              </div>

              {/* Erori */}
              {parseResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-800 mb-2">❌ Erori găsite</h4>
                  <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                    {parseResults.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Avertizări */}
              {parseResults.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Avertizări</h4>
                  <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                    {parseResults.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview (doar dacă fără erori) */}
              {parseResults.errors.length === 0 && parseResults.preview.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-800">📋 Preview - {labels.valueNounPlural}le ce vor fi importate</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Apt</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Proprietar</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">{labels.valueColumnShort} veche</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">{labels.valueColumnShort} nouă</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResults.preview.map((entry, idx) => {
                          const oldAmount = existingAmounts[entry.apartmentId];
                          const isChanging =
                            !entry.skipped &&
                            oldAmount !== undefined &&
                            parseFloat(oldAmount) !== entry.amount;
                          return (
                            <tr
                              key={idx}
                              className={`border-b border-gray-100 ${entry.skipped ? 'bg-gray-50' : ''}`}
                            >
                              <td className="px-3 py-2 font-medium">{entry.apartmentNumber}</td>
                              <td className="px-3 py-2 text-gray-700">{entry.apartmentOwner}</td>
                              <td className="px-3 py-2 text-right text-gray-500">
                                {oldAmount !== undefined && oldAmount !== null && oldAmount !== ''
                                  ? `${parseFloat(oldAmount).toFixed(2)} ${labels.valueUnit}`
                                  : '—'}
                              </td>
                              <td className={`px-3 py-2 text-right font-medium ${
                                entry.skipped ? 'text-gray-400 italic' :
                                isChanging ? 'text-orange-600' : 'text-green-700'
                              }`}>
                                {entry.skipped
                                  ? labels.emptyKept
                                  : `${entry.amount.toFixed(2)} ${labels.valueUnit}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex justify-between flex-wrap gap-3">
          <button
            onClick={handleClose}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            Anulează
          </button>

          {canImport && (
            <button
              onClick={handleImport}
              disabled={isProcessing}
              className="bg-green-600 text-white px-8 py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Se importă...
                </>
              ) : (
                <>✅ Confirmă import ({parseResults.stats.filled} {labels.importBtnSuffix})</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 💧 Wrapper pentru import consumuri (mc)
 */
export const ExcelUploadConsumptionModal = (props) => (
  <ExcelUploadIndividualAmountsModal {...props} mode="consumption" />
);

export default ExcelUploadIndividualAmountsModal;
