import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * 📊 GENERATOR TEMPLATE EXCEL PREMIUM CU EXCELJS
 *
 * ExcelJS suportă complet styling în browser:
 * ✅ Culori (fill, font colors)
 * ✅ Fonts (bold, italic, sizes)
 * ✅ Borders (styles, colors)
 * ✅ Alignment
 * ✅ Freeze panes
 * ✅ Merge cells
 * ✅ Row heights & column widths
 */

const APARTMENT_TYPES = ['Garsoniera', '2 camere', '3 camere', '4 camere', '5 camere', 'Penthouse'];
const HEATING_SOURCES = ['Termoficare', 'Centrală proprie', 'Centrală bloc', 'Debranșat'];

/**
 * 🖼️ Helper: descarcă logo-ul BlocApp și îl atașează la workbook
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
 * 📖 GENEREAZĂ SHEET CU INSTRUCȚIUNI
 */
const generateInstructionsSheet = (workbook, associationName, logoImageId) => {
  const sheet = workbook.addWorksheet('📖 INSTRUCȚIUNI');

  // Logo sus (dacă e disponibil) - ancorat la row 0, înălțime ajustată
  if (logoImageId !== null && logoImageId !== undefined) {
    sheet.addImage(logoImageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 140, height: 56 }
    });
    sheet.getRow(1).height = 48; // Rezervă spațiu pentru logo (48 pts ≈ 64 px)
  }

  // === HEADER PREMIUM ===
  sheet.mergeCells('A2:G2');
  const headerCell = sheet.getCell('A2');
  headerCell.value = '🏢  TEMPLATE IMPORT APARTAMENTE';
  headerCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };  // Albastru mai închis
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 35;

  sheet.mergeCells('A3:G3');
  const subHeaderCell = sheet.getCell('A3');
  subHeaderCell.value = associationName.toUpperCase();
  subHeaderCell.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } };
  subHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF93C5FD' } };  // Albastru mai saturat
  subHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 25;

  // === GHID RAPID ===
  sheet.mergeCells('A5:G5');
  const guideCell = sheet.getCell('A5');
  guideCell.value = '   GHID RAPID DE UTILIZARE';
  guideCell.font = { size: 13, bold: true, color: { argb: 'FF2563EB' } };
  guideCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  sheet.getRow(5).height = 25;

  sheet.mergeCells('A7:G7');
  sheet.getCell('A7').value = '   Acest template vă permite să importați apartamentele în mod rapid și simplu.';
  sheet.getCell('A7').font = { size: 11, italic: true, color: { argb: 'FF6B7280' } };

  sheet.mergeCells('A8:G8');
  sheet.getCell('A8').value = '   Puteți copia datele dvs. existente direct în sheet-urile corespunzătoare fiecărei scări.';
  sheet.getCell('A8').font = { size: 11, italic: true, color: { argb: 'FF6B7280' } };

  // === PAȘI ===
  sheet.mergeCells('A11:G11');
  const stepsHeader = sheet.getCell('A11');
  stepsHeader.value = '   PAȘI DE URMAT';
  stepsHeader.font = { size: 13, bold: true, color: { argb: 'FF2563EB' } };
  stepsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  sheet.getRow(11).height = 25;

  const steps = [
    '   ① Selectați sheet-ul corespunzător scării pe care doriți să o completați',
    '   ② Copiați datele din Excel-ul dvs. și inserați-le începând cu rândul marcat "Date apartamente"',
    '   ③ Asigurați-vă că cele 3 câmpuri obligatorii sunt completate pentru fiecare apartament',
    '   ④ Salvați fișierul și încărcați-l în aplicație prin butonul "Import Excel"'
  ];

  steps.forEach((step, i) => {
    const row = 13 + i;
    sheet.mergeCells(`A${row}:G${row}`);
    const stepCell = sheet.getCell(`A${row}`);
    stepCell.value = step;
    stepCell.font = { size: 11, color: { argb: 'FF1F2937' } };
    stepCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFDBFE' } };  // Albastru mai vizibil
    stepCell.border = { left: { style: 'thick', color: { argb: 'FF1E40AF' } } };
  });

  // === STRUCTURA COLOANELOR ===
  sheet.mergeCells('A18:C18');
  const structHeader = sheet.getCell('A18');
  structHeader.value = '   STRUCTURA COLOANELOR';
  structHeader.font = { size: 13, bold: true, color: { argb: 'FF2563EB' } };
  structHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  sheet.getRow(18).height = 25;

  // Tabel
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

  tableData.forEach((rowData, i) => {
    const row = 20 + i;
    sheet.getRow(row).values = rowData;

    // Styling pentru coloanele A, B
    ['A', 'B'].forEach((col, colIdx) => {
      const cell = sheet.getCell(`${col}${row}`);
      if (i === 0) {
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.font = { size: 10, color: { argb: 'FF1F2937' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF3F4F6' : 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'left' : 'center' };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        right: { style: 'thin', color: { argb: 'FF9CA3AF' } }
      };
    });

    // Coloana C merge până la G pentru TOATE rândurile (header și date)
    sheet.mergeCells(`C${row}:G${row}`);

    const cellC = sheet.getCell(`C${row}`);
    if (i === 0) {
      cellC.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cellC.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cellC.font = { size: 10, color: { argb: 'FF1F2937' } };
      cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF3F4F6' : 'FFFFFFFF' } };
      cellC.alignment = { vertical: 'middle', horizontal: 'left' };
    }
    cellC.border = {
      top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      right: { style: 'thin', color: { argb: 'FF9CA3AF' } }
    };
  });

  // Setează lățimi pentru coloanele tabelului
  sheet.getColumn('A').width = 24;  // Mai larg pentru "Tip_Apartament:" și alte texte
  sheet.getColumn('B').width = 17;
  sheet.getColumn('C').width = 55;
  // Coloanele D-G rămân cu width default pentru completare vizuală

  // === PROTECȚIE SHEET ===
  // Sheet-ul de instrucțiuni este complet protejat (read-only)
  sheet.protect('', {
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
    pivotTables: false
  });

  // === OPȚIUNI ===
  sheet.mergeCells('A31:G31');
  sheet.getCell('A31').value = '   OPȚIUNI DISPONIBILE';
  sheet.getCell('A31').font = { size: 13, bold: true, color: { argb: 'FF2563EB' } };
  sheet.getCell('A31').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

  sheet.mergeCells('A32:G32');
  sheet.getCell('A32').value = '   Pentru Tip_Apartament:     ' + APARTMENT_TYPES.join('  •  ');
  sheet.getCell('A32').font = { size: 10, color: { argb: 'FF92400E' } };
  sheet.getCell('A32').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };

  sheet.mergeCells('A33:G33');
  sheet.getCell('A33').value = '   Pentru Sursa_Incalzire:    ' + HEATING_SOURCES.join('  •  ');
  sheet.getCell('A33').font = { size: 10, color: { argb: 'FF92400E' } };
  sheet.getCell('A33').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };

  // === IMPORTANT ===
  sheet.mergeCells('A36:G36');
  sheet.getCell('A36').value = '   ⚠️  IMPORTANT DE REȚINUT';
  sheet.getCell('A36').font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A36').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

  const warnings = [
    '   •  Nu modificați antetele coloanelor (rândul cu Nr_Apt*, Proprietar*, etc.)',
    '   •  Nu ștergeți sheet-urile existente',
    '   •  Numerele de apartamente trebuie să fie unice în cadrul aceleiași scări',
    '   •  Pentru opțiuni (Tip_Apartament, Sursa_Incalzire) copiați exact textul din lista de mai sus'
  ];

  warnings.forEach((warn, i) => {
    const row = 37 + i;
    sheet.mergeCells(`A${row}:G${row}`);
    sheet.getCell(`A${row}`).value = warn;
    sheet.getCell(`A${row}`).font = { size: 10, color: { argb: 'FF7C2D12' } };
    sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  });

  // === FOOTER ===
  sheet.mergeCells('A43:G43');
  sheet.getCell('A43').value = '   SUPORT TEHNIC: Pentru asistență, contactați administratorul sistemului. Succes la completare! 🎯';
  sheet.getCell('A43').font = { size: 10, italic: true, color: { argb: 'FF6B7280' } };

  // Column widths - doar pentru tabel, restul se adaptează automat
  // (lățimile pentru A, B, C sunt deja setate la liniile 136-138)
};

