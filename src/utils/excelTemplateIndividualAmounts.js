import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * 📊 GENERATOR TEMPLATE EXCEL - SUME INDIVIDUALE PE APARTAMENT
 *
 * Folosit pentru cheltuieli cu distributionType === 'individual'
 * (ex. Căldură, Apă caldă menajeră când sunt introduse sume per apartament)
 *
 * Template-ul conține:
 * - Sheet "Instrucțiuni" cu logo + ghid
 * - Un sheet per scară cu TOATE apartamentele (Nr_Apt, Proprietar, Persoane, Sumă)
 * - Doar coloana "Sumă (RON)" este editabilă; restul sunt locked
 */

/**
 * 🖼️ Helper: descarcă logo-ul BlocApp și îl atașează la workbook
 * Returnează imageId pentru a fi folosit ulterior în worksheet.addImage()
 */
const loadBlocAppLogo = async (workbook) => {
  try {
    const response = await fetch('/blocapp-logo.png');
    if (!response.ok) {
      console.warn('⚠️ Logo BlocApp nu a putut fi încărcat, continuăm fără logo');
      return null;
    }
    const buffer = await response.arrayBuffer();
    return workbook.addImage({ buffer, extension: 'png' });
  } catch (error) {
    console.warn('⚠️ Eroare la încărcarea logo-ului BlocApp:', error);
    return null;
  }
};

/**
 * 🎨 OPȚIUNI IMPLICITE TEMPLATE (mod sume individuale)
 */
const DEFAULT_TEMPLATE_OPTIONS = {
  headerTitle: 'IMPORT SUME INDIVIDUALE',
  headerIcon: '💰',
  valueColumnLabel: 'Sumă (RON)',
  valueUnitShort: 'RON',
  valueNoun: 'suma',
  valueNounPlural: 'sumele',
  valueNounCapitalized: 'Suma',
  valueNounCapitalizedPlural: 'Sumele',
  valueExample: '125.50',
  titlePrefix: 'Template Sume Individuale',
  fileNamePrefix: 'Template',
  subjectText: 'Template pentru importul sumelor individuale'
};

/**
 * 📖 GENEREAZĂ SHEET CU INSTRUCȚIUNI
 */
