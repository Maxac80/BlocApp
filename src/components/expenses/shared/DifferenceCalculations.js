/**
 * DifferenceCalculations.js
 *
 * Funcții centralizate pentru calculul și determinarea diferențelor
 * pentru toate tipurile de cheltuieli.
 *
 * Created: 2025-01-28
 * Part of: Refactorizare sistem distribuție cheltuieli
 */

// ========================================
// CONFIGURARE COMPORTAMENT PER TIP DISTRIBUȚIE
// ========================================

/**
 * Config care definește comportamentul fiecărui tip de distribuție
 */
export const EXPENSE_BEHAVIOR_CONFIG = {
  apartment: {
    hasManualInput: false,
    canHaveDifference: false,
    showDifferenceInTable: false,
    alwaysShowGreenBadge: true,
    description: 'Pe apartament (egal) - reponderare automată'
  },
  person: {
    hasManualInput: false,
    canHaveDifference: false,
    showDifferenceInTable: false,
    alwaysShowGreenBadge: true,
    description: 'Pe persoană - reponderare automată'
  },
  cotaParte: {
    hasManualInput: false,
    canHaveDifference: false,
    showDifferenceInTable: false,
    alwaysShowGreenBadge: true,
    description: 'Pe cotă parte (indiviză) - reponderare automată'
  },
  consumption: {
    hasManualInput: true,
    canHaveDifference: true,
    showDifferenceInTable: true,
    alwaysShowGreenBadge: true, // Verde după distribuirea diferenței
    description: 'Pe consum - diferență distribuită automat'
  },
  individual: {
    hasManualInput: true,
    canHaveDifference: true,
    showDifferenceInTable: false,
    alwaysShowGreenBadge: false, // Condiționat: verde dacă diferență = 0
    description: 'Sume individuale - diferență trebuie corectată manual'
  }
};

/**
 * Obține configurația de comportament pentru un tip de distribuție
 */
export const getExpenseBehavior = (distributionType) => {
  return EXPENSE_BEHAVIOR_CONFIG[distributionType] || EXPENSE_BEHAVIOR_CONFIG.apartment;
};

// ========================================
// DETERMINARE SUMA AȘTEPTATĂ
// ========================================

/**
 * Determină dacă știm suma așteptată pe baza contextului de afișare
 *
 * @param {object} expense - Obiectul cheltuială
 * @param {object} config - Configurația cheltuielii (pentru distributionType)
 * @param {object} filterInfo - Informații despre filtrul activ (type, stairId, blockId)
 * @param {array} stairs - Lista de scări
 * @returns {boolean} - true dacă știm suma așteptată
 */
export const knowsExpectedAmount = (expense, config, filterInfo, stairs) => {
  if (!expense) return false;

  // Mapează receptionMode din expense
  let receptionMode = expense.receptionMode || 'total';
  if (expense.expenseEntryMode) {
    if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
    else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
    else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
  }

  const distributionType = config?.distributionType;

  // Tab "Toate" - știm suma doar dacă e pe asociație
  if (filterInfo.type === 'all') {
    return receptionMode === 'per_association';
  }

  // Tab "Scară" - depinde de nivelul introducerii
  if (filterInfo.type === 'stair') {
    // Sume pe scară - știm suma pentru scara curentă
    if (receptionMode === 'per_stair') return true;

    // Sume pe bloc - știm suma doar dacă blocul are o singură scară
    if (receptionMode === 'per_block') {
      const blockStairs = stairs?.filter(s => s.blockId === filterInfo.blockId) || [];
      return blockStairs.length === 1;
    }

    // Sume pe asociație când vizualizăm o scară:
    // - Pentru apartment/person/cotaParte: ȘTIM suma (reponderare automată)
    // - Pentru consumption/individual: NU știm suma (depinde de input manual)
    if (receptionMode === 'per_association') {
      return distributionType === 'apartment' ||
             distributionType === 'person' ||
             distributionType === 'cotaParte';
    }
  }

  return false;
};

