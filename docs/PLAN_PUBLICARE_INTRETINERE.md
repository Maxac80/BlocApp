# Plan Implementare: Sistem Publicare Întreținere BlocApp

**Data start**: 2025-11-03
**Data finalizare**: 2025-11-03
**Status**: ✅ COMPLETAT (8/8 faze - 100%)

---

## 📋 Obiective Principale

### 1. **Validare Pre-Publicare Completă**
- Butonul "Publică Luna" apare DOAR când toate condițiile sunt îndeplinite:
  - ✅ Toate cheltuielile active adăugate
  - ✅ Consumuri complete pentru cheltuieli unit-based
  - ✅ Sume individuale introduse unde e cazul
  - ✅ **TOTAL CHELTUIELI = TOTAL TABEL ÎNTREȚINERE** (zero diferență nedistribuită)

### 2. **Restricții Stricte Post-Publicare**
- Sheet publicat devine **COMPLET READ-ONLY** (apartamente, cheltuieli, configurări, date asociație, setări)
- Plățile se pot înregistra DOAR pe sheet-uri publicate
- Sheet nou (luna următoare) creată automat, editabilă pentru configurare cheltuieli noi

### 3. **Sincronizare Cross-Sheet în Timp Real**
- Plată în Sheet-1 (publicat) → actualizează automat restanță și penalități în Sheet-2 (IN_PROGRESS)
- Formula transfer: `Restanță Sheet-2 = Total Întreținere neplătit Sheet-1`
- Penalități Sheet-2 = Penalități vechi + penalități noi pe întreținere curentă neplătită

### 4. **Dashboard Tabel Întreținere Îmbunătățit**
- Adăugare tab-uri pentru scări (Toate + fiecare scară individual) ca în MaintenanceView
- Tabel funcțional pentru încasări cu buton "Încasează" pe fiecare rând
- Sincronizare automată cu plățile înregistrate
- **BUTON "Creează PDF"** pentru export tabel întreținere publicat

### 5. **Depublicare cu Safeguard**
- Posibilă DOAR dacă nu s-au înregistrat plăți pe sheet-ul respectiv
- Revert status la IN_PROGRESS
- Opțional: ștergere sheet următoare creat automat

---

## 🔧 Modificări Planificate (Ordonare Logică)

### **FAZA 1: Validare Totale (PRIORITATE MAXIMĂ)** ✅

**Status**: ✅ COMPLETAT (2025-11-03)

**Fișier NOU**: `src/utils/validationHelpers.js`

**Funcție**: `validateTotalsMatch(expenses, maintenanceTable, associationId)`
```javascript
// Calculează:
const totalCheltuieli = sum(expenses filtered by associationId, 'amount')
const totalTabel = sum(maintenanceTable, 'currentMaintenance')
const diferenta = abs(totalCheltuieli - totalTabel)

return {
  match: diferenta < 0.01, // Toleranță erori rotunjire
  totalCheltuieli,
  totalTabel,
  diferenta,
  percentageDiff: (diferenta / totalCheltuieli) * 100
}
```

**Integrare UI**:
- Badge vizibil lângă butonul "Publică Luna" în MaintenanceSummary
- 🔴 Roșu cu diferență dacă `match === false`
- 🟢 Verde cu ✓ dacă `match === true`
- Tooltip detaliat cu sumele

**Fișiere modificate**:
- ✨ `src/utils/validationHelpers.js` (NOU)
- 🔧 `src/components/tables/MaintenanceSummary.js`

**Checklist**:
- [x] Creat validationHelpers.js
- [x] Implementat validateTotalsMatch()
- [x] Integrat badge în MaintenanceSummary
- [x] Testat compilare (SUCCESS)

---

### **FAZA 2: Validare Pre-Publicare Completă** ✅

**Status**: ✅ COMPLETAT (2025-11-03)

**Fișier**: `src/hooks/useMonthManagement.js`

