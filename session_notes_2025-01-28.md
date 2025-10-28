# SESSION 2025-01-28: Refactorizare Badge-uri și Fix Calcule pentru Apartment/Person

## CONTEXT
Continuare din sesiunea anterioară - finalizarea refactorizării sistemului de badge-uri și diferențe pentru cheltuieli, cu focus pe tipurile apartment/person cu sume pe asociație.

## PROBLEME IDENTIFICATE

### 1. Badge-uri Lipsă pentru Apartment/Person cu Sume pe Asociație
**Simptom**: Când vizualizezi o scară specifică, cheltuielile de tip apartment/person cu sume introduse la nivel de asociație nu afișau nici suma în header, nici badge-ul "Total distribuit".

**Cauza Root**:
- `knowsExpectedAmount()` returna `false` pentru apartment/person cu `receptionMode === 'total'` când ești pe un tab de scară
- Logica duplicată din header nu includea apartment/person pentru cazul `receptionMode === 'total'`

**Fix**: Extins logica pentru a include apartment/person/cotaParte - acestea folosesc reponderare automată, deci ȘTIM suma pentru scară chiar dacă e introdusă pe asociație.

### 2. Sume per Apartament Inconsistente între Scări
**Simptom**: Pentru aceeași cheltuială (500 RON pe asociație), o scară arăta 32.67 RON/apt, alta arăta 36.30 RON/apt.

**Cauza Root**: În card, calculul pentru `integralAmountForStair` folosea `stairAmount` (suma deja calculată pentru scara curentă) în loc de `totalAssociationAmount` (suma totală pe asociație).

**Fix**: Pasează parametrii din contextul ORIGINAL (suma asociație + toate apartamentele asociației), nu din contextul CALCULAT.

### 3. Total pentru Scară Inconsistent cu Suma per Apartament
**Simptom**: Card-ul arăta 36.30 RON/apt dar totalul era 91.67 RON în loc de 100.74 RON.

**Cauza Root**: Calculul lui `stairAmount` folosea logica locală pentru apartment/person în loc să folosească `getRelevantAmount()`.

**Fix**: Extins condiția pentru a folosi `getRelevantAmount()` și pentru apartment/person.

### 4. Badge-uri pentru Diferențe Inconsistente
**Simptom**: Badge portocaliu cu background apărea și pentru consumption, nu doar pentru individual.

**Fix**: Badge portocaliu DOAR pentru individual, text roșu fără background pentru consumption.

## LECȚII ÎNVĂȚATE

### 1. Logică Duplicată = Bug-uri
În header existau 2 logici separate pentru determinarea `knowsExpectedAmount`. Când am updatat doar una, bug-ul a persistat.

**Soluție**: DRY principle - o singură sursă de adevăr.

### 2. Parametrii Funcțiilor Trebuie Să Fie Contextuali
`calculateApartmentAmount()` așteaptă suma TOTALĂ și TOATE apartamentele din context, nu suma deja calculată pentru scară.

**Regula**: Pasează întotdeauna parametrii din contextul ORIGINAL, nu din contextul CALCULAT.

### 3. Badge-uri vs Text - Semantică Vizuală
Badge-ul cu background sugerează "acțiune necesară":
- Badge portocaliu pentru individual → utilizatorul TREBUIE să corecteze manual
- Text roșu pentru consumption → diferența se distribuie AUTOMAT, nu necesită acțiune

**Regula**: Badge doar când utilizatorul trebuie să facă ceva.

### 4. Testing Multi-Context
Bug-ul cu sumele inconsistente apărea DOAR pe tab "Scară" cu participări diferite.

**Lecție**: Test pentru TOATE combinațiile: Tab Toate/Scară/Bloc × Sume asociație/bloc/scară × Participări 100%/mixte/excluse.

## FIȘIERE MODIFICATE

1. `src/components/expenses/shared/DifferenceCalculations.js`
   - `knowsExpectedAmount()`: Adăugat parametru `config`, extins logica pentru apartment/person

2. `src/components/expenses/ExpenseList.js`
   - Extins logica `knowsExpectedAmount` în header
   - Fix badge diferență - portocaliu DOAR pentru individual
   - Extins badge header pentru apartment/person/cotaParte
   - Extins calcul `stairAmount` cu `getRelevantAmount()`
   - Fix calcul `integralAmountForStair` - folosit context corect
   - Adăugat badge "Total distribuit" în card pentru apartment/person

## REZULTATE FINALE

✅ Badge-uri Consistente
✅ Calcule Corecte (suma per apartament identică în toate scările)
✅ UI Consistent (header și card afișează aceleași valori)

## CHECKLIST PENTRU VIITOR

Când adaugi/modifici logică de calcul sau afișare:
- [ ] Verifică că nu există logică duplicată
- [ ] Testează în toate contextele: Toate/Scară/Bloc
- [ ] Testează cu toate tipurile de distribuție
- [ ] Testează cu toate reception modes
- [ ] Testează cu participări diverse
- [ ] Verifică că header și card afișează aceleași valori
