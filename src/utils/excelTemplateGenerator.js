import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * 📊 GENERATOR TEMPLATE EXCEL PENTRU APARTAMENTE
 * 
 * Generează un fișier Excel cu mai multe sheet-uri:
 * - Sheet "Instrucțiuni" cu ghid de completare
 * - Sheet pentru fiecare scară cu structura apartamentelor
 * - Validări și dropdown-uri integrate
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
 * 📖 GENEREAZĂ SHEET-UL CU INSTRUCȚIUNI
 */
const generateInstructionsSheet = (associationName) => {
  const data = [
    ['🏠 GHID COMPLETARE APARTAMENTE - ' + associationName],
    [''],
    [''],
    ['📌 PAȘI DE URMAT:'],
    [''],
    ['✅ PASUL 1: Deschide fiecare sheet pentru scara respectivă'],
    ['✅ PASUL 2: Completează datele apartamentelor începând de la rândul 17'],
    ['✅ PASUL 3: Câmpurile cu * sunt OBLIGATORII (Nr_Apt, Proprietar, Nr_Persoane)'],
    ['✅ PASUL 4: Pentru Tip Apartament și Sursa Încălzire - COPIAZĂ din opțiunile disponibile'],
    ['✅ PASUL 5: Soldurile se completează doar dacă există restanțe anterioare'],
    ['✅ PASUL 6: Salvează fișierul și încarcă-l în aplicație'],
    [''],
    [''],
    ['⚠️ REGULI IMPORTANTE:'],
    [''],
    ['❌ NU modifica antetele coloanelor (rândul cu Nr_Apt*, Proprietar*, etc.)'],
    ['❌ NU șterge sheet-urile existente'],
    ['❌ NU folosi numere duplicate pentru apartamente în aceeași scară'],
    ['✅ COPIAZĂ exact opțiunile pentru Tip Apartament și Sursa Încălzire'],
    ['✅ VERIFICĂ că ai completat toate câmpurile obligatorii'],
    [''],
    [''],
    ['📋 DESCRIERE DETALIATĂ A CÂMPURILOR:'],
    [''],
    [''],
    ['🔴 CÂMPURI OBLIGATORII:'],
    [''],
    ['  📍 Nr_Apt* → Numărul apartamentului (număr întreg: 1, 2, 15, 24)'],
    ['  📍 Proprietar* → Numele complet (ex: Ion Popescu, Maria Georgescu)'],
    ['  📍 Nr_Persoane* → Număr persoane (minimum 1)'],
    [''],
    [''],
    ['🟡 CÂMPURI OPȚIONALE:'],
    [''],
    ['  📍 Tip_Apartament → COPIAZĂ din lista: ' + APARTMENT_TYPES.join(', ')],
    ['  📍 Suprafata_mp → Metri pătrați (ex: 45, 65.5, 82.3)'],
    ['  📍 Sursa_Incalzire → COPIAZĂ din lista: ' + HEATING_SOURCES.join(', ')],
    ['  📍 Restanta_RON → Lei (implicit 0 - ex: 150, 75.50)'],
    ['  📍 Penalitati_RON → Lei (implicit 0 - ex: 25.50, 10)'],
    [''],
    [''],
    ['📞 SUPORT:'],
    ['Pentru ajutor, contactează administratorul sistemului.'],
    [''],
    [''],
    ['🎯 SUCCES LA COMPLETARE!']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Setează width-ul coloanei A pentru a fi mult mai lat
  worksheet['!cols'] = [
    { width: 100 }  // Coloana A foarte lată pentru a afișa tot textul
  ];
  
  return worksheet;
};

/**
 * 🏗️ GENEREAZĂ SHEET PENTRU O SCARĂ
 */
const generateStairSheet = (stair, block) => {
  // Header-ul tabelului
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

  // Rând cu explicații pentru fiecare coloană
  const explanations = [
    '(număr întreg)',
    '(nume complet)',
    '(min. 1 persoană)',
    '(selectează din opțiuni)',
    '(metri pătrați opțional)',
    '(selectează din opțiuni)',
    '(lei - implicit 0)',
    '(lei - implicit 0)'
  ];

  // Rând exemplu
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

  // Construiește datele sheet-ului cu mai multe spații
  const data = [
    [`📍 ${block.name} - ${stair.name}`, '', '', '', '', '', '', ''],
    [], // rând gol
    headers,
    explanations,
    [], // rând gol
    ['⬇️ EXEMPLU DE COMPLETARE (șterge după ce înțelegi formatul) ⬇️', '', '', '', '', '', '', ''],
    exampleRow,
    [], // rând gol
    [], // rând gol
    ['📋 OPȚIUNI DISPONIBILE PENTRU DROPDOWN-URI:', '', '', '', '', '', '', ''],
    [], // rând gol
    ['TIP APARTAMENT:', ...APARTMENT_TYPES, '', ''],
    ['SURSA ÎNCĂLZIRE:', ...HEATING_SOURCES],
    [], // rând gol
    [], // rând gol
    ['✏️ ÎNCEPE COMPLETAREA APARTAMENTELOR DE MAI JOS:', '', '', '', '', '', '', ''],
    [], // rând gol
    // Adăugăm 10 rânduri goale pentru completare
    [], [], [], [], [], [], [], [], [], []
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 🎨 FORMATARE ȘI STILURI
  const range = XLSX.utils.decode_range(worksheet['!ref']);

  // Setează width-ul coloanelor - prima coloană mult mai lată pentru textele descriptive
  worksheet['!cols'] = [
    { width: 55 },  // Coloana A - foarte lată pentru textele descriptive și opțiuni
    { width: 25 },  // Proprietar
    { width: 18 },  // Nr_Persoane
    { width: 22 },  // Tip_Apartament
    { width: 20 },  // Suprafata_mp
    { width: 22 },  // Sursa_Incalzire
    { width: 18 },  // Restanta_RON
    { width: 18 }   // Penalitati_RON
  ];

  // 📋 COLORAREA CELULELOR (folosind stiluri de bază disponibile în xlsx)
  // Aplicăm stiluri pentru anumite celule importante
  
  // Titlul sheet-ului (rândul 0)
  if (worksheet['A1']) {
    worksheet['A1'].s = {
      font: { bold: true, sz: 14 },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center" }
    };
  }

  // Header-ul tabelului (rândul 2)
  for (let col = 0; col < headers.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 2, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4472C4" } },
        alignment: { horizontal: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
  }

  // Rândul cu explicații (rândul 3)
  for (let col = 0; col < explanations.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        font: { italic: true, sz: 10, color: { rgb: "666666" } },
        fill: { fgColor: { rgb: "F2F2F2" } },
        alignment: { horizontal: "center" }
      };
    }
  }

  // Exemplu (rândul 6)
  for (let col = 0; col < 8; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 6, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        fill: { fgColor: { rgb: "E7F3E7" } },
        font: { color: { rgb: "006600" } },
        border: {
          top: { style: "thin", color: { rgb: "70AD47" } },
          bottom: { style: "thin", color: { rgb: "70AD47" } },
          left: { style: "thin", color: { rgb: "70AD47" } },
          right: { style: "thin", color: { rgb: "70AD47" } }
        }
      };
    }
  }

  // Rândul cu opțiuni pentru Tip Apartament (rândul 11)
  if (worksheet['A12']) {
    worksheet['A12'].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "ED7D31" } }
    };
  }

  // Rândul cu opțiuni pentru Sursa Încălzire (rândul 12)
  if (worksheet['A13']) {
    worksheet['A13'].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "FFC000" } }
    };
  }

  // Setăm înălțimea unor rânduri
  if (!worksheet['!rows']) worksheet['!rows'] = [];
  worksheet['!rows'][0] = { height: 30 }; // titlu
  worksheet['!rows'][2] = { height: 25 }; // header
  worksheet['!rows'][3] = { height: 20 }; // explicații
  
  // Adăugăm comentarii pentru câmpurile cu dropdown
  if (!worksheet['!comments']) worksheet['!comments'] = [];

  // Comentariu pentru coloana Tip_Apartament (D3)
  worksheet['!comments'].push({
    ref: 'D3',
    author: 'BlocApp',
    text: `📋 COPIAZĂ din opțiunile de la rândul 12:\n${APARTMENT_TYPES.join('\n')}`
  });

  // Comentariu pentru coloana Sursa_Incalzire (F3)
  worksheet['!comments'].push({
    ref: 'F3', 
    author: 'BlocApp',
    text: `🔥 COPIAZĂ din opțiunile de la rândul 13:\n${HEATING_SOURCES.join('\n')}`
  });

  return worksheet;
};

/**
 * 📊 FUNCȚIA PRINCIPALĂ DE GENERARE TEMPLATE
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

    // Creează workbook-ul
    const workbook = XLSX.utils.book_new();

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

    // 💾 Generează și descarcă fișierul
    const fileName = `Template_Apartamente_${association.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // console.log(`✅ Template generat cu succes:`, {
    //   associatie: association.name,
    //   blocuri: associationBlocks.length,
    //   scari: stairCount,
    //   fileName
    // });

    // Convertește la buffer și descarcă
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
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