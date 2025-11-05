import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * 📊 GENERATOR TEMPLATE EXCEL PREMIUM PENTRU APARTAMENTE - V2.0
 *
 * Generează un fișier Excel profesional cu design modern:
 *
 * ✨ FEATURES:
 * - Sheet "Instrucțiuni" cu design premium și layout modern
 * - Sheet pentru fiecare scară cu styling profesional
 * - Color scheme modern (albastru, verde mentă, galben pale)
 * - Headers cu icoane și explicații clare
 * - Freeze panes pentru vizibilitate permanentă a header-ului
 * - Alternating row colors pentru citire ușoară
 * - Borders fine și subtile
 * - Metadata Excel completă (autor, descriere, proprietăți custom)
 * - Optimizat pentru copy-paste rapid de date existente
 * - Spațiu generos (35+ rânduri) pentru introducere date
 * - Compression activată pentru fișiere mai mici
 *
 * 🎨 DESIGN:
 * - Palette modernă: #2563EB, #3B82F6, #D1FAE5, #FEF3C7, #F9FAFB
 * - Typography: Hierarhie clară cu font-uri bold pentru titluri
 * - Visual separators: Linii Unicode elegante pentru separare secțiuni
 * - Example rows: Fundal verde mentă pentru vizibilitate
 * - Reference sections: Fundal galben pale pentru highlight
 */

// 🏠 OPȚIUNI PREDEFINITE PENTRU DROPDOWN-URI
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
 * 📖 GENEREAZĂ SHEET-UL CU INSTRUCȚIUNI - DESIGN PREMIUM
 */
