import * as XLSX from 'xlsx';

/**
 * 📊 PARSER EXCEL PENTRU IMPORT APARTAMENTE
 * 
 * Parsează fișierele Excel generate de template și validează datele
 * înainte de import în baza de date
 */

// 🏠 OPȚIUNI VALIDE PENTRU VALIDARE
const VALID_APARTMENT_TYPES = [
  'Garsoniera',
  '2 camere', 
  '3 camere',
  '4 camere',
  '5 camere',
  'Penthouse'
];

const VALID_HEATING_SOURCES = [
  'Termoficare',
  'Centrală proprie', 
  'Centrală bloc',
  'Debranșat'
];

/**
 * 🔍 VALIDEAZĂ UN RÂND DIN EXCEL
 */
const validateApartmentRow = (row, rowIndex, existingNumbers = []) => {
  const errors = [];
  const warnings = [];
  
  // Verifică câmpurile obligatorii
  if (!row['Nr_Apt*'] && row['Nr_Apt*'] !== 0) {
    errors.push(`Rândul ${rowIndex}: Numărul apartamentului este obligatoriu`);
  } else {
    const aptNumber = parseInt(row['Nr_Apt*']);
    if (isNaN(aptNumber) || aptNumber < 1) {
      errors.push(`Rândul ${rowIndex}: Numărul apartamentului trebuie să fie un număr întreg pozitiv`);
    } else if (existingNumbers.includes(aptNumber)) {
      errors.push(`Rândul ${rowIndex}: Numărul apartamentului ${aptNumber} este duplicat`);
    }
  }
  
  if (!row['Proprietar*'] || row['Proprietar*'].toString().trim() === '') {
    errors.push(`Rândul ${rowIndex}: Numele proprietarului este obligatoriu`);
  }
  
  if (!row['Nr_Persoane*'] && row['Nr_Persoane*'] !== 0) {
    errors.push(`Rândul ${rowIndex}: Numărul de persoane este obligatoriu`);
  } else {
    const persons = parseInt(row['Nr_Persoane*']);
    if (isNaN(persons) || persons < 1) {
      errors.push(`Rândul ${rowIndex}: Numărul de persoane trebuie să fie minimum 1`);
    }
  }
  
  // Verifică câmpurile opționale
  if (row['Tip_Apartament'] && !VALID_APARTMENT_TYPES.includes(row['Tip_Apartament'])) {
    warnings.push(`Rândul ${rowIndex}: Tipul apartamentului "${row['Tip_Apartament']}" nu este valid. Opțiuni valide: ${VALID_APARTMENT_TYPES.join(', ')}`);
  }
  
  if (row['Sursa_Incalzire'] && !VALID_HEATING_SOURCES.includes(row['Sursa_Incalzire'])) {
    warnings.push(`Rândul ${rowIndex}: Sursa de încălzire "${row['Sursa_Incalzire']}" nu este validă. Opțiuni valide: ${VALID_HEATING_SOURCES.join(', ')}`);
  }
  
  if (row['Suprafata_mp']) {
    const surface = parseFloat(row['Suprafata_mp']);
    if (isNaN(surface) || surface <= 0) {
      warnings.push(`Rândul ${rowIndex}: Suprafața trebuie să fie un număr pozitiv`);
    }
  }
  
  if (row['Restanta_RON']) {
    const debt = parseFloat(row['Restanta_RON']);
    if (isNaN(debt) || debt < 0) {
      warnings.push(`Rândul ${rowIndex}: Restanța trebuie să fie un număr pozitiv sau 0`);
    }
  }
  
  if (row['Penalitati_RON']) {
    const penalties = parseFloat(row['Penalitati_RON']);
    if (isNaN(penalties) || penalties < 0) {
      warnings.push(`Rândul ${rowIndex}: Penalitățile trebuie să fie un număr pozitiv sau 0`);
    }
  }
  
  return { errors, warnings };
};

/**
 * 📋 PARSEAZĂ UN SHEET PENTRU O SCARĂ
 */
