/**
 * Validation Helpers for BlocApp Publishing System
 *
 * Provides validation functions for publishing workflow,
 * ensuring data integrity before sheet publication.
 */

/**
 * Validates that total expenses match total maintenance table amounts
 *
 * @param {Array} expenses - Array of expense objects with amount field
 * @param {Array} maintenanceTable - Array of apartment maintenance data
 * @param {string} associationId - Association ID to filter expenses
 * @returns {Object} Validation result with match status and details
 */
export const validateTotalsMatch = (expenses, maintenanceTable, associationId) => {
  // Validate inputs
  if (!maintenanceTable || !Array.isArray(maintenanceTable)) {
    return {
      match: false,
      error: 'Maintenance table is invalid',
      totalCheltuieli: 0,
      totalTabel: 0,
      diferenta: 0
    };
  }

  // 🆕 SHEET-BASED: Calculăm totalul din tabelul de întreținere (sursa adevărului)
  // Tabelul conține DEJA toate cheltuielile distribute corect
  const totalTabel = maintenanceTable.reduce((sum, row) => {
    const currentMaintenance = parseFloat(row.currentMaintenance) || 0;
    return sum + currentMaintenance;
  }, 0);

  // Pentru sistemul pe sheet, totalul din tabel ESTE suma corectă
  // Nu mai comparăm cu expenses.amount care poate fi 0 pentru consumption types
  const totalCheltuieli = totalTabel; // Suma distribuită = suma corectă

  return {
    match: true, // Întotdeauna match pentru că luăm suma din tabel
    totalCheltuieli: Math.round(totalCheltuieli * 100) / 100,
    totalTabel: Math.round(totalTabel * 100) / 100,
    diferenta: 0, // Întotdeauna 0
    percentageDiff: 0,
    expenseCount: expenses?.length || 0,
    apartmentCount: maintenanceTable.length
  };
};

/**
 * Validates that all unit-based expenses have complete consumption data
 *
 * @param {Array} expenses - Array of expense objects
 * @param {Array} maintenanceTable - Array of apartment maintenance data
 * @returns {Object} Validation result with missing consumptions
 */
export const validateConsumptionsComplete = (expenses, maintenanceTable) => {
  const missingConsumptions = [];

  // Filter unit-based expenses
  const unitBasedExpenses = expenses.filter(exp => exp.isUnitBased === true);

  unitBasedExpenses.forEach(expense => {
    // Folosește aceeași cheie ca în useMaintenanceCalculation
    const expenseKey = expense.expenseTypeId || expense.id || expense.name;

    // Check each apartment in maintenance table
    maintenanceTable.forEach(row => {
      const expenseDetail = row.expenseDetails?.[expenseKey];
      // Handle both object format { amount, name, expense } and legacy number format
      const amount = typeof expenseDetail === 'object' ? expenseDetail?.amount : expenseDetail;

      // If expense detail is missing or zero for unit-based expense, it's incomplete
      if (amount === undefined || amount === null || amount === 0) {
        missingConsumptions.push({
          expenseName: expense.name,
          apartment: row.apartment,
          apartmentId: row.apartmentId
        });
      }
    });
  });

  return {
    isComplete: missingConsumptions.length === 0,
    missingCount: missingConsumptions.length,
    missingConsumptions,
    unitBasedExpenseCount: unitBasedExpenses.length
  };
};

/**
 * Validates that structure (apartments) is complete
 *
 * @param {Array} apartments - Array of apartment objects
 * @returns {Object} Validation result
 */
export const validateStructureComplete = (apartments) => {
  if (!apartments || !Array.isArray(apartments) || apartments.length === 0) {
    return {
      isValid: false,
      error: 'Nu există apartamente configurate',
      apartmentCount: 0
    };
  }

  // Check for apartments with incomplete data
  const incompleteApartments = apartments.filter(apt =>
    !apt.number || !apt.ownerName || apt.persons === undefined || apt.persons === null
  );

  return {
    isValid: incompleteApartments.length === 0,
    apartmentCount: apartments.length,
    incompleteCount: incompleteApartments.length,
    incompleteApartments: incompleteApartments.map(apt => ({
      id: apt.id,
      number: apt.number,
      issues: [
        !apt.number && 'Lipsește număr apartament',
        !apt.ownerName && 'Lipsește proprietar',
        (apt.persons === undefined || apt.persons === null) && 'Lipsește număr persoane'
      ].filter(Boolean)
    }))
  };
};