const generateInstructionsSheet = (associationName) => {
  const data = [
    // === HEADER ZONE CU BRANDING ===
    [''],
    ['🏢  TEMPLATE IMPORT APARTAMENTE', '', '', '', '', '', ''],
    [associationName.toUpperCase(), '', '', '', '', '', ''],
    [''],

    // === QUICK START SECTION ===
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', ''],
    [''],
    ['   GHID RAPID DE UTILIZARE', '', '', '', '', '', ''],
    [''],
    ['   Acest template vă permite să importați apartamentele în mod rapid și simplu.', '', '', '', '', '', ''],
    ['   Puteți copia datele dvs. existente direct în sheet-urile corespunzătoare fiecărei scări.', '', '', '', '', '', ''],
    [''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', ''],
    [''],
    [''],

    // === PAȘI CU NUMEROTARE VIZUALĂ ===
    ['   PAȘI DE URMAT', '', '', '', '', '', ''],
    [''],
    ['   ① Selectați sheet-ul corespunzător scării pe care doriți să o completați', '', '', '', '', '', ''],
    ['   ② Copiați datele din Excel-ul dvs. și inserați-le începând cu rândul marcat "Date apartamente"', '', '', '', '', '', ''],
    ['   ③ Asigurați-vă că cele 3 câmpuri obligatorii sunt completate pentru fiecare apartament', '', '', '', '', '', ''],
    ['   ④ Salvați fișierul și încărcați-l în aplicație prin butonul "Import Excel"', '', '', '', '', '', ''],
    [''],
    [''],

    // === STRUCTURA DATELOR - TABEL ===
    ['   STRUCTURA COLOANELOR', '', '', '', '', '', ''],
    [''],
    ['   ┌─────────────────────────────────────────────────────────────────────────────────────────────┐', '', '', '', '', '', ''],
    ['   │  Coloană             │  Obligatoriu  │  Descriere și Format                             │', '', '', '', '', '', ''],
    ['   ├─────────────────────────────────────────────────────────────────────────────────────────────┤', '', '', '', '', '', ''],
    ['   │  Nr_Apt*            │      DA       │  Număr apartament (ex: 1, 2, 24)                 │', '', '', '', '', '', ''],
    ['   │  Proprietar*        │      DA       │  Nume complet (ex: Ion Popescu)                  │', '', '', '', '', '', ''],
    ['   │  Nr_Persoane*       │      DA       │  Număr persoane (minim 1)                        │', '', '', '', '', '', ''],
    ['   │  Tip_Apartament     │      NU       │  Garsoniera, 2 camere, 3 camere, etc.            │', '', '', '', '', '', ''],
    ['   │  Suprafata_mp       │      NU       │  Suprafață în m² (ex: 65.5)                      │', '', '', '', '', '', ''],
    ['   │  Sursa_Incalzire    │      NU       │  Termoficare, Centrală proprie, etc.             │', '', '', '', '', '', ''],
    ['   │  Restanta_RON       │      NU       │  Restanțe anterioare în lei (ex: 150.00)         │', '', '', '', '', '', ''],
    ['   │  Penalitati_RON     │      NU       │  Penalități în lei (ex: 25.50)                   │', '', '', '', '', '', ''],
    ['   └─────────────────────────────────────────────────────────────────────────────────────────────┘', '', '', '', '', '', ''],
    [''],
    [''],

    // === OPȚIUNI DISPONIBILE ===
    ['   OPȚIUNI DISPONIBILE', '', '', '', '', '', ''],
    [''],
    ['   Pentru Tip_Apartament:     ' + APARTMENT_TYPES.join('  •  '), '', '', '', '', '', ''],
    ['   Pentru Sursa_Incalzire:    ' + HEATING_SOURCES.join('  •  '), '', '', '', '', '', ''],
    [''],
    [''],

    // === REGULI IMPORTANTE - HIGHLIGHT ===
    ['   ⚠️  IMPORTANT DE REȚINUT', '', '', '', '', '', ''],
    [''],
    ['   •  Nu modificați antetele coloanelor (rândul cu Nr_Apt*, Proprietar*, etc.)', '', '', '', '', '', ''],
    ['   •  Nu ștergeți sheet-urile existente', '', '', '', '', '', ''],
    ['   •  Numerele de apartamente trebuie să fie unice în cadrul aceleiași scări', '', '', '', '', '', ''],
    ['   •  Pentru opțiuni (Tip_Apartament, Sursa_Incalzire) copiați exact textul din lista de mai sus', '', '', '', '', '', ''],
    [''],
    [''],

    // === FOOTER ===
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', ''],
    [''],
    ['   SUPORT TEHNIC', '', '', '', '', '', ''],
    ['   Pentru asistență, contactați administratorul sistemului.', '', '', '', '', '', ''],
    [''],
    ['   Succes la completare! 🎯', '', '', '', '', '', ''],
    ['']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // === SETARE LĂȚIMI COLOANE ===
  worksheet['!cols'] = [
    { width: 120 },  // Coloana A - foarte lată pentru conținut
    { width: 2 },    // Coloane auxiliare pentru layout
    { width: 2 },
    { width: 2 },
    { width: 2 },
    { width: 2 },
    { width: 2 }
  ];

  // === MERGE CELLS PENTRU HEADER ===
  worksheet['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },  // Header title
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },  // Association name
    { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },  // Separator
    { s: { r: 6, c: 0 }, e: { r: 6, c: 6 } },  // Quick start title
    { s: { r: 8, c: 0 }, e: { r: 8, c: 6 } },  // Description 1
    { s: { r: 9, c: 0 }, e: { r: 9, c: 6 } },  // Description 2
    { s: { r: 11, c: 0 }, e: { r: 11, c: 6 } }, // Separator
    { s: { r: 14, c: 0 }, e: { r: 14, c: 6 } }, // Steps title
    { s: { r: 16, c: 0 }, e: { r: 16, c: 6 } }, // Step 1
    { s: { r: 17, c: 0 }, e: { r: 17, c: 6 } }, // Step 2
    { s: { r: 18, c: 0 }, e: { r: 18, c: 6 } }, // Step 3
    { s: { r: 19, c: 0 }, e: { r: 19, c: 6 } }  // Step 4
  ];

  // === STILIZARE PREMIUM ===

  // Header principal (rândul 1-2)
  if (worksheet['A2']) {
    worksheet['A2'].s = {
      font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },  // Albastru modern
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  if (worksheet['A3']) {
    worksheet['A3'].s = {
      font: { bold: true, sz: 14, color: { rgb: "1F2937" } },
      fill: { fgColor: { rgb: "DBEAFE" } },  // Albastru ice
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  // Separators
  ['A5', 'A12'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { color: { rgb: "E5E7EB" } },
        alignment: { horizontal: "center" }
      };
    }
  });

  // Section titles (Quick Start, Steps, etc.)
  ['A7', 'A15', 'A23', 'A38', 'A48'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { bold: true, sz: 13, color: { rgb: "2563EB" } },
        fill: { fgColor: { rgb: "F3F4F6" } },
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
  });

  // Description text
  ['A9', 'A10'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { sz: 11, color: { rgb: "6B7280" }, italic: true },
        alignment: { horizontal: "left", vertical: "center", wrapText: true }
      };
    }
  });

  // Steps (numbered items)
  ['A17', 'A18', 'A19', 'A20'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { sz: 11, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "DBEAFE" } },  // Light blue background
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
        border: {
          left: { style: "thick", color: { rgb: "2563EB" } }
        }
      };
    }
  });

  // Table border
  if (worksheet['A24']) {
    worksheet['A24'].s = {
      font: { color: { rgb: "9CA3AF" } }
    };
  }

  // Table rows (25-33)
  for (let row = 24; row <= 32; row++) {
    const cellRef = `A${row + 1}`;
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        font: { sz: 10, color: { rgb: "374151" }, name: "Consolas" },
        fill: { fgColor: { rgb: row % 2 === 0 ? "F9FAFB" : "FFFFFF" } },
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
  }

  // Options section
  ['A40', 'A41'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { sz: 10, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "FEF3C7" } },  // Yellow pale
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
  });

  // Important section (warning)
  if (worksheet['A45']) {
    worksheet['A45'].s = {
      font: { bold: true, sz: 12, color: { rgb: "DC2626" } },
      fill: { fgColor: { rgb: "FEE2E2" } },  // Red pale
      alignment: { horizontal: "left", vertical: "center" }
    };
  }

  // Warning items
  ['A47', 'A48', 'A49', 'A50'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { sz: 10, color: { rgb: "7C2D12" } },
        fill: { fgColor: { rgb: "FEF3C7" } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true }
      };
    }
  });

  // Footer
  ['A54', 'A55'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { sz: 11, color: { rgb: "6B7280" }, italic: true },
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
  });

  if (worksheet['A57']) {
    worksheet['A57'].s = {
      font: { bold: true, sz: 12, color: { rgb: "059669" } },
      alignment: { horizontal: "left", vertical: "center" }
    };
  }

  // === SET ROW HEIGHTS ===
  if (!worksheet['!rows']) worksheet['!rows'] = [];
  worksheet['!rows'][1] = { hpt: 35 };  // Header
  worksheet['!rows'][2] = { hpt: 25 };  // Subheader
  worksheet['!rows'][6] = { hpt: 25 };  // Section titles
  worksheet['!rows'][14] = { hpt: 25 };

  return worksheet;
};