const parseStairSheet = (worksheet, sheetName) => {
  // Convertește sheet-ul în JSON cu opțiuni mai flexibile
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    defval: '',
    raw: false, // Convertește numerele în string pentru a evita problemele
    header: 1  // Folosește array-uri în loc de obiecte pentru a avea control mai bun
  });
  
  console.log(`📋 Parsez sheet-ul: ${sheetName}`);
  console.log(`Total rânduri găsite: ${data.length}`);
  
  const apartments = [];
  const validationErrors = [];
  const validationWarnings = [];
  const existingNumbers = [];
  
  // Găsește rândul cu header-ele (Nr_Apt*, Proprietar*, etc.)
  let headerRowIndex = -1;
  let headers = [];
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row[0] && row[0].toString().includes('Nr_Apt')) {
      headerRowIndex = i;
      headers = row;
      console.log(`📍 Header găsit la rândul ${i + 1}: ${headers.slice(0, 3).join(', ')}...`);
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    console.error('❌ Nu am găsit header-ul cu Nr_Apt*');
    validationErrors.push(`Sheet ${sheetName}: Nu am găsit header-ul cu coloanele necesare`);
    return { sheetName, apartments, errors: validationErrors, warnings: validationWarnings };
  }
  
  // Găsește unde încep datele (caută după "ÎNCEPE COMPLETAREA" sau pornește de la un offset fix)
  let dataStartIndex = headerRowIndex + 1; // Implicit, începe imediat după header
  
  // Caută mesajul de început
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    const firstCell = row[0] ? row[0].toString() : '';
    
    if (firstCell.includes('ÎNCEPE COMPLETAREA') || firstCell.includes('✏️')) {
      dataStartIndex = i + 1; // Skip doar acest rând, nu și unul suplimentar
      console.log(`📝 Am găsit marcajul de început la rândul ${i + 1}, încep să citesc de la ${dataStartIndex + 1}`);
      break;
    }
  }
  
  console.log(`🔍 Încep să citesc datele de la rândul ${dataStartIndex + 1}`);
  
  let processedRows = 0;
  let skippedEmpty = 0;
  
  // Procesează fiecare rând de date
  for (let i = dataStartIndex; i < data.length; i++) {
    const rowData = data[i];
    
    // Creează un obiect din rând folosind header-ele
    const row = {};
    headers.forEach((header, index) => {
      row[header] = rowData[index] || '';
    });
    
    // Skip rândurile complet goale
    const hasData = rowData.some(cell => cell && cell.toString().trim() !== '');
    if (!hasData) {
      skippedEmpty++;
      continue;
    }
    
    // Skip dacă nu are date esențiale
    if (!row['Nr_Apt*'] && !row['Proprietar*'] && !row['Nr_Persoane*']) {
      console.log(`⚠️ Rând ${i + 1} sărit - lipsesc date esențiale`);
      continue;
    }
    
    processedRows++;
    console.log(`📝 Procesez rândul ${i + 1} (apartament #${processedRows}):`, {
      'Nr_Apt*': row['Nr_Apt*'],
      'Proprietar*': row['Proprietar*'],
      'Nr_Persoane*': row['Nr_Persoane*']
    });
    
    // Validează rândul
    const validation = validateApartmentRow(row, i + 2, existingNumbers); // +2 pentru că Excel începe de la 1 și avem header
    validationErrors.push(...validation.errors);
    validationWarnings.push(...validation.warnings);
    
    // Dacă nu sunt erori critice, adaugă apartamentul
    if (validation.errors.length === 0) {
      const apartment = {
        number: parseInt(row['Nr_Apt*']),
        owner: row['Proprietar*'].toString().trim(),
        persons: parseInt(row['Nr_Persoane*']),
        apartmentType: row['Tip_Apartament'] || null,
        surface: row['Suprafata_mp'] ? parseFloat(row['Suprafata_mp']) : null,
        heatingSource: row['Sursa_Incalzire'] || null,
        // Mapare solduri inițiale în structura corectă
        initialBalance: {
          restante: row['Restanta_RON'] ? parseFloat(row['Restanta_RON']) : 0,
          penalitati: row['Penalitati_RON'] ? parseFloat(row['Penalitati_RON']) : 0,
          setupMonth: new Date().toISOString().slice(0, 7),
          createdAt: new Date().toISOString()
        }
      };
      
      apartments.push(apartment);
      existingNumbers.push(apartment.number);
      
      // Log pentru apartamentele adăugate cu succes
      console.log(`✅ Apartament ${apartment.number} adăugat cu succes`);
    } else {
      // Log pentru apartamentele cu erori
      console.log(`❌ Apartament din rândul ${i + 1} nu a fost adăugat. Erori:`, validation.errors);
      console.log(`   Date rând:`, {
        'Nr_Apt*': row['Nr_Apt*'],
        'Proprietar*': row['Proprietar*'],
        'Nr_Persoane*': row['Nr_Persoane*']
      });
    }
  }
  
  console.log(`📊 SUMAR Sheet ${sheetName}:`);
  console.log(`   • Rânduri procesate: ${processedRows}`);
  console.log(`   • Rânduri goale sărite: ${skippedEmpty}`);
  console.log(`   • Apartamente valid adăugate: ${apartments.length}`);
  console.log(`   • Erori de validare: ${validationErrors.length}`);
  
  return {
    sheetName,
    apartments,
    errors: validationErrors,
    warnings: validationWarnings
  };
};

