import * as XLSX from 'xlsx';

/**
 * 📊 PARSER EXCEL - SUME INDIVIDUALE PE APARTAMENT
 *
 * Parsează fișierele generate de excelTemplateIndividualAmounts.js
 * și validează sumele introduse pentru fiecare apartament.
 *
 * Output: { success, amounts: { [apartmentId]: number }, stats, errors, warnings, preview }
 * - `skipped` rows (sumă goală) NU sunt incluse în `amounts` — nu suprascriu valorile existente.
 */

/**
 * 🔍 VALIDEAZĂ UN RÂND DIN EXCEL
 */
const validateRow = (row, rowIndex, apartmentsById, apartmentsByNumber) => {
  const errors = [];
  const warnings = [];
  let parsedAmount = null;
  let apartmentId = null;
  let apartmentInfo = null;

  const nrAptRaw = row['Nr_Apt'];
  const sumaRaw = row['Sumă (RON)'];

  // 1. Nr_Apt obligatoriu
  if (nrAptRaw === undefined || nrAptRaw === null || nrAptRaw === '') {
    errors.push(`Rândul ${rowIndex}: Numărul apartamentului lipsește`);
    return { errors, warnings, parsedAmount, apartmentId, apartmentInfo };
  }

  const nrApt = parseInt(nrAptRaw, 10);
  if (isNaN(nrApt)) {
    errors.push(`Rândul ${rowIndex}: Numărul apartamentului "${nrAptRaw}" nu este valid`);
    return { errors, warnings, parsedAmount, apartmentId, apartmentInfo };
  }

  // 2. Apartamentul trebuie să existe
  const apartment = apartmentsByNumber[nrApt];
  if (!apartment) {
    errors.push(`Rândul ${rowIndex}: Apartamentul ${nrApt} nu există în asociație`);
    return { errors, warnings, parsedAmount, apartmentId, apartmentInfo };
  }

  apartmentId = apartment.id;
  apartmentInfo = apartment;

  // 3. Validează suma
  if (sumaRaw === undefined || sumaRaw === null || sumaRaw === '' ||
      (typeof sumaRaw === 'string' && sumaRaw.trim() === '')) {
    // Sumă goală - skipped (warning, nu eroare)
    warnings.push(`Apartament ${nrApt}: sumă goală, valoarea existentă nu va fi suprascrisă`);
    return { errors, warnings, parsedAmount: null, apartmentId, apartmentInfo };
  }

  const sumaNum = typeof sumaRaw === 'number' ? sumaRaw : parseFloat(String(sumaRaw).replace(',', '.'));
  if (isNaN(sumaNum)) {
    errors.push(`Rândul ${rowIndex} (apt ${nrApt}): Suma "${sumaRaw}" nu este un număr valid`);
    return { errors, warnings, parsedAmount, apartmentId, apartmentInfo };
  }

  if (sumaNum < 0) {
    errors.push(`Rândul ${rowIndex} (apt ${nrApt}): Suma nu poate fi negativă`);
    return { errors, warnings, parsedAmount, apartmentId, apartmentInfo };
  }

  parsedAmount = Math.round(sumaNum * 100) / 100; // max 2 zecimale
  return { errors, warnings, parsedAmount, apartmentId, apartmentInfo };
};

/**
 * 📋 PARSEAZĂ UN SHEET DE SCARĂ
 */
