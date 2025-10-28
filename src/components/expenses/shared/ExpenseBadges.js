/**
 * ExpenseBadges.js
 *
 * Componente reutilizabile pentru afișarea badge-urilor de diferență și total
 * pentru cheltuieli.
 *
 * Created: 2025-01-28
 * Part of: Refactorizare sistem distribuție cheltuieli
 */

import React from 'react';

// ========================================
// BADGE PRINCIPAL - TOTAL DISTRIBUIT / DIFERENȚĂ
// ========================================

/**
 * Badge principal pentru afișarea totalului distribuit sau a diferenței
 *
 * Culori (PĂSTRATE DIN APLICAȚIA ACTUALĂ):
 * - Verde: bg-green-100 text-green-700
 * - Portocaliu: bg-orange-100 text-orange-700
 *
 * @param {object} differenceInfo - Obiect cu informații despre diferențe (din calculateExpenseDifferenceInfo)
 * @param {string} className - Clase CSS adiționale (opțional)
 */
export const ExpenseTotalBadge = ({ differenceInfo, className = '' }) => {
  const {
    behavior,
    totalDistribuit,
    diferenta,
    isBalanced
  } = differenceInfo;

  // apartment/person/cotaParte - ÎNTOTDEAUNA verde
  if (behavior.alwaysShowGreenBadge && !behavior.canHaveDifference) {
    return (
      <div className={`text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 ${className}`}>
        ✓ Total distribuit: {totalDistribuit.toFixed(2)} RON
      </div>
    );
  }

  // consumption - ÎNTOTDEAUNA verde (după distribuirea diferenței)
  if (behavior.showDifferenceInTable) {
    return (
      <div className={`text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 ${className}`}>
        ✓ Total distribuit: {totalDistribuit.toFixed(2)} RON
      </div>
    );
  }

  // individual - Condiționat (fără TOLERANCE)
  if (behavior.canHaveDifference && !behavior.showDifferenceInTable) {
    if (isBalanced) {
      // Diferență = 0 (sau < 0.01 pentru rotunjiri)
      return (
        <div className={`text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 ${className}`}>
          ✓ Total distribuit: {totalDistribuit.toFixed(2)} RON
        </div>
      );
    } else {
      // Diferență ≠ 0 - Badge portocaliu
      return (
        <div className={`text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700 ${className}`}>
          ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
          {diferenta < 0 ? ' (lipsesc)' : ' (mai mult)'}
        </div>
      );
    }
  }

  return null;
};

// ========================================
// BADGE DIFERENȚĂ (pentru consumption)
// ========================================

/**
 * Badge pentru afișarea diferenței (înainte de distribuire)
 * Folosit pentru consumption când știm suma așteptată
 *
 * @param {object} differenceInfo - Obiect cu informații despre diferențe
 * @param {string} className - Clase CSS adiționale (opțional)
 */
export const DifferenceBadge = ({ differenceInfo, className = '' }) => {
  const { behavior, diferenta, knowsExpectedAmount } = differenceInfo;

  // Afișează doar pentru consumption când știm suma așteptată
  if (!behavior.showDifferenceInTable || !knowsExpectedAmount) {
    return null;
  }

  // Afișează doar dacă diferența există
  if (Math.abs(diferenta) < 0.01) {
    return null;
  }

  return (
    <div className={`text-xs font-semibold text-orange-600 ${className}`}>
      ⚠ Diferență: {diferenta > 0 ? '+' : ''}{diferenta.toFixed(2)} RON
      {diferenta < 0 ? ' (lipsesc)' : ' (mai mult)'}
    </div>
  );
};

// ========================================
// BADGE TOTAL INTRODUS
// ========================================

/**
 * Badge pentru afișarea totalului introdus (înainte de distribuire)
 * Folosit pentru consumption și individual când știm suma așteptată
 *
 * @param {object} differenceInfo - Obiect cu informații despre diferențe
 * @param {string} className - Clase CSS adiționale (opțional)
 */
export const TotalIntrodusBadge = ({ differenceInfo, className = '' }) => {
  const { behavior, totalIntrodus, knowsExpectedAmount } = differenceInfo;

  // Afișează doar pentru tipuri cu input manual când știm suma așteptată
  if (!behavior.hasManualInput || !knowsExpectedAmount) {
    return null;
  }

  return (
    <div className={`text-xs font-semibold text-blue-600 ${className}`}>
      Total introdus: {totalIntrodus.toFixed(2)} RON
    </div>
  );
};

// ========================================
// PLACEHOLDER PENTRU ALINIERE
// ========================================

/**
 * Placeholder invizibil pentru aliniere când nu afișăm diferență
 * Păstrează layout-ul consistent
 */
export const DifferencePlaceholder = () => {
  return <div className="mt-1 h-6"></div>;
};
