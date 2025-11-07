# Sistem de Publicare Sheet-uri - Documentație Tehnică

## Prezentare Generală

Sistemul de publicare transformă sheet-urile din status **"în lucru"** (IN_PROGRESS) în sheet-uri **"publicate"** (PUBLISHED), creând automat următoarea lună în lucru și transferând corect soldurile între luni.

---

## 🎯 Principii Fundamentale

### 1. Sheet-Based Architecture
- **Un sheet = o lună calendaristică** (ex: "noiembrie 2025", "decembrie 2025")
- Fiecare sheet are **ID unic Firebase** și **status** (IN_PROGRESS, PUBLISHED, ARCHIVED)
- **Referințele se fac după sheet ID**, NU după string-uri de lună
- **Navigarea între luni** se face doar prin dropdown-ul din header (nu mai există tab-uri luni)

### 2. Fluxul de Date la Publicare

```
ÎNAINTE DE PUBLICARE:
┌─────────────────────────────────┐
│  Sheet Noiembrie 2025           │
│  Status: IN_PROGRESS            │
│  - expenses: [...]              │
│  - maintenanceTable: []         │
│  - payments: []                 │
└─────────────────────────────────┘

DUPĂ PUBLICARE:
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│  Sheet Noiembrie 2025 (LOCKED)  │  │  Sheet Decembrie 2025 (NOU)     │
│  Status: PUBLISHED              │  │  Status: IN_PROGRESS            │
│  - expenses: [...]              │  │  - expenses: []                 │
│  - maintenanceTable: [SALVAT]   │  │  - maintenanceTable: []         │
│  - payments: []                 │  │  - balances: {TRANSFERATE}      │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

---

## 📋 Proces de Publicare (useSheetManagement.js)

### Funcția Principală: `publishCurrentSheet()`

**Locație:** `src/hooks/useSheetManagement.js` (liniile 599-726)

**Pași cheie:**

1. **Validări Inițiale**
   - Verifică existența `currentSheet` și `associationId`
   - Verifică că sheet-ul nu este deja publicat
   - Asigură că există cheltuieli distribuite

2. **Salvare Date în Sheet Publicat**
   ```javascript
   // Salvează expenses și maintenanceTable în sheet-ul curent
   await updateDoc(currentSheetRef, {
     expenses: cleanedExpenses,
     maintenanceTable: cleanedMaintenanceData,
     status: SHEET_STATUS.PUBLISHED,
     publishedAt: serverTimestamp()
   });
   ```

3. **Creare Sheet Următor**
   - Calculează `nextWorkingMonth` (ex: "decembrie 2025")
   - Calculează soldurile per apartament cu `calculateApartmentBalancesAfterPayments()`
   - Creează sheet nou cu solduri transferate

4. **Transfer Solduri** (CRITIC!)
   ```javascript
   balances: {
     previousMonth: totalBalance,
     currentMonth: 0,
     transferred: true,
     transferredFrom: currentSheet.id,
     apartmentBalances: {
       [apartmentId]: {
         original: totalDatorat,  // Total din luna precedentă
         paid: totalPaid,         // Plăți efectuate
         remaining: remainingAmount // Ce rămâne de plătit
       }
     }
   }
   ```

---

## 💰 Transfer Solduri între Luni

### Structura Soldurilor în maintenanceTable

**Câmpuri în fiecare row din maintenanceTable:**
```javascript
{
  apartmentId: "abc123",
  apartment: "Ap. 1",
  currentMaintenance: 29.00,  // Întreținere curentă (ȘI LUNAR)
  restante: 9.00,             // Restanțe din luni anterioare
  penalitati: 13.00,          // Penalități acumulate
  totalDatorat: 51.00         // Total: 29 + 9 + 13
}
```

### Logica de Calcul (useMaintenanceCalculation.js)

**Funcția:** `getApartmentBalance()` (liniile 77-146)

**CAZ 2: Sheet în lucru → Calculează din sheet-ul publicat**

```javascript
// Extrage datele din luna publicată
const currentMaintenance = apartmentRow.currentMaintenance || 0; // 29.00 RON
const restanteVechi = apartmentRow.restante || 0;               // 9.00 RON
const penalitatiVechi = apartmentRow.penalitati || 0;           // 13.00 RON

// Calculează plățile pentru acest apartament
const apartmentPayments = payments.filter(p => p.apartmentId === apartmentId);
const totalPaid = apartmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

