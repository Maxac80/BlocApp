// hooks/useVersioning.js
import { useState, useCallback, useEffect } from 'react';

export const useVersioning = () => {
  const [versionHistory, setVersionHistory] = useState({});
  const [currentVersion, setCurrentVersion] = useState(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);

  // Încarcă istoricul versiunilor din localStorage la inițializare
  useEffect(() => {
    const stored = localStorage.getItem('blocapp_version_history');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setVersionHistory(parsed);
      } catch (error) {
        console.warn('Eroare la încărcarea istoricului versiunilor:', error);
        setVersionHistory({});
      }
    }
  }, []);

  // Salvează o nouă versiune în istoric
  const saveVersion = useCallback((month, versionData) => {
    setIsLoadingVersion(true);
    
    try {
      const versionKey = month.replace(/\s+/g, '_'); // Înlocuiește spațiile cu underscore
      const timestamp = new Date().toISOString();
      
      const newVersion = {
        month,
        timestamp,
        status: 'published',
        data: {
          // Datele de întreținere
          maintenanceData: versionData.maintenanceData || [],
          // Datele de cheltuieli
          expenses: versionData.expenses || [],
          // Configurațiile active la momentul publicării
          expenseConfigs: versionData.expenseConfigs || {},
          // Soldurile inițiale (dacă există)
          initialBalances: versionData.initialBalances || {},
          // Statistici calculate
          statistics: {
            totalApartments: versionData.maintenanceData?.length || 0,
            totalIncasat: versionData.maintenanceData?.filter(d => d.paid).reduce((sum, d) => sum + d.totalDatorat, 0) || 0,
            totalRestante: versionData.maintenanceData?.filter(d => !d.paid).reduce((sum, d) => sum + d.totalDatorat, 0) || 0,
            apartmentePlatite: versionData.maintenanceData?.filter(d => d.paid).length || 0,
            apartamenteRestante: versionData.maintenanceData?.filter(d => !d.paid).length || 0
          },
          // Meta informații
          meta: {
            associationId: versionData.associationId,
            associationName: versionData.associationName,
            publishedBy: versionData.publishedBy || 'Administrator',
            version: generateVersionNumber(month),
            checksum: generateChecksum(versionData.maintenanceData)
          }
        }
      };

      const updatedHistory = {
        ...versionHistory,
        [versionKey]: newVersion
      };

      // Salvează în localStorage
      localStorage.setItem('blocapp_version_history', JSON.stringify(updatedHistory));
      setVersionHistory(updatedHistory);

      console.log(`✅ Versiunea pentru ${month} a fost salvată`, newVersion);
      return { success: true, version: newVersion };
      
    } catch (error) {
      console.error('❌ Eroare la salvarea versiunii:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoadingVersion(false);
    }
  }, [versionHistory]);

  // Încarcă o versiune specifică
  const loadVersion = useCallback((month) => {
    setIsLoadingVersion(true);
    
    try {
      const versionKey = month.replace(/\s+/g, '_');
      const version = versionHistory[versionKey];
      
      if (!version) {
        throw new Error(`Versiunea pentru ${month} nu a fost găsită`);
      }

      setCurrentVersion(version);
      console.log(`✅ Versiunea pentru ${month} a fost încărcată`, version);
      
      return { success: true, data: version.data };
      
    } catch (error) {
      console.error('❌ Eroare la încărcarea versiunii:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoadingVersion(false);
    }
  }, [versionHistory]);

  // Obține lista de versiuni disponibile
  const getAvailableVersions = useCallback(() => {
    const versions = Object.values(versionHistory)
      .filter(v => v.status === 'published')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
    return versions.map(v => ({
      month: v.month,
      timestamp: v.timestamp,
      version: v.data.meta.version,
      statistics: v.data.statistics,
      key: v.month.replace(/\s+/g, '_')
    }));
  }, [versionHistory]);

  // Verifică dacă o versiune există
  const hasVersion = useCallback((month) => {
    const versionKey = month.replace(/\s+/g, '_');
    return !!versionHistory[versionKey];
  }, [versionHistory]);

  // Șterge o versiune (doar pentru testare - în producție ar trebui să fie read-only)
  const deleteVersion = useCallback((month) => {
    const versionKey = month.replace(/\s+/g, '_');
    const updatedHistory = { ...versionHistory };
    delete updatedHistory[versionKey];
    
    localStorage.setItem('blocapp_version_history', JSON.stringify(updatedHistory));
    setVersionHistory(updatedHistory);
    
    if (currentVersion?.month === month) {
      setCurrentVersion(null);
    }
    
    console.log(`🗑️ Versiunea pentru ${month} a fost ștearsă`);
  }, [versionHistory, currentVersion]);

  // Exportă tot istoricul pentru backup
  const exportHistory = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      totalVersions: Object.keys(versionHistory).length,
      history: versionHistory
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blocapp_history_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📦 Istoricul a fost exportat');
  }, [versionHistory]);

  // Importă istoric din backup
  const importHistory = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          if (!importData.history || typeof importData.history !== 'object') {
            throw new Error('Format de backup invalid');
          }
          
          // Merge cu datele existente (păstrează versiunile existente)
          const mergedHistory = { ...versionHistory, ...importData.history };
          
          localStorage.setItem('blocapp_version_history', JSON.stringify(mergedHistory));
          setVersionHistory(mergedHistory);
          
          console.log(`📥 Istoricul a fost importat: ${Object.keys(importData.history).length} versiuni`);
          resolve({ success: true, importedVersions: Object.keys(importData.history).length });
          
        } catch (error) {
          console.error('❌ Eroare la importul istoricului:', error);
          reject({ success: false, error: error.message });
        }
      };
      
      reader.onerror = () => {
        reject({ success: false, error: 'Eroare la citirea fișierului' });
      };
      
      reader.readAsText(file);
    });
  }, [versionHistory]);

  return {
    // State
    versionHistory,
    currentVersion,
    isLoadingVersion,
    
    // Actions
    saveVersion,
    loadVersion,
    deleteVersion,
    
    // Getters
    getAvailableVersions,
    hasVersion,
    
    // Utils
    exportHistory,
    importHistory
  };
};

// Funcții helper pentru generarea versiunilor și checksum-urilor
const generateVersionNumber = (month) => {
  const date = new Date();
  const timestamp = date.getTime();
  const shortHash = timestamp.toString(36).slice(-6).toUpperCase();
  return `v${date.getFullYear()}.${date.getMonth() + 1}.${shortHash}`;
};

const generateChecksum = (data) => {
  if (!data || !Array.isArray(data)) return 'EMPTY';
  
  const dataString = JSON.stringify(data.map(d => ({
    apartmentId: d.apartmentId,
    totalDatorat: d.totalDatorat,
    paid: d.paid
  })));
  
  // Simple checksum using string hash
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).toUpperCase().slice(0, 8);
};