const generateInstructionsSheet = async (workbook, association, expense, logoImageId, options = DEFAULT_TEMPLATE_OPTIONS) => {
  const sheet = workbook.addWorksheet('📖 INSTRUCȚIUNI', {
    views: [{ showGridLines: false }]
  });

  // Logo sus (dacă e disponibil)
  if (logoImageId !== null) {
    sheet.addImage(logoImageId, {
      tl: { col: 0.15, row: 0.25 },
      ext: { width: 180, height: 60 },
      editAs: 'absolute'
    });
    // Rezervă spațiu pentru logo
    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 30;
    sheet.getRow(3).height = 30;
  }

  // === HEADER ===
  sheet.mergeCells('A5:G5');
  const headerCell = sheet.getCell('A5');
  headerCell.value = `${options.headerIcon}  ${options.headerTitle} - ${expense.name?.toUpperCase() || 'CHELTUIALĂ'}`;
  headerCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(5).height = 35;

  sheet.mergeCells('A6:G6');
  const subHeaderCell = sheet.getCell('A6');
  subHeaderCell.value = association.name?.toUpperCase() || '';
  subHeaderCell.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } };
  subHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF93C5FD' } };
  subHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(6).height = 25;

  // === GHID RAPID ===
  sheet.mergeCells('A8:G8');
  const guideCell = sheet.getCell('A8');
  guideCell.value = '   GHID RAPID DE UTILIZARE';
  guideCell.font = { size: 13, bold: true, color: { argb: 'FF2563EB' } };
  guideCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  sheet.getRow(8).height = 25;

  sheet.mergeCells('A10:G10');
  sheet.getCell('A10').value = `   Acest template vă permite să introduceți rapid ${options.valueNounPlural} pentru fiecare apartament.`;
  sheet.getCell('A10').font = { size: 11, italic: true, color: { argb: 'FF6B7280' } };

  sheet.mergeCells('A11:G11');
  sheet.getCell('A11').value = `   Completați doar coloana "${options.valueColumnLabel}" din sheet-urile scărilor. Celelalte câmpuri sunt blocate.`;
  sheet.getCell('A11').font = { size: 11, italic: true, color: { argb: 'FF6B7280' } };

  // === PAȘI ===
  sheet.mergeCells('A14:G14');
  const stepsHeader = sheet.getCell('A14');
  stepsHeader.value = '   PAȘI DE URMAT';
  stepsHeader.font = { size: 13, bold: true, color: { argb: 'FF2563EB' } };
  stepsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  sheet.getRow(14).height = 25;

  const steps = [
    '   ① Selectați sheet-ul corespunzător scării',
    `   ② Completați ${options.valueNoun} în coloana "${options.valueColumnLabel}" pentru fiecare apartament`,
    `   ③ Apartamentele care nu au ${options.valueNoun} pot fi lăsate goale sau cu 0`,
    '   ④ Salvați fișierul și încărcați-l înapoi în BlocApp prin butonul "Importă din Excel"'
  ];

  steps.forEach((step, i) => {
    const row = 16 + i;
    sheet.mergeCells(`A${row}:G${row}`);
    const stepCell = sheet.getCell(`A${row}`);
    stepCell.value = step;
    stepCell.font = { size: 11, color: { argb: 'FF1F2937' } };
    stepCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFDBFE' } };
    stepCell.border = { left: { style: 'thick', color: { argb: 'FF1E40AF' } } };
  });

  // === IMPORTANT ===
  sheet.mergeCells('A22:G22');
  sheet.getCell('A22').value = '   ⚠️  IMPORTANT DE REȚINUT';
  sheet.getCell('A22').font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A22').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
  sheet.getRow(22).height = 25;

  const warnings = [
    '   •  Nu modificați coloanele Nr_Apt și Proprietar — sunt blocate',
    '   •  Nu ștergeți sau redenumiți sheet-urile scărilor',
    `   •  ${options.valueNounCapitalizedPlural} goale nu vor suprascrie valorile existente în aplicație`,
    `   •  ${options.valueNounCapitalizedPlural} trebuie să fie numere pozitive (ex. ${options.valueExample})`
  ];

  warnings.forEach((warn, i) => {
    const row = 23 + i;
    sheet.mergeCells(`A${row}:G${row}`);
    sheet.getCell(`A${row}`).value = warn;
    sheet.getCell(`A${row}`).font = { size: 10, color: { argb: 'FF7C2D12' } };
    sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  });

  // === FOOTER ===
  sheet.mergeCells('A29:G29');
  sheet.getCell('A29').value = '   Succes la completare! 🎯';
  sheet.getCell('A29').font = { size: 10, italic: true, color: { argb: 'FF6B7280' } };

  // Column widths
  sheet.getColumn('A').width = 20;
  sheet.getColumn('B').width = 15;
  sheet.getColumn('C').width = 15;
  sheet.getColumn('D').width = 15;
  sheet.getColumn('E').width = 15;
  sheet.getColumn('F').width = 15;
  sheet.getColumn('G').width = 15;

  // Protecție sheet (complet blocat - nici selectare celule permisă → fără cursor vizibil)
  await sheet.protect('', {
    selectLockedCells: false,
    selectUnlockedCells: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: false,
    insertColumns: false,
    deleteRows: false,
    deleteColumns: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
    objects: false,   // Blochează selectarea/mutarea imaginilor (logo)
    scenarios: false
  });
};

/**
 * 🏗️ GENEREAZĂ SHEET PENTRU O SCARĂ
 */