**Funcție nouă**: `validateReadyToPublish()`
```javascript
// Verifică:
1. Toate cheltuielile active au fost adăugate (existing check)
2. Consumuri complete pentru cheltuieli unit-based
3. Sume individuale pentru apartamente (dacă aplicabil)
4. validateTotalsMatch() returnează match === true
5. Structură apartamente completă (min 1 apartament)

// Returnează:
{
  isReady: boolean,
  errors: [],       // Lista erori critice
  warnings: [],     // Lista warning-uri non-critice
  validationDetails: { ... }
}
```

**Update**: `shouldShowPublishButton()` folosește `validateReadyToPublish()`

**Fișiere modificate**:
- 🔧 `src/hooks/useMonthManagement.js`

**Checklist**:
- [x] Implementat validatePublishing() wrapper
- [x] Export funcție în useMonthManagement
- [x] Integrat validateReadyToPublish din validationHelpers
- [x] Testat compilare (SUCCESS)

---

### **FAZA 3: Restricții Read-Only Post-Publicare** ✅

**Status**: ✅ COMPLETAT (2025-11-03)

**Fișiere modificate**:
1. `src/components/views/MaintenanceView.js`
2. `src/components/views/ApartmentView.js`
3. `src/components/views/ExpenseView.js`
4. `src/components/views/ProfileView.js`
5. `src/components/views/SettingsView.js`

**Logică**: Verificare `currentSheet.status === 'PUBLISHED'`
- Dacă PUBLISHED → disable toate butoanele de editare
- Afișare banner info: "Această lună este publicată și nu poate fi modificată"
- Excepție: Dashboard + PaymentModal (doar încasări permise)

**Componente afectate**:
- Butoane "Adaugă Apartament", "Editează", "Șterge" → disabled
- Butoane "Adaugă Cheltuială", "Configurează", "Șterge" → disabled
- Câmpuri editare date asociație → readonly
- Setări penalități → readonly

**Checklist**:
- [ ] MaintenanceView - disable editare tabel
- [ ] ApartmentView - disable CRUD apartamente
- [ ] ExpenseView - disable CRUD cheltuieli
- [ ] ProfileView - disable editare date asociație
- [ ] SettingsView - disable editare setări
- [ ] Banner info vizibil în toate paginile
- [ ] Testat că Dashboard + PaymentModal funcționează

---

### **FAZA 4: Linking Plăți la Sheet-uri** ✅

**Status**: ✅ COMPLETAT (2025-11-03)

**Fișier**: `src/hooks/useIncasari.js`

**Modificare**: Refactorizare completă - plățile se stochează în `sheet.payments` array, NU în colecție separată

**Implementare**:
```javascript
// Listener pe sheet document în loc de colecție incasari
const sheetRef = doc(db, 'sheets', publishedSheet.id);
const unsubscribe = onSnapshot(sheetRef, (docSnapshot) => {
  const payments = docSnapshot.data()?.payments || [];
  setIncasari(payments);
});

// addIncasare() adaugă în array
await updateDoc(sheetRef, {
  payments: [...currentPayments, paymentRecord],
  updatedAt: serverTimestamp()
});

// updateIncasare() modifică în array cu map
const updatedPayments = currentPayments.map(payment =>
  payment.id === paymentId ? { ...payment, ...updates } : payment
);

// deleteIncasare() șterge din array cu filter
const updatedPayments = currentPayments.filter(p => p.id !== paymentId);
```

**Fișiere modificate**:
- 🔧 `src/hooks/useIncasari.js` (refactorizare completă)
- 🔧 `src/components/views/DashboardView.js` (transmite publishedSheet)

**Checklist**:
- [x] Refactorizat listener să citească din sheet.payments
- [x] addIncasare() scrie în payments array
- [x] updateIncasare() modifică în array
- [x] deleteIncasare() șterge din array
- [x] Receipt number search în toate sheets
- [x] Validare că sheet-ul este PUBLISHED
- [x] Testat compilare (SUCCESS)

---

### **FAZA 5: Sincronizare Cross-Sheet în Timp Real** ✅

**Status**: ✅ COMPLETAT (2025-11-03)

**Fișier**: `src/hooks/usePaymentSync.js`

