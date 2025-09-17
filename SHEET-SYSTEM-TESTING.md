# 🧪 GHID DE TESTARE - NOUL SISTEM SHEET

## ✅ Ce am implementat

### 1. Noul sistem SHEET-uri
- **Fișier nou**: `src/hooks/useSheetManagement.js` - core logic pentru sheet-uri
- **Fișier modificat**: `src/hooks/useMonthManagement.js` - wrapper pentru compatibilitate
- **Fișier modificat**: `src/hooks/useDataOperations.js` - integrarea cu crearea asociațiilor
- **Fișier modificat**: `firestore.rules` - reguli pentru colecția `sheets`

### 2. Arhitectura SHEET
Fiecare **SHEET** = snapshot complet al unei luni, conținând:
- Structura asociației la momentul publicării (blocuri, scări, apartamente)
- Toate cheltuielile lunii
- Tabelul de întreținere calculat
- Plățile încasate
- Soldurile și balanțele

### 3. Workflow-ul corect
```
CREARE ASOCIAȚIE → SHEET IN_PROGRESS (luna curentă)
         ↓
ADĂUGARE CHELTUIELI → Se salvează în sheet-ul curent
         ↓
PUBLICARE → Sheet curent → PUBLISHED
         → Sheet publicat anterior → ARCHIVED  
         → Creare automat sheet nou → IN_PROGRESS (luna următoare)
```

### 4. Statusuri SHEET
- **IN_PROGRESS**: Luna în lucru (se pot adăuga cheltuieli)
- **PUBLISHED**: Luna publicată (se pot face doar încasări)
- **ARCHIVED**: Luna arhivată (doar vizualizare)

## 🧪 INSTRUCȚIUNI DE TESTARE

### TESTUL 1: Crearea asociației și primul SHEET
1. Deschide http://localhost:3000
2. Creează cont nou cu email valid
3. Urmărește wizard-ul de onboarding
4. La crearea asociației, verifică:
   - ✅ Se creează UN SINGUR sheet cu status "in_lucru" 
   - ✅ Sheet-ul conține luna curentă ("septembrie 2025")
   - ❌ NU se creează 3 luni automat (august, septembrie, octombrie)
   - ❌ NU există luni marcate ca "istoric" fără publicare

### TESTUL 2: Adăugarea cheltuielilor
1. Navighează la secțiunea "Cheltuieli"
2. Adaugă câteva cheltuieli (curent, gaz, apă)
3. Verifică:
   - ✅ Cheltuielile se salvează în sheet-ul curent
   - ✅ Apar în calculul de întreținere

### TESTUL 3: Publicarea sheet-ului
1. Navighează la "Întreținere"
2. Completează calculul de întreținere
3. Publică luna curentă
4. Verifică:
   - ✅ Sheet-ul curent devine "published"
   - ✅ Se creează automat următorul sheet pentru următoarea lună
   - ✅ Workflow-ul continuă corect

## 🔍 Ce să verifici în Firebase Console

### Colecția `sheets`
Structura unui document sheet:
```javascript
{
  associationId: "abc123",
  monthYear: "septembrie 2025",
  status: "in_progress", // sau "published", "archived"
  
  associationSnapshot: {
    name: "Nume Asociație",
    cui: "12345678", 
    // ... structura completă
  },
  
  expenses: [...], // cheltuielile lunii
  maintenanceTable: [...], // tabelul calculat
  payments: [...], // plățile încasate
  balances: {...}, // soldurile
  
  createdAt: timestamp,
  publishedAt: timestamp sau null,
  archivedAt: timestamp sau null
}
```

## ⚠️ Probleme de verificat

### Problema VECHE (rezolvată)
- ❌ Se creau automat 3 luni (august, septembrie, octombrie)
- ❌ August era marcat ca "istoric" fără publicare
- ❌ Nu respecta workflow-ul real al asociațiilor

### Comportamentul NOU (corect)
- ✅ Se creează doar UN sheet la început
- ✅ Sheet-urile noi se creează doar la publicare
- ✅ Fiecare sheet publicat este permanent și complet

## 🚀 Următorii pași

1. **Testare completă** - urmează instrucțiunile de mai sus
2. **Validare în producție** - testează pe cont real
3. **Debugging** - raportează orice problemă găsită
4. **Lansare** - când totul funcționează perfect

## 📝 Fișiere importante

- `src/hooks/useSheetManagement.js` - Logica core pentru sheet-uri
- `src/hooks/useMonthManagement.js` - Compatibilitate cu codul existent  
- `firestore.rules` - Securitatea pentru colecția sheets
- `test-sheet-system.js` - Script de validare a logicii

---
*Sistem implementat pentru a respecta workflow-ul real al asociațiilor de proprietari.*