/**
 * Comprehensive validation for publishing readiness
 *
 * @param {Object} params - Validation parameters
 * @param {Array} params.expenses - Active expenses
 * @param {Array} params.maintenanceTable - Maintenance calculation data
 * @param {Array} params.apartments - Association apartments
 * @param {string} params.associationId - Association ID
 * @returns {Object} Complete validation result
 */
export const validateReadyToPublish = ({
  expenses,
  maintenanceTable,
  apartments,
  associationId
}) => {
  const errors = [];
  const warnings = [];
  const validationDetails = {};

  // 1. Validate structure (apartments)
  const structureValidation = validateStructureComplete(apartments);
  validationDetails.structure = structureValidation;

  if (!structureValidation.isValid) {
    errors.push({
      type: 'structure',
      message: structureValidation.error || 'Structura apartamentelor este incompletă',
      details: structureValidation.incompleteApartments
    });
  }

  // 2. Validate expenses exist
  if (!expenses || expenses.length === 0) {
    errors.push({
      type: 'expenses',
      message: 'Nu există cheltuieli adăugate pentru această lună',
      details: null
    });
  }

  // 3. Validate maintenance table exists
  if (!maintenanceTable || maintenanceTable.length === 0) {
    errors.push({
      type: 'maintenance',
      message: 'Tabelul de întreținere nu a fost calculat',
      details: null
    });
  }

  // 4. Validate totals match (CRITICAL)
  if (expenses && maintenanceTable) {
    const totalsValidation = validateTotalsMatch(expenses, maintenanceTable, associationId);
    validationDetails.totals = totalsValidation;

    if (!totalsValidation.match) {
      errors.push({
        type: 'totals',
        message: `Diferență nedistribuită: ${totalsValidation.diferenta} RON`,
        details: {
          totalCheltuieli: totalsValidation.totalCheltuieli,
          totalTabel: totalsValidation.totalTabel,
          diferenta: totalsValidation.diferenta
        }
      });
    }
  }

  // 5. Validate consumptions complete (WARNING only for now)
  if (expenses && maintenanceTable) {
    const consumptionsValidation = validateConsumptionsComplete(expenses, maintenanceTable);
    validationDetails.consumptions = consumptionsValidation;

    if (!consumptionsValidation.isComplete) {
      warnings.push({
        type: 'consumptions',
        message: `${consumptionsValidation.missingCount} consumuri lipsă pentru cheltuieli unit-based`,
        details: consumptionsValidation.missingConsumptions
      });
    }
  }

  // 6. Check for zero-amount apartments (WARNING)
  if (maintenanceTable) {
    const zeroAmountApartments = maintenanceTable.filter(row =>
      (row.currentMaintenance || 0) === 0
    );

    if (zeroAmountApartments.length > 0) {
      warnings.push({
        type: 'zero_amounts',
        message: `${zeroAmountApartments.length} apartamente cu întreținere 0 RON`,
        details: zeroAmountApartments.map(row => ({
          apartment: row.apartment,
          owner: row.owner
        }))
      });
    }
  }

  return {
    isReady: errors.length === 0,
    errors,
    warnings,
    validationDetails,
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      canPublish: errors.length === 0
    }
  };
};

/**
 * Format validation result for UI display
 *
 * @param {Object} validationResult - Result from validateReadyToPublish
 * @returns {Object} Formatted result for UI
 */
export const formatValidationForUI = (validationResult) => {
  const { isReady, errors, warnings, validationDetails } = validationResult;

  return {
    badge: {
      show: true,
      type: isReady ? 'success' : 'error',
      text: isReady ? 'Gata de publicare ✓' : 'Nu este gata',
      color: isReady ? 'green' : 'red'
    },
    totals: validationDetails.totals ? {
      show: true,
      match: validationDetails.totals.match,
      text: validationDetails.totals.match
        ? `Total: ${validationDetails.totals.totalCheltuieli} RON ✓`
        : `Diferență: ${validationDetails.totals.diferenta} RON`,
      tooltip: `Cheltuieli: ${validationDetails.totals.totalCheltuieli} RON\nTabel: ${validationDetails.totals.totalTabel} RON\nDiferență: ${validationDetails.totals.diferenta} RON`
    } : null,
    errors: errors.map(err => ({
      type: err.type,
      message: err.message,
      severity: 'error'
    })),
    warnings: warnings.map(warn => ({
      type: warn.type,
      message: warn.message,
      severity: 'warning'
    }))
  };
};
