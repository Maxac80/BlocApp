/**
 * 🧮 CALCULATOR SUME PE APARTAMENT
 *
 * Extras din ExpenseList.js pentru a putea fi reutilizat în alte componente
 * (ExpenseDistributionTable, ExpenseList, etc.) fără duplicare de cod.
 *
 * Suportă distribuția pe:
 * - apartament (egal)
 * - persoană
 * - cotaParte (via calculateCotaParteAmount separat, cotă parte e per-bloc)
 *
 * Gestionează participări:
 * - excluded → 0
 * - fixed → suma fixă (per apartament sau per persoană)
 * - percentage → reponderare proporțională
 * - integral (default) → participare completă
 */

/**
 * Calculează suma pe un apartament pentru distribuții de tip apartment / person.
 * Pentru cotaParte folosește calculateCotaParteAmount (funcție separată în ExpenseList.js).
 *
 * @param {Object} expense - Cheltuiala
 * @param {Object} apartment - Apartamentul vizat
 * @param {number} relevantAmount - Suma relevantă (după filtru scară/bloc)
 * @param {Array} apartmentsInScope - Apartamentele din scope (toate asociației sau o subset)
 * @param {Object} context - { config, stairs }
 * @returns {number} suma calculată
 */
export const calculateApartmentAmount = (expense, apartment, relevantAmount, apartmentsInScope, context) => {
  const { config, stairs } = context || {};
  const distributionType = expense.distributionType || expense.distributionMethod;

  // Determină modul de recepție pentru a filtra apartamentele corect
  let receptionMode = expense.receptionMode || 'total';

  // CRUCIAL: Pentru cheltuieli "Pe scară" sau "Pe bloc", recalculează suma relevantă pentru grupul apartamentului
  let actualRelevantAmount = relevantAmount;

  if (receptionMode === 'per_stair' && apartment.stairId) {
    actualRelevantAmount = parseFloat(expense.amountsByStair?.[apartment.stairId] || 0);
  } else if (receptionMode === 'per_block' && apartment.stairId) {
    const apartmentStair = stairs?.find(s => s.id === apartment.stairId);
    if (apartmentStair?.blockId) {
      actualRelevantAmount = parseFloat(expense.amountsByBlock?.[apartmentStair.blockId] || 0);
    }
  }

  // CRUCIAL: Pentru cheltuieli "Pe scară" sau "Pe bloc", folosește DOAR apartamentele din grupul respectiv
  let allApartments = apartmentsInScope || [];

  if (receptionMode === 'per_stair' && apartment.stairId) {
    allApartments = allApartments.filter(apt => apt.stairId === apartment.stairId);
  } else if (receptionMode === 'per_block' && apartment.stairId) {
    const apartmentStair = stairs?.find(s => s.id === apartment.stairId);
    if (apartmentStair?.blockId) {
      const blockStairs = stairs?.filter(s => s.blockId === apartmentStair.blockId) || [];
      const blockStairIds = blockStairs.map(s => s.id);
      allApartments = allApartments.filter(apt => blockStairIds.includes(apt.stairId));
    }
  }

  // PASUL 1: Identifică apartamentele participante (exclude cele excluse)
  const participatingApartments = allApartments.filter(apt => {
    const participation = config?.apartmentParticipation?.[apt.id];
    return participation?.type !== 'excluded';
  });

  // PASUL 2: Scade sumele fixe
  let totalFixedAmount = 0;
  participatingApartments.forEach(apt => {
    const participation = config?.apartmentParticipation?.[apt.id];
    if (participation?.type === 'fixed') {
      const fixedMode = config?.fixedAmountMode || 'apartment';
      if (fixedMode === 'person') {
        totalFixedAmount += parseFloat(participation.value || 0) * (apt.persons || 0);
      } else {
        totalFixedAmount += parseFloat(participation.value || 0);
      }
    }
  });

  const amountToRedistribute = actualRelevantAmount - totalFixedAmount;

  // PASUL 3: Găsește apartamentele care participă la reponderare (nu sunt fixe/excluse)
  const apartmentsForReweighting = participatingApartments.filter(apt => {
    const participation = config?.apartmentParticipation?.[apt.id];
    return participation?.type !== 'fixed';
  });

  const totalPersons = apartmentsForReweighting.reduce((sum, apt) => sum + (apt.persons || 0), 0);

  // PASUL 4: Calculează suma de bază pentru apartamentul dat
  let baseAmount = 0;
  const participation = config?.apartmentParticipation?.[apartment.id];

  if (participation?.type === 'excluded') {
    return 0;
  }

  if (participation?.type === 'fixed') {
    const fixedMode = config?.fixedAmountMode || 'apartment';
    if (fixedMode === 'person') {
      return parseFloat(participation.value || 0) * (apartment.persons || 0);
    } else {
      return parseFloat(participation.value || 0);
    }
  }

  // Calculează suma de bază conform tipului de distribuție
  switch (distributionType) {
    case 'apartment':
    case 'perApartament':
      baseAmount = amountToRedistribute / apartmentsForReweighting.length;
      break;

    case 'person':
    case 'perPerson':
      baseAmount = totalPersons > 0 ? (amountToRedistribute / totalPersons) * (apartment.persons || 0) : 0;
      break;

    default:
      return 0;
  }

  // PASUL 5: Aplică reponderarea pentru procente
  let totalWeights = 0;
  const weights = {};

  apartmentsForReweighting.forEach(apt => {
    const aptParticipation = config?.apartmentParticipation?.[apt.id];

    let baseWeight = 0;
    switch (distributionType) {
      case 'apartment':
      case 'perApartament':
        baseWeight = 1.0;
        break;
      case 'person':
      case 'perPerson':
        baseWeight = apt.persons || 0;
        break;
      default:
        break;
    }

    const percent = aptParticipation?.type === 'percentage' ? aptParticipation.value : 100;
    const multiplier = percent < 1 ? percent : (percent / 100);
    weights[apt.id] = baseWeight * multiplier;
    totalWeights += weights[apt.id];
  });

  // Redistribuie proporțional
  if (totalWeights > 0 && weights[apartment.id] !== undefined) {
    return (weights[apartment.id] / totalWeights) * amountToRedistribute;
  }

  return baseAmount;
};

