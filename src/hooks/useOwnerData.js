import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { defaultExpenseTypes } from '../data/expenseTypes';

/**
 * Mapare distributionType la etichete pentru UI
 */
const DISTRIBUTION_ORDER_BY_TYPE = {
  consumption: 1,
  byConsumption: 1,
  consumption_cumulative: 2,
  person: 3,
  perPerson: 3,
  byPersons: 3,
  apartment: 4,
  perApartament: 4,
  equal: 4,
  individual: 5,
  suma_individuala: 5,
  cotaParte: 6,
  byArea: 6,
  fixed: 7
};
const sortExpensesByType = (a, b) => {
  const orderA = DISTRIBUTION_ORDER_BY_TYPE[a.distributionType] || 99;
  const orderB = DISTRIBUTION_ORDER_BY_TYPE[b.distributionType] || 99;
  if (orderA !== orderB) return orderA - orderB;
  return (b.amount + (b.difference || 0)) - (a.amount + (a.difference || 0));
};

const getDistributionLabel = (distributionType) => {
  const labels = {
    'equal': { type: 'apartament', label: 'Pe apartament' },
    'apartment': { type: 'apartament', label: 'Pe apartament' },
    'perApartament': { type: 'apartament', label: 'Pe apartament' },
    'byPersons': { type: 'persoană', label: 'Pe persoană' },
    'person': { type: 'persoană', label: 'Pe persoană' },
    'perPerson': { type: 'persoană', label: 'Pe persoană' },
    'byConsumption': { type: 'consum', label: 'Pe consum' },
    'consumption': { type: 'consum', label: 'Pe consum' },
    'consumption_cumulative': { type: 'consum', label: 'Pe consum cumulat' },
    'cotaParte': { type: 'cotă', label: 'Cotă parte' },
    'byArea': { type: 'cotă', label: 'Cotă parte' },
    'individual': { type: 'individual', label: 'Sumă individuală' },
    'suma_individuala': { type: 'individual', label: 'Sumă individuală' },
    'fixed': { type: 'fix', label: 'Sumă fixă' }
  };
  return labels[distributionType] || { type: 'apartament', label: 'Pe apartament' };
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

  // Ref pentru a ști dacă componenta e montată (previne erori la logout)
  const isMountedRef = useRef(true);

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
    // Marchează componenta ca montată
    isMountedRef.current = true;

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
        // Ignoră dacă componenta nu mai e montată (ex: logout în curs)
        if (!isMountedRef.current) return;

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
          // Ignoră erorile dacă componenta nu mai e montată
          if (!isMountedRef.current) return;
          console.error('Error processing sheets:', err);
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        // Ignoră erorile dacă componenta nu mai e montată (logout)
        if (!isMountedRef.current) return;

        console.error('Error loading sheets:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      // Marchează componenta ca demontată înainte de unsubscribe
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [associationId, apartmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Procesează datele pentru apartamentul specific
  const processApartmentData = useCallback((aptId, current, published, archived) => {
    // Găsește sheet-ul activ pentru afișare
    const activeSheet = published || current;

    if (activeSheet) {
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
          const apartmentPersons = maintenance.persons || 0;
          const apartmentParticipations = activeSheet?.configSnapshot?.apartmentParticipations || {};
          const formattedExpenses = Object.entries(maintenance.expenseDetails)
            .map(([key, detail]) => {
              const distributionType = detail.expense?.distributionType || 'equal';
              const { type, label } = getDistributionLabel(distributionType);
              const expense = detail.expense || {};
              const participation = apartmentParticipations[`${apartmentId}-${key}`]
                || apartmentParticipations[`${apartmentId}-${detail.name || key}`]
                || { type: 'integral' };

              return {
                id: key,
                name: detail.name || key,
                amount: detail.amount || 0,
                difference: maintenance.expenseDifferenceDetails?.[key] || 0,
                type,
                label,
                distributionType,
                persons: apartmentPersons,
                consumption: expense.consumption?.[apartmentId] || 0,
                unitPrice: expense.unitPrice || expense.pricePerUnit || 0,
                consumptionUnit: expense.consumptionUnit === 'custom'
                  ? (expense.customConsumptionUnit || 'unități')
                  : (expense.consumptionUnit || 'unități'),
                individualAmount: expense.individualAmounts?.[apartmentId] || 0,
                participationType: participation.type,
                participationValue: participation.value
              };
            })
            .sort(sortExpensesByType);

          setExpenseDetails(formattedExpenses);
        } else {
          setExpenseDetails([]);
        }

        // ===== PROCESARE METER READINGS (INDEXURI) =====
        // Colectează indexurile din toate sheet-urile pentru acest apartament
        const allMeterReadings = [];
        const metersFound = new Map(); // Pentru a găsi contoarele disponibile

        // 📱 CITEȘTE portalSubmission din CURRENT SHEET (configurația actuală)
        // Aceasta e configurația setată de admin și se aplică la toate metoarele
        const currentExpenseConfigs = current?.configSnapshot?.expenseConfigurations || {};

        // Helper pentru a obține portalSubmission din current sheet
        const getPortalSubmissionFromCurrent = (expenseName) => {
          // Găsește configurația pentru această cheltuială în current sheet
          const defaultType = defaultExpenseTypes.find(def => def.name === expenseName);
          const possibleKeys = [defaultType?.id, expenseName].filter(Boolean);

          for (const key of possibleKeys) {
            const config = currentExpenseConfigs[key];
            if (config?.indexConfiguration?.portalSubmission) {
              return config.indexConfiguration.portalSubmission;
            }
          }
          return null;
        };

        // Funcție helper pentru a extrage indexurile dintr-un sheet
        const extractMetersFromSheet = (sheet, monthYear) => {
          if (!sheet?.expenses) return null;

          const monthMeters = [];
          const expenseConfigs = sheet.configSnapshot?.expenseConfigurations || {};

          sheet.expenses.forEach(expense => {
            // 📱 Găsește configurația pentru această cheltuială
            // Încearcă multiple chei: expenseTypeId, id, name, și ID-ul din defaultExpenseTypes
            const possibleKeys = [expense.expenseTypeId, expense.id, expense.name].filter(Boolean);

            // Adaugă și ID-ul din defaultExpenseTypes dacă avem numele cheltuielii
            if (expense.name) {
              const defaultType = defaultExpenseTypes.find(def => def.name === expense.name);
              if (defaultType?.id && !possibleKeys.includes(defaultType.id)) {
                possibleKeys.push(defaultType.id);
              }
            }

            let expenseConfig = null;
            for (const key of possibleKeys) {
              if (expenseConfigs[key]) {
                expenseConfig = expenseConfigs[key];
                break;
              }
            }

            // Verifică dacă are contoare configurate pentru acest apartament
            const apartmentMeters = expenseConfig?.indexConfiguration?.apartmentMeters?.[aptId] || {};
            const indexTypes = expenseConfig?.indexConfiguration?.indexTypes || [];
            const hasConfiguredMeters = Object.values(apartmentMeters).some(m => m?.enabled);

            // 📱 Dacă are contoare configurate, le adaugă chiar dacă nu are citiri
            if (hasConfiguredMeters && indexTypes.length > 0) {
              // Pentru fiecare tip de contor configurat
              indexTypes.forEach(meterType => {
                const meterConfig = apartmentMeters[meterType.id];
                if (meterConfig?.enabled) {
                  // Verifică dacă există citiri anterioare
                  const existingIndex = expense.indexes?.[aptId]?.[meterType.id];

                  // Determină expenseTypeId persistent (din defaultExpenseTypes sau expenseTypeId salvat)
                  const expenseTypeIdPersistent = expense.expenseTypeId ||
                    defaultExpenseTypes.find(d => d.name === expense.name)?.id ||
                    expense.id;

                  const meterInfo = {
                    type: meterType.id,
                    name: meterType.name || meterType.id,
                    oldIndex: existingIndex?.newIndex || existingIndex?.oldIndex || 0,
                    newIndex: existingIndex?.newIndex || 0,
                    consumption: existingIndex?.difference || 0,
                    unit: meterType.unit || expense.consumptionUnit || 'mc',
                    source: existingIndex?.source || 'none',
                    submittedAt: existingIndex?.submittedAt,
                    expenseId: expenseTypeIdPersistent,
                    serialNumber: meterConfig.serialNumber
                  };

                  monthMeters.push(meterInfo);

                  // Adaugă la metersFound
                  // 📱 PRIORITATE: Citește portalSubmission din CURRENT sheet (configurația actuală)
                  const portalSubmissionFromCurrent = getPortalSubmissionFromCurrent(expense.name);
                  const portalSubmission = portalSubmissionFromCurrent ||
                    expenseConfig?.indexConfiguration?.portalSubmission || {
                    enabled: true,
                    periodType: 'auto',
                    isOpen: true,
                    startDay: 1,
                    endDay: 25
                  };

                  if (!metersFound.has(meterType.id)) {
                    metersFound.set(meterType.id, {
                      id: meterType.id,
                      name: meterType.name || meterType.id,
                      unit: meterType.unit || expense.consumptionUnit || 'mc',
                      lastReading: meterInfo.oldIndex,
                      expenseId: meterInfo.expenseId,
                      serialNumber: meterConfig.serialNumber,
                      portalSubmission
                    });
                  } else {
                    // 📱 ÎNTOTDEAUNA actualizează portalSubmission dacă avem una definită explicit
                    const existing = metersFound.get(meterType.id);
                    const hasExplicitPortalSubmission = expenseConfig?.indexConfiguration?.portalSubmission;
                    if (hasExplicitPortalSubmission) {
                      existing.portalSubmission = portalSubmission;
                    }
                    // Actualizează și lastReading dacă e mai mare
                    if (meterInfo.oldIndex > existing.lastReading) {
                      existing.lastReading = meterInfo.oldIndex;
                    }
                  }
                }
              });
            }
            // Fallback: Verifică dacă e cheltuială pe consum și are indexuri existente
            else if (expense.indexes && expense.indexes[aptId]) {
              const apartmentIndexes = expense.indexes[aptId];

              Object.entries(apartmentIndexes).forEach(([meterType, indexData]) => {
                if (indexData && typeof indexData === 'object') {
                  // Determină expenseTypeId persistent
                  const expenseTypeIdPersistent = expense.expenseTypeId ||
                    defaultExpenseTypes.find(d => d.name === expense.name)?.id ||
                    expense.id;

                  const meterInfo = {
                    type: meterType,
                    name: indexData.meterName || expense.name || meterType,
                    oldIndex: indexData.oldIndex || 0,
                    newIndex: indexData.newIndex || 0,
                    consumption: indexData.difference || (indexData.newIndex - indexData.oldIndex) || 0,
                    unit: expense.consumptionUnit || 'mc',
                    source: indexData.source || 'admin',
                    submittedAt: indexData.submittedAt,
                    expenseId: expenseTypeIdPersistent
                  };

                  monthMeters.push(meterInfo);

                  // Adaugă la lista de contoare disponibile
                  // 📱 Citește configurația portalSubmission
                  // Încercăm mai multe chei pentru a găsi configurația (inclusiv ID din defaultExpenseTypes)
                  const fallbackPossibleKeys = [expense.expenseTypeId, expense.id, expense.name].filter(Boolean);

                  // Adaugă și ID-ul din defaultExpenseTypes dacă avem numele cheltuielii
                  if (expense.name) {
                    const defaultType = defaultExpenseTypes.find(def => def.name === expense.name);
                    if (defaultType?.id && !fallbackPossibleKeys.includes(defaultType.id)) {
                      fallbackPossibleKeys.push(defaultType.id);
                    }
                  }

                  let fallbackExpenseConfig = null;
                  for (const key of fallbackPossibleKeys) {
                    if (expenseConfigs[key]) {
                      fallbackExpenseConfig = expenseConfigs[key];
                      break;
                    }
                  }

                  // 📱 PRIORITATE: Citește portalSubmission din CURRENT sheet (configurația actuală)
                  // Fallback la configurația din sheet-ul curent procesat, apoi default
                  const portalSubmissionFromCurrent = getPortalSubmissionFromCurrent(expense.name);
                  const portalSubmission = portalSubmissionFromCurrent ||
                    fallbackExpenseConfig?.indexConfiguration?.portalSubmission || {
                    enabled: true,
                    periodType: 'auto',
                    isOpen: true,
                    startDay: 1,
                    endDay: 25
                  };

                  if (!metersFound.has(meterType)) {
                    metersFound.set(meterType, {
                      id: meterType,
                      name: meterInfo.name,
                      unit: meterInfo.unit,
                      lastReading: meterInfo.newIndex,
                      expenseId: meterInfo.expenseId,
                      portalSubmission // 📱 Adaugă configurația portal din CURRENT
                    });
                  } else {
                    // 📱 ÎNTOTDEAUNA actualizează portalSubmission dacă avem una definită explicit
                    const existing = metersFound.get(meterType);
                    const hasExplicitPortalSubmission = fallbackExpenseConfig?.indexConfiguration?.portalSubmission;
                    if (hasExplicitPortalSubmission) {
                      existing.portalSubmission = portalSubmission;
                    }
                    // Actualizează ultima citire dacă e mai nouă
                    if (meterInfo.newIndex > existing.lastReading) {
                      existing.lastReading = meterInfo.newIndex;
                    }
                  }
                }
              });
            }
          });

          // 📱 PASS 2: Verifică și expenseConfigurations pentru cheltuieli care au contoare configurate
          // dar nu au fost încă distribuite în sheet.expenses
          Object.entries(expenseConfigs).forEach(([expenseId, config]) => {
            // Verifică dacă are contoare configurate pentru acest apartament
            // Nu mai verificăm indexConfiguration.enabled - verificăm direct dacă există contoare
            const apartmentMeters = config.indexConfiguration?.apartmentMeters?.[aptId] || {};
            const indexTypes = config.indexConfiguration?.indexTypes || [];
            const hasConfiguredMeters = Object.values(apartmentMeters).some(m => m?.enabled);

            if (!hasConfiguredMeters || indexTypes.length === 0) return;

            // Verifică dacă această cheltuială nu a fost deja procesată din sheet.expenses
            const alreadyProcessed = sheet.expenses?.some(exp =>
              exp.expenseTypeId === expenseId ||
              exp.id === expenseId ||
              exp.name === config.name
            );

            if (alreadyProcessed) return;

            // Pentru fiecare tip de contor configurat
            indexTypes.forEach(meterType => {
              const meterConfig = apartmentMeters[meterType.id];
              if (meterConfig?.enabled) {
                const meterInfo = {
                  type: meterType.id,
                  name: meterType.name || meterType.id,
                  oldIndex: 0,
                  newIndex: 0,
                  consumption: 0,
                  unit: meterType.unit || config.consumptionUnit || 'mc',
                  source: 'none',
                  submittedAt: null,
                  expenseId: expenseId,
                  serialNumber: meterConfig.serialNumber
                };

                monthMeters.push(meterInfo);

                // Adaugă la metersFound cu portalSubmission
                // 📱 PRIORITATE: Citește portalSubmission din CURRENT sheet (configurația actuală)
                const portalSubmissionFromCurrent = getPortalSubmissionFromCurrent(config.name || expenseId);
                const portalSubmission = portalSubmissionFromCurrent ||
                  config.indexConfiguration?.portalSubmission || {
                  enabled: true,
                  periodType: 'auto',
                  isOpen: true,
                  startDay: 1,
                  endDay: 25
                };

                if (!metersFound.has(meterType.id)) {
                  metersFound.set(meterType.id, {
                    id: meterType.id,
                    name: meterType.name || meterType.id,
                    unit: meterType.unit || config.consumptionUnit || 'mc',
                    lastReading: 0,
                    expenseId: expenseId,
                    serialNumber: meterConfig.serialNumber,
                    portalSubmission
                  });
                } else {
                  // 📱 PASS 2: Actualizează cu portalSubmission din CURRENT dacă există
                  const existing = metersFound.get(meterType.id);
                  if (portalSubmissionFromCurrent) {
                    existing.portalSubmission = portalSubmission;
                  }
                }
              }
            });
          });

          if (monthMeters.length > 0) {
            return { month: monthYear, meters: monthMeters };
          }
          return null;
        };

        // 📱 IMPORTANT: Procesăm CURRENT PRIMUL pentru că are configurația portalSubmission actualizată
        // Astfel, când procesăm published/archived, configurația din current NU va fi suprascrisă
        // (deoarece published/archived au portalSubmission: undefined, care nu declanșează update)

        // Extrage din sheet-ul curent (in_progress) PRIMUL
        if (current) {
          const currentMeters = extractMetersFromSheet(current, current.monthYear);
          if (currentMeters) allMeterReadings.push(currentMeters);
        }

        // Apoi din sheet-ul publicat (dacă e diferit de current)
        if (published && published.id !== current?.id) {
          const pubMeters = extractMetersFromSheet(published, published.monthYear);
          if (pubMeters) allMeterReadings.push(pubMeters);
        }

        // Apoi din sheets arhivate
        archived.forEach(sheet => {
          const archMeters = extractMetersFromSheet(sheet, sheet.monthYear);
          if (archMeters) allMeterReadings.push(archMeters);
        });

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
      return;
    }

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
        const apartmentPersons = maintenance.persons || 0;
        const apartmentParticipations = targetSheet?.configSnapshot?.apartmentParticipations || {};
        const formattedExpenses = Object.entries(maintenance.expenseDetails)
          .map(([key, detail]) => {
            const distributionType = detail.expense?.distributionType || 'equal';
            const { type, label } = getDistributionLabel(distributionType);
            const expense = detail.expense || {};
            const participation = apartmentParticipations[`${apartmentId}-${key}`]
              || apartmentParticipations[`${apartmentId}-${detail.name || key}`]
              || { type: 'integral' };
            return {
              id: key,
              name: detail.name || key,
              amount: detail.amount || 0,
              difference: maintenance.expenseDifferenceDetails?.[key] || 0,
              type,
              label,
              distributionType,
              persons: apartmentPersons,
              consumption: expense.consumption?.[apartmentId] || 0,
              unitPrice: expense.unitPrice || expense.pricePerUnit || 0,
              consumptionUnit: expense.consumptionUnit === 'custom'
                ? (expense.customConsumptionUnit || 'unități')
                : (expense.consumptionUnit || 'unități'),
              individualAmount: expense.individualAmounts?.[apartmentId] || 0,
              participationType: participation.type,
              participationValue: participation.value
            };
          })
          .sort(sortExpensesByType);
        setExpenseDetails(formattedExpenses);
      } else {
        setExpenseDetails([]);
      }

    } else {
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
  // Dacă cheltuiala nu e încă distribuită, salvează în pendingIndexes din configSnapshot
  const submitMeterReading = useCallback(async (meterType, newIndex, expenseId, meterName) => {
    if (!currentSheet?.id || !associationId || !apartmentId) {
      return { success: false, message: 'Nu există sheet activ pentru transmitere' };
    }

    try {
      const sheetRef = doc(db, `associations/${associationId}/sheets`, currentSheet.id);
      const sheetDoc = await getDoc(sheetRef);

      if (!sheetDoc.exists()) {
        return { success: false, message: 'Sheet-ul nu a fost găsit' };
      }

      const sheetData = sheetDoc.data();
      const expenses = sheetData.expenses || [];
      const configSnapshot = sheetData.configSnapshot || {};

      // Găsește cheltuiala distribuită în luna curentă
      // Caută după expenseTypeId SAU după ID-ul din defaultExpenseTypes
      const expenseIndex = expenses.findIndex(exp =>
        exp.id === expenseId ||
        exp.expenseTypeId === expenseId ||
        // Caută și după ID din defaultExpenseTypes bazat pe nume
        (exp.name && defaultExpenseTypes.find(d => d.name === exp.name)?.id === expenseId)
      );

      // Determină expenseTypeId pentru salvare consistentă
      // Preferă ID-ul din defaultExpenseTypes pentru consistență
      let expenseTypeId = expenseId;
      if (expenseIndex !== -1) {
        const foundExpense = expenses[expenseIndex];
        expenseTypeId = foundExpense.expenseTypeId || expenseId;
      }

      // Obține indexul vechi din mai multe surse
      let oldIndex = 0;

      // 1. Verifică în expense.indexes dacă există cheltuiala distribuită
      if (expenseIndex !== -1 && expenses[expenseIndex].indexes?.[apartmentId]?.[meterType]) {
        const existingData = expenses[expenseIndex].indexes[apartmentId][meterType];
        oldIndex = existingData.newIndex || existingData.oldIndex || 0;
      }
      // 2. Verifică în pendingIndexes
      else if (configSnapshot.pendingIndexes?.[expenseTypeId]?.[apartmentId]?.[meterType]) {
        oldIndex = configSnapshot.pendingIndexes[expenseTypeId][apartmentId][meterType].newIndex || 0;
      }
      // 3. Verifică în expenseConfigurations pentru ultima citire
      else if (configSnapshot.expenseConfigurations?.[expenseTypeId]?.indexConfiguration?.apartmentMeters?.[apartmentId]) {
        // Poate avea lastReading salvat
        const meterConfig = configSnapshot.expenseConfigurations[expenseTypeId].indexConfiguration.apartmentMeters[apartmentId][meterType];
        oldIndex = meterConfig?.lastReading || 0;
      }

      const indexData = {
        oldIndex: oldIndex,
        newIndex: parseFloat(newIndex),
        difference: parseFloat(newIndex) - oldIndex,
        source: 'owner_portal',
        submittedAt: new Date().toISOString(),
        submittedBy: apartmentId,
        meterName: meterName || meterType
      };

      // CAZUL 1: Cheltuiala e distribuită în luna curentă - salvează direct în expense.indexes
      if (expenseIndex !== -1) {
        const updatedExpenses = [...expenses];
        if (!updatedExpenses[expenseIndex].indexes) {
          updatedExpenses[expenseIndex].indexes = {};
        }
        if (!updatedExpenses[expenseIndex].indexes[apartmentId]) {
          updatedExpenses[expenseIndex].indexes[apartmentId] = {};
        }

        updatedExpenses[expenseIndex].indexes[apartmentId][meterType] = indexData;

        await updateDoc(sheetRef, {
          expenses: updatedExpenses,
          updatedAt: new Date().toISOString()
        });

        return { success: true, message: 'Index transmis cu succes!' };
      }

      // CAZUL 2: Cheltuiala NU e distribuită - salvează în pendingIndexes
      // Adminul va vedea aceste indexuri când va distribui cheltuiala
      const pendingIndexes = configSnapshot.pendingIndexes || {};

      if (!pendingIndexes[expenseTypeId]) {
        pendingIndexes[expenseTypeId] = {};
      }
      if (!pendingIndexes[expenseTypeId][apartmentId]) {
        pendingIndexes[expenseTypeId][apartmentId] = {};
      }

      pendingIndexes[expenseTypeId][apartmentId][meterType] = indexData;

      await updateDoc(sheetRef, {
        'configSnapshot.pendingIndexes': pendingIndexes,
        updatedAt: new Date().toISOString()
      });

      return { success: true, message: 'Index transmis cu succes! Va fi folosit la distribuirea cheltuielii.' };

    } catch (error) {
      console.error('Eroare la transmiterea indexului:', error);
      return { success: false, message: error.message || 'Eroare la salvare' };
    }
  }, [currentSheet, associationId, apartmentId]);

  // Funcție pentru a obține datele cheltuielilor pentru o lună specifică
  const getExpenseDetailsForMonth = useCallback((monthYear) => {
    const monthData = monthlyHistory.find(m => m.monthYear === monthYear);
    if (!monthData?.maintenance?.expenseDetails) return [];

    // Extrage expenses din sheet pentru a găsi consumul
    const sheetExpenses = monthData.sheet?.expenses || [];
    // Extrage diferențele (pierderi/scurgeri)
    const differenceDetails = monthData.maintenance?.expenseDifferenceDetails || {};
    // Extrage participations din configSnapshot
    const apartmentParticipations = monthData.sheet?.configSnapshot?.apartmentParticipations || {};
    const apartmentPersons = monthData.maintenance?.persons || 0;

    return Object.entries(monthData.maintenance.expenseDetails)
      .map(([key, detail]) => {
        const distributionType = detail.expense?.distributionType || 'equal';
        const { type, label } = getDistributionLabel(distributionType);

        // Caută consumul în sheet.expenses pentru cheltuielile pe consum
        let consumption = null;
        let consumptionUnit = null;
        let unitPrice = null;

        // Verifică dacă e cheltuială pe consum (verificăm și label-ul)
        const isConsumptionBased =
          distributionType === 'byConsumption' ||
          distributionType === 'consumption' ||
          label?.toLowerCase().includes('consum');

        // Extrage prețul pe unitate
        if (detail.expense?.unitPrice) {
          unitPrice = detail.expense.unitPrice;
        }

        if (isConsumptionBased) {
          // Găsește cheltuiala în sheet.expenses pentru date suplimentare
          const sheetExpense = sheetExpenses.find(exp =>
            exp.id === key ||
            exp.expenseTypeId === key ||
            exp.name === (detail.name || key) ||
            exp.name?.toLowerCase() === (detail.name || key)?.toLowerCase()
          );

          // Extrage unitPrice din sheetExpense sau detail.expense
          if (!unitPrice && sheetExpense?.unitPrice) {
            unitPrice = sheetExpense.unitPrice;
          }
          consumptionUnit = detail.expense?.consumptionUnit || sheetExpense?.consumptionUnit || 'mc';

          // Opțiunea 1: Verifică în detail.expense.indexes
          if (detail.expense?.indexes && apartmentId) {
            const indexKeys = Object.keys(detail.expense.indexes);
            let aptIndexes = detail.expense.indexes[apartmentId];

            // Fallback: încearcă să găsească key-ul care se potrivește
            if (!aptIndexes && indexKeys.length > 0) {
              const matchingKey = indexKeys.find(k =>
                k === apartmentId ||
                k.toString() === apartmentId.toString() ||
                apartmentId.includes(k) ||
                k.includes(apartmentId)
              );
              if (matchingKey) {
                aptIndexes = detail.expense.indexes[matchingKey];
              }
            }

            if (aptIndexes) {
              const meterTypes = Object.keys(aptIndexes);
              if (meterTypes.length > 0) {
                const firstMeter = aptIndexes[meterTypes[0]];
                if (firstMeter) {
                  consumption = firstMeter.difference || (firstMeter.newIndex - firstMeter.oldIndex) || 0;
                }
              }
            }
          }

          // Opțiunea 2: Verifică în sheet.expenses.indexes
          if (consumption === null && sheetExpense?.indexes && apartmentId) {
            const aptIndexes = sheetExpense.indexes[apartmentId];
            if (aptIndexes) {
              const meterTypes = Object.keys(aptIndexes);
              if (meterTypes.length > 0) {
                const firstMeter = aptIndexes[meterTypes[0]];
                if (firstMeter) {
                  consumption = firstMeter.difference || (firstMeter.newIndex - firstMeter.oldIndex) || 0;
                }
              }
            }
          }

          // Opțiunea 3: Verifică în expense.consumption (valori manuale)
          if (consumption === null && detail.expense?.consumption && apartmentId) {
            const manualConsumption = detail.expense.consumption[apartmentId];
            if (manualConsumption !== undefined && manualConsumption !== null) {
              consumption = parseFloat(manualConsumption) || 0;
            }
          }

          // Opțiunea 4: Verifică în sheetExpense.consumption
          if (consumption === null && sheetExpense?.consumption && apartmentId) {
            const manualConsumption = sheetExpense.consumption[apartmentId];
            if (manualConsumption !== undefined && manualConsumption !== null) {
              consumption = parseFloat(manualConsumption) || 0;
            }
          }

          // Opțiunea 5 (FALLBACK): Calculează din amount / unitPrice
          if (consumption === null && unitPrice && unitPrice > 0 && detail.amount > 0) {
            // Scade diferența din amount înainte de calcul (dacă există)
            const amountWithoutDiff = detail.amount - (differenceDetails[key] || 0);
            if (amountWithoutDiff > 0) {
              consumption = amountWithoutDiff / unitPrice;
            }
          }
        }

        // Extrage diferența (pierderi/scurgeri) — pentru orice tip
        const difference = differenceDetails[key] || 0;

        // Lookup participation
        const participation = apartmentParticipations[`${apartmentId}-${key}`]
          || apartmentParticipations[`${apartmentId}-${detail.name || key}`]
          || { type: 'integral' };

        return {
          id: key,
          name: detail.name || key,
          amount: detail.amount || 0,
          difference,
          type,
          label,
          distributionType,
          persons: apartmentPersons,
          consumption: consumption || 0,
          consumptionUnit,
          unitPrice: unitPrice || 0,
          individualAmount: detail.expense?.individualAmounts?.[apartmentId] || 0,
          participationType: participation.type,
          participationValue: participation.value
        };
      })
      .sort(sortExpensesByType);
  }, [monthlyHistory, apartmentId]);

  // 📱 Calculează submissionConfig bazat pe portalSubmission din contoare
  const submissionConfig = useMemo(() => {
    // Verifică dacă există contoare disponibile cu portalSubmission
    if (availableMeters.length === 0) {
      return {
        enabled: false,
        isOpen: false,
        reason: 'Niciun contor configurat'
      };
    }

    // Verifică configurația primului contor (toate ar trebui să aibă aceeași configurație)
    const firstMeter = availableMeters[0];
    const config = firstMeter?.portalSubmission || {
      enabled: true,
      periodType: 'auto',
      isOpen: true,
      startDay: 1,
      endDay: 25
    };

    // Dacă nu e enabled la nivel de config
    if (!config.enabled) {
      return {
        enabled: false,
        isOpen: false,
        reason: 'Transmiterea online este dezactivată'
      };
    }

    const today = new Date();
    const day = today.getDate();
    let isOpen = false;
    let deadline = '';

    switch (config.periodType) {
      case 'manual':
        isOpen = config.isOpen;
        deadline = isOpen ? 'Deschisă de administrator' : 'Închisă de administrator';
        break;
      case 'custom':
        isOpen = day >= config.startDay && day <= config.endDay;
        deadline = `${config.startDay}-${config.endDay} ale lunii`;
        break;
      case 'auto':
      default:
        isOpen = day >= 1 && day <= 25;
        deadline = '1-25 ale lunii';
        break;
    }

    const daysLeft = config.periodType === 'auto' || config.periodType === 'custom'
      ? Math.max(0, (config.endDay || 25) - day)
      : null;

    return {
      enabled: config.enabled,
      isOpen,
      periodType: config.periodType,
      deadline,
      daysLeft,
      startDay: config.startDay || 1,
      endDay: config.endDay || 25
    };
  }, [availableMeters]);

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
    submissionConfig, // 📱 Configurația pentru transmitere

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
