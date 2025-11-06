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
- Nu există mecanism de arhivare automată pentru sheet-uri vechi
- Penalitățile nu se calculează automat la transfer (rămân constante)

---

**Ultima actualizare:** 6 noiembrie 2025
**Versiune document:** 1.0
**Autor:** Claude Code Session - Publishing System Analysis