/**
 * Obține suma așteptată relevantă pentru contextul de afișare
 *
 * @param {object} expense - Obiectul cheltuială
 * @param {object} filterInfo - Informații despre filtrul activ
 * @returns {number} - Suma așteptată
 */
export const getRelevantAmount = (expense, filterInfo) => {
  if (!expense) return 0;

  const isConsumption = expense.isUnitBased;

  // Mapează receptionMode
  let receptionMode = expense.receptionMode || 'total';
  if (expense.expenseEntryMode) {
    if (expense.expenseEntryMode === 'building') receptionMode = 'per_block';
    else if (expense.expenseEntryMode === 'staircase') receptionMode = 'per_stair';
    else if (expense.expenseEntryMode === 'per_association') receptionMode = 'total';
  }

  // Tab "Toate" - suma pe asociație
  if (filterInfo.type === 'all') {
    return isConsumption && expense.billAmount
      ? parseFloat(expense.billAmount)
      : parseFloat(expense.amount || 0);
  }

  // Tab "Scară" - suma specifică pentru scară
  if (filterInfo.type === 'stair') {
    if (receptionMode === 'per_stair' && expense.amountsByStair) {
      return parseFloat(expense.amountsByStair[filterInfo.stairId] || 0);
    }

    if (receptionMode === 'per_block' && expense.amountsByBlock && filterInfo.blockId) {
      return parseFloat(expense.amountsByBlock[filterInfo.blockId] || 0);
    }
  }

  // Default
  return isConsumption && expense.billAmount
    ? parseFloat(expense.billAmount)
    : parseFloat(expense.amount || 0);
};

// ========================================
// CALCUL TOTAL INTRODUS
// ========================================

/**
 * Calculează totalIntrodus (cu participări aplicate) pentru o cheltuială
 *
 * @param {object} expense - Obiectul cheltuială
 * @param {object} config - Configurația cheltuielii
 * @param {array} apartments - Lista de apartamente (deja filtrate)
 * @returns {number} - Total introdus cu participări aplicate
 */
export const calculateTotalIntrodus = (expense, config, apartments) => {
  if (!expense || !config || !apartments) return 0;

  const apartmentParticipations = config.apartmentParticipation || {};
  let totalIntrodus = 0;

  if (config.distributionType === 'consumption') {
    // Pentru consumption: suma = consum × preț (cu participări)
    apartments.forEach(apt => {
      const participation = apartmentParticipations[apt.id];
      const consumption = parseFloat(expense.consumption?.[apt.id] || 0);
      const unitPrice = parseFloat(expense.unitPrice || 0);
      let aptAmount = consumption * unitPrice;

      // Aplică participarea
      if (participation?.type === 'excluded') {
        aptAmount = 0;
      } else if (participation?.type === 'percentage') {
        const percent = parseFloat(participation.value || 100);
        const multiplier = percent < 1 ? percent : (percent / 100);
        aptAmount = aptAmount * multiplier;
      } else if (participation?.type === 'fixed') {
        const fixedMode = config?.fixedAmountMode || 'apartment';
        const fixedAmount = parseFloat(participation.value || 0);
        aptAmount = fixedMode === 'person' ? fixedAmount * (apt.persons || 0) : fixedAmount;
      }

      totalIntrodus += aptAmount;
    });
  } else if (config.distributionType === 'individual') {
    // Pentru individual: suma directă introdusă (doar Integral/Exclus)
    apartments.forEach(apt => {
      const participation = apartmentParticipations[apt.id];
      if (participation?.type !== 'excluded') {
        totalIntrodus += parseFloat(expense.individualAmounts?.[apt.id] || 0);
      }
    });
  } else {
    // Pentru apartment/person/cotaParte: totalIntrodus = suma relevantă
    // (acestea nu au "total introdus" separat, suma se calculează automat)
    totalIntrodus = 0; // Va fi calculat în calculateExpenseDifferenceInfo
  }

  return totalIntrodus;
};