/**
 * 🏗️ GENEREAZĂ SHEET PENTRU O SCARĂ - LAYOUT OPTIMIZAT
 */
const generateStairSheet = (workbook, stair, block, logoImageId) => {
  const sheetName = `${block.name.substring(0, 10)}_${stair.name.substring(0, 10)}`.substring(0, 31);
  const sheet = workbook.addWorksheet(sheetName);

  // Logo sus (dacă e disponibil)
  if (logoImageId !== null && logoImageId !== undefined) {
    sheet.addImage(logoImageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 140, height: 56 }
    });
    sheet.getRow(1).height = 48;
  }

  // === TITLE ===
  sheet.mergeCells('A2:H2');
  const titleCell = sheet.getCell('A2');
  titleCell.value = `${block.name} - ${stair.name}`;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
  sheet.getRow(2).height = 35;

  // === ZONA 1: EXEMPLU ȘI REFERINȚĂ ===

  // Label: EXEMPLU DE COMPLETARE
  sheet.mergeCells('A4:H4');
  const exampleLabel = sheet.getCell('A4');
  exampleLabel.value = '📋 EXEMPLU DE COMPLETARE';
  exampleLabel.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  exampleLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
  exampleLabel.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(4).height = 25;

  // Headers pentru exemplu
  const headers = [
    '🏠 Nr_Apt*', '👤 Proprietar*', '👥 Nr_Persoane*', '🔑 Tip_Apartament',
    '📐 Suprafata_mp', '🔥 Sursa_Incalzire', '💰 Restanta_RON', '⚠️ Penalitati_RON'
  ];

  sheet.getRow(5).values = headers;
  sheet.getRow(5).height = 28;

  headers.forEach((_, i) => {
    const cell = sheet.getCell(5, i + 1);
    cell.font = { size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } }
    };
  });

  // Example data
  const exampleData = [1, 'Ion Popescu', 3, '3 camere', 65.5, 'Termoficare', 150.00, 25.50];
  sheet.getRow(6).values = exampleData;
  sheet.getRow(6).height = 22;

  exampleData.forEach((_, i) => {
    const cell = sheet.getCell(6, i + 1);
    cell.font = { size: 10, color: { argb: 'FF065F46' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF6EE7B7' } },
      bottom: { style: 'thin', color: { argb: 'FF6EE7B7' } },
      left: { style: 'thin', color: { argb: 'FF6EE7B7' } },
      right: { style: 'thin', color: { argb: 'FF6EE7B7' } }
    };
  });

  // === REFERINȚĂ - OPȚIUNI PENTRU COPIERE ===
  sheet.mergeCells('A8:H8');
  const refLabel = sheet.getCell('A8');
  refLabel.value = '📚 REFERINȚĂ - Opțiuni disponibile (copiați direct din celule):';
  refLabel.font = { size: 11, bold: true, color: { argb: 'FF92400E' } };
  refLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  refLabel.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(8).height = 22;

  // Tip_Apartament - fiecare valoare în celulă separată
  sheet.getCell('A9').value = 'Tip_Apartament:';
  sheet.getCell('A9').font = { size: 10, bold: true, color: { argb: 'FF92400E' } };
  sheet.getCell('A9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  sheet.getCell('A9').alignment = { horizontal: 'left', vertical: 'middle' };

  APARTMENT_TYPES.forEach((type, i) => {
    const cell = sheet.getCell(9, i + 2);  // B9, C9, D9, etc.
    cell.value = type;
    cell.font = { size: 10, color: { argb: 'FF78350F' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFBBF24' } },
      bottom: { style: 'thin', color: { argb: 'FFFBBF24' } },
      left: { style: 'thin', color: { argb: 'FFFBBF24' } },
      right: { style: 'thin', color: { argb: 'FFFBBF24' } }
    };
  });

  // Sursa_Incalzire - fiecare valoare în celulă separată
  sheet.getCell('A10').value = 'Sursa_Incalzire:';
  sheet.getCell('A10').font = { size: 10, bold: true, color: { argb: 'FF92400E' } };
  sheet.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  sheet.getCell('A10').alignment = { horizontal: 'left', vertical: 'middle' };

  HEATING_SOURCES.forEach((source, i) => {
    const cell = sheet.getCell(10, i + 2);  // B10, C10, D10, E10
    cell.value = source;
    cell.font = { size: 10, color: { argb: 'FF78350F' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFBBF24' } },
      bottom: { style: 'thin', color: { argb: 'FFFBBF24' } },
      left: { style: 'thin', color: { argb: 'FFFBBF24' } },
      right: { style: 'thin', color: { argb: 'FFFBBF24' } }
    };
  });

  // === ZONA 2: DATE APARTAMENTE ===

  // Data marker
  sheet.mergeCells('A12:H12');
  const dataMarker = sheet.getCell('A12');
  dataMarker.value = '✏️ DATE APARTAMENTE - Completați sau copiați datele de mai jos';
  dataMarker.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  dataMarker.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  dataMarker.alignment = { horizontal: 'center', vertical: 'middle' };
  dataMarker.border = {
    top: { style: 'medium', color: { argb: 'FF3730A3' } },
    bottom: { style: 'medium', color: { argb: 'FF3730A3' } }
  };
  sheet.getRow(12).height = 28;

  // Headers pentru date (row 13) - FĂRĂ iconițe pentru compatibilitate cu parser-ul!
  const dataHeaders = [
    'Nr_Apt*', 'Proprietar*', 'Nr_Persoane*', 'Tip_Apartament',
    'Suprafata_mp', 'Sursa_Incalzire', 'Restanta_RON', 'Penalitati_RON'
  ];
  sheet.getRow(13).values = dataHeaders;
  sheet.getRow(13).height = 28;

  dataHeaders.forEach((_, i) => {
    const cell = sheet.getCell(13, i + 1);
    cell.font = { size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } }
    };
  });

  // Row 14: MARKER pentru parser (✏️ ÎNCEPE COMPLETAREA) + explanations
  // Parser-ul caută "✏️" în coloana A DUPĂ header, deci punem marcajul aici
  sheet.getCell('A14').value = '✏️ ÎNCEPE COMPLETAREA';
  sheet.getCell('A14').font = { size: 8, italic: true, color: { argb: 'FF6B7280' } };
  sheet.getCell('A14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  sheet.getCell('A14').alignment = { horizontal: 'left', vertical: 'middle' };

  // Explanations în restul row 14 (columns B-H)
  const explanations = ['nume complet', 'min. 1', 'opțional', 'm² (opțional)', 'opțional', 'lei (opțional)', 'lei (opțional)'];
  explanations.forEach((expl, i) => {
    const cell = sheet.getCell(14, i + 2); // B14, C14, D14, etc.
    cell.value = expl;
    cell.font = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } } };
  });

  sheet.getRow(14).height = 18;

  // Data rows (starting from row 15) - EDITABILE
  for (let row = 15; row <= 50; row++) {
    for (let col = 1; col <= 8; col++) {
      const cell = sheet.getCell(row, col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
      cell.alignment = { horizontal: col === 2 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        left: { style: 'hair', color: { argb: 'FFCBD5E1' } },
        right: { style: 'hair', color: { argb: 'FFCBD5E1' } }
      };
      // Setează celulele ca EDITABILE (protection.locked = false)
      cell.protection = { locked: false };
    }
  }

  // Column widths - mai largi pentru ca textul cu iconițe să încapă pe un singur rând
  sheet.getColumn(1).width = 15;   // 🏠 Nr_Apt* și Tip_Apartament:/Sursa_Incalzire:
  sheet.getColumn(2).width = 30;   // 👤 Proprietar*
  sheet.getColumn(3).width = 17;   // 👥 Nr_Persoane*
  sheet.getColumn(4).width = 20;   // 🔑 Tip_Apartament
  sheet.getColumn(5).width = 17;   // 📐 Suprafata_mp
  sheet.getColumn(6).width = 20;   // 🔥 Sursa_Incalzire
  sheet.getColumn(7).width = 17;   // 💰 Restanta_RON
  sheet.getColumn(8).width = 18;   // ⚠️ Penalitati_RON

  // === PROTECȚIE SHEET ===
  // Protejează sheet-ul: rows 1-14 sunt blocate, rows 15+ sunt editabile
  // Utilizatorii pot copia din zona de referință (rows 9-10) chiar dacă e blocată
  sheet.protect('', {
    selectLockedCells: true,      // Permite selectarea celulelor blocate (pentru copiere)
    selectUnlockedCells: true,    // Permite selectarea celulelor deblocate
    formatCells: false,           // Nu permite formatare
    formatColumns: false,
    formatRows: false,
    insertRows: false,            // Nu permite inserare rânduri
    insertColumns: false,
    deleteRows: false,            // Nu permite ștergere rânduri
    deleteColumns: false,
    sort: false,
    autoFilter: false,
    pivotTables: false
  });

  // === FREEZE PANES (după row 14 - după header-ul zonei de date) ===
  sheet.views = [{ state: 'frozen', ySplit: 14 }];
};