/**
 * 🏗️ GENEREAZĂ SHEET PENTRU O SCARĂ - DESIGN PREMIUM
 */
const generateStairSheet = (stair, block) => {
  // === HEADER INFO ===
  const blockStairTitle = `${block.name} - ${stair.name}`;

  // === COLUMN HEADERS ===
  const headers = [
    'Nr_Apt*',
    'Proprietar*',
    'Nr_Persoane*',
    'Tip_Apartament',
    'Suprafata_mp',
    'Sursa_Incalzire',
    'Restanta_RON',
    'Penalitati_RON'
  ];

  // === COLUMN ICONS & DESCRIPTIONS ===
  const headerIcons = [
    '🏠',      // Nr_Apt
    '👤',      // Proprietar
    '👥',      // Nr_Persoane
    '🔑',      // Tip_Apartament
    '📐',      // Suprafata
    '🔥',      // Sursa Incalzire
    '💰',      // Restanta
    '⚠️'       // Penalitati
  ];

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

  // === EXAMPLE ROW ===
  const exampleRow = [
    1,
    'Ion Popescu',
    3,
    '3 camere',
    65.5,
    'Termoficare',
    150.00,
    25.50
  ];

  // === BUILD SHEET DATA ===
  const data = [
    // Header zone with title
    [''],
    [blockStairTitle, '', '', '', '', '', '', ''],
    [''],
    [''],

    // Column headers with icons
    headers.map((h, i) => `${headerIcons[i]} ${h}`),
    explanations,

    // Separator
    [''],

    // Example section
    ['📋 EXEMPLU DE COMPLETARE', '', '', '', '', '', '', ''],
    exampleRow,
    [''],

    // Reference section
    ['📚 REFERINȚĂ RAPIDĂ - Opțiuni disponibile pentru copiere:', '', '', '', '', '', '', ''],
    [''],
    ['Tip_Apartament:', APARTMENT_TYPES.join('  •  '), '', '', '', '', '', ''],
    ['Sursa_Incalzire:', HEATING_SOURCES.join('  •  '), '', '', '', '', '', ''],
    [''],
    [''],

    // Data entry section marker
    ['✏️ DATE APARTAMENTE - Copiați datele începând de aici ⬇️', '', '', '', '', '', '', ''],
    ['']
  ];

  // Add 35 empty rows for data entry (ample space for copy-paste)
  for (let i = 0; i < 35; i++) {
    data.push([]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // === COLUMN WIDTHS ===
  worksheet['!cols'] = [
    { width: 12 },  // Nr_Apt
    { width: 28 },  // Proprietar
    { width: 14 },  // Nr_Persoane
    { width: 18 },  // Tip_Apartament
    { width: 15 },  // Suprafata_mp
    { width: 20 },  // Sursa_Incalzire
    { width: 15 },  // Restanta_RON
    { width: 15 }   // Penalitati_RON
  ];

  // === MERGE CELLS ===
  worksheet['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },   // Title
    { s: { r: 7, c: 0 }, e: { r: 7, c: 7 } },   // Example label
    { s: { r: 10, c: 0 }, e: { r: 10, c: 7 } },  // Reference label
    { s: { r: 12, c: 1 }, e: { r: 12, c: 7 } },  // Apartment types
    { s: { r: 13, c: 1 }, e: { r: 13, c: 7 } },  // Heating sources
    { s: { r: 16, c: 0 }, e: { r: 16, c: 7 } }   // Data section marker
  ];

  // === PREMIUM STYLING ===

  // Title (row 1)
  if (worksheet['A2']) {
    worksheet['A2'].s = {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: {
        fgColor: { rgb: "2563EB" },  // Blue gradient start
        patternType: "solid"
      },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        bottom: { style: "medium", color: { rgb: "1E40AF" } }
      }
    };
  }

  // Column headers (row 4) - with gradient effect
  for (let col = 0; col < headers.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 4, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "3B82F6" } },  // Blue
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "1E40AF" } },
          bottom: { style: "thin", color: { rgb: "1E40AF" } },
          left: { style: "thin", color: { rgb: "60A5FA" } },
          right: { style: "thin", color: { rgb: "60A5FA" } }
        }
      };
    }
  }

  // Explanations (row 5)
  for (let col = 0; col < explanations.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 5, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        font: { italic: true, sz: 9, color: { rgb: "6B7280" } },
        fill: { fgColor: { rgb: "F3F4F6" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          bottom: { style: "thin", color: { rgb: "E5E7EB" } }
        }
      };
    }
  }

  // Example label (row 7)
  if (worksheet['A8']) {
    worksheet['A8'].s = {
      font: { bold: true, sz: 11, color: { rgb: "047857" } },
      fill: { fgColor: { rgb: "D1FAE5" } },  // Green mint pale
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "10B981" } },
        bottom: { style: "thin", color: { rgb: "10B981" } }
      }
    };
  }

  // Example row (row 8)
  for (let col = 0; col < 8; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 8, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        fill: { fgColor: { rgb: "ECFDF5" } },  // Very light green
        font: { sz: 10, color: { rgb: "065F46" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "A7F3D0" } },
          bottom: { style: "thin", color: { rgb: "A7F3D0" } },
          left: { style: "thin", color: { rgb: "A7F3D0" } },
          right: { style: "thin", color: { rgb: "A7F3D0" } }
        }
      };
    }
  }

  // Reference label (row 10)
  if (worksheet['A11']) {
    worksheet['A11'].s = {
      font: { bold: true, sz: 11, color: { rgb: "92400E" } },
      fill: { fgColor: { rgb: "FEF3C7" } },  // Yellow pale
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "F59E0B" } },
        bottom: { style: "thin", color: { rgb: "F59E0B" } }
      }
    };
  }

  // Reference data rows (rows 12-13)
  ['A13', 'A14'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { bold: true, sz: 10, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "FFFBEB" } },
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
  });

  ['B13', 'B14'].forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { sz: 9, color: { rgb: "4B5563" } },
        fill: { fgColor: { rgb: "FFFBEB" } },
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
  });

  // Data section marker (row 16)
  if (worksheet['A17']) {
    worksheet['A17'].s = {
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "6366F1" } },  // Indigo
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "4F46E5" } },
        bottom: { style: "medium", color: { rgb: "4F46E5" } }
      }
    };
  }

  // Data entry rows (starting from row 17) - alternating colors
  for (let row = 17; row < 52; row++) {
    for (let col = 0; col < 8; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef] || true) {  // Style even empty cells
        if (!worksheet[cellRef]) worksheet[cellRef] = { t: 's', v: '' };

        worksheet[cellRef].s = {
          fill: { fgColor: { rgb: row % 2 === 0 ? "FFFFFF" : "F9FAFB" } },
          alignment: { horizontal: col === 1 ? "left" : "center", vertical: "center" },
          border: {
            top: { style: "hair", color: { rgb: "E5E7EB" } },
            bottom: { style: "hair", color: { rgb: "E5E7EB" } },
            left: { style: "hair", color: { rgb: "E5E7EB" } },
            right: { style: "hair", color: { rgb: "E5E7EB" } }
          }
        };
      }
    }
  }

  // === ROW HEIGHTS ===
  if (!worksheet['!rows']) worksheet['!rows'] = [];
  worksheet['!rows'][1] = { hpt: 35 };   // Title
  worksheet['!rows'][4] = { hpt: 30 };   // Headers
  worksheet['!rows'][5] = { hpt: 18 };   // Explanations
  worksheet['!rows'][7] = { hpt: 25 };   // Example label
  worksheet['!rows'][8] = { hpt: 22 };   // Example data
  worksheet['!rows'][10] = { hpt: 25 };  // Reference label
  worksheet['!rows'][16] = { hpt: 28 };  // Data marker

  // === FREEZE PANES - Keep headers visible ===
  worksheet['!freeze'] = {
    xSplit: 0,
    ySplit: 6,  // Freeze after row 6 (headers and explanations)
    topLeftCell: 'A7',
    activePane: 'bottomLeft',
    state: 'frozen'
  };

  return worksheet;
};