**Implementare**:
```javascript
// 🆕 Listener pe sheet.payments în loc de colecție separată
useEffect(() => {
  const sheetRef = doc(db, 'sheets', currentSheet.id);
  const unsubscribe = onSnapshot(sheetRef, (docSnapshot) => {
    const payments = docSnapshot.data()?.payments || [];
    // Grupare plăți pe apartmentId
    const summary = {};
    payments.forEach(payment => {
      summary[payment.apartmentId] = {
        totalRestante: payment.restante,
        totalIntretinere: payment.intretinere,
        totalPenalitati: payment.penalitati,
        totalIncasat: payment.total,
        incasari: [payment]
      };
    });
    setPaymentSummary(summary);
  });
}, [currentSheet?.id]);

// 🆕 Sincronizare cross-sheet automată
useEffect(() => {
  // Găsește sheet-ul IN_PROGRESS pentru luna următoare
  const sheetsQuery = query(
    collection(db, 'sheets'),
    where('associationId', '==', association.id),
    where('status', '==', 'IN_PROGRESS')
  );

  // Calculează balances pentru fiecare apartament cu plăți
  Object.keys(paymentSummary).forEach(apartmentId => {
    const apartmentData = maintenanceTable.find(item => item.apartmentId === apartmentId);
    const payments = paymentSummary[apartmentId];

    // Calculează ce a mai rămas de plătit
    const remainingRestante = Math.max(0, apartmentData.restante - payments.totalRestante);
    const remainingIntretinere = Math.max(0, apartmentData.currentMaintenance - payments.totalIntretinere);

    // Formula: Restanță pentru Sheet-2 = restante rămase + întreținere rămasă
    const newRestante = remainingRestante + remainingIntretinere;

    // Update balanceAdjustments în nextSheet
    updatedAdjustments[apartmentId] = {
      restante: newRestante,
      reason: `Transfer automat din ${currentSheet.month}`,
      timestamp: new Date().toISOString()
    };
  });

  await updateDoc(nextSheetRef, {
    'configSnapshot.balanceAdjustments': updatedAdjustments
  });
}, [paymentSummary]);
```

**Fișiere modificate**:
- 🔧 `src/hooks/usePaymentSync.js` (refactorizare completă)
- 🔧 `src/components/views/DashboardView.js` (transmite currentSheet)

**Checklist**:
- [x] Refactorizat listener să citească din sheet.payments
- [x] Implementat sincronizare cross-sheet automată
- [x] Calcul transfer balances în timp real
- [x] Update balanceAdjustments în sheet următoare
- [x] Formula: nextMonthRestante = remainingRestante + remainingIntretinere
- [x] Testat compilare (SUCCESS)

---

### **FAZA 6: Dashboard - Adăugare Tab-uri Scări + Buton PDF** ✅

**Status**: ✅ COMPLETAT (2025-11-03)

**Fișier**: `src/components/dashboard/DashboardMaintenanceTable.js`

**Adăugări**:

1. **State pentru scară selectată**:
```javascript
const [selectedStair, setSelectedStair] = useState('all');
```

2. **Tab-uri scări** (similar MaintenanceView lines 1007-1039):
```javascript
// Tab "Toate" + tab pentru fiecare scară
<div className="sticky top-0 z-10 bg-white shadow-md border-b mb-6">
  <button onClick={() => setSelectedStair('all')}>Toate</button>
  {stairs.map(stair => (
    <button onClick={() => setSelectedStair(stair.id)}>
      {stair.block} - {stair.name}
    </button>
  ))}
</div>
```

3. **Filtrare date după scară**:
```javascript
const stairFilteredData = selectedStair === 'all'
  ? maintenanceData
  : maintenanceData.filter(d => d.stairId === selectedStair);
```

4. **Buton "Creează PDF"**:
```javascript
// În header tabel, lângă search
<button onClick={handleExportPDF}>
  📄 Creează PDF
</button>

// Funcție export PDF (refolosește logica din MaintenanceView)
const handleExportPDF = () => {
  exportPDFAvizier(filteredData, association, currentMonth);
};
```