/**
 * 📊 FUNCȚIA PRINCIPALĂ
 */
export const generateExcelTemplate = async (association, blocks, stairs) => {
  try {
    if (!association || !blocks || !stairs) {
      throw new Error('Date incomplete pentru generarea template-ului');
    }

    const associationBlocks = blocks.filter(block => block.associationId === association.id);
    const associationStairs = stairs.filter(stair =>
      associationBlocks.some(block => block.id === stair.blockId)
    );

    if (associationBlocks.length === 0) throw new Error('Nu există blocuri configurate');
    if (associationStairs.length === 0) throw new Error('Nu există scări configurate');

    const workbook = new ExcelJS.Workbook();

    // Metadata
    workbook.creator = 'BlocApp';
    workbook.lastModifiedBy = 'BlocApp';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.title = `Template Import Apartamente - ${association.name}`;
    workbook.subject = 'Template pentru importul apartamentelor';
    workbook.company = 'BlocApp';
    workbook.category = 'Import Date';
    workbook.keywords = 'apartamente import template';
    workbook.description = `Template generat pentru ${association.name}. Include ${associationBlocks.length} bloc(uri) și ${associationStairs.length} scară(ri).`;

    // Încarcă logo-ul o singură dată pentru tot workbook-ul
    const logoImageId = await loadBlocAppLogo(workbook);

    // Generate sheets
    generateInstructionsSheet(workbook, association.name, logoImageId);

    let stairCount = 0;
    for (const stair of associationStairs) {
      const block = associationBlocks.find(b => b.id === stair.blockId);
      if (block) {
        generateStairSheet(workbook, stair, block, logoImageId);
        stairCount++;
      }
    }

    // Generate file
    const fileName = `Template_Apartamente_${association.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);

    return {
      success: true,
      fileName,
      stats: { associatie: association.name, blocuri: associationBlocks.length, scari: stairCount }
    };

  } catch (error) {
    console.error('❌ Eroare la generarea template-ului:', error);
    throw error;
  }
};

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