/**
 * Calculează sumele pe apartament pentru distribuția cotaParte.
 * Cota parte e calculată per BLOC (raport între suprafața apartamentului și
 * suprafața totală a blocului).
 *
 * @param {Object} expense - Cheltuiala
 * @param {Object} apartment - Apartamentul vizat
 * @param {number} relevantAmount - Suma relevantă pe scope
 * @param {Array} allApartments - Toate apartamentele asociației
 * @param {Object} context - { config, stairs, blocks }
 * @returns {Object} { amount, cotaParte, blockTotalSurface }
 */
export const calculateCotaParteAmount = (expense, apartment, relevantAmount, allApartments, context) => {
  const { config, stairs } = context || {};
  const surface = parseFloat(apartment.surface) || 0;

  // Găsește blocul apartamentului
  const apartmentStair = stairs?.find(s => s.id === apartment.stairId);
  const blockId = apartmentStair?.blockId;
  if (!blockId) {
    return { amount: 0, cotaParte: 0, blockTotalSurface: 0 };
  }

  // Toate apartamentele din același bloc
  const blockStairIds = (stairs?.filter(s => s.blockId === blockId) || []).map(s => s.id);
  const blockApts = allApartments.filter(apt => blockStairIds.includes(apt.stairId));

  // Participarea acestui apartament
  const participation = config?.apartmentParticipation?.[apartment.id];
  if (participation?.type === 'excluded') {
    const blockTotalSurface = blockApts.reduce((sum, a) => sum + (parseFloat(a.surface) || 0), 0);
    const cotaParte = blockTotalSurface > 0 ? (surface / blockTotalSurface) * 100 : 0;
    return { amount: 0, cotaParte, blockTotalSurface };
  }

  if (participation?.type === 'fixed') {
    const fixedMode = config?.fixedAmountMode || 'apartment';
    const fixedAmount = parseFloat(participation.value || 0);
    const amount = fixedMode === 'person' ? fixedAmount * (apartment.persons || 0) : fixedAmount;
    const blockTotalSurface = blockApts.reduce((sum, a) => sum + (parseFloat(a.surface) || 0), 0);
    const cotaParte = blockTotalSurface > 0 ? (surface / blockTotalSurface) * 100 : 0;
    return { amount, cotaParte, blockTotalSurface };
  }

  // Total surface pe bloc (include doar apartamentele non-excluded, non-fixed pentru redistribuire)
  const participatingApts = blockApts.filter(apt => {
    const p = config?.apartmentParticipation?.[apt.id];
    return p?.type !== 'excluded' && p?.type !== 'fixed';
  });

  // Scade sumele fixe din relevantAmount
  let totalFixed = 0;
  blockApts.forEach(apt => {
    const p = config?.apartmentParticipation?.[apt.id];
    if (p?.type === 'fixed') {
      const fixedMode = config?.fixedAmountMode || 'apartment';
      const v = parseFloat(p.value || 0);
      totalFixed += fixedMode === 'person' ? v * (apt.persons || 0) : v;
    }
  });

  const amountToDistribute = relevantAmount - totalFixed;

  // Cota parte bazată pe toate apartamentele din bloc (inclusiv cele care vor primi suma)
  const blockTotalSurface = blockApts.reduce((sum, a) => sum + (parseFloat(a.surface) || 0), 0);
  const cotaParte = blockTotalSurface > 0 ? (surface / blockTotalSurface) * 100 : 0;

  // Reponderare bazată pe surface + percent
  let totalWeights = 0;
  const weights = {};
  participatingApts.forEach(apt => {
    const aptP = config?.apartmentParticipation?.[apt.id];
    const aptSurface = parseFloat(apt.surface) || 0;
    const percent = aptP?.type === 'percentage' ? aptP.value : 100;
    const multiplier = percent < 1 ? percent : (percent / 100);
    weights[apt.id] = aptSurface * multiplier;
    totalWeights += weights[apt.id];
  });

  let amount = 0;
  if (totalWeights > 0 && weights[apartment.id] !== undefined) {
    amount = (weights[apartment.id] / totalWeights) * amountToDistribute;
  }

  return { amount, cotaParte, blockTotalSurface };
};