const parseStairSheet = (workbook, sheetName, apartmentsByNumber, seenApartmentNumbers) => {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return { sheetName, parsed: [], errors: [], warnings: [] };
  }

  // Convertește sheet-ul în array de rânduri
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: ''
  });

  const parsed = [];
  const errors = [];
  const warnings = [];

  // Găsește rândul de header (cel care conține "Nr_Apt" și "Sumă (RON)")
  let headerRowIndex = -1;
  let headerCols = { nrApt: -1, proprietar: -1, suma: -1 };

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (!cell) continue;
      const cellStr = String(cell).trim();

      if (cellStr === 'Nr_Apt') headerCols.nrApt = j;
      else if (cellStr === 'Proprietar') headerCols.proprietar = j;
      else if (cellStr.startsWith('Sumă')) headerCols.suma = j;
    }

    if (headerCols.nrApt !== -1 && headerCols.suma !== -1) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    errors.push(`Sheet "${sheetName}": header-ul nu a fost găsit (lipsește Nr_Apt sau Sumă)`);
    return { sheetName, parsed, errors, warnings };
  }

  // Procesează rândurile de date (după header)
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const rowArr = data[i];
    if (!rowArr) continue;

    // Skip rânduri complet goale
    const hasAnyData = rowArr.some(cell => cell !== '' && cell !== null && cell !== undefined);
    if (!hasAnyData) continue;

    const row = {
      'Nr_Apt': rowArr[headerCols.nrApt],
      'Proprietar': headerCols.proprietar !== -1 ? rowArr[headerCols.proprietar] : '',
      'Sumă (RON)': rowArr[headerCols.suma]
    };

    const excelRowNumber = i + 1; // Excel-ul numerotează de la 1
    const validation = validateRow(row, excelRowNumber, null, apartmentsByNumber);

    errors.push(...validation.errors);
    warnings.push(...validation.warnings);

    // Duplicate check
    if (validation.apartmentId !== null) {
      if (seenApartmentNumbers.has(row['Nr_Apt'])) {
        errors.push(`Rândul ${excelRowNumber}: Apartamentul ${row['Nr_Apt']} este duplicat în fișier`);
        continue;
      }
      seenApartmentNumbers.add(row['Nr_Apt']);
    }

    if (validation.errors.length === 0 && validation.apartmentId !== null) {
      parsed.push({
        apartmentId: validation.apartmentId,
        apartmentNumber: row['Nr_Apt'],
        apartmentOwner: validation.apartmentInfo?.owner || '',
        amount: validation.parsedAmount, // null = skipped
        skipped: validation.parsedAmount === null
      });
    }
  }

  return { sheetName, parsed, errors, warnings };
};

/**
 * 📊 FUNCȚIA PRINCIPALĂ
 *
 * @param {File} file - Fișierul Excel încărcat
 * @param {Array} apartments - Lista apartamentelor asociației
 * @returns {Promise<Object>} rezultat parse
 */
export const parseIndividualAmountsExcel = async (file, apartments) => {
  try {
    if (!file) throw new Error('Fișierul lipsește');
    if (!apartments || apartments.length === 0) throw new Error('Lista de apartamente este goală');

    // Construiește map-ul apartamentelor după număr (NOT id)
    const apartmentsByNumber = {};
    apartments.forEach(apt => {
      const num = parseInt(apt.number, 10);
      if (!isNaN(num)) apartmentsByNumber[num] = apt;
    });

    // Citește fișierul
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const allParsed = [];
    const allErrors = [];
    const allWarnings = [];
    const seenApartmentNumbers = new Set();
    let sheetsProcessed = 0;

    for (const sheetName of workbook.SheetNames) {
      // Skip sheet-ul de instrucțiuni
      if (sheetName.toUpperCase().includes('INSTRUC')) continue;

      const result = parseStairSheet(workbook, sheetName, apartmentsByNumber, seenApartmentNumbers);
      allParsed.push(...result.parsed);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      sheetsProcessed++;
    }

    // Construiește obiectul amounts (exclude skipped)
    const amounts = {};
    let filledCount = 0;
    let skippedCount = 0;

    allParsed.forEach(entry => {
      if (entry.skipped) {
        skippedCount++;
      } else {
        amounts[entry.apartmentId] = entry.amount;
        filledCount++;
      }
    });

    return {
      success: allErrors.length === 0,
      amounts,
      preview: allParsed,
      stats: {
        sheetsProcessed,
        totalRows: allParsed.length,
        filled: filledCount,
        skipped: skippedCount,
        errors: allErrors.length,
        warnings: allWarnings.length
      },
      errors: allErrors,
      warnings: allWarnings
    };
  } catch (error) {
    console.error('❌ Eroare la parsarea fișierului Excel:', error);
    return {
      success: false,
      amounts: {},
      preview: [],
      stats: { sheetsProcessed: 0, totalRows: 0, filled: 0, skipped: 0, errors: 1, warnings: 0 },
      errors: [`Eroare la procesarea fișierului: ${error.message}`],
      warnings: []
    };
  }
};
