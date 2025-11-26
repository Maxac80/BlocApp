import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Mapare distributionType la etichete pentru UI
 */
const getDistributionLabel = (distributionType) => {
  const labels = {
    'equal': { type: 'apartament', label: 'Per apartament' },
    'byPersons': { type: 'persoană', label: 'Per persoană' },
    'byConsumption': { type: 'consum', label: 'După consum' },
    'consumption': { type: 'consum', label: 'După consum' },
    'cotaParte': { type: 'cotă', label: 'După cotă parte' },
    'byArea': { type: 'cotă', label: 'După suprafață' },
    'individual': { type: 'individual', label: 'Sumă individuală' },
    'fixed': { type: 'fix', label: 'Sumă fixă' }
  };
  return labels[distributionType] || { type: 'apartament', label: 'Standard' };
};

/**
 * Helper pentru matching consistent al apartamentului
 * Suportă match pe apartmentId, apartmentNumber (string sau int)
 */
const matchApartment = (row, aptId) => {
  if (!row || !aptId) return false;
  return (
    row.apartmentId === aptId ||
    row.apartmentNumber === aptId ||
    row.apartmentNumber === parseInt(aptId) ||
    String(row.apartmentNumber) === String(aptId)
  );
};

/**
 * Hook pentru gestionarea datelor proprietarului
 *
 * Features:
 * - Încarcă sheets pentru asociație
 * - Filtrează date pentru apartamentul specific
 * - Istoric luni și plăți
 * - Real-time sync cu Firebase
 * - Detalii cheltuieli per apartament
 * - Istoric și transmitere indexuri contoare
 */