/**
 * 📊 FUNCȚIA PRINCIPALĂ DE PARSARE EXCEL
 */
export const parseExcelFile = async (file, blocks, stairs) => {
  try {
    console.log('📊 Parsez fișierul Excel:', file.name);
    
    // Citește fișierul
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    const results = {
      success: true,
      sheets: [],
      totalApartments: 0,
      totalErrors: 0,
      totalWarnings: 0
    };
    
    // Procesează fiecare sheet (exceptând instrucțiunile)
    for (const sheetName of workbook.SheetNames) {
      // Skip sheet-ul de instrucțiuni
      if (sheetName.includes('INSTRUCȚIUNI')) {
        continue;
      }
      
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = parseStairSheet(worksheet, sheetName);
      
      // Găsește scara corespunzătoare din nume
      let stairId = null;
      for (const stair of stairs) {
        const block = blocks.find(b => b.id === stair.blockId);
        if (block && sheetName.includes(block.name) && sheetName.includes(stair.name)) {
          stairId = stair.id;
          break;
        }
      }
      
      if (!stairId) {
        sheetData.errors.push(`Nu am putut identifica scara pentru sheet-ul "${sheetName}"`);
      } else {
        // Adaugă stairId la fiecare apartament
        sheetData.apartments = sheetData.apartments.map(apt => ({
          ...apt,
          stairId
        }));
      }
      
      results.sheets.push(sheetData);
      results.totalApartments += sheetData.apartments.length;
      results.totalErrors += sheetData.errors.length;
      results.totalWarnings += sheetData.warnings.length;
    }
    
    // Verifică dacă avem apartamente de importat
    if (results.totalApartments === 0 && results.totalErrors === 0) {
      results.success = false;
      results.message = 'Nu am găsit apartamente de importat în fișierul Excel';
    } else if (results.totalErrors > 0) {
      results.success = false;
      results.message = `Am găsit ${results.totalErrors} erori care trebuie corectate`;
    }
    
    console.log('✅ Rezultat parsare:', {
      sheets: results.sheets.length,
      apartamente: results.totalApartments,
      erori: results.totalErrors,
      avertismente: results.totalWarnings
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Eroare la parsarea fișierului Excel:', error);
    return {
      success: false,
      message: `Eroare la citirea fișierului: ${error.message}`,
      sheets: [],
      totalApartments: 0,
      totalErrors: 1,
      totalWarnings: 0
    };
  }
};

/**
 * 🔄 PREGĂTEȘTE DATELE PENTRU IMPORT ÎN BULK
 */
export const prepareApartmentsForImport = (parseResults) => {
  const apartments = [];
  
  for (const sheet of parseResults.sheets) {
    if (sheet.apartments.length > 0) {
      apartments.push(...sheet.apartments);
    }
  }
  
  // Sortează după numărul apartamentului
  apartments.sort((a, b) => a.number - b.number);
  
  return apartments;
};

/**
 * 📈 GENEREAZĂ RAPORT DE IMPORT
 */
export const generateImportReport = (parseResults) => {
  const report = [];
  
  report.push(`📊 RAPORT IMPORT APARTAMENTE`);
  report.push(`================================`);
  report.push(`Total sheet-uri procesate: ${parseResults.sheets.length}`);
  report.push(`Total apartamente găsite: ${parseResults.totalApartments}`);
  report.push(`Total erori: ${parseResults.totalErrors}`);
  report.push(`Total avertismente: ${parseResults.totalWarnings}`);
  report.push(``);
  
  for (const sheet of parseResults.sheets) {
    report.push(`📋 Sheet: ${sheet.sheetName}`);
    report.push(`  - Apartamente: ${sheet.apartments.length}`);
    
    if (sheet.errors.length > 0) {
      report.push(`  ❌ Erori:`);
      sheet.errors.forEach(error => {
        report.push(`    • ${error}`);
      });
    }
    
    if (sheet.warnings.length > 0) {
      report.push(`  ⚠️ Avertismente:`);
      sheet.warnings.forEach(warning => {
        report.push(`    • ${warning}`);
      });
    }
    
    report.push(``);
  }
  
  return report.join('\n');
};