/**
 * Helper: Descrie participarea unui apartament
 * @param {Object} participation - obiectul de participare (sau undefined)
 * @param {string} fixedAmountMode - 'apartment' | 'person' (din config)
 * @returns {Object} { label, color, type }
 */
export const getParticipationBadge = (participation, fixedAmountMode = 'apartment') => {
  if (!participation || participation.type === 'integral') {
    return { label: 'Integral', color: 'green', type: 'integral' };
  }

  if (typeof participation === 'number') {
    // Legacy format
    if (participation === 1 || participation === 100) {
      return { label: 'Integral', color: 'green', type: 'integral' };
    }
    return { label: `${participation}%`, color: 'orange', type: 'percentage' };
  }

  if (participation.type === 'excluded') {
    return { label: 'Exclus', color: 'red', type: 'excluded' };
  }

  if (participation.type === 'percentage') {
    const val = participation.value;
    const displayPercent = val < 1 ? Math.round(val * 100) : val;
    return { label: `${displayPercent}%`, color: 'orange', type: 'percentage' };
  }

  if (participation.type === 'fixed') {
    const modeLabel = fixedAmountMode === 'person' ? '/pers' : '/apt';
    return { label: `Fix ${participation.value}${modeLabel}`, color: 'orange', type: 'fixed' };
  }

  return { label: 'Integral', color: 'green', type: 'integral' };
};