// Calculează restanța nouă din întreținerea neplătită
const restanteNoi = Math.max(0, currentMaintenance - totalPaid);

// Transferă corect în luna următoare
const restanteTotale = restanteVechi + restanteNoi; // 9.00 + 29.00 = 38.00

return {
  restante: restanteTotale,      // 38.00 RON
  penalitati: penalitatiVechi    // 13.00 RON (separate!)
};
```

### ⚠️ ATENȚIE: Câmpuri Critice

**GREȘIT:** Folosirea `totalDatorat` pentru transfer
```javascript
// ❌ GREȘIT - include tot (întreținere + restanțe + penalități)
const restante = totalDatorat - totalPaid; // 51 - 0 = 51 RON (GREȘIT!)
```

**CORECT:** Separare pe componente
```javascript
// ✅ CORECT - separă întreținerea de restanțe și penalități
const restanteNoi = currentMaintenance - totalPaid;  // 29 - 0 = 29 RON
const restanteTotale = restanteVechi + restanteNoi;  // 9 + 29 = 38 RON
const penalitati = penalitatiVechi;                  // 13 RON (separat)
```

---

## 🔄 Exemplu Complet: Noiembrie → Decembrie

### Situația Inițială (Noiembrie 2025 - Publicat)

**Ap. 1:**
- Întreținere curentă: **29.00 RON**
- Restanțe vechi (din septembrie): **9.00 RON**
- Penalități: **13.00 RON**
- **Total Datorat: 51.00 RON**
- **Plăți: 0.00 RON**

### Transfer în Decembrie 2025 (Fără Plăți)

**Calcul:**
```javascript
restanteVechi = 9.00       // Din septembrie
currentMaintenance = 29.00  // Întreținerea din noiembrie
totalPaid = 0.00           // Nicio plată

restanteNoi = 29.00 - 0.00 = 29.00 RON
restanteTotale = 9.00 + 29.00 = 38.00 RON
penalitati = 13.00 RON (transfer separat)
```

**Rezultat în Decembrie:**
- **Restanță: 38.00 RON** (9 din sept + 29 din nov)
- **Penalități: 13.00 RON** (transferate separat)
- **Întreținere curentă: 0.00 RON** (nicio cheltuială distribuită încă)
- **Total Datorat: 51.00 RON** (38 + 13 + 0)

### Transfer în Decembrie 2025 (Cu Plată Parțială)

**Dacă se plătesc 20 RON în noiembrie:**

```javascript
restanteVechi = 9.00
currentMaintenance = 29.00
totalPaid = 20.00