const generateStairSheet = async (workbook, stair, block, apartments, expense, logoImageId, options = DEFAULT_TEMPLATE_OPTIONS) => {
  // Numele sheet-ului: max 31 caractere, fără caractere speciale Excel
  const rawName = `${block.name}_${stair.name}`.replace(/[\\/?*[\]]/g, '_');
  const sheetName = rawName.substring(0, 31);
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 8, showGridLines: false, activeCell: 'C9' }]
  });

  // Logo sus
  if (logoImageId !== null) {
    sheet.addImage(logoImageId, {
      tl: { col: 0.15, row: 0.25 },
      ext: { width: 180, height: 60 },
      editAs: 'absolute'
    });
    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 30;
    sheet.getRow(3).height = 30;
  }

  // === TITLE ===
  sheet.mergeCells('A5:C5');
  const titleCell = sheet.getCell('A5');
  titleCell.value = `${expense.name || 'Cheltuială'} - ${block.name} ${stair.name}`;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
  sheet.getRow(5).height = 35;

  // Instrucțiune scurtă
  sheet.mergeCells('A6:C6');
  const instructionCell = sheet.getCell('A6');
  instructionCell.value = `✏️ Completați DOAR coloana "${options.valueColumnLabel}". Restul câmpurilor sunt blocate.`;
  instructionCell.font = { size: 11, italic: true, color: { argb: 'FF6B7280' } };
  instructionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  instructionCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(6).height = 22;

  // === HEADER COLOANE (row 8) ===
  const headers = ['Nr_Apt', 'Proprietar', options.valueColumnLabel];
  sheet.getRow(8).values = headers;
  sheet.getRow(8).height = 28;

  headers.forEach((_, i) => {
    const cell = sheet.getCell(8, i + 1);
    cell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      // Coloana Sumă (index 2) e evidențiată distinct - e singura editabilă
      fgColor: { argb: i === 2 ? 'FF10B981' : 'FF1E40AF' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } }
    };
  });

  // === DATE APARTAMENTE (începând de la row 9) ===
  // Sortează apartamentele după număr
  const sortedApartments = [...apartments].sort((a, b) => {
    const numA = parseInt(a.number, 10);
    const numB = parseInt(b.number, 10);
    if (isNaN(numA) || isNaN(numB)) return String(a.number).localeCompare(String(b.number));
    return numA - numB;
  });

  sortedApartments.forEach((apt, idx) => {
    const row = 9 + idx;
    const rowObj = sheet.getRow(row);
    rowObj.values = [apt.number, apt.owner || '', ''];
    rowObj.height = 22;

    const rowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
    const baseBorder = {
      top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      left: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      right: { style: 'hair', color: { argb: 'FFCBD5E1' } }
    };

    // Nr_Apt (col A) - LOCKED
    const cellA = sheet.getCell(row, 1);
    cellA.font = { size: 10, bold: true, color: { argb: 'FF1F2937' } };
    cellA.fill = rowFill;
    cellA.alignment = { horizontal: 'center', vertical: 'middle' };
    cellA.border = baseBorder;
    cellA.protection = { locked: true };

    // Proprietar (col B) - LOCKED
    const cellB = sheet.getCell(row, 2);
    cellB.font = { size: 10, color: { argb: 'FF1F2937' } };
    cellB.fill = rowFill;
    cellB.alignment = { horizontal: 'left', vertical: 'middle' };
    cellB.border = baseBorder;
    cellB.protection = { locked: true };

    // Sumă (col C) - EDITABIL (fundal verde pal)
    const cellC = sheet.getCell(row, 3);
    cellC.font = { size: 11, color: { argb: 'FF065F46' } };
    cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    cellC.alignment = { horizontal: 'right', vertical: 'middle' };
    cellC.numFmt = '#,##0.00';
    cellC.border = {
      top: { style: 'thin', color: { argb: 'FF6EE7B7' } },
      bottom: { style: 'thin', color: { argb: 'FF6EE7B7' } },
      left: { style: 'thin', color: { argb: 'FF6EE7B7' } },
      right: { style: 'thin', color: { argb: 'FF6EE7B7' } }
    };
    cellC.protection = { locked: false };
  });

  // === COLUMN WIDTHS ===
  sheet.getColumn(1).width = 12;  // Nr_Apt
  sheet.getColumn(2).width = 36;  // Proprietar
  sheet.getColumn(3).width = 22;  // Coloană valoare editabilă

  // === PROTECȚIE SHEET ===
  await sheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: false,
    insertColumns: false,
    deleteRows: false,
    deleteColumns: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
    objects: false,   // Blochează selectarea/mutarea imaginilor (logo)
    scenarios: false
  });

};

/**
 * 📊 FUNCȚIA PRINCIPALĂ
 *
 * @param {Object} association - Asociația curentă
 * @param {Object} expense - Cheltuiala (trebuie să aibă .name)
 * @param {Array} apartments - Toate apartamentele asociației
 * @param {Array} blocks - Blocurile asociației
 * @param {Array} stairs - Scările asociației
 */
