# Problema: Totale oscilante la refresh

## Simptome
- Totalul întreținerii se modifică între ~7950 RON și ~8450 RON la fiecare refresh
- Diferența este exact 500 RON = valoarea cheltuielii "Apa noua"
- "Apa noua" este uneori inclusă în calcul, alteori nu

## Cauza Reală (identificată prin debugging)

### Problema: Participările lipsesc din sheet
```
📋 === SHEET EXPENSES (7) ===
   Has participations: true
   🚰 "Apa noua" participări: NONE    ← PROBLEMA!
```

**"Apa noua" nu are participări salvate în `currentSheet.configSnapshot.apartmentParticipations`**

### De ce creează oscilații?

Când participările lipsesc din sheet (`NONE`), funcțiile de calcul folosesc `getExpenseConfig()` care citește din **global expense types** (Firestore). Acestea se încarcă **asincron** și **inconsistent**, rezultând în:

1. **Primul calcul** (7950 RON): rulează înainte ca global expense types să se încarce complet → "Apa noua" exclude sau 0
2. **Al doilea calcul** (8450 RON): rulează după ce global expense types s-au încărcat → "Apa noua" distribuit corect

### Pattern observat în consolă:
```
SHEET EXPENSES (0)              ← calcul cu sheet gol
⚠️ Nu există participări în sheet, resetez state-ul
SHEET EXPENSES (7)              ← sheet se încarcă
💰 TOTAL: 7950 RON              ← calcul cu participări incomplete
✅ Participări încărcate din sheet
💰 TOTAL: 8450 RON              ← calcul cu toate participările (dar din global, nu din sheet!)
```

## Soluția Corectă

### Principiu: Sheet = Sursă Unică de Adevăr

Pentru sistemul **sheet-based**, calculele trebuie să folosească **DOAR** datele din sheet, nu din global expenses:

```javascript
// ❌ GREȘIT - folosește config global (asincron, inconsistent)
const config = getExpenseConfig(expense);
const participation = config?.apartmentParticipation?.[apartment.id];

// ✅ CORECT - folosește participări din sheet (immutable, consistent)
const sheetParticipations = currentSheet.configSnapshot.apartmentParticipations[expense.expenseTypeId];
const participation = sheetParticipations?.[apartment.id];
```

### Funcții care trebuie modificate:

1. **`calculateExpenseDistributionWithReweighting`** (useMaintenanceCalculation.js:459)
2. **`calculateExpenseDifferences`** (useMaintenanceCalculation.js:166)

Ambele trebuie să:
- Preia participările din `currentSheet.configSnapshot.apartmentParticipations[expense.expenseTypeId]`
- NU folosesc `config?.apartmentParticipation` din `getExpenseConfig()`

## Problema Root Cause: Participări lipsă din sheet

**Întrebarea cheie**: De ce "Apa noua" nu are participări salvate în sheet?

Când se creează un sheet (în `useSheetManagement.js` sau similar), ar trebui să se copieze **TOATE** participările pentru **TOATE** cheltuielile din acel moment.

### Verificări necesare:

1. **La crearea sheet-ului**: Se salvează `apartmentParticipations` pentru toate cheltuielile?
2. **La adăugarea unei cheltuieli noi**: Se actualizează `configSnapshot.apartmentParticipations` în sheet?

## Status

- ✅ Problema identificată: Participări lipsă + folosire config global asincron
- ❌ Fix-ul testat a creat alte probleme (diferență nedistribuită la "Apa rece")
- ⏸️ Schimbările au fost revertate - revenire la versiunea stabilă

## Next Steps (pentru mai târziu)

1. **Investigare**: De ce participările pentru "Apa noua" lipsesc din sheet?
2. **Fix**: Asigură că TOATE participările sunt salvate în sheet la creare
3. **Refactorizare**: Modifică funcțiile de calcul să folosească DOAR date din sheet
4. **Testing**: Verifică că toate cheltuielile (consumption, apartment, etc.) funcționează corect

## Note
- Problema NU este de rotunjire floating-point (am testat)
- Problema NU este de race condition în loading (guard-urile nu au rezolvat)
- Problema ESTE de date inconsistente între sheet și global expenses
