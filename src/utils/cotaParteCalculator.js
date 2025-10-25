/**
 * 🏠 Utilitar pentru calculul cotei părți indivize
 *
 * Funcții helper pentru calculul și formatarea cotei părți indivize
 * bazate pe suprafața utilă a apartamentelor.
 */

/**
 * Calculează cota parte indiviză pentru un apartament
 * @param {number} surface - Suprafața apartamentului (mp)
 * @param {number} totalSurface - Suprafața totală a grupului (bloc/scară/asociație) (mp)
 * @returns {number} Cota parte în procente (ex: 2.5 pentru 2.5%)
 */
export const calculateCotaParte = (surface, totalSurface) => {
  if (!surface || !totalSurface || totalSurface === 0) return 0;
  return parseFloat(((surface / totalSurface) * 100).toFixed(4));
};

/**
 * Formatează cota parte pentru afișare
 * @param {number} cotaParte - Cota parte în procente
 * @param {number} surface - Suprafața apartamentului (mp)
 * @param {number} totalSurface - Suprafața totală (mp)
 * @returns {string} Format: "2.5% (40 mp / 1600 mp)"
 */
export const formatCotaParte = (cotaParte, surface, totalSurface) => {
  if (!cotaParte) return 'N/A';
  return `${cotaParte.toFixed(4)}% (${surface} mp / ${totalSurface.toFixed(2)} mp)`;
};

/**
 * Calculează suprafața totală pentru un grup de apartamente
 * @param {Array} apartments - Lista de apartamente
 * @returns {number} Suprafața totală (mp)
 */
export const calculateTotalSurface = (apartments) => {
  if (!apartments || !Array.isArray(apartments)) return 0;
  return apartments.reduce((sum, apt) => sum + (apt.surface || 0), 0);
};

/**
 * Validează că toate apartamentele au suprafața completată
 * @param {Array} apartments - Lista de apartamente
 * @returns {Object} { valid: boolean, apartmentsWithoutSurface: Array }
 */
export const validateSurfaces = (apartments) => {
  if (!apartments || !Array.isArray(apartments)) {
    return { valid: false, apartmentsWithoutSurface: [] };
  }

  const apartmentsWithoutSurface = apartments.filter(apt => !apt.surface || apt.surface <= 0);

  return {
    valid: apartmentsWithoutSurface.length === 0,
    apartmentsWithoutSurface
  };
};

/**
 * Recalculează cotele părți pentru toate apartamentele dintr-un grup
 * @param {Array} apartments - Lista de apartamente
 * @returns {Array} Apartamente cu cote părți actualizate
 */
export const recalculateAllCotiParti = (apartments) => {
  if (!apartments || !Array.isArray(apartments)) return [];

  const totalSurface = calculateTotalSurface(apartments);

  return apartments.map(apt => ({
    ...apt,
    cotaParte: calculateCotaParte(apt.surface, totalSurface)
  }));
};

/**
 * Verifică dacă un apartament are cotă parte validă
 * @param {Object} apartment - Apartamentul de verificat
 * @returns {boolean} True dacă are cotă parte validă
 */
export const hasCotaParte = (apartment) => {
  return apartment && apartment.cotaParte && apartment.cotaParte > 0;
};