export const generateIndividualAmountsTemplate = async (association, expense, apartments, blocks, stairs, options = DEFAULT_TEMPLATE_OPTIONS) => {
  try {
    if (!association || !expense || !apartments || !blocks || !stairs) {
      throw new Error('Date incomplete pentru generarea template-ului');
    }

    const mergedOptions = { ...DEFAULT_TEMPLATE_OPTIONS, ...(options || {}) };

    const associationBlocks = blocks.filter(block => block.associationId === association.id);
    const associationStairs = stairs.filter(stair =>
      associationBlocks.some(block => block.id === stair.blockId)
    );

    if (associationBlocks.length === 0) throw new Error('Nu există blocuri configurate');
    if (associationStairs.length === 0) throw new Error('Nu există scări configurate');
    if (apartments.length === 0) throw new Error('Nu există apartamente configurate');

    const workbook = new ExcelJS.Workbook();

    // Metadata
    workbook.creator = 'BlocApp';
    workbook.lastModifiedBy = 'BlocApp';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.title = `${mergedOptions.titlePrefix} - ${expense.name} - ${association.name}`;
    workbook.subject = `${mergedOptions.subjectText} la ${expense.name}`;
    workbook.company = 'BlocApp';
    workbook.category = mergedOptions.titlePrefix;
    workbook.description = `Template generat pentru ${association.name}. Include ${associationStairs.length} scară(ri) și ${apartments.length} apartamente.`;

    // Încarcă logo-ul o singură dată
    const logoImageId = await loadBlocAppLogo(workbook);

    // Sheet Instrucțiuni
    await generateInstructionsSheet(workbook, association, expense, logoImageId, mergedOptions);

    // Sheet-uri per scară
    let stairCount = 0;
    for (const stair of associationStairs) {
      const block = associationBlocks.find(b => b.id === stair.blockId);
      if (!block) continue;

      // Apartamentele acestei scări (TOATE, indiferent de participare)
      const stairApartments = apartments.filter(apt => apt.stairId === stair.id);
      if (stairApartments.length === 0) continue;

      await generateStairSheet(workbook, stair, block, stairApartments, expense, logoImageId, mergedOptions);
      stairCount++;
    }

    // Setează sheet-ul de scară (index 1) ca activ la deschidere — adminul ajunge direct la completare
    workbook.views = [{ activeTab: 0 }];

    // Generează fișier
    // Elimină diacriticele înainte de sanitizare (ă→a, â→a, î→i, ș→s, ț→t)
    const safeName = (str) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${mergedOptions.fileNamePrefix}_${safeName(expense.name)}_${safeName(association.name)}_${new Date().toISOString().split('T')[0]}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);

    return {
      success: true,
      fileName,
      stats: {
        asociatie: association.name,
        expense: expense.name,
        scari: stairCount,
        apartamente: apartments.length
      }
    };
  } catch (error) {
    console.error('❌ Eroare la generarea template-ului sume individuale:', error);
    throw error;
  }
};

/**
 * 💧 OPȚIUNI PENTRU TEMPLATE CONSUMURI (mc)
 */
const CONSUMPTION_TEMPLATE_OPTIONS = {
  headerTitle: 'IMPORT CONSUMURI',
  headerIcon: '💧',
  valueColumnLabel: 'Consum (mc)',
  valueUnitShort: 'mc',
  valueNoun: 'consumul',
  valueNounPlural: 'consumurile',
  valueNounCapitalized: 'Consumul',
  valueNounCapitalizedPlural: 'Consumurile',
  valueExample: '12.50',
  titlePrefix: 'Template Consumuri',
  fileNamePrefix: 'Template_Consumuri',
  subjectText: 'Template pentru importul consumurilor'
};

/**
 * 💧 GENEREAZĂ TEMPLATE EXCEL PENTRU CONSUMURI (mc)
 *
 * Wrapper thin peste `generateIndividualAmountsTemplate` care adaptează etichetele
 * pentru cheltuieli distribuite pe consum (mod "Manual").
 */
export const generateConsumptionTemplate = async (association, expense, apartments, blocks, stairs) => {
  return generateIndividualAmountsTemplate(
    association,
    expense,
    apartments,
    blocks,
    stairs,
    CONSUMPTION_TEMPLATE_OPTIONS
  );
};