export function useOwnerData(associationId, apartmentId) {
  // Verifică dacă avem date necesare pentru interogare
  const hasRequiredData = associationId && apartmentId;

  // State
  const [loading, setLoading] = useState(hasRequiredData);
  const [error, setError] = useState(null);

  // Sheets
  const [currentSheet, setCurrentSheet] = useState(null);
  const [publishedSheet, setPublishedSheet] = useState(null);
  const [archivedSheets, setArchivedSheets] = useState([]);

  // Date procesate pentru apartament
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [monthlyHistory, setMonthlyHistory] = useState([]);

  // NOU: Detalii cheltuieli formatate pentru UI
  const [expenseDetails, setExpenseDetails] = useState([]);

  // NOU: Date contoare (indexuri)
  const [meterReadings, setMeterReadings] = useState([]);
  const [availableMeters, setAvailableMeters] = useState([]);

  // Luna selectată pentru vizualizare
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Încarcă sheets-urile din Firebase
  useEffect(() => {
    if (!hasRequiredData) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const sheetsRef = collection(db, `associations/${associationId}/sheets`);

    const unsubscribe = onSnapshot(
      sheetsRef,
      (snapshot) => {
        try {
          const sheets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Separă sheets după status
          const inProgress = sheets.find(s => s.status === 'in_progress');
          const published = sheets.find(s => s.status === 'published');
          const archived = sheets
            .filter(s => s.status === 'archived')
            .sort((a, b) => {
              // Sortează după dată descrescător
              const dateA = a.archivedAt?.toDate?.() || new Date(0);
              const dateB = b.archivedAt?.toDate?.() || new Date(0);
              return dateB - dateA;
            });

          setCurrentSheet(inProgress || null);
          setPublishedSheet(published || null);
          setArchivedSheets(archived);

          // Setează luna implicită (published sau current)
          const defaultSheet = published || inProgress;
          if (defaultSheet && !selectedMonth) {
            setSelectedMonth(defaultSheet.monthYear);
          }

          // Procesează datele pentru apartament
          if (apartmentId) {
            processApartmentData(
              apartmentId,
              inProgress,
              published,
              archived
            );
          }

          setLoading(false);
        } catch (err) {
          console.error('Error processing sheets:', err);
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error loading sheets:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId, apartmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Procesează datele pentru apartamentul specific
  const processApartmentData = useCallback((aptId, current, published, archived) => {
    // Găsește sheet-ul activ pentru afișare
    const activeSheet = published || current;

    if (activeSheet) {
      // DEBUG: Afișează toate apartamentele din maintenanceTable pentru a găsi ID-ul corect
      console.log('🔍 [useOwnerData] Căutăm apartament cu ID:', aptId);
      console.log('🔍 [useOwnerData] Apartamente în maintenanceTable:',
        activeSheet.maintenanceTable?.map(row => ({
          apartmentId: row.apartmentId,
          apartmentNumber: row.apartmentNumber,
          owner: row.owner
        }))
      );

      // Extrage maintenance data pentru apartament folosind helper-ul matchApartment
      const maintenance = activeSheet.maintenanceTable?.find(row => matchApartment(row, aptId));

      if (maintenance) {
        // Calculează plățile pentru acest apartament din toate sheets
        const allPayments = [];

        // Plăți din sheet-ul publicat
        if (published?.payments) {
          const aptPayments = published.payments.filter(p => matchApartment(p, aptId));
          allPayments.push(...aptPayments.map(p => ({
            ...p,
            sheetMonth: published.monthYear
          })));
        }

        // Plăți din sheets arhivate
        archived.forEach(sheet => {
          if (sheet.payments) {
            const aptPayments = sheet.payments.filter(p => matchApartment(p, aptId));
            allPayments.push(...aptPayments.map(p => ({
              ...p,
              sheetMonth: sheet.monthYear
            })));
          }
        });

        // Sortează plățile după dată
        allPayments.sort((a, b) => {
          const dateA = a.paymentDate?.toDate?.() || new Date(a.paymentDate);
          const dateB = b.paymentDate?.toDate?.() || new Date(b.paymentDate);
          return dateB - dateA;
        });

        // Calculează totalul plătit pentru luna curentă
        const currentMonthPayments = allPayments.filter(
          p => p.sheetMonth === activeSheet.monthYear
        );
        const totalPaid = currentMonthPayments.reduce((sum, p) => sum + (p.total || 0), 0);

        setMaintenanceData({
          ...maintenance,
          totalPaid,
          payments: currentMonthPayments,
          sheet: activeSheet
        });

        setPaymentHistory(allPayments);

        // ===== PROCESARE EXPENSE DETAILS =====
        // Extrage cheltuielile detaliate din maintenance.expenseDetails
        if (maintenance.expenseDetails) {
          const formattedExpenses = Object.entries(maintenance.expenseDetails)
            .map(([key, detail]) => {
              // detail = { amount, name, expense }
              const distributionType = detail.expense?.distributionType || 'equal';
              const { type, label } = getDistributionLabel(distributionType);

              return {
                id: key,
                name: detail.name || key,
                amount: detail.amount || 0,
                type,
                label,
                distributionType,
                // Informații extra dacă e pe consum
                consumptionInfo: detail.expense?.consumptionUnit
                  ? { unit: detail.expense.consumptionUnit }
                  : null
              };
            })
            .filter(exp => exp.amount > 0) // Exclude cheltuielile cu sumă 0
            .sort((a, b) => b.amount - a.amount); // Sortează descrescător după sumă

          setExpenseDetails(formattedExpenses);
        } else {
          setExpenseDetails([]);
        }

        // ===== PROCESARE METER READINGS (INDEXURI) =====
        // Colectează indexurile din toate sheet-urile pentru acest apartament
        const allMeterReadings = [];
        const metersFound = new Map(); // Pentru a găsi contoarele disponibile

        // Funcție helper pentru a extrage indexurile dintr-un sheet
        const extractMetersFromSheet = (sheet, monthYear) => {
          if (!sheet?.expenses) return null;

          const monthMeters = [];

          sheet.expenses.forEach(expense => {
            // Verifică dacă e cheltuială pe consum și are indexuri
            if (expense.indexes && expense.indexes[aptId]) {
              const apartmentIndexes = expense.indexes[aptId];

              Object.entries(apartmentIndexes).forEach(([meterType, indexData]) => {
                if (indexData && typeof indexData === 'object') {
                  const meterInfo = {
                    type: meterType,
                    name: indexData.meterName || expense.name || meterType,
                    oldIndex: indexData.oldIndex || 0,
                    newIndex: indexData.newIndex || 0,
                    consumption: indexData.difference || (indexData.newIndex - indexData.oldIndex) || 0,
                    unit: expense.consumptionUnit || 'mc',
                    source: indexData.source || 'admin',
                    submittedAt: indexData.submittedAt,
                    expenseId: expense.id || expense.expenseTypeId
                  };

                  monthMeters.push(meterInfo);

                  // Adaugă la lista de contoare disponibile
                  if (!metersFound.has(meterType)) {
                    metersFound.set(meterType, {
                      id: meterType,
                      name: meterInfo.name,
                      unit: meterInfo.unit,
                      lastReading: meterInfo.newIndex,
                      expenseId: meterInfo.expenseId
                    });
                  } else {
                    // Actualizează ultima citire dacă e mai nouă
                    const existing = metersFound.get(meterType);
                    if (meterInfo.newIndex > existing.lastReading) {
                      existing.lastReading = meterInfo.newIndex;
                    }
                  }
                }
              });
            }
          });

          if (monthMeters.length > 0) {
            return { month: monthYear, meters: monthMeters };
          }
          return null;
        };

        // Extrage din sheet-ul publicat
        if (published) {
          const pubMeters = extractMetersFromSheet(published, published.monthYear);
          if (pubMeters) allMeterReadings.push(pubMeters);
        }

        // Extrage din sheets arhivate
        archived.forEach(sheet => {
          const archMeters = extractMetersFromSheet(sheet, sheet.monthYear);
          if (archMeters) allMeterReadings.push(archMeters);
        });

        // Extrage din sheet-ul curent (in_progress) dacă există
        if (current && current.id !== published?.id) {
          const currentMeters = extractMetersFromSheet(current, current.monthYear);
          if (currentMeters) allMeterReadings.unshift(currentMeters); // La început
        }

        setMeterReadings(allMeterReadings);
        setAvailableMeters(Array.from(metersFound.values()));

      } else {
        setMaintenanceData(null);
        setExpenseDetails([]);
        setMeterReadings([]);
        setAvailableMeters([]);
      }

      // Construiește istoricul lunilor
      const history = [];

      // Adaugă luna publicată
      if (published) {
        const pubMaintenance = published.maintenanceTable?.find(row => matchApartment(row, aptId));
        if (pubMaintenance) {
          const pubPayments = published.payments?.filter(p => matchApartment(p, aptId)) || [];
          const pubTotalPaid = pubPayments.reduce((sum, p) => sum + (p.total || 0), 0);

          history.push({
            monthYear: published.monthYear,
            status: 'published',
            totalDatorat: pubMaintenance.totalDatorat || 0,
            totalPaid: pubTotalPaid,
            remaining: Math.max(0, (pubMaintenance.totalDatorat || 0) - pubTotalPaid),
            paymentStatus: pubTotalPaid >= (pubMaintenance.totalDatorat || 0)
              ? 'paid'
              : pubTotalPaid > 0 ? 'partial' : 'unpaid',
            sheet: published,
            maintenance: pubMaintenance
          });
        }
      }

      // Adaugă lunile arhivate
      archived.forEach(sheet => {
        const archMaintenance = sheet.maintenanceTable?.find(row => matchApartment(row, aptId));
        if (archMaintenance) {
          const archPayments = sheet.payments?.filter(p => matchApartment(p, aptId)) || [];
          const archTotalPaid = archPayments.reduce((sum, p) => sum + (p.total || 0), 0);

          history.push({
            monthYear: sheet.monthYear,
            status: 'archived',
            totalDatorat: archMaintenance.totalDatorat || 0,
            totalPaid: archTotalPaid,
            remaining: Math.max(0, (archMaintenance.totalDatorat || 0) - archTotalPaid),
            paymentStatus: archTotalPaid >= (archMaintenance.totalDatorat || 0)
              ? 'paid'
              : archTotalPaid > 0 ? 'partial' : 'unpaid',
            sheet: sheet,
            maintenance: archMaintenance
          });
        }
      });

      setMonthlyHistory(history);
    }
  }, []);

  // Funcție pentru a schimba luna selectată
  const switchMonth = useCallback((monthYear) => {
    setSelectedMonth(monthYear);
  }, []);

  // ===== EFFECT: Actualizează maintenanceData când se schimbă luna =====
  useEffect(() => {
    if (!selectedMonth || !apartmentId) return;

    // Găsește sheet-ul pentru luna selectată
    let targetSheet = null;
    if (publishedSheet?.monthYear === selectedMonth) {
      targetSheet = publishedSheet;
    } else if (currentSheet?.monthYear === selectedMonth) {
      targetSheet = currentSheet;
    } else {
      targetSheet = archivedSheets.find(s => s.monthYear === selectedMonth);
    }

    if (!targetSheet) {
      console.log('[useOwnerData] Nu s-a găsit sheet pentru luna:', selectedMonth);
      return;
    }

    console.log('[useOwnerData] Actualizăm date pentru luna:', selectedMonth, 'Sheet:', targetSheet.id);

    // Găsește datele de întreținere pentru apartament
    const maintenance = targetSheet.maintenanceTable?.find(row => matchApartment(row, apartmentId));

    if (maintenance) {
      // Calculează plățile pentru acest apartament în luna selectată
      const monthPayments = (targetSheet.payments || []).filter(p =>
        matchApartment(p, apartmentId) || p.apartmentId === apartmentId
      );
      const totalPaid = monthPayments.reduce((sum, p) => sum + (p.total || 0), 0);

      setMaintenanceData({
        ...maintenance,
        totalPaid,
        payments: monthPayments,
        sheet: targetSheet
      });

      // Actualizează expense details pentru luna selectată
      if (maintenance.expenseDetails) {
        const formattedExpenses = Object.entries(maintenance.expenseDetails)
          .map(([key, detail]) => {
            const distributionType = detail.expense?.distributionType || 'equal';
            const { type, label } = getDistributionLabel(distributionType);
            return {
              id: key,
              name: detail.name || key,
              amount: detail.amount || 0,
              type,
              label,
              distributionType,
              consumptionInfo: detail.expense?.consumptionUnit
                ? { unit: detail.expense.consumptionUnit }
                : null
            };
          })
          .filter(exp => exp.amount > 0)
          .sort((a, b) => b.amount - a.amount);
        setExpenseDetails(formattedExpenses);
      } else {
        setExpenseDetails([]);
      }

      console.log('[useOwnerData] Date actualizate:', {
        totalDatorat: maintenance.totalDatorat,
        restante: maintenance.restante,
        penalitati: maintenance.penalitati,
        currentMaintenance: maintenance.currentMaintenance,
        totalPaid
      });
    } else {
      console.log('[useOwnerData] Nu s-a găsit apartament în maintenanceTable pentru:', apartmentId);
    }
  }, [selectedMonth, apartmentId, publishedSheet, currentSheet, archivedSheets]);

  // Funcție pentru a obține datele pentru o lună specifică
  const getMonthData = useCallback((monthYear) => {
    return monthlyHistory.find(m => m.monthYear === monthYear);
  }, [monthlyHistory]);

  // Lista lunilor disponibile
  const availableMonths = [
    publishedSheet?.monthYear,
    ...archivedSheets.map(s => s.monthYear)
  ].filter(Boolean);

  // ===== FUNCȚIE PENTRU TRANSMITERE INDEX CONTOR =====
  // Salvează indexul transmis de proprietar în sheet-ul curent (in_progress)
  const submitMeterReading = useCallback(async (meterType, newIndex, expenseId) => {
    if (!currentSheet?.id || !associationId || !apartmentId) {
      return { success: false, message: 'Nu există sheet activ pentru transmitere' };
    }

    try {
      // Găsește cheltuiala corespunzătoare în sheet
      const sheetRef = doc(db, `associations/${associationId}/sheets`, currentSheet.id);
      const sheetDoc = await getDoc(sheetRef);

      if (!sheetDoc.exists()) {
        return { success: false, message: 'Sheet-ul nu a fost găsit' };
      }

      const sheetData = sheetDoc.data();
      const expenses = sheetData.expenses || [];

      // Găsește cheltuiala cu consum
      const expenseIndex = expenses.findIndex(exp =>
        exp.id === expenseId || exp.expenseTypeId === expenseId
      );

      if (expenseIndex === -1) {
        return { success: false, message: 'Cheltuiala nu a fost găsită' };
      }

      // Pregătește structura indexes dacă nu există
      const updatedExpenses = [...expenses];
      if (!updatedExpenses[expenseIndex].indexes) {
        updatedExpenses[expenseIndex].indexes = {};
      }
      if (!updatedExpenses[expenseIndex].indexes[apartmentId]) {
        updatedExpenses[expenseIndex].indexes[apartmentId] = {};
      }

      // Obține indexul vechi (de la ultima citire sau 0)
      const existingIndexData = updatedExpenses[expenseIndex].indexes[apartmentId][meterType] || {};
      const oldIndex = existingIndexData.newIndex || existingIndexData.oldIndex || 0;

      // Actualizează indexul cu marcaj sursă owner_portal
      updatedExpenses[expenseIndex].indexes[apartmentId][meterType] = {
        ...existingIndexData,
        oldIndex: oldIndex,
        newIndex: parseFloat(newIndex),
        difference: parseFloat(newIndex) - oldIndex,
        // MARCAJ IMPORTANT: Transmis de proprietar
        source: 'owner_portal',
        submittedAt: new Date().toISOString(),
        submittedBy: apartmentId,
        meterName: existingIndexData.meterName || meterType
      };

      // Salvează în Firebase
      await updateDoc(sheetRef, {
        expenses: updatedExpenses,
        updatedAt: new Date().toISOString()
      });

      return { success: true, message: 'Index transmis cu succes!' };

    } catch (error) {
      console.error('Eroare la transmiterea indexului:', error);
      return { success: false, message: error.message || 'Eroare la salvare' };
    }
  }, [currentSheet, associationId, apartmentId]);

  // Funcție pentru a obține datele cheltuielilor pentru o lună specifică
  const getExpenseDetailsForMonth = useCallback((monthYear) => {
    const monthData = monthlyHistory.find(m => m.monthYear === monthYear);
    if (!monthData?.maintenance?.expenseDetails) return [];

    return Object.entries(monthData.maintenance.expenseDetails)
      .map(([key, detail]) => {
        const distributionType = detail.expense?.distributionType || 'equal';
        const { type, label } = getDistributionLabel(distributionType);
        return {
          id: key,
          name: detail.name || key,
          amount: detail.amount || 0,
          type,
          label,
          distributionType
        };
      })
      .filter(exp => exp.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [monthlyHistory]);

  return {
    // Loading & Error
    loading,
    error,

    // Sheets raw
    currentSheet,
    publishedSheet,
    archivedSheets,

    // Date procesate pentru apartament
    maintenanceData,
    paymentHistory,
    monthlyHistory,

    // NOU: Detalii cheltuieli
    expenseDetails,
    getExpenseDetailsForMonth,

    // NOU: Contoare
    meterReadings,
    availableMeters,
    submitMeterReading,

    // Navigare luni
    selectedMonth,
    availableMonths,
    switchMonth,
    getMonthData
  };
}

/**
 * Funcții helper pentru formatare
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0.00 lei';
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' lei';
};

export const formatDate = (date) => {
  if (!date) return '-';
  const d = date?.toDate?.() || new Date(date);
  return d.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const getPaymentStatusInfo = (status) => {
  switch (status) {
    case 'paid':
      return { label: 'Plătit', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' };
    case 'partial':
      return { label: 'Parțial', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' };
    case 'unpaid':
    default:
      return { label: 'Neplătit', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' };
  }
};
