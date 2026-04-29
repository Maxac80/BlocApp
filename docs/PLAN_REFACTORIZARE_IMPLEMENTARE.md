# PLAN REFACTORIZARE - Sistem Distribuție Cheltuieli

**Data început:** 2025-01-28
**Status:** 🔄 IN PROGRESS - Actualizare plan cu clarificări
**Ultima actualizare:** 2025-01-28

---

## 📋 CUPRINS

1. [Explicații Sistem](#explicații-sistem)
2. [Tabele cu Exemple](#tabele-cu-exemple)
3. [Plan Implementare](#plan-implementare)
4. [Progres Implementare](#progres-implementare)

---

## 📚 EXPLICAȚII SISTEM

### Tipuri de Distribuție

#### 1. **apartment** - Pe Apartament (Egal)
- **Descriere:** Suma se împarte egal la toate apartamentele participante
- **Participări:** Integral, Procent, Sumă fixă, Exclus
- **Reponderare:** DA - diferența cauzată de participări se redistribuie automat
- **Diferență:** NU există (suma totală distribuită = suma introdusă)
- **Badge:** ✅ ÎNTOTDEAUNA verde

**Exemplu:**
```
Suma: 500 RON pentru 15 apartamente participante (1 exclus)
- Ap 11 (50% participare): 18.15 RON
- Ap 22 (10 RON fix): 10.00 RON
- Ap 33-550 (13 apt integrale): 36.30 RON fiecare
Total: 18.15 + 10.00 + (36.30 × 13) = 500.00 RON ✅
```

#### 2. **person** - Pe Persoană
- **Descriere:** Suma se împarte egal la numărul total de persoane
- **Logică:** IDENTICĂ cu apartment, dar unitatea = persoană
- **Badge:** ✅ ÎNTOTDEAUNA verde

#### 3. **cotaParte** - Pe Cotă Parte (Indiviză)
- **Descriere:** Suma se distribuie proporțional cu suprafața (mp)
- **Cota parte:** Se calculează AUTOMAT din suprafață la momentul distribuției
- **Logică:** IDENTICĂ cu apartment, dar unitatea = mp
- **Badge:** ✅ ÎNTOTDEAUNA verde

#### 4. **consumption** - Pe Consum (mc/kWh/etc)
- **Descriere:** Suma se calculează din consum × preț unitar
- **Participări:** Integral, Procent, Sumă fixă, Exclus (aplicate DUPĂ calcul consum)
- **Diferență:** DA - O SINGURĂ diferență cu DOUĂ afișări:
  - **În header/card:** Informează utilizatorul (ex: "⚠ Diferență: -40.00 RON (lipsesc)")
  - **În tabel (coloană):** Arată distribuția diferenței pe apartamente
- **Badge:** ✅ ÎNTOTDEAUNA verde (suma se distribuie complet automat)

**Exemplu - O singură diferență, două afișări:**
```
Suma factură: 5000 RON
Total consum: 110 mc × 50 RON/mc = 5500 RON
După participări: 4960 RON

DIFERENȚA: 4960 - 5000 = -40 RON (lipsesc - pierderi/scurgeri)

AFIȘARE 1 - În header:
  ⚠ Diferență: -40.00 RON (lipsesc)
  Total introdus: 4960.00 RON

AFIȘARE 2 - În tabel (coloană "Diferență distribuită"):
  Ap 11: +3.64 RON
  Ap 22: +0.36 RON
  Ap 33: +1.82 RON
  ...
  TOTAL coloană: +40.00 RON ← Aceeași diferență, distribuită!

Total distribuit: 4960 + 40 = 5000 RON ✅
```

#### 5. **individual** - Sume Individuale
- **Descriere:** Sume introduse manual pentru fiecare apartament
- **Participări:** Doar Integral și Exclus (nu există procent sau fix)
- **Diferență:** DA - eroare de introducere manuală
- **Diferență distribuită:** NU - utilizatorul trebuie să corecteze manual
- **Badge:**
  - ✅ Verde când diferență = 0
  - 🟠 Portocaliu când diferență ≠ 0

**Exemplu diferență = 0:**
```
Suma așteptată: 5000 RON
Total introdus: 5000 RON
Badge: ✅ Total distribuit: 5000.00 RON
```

**Exemplu diferență ≠ 0:**
```
Suma așteptată: 5000 RON
Total introdus: 4950 RON
Diferență: -50 RON (lipsesc)
Badge: 🟠 Diferență: -50.00 RON (lipsesc)
```

---

### Culori Badge-uri (PĂSTRĂM EXACT CA ÎN APLICAȚIA ACTUALĂ)

| Tip Badge | Culoare | Clase CSS | Când se folosește |
|-----------|---------|-----------|-------------------|
| **Verde** | 🟢 Verde | `bg-green-100 text-green-700` | apartment/person/cotaParte (întotdeauna)<br>consumption (întotdeauna)<br>individual (când diferență = 0) |
| **Portocaliu** | 🟠 Portocaliu | `bg-orange-100 text-orange-700` | individual (când diferență ≠ 0) |
| **Portocaliu deschis** | ⚠️ Warning | `bg-orange-50 text-orange-600` | Avertisment diferență (în header/card) |

**IMPORTANT:** NU schimbăm culorile! Păstrăm exact culorile actuale din aplicație.

---

### Diferența Generală (deasupra cheltuielilor)

În pagina de calcul întreținere, deasupra listei de cheltuieli, există un total general:
```
Total: 20560.00 RON
⚠️ Diferență: -410.00 RON
```

**Această diferență poate apărea DOAR din:**
- Cheltuieli cu **sume individuale** care sunt:
  - Nedistribuite complet (status: "nedistribuită")
  - Distribuite dar incomplete (total introdus ≠ suma așteptată)

**NU apare din:**
- Cheltuieli **consumption** (acestea se distribuie automat complet)
- Cheltuieli **apartment/person/cotaParte** (acestea nu au diferență)

---

### Când Știm Suma Așteptată?

Știm suma așteptată când putem determina exact cât ar trebui să fie totalul pentru apartamentele afișate:

| Sume Pe | Tab Activ | Știe Sumă? | Motivație |
|---------|-----------|------------|-----------|
| **asociație** | Toate | ✅ DA | Avem suma pentru toată asociația |
| **asociație** | Scară A | ❌ NU | Nu știm cât din suma totală revine unei scări |
| **bloc** | Toate | ✅ DA | Avem suma pentru fiecare bloc |
| **bloc** | Scară A (1 scară/bloc) | ✅ DA | Blocul are o singură scară |
| **bloc** | Scară A (2+ scări/bloc) | ❌ NU | Nu știm cum se împarte suma între scări |
| **scară** | Toate | ✅ DA | Avem suma pentru fiecare scară |
| **scară** | Scară A | ✅ DA | Vizualizăm exact scara pentru care avem suma |

---

### Diferență Simplă vs Diferență Distribuită

#### Diferență Simplă
- **Pentru:** consumption și individual
- **Calcul:** `totalIntrodus - sumaAsteptata`
- **Afișare:** Când știm suma așteptată
- **Semnificație:**
  - **consumption:** pierderi/scurgeri la rețea (înainte de distribuire)
  - **individual:** eroare de introducere manuală

#### Diferență Distribuită
- **Pentru:** DOAR consumption
- **Calcul:** Se distribuie automat conform metodei din configurare cheltuială
- **Metode:** Pe apartament / Pe persoană / Pe consum / Pe cotă parte
- **Ajustare:**
  - Fără ajustări suplimentare
  - Respectă configurările de participare
  - Ajustare pe tip apartament
- **Afișare:** ÎNTOTDEAUNA în tabel, coloană separată

---

### Logica Badge-urilor (FĂRĂ TOLERANCE)

| Tip Distribuție | Condiție | Badge | Culoare |
|-----------------|----------|-------|---------|
| apartment | Orice | `✓ Total distribuit: X RON` | 🟢 Verde |
| person | Orice | `✓ Total distribuit: X RON` | 🟢 Verde |
| cotaParte | Orice | `✓ Total distribuit: X RON` | 🟢 Verde |
| consumption | Orice | `✓ Total distribuit: X RON` | 🟢 Verde |
| individual | diferență = 0 | `✓ Total distribuit: X RON` | 🟢 Verde |
| individual | diferență ≠ 0 | `⚠ Diferență: ±X RON` | 🟠 Portocaliu |

**Observație:** Am eliminat TOLERANCE (0.20 RON). Badge verde pentru individual doar când diferență este exact 0 (sau < 0.01 pentru erori de rotunjire matematică).

---

## 📊 TABELE CU EXEMPLE

### Exemplu 1: apartment - Sume pe ASOCIAȚIE + Tab TOATE

**Date intrare:**
```
Suma pe asociație: 500 RON
Total apartamente: 16
Participante: 15 (1 exclus)
- Ap 11: 50% participare
- Ap 22: 10 RON fix
- Ap 55: EXCLUS
- Restul 13: Integral
```

**Calcul:**
```
Bază: 500 / 15 = 33.33 RON/apt
După participare:
  - Ap 11: 33.33 × 50% = 16.67 RON
  - Ap 22: 10.00 RON (fix)
  - Ap 55: 0.00 RON (exclus)
  - Restul: 33.33 × 13 = 433.29 RON
Total după participare: 459.96 RON

Reponderare (redistribuie 40.04 RON):
  - Ap 11: 18.15 RON
  - Ap 22: 10.00 RON (fix nu se reponderează)
  - Restul: 36.30 RON fiecare
Total distribuit: 18.15 + 10.00 + (36.30 × 13) = 500.00 RON ✅
```

**Badge așteptat:**
```
✓ Total distribuit: 500.00 RON (verde)
```

**Știe suma așteptată:** ✅ DA (suma pe asociație, tab Toate)

---

### Exemplu 2: consumption - Sume pe ASOCIAȚIE + Tab TOATE

**Date intrare:**
```
Suma factură: 5000 RON
Preț: 50 RON/mc
Total consum introdus: 110 mc
Participări:
  - Ap 11: 10 mc, 50% participare
  - Ap 22: 1 mc, 10 RON fix
  - Ap 55: 10 mc, EXCLUS
  - Restul: consum normal
```

**Calcul:**
```
Total brut: 110 mc × 50 = 5500 RON

După participare:
  - Ap 11: 500 × 50% = 250 RON
  - Ap 22: 10 RON (fix)
  - Ap 55: 0 RON (exclus)
  - Restul: suma normală
Total după participare: 4960 RON

Diferență simplă: 4960 - 5000 = -40 RON (lipsesc)

Diferență distribuită: +40 RON
Distribuție conform setări (ex: proporțional cu consum):
  - Ap 11: (10/110) × 40 × 50% = 1.82 RON
  - Ap 22: proporțional ajustat
  - Ap 55: 0 RON (exclus)
  - etc.

Total distribuit: 4960 + 40 = 5000 RON ✅
```

**Badge așteptat:**
```
✓ Total distribuit: 5000.00 RON (verde)
⚠ Diferență: -40.00 RON (lipsesc) - afișată separat
Total introdus: 4960.00 RON
```

**Știe suma așteptată:** ✅ DA (suma pe asociație, tab Toate)

---

### Exemplu 3: consumption - Sume pe ASOCIAȚIE + Tab SCARĂ A

**Date intrare:**
```
Suma factură (asociație): 5000 RON
Tab activ: Scară A
Consum Scară A: 31 mc (din 110 mc total)
```

**Calcul:**
```
Total după participare Scară A: 1260 RON
Diferență distribuită Scară A: 10.91 RON (din -40 RON total)
Total distribuit Scară A: 1270.91 RON
```

**Badge așteptat:**
```
✓ Total distribuit: 1270.91 RON (verde)
⚠ Diferență distribuită: 10.91 RON (din -40 RON pe asociație)
Total introdus: 1260.00 RON
```

**Știe suma așteptată:** ❌ NU (suma e pe asociație, vizualizăm doar Scară A)
**Diferență simplă:** ❌ NU se afișează (nu știm suma așteptată pentru scară)
**Diferență distribuită:** ✅ DA se afișează (știm cât s-a distribuit din diferența globală)

---

### Exemplu 4: individual - Diferență = 0

**Date intrare:**
```
Suma așteptată: 5000 RON
Sume introduse:
  - Ap 11: 0 RON (exclus)
  - Ap 22: 100 RON
  - Ap 33: 150 RON
  - ...
Total introdus: 5000 RON
```

**Calcul:**
```
Diferență: 5000 - 5000 = 0 RON ✅
```

**Badge așteptat:**
```
✓ Total distribuit: 5000.00 RON (verde)
```

---

### Exemplu 5: individual - Diferență ≠ 0

**Date intrare:**
```
Suma așteptată: 5000 RON
Sume introduse:
  - Ap 11: 0 RON (exclus)
  - Ap 22: 100 RON
  - Ap 33: 150 RON
  - ...
Total introdus: 4950 RON
```

**Calcul:**
```
Diferență: 4950 - 5000 = -50 RON (lipsesc)
```

**Badge așteptat:**
```
⚠ Diferență: -50.00 RON (lipsesc) (portocaliu)
Total introdus: 4950.00 RON
```

**Acțiune utilizator:** Trebuie să modifice sumele introduse manual pentru a ajunge la 5000 RON

---

### Exemplu 6: individual - Sume pe ASOCIAȚIE + Tab SCARĂ A

**Date intrare:**
```
Suma așteptată (asociație): 5000 RON
Tab activ: Scară A
Sume introduse Scară A: 40 RON
```

**Badge așteptat:**
```
✓ Total distribuit: 40.00 RON (verde)
```

**Știe suma așteptată:** ❌ NU (suma e pe asociație, vizualizăm doar Scară A)
**Diferență simplă:** ❌ NU se afișează (nu știm suma așteptată pentru scară)

---

## 🛠️ PLAN IMPLEMENTARE

### Faza 1: Pregătire (5 pași)

#### ✅ Pas 1: Creare fișier plan
**Status:** ✅ DONE
**Data:** 2025-01-28
**Descriere:** Creare PLAN_REFACTORIZARE_IMPLEMENTARE.md
**Fișiere:** `PLAN_REFACTORIZARE_IMPLEMENTARE.md`
**Note:** Plan complet cu explicații și exemple

---

#### ⬜ Pas 2: Creare DifferenceCalculations.js
**Status:** ⬜ TODO
**Descriere:** Creez funcțiile helper pentru calculul diferențelor
**Fișiere:** `src/components/expenses/shared/DifferenceCalculations.js` (NOU)
**Conținut:**
- `EXPENSE_BEHAVIOR_CONFIG` - configurație comportament per tip
- `knowsExpectedAmount()` - determină dacă știm suma așteptată
- `getRelevantAmount()` - obține suma așteptată pentru context
- `calculateTotalIntrodus()` - calculează totalIntrodus cu participări
- `calculateExpenseDifferenceInfo()` - calculează toate diferențele

**Criterii acceptare:**
- [ ] Funcția `knowsExpectedAmount()` returnează corect pentru toate combinațiile
- [ ] Funcția `calculateExpenseDifferenceInfo()` calculează corect pentru apartment
- [ ] Funcția `calculateExpenseDifferenceInfo()` calculează corect pentru consumption
- [ ] Funcția `calculateExpenseDifferenceInfo()` calculează corect pentru individual
- [ ] Nu apar erori în consolă când importez funcțiile

---

#### ⬜ Pas 3: Creare ExpenseBadges.js
**Status:** ⬜ TODO
**Descriere:** Creez componentele badge reutilizabile
**Fișiere:** `src/components/expenses/shared/ExpenseBadges.js` (NOU)
**Conținut:**
- `<ExpenseTotalBadge />` - badge principal (verde/portocaliu)
- `<SimpleDifferenceBadge />` - diferență simplă (consumption)
- `<TotalIntrodusBadge />` - total introdus

**Criterii acceptare:**
- [ ] `<ExpenseTotalBadge />` afișează verde pentru apartment/person/cotaParte
- [ ] `<ExpenseTotalBadge />` afișează verde pentru consumption
- [ ] `<ExpenseTotalBadge />` afișează verde pentru individual când diferență = 0
- [ ] `<ExpenseTotalBadge />` afișează portocaliu pentru individual când diferență ≠ 0
- [ ] Culorile sunt corecte: verde (bg-green-100 text-green-700), portocaliu (bg-orange-100 text-orange-700)

---

#### ⬜ Pas 4: Creare fișier de test
**Status:** ⬜ TODO
**Descriere:** Creez fișier pentru testare funcții noi în izolare
**Fișiere:** `src/components/expenses/shared/TestDifferences.js` (NOU, temporar)
**Conținut:**
- Import funcții noi
- Date de test pentru toate scenariile
- Logging comparativ în consolă

**Criterii acceptare:**
- [ ] Pot rula testele în browser
- [ ] Văd rezultatele în consolă
- [ ] Toate calculele sunt corecte conform exemplelor din plan

---

#### ⬜ Pas 5: Verificare funcții noi
**Status:** ⬜ TODO
**Descriere:** Rulez testele și verific că toate funcțiile calculează corect
**Acțiune:** Deschid aplicația în browser, merg la componentul de test, verific consola
**Criterii acceptare:**
- [ ] apartment: totalDistribuit = suma introdusă
- [ ] consumption: totalDistribuit = totalIntrodus + diferențăDistribuită
- [ ] individual diferență=0: badge verde
- [ ] individual diferență≠0: badge portocaliu
- [ ] knowsExpectedAmount() corect pentru toate combinațiile

**CHECKPOINT 1:** Dacă totul e OK aici, funcțiile noi sunt corecte și putem continua. Dacă nu, corectăm până funcționează.

---

### Faza 2: Migrare ConsumptionInput.js (3 pași)

#### ⬜ Pas 6: Import funcții în ConsumptionInput.js
**Status:** ⬜ TODO
**Descriere:** Import funcții și componente noi în ConsumptionInput.js
**Fișiere:** `src/components/expenses/ConsumptionInput.js`
**Modificări:**
```javascript
import { calculateExpenseDifferenceInfo } from './shared/DifferenceCalculations';
import { ExpenseTotalBadge, SimpleDifferenceBadge } from './shared/ExpenseBadges';
```

---

#### ⬜ Pas 7: Înlocuire TOLERANCE (1/2) - linia 339
**Status:** ⬜ TODO
**Descriere:** Înlocuiesc logica cu `TOLERANCE` cu `calculateExpenseDifferenceInfo()` + `<ExpenseTotalBadge />`
**Fișiere:** `src/components/expenses/ConsumptionInput.js:339`
**Înainte:**
```javascript
const TOLERANCE = 0.20;
const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;
// ... logică badge
```
**După:**
```javascript
const differenceInfo = calculateExpenseDifferenceInfo({...});
<ExpenseTotalBadge differenceInfo={differenceInfo} />
```

---

#### ⬜ Pas 8: Înlocuire TOLERANCE (2/2) - linia 814
**Status:** ⬜ TODO
**Descriere:** Similar cu Pas 7
**Fișiere:** `src/components/expenses/ConsumptionInput.js:814`

**Criterii acceptare Pas 6-8:**
- [ ] Aplicația se compilează fără erori
- [ ] Badge-urile se afișează corect în ConsumptionInput
- [ ] Nu apar erori în consolă
- [ ] Comportamentul vizual este identic cu înainte

**CHECKPOINT 2:** Testăm ConsumptionInput.js în browser. Dacă totul e OK, continuăm. Dacă nu, rollback și corectăm.

---

### Faza 3: Migrare ConsumptionComponents.js (2 pași)

#### ⬜ Pas 9: Actualizare ExpenseDifferenceDisplay
**Status:** ⬜ TODO
**Descriere:** Modific `ExpenseDifferenceDisplay` să folosească noua logică (fără TOLERANCE)
**Fișiere:** `src/components/expenses/shared/ConsumptionComponents.js:222`
**Înainte:**
```javascript
const TOLERANCE = 0.20;
const isDifferenceOk = Math.abs(diferenta) <= TOLERANCE;
```
**După:**
```javascript
// Elimină TOLERANCE, afișează diferență doar când diferență ≠ 0
const hasDifference = Math.abs(diferenta) >= 0.01;
```

---

#### ⬜ Pas 10: Test ConsumptionComponents.js
**Status:** ⬜ TODO
**Descriere:** Verific că ExpenseDifferenceDisplay funcționează corect
**Criterii acceptare:**
- [ ] Badge-ul de diferență apare când există diferență
- [ ] Badge-ul dispare când diferență = 0
- [ ] Culorile sunt corecte

**CHECKPOINT 3:** Testăm în browser. Verificăm că badge-urile din lista de cheltuieli arată corect.

---

### Faza 4: Migrare ExpenseList.js (12 pași)

ExpenseList.js are **12 locații** cu TOLERANCE care trebuie înlocuite:

#### ⬜ Pas 11: ExpenseList.js - Import funcții noi
**Status:** ⬜ TODO
**Fișiere:** `src/components/expenses/ExpenseList.js` (top)
**Modificări:**
```javascript
import { calculateExpenseDifferenceInfo } from './shared/DifferenceCalculations';
import { ExpenseTotalBadge, SimpleDifferenceBadge, TotalIntrodusBadge } from './shared/ExpenseBadges';
```

---

#### ⬜ Pas 12: Înlocuire TOLERANCE 1/12 - linia 926
**Status:** ⬜ TODO
**Context:** Header pentru cheltuială expandată (sume pe asociație, tab Toate)

#### ⬜ Pas 13: Înlocuire TOLERANCE 2/12 - linia 1347
**Status:** ⬜ TODO
**Context:** Card detalii distribuție

#### ⬜ Pas 14: Înlocuire TOLERANCE 3/12 - linia 1588
**Status:** ⬜ TODO

#### ⬜ Pas 15: Înlocuire TOLERANCE 4/12 - linia 1899
**Status:** ⬜ TODO

#### ⬜ Pas 16: Înlocuire TOLERANCE 5/12 - linia 1950
**Status:** ⬜ TODO

#### ⬜ Pas 17: Înlocuire TOLERANCE 6/12 - linia 2437
**Status:** ⬜ TODO

#### ⬜ Pas 18: Înlocuire TOLERANCE 7/12 - linia 2746
**Status:** ⬜ TODO

#### ⬜ Pas 19: Înlocuire TOLERANCE 8/12 - linia 2783
**Status:** ⬜ TODO

#### ⬜ Pas 20: Înlocuire TOLERANCE 9/12 - linia 3229
**Status:** ⬜ TODO

#### ⬜ Pas 21: Înlocuire TOLERANCE 10/12 - linia 3343
**Status:** ⬜ TODO

#### ⬜ Pas 22: Înlocuire TOLERANCE 11/12 - linia 3633
**Status:** ⬜ TODO

#### ⬜ Pas 23: Înlocuire TOLERANCE 12/12 - linia 3706
**Status:** ⬜ TODO

**Criterii acceptare Pas 12-23:**
- [ ] Aplicația se compilează fără erori
- [ ] Toate badge-urile se afișează corect în ExpenseList
- [ ] apartment/person/cotaParte: verde întotdeauna
- [ ] consumption: verde întotdeauna + diferență afișată
- [ ] individual: verde când 0, portocaliu când ≠ 0
- [ ] Nu apar erori în consolă

**CHECKPOINT 4:** Testăm COMPLET în browser:
- Creăm cheltuieli de toate tipurile
- Testăm toate combinațiile (asociație/bloc/scară × Toate/Scară)
- Verificăm că badge-urile și diferențele sunt corecte

---

### Faza 5: Curățenie și Finalizare (1 pas)

#### ⬜ Pas 24: Ștergere fișier test și verificare finală
**Status:** ⬜ TODO
**Descriere:** Șterge `TestDifferences.js`, verificare finală completă
**Acțiuni:**
- [ ] Șterge fișierul temporar de test
- [ ] Verifică că nu mai există referințe la TOLERANCE în cod
- [ ] Testing complet în toate scenariile
- [ ] Commit cu mesaj descriptiv

**Criterii acceptare finale:**
- [ ] Zero erori în consolă
- [ ] Toate badge-urile corecte
- [ ] Toate diferențele calculate corect
- [ ] Comportamentul identic cu cel specificat în documentație
- [ ] Cod curat, fără duplicări

---

## 📈 PROGRES IMPLEMENTARE

### Sesiune 1 - 2025-01-28

**Timp:** Start - IN PROGRESS
**Pași completați:** 1 / 24
**Status:** 🔄 Actualizare plan cu clarificări + pregătire implementare

**Ce am făcut:**
- ✅ Pas 1: Creat fișier plan cu explicații complete și exemple
- ✅ Clarificat diferența la consumption (o diferență, două afișări)
- ✅ Actualizat plan cu:
  - Secțiune "Culori Badge-uri" (păstrăm culorile actuale)
  - Secțiune "Diferența Generală" (doar din sume individuale)
  - Exemplu clarificat pentru consumption

**Ce urmează:**
- Pas 2: Creez DifferenceCalculations.js
- Pas 3: Creez ExpenseBadges.js
- Testare funcții noi

**Probleme întâlnite:**
- ✅ REZOLVAT: Confuzie cu "diferență simplă vs distribuită" → clarificat că e o singură diferență cu două afișări

**Note:**
- Badge portocaliu (`bg-orange-100 text-orange-700`) pentru individual cu diferență
- Eliminat TOLERANCE complet (badge verde doar când diferență = 0 sau < 0.01 pentru rotunjiri)
- Fișiere noi în `src/components/expenses/shared/`
- NU facem verificare totaluri în cod, doar testare manuală

---

## 🐛 PROBLEME ȘI SOLUȚII

_(Se vor completa pe măsură ce implementăm)_

---

## ✅ CHECKLIST FINAL

Înainte de a considera refactorizarea completă, verificăm:

### Funcționalitate
- [ ] Badge-uri corecte pentru apartment/person/cotaParte (verde)
- [ ] Badge-uri corecte pentru consumption (verde + diferență)
- [ ] Badge-uri corecte pentru individual (verde/portocaliu)
- [ ] Diferență simplă se afișează corect (consumption + individual)
- [ ] Diferență distribuită se afișează corect (consumption)
- [ ] `knowsExpectedAmount()` funcționează pentru toate combinațiile

### Calitate Cod
- [ ] Zero duplicare - toate locațiile folosesc funcțiile centralizate
- [ ] Zero referințe la TOLERANCE în cod
- [ ] Import-uri corecte în toate fișierele
- [ ] Cod curat, lizibil, cu comentarii

### Testing
- [ ] Testat pentru sume pe asociație + Tab Toate
- [ ] Testat pentru sume pe asociație + Tab Scară
- [ ] Testat pentru sume pe bloc + Tab Toate
- [ ] Testat pentru sume pe bloc + Tab Scară (1 scară/bloc)
- [ ] Testat pentru sume pe bloc + Tab Scară (2+ scări/bloc)
- [ ] Testat pentru sume pe scară + Tab Toate
- [ ] Testat pentru sume pe scară + Tab Scară
- [ ] Testat pentru toate tipurile de distribuție

### Documentație
- [ ] Plan actualizat cu toate statusurile
- [ ] Note despre probleme și soluții
- [ ] Commit messages descriptive

---

## 📞 ÎNTREBĂRI PENTRU UTILIZATOR

**Înainte de a începe implementarea, verificați că:**

1. ✅ Explicațiile despre fiecare tip de distribuție sunt corecte?
2. ✅ Exemplele numerice sunt corecte? (Verificați calculele)
3. ✅ Tabelul "Când știm suma așteptată" este corect?
4. ✅ Badge-urile sunt cum vă așteptați?
5. ✅ Înțelegeți planul de implementare?
6. ✅ Sunteți de acord cu abordarea pas-cu-pas?

**Dacă aveți neclarități sau modificări, specificați-le ACUM înainte să încep implementarea!**

---

**Următorul pas:** Aștept confirmarea voastră că planul este corect și că pot începe cu Pas 2 (creare DifferenceCalculations.js).