/**
 * 📊 FUNCȚIA PRINCIPALĂ DE GENERARE TEMPLATE - CU METADATA PROFESIONALĂ
 */
export const generateExcelTemplate = async (association, blocks, stairs) => {
  try {
    // console.log('📊 Generez template Excel pentru asociația:', association.name);

    // Verifică că avem date valide
    if (!association || !blocks || !stairs) {
      throw new Error('Date incomplete pentru generarea template-ului');
    }

    // Filtrează blocurile și scările pentru asociația curentă
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

    // Creează workbook-ul gol (fără sheet-uri automate)
    const workbook = { SheetNames: [], Sheets: {} };

    // === ADAUGĂ METADATA PROFESIONALĂ ===
    workbook.Props = {
      Title: `Template Import Apartamente - ${association.name}`,
      Subject: 'Template pentru importul apartamentelor în BlocApp',
      Author: 'BlocApp - Sistem Management Asociații',
      Manager: association.name,
      Company: 'BlocApp',
      Category: 'Import Date',
      Keywords: 'apartamente, import, template, asociație, bloc',
      Comments: `Template generat pentru importul apartamentelor în asociația ${association.name}. Include ${associationBlocks.length} bloc(uri) și ${associationStairs.length} scară(ri).`,
      LastAuthor: 'BlocApp',
      CreatedDate: new Date(),
      ModifiedDate: new Date(),
      Application: 'BlocApp v1.0',
      AppVersion: '1.0.0',
      DocSecurity: 0,
      HyperlinksChanged: false,
      LinksUpToDate: true,
      ScaleCrop: false,
      SharedDoc: false
    };

    // === ADAUGĂ CUSTOM PROPERTIES ===
    workbook.Custprops = {
      'Asociație': association.name,
      'Număr Blocuri': associationBlocks.length,
      'Număr Scări': associationStairs.length,
      'Data Generare': new Date().toISOString().split('T')[0],
      'Versiune Template': '2.0 Premium'
    };

    // 📖 Adaugă sheet-ul cu instrucțiuni
    const instructionsSheet = generateInstructionsSheet(association.name);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, '📖 INSTRUCȚIUNI');

    // 🏗️ Adaugă sheet pentru fiecare scară
    let stairCount = 0;
    for (const stair of associationStairs) {
      const block = associationBlocks.find(b => b.id === stair.blockId);
      if (block) {
        const stairSheet = generateStairSheet(stair, block);

        // Nume sheet-ului (max 31 caractere pentru Excel)
        const blockName = block.name.substring(0, 10);
        const stairName = stair.name.substring(0, 10);
        const sheetName = `${blockName}_${stairName}`.substring(0, 31);

        XLSX.utils.book_append_sheet(workbook, stairSheet, sheetName);
        stairCount++;
      }
    }

    // === WORKBOOK VIEW SETTINGS (Professional defaults) ===
    workbook.Workbook = {
      Views: [{
        RTL: false,
        activeTab: 0,
        firstSheet: 0,
        showHorizontalScroll: true,
        showSheetTabs: true,
        showVerticalScroll: true,
        tabRatio: 600,
        windowHeight: 20000,
        windowWidth: 28000,
        xWindow: 0,
        yWindow: 0
      }],
      WBProps: {
        date1904: false,
        filterPrivacy: false,
        CodeName: 'BlocAppTemplate'
      }
    };

    // 💾 Generează și descarcă fișierul
    const fileName = `Template_Apartamente_${association.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // console.log(`✅ Template generat cu succes:`, {
    //   associatie: association.name,
    //   blocuri: associationBlocks.length,
    //   scari: stairCount,
    //   fileName
    // });

    // Convertește la buffer și descarcă - cu compression pentru file mai mic
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      compression: true,  // Enable compression
      bookSST: true       // Use shared string table for better compression
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

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
 * 📈 FUNCȚIE HELPER PENTRU STATISTICI TEMPLATE
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