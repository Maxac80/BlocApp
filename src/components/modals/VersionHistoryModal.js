// src/components/modals/VersionHistoryModal.js
import React, { useState } from 'react';
import { 
  XCircle, 
  Calendar, 
  Download, 
  Upload, 
  Eye, 
  Trash2, 
  BarChart3,
  CheckCircle,
  Clock,
  Archive
} from 'lucide-react';

const VersionHistoryModal = ({
  showVersionHistory,
  setShowVersionHistory,
  getAvailableVersions,
  loadVersion,
  exportHistory,
  importHistory,
  isLoadingVersion,
  onSelectVersion,
  currentMonth
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importStatus, setImportStatus] = useState(null);

  if (!showVersionHistory) return null;

  const versions = getAvailableVersions();

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Selectează un fișier pentru import');
      return;
    }

    try {
      setImportStatus('loading');
      const result = await importHistory(selectedFile);
      if (result.success) {
        setImportStatus('success');
        alert(`✅ Import reușit! ${result.importedVersions} versiuni importate.`);
        setSelectedFile(null);
      } else {
        setImportStatus('error');
        alert(`❌ Eroare la import: ${result.error}`);
      }
    } catch (error) {
      setImportStatus('error');
      alert(`❌ Eroare la import: ${error.message}`);
    }

    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleViewVersion = (month) => {
    const result = loadVersion(month);
    if (result.success) {
      onSelectVersion(month, result.data);
      setShowVersionHistory(false);
    } else {
      alert(`❌ Eroare la încărcarea versiunii: ${result.error}`);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-blue-50 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold text-blue-800">
            📚 Istoric Versiuni - Sistemul de Versioning
          </h3>
          <button
            onClick={() => setShowVersionHistory(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex">
          {/* Lista versiunilor - partea stângă */}
          <div className="flex-1 p-6 border-r">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-800">Versiuni Publicate ({versions.length})</h4>
              <div className="flex gap-2">
                <button
                  onClick={exportHistory}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center"
                  title="Exportă istoric pentru backup"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </button>
              </div>
            </div>

            {versions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Archive className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">Nu există versiuni publicate</p>
                <p className="text-sm mt-1">Publică o lună pentru a crea prima versiune</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {versions.map((version) => (
                  <div key={version.key} className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                    version.month === currentMonth ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-gray-800">{version.month}</h5>
                          {version.month === currentMonth && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              Curentă
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{version.version}</p>
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(version.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewVersion(version.month)}
                        disabled={isLoadingVersion}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center disabled:opacity-50"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Vizualizează
                      </button>
                    </div>

                    {/* Statistici versiune */}
                    <div className="grid grid-cols-4 gap-2 mt-3 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-800">{version.statistics.totalApartments}</div>
                        <div className="text-xs text-gray-600">Apartamente</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-green-600">{version.statistics.apartmentePlatite}</div>
                        <div className="text-xs text-gray-600">Plătite</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-red-600">{version.statistics.apartamenteRestante}</div>
                        <div className="text-xs text-gray-600">Restante</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-800">{version.statistics.totalIncasat.toFixed(0)}</div>
                        <div className="text-xs text-gray-600">Încasat</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panoul de control - partea dreaptă */}
          <div className="w-80 p-6 bg-gray-50">
            <h4 className="font-semibold text-gray-800 mb-4">🛠️ Panoul de Control</h4>
            
            {/* Import/Export */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border">
                <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Istoric
                </h5>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-sm mb-3 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || importStatus === 'loading'}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {importStatus === 'loading' ? (
                    'Se importă...'
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importă Backup
                    </>
                  )}
                </button>
                {importStatus === 'success' && (
                  <div className="flex items-center text-green-600 text-sm mt-2">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Import reușit!
                  </div>
                )}
                {importStatus === 'error' && (
                  <div className="flex items-center text-red-600 text-sm mt-2">
                    <XCircle className="w-4 h-4 mr-1" />
                    Eroare la import
                  </div>
                )}
              </div>

              {/* Informații sistem */}
              <div className="bg-white rounded-lg p-4 border">
                <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Statistici Sistem
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total versiuni:</span>
                    <span className="font-medium">{versions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stocare:</span>
                    <span className="font-medium">localStorage</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ultima actualizare:</span>
                    <span className="font-medium">
                      {versions.length > 0 ? formatDate(versions[0].timestamp).split(' ')[0] : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instrucțiuni */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h5 className="font-medium text-blue-800 mb-2">💡 Cum funcționează</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Versiunile se salvează automat la publicare</li>
                  <li>• Datele sunt stocate local în browser</li>
                  <li>• Exportă backup-uri pentru siguranță</li>
                  <li>• Vizualizează orice versiune istorică</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;