restanteNoi = 29.00 - 20.00 = 9.00 RON
restanteTotale = 9.00 + 9.00 = 18.00 RON
penalitati = 13.00 RON
```

**Rezultat în Decembrie:**
- **Restanță: 18.00 RON** (9 din sept + 9 din nov)
- **Penalități: 13.00 RON**
- **Total Datorat: 31.00 RON** (18 + 13 + 0)

---

## 🗂️ Structura Datelor Firebase

### Sheet Document Structure

```javascript
{
  id: "unique-firebase-id",
  monthYear: "noiembrie 2025",
  status: "PUBLISHED", // sau "IN_PROGRESS", "ARCHIVED"

  // Date salvate la publicare
  expenses: [
    {
      id: "expense-id",
      name: "Apă caldă",
      amount: 100.00,
      distributionType: "perConsum",
      // ... alte câmpuri
    }
  ],

  maintenanceTable: [
    {
      apartmentId: "apt-id",
      apartment: "Ap. 1",
      owner: "Iulian",
      persons: 5,
      currentMaintenance: 29.00,
      restante: 9.00,
      penalitati: 13.00,
      totalDatorat: 51.00,
      totalIntretinere: 29.00, // ⚠️ ATENȚIE: Nu se salvează în Firebase!
      // ... detalii cheltuieli
    }
  ],

  payments: [],

  // Solduri transferate (doar în sheet-ul următor)
  balances: {
    previousMonth: 42.00,
    currentMonth: 0,
    transferred: true,
    transferredFrom: "previous-sheet-id",
    apartmentBalances: {
      "apt-id": {
        original: 51.00,
        paid: 0.00,
        remaining: 51.00
      }
    }
  },

  publishedAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🔍 Cazuri de Citire Solduri

### Sistem cu Priorități (CAZ 1-6)

**Funcția:** `getApartmentBalance(apartmentId)` în `useMaintenanceCalculation.js`

1. **CAZ 1:** Sheet publicat vizualizat → Date LOCKED din `maintenanceTable`
2. **CAZ 2:** Sheet în lucru → Calculează din sheet-ul publicat + plăți
3. **CAZ 3:** Ajustări manuale → `currentSheet.configSnapshot.balanceAdjustments`
4. **CAZ 4:** Date în progres → `currentSheet.maintenanceTable`
5. **CAZ 5:** Fallback legacy → `apartment.initialBalance` (DEPRECATED)
6. **CAZ 6:** Fallback final → `{ restante: 0, penalitati: 0 }`

---

## 🐛 Probleme Rezolvate

### Bug #1: Cheltuieli dispăreau după publicare
**Cauza:** `BlocApp.js` folosea `currentSheet.expenses` pentru ambele luni
**Soluție:** Creat logică `activeSheet` care selectează sheet-ul corect bazat pe `currentMonth`

### Bug #2: Calcule dispăreau după publicare
**Cauză:** `maintenanceData` calcula mereu live în loc să folosească date salvate
**Soluție:** Adăugat logică condițională pentru sheet-uri publicate
```javascript
const maintenanceData = (activeSheet === publishedSheet && publishedSheet?.maintenanceTable)
  ? publishedSheet.maintenanceTable  // Date salvate
  : calculatedMaintenanceData;        // Calcul live
```

### Bug #3: Transfer greșit - totalDatorat în loc de currentMaintenance
**Cauză:** Folosirea `totalDatorat` pentru calcul restanță
**Soluție:** Separare pe componente: `currentMaintenance`, `restante`, `penalitati`

### Bug #4: Câmp inexistent `totalIntretinere`
**Cauză:** Căutare câmp `totalIntretinere` care nu exista în `maintenanceTable`
**Soluție:** Folosit câmpul corect `currentMaintenance`

---

## 📍 Referințe Cod

### Fișiere Cheie

| Fișier | Responsabilitate | Linii Critice |
|--------|------------------|---------------|
| `useSheetManagement.js` | Publicare, creare sheet-uri, transfer solduri | 599-726 (publish), 986-1035 (calcul solduri) |
| `useMaintenanceCalculation.js` | Calcul întreținere, citire solduri | 77-146 (getApartmentBalance), 819-908 (calculateMaintenanceWithDetails) |
| `BlocApp.js` | Selectare sheet activ, orchestrare | 236-313 (activeSheet logic) |
| `MaintenanceView.js` | UI, afișare date | 1000-1016 (butoane acțiuni) |
| `DashboardHeader.js` | Navigare luni (dropdown) | 42-55 (selector luni) |

### Funcții Importante

- **`publishCurrentSheet()`** - Publică sheet-ul curent și creează următorul
- **`unpublishSheet(sheetId)`** - Depublică un sheet (șterge următorul automat)
- **`calculateApartmentBalancesAfterPayments()`** - Calculează solduri per apartament
- **`getApartmentBalance(apartmentId)`** - Citește soldurile cu sistem de priorități
- **`calculateMaintenanceWithDetails()`** - Generează tabelul de întreținere complet

---

## ✅ Checklist Publicare Corectă

Când publici un sheet, verifică:

- [ ] Toate cheltuielile au fost distribuite
- [ ] Tabelul de întreținere afișează valori corecte
- [ ] `maintenanceTable` se salvează în sheet-ul publicat
- [ ] `expenses` se salvează în sheet-ul publicat
- [ ] Sheet-ul următor se creează automat cu status IN_PROGRESS
- [ ] Soldurile se transferă corect per apartament în `balances.apartmentBalances`
- [ ] **Restanțele** = restanțe vechi + întreținere neplătită (`currentMaintenance`)
- [ ] **Penalitățile** se transferă separat, NU se adună la restanțe
- [ ] Sheet-ul publicat devine read-only (nu mai poate fi editat)
- [ ] Navigarea prin dropdown funcționează corect între luni

---

## 🚨 Reguli Critice

1. **NU folosi `totalDatorat` pentru transfer solduri** - folosește `currentMaintenance`!
2. **NU uita să salvezi `expenses` și `maintenanceTable`** la publicare
3. **NU amesteca restanțele cu penalitățile** - sunt câmpuri separate
4. **NU șterge manual sheet-ul următor** - depublicarea face asta automat
5. **NU compara luni după string** - folosește sheet ID-uri
6. **Citește întotdeauna din sheet-ul corect** - `publishedSheet` pentru publicate, `currentSheet` pentru în lucru

---

## 📝 Note de Dezvoltare

### Modificări Viitoare Posibile

- [ ] Validare sume înainte de publicare (total cheltuieli = total tabel)
- [ ] Calcul automat penalități la transfer
- [ ] Raportare diferențe între luni
- [ ] Export PDF pentru sheet-uri publicate
- [ ] Sistem de audit pentru modificări solduri

### Limitări Curente

- Depublicarea șterge permanent sheet-ul următor (nu există undo)
- Penalitățile nu se calculează automat la transfer (rămân constante)

---

## 🗄️ Sistem de Arhivare Automată (Ianuarie 2025)

### Prezentare Generală

Începând cu ianuarie 2025, sistemul suportă **arhivarea automată** a sheet-urilor publicate când se publică o lună nouă. Acest lucru permite păstrarea istoricului complet și navigarea între luni istorice (archived), curente (published) și viitoare (in_progress).

### Fluxul de Arhivare

```
ÎNAINTE DE PUBLICARE (Ianuarie 2026):
┌─────────────────────────────────┐  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│  Noiembrie 2025                 │  │  Decembrie 2025                 │  │  Ianuarie 2026                  │
│  Status: ARCHIVED               │  │  Status: PUBLISHED              │  │  Status: IN_PROGRESS            │
└─────────────────────────────────┘  └─────────────────────────────────┘  └─────────────────────────────────┘

DUPĂ PUBLICARE (Ianuarie 2026):
┌─────────────────────────────────┐  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│  Noiembrie 2025                 │  │  Decembrie 2025                 │  │  Ianuarie 2026                  │  │  Februarie 2026                 │
│  Status: ARCHIVED               │  │  Status: ARCHIVED (nou!)        │  │  Status: PUBLISHED (actualizat) │  │  Status: IN_PROGRESS (nou)      │
└─────────────────────────────────┘  └─────────────────────────────────┘  └─────────────────────────────────┘  └─────────────────────────────────┘
```

### Implementare (useSheetManagement.js)

**Funcția:** `archivePreviousPublishedSheet()` (liniile 768-803)

**Logică:**
1. Găsește sheet-ul curent publicat (înainte de a publica noul sheet)
2. Actualizează statusul său de la `PUBLISHED` → `ARCHIVED`
3. Adaugă timestamp `archivedAt`

```javascript
const archivePreviousPublishedSheet = async () => {
  if (!publishedSheet?.id) {
    console.log('⚠️ No published sheet to archive');
    return;
  }

  try {
    const sheetRef = getSheetRef(associationId, publishedSheet.id);
    await updateDoc(sheetRef, {
      status: SHEET_STATUS.ARCHIVED,
      archivedAt: serverTimestamp()
    });
    console.log('✅ Previous published sheet archived:', publishedSheet.monthYear);
  } catch (error) {
    console.error('❌ Error archiving sheet:', error);
    throw error;
  }
};
```

### Sheet Status Lifecycle

```
┌─────────────┐       publishCurrentSheet()        ┌─────────────┐       publishCurrentSheet()        ┌─────────────┐
│ IN_PROGRESS │  ───────────────────────────────>  │  PUBLISHED  │  ───────────────────────────────>  │  ARCHIVED   │
└─────────────┘                                    └─────────────┘                                    └─────────────┘
      │                                                    │                                                  │
      │ Editabil                                           │ Read-only                                        │ Read-only
      │ Poate primi cheltuieli                             │ Poate primi plăți                                │ Doar vizualizare
      │ Calcule live                                       │ Date locked                                      │ Date locked
      │ Fără istoric plăți                                 │ Istoric complet plăți                            │ Istoric complet plăți
```

### Caracteristici Sheet-uri Archived

**Date Immutable:**
- ✅ `maintenanceTable` - Tabelul de întreținere salvat la publicare
- ✅ `expenses` - Cheltuielile distribuite în acea lună
- ✅ `payments` - Plățile înregistrate în luna respectivă
- ✅ `associationSnapshot` - Snapshot-ul asociației (apartamente, blocuri, scări)
- ✅ `configSnapshot` - Configurații cheltuieli și distribuiri

**Funcționalități Disponibile:**
- ✅ Vizualizare completă tabel întreținere
- ✅ Vizualizare cheltuieli distribuite (numele, suma, tip distribuție, factură)
- ✅ Vizualizare status plăți per apartament (Plătit/Neplătit/Parțial)
- ✅ Vizualizare istoric plăți (cine a plătit, când, cât)
- ✅ Export PDF (pentru avizier)
- ✅ Navigare prin dropdown între toate lunile (archived/published/in_progress)

**Funcționalități Blocate:**
- ❌ Adăugare/ștergere cheltuieli
- ❌ Modificare consumuri/sume
- ❌ Înregistrare plăți noi
- ❌ Ajustare solduri
- ❌ Depublicare (doar pentru PUBLISHED, nu ARCHIVED)

---

## 🔍 Logica de Citire Date pentru Luni Archived

### Problema Inițială

Când navigai la o lună archived (ex: noiembrie 2025), aplicația afișa date greșite:
- ❌ Cheltuielile dispăreau (arăta "0 din 1 cheltuieli")
- ❌ Tabelul calcula din sheet-ul curent (ianuarie) în loc de november
- ❌ Plățile nu apăreau în coloana Status
- ❌ Sumele erau greșite (calculau din luna greșită)

### Soluția: activeSheet Selection in BlocApp.js

**Funcția:** Logică de selectare `activeSheet` (liniile 236-277)

**Prioritate de Căutare:**
1. **Caută locked sheet** (published SAU archived) pentru luna selectată
2. **Fallback la publishedSheet** dacă corespunde lunii
3. **Fallback la currentSheet** pentru luni in-progress

```javascript
const activeSheet = (() => {
  console.log('🔍 Looking for sheet:', {
    currentMonth,
    totalSheets: sheets?.length || 0,
    availableSheets: sheets?.map(s => ({
      month: s.monthYear,
      status: s.status,
      id: s.id
    })) || []
  });

  // Caută un sheet publicat SAU arhivat pentru luna selectată
  const lockedSheetForMonth = sheets?.find(
    sheet => sheet.monthYear === currentMonth &&
             (sheet.status === 'published' || sheet.status === 'archived')
  );

  if (lockedSheetForMonth) {
    console.log('✅ Found locked sheet for month:', {
      month: currentMonth,
      status: lockedSheetForMonth.status,
      sheetId: lockedSheetForMonth.id,
      hasExpenses: !!lockedSheetForMonth.expenses,
      expensesCount: lockedSheetForMonth.expenses?.length || 0
    });
    return lockedSheetForMonth;
  }

  // Fallback logic...
})();
```

### Propagarea activeSheet în Componente

**1. BlocApp.js → MaintenanceView**
```javascript
<MaintenanceView
  activeSheet={activeSheet}  // 🆕 Sheet-ul corect pentru luna selectată
  expenses={activeSheet?.expenses || []}
  currentSheet={currentSheet}
  publishedSheet={publishedSheet}
  // ... alte props
/>
```

**2. MaintenanceView → useMaintenanceCalculation**
```javascript
const {
  getAssociationApartments,
  getApartmentBalance,
  maintenanceData,
  // ...
} = useMaintenanceCalculation({
  activeSheet,  // 🆕 CRITICAL
  currentSheet,
  publishedSheet,
  // ...
});
```

**3. MaintenanceView → usePaymentSync**
```javascript
const publishedSheetForPayments = (activeSheet?.status === 'published' ||
                                    activeSheet?.status === 'archived')
  ? activeSheet
  : null;

const { getUpdatedMaintenanceData, getPaymentStats } =
  usePaymentSync(association, currentMonth, publishedSheetForPayments);
```

### Modificări în useMaintenanceCalculation.js

**A. getAssociationApartments() - Prioritate de Citire Apartamente**

Liniile 32-97:
```javascript
// 1. PRIORITATE MAXIMĂ: activeSheet pasat de BlocApp
if (activeSheet?.associationSnapshot?.apartments) {
  return activeSheet.associationSnapshot.apartments;
}

// 2. FALLBACK pentru published sheet
if (publishedSheet?.monthYear === currentMonth && publishedSheet?.associationSnapshot?.apartments) {
  return publishedSheet.associationSnapshot.apartments;
}

// 3. FALLBACK pentru current sheet
if (currentSheet?.associationSnapshot?.apartments) {
  return currentSheet.associationSnapshot.apartments;
}

// 4. FALLBACK FINAL: Colecții Firebase
return filteredFromCollections;
```

**B. getApartmentBalance() - CAZ 1 Modificat pentru Archived**

Liniile 113-127:
```javascript
// CAZ 1: Vizualizăm un locked sheet (published SAU archived) → Date LOCKED
const viewingLockedSheet = activeSheet?.status === 'published' ||
                          activeSheet?.status === 'archived';

if (viewingLockedSheet && activeSheet?.monthYear === currentMonth) {
  if (activeSheet.maintenanceTable && activeSheet.maintenanceTable.length > 0) {
    const apartmentRow = activeSheet.maintenanceTable.find(row => row.apartmentId === apartmentId);
    if (apartmentRow) {
      return {
        restante: apartmentRow.restante || 0,
        penalitati: apartmentRow.penalitati || 0
      };
    }
  }
}
```

### Modificări în usePaymentSync.js

**Suport pentru Archived Sheets (liniile 24-34)**

```javascript
// Verifică status pentru locked sheets (published SAU archived)
const isLockedSheet = currentSheet?.status === 'PUBLISHED' ||
                      currentSheet?.status === 'published' ||
                      currentSheet?.status === 'archived';

if (!currentSheet?.id || !isLockedSheet) {
  setPaymentSummary({});
  return;
}
```

### Modificări în useMonthManagement.js

**isMonthReadOnly() - Detectează Locked Sheets (liniile 325-333)**

```javascript
const isMonthReadOnly = useCallback((month) => {
  // O lună este read-only dacă există un sheet publicat SAU arhivat
  const lockedSheet = sheets?.find(sheet =>
    sheet.monthYear === month &&
    (sheet.status === 'published' || sheet.status === 'archived')
  );
  return !!lockedSheet;
}, [sheets]);
```

**Impact:**
- ✅ Tabelul afișează coloana "Status" pentru luni archived
- ✅ Butoanele de acțiuni (Încasează, Publică) sunt ascunse pentru archived
- ✅ Badge-ul "LUNA ISTORICĂ" apare în header

### Modificări în MaintenanceView.js

**associationExpenses - Folosește direct expenses prop (liniile 431-439)**

```javascript
// Folosește cheltuielile din sheet-ul activ pasat de BlocApp
const associationExpenses = useMemo(() => {
  console.log('📦 MaintenanceView - Using expenses from BlocApp:', {
    currentMonth,
    expensesLength: expenses?.length || 0,
    expensesNames: expenses?.map(e => e.name) || []
  });

  return expenses || [];
}, [expenses, currentMonth]);
```

---

## 📊 Diagrama Completă de Flow

```
USER SELECTEAZĂ LUNA DIN DROPDOWN
         │
         ▼
  ┌─────────────────────────────────────────────────┐
  │ BlocApp.js: Caută activeSheet pentru currentMonth │
  └─────────────────────────────────────────────────┘
         │
         ├─> Sheet ARCHIVED găsit?
         │   ├─> DA: activeSheet = archivedSheet
         │   │         │
         │   │         ├─> expenses = activeSheet.expenses
         │   │         ├─> maintenanceData = activeSheet.maintenanceTable
         │   │         └─> isMonthReadOnly = true
         │   │
         │   └─> NU: Continuă căutare...
         │
         ├─> Sheet PUBLISHED găsit?
         │   ├─> DA: activeSheet = publishedSheet
         │   │         │ (Același behavior ca ARCHIVED)
         │   │
         │   └─> NU: activeSheet = currentSheet (IN_PROGRESS)
         │             │
         │             ├─> expenses = currentSheet.expenses || []
         │             ├─> maintenanceData = calculatedMaintenanceData (LIVE)
         │             └─> isMonthReadOnly = false
         │
         ▼
  ┌─────────────────────────────────────────────────┐
  │ MaintenanceView: Primește activeSheet și expenses│
  └─────────────────────────────────────────────────┘
         │
         ├─> useMaintenanceCalculation({ activeSheet, ... })
         │   └─> getAssociationApartments() folosește activeSheet.associationSnapshot
         │   └─> getApartmentBalance() citește din activeSheet.maintenanceTable (CAZ 1)
         │
         ├─> usePaymentSync(association, currentMonth, activeSheet)
         │   └─> Citește payments din activeSheet.payments
         │   └─> Calculează paymentSummary per apartament
         │
         └─> UI Rendering
             ├─> ExpenseList: Afișează activeSheet.expenses
             ├─> MaintenanceTableSimple/Detailed: Afișează maintenanceData
             │   └─> isMonthReadOnly = true → Afișează coloana Status
             │       └─> PaymentStatusDetail: Afișează badge-uri (Plătit/Neplătit/Parțial)
             └─> DashboardHeader: Badge "LUNA ISTORICĂ" pentru archived
```

---

## 🧪 Testare Completă - Checklist

### Pentru Luni ARCHIVED

- [ ] **Navigare:** Dropdown arată luna corectă cu badge "LUNA ISTORICĂ"
- [ ] **Cheltuieli:** Secțiunea "Cheltuieli distribuite" arată numărul corect (ex: "1 din 1")
- [ ] **Expense Details:** Cheltuielile pot fi expandate și arată detalii complete (factură, distribuție, sume)
- [ ] **Tabelul de Întreținere:** Afișează sumele exacte salvate la publicare
- [ ] **Coloana Status:** Apare și arată corect:
  - Badge verde "Plătit" pentru apartamente cu plăți complete
  - Badge roșu "Neplătit" pentru apartamente fără plăți
  - Badge galben "Plătit parțial" cu detalii suma plătită
- [ ] **Butoane Acțiuni:** NU apar (Distribuie Cheltuială, Publică Luna, Încasează)
- [ ] **TOTAL ÎNCASAT:** Rândul footer arată totalul corect al plăților
- [ ] **Export PDF:** Funcționează și exportă datele corecte

### Pentru Luni PUBLISHED

- [ ] **Badge:** "LUNA CURENTĂ" în header
- [ ] **Coloana Status:** Apare
- [ ] **Buton Încasează:** Apare și funcționează
- [ ] **Buton Depublică:** Apare (dacă nu există încasări)
- [ ] **Date Locked:** Nu se pot edita cheltuieli sau consumuri

### Pentru Luni IN_PROGRESS

- [ ] **Badge:** "ÎN LUCRU" sau viitor
- [ ] **Coloana Status:** NU apare
- [ ] **Butoane Editare:** Toate funcționale (Distribuie Cheltuială, etc.)
- [ ] **Calcule Live:** Tabelul se recalculează la fiecare modificare

---

## 🔧 Fișiere Modificate (Ianuarie 2025 - Archived Support)

| Fișier | Modificări | Linii |
|--------|-----------|-------|
| `useSheetManagement.js` | Adăugat `archivePreviousPublishedSheet()` | 768-803 |
| `useSheetManagement.js` | Actualizat `publishCurrentSheet()` să apeleze arhivare | 611 |
| `BlocApp.js` | Logică `activeSheet` cu suport archived | 236-277 |
| `BlocApp.js` | Pasare `activeSheet` la MaintenanceView | 676 |
| `MaintenanceView.js` | Primire `activeSheet` prop | 38 |
| `MaintenanceView.js` | Pasare `activeSheet` la hooks | 180, 328 |
| `MaintenanceView.js` | `associationExpenses` folosește `expenses` prop | 431-439 |
| `MaintenanceView.js` | `publishedSheetForPayments` suport archived | 145-156 |
| `useMaintenanceCalculation.js` | `getAssociationApartments()` prioritate activeSheet | 32-97 |
| `useMaintenanceCalculation.js` | `getApartmentBalance()` CAZ 1 suport archived | 113-127 |
| `useMaintenanceCalculation.js` | Dependencies actualizate cu `activeSheet` | 97, 250 |
| `usePaymentSync.js` | `isLockedSheet` include archived | 27-29 |
| `useMonthManagement.js` | `isMonthReadOnly()` verifică archived | 325-333 |

---

## ✅ Beneficii Sistem Archived

1. **Istoric Complet:** Păstrează toate lunile anterioare cu date intacte
2. **Audit Trail:** Poți reveni oricând la luni vechi pentru verificări
3. **Raportare:** Export PDF funcționează pentru orice lună istorică
4. **Transparență:** Proprietarii pot vedea detaliile lunilor trecute
5. **Debugging:** Ușor să compari cum s-au transferat soldurile între luni
6. **Compliance:** Păstrare evidență contabilă pe perioade lungi

---

**Ultima actualizare:** 8 ianuarie 2025
**Versiune document:** 2.0
**Autor:** Claude Code Session - Archived Sheets Implementation
