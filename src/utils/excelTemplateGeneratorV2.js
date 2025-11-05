import XlsxPopulate from 'xlsx-populate';
import { saveAs } from 'file-saver';

/**
 * 📊 GENERATOR TEMPLATE EXCEL PREMIUM V2.0 - CU STYLING REAL
 *
 * Folosește xlsx-populate pentru styling complet:
 * - Culori reale (backgrounds, fonts)
 * - Borders fine și elegante
 * - Freeze panes funcțional
 * - Font sizes și bold
 * - Merge cells
 * - Row heights și column widths
 */

// 🏠 OPȚIUNI PREDEFINITE
const APARTMENT_TYPES = [
  'Garsoniera',
  '2 camere',
  '3 camere',
  '4 camere',
  '5 camere',
  'Penthouse'
];

const HEATING_SOURCES = [
  'Termoficare',
  'Centrală proprie',
  'Centrală bloc',
  'Debranșat'
];

/**
 * 📖 GENEREAZĂ SHEET CU INSTRUCȚIUNI
 */
const generateInstructionsSheet = async (workbook, associationName) => {
  const sheet = workbook.addSheet('📖 INSTRUCȚIUNI');

  // === HEADER PREMIUM ===
  sheet.cell('A2').value('🏢  TEMPLATE IMPORT APARTAMENTE')
    .style({
      fontSize: 18,
      bold: true,
      fontColor: 'FFFFFF',
      fill: '2563EB',
      horizontalAlignment: 'center',
      verticalAlignment: 'center'
    });
  sheet.range('A2:G2').merged(true);
  sheet.row(2).height(35);

  sheet.cell('A3').value(associationName.toUpperCase())
    .style({
      fontSize: 14,
      bold: true,
      fontColor: '1F2937',
      fill: 'DBEAFE',
      horizontalAlignment: 'center',
      verticalAlignment: 'center'
    });
  sheet.range('A3:G3').merged(true);
  sheet.row(3).height(25);

  // Separator
  sheet.cell('A5').value('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .style({ fontColor: 'E5E7EB', horizontalAlignment: 'center' });
  sheet.range('A5:G5').merged(true);

  // === GHID RAPID ===
  sheet.cell('A7').value('   GHID RAPID DE UTILIZARE')
    .style({
      fontSize: 13,
      bold: true,
      fontColor: '2563EB',
      fill: 'F3F4F6'
    });
  sheet.range('A7:G7').merged(true);
  sheet.row(7).height(25);

  sheet.cell('A9').value('   Acest template vă permite să importați apartamentele în mod rapid și simplu.')
    .style({ fontSize: 11, fontColor: '6B7280', italic: true, wrapText: true });
  sheet.range('A9:G9').merged(true);

  sheet.cell('A10').value('   Puteți copia datele dvs. existente direct în sheet-urile corespunzătoare fiecărei scări.')
    .style({ fontSize: 11, fontColor: '6B7280', italic: true, wrapText: true });
  sheet.range('A10:G10').merged(true);

  // Separator
  sheet.cell('A12').value('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .style({ fontColor: 'E5E7EB', horizontalAlignment: 'center' });
  sheet.range('A12:G12').merged(true);

  // === PAȘI ===
  sheet.cell('A15').value('   PAȘI DE URMAT')
    .style({
      fontSize: 13,
      bold: true,
      fontColor: '2563EB',
      fill: 'F3F4F6'
    });
  sheet.range('A15:G15').merged(true);
  sheet.row(15).height(25);

  const steps = [
    '   ① Selectați sheet-ul corespunzător scării pe care doriți să o completați',
    '   ② Copiați datele din Excel-ul dvs. și inserați-le începând cu rândul marcat "Date apartamente"',
    '   ③ Asigurați-vă că cele 3 câmpuri obligatorii sunt completate pentru fiecare apartament',
    '   ④ Salvați fișierul și încărcați-l în aplicație prin butonul "Import Excel"'
  ];

  steps.forEach((step, i) => {
    sheet.cell(`A${17 + i}`).value(step)
      .style({
        fontSize: 11,
        fontColor: '1F2937',
        fill: 'DBEAFE',
        leftBorder: { style: 'thick', color: '2563EB' },
        wrapText: true
      });
    sheet.range(`A${17 + i}:G${17 + i}`).merged(true);
  });

  // === STRUCTURA COLOANELOR ===
  sheet.cell('A23').value('   STRUCTURA COLOANELOR')
    .style({
      fontSize: 13,
      bold: true,
      fontColor: '2563EB',
      fill: 'F3F4F6'
    });
  sheet.range('A23:G23').merged(true);
  sheet.row(23).height(25);

  // Tabel header
  const tableData = [
    ['Coloană', 'Obligatoriu', 'Descriere și Format'],
    ['Nr_Apt*', 'DA', 'Număr apartament (ex: 1, 2, 24)'],
    ['Proprietar*', 'DA', 'Nume complet (ex: Ion Popescu)'],
    ['Nr_Persoane*', 'DA', 'Număr persoane (minim 1)'],
    ['Tip_Apartament', 'NU', 'Garsoniera, 2 camere, 3 camere, etc.'],
    ['Suprafata_mp', 'NU', 'Suprafață în m² (ex: 65.5)'],
    ['Sursa_Incalzire', 'NU', 'Termoficare, Centrală proprie, etc.'],
    ['Restanta_RON', 'NU', 'Restanțe anterioare în lei (ex: 150.00)'],
    ['Penalitati_RON', 'NU', 'Penalități în lei (ex: 25.50)']
  ];

  let rowIdx = 26;
  tableData.forEach((row, i) => {
    sheet.cell(`A${rowIdx}`).value(row[0]);
    sheet.cell(`B${rowIdx}`).value(row[1]);
    sheet.cell(`C${rowIdx}`).value(row[2]);

    if (i === 0) {
      // Header row
      sheet.range(`A${rowIdx}:C${rowIdx}`).style({
        bold: true,
        fontSize: 10,
        fontColor: 'FFFFFF',
        fill: '3B82F6',
        horizontalAlignment: 'center',
        border: true
      });
    } else {
      // Data rows
      sheet.range(`A${rowIdx}:C${rowIdx}`).style({
        fontSize: 10,
        fontColor: '374151',
        fill: i % 2 === 0 ? 'F9FAFB' : 'FFFFFF',
        border: { style: 'thin', color: 'E5E7EB' }
      });
    }
    rowIdx++;
  });

  // === OPȚIUNI DISPONIBILE ===
  sheet.cell('A38').value('   OPȚIUNI DISPONIBILE')
    .style({
      fontSize: 13,
      bold: true,
      fontColor: '2563EB',
      fill: 'F3F4F6'
    });
  sheet.range('A38:G38').merged(true);

  sheet.cell('A40').value('   Pentru Tip_Apartament:     ' + APARTMENT_TYPES.join('  •  '))
    .style({
      fontSize: 10,
      fontColor: '1F2937',
      fill: 'FEF3C7'
    });
  sheet.range('A40:G40').merged(true);

  sheet.cell('A41').value('   Pentru Sursa_Incalzire:    ' + HEATING_SOURCES.join('  •  '))
    .style({
      fontSize: 10,
      fontColor: '1F2937',
      fill: 'FEF3C7'
    });
  sheet.range('A41:G41').merged(true);

  // === IMPORTANT ===
  sheet.cell('A45').value('   ⚠️  IMPORTANT DE REȚINUT')
    .style({
      fontSize: 12,
      bold: true,
      fontColor: 'DC2626',
      fill: 'FEE2E2'
    });
  sheet.range('A45:G45').merged(true);

  const warnings = [
    '   •  Nu modificați antetele coloanelor (rândul cu Nr_Apt*, Proprietar*, etc.)',
    '   •  Nu ștergeți sheet-urile existente',
    '   •  Numerele de apartamente trebuie să fie unice în cadrul aceleiași scări',
    '   •  Pentru opțiuni (Tip_Apartament, Sursa_Incalzire) copiați exact textul din lista de mai sus'
  ];

  warnings.forEach((warn, i) => {
    sheet.cell(`A${47 + i}`).value(warn)
      .style({
        fontSize: 10,
        fontColor: '7C2D12',
        fill: 'FEF3C7',
        wrapText: true
      });
    sheet.range(`A${47 + i}:G${47 + i}`).merged(true);
  });

  // === FOOTER ===
  sheet.cell('A53').value('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .style({ fontColor: 'E5E7EB', horizontalAlignment: 'center' });
  sheet.range('A53:G53').merged(true);

  sheet.cell('A55').value('   SUPORT TEHNIC')
    .style({ fontSize: 11, fontColor: '6B7280', italic: true });
  sheet.range('A55:G55').merged(true);

  sheet.cell('A56').value('   Pentru asistență, contactați administratorul sistemului.')
    .style({ fontSize: 11, fontColor: '6B7280', italic: true });
  sheet.range('A56:G56').merged(true);

  sheet.cell('A58').value('   Succes la completare! 🎯')
    .style({ fontSize: 12, bold: true, fontColor: '059669' });
  sheet.range('A58:G58').merged(true);

  // Column widths
  sheet.column('A').width(120);
  ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => sheet.column(col).width(2));

  return sheet;
};

/**
 * 🏗️ GENEREAZĂ SHEET PENTRU O SCARĂ
 */
const generateStairSheet = async (workbook, stair, block) => {
  const blockName = block.name.substring(0, 10);
  const stairName = stair.name.substring(0, 10);
  const sheetName = `${blockName}_${stairName}`.substring(0, 31);

  const sheet = workbook.addSheet(sheetName);

  // === TITLE ===
  sheet.cell('A2').value(`${block.name} - ${stair.name}`)
    .style({
      fontSize: 16,
      bold: true,
      fontColor: 'FFFFFF',
      fill: '2563EB',
      horizontalAlignment: 'center',
      verticalAlignment: 'center',
      bottomBorder: { style: 'medium', color: '1E40AF' }
    });
  sheet.range('A2:H2').merged(true);
  sheet.row(2).height(35);

  // === COLUMN HEADERS ===
  const headers = [
    '🏠 Nr_Apt*',
    '👤 Proprietar*',
    '👥 Nr_Persoane*',
    '🔑 Tip_Apartament',
    '📐 Suprafata_mp',
    '🔥 Sursa_Incalzire',
    '💰 Restanta_RON',
    '⚠️ Penalitati_RON'
  ];

  headers.forEach((header, i) => {
    const col = String.fromCharCode(65 + i); // A, B, C...
    sheet.cell(`${col}5`).value(header)
      .style({
        fontSize: 11,
        bold: true,
        fontColor: 'FFFFFF',
        fill: '3B82F6',
        horizontalAlignment: 'center',
        verticalAlignment: 'center',
        wrapText: true,
        border: {
          top: { style: 'thin', color: '1E40AF' },
          bottom: { style: 'thin', color: '1E40AF' },
          left: { style: 'thin', color: '60A5FA' },
          right: { style: 'thin', color: '60A5FA' }
        }
      });
  });
  sheet.row(5).height(30);

  // === EXPLANATIONS ===
  const explanations = [
    'întreg pozitiv',
    'nume complet',
    'min. 1',
    'opțional',
    'm² (opțional)',
    'opțional',
    'lei (opțional)',
    'lei (opțional)'
  ];

  explanations.forEach((expl, i) => {
    const col = String.fromCharCode(65 + i);
    sheet.cell(`${col}6`).value(expl)
      .style({
        fontSize: 9,
        italic: true,
        fontColor: '6B7280',
        fill: 'F3F4F6',
        horizontalAlignment: 'center',
        bottomBorder: { style: 'thin', color: 'E5E7EB' }
      });
  });
  sheet.row(6).height(18);

  // === EXAMPLE SECTION ===
  sheet.cell('A8').value('📋 EXEMPLU DE COMPLETARE')
    .style({
      fontSize: 11,
      bold: true,
      fontColor: '047857',
      fill: 'D1FAE5',
      horizontalAlignment: 'center',
      topBorder: { style: 'thin', color: '10B981' },
      bottomBorder: { style: 'thin', color: '10B981' }
    });
  sheet.range('A8:H8').merged(true);
  sheet.row(8).height(25);

  // Example data
  const exampleData = [1, 'Ion Popescu', 3, '3 camere', 65.5, 'Termoficare', 150.00, 25.50];
  exampleData.forEach((val, i) => {
    const col = String.fromCharCode(65 + i);
    sheet.cell(`${col}9`).value(val)
      .style({
        fontSize: 10,
        fontColor: '065F46',
        fill: 'ECFDF5',
        horizontalAlignment: 'center',
        border: { style: 'thin', color: 'A7F3D0' }
      });
  });
  sheet.row(9).height(22);

  // === REFERENCE SECTION ===
  sheet.cell('A11').value('📚 REFERINȚĂ RAPIDĂ - Opțiuni disponibile pentru copiere:')
    .style({
      fontSize: 11,
      bold: true,
      fontColor: '92400E',
      fill: 'FEF3C7',
      topBorder: { style: 'thin', color: 'F59E0B' },
      bottomBorder: { style: 'thin', color: 'F59E0B' }
    });
  sheet.range('A11:H11').merged(true);
  sheet.row(11).height(25);

  sheet.cell('A13').value('Tip_Apartament:')
    .style({ fontSize: 10, bold: true, fontColor: '1F2937', fill: 'FFFBEB' });
  sheet.cell('B13').value(APARTMENT_TYPES.join('  •  '))
    .style({ fontSize: 9, fontColor: '4B5563', fill: 'FFFBEB' });
  sheet.range('B13:H13').merged(true);

  sheet.cell('A14').value('Sursa_Incalzire:')
    .style({ fontSize: 10, bold: true, fontColor: '1F2937', fill: 'FFFBEB' });
  sheet.cell('B14').value(HEATING_SOURCES.join('  •  '))
    .style({ fontSize: 9, fontColor: '4B5563', fill: 'FFFBEB' });
  sheet.range('B14:H14').merged(true);

  // === DATA ENTRY MARKER ===
  sheet.cell('A17').value('✏️ DATE APARTAMENTE - Copiați datele începând de aici ⬇️')
    .style({
      fontSize: 12,
      bold: true,
      fontColor: 'FFFFFF',
      fill: '6366F1',
      horizontalAlignment: 'center',
      topBorder: { style: 'medium', color: '4F46E5' },
      bottomBorder: { style: 'medium', color: '4F46E5' }
    });
  sheet.range('A17:H17').merged(true);
  sheet.row(17).height(28);

  // === DATA ENTRY ROWS (35 rows with alternating colors) ===
  for (let row = 18; row <= 52; row++) {
    for (let col = 0; col < 8; col++) {
      const colLetter = String.fromCharCode(65 + col);
      sheet.cell(`${colLetter}${row}`)
        .style({
          fill: row % 2 === 0 ? 'FFFFFF' : 'F9FAFB',
          horizontalAlignment: col === 1 ? 'left' : 'center',
          border: { style: 'hair', color: 'E5E7EB' }
        });
    }
  }

  // === COLUMN WIDTHS ===
  sheet.column('A').width(12);
  sheet.column('B').width(28);
  sheet.column('C').width(14);
  sheet.column('D').width(18);
  sheet.column('E').width(15);
  sheet.column('F').width(20);
  sheet.column('G').width(15);
  sheet.column('H').width(15);

  // === FREEZE PANES ===
  sheet.freezePanes(6, 0);

  return sheet;
};

/**
 * 📊 FUNCȚIA PRINCIPALĂ DE GENERARE TEMPLATE
 */
export const generateExcelTemplate = async (association, blocks, stairs) => {
  try {
    // Verificare date
    if (!association || !blocks || !stairs) {
      throw new Error('Date incomplete pentru generarea template-ului');
    }

    const associationBlocks = blocks.filter(block => block.associationId === association.id);
    const associationStairs = stairs.filter(stair =>
      associationBlocks.some(block => block.id === stair.blockId)
    );

    if (associationBlocks.length === 0) {
      throw new Error('Nu există blocuri configurate pentru această asociație');
    }

    if (associationStairs.length === 0) {
      throw new Error('Nu există scări configurate pentru această asociație');
    }

    // Creează workbook nou
    const workbook = await XlsxPopulate.fromBlankAsync();

    // Șterge sheet-ul default
    workbook.deleteSheet(0);

    // === METADATA ===
    workbook.properties({
      title: `Template Import Apartamente - ${association.name}`,
      subject: 'Template pentru importul apartamentelor în BlocApp',
      author: 'BlocApp - Sistem Management Asociații',
      company: 'BlocApp',
      category: 'Import Date',
      keywords: 'apartamente, import, template, asociație, bloc',
      description: `Template generat pentru importul apartamentelor în asociația ${association.name}. Include ${associationBlocks.length} bloc(uri) și ${associationStairs.length} scară(ri).`,
      created: new Date(),
      modified: new Date()
    });

    // Generează sheet-ul cu instrucțiuni
    await generateInstructionsSheet(workbook, association.name);

    // Generează sheet pentru fiecare scară
    let stairCount = 0;
    for (const stair of associationStairs) {
      const block = associationBlocks.find(b => b.id === stair.blockId);
      if (block) {
        await generateStairSheet(workbook, stair, block);
        stairCount++;
      }
    }

    // Generează fișierul
    const fileName = `Template_Apartamente_${association.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Convertește la blob și descarcă
    const blob = await workbook.outputAsync();
    saveAs(blob, fileName);

    return {
      success: true,
      fileName,
      stats: {
        associatie: association.name,
        blocuri: associationBlocks.length,
        scari: stairCount
      }
    };

  } catch (error) {
    console.error('❌ Eroare la generarea template-ului Excel:', error);
    throw error;
  }
};

/**
 * 📈 FUNCȚIE HELPER PENTRU STATISTICI
 */
export const getTemplateStats = (association, blocks, stairs) => {
  if (!association || !blocks || !stairs) return null;

  const associationBlocks = blocks.filter(block => block.associationId === association.id);
  const associationStairs = stairs.filter(stair =>
    associationBlocks.some(block => block.id === stair.blockId)
  );

  return {
    associationName: association.name,
    blocksCount: associationBlocks.length,
    stairsCount: associationStairs.length,
    canGenerate: associationBlocks.length > 0 && associationStairs.length > 0
  };
};