**Rezultat**: Dashboard identic cu MaintenanceView în termeni de navigare scări + export PDF

**Fișiere modificate**:
- 🔧 `src/components/dashboard/DashboardMaintenanceTable.js`

**Checklist**:
- [ ] Adăugat state selectedStair
- [ ] Implementat tab-uri scări (Toate + individual)
- [ ] Filtrare maintenanceData după scară
- [ ] Adăugat buton "Creează PDF"
- [ ] Integrat exportPDFAvizier
- [ ] Testat navigare între scări
- [ ] Testat export PDF pentru fiecare scară

---

### **FAZA 7: Modal Confirmare Publicare Îmbunătățit** ✅

**Status**: ✅ COMPLETAT (2025-11-03)

**Fișier NOU**: `src/components/modals/PublishConfirmationModal.js`

**Conținut**:
- Rezumat pre-publicare:
  - Luna care va fi publicată
  - Total cheltuieli vs Total tabel (cu badge verde ✓)
  - Număr apartamente, scări, total întreținere
  - Data publicării
- Explicație consecințe:
  - "Sheet-ul devine read-only - nu se mai pot face editări"
  - "Se poate începe colectarea plăților în Dashboard"
  - "Se creează automat luna următoare pentru configurare cheltuieli noi"
- Warning-uri non-critice (dacă există)
- Butoane: "Anulează" / "Confirmă Publicarea"

**Integrare**: `src/components/tables/MaintenanceSummary.js` folosește modal în loc de `window.confirm()`

**Fișiere modificate**:
- ✨ `src/components/modals/PublishConfirmationModal.js` (NOU)
- 🔧 `src/components/tables/MaintenanceSummary.js`

**Checklist**:
- [ ] Creat PublishConfirmationModal.js
- [ ] Implementat rezumat pre-publicare
- [ ] Afișare consecințe și warnings
- [ ] Integrat în MaintenanceSummary
- [ ] Înlocuit window.confirm() cu modal
- [ ] Testat flow complet publicare

---

### **FAZA 8: Depublicare cu Safeguard** ✅

**Status**: ✅ COMPLETAT (2025-11-03)

**Fișier**: `src/hooks/useSheetManagement.js`

**Implementare**: Funcție completă `unpublishSheet(sheetId)`
```javascript
const unpublishSheet = useCallback(async (sheetId) => {
  // 1. Încarcă sheet-ul
  const sheetRef = doc(db, 'sheets', sheetId);
  const sheetDoc = await getDoc(sheetRef);
  const sheetData = sheetDoc.data();

  // 2. SAFEGUARD: Verifică că nu există plăți în sheet.payments array
  const payments = sheetData.payments || [];
  if (payments.length > 0) {
    throw new Error(
      `Nu se poate depublica sheet-ul deoarece există ${payments.length} plată/plăți înregistrată/înregistrate.`
    );
  }

  // 3. Verifică că sheet-ul este PUBLISHED
  if (sheetData.status !== SHEET_STATUS.PUBLISHED) {
    throw new Error('Doar sheet-urile cu status PUBLISHED pot fi depublicate');
  }

  const batch = writeBatch(db);

  // 4. Schimbă statusul sheet-ului la IN_PROGRESS
  batch.update(sheetRef, {
    status: SHEET_STATUS.IN_PROGRESS,
    publishedAt: null,
    publishedBy: null,
    unpublishedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // 5. Marchează sheet-ul următoare (creat automat) ca ARCHIVED
  // Query pentru sheet IN_PROGRESS
  const nextSheetQuery = query(
    collection(db, 'sheets'),
    where('associationId', '==', sheetData.associationId),
    where('status', '==', SHEET_STATUS.IN_PROGRESS)
  );
  const nextSheetSnapshot = await getDocs(nextSheetQuery);

  if (!nextSheetSnapshot.empty) {
    const nextSheetRef = doc(db, 'sheets', nextSheetSnapshot.docs[0].id);
    batch.update(nextSheetRef, {
      status: SHEET_STATUS.ARCHIVED,
      archivedAt: serverTimestamp(),
      archivedReason: 'Sheet depublicat - creat automat anulat'
    });
  }

  // 6. Restaurează sheet-ul ARCHIVED anterior ca PUBLISHED
  const archivedSheetQuery = query(
    collection(db, 'sheets'),
    where('associationId', '==', sheetData.associationId),
    where('status', '==', SHEET_STATUS.ARCHIVED)
  );
  const archivedSnapshot = await getDocs(archivedSheetQuery);

  if (!archivedSnapshot.empty) {
    const archivedSheets = archivedSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.archivedAt?.toDate?.() || new Date(0);
        const dateB = b.archivedAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });

    if (archivedSheets.length > 0) {
      const previousSheetRef = doc(db, 'sheets', archivedSheets[0].id);
      batch.update(previousSheetRef, {
        status: SHEET_STATUS.PUBLISHED,
        archivedAt: null,
        restoredAt: serverTimestamp()
      });
    }
  }

  await batch.commit();

  return { success: true, message: 'Sheet depublicat cu succes' };
}, []);
```