// ========================================
// CALCUL COMPLET DIFERENȚE
// ========================================

/**
 * Calculează toate informațiile despre diferențe pentru o cheltuială
 *
 * @param {object} params - Parametri
 * @param {object} params.expense - Obiectul cheltuială
 * @param {object} params.config - Configurația cheltuielii
 * @param {array} params.apartments - Lista de apartamente (filtrate)
 * @param {object} params.filterInfo - Informații despre filtrul activ
 * @param {array} params.stairs - Lista de scări
 * @param {function} params.calculateExpenseDifferences - Funcție pentru calcul diferențe (din useMaintenanceCalculation)
 * @returns {object} - Obiect cu toate informațiile despre diferențe
 */
export const calculateExpenseDifferenceInfo = ({
  expense,
  config,
  apartments,
  filterInfo,
  stairs,
  calculateExpenseDifferences
}) => {
  // Obține comportamentul pentru acest tip de distribuție
  const behavior = getExpenseBehavior(config.distributionType);

  // 1. Calculează totalIntrodus
  let totalIntrodus = 0;

  if (config.distributionType === 'apartment' ||
      config.distributionType === 'person' ||
      config.distributionType === 'cotaParte') {
    // Pentru acestea, totalDistribuit = suma relevantă (cu reponderare)
    totalIntrodus = getRelevantAmount(expense, filterInfo);
  } else {
    // Pentru consumption și individual
    totalIntrodus = calculateTotalIntrodus(expense, config, apartments);
  }

  // 2. Determină suma așteptată
  const knowsAmount = knowsExpectedAmount(expense, config, filterInfo, stairs);
  const sumaAsteptata = knowsAmount ? getRelevantAmount(expense, filterInfo) : 0;

  // 3. Calculează diferența
  // Pentru apartment/person/cotaParte: diferența = 0 (reponderare automată)
  // Pentru consumption/individual: diferența = totalIntrodus - sumaAsteptata
  const diferenta = behavior.canHaveDifference && knowsAmount
    ? totalIntrodus - sumaAsteptata
    : 0;

  // 4. Calculează diferența distribuită (doar pentru consumption)
  let diffentaDistribuita = 0;
  if (behavior.showDifferenceInTable && expense.isUnitBased && calculateExpenseDifferences) {
    const diffs = calculateExpenseDifferences(expense, apartments);
    diffentaDistribuita = apartments.reduce((sum, apt) => sum + (diffs[apt.id] || 0), 0);
  }

  // 5. Calculează totalDistribuit
  let totalDistribuit = totalIntrodus;

  if (config.distributionType === 'consumption') {
    // Pentru consumption: totalDistribuit = totalIntrodus + diferențăDistribuită
    totalDistribuit = totalIntrodus + diffentaDistribuita;
  } else if (config.distributionType === 'apartment' ||
             config.distributionType === 'person' ||
             config.distributionType === 'cotaParte') {
    // Pentru acestea: totalDistribuit = suma cu reponderare (deja calculată)
    totalDistribuit = totalIntrodus;
  } else {
    // Pentru individual: totalDistribuit = totalIntrodus (ce s-a introdus)
    totalDistribuit = totalIntrodus;
  }

  // 6. Determină dacă e balansat (fără TOLERANCE pentru individual)
  let isBalanced = false;

  if (behavior.alwaysShowGreenBadge) {
    // apartment/person/cotaParte/consumption - întotdeauna balansat
    isBalanced = true;
  } else {
    // individual - balansat doar dacă diferență = 0 (sau < 0.01 pentru rotunjiri)
    isBalanced = Math.abs(diferenta) < 0.01;
  }

  return {
    behavior,
    totalIntrodus,
    sumaAsteptata,
    knowsExpectedAmount: knowsAmount,
    diferenta,
    diferentaDistribuita: diffentaDistribuita,
    totalDistribuit,
    isBalanced
  };
};
