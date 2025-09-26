import React, { useState, useEffect } from 'react';
import { Settings, Calendar, AlertCircle, RefreshCw, Database, Clock, Save } from 'lucide-react';
import DashboardHeader from '../dashboard/DashboardHeader';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// Lunile în română - definite înainte de a fi folosite
const romanianMonths = [
  'ianuarie', 'februarie', 'martie', 'aprilie',
  'mai', 'iunie', 'iulie', 'august',
  'septembrie', 'octombrie', 'noiembrie', 'decembrie'
];

/**
 * ⚙️ SETTINGS VIEW - CONFIGURAREA APLICAȚIEI
 *
 * Permite configurarea lunilor și altor setări ale aplicației
 */
const SettingsView = ({
  association,
  updateAssociation,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses,
  isMonthReadOnly,
  getAssociationApartments,
  handleNavigation,
  getMonthType,
  currentSheet,
  publishedSheet,
  sheets = [],
  updateSheetCustomName,
  updateSheetMonthSettings
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('luni'); // 'luni', 'general', 'sistem'

  // State pentru configurarea lunilor cu valori default inteligente
  const [monthSettings, setMonthSettings] = useState(() => {
    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setMonth(previousDate.getMonth() - 1);

    return {
      workingMonth: romanianMonths[currentDate.getMonth()], // Luna curentă pentru întreținere
      workingYear: currentDate.getFullYear(),
      consumptionMonth: romanianMonths[previousDate.getMonth()], // Luna anterioară pentru consumuri
      consumptionYear: previousDate.getFullYear()
    };
  });

  // State pentru alte setări
  const [generalSettings, setGeneralSettings] = useState({
    autoPublish: false,
    requireConfirmationForPublish: true,
    defaultPenaltyRate: 0.02,
    daysBeforePenalty: 30
  });

  // Încarcă setările existente
  useEffect(() => {
    if (association?.id) {
      loadSettings();
    }
  }, [association?.id]);

  const loadSettings = async () => {
    if (!association?.id) return;

    try {
      const settingsRef = doc(db, 'associations', association.id, 'settings', 'app');
      const settingsDoc = await getDoc(settingsRef);

      // Setări default inteligente bazate pe luna curentă
      const currentDate = new Date();
      const previousDate = new Date(currentDate);
      previousDate.setMonth(previousDate.getMonth() - 1);

      const defaultSettings = {
        workingMonth: romanianMonths[currentDate.getMonth()],
        workingYear: currentDate.getFullYear(),
        consumptionMonth: romanianMonths[previousDate.getMonth()],
        consumptionYear: previousDate.getFullYear()
      };

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();

        // Folosește setările salvate doar dacă sunt complete, altfel folosește default
        if (data.monthSettings && data.monthSettings.workingMonth && data.monthSettings.consumptionMonth) {
          setMonthSettings(data.monthSettings);
        } else {
          // Dacă setările sunt incomplete, folosește default
          setMonthSettings(defaultSettings);
        }

        if (data.generalSettings) {
          setGeneralSettings(data.generalSettings);
        }
      } else {
        // Nu există setări salvate, folosește default
        setMonthSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);

      // În caz de eroare, setează valorile default
      const currentDate = new Date();
      const previousDate = new Date(currentDate);
      previousDate.setMonth(previousDate.getMonth() - 1);

      setMonthSettings({
        workingMonth: romanianMonths[currentDate.getMonth()],
        workingYear: currentDate.getFullYear(),
        consumptionMonth: romanianMonths[previousDate.getMonth()],
        consumptionYear: previousDate.getFullYear()
      });
    }
  };

  // Salvează setările
  const saveSettings = async () => {
    if (!association?.id) return;

    setIsSaving(true);
    setSaveMessage('');

    try {
      // Salvează setările generale în Firestore
      const settingsRef = doc(db, 'associations', association.id, 'settings', 'app');

      await setDoc(settingsRef, {
        monthSettings,
        generalSettings,
        updatedAt: new Date().toISOString(),
        updatedBy: association.adminId || 'unknown'
      }, { merge: true });

      // Actualizează sheet-ul curent în lucru cu noile setări
      if (currentSheet && updateSheetMonthSettings) {
        const workingMonthName = `${monthSettings.workingMonth} ${monthSettings.workingYear}`;
        const consumptionMonthName = `${monthSettings.consumptionMonth} ${monthSettings.consumptionYear}`;
        await updateSheetMonthSettings(currentSheet.id, workingMonthName, consumptionMonthName);
      }

      setSaveMessage('✅ Setările au fost salvate cu succes!');

      // Actualizează asociația locală dacă e necesar
      if (updateAssociation) {
        await updateAssociation({
          ...association,
          settings: {
            monthSettings,
            generalSettings
          }
        });
      }

      // Șterge mesajul după 3 secunde, dar NU face reload
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('❌ Eroare la salvarea setărilor');
    } finally {
      setIsSaving(false);
    }
  };

  // Resetează la setările default
  const resetToDefaults = () => {
    if (!window.confirm('Sigur doriți să resetați toate setările la valorile implicite?')) {
      return;
    }

    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setMonth(previousDate.getMonth() - 1);

    setMonthSettings({
      workingMonth: romanianMonths[currentDate.getMonth()],
      workingYear: currentDate.getFullYear(),
      consumptionMonth: romanianMonths[previousDate.getMonth()],
      consumptionYear: previousDate.getFullYear()
    });

    setGeneralSettings({
      autoPublish: false,
      requireConfirmationForPublish: true,
      defaultPenaltyRate: 0.02,
      daysBeforePenalty: 30
    });

    setSaveMessage('🔄 Setările au fost resetate la valorile implicite');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const monthType = getMonthType ? getMonthType(currentMonth) : null;

  return (
    <div className={`min-h-screen pt-2 px-6 pb-6 ${
      monthType === 'current'
        ? "bg-gradient-to-br from-indigo-50 to-blue-100"
        : monthType === 'next'
        ? "bg-gradient-to-br from-green-50 to-emerald-100"
        : monthType === 'historic'
        ? "bg-gradient-to-br from-gray-50 to-gray-100"
        : "bg-gradient-to-br from-indigo-50 to-blue-100"
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
          getMonthType={getMonthType}
        />

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">⚙️ Setări</h1>
            {saveMessage && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium animate-pulse ${
                saveMessage.includes('✅') ? 'bg-green-100 text-green-700' :
                saveMessage.includes('❌') ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {saveMessage}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b">
            <div className="flex">
            <button
              onClick={() => setActiveTab('luni')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'luni'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Configurare Luni
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-5 h-5" />
              Setări Generale
            </button>
            <button
              onClick={() => setActiveTab('sistem')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'sistem'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="w-5 h-5" />
              Sistem
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Configurare Luni Tab */}
          {activeTab === 'luni' && (
            <div className="space-y-6">
              {/* Setări pentru Sheet-ul în Lucru */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Configurare Luni pentru Sheet-ul în Lucru
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Setați luna pentru care se calculează întreținerea și luna pentru care sunt înregistrate consumurile.
                </p>

                {/* Explicația sistemului de sheet-uri */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h5 className="font-medium text-blue-800 mb-2">💡 Despre Sheet-urile de Lucru</h5>
                  <div className="text-xs text-blue-700 space-y-2">
                    <p><strong>Sheet în Lucru:</strong> Luna pentru care calculați întreținerea în prezent</p>
                    <p><strong>Sheet Publicat:</strong> Luna care a fost finalizată și publicată pentru plată</p>
                    <p><strong>Sheet Arhivat:</strong> Lunile vechi care nu mai pot fi modificate</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-600 font-medium">
                      🔄 La publicare, luna în lucru devine publicată și se creează automat un nou sheet pentru luna următoare
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Luna în Lucru */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Luna în Lucru (întreținere)</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Luna întreținerii
                        </label>
                        <select
                          value={monthSettings.workingMonth}
                          onChange={(e) => setMonthSettings(prev => ({
                            ...prev,
                            workingMonth: e.target.value
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selectați luna</option>
                          {romanianMonths.map(month => (
                            <option key={month} value={month}>
                              {month.charAt(0).toUpperCase() + month.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Anul
                        </label>
                        <input
                          type="number"
                          min="2020"
                          max="2030"
                          value={monthSettings.workingYear}
                          onChange={(e) => setMonthSettings(prev => ({
                            ...prev,
                            workingYear: parseInt(e.target.value) || new Date().getFullYear()
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Luna Consum */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Luna pentru Consumuri</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Luna consumurilor
                        </label>
                        <select
                          value={monthSettings.consumptionMonth}
                          onChange={(e) => setMonthSettings(prev => ({
                            ...prev,
                            consumptionMonth: e.target.value
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selectați luna</option>
                          {romanianMonths.map(month => (
                            <option key={month} value={month}>
                              {month.charAt(0).toUpperCase() + month.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Anul
                        </label>
                        <input
                          type="number"
                          min="2020"
                          max="2030"
                          value={monthSettings.consumptionYear}
                          onChange={(e) => setMonthSettings(prev => ({
                            ...prev,
                            consumptionYear: parseInt(e.target.value) || new Date().getFullYear()
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {monthSettings.workingMonth && monthSettings.consumptionMonth && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Preview Document
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-blue-300">
                    <p className="text-center text-lg font-bold mb-2">
                      TABEL DE ÎNTREȚINERE
                    </p>
                    <p className="text-center text-gray-700">
                      Întreținere luna <strong className="text-blue-600">
                        {monthSettings.workingMonth.charAt(0).toUpperCase() + monthSettings.workingMonth.slice(1)} {monthSettings.workingYear}
                      </strong>
                    </p>
                    <p className="text-center text-gray-700">
                      Consum luna <strong className="text-blue-600">
                        {monthSettings.consumptionMonth.charAt(0).toUpperCase() + monthSettings.consumptionMonth.slice(1)} {monthSettings.consumptionYear}
                      </strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Notă importantă:</p>
                    <p>La publicarea sheet-ului curent, următorul sheet va incrementa automat ambele luni păstrând diferența dintre ele.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Setări Generale Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Comportament Publicare
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={generalSettings.requireConfirmationForPublish}
                      onChange={(e) => setGeneralSettings(prev => ({
                        ...prev,
                        requireConfirmationForPublish: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Cere confirmare înainte de publicarea unei luni
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Penalități și Termene
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rata penalității (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      value={generalSettings.defaultPenaltyRate * 100}
                      onChange={(e) => setGeneralSettings(prev => ({
                        ...prev,
                        defaultPenaltyRate: parseFloat(e.target.value) / 100 || 0
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Standard: 2% din suma datorată</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zile până la aplicarea penalităților
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={generalSettings.daysBeforePenalty}
                      onChange={(e) => setGeneralSettings(prev => ({
                        ...prev,
                        daysBeforePenalty: parseInt(e.target.value) || 30
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Standard: 30 de zile de la emitere</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sistem Tab */}
          {activeTab === 'sistem' && (
            <div className="space-y-6">
              {/* Informații Sistem */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Informații Sistem
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600">Asociație</p>
                    <p className="font-medium text-gray-900">{association?.name || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600">CUI</p>
                    <p className="font-medium text-gray-900">{association?.cui || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600">Total Sheet-uri</p>
                    <p className="font-medium text-gray-900">{sheets.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600">Sheet în lucru</p>
                    <p className="font-medium text-gray-900">
                      {currentSheet?.monthYear || 'Niciunul'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600">Sheet publicat</p>
                    <p className="font-medium text-gray-900">
                      {publishedSheet?.monthYear || 'Niciunul'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600">Data creării</p>
                    <p className="font-medium text-gray-900">
                      {association?.createdAt ? new Date(association.createdAt).toLocaleDateString('ro-RO') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Acțiuni Sistem */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Acțiuni Sistem
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={resetToDefaults}
                    className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resetează Setările la Default
                  </button>
                  <p className="text-xs text-gray-500">
                    ⚠️ Resetarea setărilor va reveni la valorile implicite ale aplicației
                  </p>
                </div>
              </div>

              {/* Status Sheet-uri Detaliat */}
              {(currentSheet || publishedSheet) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <Database className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">Status Sheet-uri</p>
                      {currentSheet && (
                        <p>• Sheet în lucru: {currentSheet.monthYear} (ID: {currentSheet.id?.slice(-6)})</p>
                      )}
                      {publishedSheet && (
                        <p>• Sheet publicat: {publishedSheet.monthYear} (ID: {publishedSheet.id?.slice(-6)})</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

          {/* Footer cu butoane de acțiune */}
          <div className="px-6 py-4 bg-gray-50 border-t rounded-b-xl">
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleNavigation('dashboard')}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Se salvează...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvează Setările
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;