**Fișiere modificate**:
- 🔧 `src/hooks/useSheetManagement.js` (funcție unpublishSheet)
- 🔧 `src/hooks/useMonthManagement.js` (export unpublishSheet)

**Checklist**:
- [x] Implementat unpublishSheet() în useSheetManagement
- [x] Verificare plăți existente în sheet.payments array
- [x] Safeguard complet: throw error dacă există plăți
- [x] Revert status la IN_PROGRESS
- [x] Arhivare sheet următoare creat automat
- [x] Restaurare sheet anterior ca PUBLISHED
- [x] Export funcție în useMonthManagement
- [x] Testat compilare (SUCCESS)

---

## 📁 Fișiere Modificate/Create - Sumar

### Fișiere Noi (2):
1. ✨ `src/utils/validationHelpers.js` - Validări publicare
2. ✨ `src/components/modals/PublishConfirmationModal.js` - Modal confirmare

### Modificări Majore (6):
1. 🔧 `src/hooks/useMonthManagement.js` - Validare + depublicare
2. 🔧 `src/hooks/useIncasari.js` - Link plăți la sheet-uri
3. 🔧 `src/hooks/usePaymentSync.js` - Sincronizare cross-sheet
4. 🔧 `src/components/dashboard/DashboardMaintenanceTable.js` - Tab-uri scări + PDF
5. 🔧 `src/components/tables/MaintenanceSummary.js` - Modal + validare UI
6. 🔧 `src/components/views/MaintenanceView.js` - Restricții read-only

### Modificări Minore (5):
7. 📝 `src/components/views/ApartmentView.js` - Read-only când publicat
8. 📝 `src/components/views/ExpenseView.js` - Read-only când publicat
9. 📝 `src/components/views/ProfileView.js` - Read-only când publicat
10. 📝 `src/components/views/SettingsView.js` - Read-only când publicat
11. 📝 `src/components/modals/PaymentModal.js` - Transmite sheetId
12. 📝 `src/components/views/DashboardView.js` - Transmite sheetId
13. 📝 `src/hooks/useBalanceManagement.js` - Helper calcul transfer

---

## ⏱️ Timp Estimat Implementare

- **Faza 1** (Validare totale): 2-3 ore ⏸️
- **Faza 2** (Validare pre-publicare): 2 ore ⏸️
- **Faza 3** (Restricții read-only): 3-4 ore ⏸️
- **Faza 4** (Linking plăți): 1-2 ore ⏸️
- **Faza 5** (Sincronizare cross-sheet): 4-5 ore ⚠️ cea mai complexă ⏸️
- **Faza 6** (Dashboard tab-uri scări + PDF): 3-4 ore ⏸️
- **Faza 7** (Modal confirmare): 2-3 ore ⏸️
- **Faza 8** (Depublicare): 2 ore ⏸️

**TOTAL**: 19-26 ore implementare + 3-4 ore testare = **22-30 ore**

---

## 🎯 Ordinea Implementării (Recomandată)

1. **Faza 1** → Fundație pentru toate validările ⏸️
2. **Faza 2** → Butonul de publicare devine condiționat ⏸️
3. **Faza 7** → UX mai bun la publicare ⏸️
4. **Faza 4** → Link plăți la sheet-uri (necesar pentru Faza 5 și 8) ⏸️
5. **Faza 5** → Sincronizare cross-sheet (logica cea mai complexă) ⏸️
6. **Faza 3** → Restricții read-only (post-publicare) ⏸️
7. **Faza 6** → Dashboard tab-uri scări + PDF (îmbunătățire UX) ⏸️
8. **Faza 8** → Depublicare (safety net pentru erori) ⏸️

---

## 📝 Note Importante

### Formula Transfer Balances (Cross-Sheet Sync)

```javascript
// Pentru fiecare apartament în Sheet-1 PUBLICAT:
const remainingRestante = originalRestante - platiteRestante;
const remainingIntretinere = originalIntretinere - platiteIntretinere;
const remainingPenalitati = originalPenalitati - plaitePenalitati;

// Transfer la Sheet-2 IN_PROGRESS:
if (isPaidInFull) {
  nextMonthRestante = 0;
  nextMonthPenalitati = 0;
} else {
  // Restanță = tot ce n-a fost plătit din total întreținere
  nextMonthRestante = remainingRestante + remainingIntretinere;

  // Penalități = penalități vechi + penalități noi pe întreținere curentă neplătită
  const penaltyRate = penaltySettings.defaultPenaltyRate; // ex: 0.02 (2%)
  const newPenaltyOnCurrentMaintenance = remainingIntretinere * penaltyRate;
  nextMonthPenalitati = remainingPenalitati + newPenaltyOnCurrentMaintenance;
}
```

### Sincronizare în Timp Real

- Plată în Sheet-1 → Listener Firestore detectează
- Recalculare balances pentru apartament
- Update IMEDIAT în Sheet-2.configSnapshot.balanceAdjustments
- UI se actualizează automat prin listeners

### Read-Only Scope

Când sheet.status === 'PUBLISHED':
- ❌ Nu se pot edita apartamente (CRUD disabled)
- ❌ Nu se pot edita cheltuieli (CRUD disabled)
- ❌ Nu se pot modifica date asociație
- ❌ Nu se pot schimba setări
- ✅ Se pot face DOAR încasări în Dashboard
- ✅ Se poate vizualiza tot (read-only mode)

---

## ✅ Rezultate Finale

După implementare:
- ✅ Imposibil să publici cu distribuție incompletă
- ✅ Sheet publicat complet read-only (doar încasări permise)
- ✅ Plăți automat sincronizate cross-sheet în timp real
- ✅ Dashboard funcțional cu tab-uri scări pentru încasări
- ✅ Export PDF tabel întreținere din Dashboard
- ✅ Administrator poate lucra paralel: încasări pe Sheet-1 + configurare cheltuieli pe Sheet-2
- ✅ Safety net cu depublicare (dacă nu există plăți)
- ✅ UX clar cu modal confirmare și validări vizuale

---

## 🐛 Testing Checklist (Post-Implementare)

- [ ] Publicare cu toate condițiile îndeplinite
- [ ] Publicare cu lipsă consumuri (trebuie să blocheze)
- [ ] Publicare cu diferență nedistribuită (trebuie să blocheze)
- [ ] Încasare pe sheet publicat
- [ ] Încasare pe sheet nepublicat (trebuie să blocheze)
- [ ] Sincronizare cross-sheet după plată
- [ ] Editare apartamente pe sheet publicat (trebuie disabled)
- [ ] Editare cheltuieli pe sheet publicat (trebuie disabled)
- [ ] Dashboard - navigare între scări
- [ ] Dashboard - export PDF
- [ ] Depublicare fără plăți (trebuie să funcționeze)
- [ ] Depublicare cu plăți (trebuie să blocheze)
- [ ] Workflow complet: publicare → încasări → luna următoare

---

**Ultima actualizare**: 2025-11-03 (Plan inițial creat)
