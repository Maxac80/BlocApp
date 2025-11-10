# 🏠 PLAN IMPLEMENTARE: PORTAL PROPRIETARI - BlocApp v1.0

**Data:** 10 Noiembrie 2025
**Autor:** Claude Code
**Status:** Draft pentru review

---

## 📋 REZUMAT EXECUTIV

**Obiectiv:** Portal web complet funcțional pentru proprietari cu PWA mobile support
**Timeline Total:** 8-10 săptămâni (MVP complet)
**Effort:** ~320-400 ore development
**ROI:** CRITICAL - fără portal proprietari, produsul nu e competitiv

### ⚠️ IMPORTANTE NOTE:
1. **Multi-apartament support:** Proprietar poate deține mai multe apartamente la mai multe asociații
2. **Pre-requisite:** Finalizare & testing intensiv BlocApp (mai ales modul contoare) ÎNAINTE de portal
3. **Architecture:** System invitații (admin controlled), PWA pentru mobile, plată online dummy în MVP

---

## 🎯 FAZE IMPLEMENTARE

### **FAZA 0: PRE-REQUISITE & STABILIZARE BLOCAPP (Săptămâna -2 la 0) - 60-80h**

#### ⚠️ CRITIC: De făcut ÎNAINTE de portal proprietari

**Rationale:**
Modificările în BlocApp după lansarea portalului proprietari = **risc foarte mare**:
- Proprietarii văd bugs live → pierdere încredere instant
- Schema date modificată → migration complexity × 10
- Testing comprehensiv imposibil cu users live pe portal
- Bug fixes reactive vs. proactive = costuri 5x mai mari

#### Sprint 0.1: Finalizare Modul Contoare în BlocApp (30-40h)

**Status curent:** Implementare parțială (expenses.indexes există, dar UI/UX incomplet)

**Ce trebuie finalizat:**
1. **UI Admin: Configurare contoare per apartament**
   - Modal "Configurare Contoare" în ApartmentModal
   - Selectare tipuri contoare disponibile per apartament:
     - ☑️ Apă rece (nr. contoare: 1-3)
     - ☑️ Apă caldă (nr. contoare: 1-3)
     - ☑️ Gaz (nr. contoare: 1)
     - ☑️ Energie electrică (nr. contoare: 1-2)
   - Salvare în `apartments[].meters` structure:
     ```javascript
     meters: {
       "apa_rece": {
         enabled: true,
         count: 2,  // Nr. contoare
         counters: [
           { id: "counter_1", location: "Baie", serialNumber: "12345" },
           { id: "counter_2", location: "Bucătărie", serialNumber: "67890" }
         ]
       },
       "apa_calda": { enabled: true, count: 1, counters: [...] },
       "gaz": { enabled: false },
       "energie": { enabled: false }
     }
     ```

2. **UI Admin: Introducere indecși în ExpenseConfigModal**
   - Când admin configurează cheltuială "Pe consum":
     - Afișare listă apartamente
     - Pentru fiecare apartament cu contoare configurate:
       - Input index vechi (auto-populat din luna trecută)
       - Input index nou
       - Calcul live consum (nou - vechi)
       - Validare: index nou >= index vechi
       - Salvare în `currentSheet.expenses[expenseId].indexes[apartmentId]`

3. **Calcul automat distribuție după introducere indecși**
   - Trigger recalcul `useMaintenanceCalculation.calculateExpenseDistributionWithReweighting()`
   - Update `maintenanceTable` automat
   - Afișare live în MaintenanceView

4. **Validări & Error Handling**
   - Verificare indecși introduși pentru TOATE apartamentele cu contoare înainte de publicare
   - Warning dacă lipsesc indecși
   - Opțiune admin: "Folosește index anterior" (pentru apartamente goale/neplătitori)

**Deliverables:**
- ✅ Admin poate configura contoare per apartament
- ✅ Admin introduce indecși în ExpenseConfigModal
- ✅ Calcul automat consum și distribuție
- ✅ Validări complete înainte de publicare

#### Sprint 0.2: Testing Intensiv BlocApp (30-40h)

**Scope:** Testare exhaustivă TOATE flow-urile existente

**Test Cases Critice:**
1. **Flow complet setup asociație** (0 → primera lună publicată)
   - Creare asociație → Blocuri → Scări → Apartamente
   - Configurare cheltuieli (toate tipurile: per apartament, persoană, consum, cotă parte, individual)
   - Configurare contoare apartamente
   - Introducere indecși
   - Calcul tabel întreținere (verificare manuală corectitudine)
   - Publicare lună
   - Verificare snapshot immutable

2. **Flow luni ulterioare** (luna 2, 3, 4)
   - Creare sheet nou
   - Transfer automat solduri
   - Modificare cheltuieli (add/remove)
   - Plăți între luni
   - Sincronizare plăți cu tabel
   - Publicare + arhivare

3. **Flow participare specială cheltuieli**
   - Excludere apartament din cheltuială
   - Participare procentuală (50%, 75%)
   - Sumă fixă
   - Verificare recalcul distribuție

4. **Flow modul contoare**
   - Introducere indecși normali
   - Index nou < index vechi (eroare)
   - Lipsă indecși (warning)
   - Apartamente fără contoare configurate (skip)
   - Multiple contoare per apartament (sumă consumuri)

5. **Flow plăți & solduri**
   - Plată integrală
   - Plată parțială (restanțe → întreținere → penalități)
   - Plată pe lună arhivată (sync în timp real)
   - Verificare calcul sold rămas

6. **Edge cases:**
   - Apartament nou adăugat mid-month
   - Apartament șters (cu istoric)
   - Modificare nr. persoane mid-month
   - Depublicare lună (recreate sheet)
   - Navigare între luni archived

**Testing Matrix:**
- ✅ Chrome Desktop
- ✅ Firefox Desktop
- ✅ Safari Desktop (macOS)
- ✅ Chrome Mobile (Android)
- ✅ Safari Mobile (iOS)
- ✅ Edge Desktop

**Bug Tracking:**
- Document toate bug-urile găsite
- Prioritizare: Critical → High → Medium → Low
- Fix toate Critical & High ÎNAINTE de portal
- Medium & Low pot fi defer

**Performance Testing:**
- Load time dashboard (target: <2s)
- Calcul tabel întreținere (target: <1s pentru 100 apartamente)
- Firebase query optimization (verificare index-uri)

**Deliverables:**
- ✅ BlocApp testat exhaustiv pe toate device-uri
- ✅ Toate bug-uri Critical & High fixate
- ✅ Documentație bug-uri cunoscute (Medium/Low)
- ✅ Performance benchmarks recorded

---

### **FAZA 1: FUNDAȚII PORTAL (Săptămâna 1-3) - 120h**

#### Sprint 1.1: Sistem Autentificare & Invitații Multi-Apartament (50h)

**Ce implementăm:**

1. **Collection Firebase: Invitații cu suport multi-apartament**
   ```javascript
   /invitations/{inviteId}
   {
     apartmentId: string,
     associationId: string,
     apartmentNumber: string,  // Pentru display
     associationName: string,  // Pentru display
     email: string,
     token: string,  // UUID unic
     status: "pending" | "accepted" | "expired",
     sentAt: timestamp,
     expiresAt: timestamp,  // +7 zile
     sentBy: string,  // adminId
     acceptedAt: timestamp,
     acceptedBy: string  // userId (după accept)
   }
   ```

2. **Modificare Users: Array apartmente (nu single apartmentId)**
   ```javascript
   /users/{userId}
   {
     role: "owner" | "admin_asociatie" | "super_admin",
     profile: {
       // ❌ NU: apartmentId: string (single)
       // ✅ DA: apartments: Array
       apartments: [  // ← NOU: Array cu toate apartamentele
         {
           apartmentId: string,
           associationId: string,
           apartmentNumber: string,
           associationName: string,
           linkedAt: timestamp,
           invitationId: string  // Reference la invitația care a creat link-ul
         }
       ],
       // ... rest profile
     }
   }
   ```

3. **UI Admin: Panel Invitații în ApartmentModal**
   - Secțiune "Portal Proprietar" în ApartmentModal
   - Verificare email apartament (dacă lipsește, prompt completare)
   - Status indicator:
     - 🔴 "Fără cont" (nu există invitație/cont)
     - 🟡 "Invitație trimisă" (invitație pending)
     - 🟢 "Cont activ" (proprietar are cont legat)
   - Buton "Trimite Invitație" (disabled dacă lipsește email)
   - Buton "Re-trimite Invitație" (dacă expired/pending >7 zile)
   - Afișare info: Data trimis invitație, Data accept invitație

4. **Backend: Generare & Trimitere Invitații**
   - Function `generateInvitation(apartmentId, associationId, email)`
     - Creare document în `/invitations`
     - Token unic (crypto.randomUUID())
     - Expirare 7 zile
   - Function `sendInvitationEmail(inviteId)`
     - Template email professional (vezi secțiunea Email Templates)
     - Link signup: `https://proprietari.blocapp.ro/signup?token={token}`
     - Fallback manual: Copy link (dacă email service down)

5. **UI Signup Proprietar: Multi-step wizard**
   - **Step 1: Validare Token**
     - URL: `/signup?token={token}`
     - Verificare token valid & neexpirat
     - Afișare info apartament: "Creați cont pentru Apartamentul X, [Asociația Y]"
     - Dacă token invalid/expirat → Error page cu contact admin

   - **Step 2: Verificare Email Existent**
     - Check dacă email există deja în `/users`
     - **Dacă DA:**
       - Flow "Link apartament la cont existent"
       - Login cu email/password
       - După autentificare → auto-link apartament la `users[userId].profile.apartments[]`
       - Redirect la dashboard cu notificare success: "Apartamentul X a fost adăugat la contul tău"
     - **Dacă NU:**
       - Flow "Creare cont nou"
       - Continue la Step 3

   - **Step 3: Formular Date Personale** (doar dacă cont nou)
     - Email (read-only, din invitație)
     - Password (min 8 caractere, validări)
     - Confirm Password
     - Nume complet
     - Telefon (optional)
     - Checkbox "Accept termeni și condiții"

   - **Step 4: Confirmare & Creare Cont**
     - Rezumat: "Creați cont pentru apartamentul X, asociația Y"
     - Buton "Creează cont"
     - Procesare:
       - Creare user în Firebase Auth
       - Creare document `/users/{userId}` cu role `owner`
       - Add apartament în `profile.apartments[]`
       - Update invitație status: `accepted`
       - Send welcome email
     - Redirect la dashboard

6. **Firestore Security Rules pentru Proprietari**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // Users pot citi/modifica doar propriul document
       match /users/{userId} {
         allow read, update: if request.auth.uid == userId;
         allow create: if request.auth.uid == userId; // Signup
       }

       // Invitații: Citire doar dacă email match SAU user este admin
       match /invitations/{inviteId} {
         allow read: if request.auth != null &&
           (resource.data.email == request.auth.token.email ||
            request.auth.token.role in ['admin_asociatie', 'super_admin']);
         allow create, update: if request.auth.token.role in ['admin_asociatie', 'super_admin'];
       }

       // Sheets: Proprietari pot citi DOAR asociațiile unde au apartamente
       match /associations/{associationId}/sheets/{sheetId} {
         allow read: if request.auth != null &&
           (request.auth.token.role in ['admin_asociatie', 'super_admin'] ||
            (request.auth.token.role == 'owner' &&
             userHasApartmentInAssociation(associationId)));

         // Proprietari pot update DOAR pentru introducere indecși (Faza 2)
         allow update: if request.auth != null &&
           request.auth.token.role == 'owner' &&
           resource.data.status == 'in_progress' &&
           onlyUpdatesOwnMeterIndexes(associationId);
       }

       // Helper functions
       function userHasApartmentInAssociation(associationId) {
         let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
         let userApartments = userDoc.data.profile.apartments;
         return userApartments.hasAny([associationId]);
       }

       function onlyUpdatesOwnMeterIndexes(associationId) {
         // Complex validation - verifică că user modifică doar expenses[].indexes[propriul apartmentId]
         // TODO: Implementare detaliată în Faza 2
         return true;
       }
     }
   }
   ```

**Deliverables:**
- ✅ Admin poate trimite invitații email per apartament
- ✅ Proprietar se înregistrează cu link unic SAU link-uiește apartament la cont existent
- ✅ Suport multi-apartament: Un user poate avea N apartamente la M asociații
- ✅ Security rules active și testate
- ✅ Email templates professional

#### Sprint 1.2: Dashboard Proprietar & Selector Apartamente (50h)

**Ce implementăm:**

1. **Layout Principal Portal cu Selector Apartamente**

   **Header:**
   - Logo BlocApp (stânga)
   - Dropdown "Apartamentele Mele" (centru) - FEATURE CHEIE
     - Lista apartamente user (din `users[userId].profile.apartments[]`)
     - Pentru fiecare apartament:
       - 🏢 [Asociația X] - Apartamentul Y
       - Badge status plată: 🟢 "La zi" / 🟡 "Parțial" / 🔴 "Restanțe"
     - Click → Switch context la apartamentul selectat
   - User menu (dreapta):
     - Nume proprietar + avatar
     - Dropdown: Profil, Setări, Logout

   **Mobile (bottom navigation):**
   - Icon-uri: 🏠 Dashboard, 📋 Detalii, 📅 Istoric, 💳 Plăți, 👤 Profil
   - Selector apartamente → Sheet modal bottom (slide up)

2. **Context: ApartmentSelectorContext**
   ```javascript
   const ApartmentSelectorContext = createContext({
     selectedApartmentId: string,
     selectedApartment: object,  // Date complete apartament
     userApartments: array,      // Toate apartamentele user-ului
     switchApartment: (apartmentId) => {},
     loading: boolean
   });
   ```

3. **Dashboard Overview (per apartament selectat)**

   **Card Mare: Situație Curentă**
   - Header: "Apartamentul [Număr] - [Luna Curentă]"
   - Secțiune Solduri:
     ```
     ┌─────────────────────────────────────────┐
     │ 💰 Total de Plată: 450.00 lei           │
     │                                         │
     │ Restanțe:         150.00 lei  🔴       │
     │ Întreținere:      250.00 lei  🔵       │
     │ Penalități:        50.00 lei  🟠       │
     └─────────────────────────────────────────┘
     ```
   - Status badge: 🟢 "La zi" / 🟡 "Plătit parțial" / 🔴 "Restante"
   - Progress bar: % plătit din total (vizual appealing)

   **Quick Actions:**
   - 🔍 "Vezi Detalii Cheltuieli" → OwnerMaintenanceDetails
   - 📄 "Descarcă Rezumat PDF" → Generate PDF
   - 💳 "Plătește Online" → DUMMY (disabled, tooltip "În curând")
   - 📊 "Istoric Luni" → OwnerHistoricLuni

   **Card Secundar: La o privire**
   - 👥 Nr. persoane: X
   - 📏 Suprafață: Y mp
   - 💧 Consum apă (luna curentă): Z mc
   - 🔥 Consum gaz (dacă aplicabil): W mc

4. **Selector Luna (în toate view-urile)**
   - Dropdown luni disponibile:
     - Luni published (verde)
     - Luni archived (gri)
   - Label lună: Custom name dacă există, altfel "[Luna] [An]"
   - Indicator "Luna Curentă" (badge)
   - Navigare: Click → Reload date pentru luna selectată

5. **Empty States**
   - Dacă proprietar NU are apartamente legate:
     ```
     ┌─────────────────────────────────────────┐
     │         🏠                              │
     │   Nu aveți apartamente înregistrate     │
     │                                         │
     │   Contactați administratorul pentru     │
     │   a primi invitația de acces.          │
     │                                         │
     │   📧 Email: admin@asociatia.ro         │
     └─────────────────────────────────────────┘
     ```

   - Dacă lună curentă NU este publicată:
     ```
     ┌─────────────────────────────────────────┐
     │         ⏳                              │
     │   Luna [X] este în pregătire            │
     │                                         │
     │   Veți fi notificat când devine         │
     │   disponibilă.                          │
     └─────────────────────────────────────────┘
     ```

**Deliverables:**
- ✅ Layout responsiv desktop + mobile
- ✅ Selector apartamente funcțional (switch context)
- ✅ Dashboard cu situație curentă per apartament
- ✅ Quick actions (view detalii, download, istoric)
- ✅ Buton plată dummy placeholder
- ✅ Empty states pentru edge cases

#### Sprint 1.3: Integrare Date & Custom Hooks (20h)

**Ce implementăm:**

1. **Custom Hook: useOwnerPortal**
   ```javascript
   const useOwnerPortal = () => {
     const { currentUser } = useAuthEnhanced();
     const { selectedApartmentId } = useContext(ApartmentSelectorContext);

     // State
     const [loading, setLoading] = useState(true);
     const [currentSheet, setCurrentSheet] = useState(null);
     const [publishedSheet, setPublishedSheet] = useState(null);
     const [archivedSheets, setArchivedSheets] = useState([]);
     const [selectedMonth, setSelectedMonth] = useState(null);
     const [apartmentData, setApartmentData] = useState(null);
     const [maintenanceData, setMaintenanceData] = useState(null);
     const [paymentHistory, setPaymentHistory] = useState([]);

     // Load data per apartament selectat
     useEffect(() => {
       if (!selectedApartmentId) return;

       const apartmentInfo = currentUser.profile.apartments.find(
         apt => apt.apartmentId === selectedApartmentId
       );

       // Încarcă sheets pentru asociația apartamentului
       const unsubscribe = onSnapshot(
         collection(db, `associations/${apartmentInfo.associationId}/sheets`),
         (snapshot) => {
           const sheets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

           // Separă sheets
           const current = sheets.find(s => s.status === 'in_progress');
           const published = sheets.find(s => s.status === 'published');
           const archived = sheets.filter(s => s.status === 'archived')
             .sort((a, b) => b.archivedAt - a.archivedAt);

           setCurrentSheet(current);
           setPublishedSheet(published);
           setArchivedSheets(archived);

           // Default: Afișează published (sau current dacă nu există published)
           const defaultSheet = published || current;
           setSelectedMonth(defaultSheet?.monthYear);

           // Extrage date apartament din sheet snapshot
           const apartment = defaultSheet?.associationSnapshot?.apartments?.find(
             apt => apt.id === selectedApartmentId
           );
           setApartmentData(apartment);

           // Extrage maintenance data pentru apartament
           const maintenance = defaultSheet?.maintenanceTable?.find(
             row => row.apartmentId === selectedApartmentId
           );
           setMaintenanceData(maintenance);

           // Extrage payment history pentru apartament
           const payments = sheets.flatMap(sheet =>
             (sheet.payments || []).filter(p => p.apartmentId === selectedApartmentId)
           ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
           setPaymentHistory(payments);

           setLoading(false);
         }
       );

       return () => unsubscribe();
     }, [selectedApartmentId]);

     // Function: Switch luna
     const switchMonth = (monthYear) => {
       setSelectedMonth(monthYear);

       // Găsește sheet-ul pentru luna selectată
       const sheet = [currentSheet, publishedSheet, ...archivedSheets].find(
         s => s?.monthYear === monthYear
       );

       if (sheet) {
         // Update apartmentData și maintenanceData pentru luna selectată
         const apartment = sheet.associationSnapshot?.apartments?.find(
           apt => apt.id === selectedApartmentId
         );
         setApartmentData(apartment);

         const maintenance = sheet.maintenanceTable?.find(
           row => row.apartmentId === selectedApartmentId
         );
         setMaintenanceData(maintenance);
       }
     };

     return {
       loading,
       selectedMonth,
       apartmentData,
       maintenanceData,
       paymentHistory,
       availableMonths: [
         currentSheet?.monthYear,
         publishedSheet?.monthYear,
         ...archivedSheets.map(s => s.monthYear)
       ].filter(Boolean),
       switchMonth
     };
   };
   ```

2. **Helper Functions: Data Formatters**
   ```javascript
   // utils/ownerPortalHelpers.js

   export const formatCurrency = (amount) => {
     return new Intl.NumberFormat('ro-RO', {
       style: 'currency',
       currency: 'RON',
       minimumFractionDigits: 2
     }).format(amount);
   };

   export const getPaymentStatusBadge = (maintenanceData, paymentHistory) => {
     const totalDatorat = maintenanceData?.totalDatorat || 0;
     const totalPaid = paymentHistory.reduce((sum, p) => sum + p.total, 0);
     const remaining = totalDatorat - totalPaid;

     if (remaining <= 0) {
       return { label: "La zi", color: "green", icon: "✓" };
     } else if (totalPaid > 0) {
       return { label: "Plătit parțial", color: "orange", icon: "⚠" };
     } else {
       return { label: "Restanțe", color: "red", icon: "✗" };
     }
   };

   export const formatMonthYear = (monthYear) => {
     // "septembrie 2025" → "Sep 2025"
     const [month, year] = monthYear.split(' ');
     const monthShort = month.substring(0, 3).charAt(0).toUpperCase() +
                        month.substring(1, 3);
     return `${monthShort} ${year}`;
   };
   ```

**Deliverables:**
- ✅ useOwnerPortal hook funcțional
- ✅ Real-time data sync cu Firebase
- ✅ Filtrare automată per apartament selectat
- ✅ Switch luna funcțional
- ✅ Helper functions pentru formatting

---

### **FAZA 2: FEATURES CORE (Săptămâna 4-6) - 120h**

#### Sprint 2.1: Detalii Întreținere (Adaptare MaintenanceBreakdownModal) (30h)

**Ce implementăm:**

1. **Componentă OwnerMaintenanceDetails**
   - **Reuse 90% logic** din MaintenanceBreakdownModal
   - **Adaptări UI pentru owner:**

     **Header Section:**
     ```
     ┌─────────────────────────────────────────────┐
     │  📋 Detalii Întreținere                     │
     │  Apartamentul [X] - [Luna Y]                │
     │                                             │
     │  Total de plată: 450.00 lei                 │
     │  Status: 🟡 Plătit parțial                  │
     └─────────────────────────────────────────────┘
     ```

     **Breakdown Cheltuieli (listă cards mobile-friendly):**
     ```
     ┌─────────────────────────────────────────────┐
     │ 💧 Apă rece                    65.00 lei    │
     │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
     │ Tip: Pe consum                              │
     │ 📊 12.5 mc × 5.20 lei/mc                    │
     │                                             │
     │ ℹ️ Ce înseamnă "pe consum"?                 │
     │    Plătiți în funcție de cât ați consumat,  │
     │    măsurat prin contoarul dumneavoastră.    │
     └─────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────┐
     │ 🗑️ Salubritate                 50.00 lei    │
     │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
     │ Tip: Per persoană                           │
     │ 👥 4 persoane × 12.50 lei                   │
     └─────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────┐
     │ 🔧 Fond reparații              131.00 lei   │
     │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
     │ Tip: Cotă parte indiviză                    │
     │ 📏 65.5 mp × 2.00 lei/mp                    │
     │                                             │
     │ ℹ️ Ce este "cota parte indiviză"?           │
     │    Partea dumneavoastră din proprietatea    │
     │    comună, calculată proporțional cu        │
     │    suprafața apartamentului.                │
     └─────────────────────────────────────────────┘
     ```

2. **Explicații Interactive (Tooltips/Popovers)**
   - Icon "ℹ️" lângă termeni tehnici
   - Click → Popover cu explicație în limbaj simplu
   - Termeni de explicat:
     - "Cotă parte indiviză"
     - "Pe consum"
     - "Diferențe de consum" (pierderi/scurgeri)
     - "Participare specială"
     - "Restanțe"
     - "Penalități"

3. **Secțiune Participare Specială** (dacă aplicabil)
   - Afișare doar dacă apartamentul are participare specială
   ```
   ┌─────────────────────────────────────────────┐
   │ ⚠️ Participare Specială                     │
   │                                             │
   │ Pentru cheltuiala "Lift", apartamentul      │
   │ dumneavoastră este EXCLUS (parter).         │
   │ Nu plătiți această cheltuială.              │
   └─────────────────────────────────────────────┘
   ```

4. **Secțiune Diferențe/Ajustări** (dacă există)
   ```
   ┌─────────────────────────────────────────────┐
   │ 📊 Diferențe de Consum                      │
   │                                             │
   │ Apă rece: +2.50 lei                         │
   │                                             │
   │ ℹ️ Ce înseamnă asta?                        │
   │    Diferența reprezintă pierderi în rețea   │
   │    (scurgeri), repartizate proporțional     │
   │    între toate apartamentele.               │
   └─────────────────────────────────────────────┘
   ```

5. **Export PDF Rezumat**
   - Buton "Descarcă Rezumat PDF"
   - Template PDF curat (reuse receiptGenerator.js ca bază)
   - Include:
     - Header asociație (nume, CUI, adresă)
     - Informații apartament
     - Breakdown toate cheltuielile
     - Total de plată
     - Status plată
     - Footer: "Document generat automat - [Data]"

**Deliverables:**
- ✅ View detalii întreținere funcțional
- ✅ Explicații interactive pentru termeni tehnici
- ✅ UI mobile-friendly (cards în loc de table)
- ✅ Export PDF rezumat implementat

#### Sprint 2.2: Istoric Luni & Grafice Evoluție (25h)

**Ce implementăm:**

1. **View OwnerHistoricLuni**

   **Layout Desktop: Grid Cards**
   ```
   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
   │ 📅 Nov 2025    │ │ 📅 Oct 2025    │ │ 📅 Sep 2025    │
   │ ━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━ │
   │ Total: 450 lei  │ │ Total: 420 lei  │ │ Total: 400 lei  │
   │ 🟢 Plătit       │ │ 🟡 Parțial      │ │ 🔴 Restanțe     │
   │                 │ │                 │ │                 │
   │ [Vezi Detalii] │ │ [Vezi Detalii] │ │ [Vezi Detalii] │
   └─────────────────┘ └─────────────────┘ └─────────────────┘
   ```

   **Layout Mobile: Lista verticală**

   **Filtre:**
   - Dropdown "An": 2025, 2024, 2023, ...
   - Dropdown "Status": Toate, Plătite, Parțial, Restanțe

2. **Grafic Evoluție Costuri (Chart.js sau Recharts)**

   **Line Chart: Evoluție întreținere**
   - Axă X: Luni (ultimele 12 luni)
   - Axă Y: Total întreținere (lei)
   - Linie: Trend costuri
   - Puncte: Hover → tooltip cu detalii
   - Culori:
     - Verde: Sub medie anuală
     - Portocaliu: Aproape de medie
     - Roșu: Peste medie

   **Bar Chart: Breakdown pe categorii** (opțional, nice-to-have)
   - Axă X: Categorii (Utilități, Administrare, Reparații, etc.)
   - Axă Y: Sumă (lei)
   - Bars: Stacked per lună (ultimele 3 luni)

3. **Statistici Rezumat**
   ```
   ┌─────────────────────────────────────────────┐
   │ 📊 Statistici Anuale (2025)                 │
   │                                             │
   │ Întreținere medie:     425.00 lei/lună     │
   │ Luna cea mai scumpă:   Nov (450.00 lei)    │
   │ Luna cea mai ieftină:  Feb (380.00 lei)    │
   │ Total plătit anul:     4,250.00 lei        │
   └─────────────────────────────────────────────┘
   ```

**Deliverables:**
- ✅ Grid/Lista luni istorice
- ✅ Filtre an & status
- ✅ Grafic evoluție costuri (line chart)
- ✅ Statistici rezumat anuale

#### Sprint 2.3: Istoric Plăți & Chitanțe (30h)

**Ce implementăm:**

1. **View OwnerHistoricPlati**

   **Tabel Plăți (Desktop):**
   | Data | Nr. Chitanță | Restanțe | Întreținere | Penalități | Total | Acțiuni |
   |------|--------------|----------|-------------|------------|-------|---------|
   | 07.11.2025 | #1 | 20.00 | 200.00 | 10.00 | 230.00 | 📄 PDF |
   | 05.10.2025 | #2 | 0.00 | 180.00 | 0.00 | 180.00 | 📄 PDF |

   **Cards Plăți (Mobile):**
   ```
   ┌─────────────────────────────────────────────┐
   │ 💳 Plată #1 - 07.11.2025                    │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ Restanțe:        20.00 lei                  │
   │ Întreținere:    200.00 lei                  │
   │ Penalități:      10.00 lei                  │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ Total:          230.00 lei                  │
   │                                             │
   │ [📄 Descarcă Chitanța]                      │
   └─────────────────────────────────────────────┘
   ```

2. **Descărcare Chitanțe**
   - **Individual:** Buton per rând → Download PDF chitanță
   - **Batch:** Checkbox selectare multiple + Buton "Descarcă Selectate (ZIP)"
   - **Toate:** Buton "Descarcă Toate Chitanțele ([An])" → ZIP cu toate PDFs
   - Reuse `receiptGenerator.js` pentru generare PDF

3. **Filtre & Sortare**
   - Filtre:
     - Dropdown "An": 2025, 2024, ...
     - Dropdown "Luna": Toate, Ian, Feb, ...
   - Sortare:
     - Data (descrescător/crescător)
     - Sumă (mare → mică / mică → mare)

4. **Sumar Plăți**
   ```
   ┌─────────────────────────────────────────────┐
   │ 💰 Sumar Plăți                              │
   │                                             │
   │ Total plătit anul curent:   4,250.00 lei   │
   │ Total plătit all-time:     12,800.00 lei   │
   │ Nr. total plăți:                 24         │
   │                                             │
   │ 📊 Grafic plăți per lună                    │
   │ [Bar Chart: Ultimele 12 luni]               │
   └─────────────────────────────────────────────┘
   ```

5. **Empty State**
   ```
   ┌─────────────────────────────────────────────┐
   │          📭                                 │
   │   Nu aveți plăți înregistrate               │
   │                                             │
   │   Plățile efectuate vor apărea aici         │
   │   automat după înregistrare.                │
   └─────────────────────────────────────────────┘
   ```

**Deliverables:**
- ✅ Tabel/Cards istoric plăți
- ✅ Download chitanțe (individual, batch, toate)
- ✅ Filtre & sortare
- ✅ Sumar statistici plăți
- ✅ Empty state

#### Sprint 2.4: Introducere Indecși Contoare (35h)

**Ce implementăm:**

1. **View OwnerIntroduIndecsi**

   **Status Banner (top page):**
   ```
   ┌─────────────────────────────────────────────┐
   │ ⏰ Perioada de introducere indecși:         │
   │    1 - 25 Noiembrie 2025                    │
   │                                             │
   │ ⏳ Timp rămas: 12 zile                      │
   └─────────────────────────────────────────────┘
   ```

   **Sau (dacă deadline trecut):**
   ```
   ┌─────────────────────────────────────────────┐
   │ 🔒 Perioada de introducere indecși s-a      │
   │    încheiat pentru luna [Noiembrie 2025]    │
   │                                             │
   │    Indecșii vor fi introduși de              │
   │    administrator.                            │
   └─────────────────────────────────────────────┘
   ```

2. **Formular Contoare (Lista editabilă)**

   Pentru fiecare contor configurat în `apartmentData.meters`:
   ```
   ┌─────────────────────────────────────────────┐
   │ 💧 Apă Rece - Contor #1 (Baie)             │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ Serie contor: 12345678                      │
   │                                             │
   │ Index anterior (Oct 2025): 120.5 mc         │
   │                            (read-only)       │
   │                                             │
   │ Index curent (Nov 2025):  [______] mc       │
   │                           (input editable)   │
   │                                             │
   │ Consum calculat: 5.0 mc                     │
   │                  (calculat live)             │
   │                                             │
   │ ✅ Valori valide                            │
   │ (sau ❌ Index curent < anterior!)           │
   └─────────────────────────────────────────────┘
   ```

   **Validări în timp real:**
   - Index curent >= Index anterior (altfel, error roșu)
   - Consum > 100 mc → Warning: "Consum neobișnuit de mare, verificați!"
   - Consum = 0 mc → Warning: "Consum zero, sigur e corect?"

3. **Photo Upload Contoare (Optional, nice-to-have pentru Faza 3)**
   - Buton "📷 Adaugă Poză Contor" per contor
   - Upload imagine (Firebase Storage)
   - Preview thumbnail
   - Admin vede poze în ExpenseConfigModal (verificare)

4. **Backend: Salvare Indecși**

   **Flow:**
   - User introduce indecși → Click "Salvează"
   - Validare client-side (toate indecșii valide?)
   - API Call: `updateMeterIndexes(apartmentId, monthYear, indexes)`
     ```javascript
     // Update în currentSheet
     const sheetRef = doc(db, `associations/${associationId}/sheets/${currentSheetId}`);
     await updateDoc(sheetRef, {
       [`expenses.${expenseId}.indexes.${apartmentId}`]: {
         counter_1: { oldIndex: 120.5, newIndex: 125.5, consumption: 5.0 },
         counter_2: { oldIndex: 80.0, newIndex: 83.2, consumption: 3.2 }
       },
       [`metersSubmissions.${apartmentId}`]: {
         submittedAt: serverTimestamp(),
         submittedBy: userId
       }
     });
     ```

   - Trigger: Recalcul automat întreținere (backend function)
     - useMaintenanceCalculation.calculateExpenseDistributionWithReweighting()
     - Update maintenanceTable în sheet

   - Notificare admin:
     - Email: "Proprietar [Nume] a introdus indecșii pentru Apartamentul [X]"
     - Badge în MaintenanceView: "🟢 Indecși introduși" lângă apartament

5. **Indicator Progres Admin (în MaintenanceView)**
   - Banner top: "Indecși introduși: 15/50 apartamente (30%)"
   - Lista apartamente:
     - 🟢 Apartament 1 (Indecși introduși)
     - 🔴 Apartament 2 (Lipsă indecși)
     - 🟡 Apartament 3 (Indecși manual de admin)
   - Filtre: "Arată doar apartamente fără indecși"

6. **Deadline Management (Admin Settings)**
   - Secțiune nouă în SettingsView: "Setări Contoare"
     - Input: "Deadline introducere indecși" (ziua lunii, 1-28)
     - Default: 25
     - Salvare în `associations/{id}.settings.metersDeadline`
   - Logică deadline:
     - `currentSheet.metersDeadline = new Date(year, month, deadlineDay, 23, 59, 59)`
     - După deadline → Proprietarii nu mai pot edita (UI locked)
     - Admin poate ÎNTOTDEAUNA edita (override)

**Deliverables:**
- ✅ View introducere indecși funcțional
- ✅ Validări în timp real (index curent >= anterior)
- ✅ Salvare în Firebase cu trigger recalcul
- ✅ Notificare admin când proprietar introduce indecși
- ✅ Deadline sistem cu lock automat
- ✅ Indicator progres în admin panel

---

### **FAZA 3: ENHANCED & POLISH (Săptămâna 7-8) - 80h**

#### Sprint 3.1: Profil Proprietar & Setări (25h)

**Ce implementăm:**

1. **View OwnerProfil**

   **Secțiune "Datele Mele" (Editable):**
   ```
   ┌─────────────────────────────────────────────┐
   │ 👤 Informații Personale                     │
   │                                             │
   │ Nume complet: [__________] (editable)       │
   │ Email:        [__________] (editable)       │
   │ Telefon:      [__________] (editable)       │
   │ Adresă:       [__________] (opțional)       │
   │                                             │
   │ [Salvează Modificări]                       │
   └─────────────────────────────────────────────┘
   ```

   **Secțiune "Apartamentele Mele" (Lista cu detalii):**
   ```
   ┌─────────────────────────────────────────────┐
   │ 🏢 Apartament 12, Bloc A, Scara 1           │
   │    Asociația "Str. Florilor nr. 10"         │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ Suprafață:      65.5 mp (read-only)         │
   │ Cotă parte:     0.0234 (read-only)          │
   │ Număr persoane: [_4_] (editable cu notif)   │
   │ Tip:            2 camere (read-only)        │
   │ Încălzire:      Termoficare (read-only)     │
   │                                             │
   │ [Solicită Modificare Date Apartament]       │
   └─────────────────────────────────────────────┘
   ```

   **Logic modificare nr. persoane:**
   - Proprietar poate edita "Număr persoane" direct
   - La salvare → Update `apartmentData.persons` în sheet CURENT (in_progress only)
   - Trigger recalcul automat întreținere
   - Notificare email admin: "Proprietar [X] a modificat nr. persoane din 4 în 5"

   **Cerere modificare alte date:**
   - Buton "Solicită Modificare Date Apartament"
   - Modal formular:
     - Dropdown "Ce doriți să modificați?": Suprafață / Tip apartament / Sursă încălzire
     - Textarea "Detalii cerere"
     - Buton "Trimite Cerere"
   - Creare document în `/associations/{id}/changeRequests`
   - Notificare admin în Dashboard (badge "🔔 Cereri noi")

2. **Secțiune "Setări Cont"**
   ```
   ┌─────────────────────────────────────────────┐
   │ ⚙️ Setări Cont                              │
   │                                             │
   │ Notificări Email:                           │
   │  ☑ Lună nouă publicată                      │
   │  ☑ Reminder plată (cu 5 zile înainte)      │
   │  ☐ Newsletter asociație                     │
   │                                             │
   │ Notificări Push (PWA):                      │
   │  ☑ Activează notificări push                │
   │                                             │
   │ Limbă:                                      │
   │  [Română ▼] (future: EN, HU, DE)           │
   │                                             │
   │ [Salvează Setări]                           │
   └─────────────────────────────────────────────┘
   ```

3. **Secțiune "Securitate"**
   ```
   ┌─────────────────────────────────────────────┐
   │ 🔒 Securitate                               │
   │                                             │
   │ Schimbă Parola:                             │
   │  Parola curentă: [__________]               │
   │  Parolă nouă:    [__________]               │
   │  Confirmă:       [__________]               │
   │  [Schimbă Parola]                           │
   │                                             │
   │ Autentificare în doi pași (2FA):            │
   │  🔴 Dezactivat                              │
   │  [Activează 2FA] (future feature)           │
   └─────────────────────────────────────────────┘
   ```

**Deliverables:**
- ✅ Profil editable (date contact)
- ✅ Modificare nr. persoane cu recalcul automat
- ✅ Sistem cereri modificare date apartament
- ✅ Setări notificări (infrastructure pentru Faza 4)
- ✅ Change password funcțional

#### Sprint 3.2: PWA Setup & Mobile Optimization (30h)

**Ce implementăm:**

1. **PWA Configuration Files**

   **manifest.json:**
   ```json
   {
     "name": "BlocApp - Portal Proprietari",
     "short_name": "BlocApp",
     "description": "Gestionează întreținerea apartamentului tău",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#3b82f6",
     "orientation": "portrait",
     "icons": [
       {
         "src": "/icons/icon-72x72.png",
         "sizes": "72x72",
         "type": "image/png",
         "purpose": "any maskable"
       },
       {
         "src": "/icons/icon-96x96.png",
         "sizes": "96x96",
         "type": "image/png"
       },
       {
         "src": "/icons/icon-128x128.png",
         "sizes": "128x128",
         "type": "image/png"
       },
       {
         "src": "/icons/icon-144x144.png",
         "sizes": "144x144",
         "type": "image/png"
       },
       {
         "src": "/icons/icon-152x152.png",
         "sizes": "152x152",
         "type": "image/png"
       },
       {
         "src": "/icons/icon-192x192.png",
         "sizes": "192x192",
         "type": "image/png"
       },
       {
         "src": "/icons/icon-384x384.png",
         "sizes": "384x384",
         "type": "image/png"
       },
       {
         "src": "/icons/icon-512x512.png",
         "sizes": "512x512",
         "type": "image/png"
       }
     ],
     "screenshots": [
       {
         "src": "/screenshots/dashboard.png",
         "sizes": "540x720",
         "type": "image/png"
       }
     ]
   }
   ```

   **service-worker.js (cu Workbox):**
   - Cache-first strategy pentru static assets (JS, CSS, images)
   - Network-first strategy pentru API calls (Firebase)
   - Offline fallback page
   - Background sync pentru acțiuni offline (future)

2. **Install Prompt (Add to Home Screen)**
   ```javascript
   // src/utils/pwaHelpers.js

   let deferredPrompt;

   window.addEventListener('beforeinstallprompt', (e) => {
     e.preventDefault();
     deferredPrompt = e;
     // Afișează banner custom "Instalează aplicația"
     showInstallBanner();
   });

   export const installPWA = async () => {
     if (!deferredPrompt) return false;

     deferredPrompt.prompt();
     const { outcome } = await deferredPrompt.userChoice;

     if (outcome === 'accepted') {
       console.log('User installed PWA');
     }

     deferredPrompt = null;
     return outcome === 'accepted';
   };
   ```

   **UI Install Banner (bottom sheet):**
   ```
   ┌─────────────────────────────────────────────┐
   │ 📱 Instalează BlocApp pe telefon            │
   │                                             │
   │ Acces rapid, notificări, funcționează       │
   │ și offline!                                 │
   │                                             │
   │ [Instalează]  [Mai târziu]                  │
   └─────────────────────────────────────────────┘
   ```

3. **Push Notifications Setup (FCM - Firebase Cloud Messaging)**

   **firebase-messaging-sw.js:**
   ```javascript
   importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js');
   importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-messaging-compat.js');

   firebase.initializeApp({
     // Firebase config
   });

   const messaging = firebase.messaging();

   messaging.onBackgroundMessage((payload) => {
     const notificationTitle = payload.notification.title;
     const notificationOptions = {
       body: payload.notification.body,
       icon: '/icons/icon-192x192.png',
       badge: '/icons/badge-72x72.png',
       data: payload.data
     };

     self.registration.showNotification(notificationTitle, notificationOptions);
   });
   ```

   **Request Permission Flow:**
   - În OwnerProfil → Setări → "Activează notificări push"
   - Request permission: `Notification.requestPermission()`
   - Get FCM token: `messaging.getToken()`
   - Salvare token în `users/{userId}.profile.fcmToken`

4. **Mobile UI Optimization**

   **Bottom Navigation (Mobile only):**
   ```
   ┌─────────────────────────────────────────────┐
   │                                             │
   │          [Content Area]                     │
   │                                             │
   ├─────────────────────────────────────────────┤
   │  🏠      📋       📅       💳       👤      │
   │Dashboard Detalii Istoric  Plăți   Profil   │
   └─────────────────────────────────────────────┘
   ```

   **Responsive Design Checklist:**
   - ✅ Touch targets min 44×44px (iOS guidelines)
   - ✅ Swipe gestures:
     - Swipe left/right în OwnerHistoricLuni → Navighează luni
     - Pull-to-refresh → Reload date
   - ✅ Tables → Cards pe mobile (width < 768px)
   - ✅ Forms: Input type corecte (type="email", type="tel", type="number")
   - ✅ Viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`
   - ✅ No horizontal scroll
   - ✅ Font sizes min 16px (prevent iOS auto-zoom on focus)

5. **Offline Support**

   **Offline Indicator:**
   ```
   ┌─────────────────────────────────────────────┐
   │ 📡 Offline - Unele funcții nu sunt         │
   │    disponibile fără conexiune internet.    │
   └─────────────────────────────────────────────┘
   ```

   **Cached Data:**
   - Ultimele 3 luni vizualizate (maintenanceTable, payments)
   - Profil user
   - Static assets (JS, CSS, images)

   **Actions Disabled Offline:**
   - Introducere indecși contoare (necesită server sync)
   - Modificare profil
   - Download PDF-uri noi (cele cached rămân accesibile)

**Deliverables:**
- ✅ PWA instalabilă (manifest.json, service worker)
- ✅ Install prompt custom
- ✅ Push notifications infrastructure (FCM setup)
- ✅ Bottom navigation mobile
- ✅ Touch-friendly UI (44px targets)
- ✅ Swipe gestures pentru navigare
- ✅ Offline support (cached data)
- ✅ Responsive toate view-urile (mobile/tablet/desktop)

#### Sprint 3.3: Testing, Bug Fixes & Polish (25h)

**Ce implementăm:**

1. **Comprehensive Testing Plan**

   **Functional Testing (Manual):**

   | Test Case | Steps | Expected Result | Status |
   |-----------|-------|-----------------|--------|
   | **Signup Flow** | 1. Admin trimite invitație<br>2. Proprietar click link<br>3. Complete form<br>4. Creare cont | Cont creat, apartament linked, redirect dashboard | ⬜ |
   | **Multi-apartament** | 1. Login proprietar cu 3 apartamente<br>2. Switch între apartamente<br>3. Verificare date corecte per apartament | Date corecte, fără mix-up | ⬜ |
   | **Detalii întreținere** | 1. Deschide detalii<br>2. Verificare calcule<br>3. Export PDF | Calcule corecte, PDF generat | ⬜ |
   | **Istoric luni** | 1. Navigare între 6 luni<br>2. Verificare date per lună<br>3. Grafic afișat corect | Date locked per lună, grafic funcțional | ⬜ |
   | **Istoric plăți** | 1. Vezi listă plăți<br>2. Download chitanță<br>3. Download batch (ZIP) | PDFs corecte, ZIP generat | ⬜ |
   | **Introducere indecși** | 1. Introdu indecși valizi<br>2. Introdu indecși invalizi (curent < anterior)<br>3. Salvează<br>4. Verificare recalcul | Validare corectă, recalcul automat | ⬜ |
   | **Profil & setări** | 1. Modifică date contact<br>2. Schimbă nr. persoane<br>3. Schimbă parolă | Update corect, notificări trimise | ⬜ |
   | **PWA Install** | 1. Visit pe mobile<br>2. Banner "Add to Home"<br>3. Instalează<br>4. Launch PWA | PWA instalată, funcționează standalone | ⬜ |
   | **Offline mode** | 1. Instalează PWA<br>2. Vezi date cached<br>3. Dezactivează internet<br>4. Relansează PWA | Date cached vizibile, actions disabled | ⬜ |

   **Cross-Browser Testing:**
   - Desktop:
     - ✅ Chrome 120+ (latest)
     - ✅ Firefox 120+ (latest)
     - ✅ Safari 17+ (macOS)
     - ✅ Edge 120+ (latest)
   - Mobile:
     - ✅ Chrome Mobile (Android 11+)
     - ✅ Safari Mobile (iOS 15+)

   **Device Testing Matrix:**
   - 📱 iPhone 13/14/15 (Safari)
   - 📱 Samsung Galaxy S21/S22/S23 (Chrome)
   - 📱 Google Pixel 6/7/8 (Chrome)
   - 📟 iPad (Safari, landscape/portrait)
   - 💻 Laptop (Chrome, Firefox, Safari, Edge)
   - 🖥️ Desktop 1920×1080, 2560×1440

2. **Performance Testing**

   **Metrics Target (Lighthouse):**
   - Performance: >90
   - Accessibility: >95
   - Best Practices: >95
   - SEO: >90
   - PWA: ✅ All checks

   **Load Time Targets:**
   - First Contentful Paint: <1.5s
   - Largest Contentful Paint: <2.5s
   - Time to Interactive: <3.5s
   - Total Blocking Time: <200ms

   **Optimization Tasks:**
   - ✅ Lazy loading components (React.lazy + Suspense)
   - ✅ Image optimization (WebP, responsive images)
   - ✅ Code splitting (per route)
   - ✅ Firebase query optimization:
     - Index-uri Firestore pentru queries complexe
     - Limit queries (pagination pentru istoric luni/plăți)
   - ✅ Bundle size reduction:
     - Tree shaking
     - Remove unused dependencies
     - Dynamic imports pentru charts (Chart.js/Recharts)

3. **Bug Tracking & Prioritization**

   **Bug Report Template:**
   ```markdown
   ### Bug ID: #001
   **Severity:** Critical / High / Medium / Low
   **Component:** Dashboard / Detalii / Istoric / Plăți / Profil / Contoare
   **Description:** [Descriere clară]
   **Steps to Reproduce:**
   1. ...
   2. ...
   **Expected:** [Comportament așteptat]
   **Actual:** [Comportament actual]
   **Browser/Device:** Chrome 120 / iPhone 14
   **Screenshot:** [Attach]
   **Status:** Open / In Progress / Fixed / Closed
   ```

   **Prioritization:**
   - **Critical:** Blocker pentru lansare (data loss, crash, security)
   - **High:** Funcționalitate core nu funcționează corect
   - **Medium:** Bug minor, workaround există
   - **Low:** UI glitch, nice-to-have

4. **UI/UX Polish**

   **Visual Polish Checklist:**
   - ✅ Consistent spacing (Tailwind spacing scale)
   - ✅ Consistent colors (design system)
   - ✅ Consistent typography (font sizes, weights)
   - ✅ Loading states (skeletons, spinners)
   - ✅ Empty states (illustrations + helpful text)
   - ✅ Error states (friendly messages + actions)
   - ✅ Success feedback (toasts, checkmarks)
   - ✅ Hover states (desktop)
   - ✅ Active states (mobile tap)
   - ✅ Focus states (keyboard navigation)
   - ✅ Animations (subtle, performant, max 200-300ms)

   **Micro-interactions:**
   - ✅ Button press feedback (scale down 0.95)
   - ✅ Card hover lift (shadow elevation)
   - ✅ Smooth transitions (opacity, transform)
   - ✅ Swipe gestures feedback (rubber band effect)
   - ✅ Pull-to-refresh indicator

5. **Accessibility (A11y)**

   **WCAG 2.1 Level AA Compliance:**
   - ✅ Color contrast min 4.5:1 (text)
   - ✅ Color contrast min 3:1 (UI components)
   - ✅ Focus visible (outline)
   - ✅ Keyboard navigation (Tab, Enter, Esc)
   - ✅ Screen reader support:
     - Semantic HTML (header, nav, main, section, article)
     - ARIA labels (aria-label, aria-describedby)
     - Alt text for images
     - Form labels
   - ✅ No flashing content (epilepsy risk)
   - ✅ Resize text 200% (layout nu se sparge)

**Deliverables:**
- ✅ Portal testat exhaustiv (functional + cross-browser + device)
- ✅ Performance optimizată (Lighthouse >90)
- ✅ Toate bug-uri Critical & High fixate
- ✅ UI/UX polished (consistent, smooth)
- ✅ Accessibility WCAG 2.1 AA compliant
- ✅ Documentație bug-uri cunoscute (Medium/Low)

---

## 📧 EMAIL TEMPLATES

### 1. Email Invitație Signup

**Subiect:** Invitație Portal Proprietari - [Nume Asociație]

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px; text-align: center;">
    <h1 style="color: white; margin: 0;">🏠 BlocApp</h1>
    <p style="color: white; font-size: 18px;">Portal Proprietari</p>
  </div>

  <div style="padding: 40px; background: #ffffff;">
    <h2 style="color: #1f2937;">Bună ziua, [Nume Proprietar]!</h2>

    <p style="color: #4b5563; line-height: 1.6;">
      Ați fost invitat să accesați <strong>portalul online</strong> pentru apartamentul
      dumneavoastră din <strong>[Nume Asociație]</strong>, Apartamentul <strong>[Număr]</strong>.
    </p>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: bold;">
        Prin portal puteți:
      </p>
      <ul style="color: #4b5563; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>✓ Vedea detaliat cheltuielile lunare</li>
        <li>✓ Consulta istoricul plăților</li>
        <li>✓ Descărca chitanțe</li>
        <li>✓ Introduce indecșii contoarelor</li>
        <li>✓ Urmări evoluția costurilor</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <a href="[Link Signup cu Token]"
         style="background: #3b82f6; color: white; padding: 15px 40px;
                text-decoration: none; border-radius: 8px; display: inline-block;
                font-weight: bold; font-size: 16px;">
        Creează Contul Tău
      </a>
    </div>

    <p style="color: #ef4444; text-align: center; font-size: 14px;">
      ⏰ Link-ul expiră în <strong>7 zile</strong>.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">

    <p style="color: #6b7280; font-size: 14px;">
      Cu respect,<br>
      <strong>[Nume Administrator]</strong><br>
      [Nume Asociație]
    </p>

    <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
      Dacă nu v-ați așteptat la acest email, ignorați-l. Contul nu va fi creat
      până nu accesați link-ul de mai sus.
    </p>
  </div>

  <div style="background: #f9fafb; padding: 20px; text-align: center;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      © 2025 BlocApp. Toate drepturile rezervate.
    </p>
  </div>
</body>
</html>
```

### 2. Email Welcome (după creare cont)

**Subiect:** Bine ai venit la BlocApp! 🎉

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
    <h1 style="color: white; margin: 0;">🎉 Bine ai venit!</h1>
  </div>

  <div style="padding: 40px; background: #ffffff;">
    <h2 style="color: #1f2937;">Salut, [Nume]!</h2>

    <p style="color: #4b5563; line-height: 1.6;">
      Contul tău BlocApp a fost creat cu succes! Acum ai acces complet la
      informațiile despre apartamentul tău.
    </p>

    <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46;">
        <strong>Apartamentul tău:</strong><br>
        🏢 [Nume Asociație]<br>
        🏠 Apartamentul [Număr]
      </p>
    </div>

    <h3 style="color: #1f2937; margin-top: 30px;">Pașii următori:</h3>

    <ol style="color: #4b5563; line-height: 1.8;">
      <li>Explorează dashboard-ul pentru a vedea situația curentă</li>
      <li>Consultă detaliile cheltuielilor lunare</li>
      <li>Completează-ți profilul (opțional)</li>
      <li>Activează notificările pentru a fi la curent</li>
    </ol>

    <div style="text-align: center; margin: 40px 0;">
      <a href="https://proprietari.blocapp.ro"
         style="background: #3b82f6; color: white; padding: 15px 40px;
                text-decoration: none; border-radius: 8px; display: inline-block;
                font-weight: bold; font-size: 16px;">
        Accesează Portalul
      </a>
    </div>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: bold;">
        💡 Ai nevoie de ajutor?
      </p>
      <p style="color: #4b5563; margin: 0; line-height: 1.6;">
        Vizitează secțiunea <strong>Ajutor</strong> din portal sau contactează
        administratorul la <a href="mailto:[Email Admin]" style="color: #3b82f6;">[Email Admin]</a>
      </p>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      Cu respect,<br>
      <strong>Echipa BlocApp</strong>
    </p>
  </div>

  <div style="background: #f9fafb; padding: 20px; text-align: center;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      © 2025 BlocApp. Toate drepturile rezervate.
    </p>
  </div>
</body>
</html>
```

### 3. Email Notificare Lună Nouă Publicată

**Subiect:** 📋 [Luna] 2025 - Detalii întreținere disponibile

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px; text-align: center;">
    <h1 style="color: white; margin: 0;">📋 Lună Nouă Publicată</h1>
  </div>

  <div style="padding: 40px; background: #ffffff;">
    <h2 style="color: #1f2937;">Bună ziua, [Nume]!</h2>

    <p style="color: #4b5563; line-height: 1.6;">
      Detaliile de întreținere pentru <strong>[Luna] 2025</strong> sunt acum disponibile
      pentru apartamentul dumneavoastră.
    </p>

    <div style="background: #f3f4f6; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
        Total de plată pentru [Luna]:
      </p>
      <p style="color: #1f2937; font-size: 36px; font-weight: bold; margin: 0;">
        [Total] lei
      </p>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <table style="width: 100%; text-align: left; color: #4b5563; font-size: 14px;">
          <tr>
            <td>Restanțe:</td>
            <td style="text-align: right; font-weight: bold;">[Restante] lei</td>
          </tr>
          <tr>
            <td>Întreținere:</td>
            <td style="text-align: right; font-weight: bold;">[Intretinere] lei</td>
          </tr>
          <tr>
            <td>Penalități:</td>
            <td style="text-align: right; font-weight: bold;">[Penalitati] lei</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <a href="https://proprietari.blocapp.ro/detalii?month=[Luna]"
         style="background: #3b82f6; color: white; padding: 15px 40px;
                text-decoration: none; border-radius: 8px; display: inline-block;
                font-weight: bold; font-size: 16px;">
        Vezi Detaliile Complete
      </a>
    </div>

    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #78350f; line-height: 1.6;">
        <strong>⏰ Reminder:</strong> Termenul de plată este <strong>[Zi] [Luna]</strong>.
        Plătiți la timp pentru a evita penalitățile.
      </p>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      Cu respect,<br>
      <strong>[Nume Administrator]</strong><br>
      [Nume Asociație]
    </p>
  </div>

  <div style="background: #f9fafb; padding: 20px; text-align: center;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      © 2025 BlocApp. Toate drepturile rezervate.<br>
      <a href="https://proprietari.blocapp.ro/setari" style="color: #3b82f6; text-decoration: none;">
        Setări Notificări
      </a>
    </p>
  </div>
</body>
</html>
```

### 4. Email Notificare Admin - Indecși Introduși

**Subiect:** 🟢 [Nume Proprietar] a introdus indecșii pentru Apartamentul [X]

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #f3f4f6; padding: 40px;">
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">
      🟢 Indecși Contoare Introduși
    </h2>

    <p style="color: #4b5563; line-height: 1.6;">
      Proprietarul <strong>[Nume Proprietar]</strong> a introdus indecșii contoarelor
      pentru <strong>Apartamentul [Număr]</strong> în luna <strong>[Luna]</strong>.
    </p>

    <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="color: #1f2937; margin: 0 0 15px 0;">Indecși Introduși:</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f9fafb;">
          <th style="padding: 10px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase;">Contor</th>
          <th style="padding: 10px; text-align: right; color: #6b7280; font-size: 12px; text-transform: uppercase;">Index Anterior</th>
          <th style="padding: 10px; text-align: right; color: #6b7280; font-size: 12px; text-transform: uppercase;">Index Nou</th>
          <th style="padding: 10px; text-align: right; color: #6b7280; font-size: 12px; text-transform: uppercase;">Consum</th>
        </tr>
        <tr>
          <td style="padding: 10px; border-top: 1px solid #e5e7eb; color: #1f2937;">Apă Rece #1</td>
          <td style="padding: 10px; border-top: 1px solid #e5e7eb; text-align: right; color: #4b5563;">120.5 mc</td>
          <td style="padding: 10px; border-top: 1px solid #e5e7eb; text-align: right; color: #4b5563;">125.5 mc</td>
          <td style="padding: 10px; border-top: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #10b981;">5.0 mc</td>
        </tr>
        <!-- Repetă pentru fiecare contor -->
      </table>
    </div>

    <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46; font-size: 14px;">
        ✓ Tabelul de întreținere a fost recalculat automat.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://admin.blocapp.ro/intretinere"
         style="background: #3b82f6; color: white; padding: 12px 30px;
                text-decoration: none; border-radius: 8px; display: inline-block;
                font-weight: bold; font-size: 14px;">
        Vezi Tabelul de Întreținere
      </a>
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
      Data introducerii: [Data și Ora]<br>
      Progres: [X/Y] apartamente au introdus indecșii pentru [Luna]
    </p>
  </div>
</body>
</html>
```

---

## 📱 DESIGN MOCKUPS (Descrieri pentru Designer)

### 1. Dashboard Mobile (Portrait)

```
┌───────────────────────────────────┐
│ ☰  BlocApp          [Nume] ▼  👤│ <- Header sticky
├───────────────────────────────────┤
│                                   │
│  🏢 Apartamentul 12               │ <- Selector apartamente
│     Str. Florilor nr. 10          │    (dropdown card)
│                                   │
│  ┌─────────────────────────────┐ │
│  │ 💰 Total de Plată           │ │
│  │                             │ │
│  │      450.00 lei             │ │ <- Card principal
│  │                             │ │    (gradient background)
│  │ 🟡 Plătit parțial           │ │
│  │ [━━━━━━━░░░░] 70%          │ │
│  └─────────────────────────────┘ │
│                                   │
│  Restanțe:       150.00 lei  🔴  │
│  Întreținere:    250.00 lei  🔵  │ <- Breakdown solduri
│  Penalități:      50.00 lei  🟠  │    (rows cu icons)
│                                   │
│  ┌─────────────┐ ┌─────────────┐ │
│  │ 🔍 Vezi     │ │ 📄 Descarcă │ │ <- Quick actions
│  │   Detalii   │ │    PDF      │ │    (grid 2 col)
│  └─────────────┘ └─────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ │
│  │ 💳 Plătește │ │ 📊 Istoric  │ │
│  │  (Curând)   │ │    Luni     │ │
│  └─────────────┘ └─────────────┘ │
│                                   │
│  ┌─────────────────────────────┐ │
│  │ 📋 La o privire             │ │
│  │                             │ │ <- Card secundar
│  │ 👥 Persoane:  4             │ │    (info quick)
│  │ 📏 Suprafață: 65.5 mp       │ │
│  │ 💧 Consum apă: 12.5 mc      │ │
│  └─────────────────────────────┘ │
│                                   │
│  [Luna curentă: Nov 2025 ▼]      │ <- Selector lună
│                                   │
├───────────────────────────────────┤
│ 🏠   📋   📅   💳   👤            │ <- Bottom nav (sticky)
│Dashboard Detalii Istoric Plăți   │    Profil
└───────────────────────────────────┘
```

### 2. Detalii Întreținere Mobile

```
┌───────────────────────────────────┐
│ ← Detalii Întreținere        ⋯   │ <- Header cu back + menu
├───────────────────────────────────┤
│ Apartamentul 12 | Nov 2025        │
│ Total: 450.00 lei                 │
│                                   │
│ ▼ Cheltuieli (8) ────────────────│ <- Collapsible section
│                                   │
│ ┌─────────────────────────────┐  │
│ │ 💧 Apă rece                 │  │
│ │                             │  │ <- Card per cheltuială
│ │           65.00 lei         │  │    (expandable)
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│ │ Tip: Pe consum              │  │
│ │ 📊 12.5 mc × 5.20 lei/mc    │  │
│ │                             │  │
│ │ ℹ️ Ce înseamnă?             │  │ <- Explicație tooltip
│ └─────────────────────────────┘  │
│                                   │
│ ┌─────────────────────────────┐  │
│ │ 🗑️ Salubritate              │  │
│ │           50.00 lei         │  │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│ │ Tip: Per persoană           │  │
│ │ 👥 4 pers × 12.50 lei       │  │
│ └─────────────────────────────┘  │
│                                   │
│ [Swipe up pentru mai multe]      │ <- Scroll indicator
│                                   │
│ ┌─────────────────────────────┐  │
│ │ [📄 Descarcă Rezumat PDF]   │  │ <- Action button
│ └─────────────────────────────┘  │
│                                   │
├───────────────────────────────────┤
│ 🏠   📋   📅   💳   👤            │
└───────────────────────────────────┘
```

### 3. Introducere Indecși Mobile

```
┌───────────────────────────────────┐
│ ← Introducere Indecși        ⋯   │
├───────────────────────────────────┤
│ ⏰ Deadline: 25 Nov 2025          │
│    Timp rămas: 12 zile            │ <- Banner deadline
│                                   │
│ Apartamentul 12 | Nov 2025        │
│                                   │
│ ┌─────────────────────────────┐  │
│ │ 💧 Apă Rece - Contor #1     │  │
│ │    (Baie)                   │  │
│ │                             │  │
│ │ Serie: 12345678             │  │
│ │                             │  │
│ │ Index anterior (Oct):       │  │
│ │ 120.5 mc                    │  │ <- Read-only (grey)
│ │                             │  │
│ │ Index curent (Nov):         │  │
│ │ [   125.5   ] mc            │  │ <- Input (large, touch)
│ │                             │  │
│ │ Consum: 5.0 mc ✅           │  │ <- Calculat live + validare
│ │                             │  │
│ │ [📷 Adaugă Poză] (opțional) │  │ <- Upload (future)
│ └─────────────────────────────┘  │
│                                   │
│ ┌─────────────────────────────┐  │
│ │ 💧 Apă Rece - Contor #2     │  │
│ │    (Bucătărie)              │  │
│ │ ... (similar)               │  │
│ └─────────────────────────────┘  │
│                                   │
│ [Swipe pentru mai multe]          │
│                                   │
│ ┌─────────────────────────────┐  │
│ │ [✓ Salvează Indecșii]       │  │ <- Primary action
│ └─────────────────────────────┘  │
│                                   │
├───────────────────────────────────┤
│ 🏠   📋   📅   💳   👤            │
└───────────────────────────────────┘
```

---

## 🔧 CONFIGURARE ADMIN (Noi Features)

### 1. Panel Invitații în ApartmentModal

**Location:** `src/components/modals/ApartmentModal.js`

**UI Addition (după secțiunea Date Apartament):**

```
┌─────────────────────────────────────────────┐
│ Informații Apartament                       │
│ [... existing fields ...]                   │
├─────────────────────────────────────────────┤
│ 🌐 Portal Proprietar                        │ <- NOU SECTION
│                                             │
│ Status: 🟢 Cont activ (Ionescu Maria)      │ <- Status indicator
│         🟡 Invitație trimisă (15.10.2025)  │
│         🔴 Fără cont                        │
│                                             │
│ Email: ionescu@gmail.com                    │ <- Required pentru invite
│ Telefon: 0722 123 456                       │
│                                             │
│ [📧 Trimite Invitație]                      │ <- Action buttons
│ [🔄 Re-trimite Invitație]  (dacă expired)  │
│ [👤 Vezi Profil Proprietar] (dacă linked)  │
│                                             │
│ Istoric:                                    │
│ • Invitație trimisă: 15.10.2025 10:30      │
│ • Invitație acceptată: 16.10.2025 14:22    │
│ • Ultima accesare portal: 10.11.2025       │
└─────────────────────────────────────────────┘
```

**Logic:**
- Dacă email lipsește → Show warning "Completați email pentru a trimite invitație"
- Buton "Trimite Invitație" → Modal confirmare:
  ```
  Trimiteți invitație Portal Proprietari?

  Email destinatar: ionescu@gmail.com
  Apartament: 12, Bloc A, Scara 1

  Un email cu link de signup va fi trimis la adresa de mai sus.

  [Anulează] [Trimite Invitația]
  ```
- După trimitere → Toast success "Invitație trimisă cu succes!"

### 2. Dashboard Admin: Widget Progres Portal Proprietari

**Location:** `src/components/views/DashboardView.js`

**UI Addition (nou card în dashboard):**

```
┌─────────────────────────────────────────────┐
│ 🌐 Portal Proprietari - Adopție             │
│                                             │
│ Conturi active:     25 / 50  (50%)          │
│ [━━━━━━━━━━░░░░░░░░░░]                     │
│                                             │
│ Invitații trimise:  30                      │
│ Invitații acceptate: 25                     │
│ Invitații pending:   5 (Vezi detalii)       │
│                                             │
│ Indecși luna curentă:                       │
│ Introduși:          18 / 25  (72%)          │
│ [━━━━━━━━━━━━━━░░░░░░]                     │
│                                             │
│ [📊 Raport Detaliat] [📧 Trimite Reminder]  │
└─────────────────────────────────────────────┘
```

### 3. SettingsView: Secțiune Portal Proprietari

**Location:** `src/components/views/SettingsView.js`

**UI Addition (nou tab sau secțiune):**

```
┌─────────────────────────────────────────────┐
│ ⚙️ Setări Portal Proprietari                │
│                                             │
│ Deadline Introducere Indecși:               │
│ [  25  ▼] ale lunii                         │
│ (Ziua până la care proprietarii pot         │
│  introduce indecșii contoarelor)            │
│                                             │
│ Notificări Automate:                        │
│ ☑ Email la publicare lună nouă             │
│ ☑ Email reminder plată (cu 5 zile înainte) │
│ ☐ SMS reminder (necesită credit SMS)       │
│                                             │
│ Mesaj Personalizat Invitație:              │
│ [Textarea cu template-ul email, editable]   │
│                                             │
│ Portal URL:                                 │
│ https://proprietari.blocapp.ro              │
│ (read-only)                                 │
│                                             │
│ [Salvează Setări]                           │
└─────────────────────────────────────────────┘
```

---

## 📊 SUCCESS METRICS & KPIs

### KPI-uri Portal Proprietari (Track din Ziua 1)

**Adoption Metrics:**
- **Invitation Acceptance Rate:** % invitații acceptate din total trimise
  - Target: >70% în primele 30 zile
- **Active Accounts:** % apartamente cu cont activ
  - Target: >60% după 3 luni
- **Multi-Apartment Users:** % useri cu 2+ apartamente
  - Target: >15% (indicator că sistemul funcționează pentru edge case)

**Engagement Metrics:**
- **Weekly Active Users (WAU):** % proprietari care intră săptămânal
  - Target: >40%
- **Monthly Active Users (MAU):** % proprietari care intră lunar
  - Target: >80% (majoritatea intră măcar o dată pe lună pentru detalii întreținere)
- **Session Duration:** Timp mediu petrecut în portal per sesiune
  - Target: 3-5 minute (suficient să vizualizeze detalii)
- **Sessions per User:** Nr. mediu de vizite per utilizator per lună
  - Target: 2-3 (initial view + follow-up pentru plată)

**Feature Usage:**
- **Maintenance Details Views:** % useri care deschid detalii întreținere
  - Target: >80% (core feature)
- **Receipt Downloads:** % useri care descarcă chitanțe
  - Target: >50%
- **Meter Index Submissions:** % useri care introduc indecși vs. total apartamente cu contoare
  - Target: >70% (reduce munca adminului)
- **Historic Months Navigation:** % useri care navighează prin istoric
  - Target: >30% (nice-to-have, nu critic)
- **Profile Edits:** % useri care își editează profilul
  - Target: >20% (low priority)

**Admin Impact Metrics:**
- **Support Tickets Reduction:** Reducere întrebări admin de la proprietari
  - Target: -50% (întrebări "Cât am de plată?" / "Cum s-a calculat?")
- **Time Saved on Meter Reading:** Timp economisit admin pentru colectare indecși
  - Target: 2-3 ore/lună (pentru 50 apartamente)
- **Payment Collection Speed:** Reducere timp mediu până la plată
  - Baseline: Măsurăm pre-portal
  - Target: -20% (transparency → faster payment)

**Technical Metrics:**
- **Page Load Time:** LCP (Largest Contentful Paint)
  - Target: <2.5s
- **Error Rate:** % requests cu erori
  - Target: <1%
- **Uptime:** Disponibilitate portal
  - Target: >99.5%
- **PWA Install Rate:** % useri mobili care instalează PWA
  - Target: >30% (după prompt)

### Tracking Implementation (Firebase Analytics + Custom Events)

```javascript
// src/utils/analytics.js

import { logEvent } from 'firebase/analytics';

export const trackEvent = (eventName, params = {}) => {
  logEvent(analytics, eventName, {
    ...params,
    timestamp: new Date().toISOString(),
    userId: currentUser?.uid,
    apartmentId: selectedApartmentId
  });
};

// Event examples:
trackEvent('owner_signup_completed');
trackEvent('maintenance_details_viewed', { month: 'noiembrie 2025' });
trackEvent('receipt_downloaded', { receiptNumber: 123 });
trackEvent('meter_indexes_submitted', { apartmentId: 'apt_123' });
trackEvent('pwa_installed');
```

---

## 💰 ESTIMARE COSTURI

### Costuri Development (One-time)

| Fază | Ore | Rate (€/h) | Cost (€) | Cost (RON) |
|------|-----|-----------|----------|------------|
| **Faza 0: Pre-requisite** | 60-80h | 50 | 3,000-4,000 | 15,000-20,000 |
| **Faza 1: Fundații** | 120h | 50 | 6,000 | 30,000 |
| **Faza 2: Features Core** | 120h | 50 | 6,000 | 30,000 |
| **Faza 3: Enhanced & Polish** | 80h | 50 | 4,000 | 20,000 |
| **TOTAL DEVELOPMENT** | **380-400h** | **50** | **19,000-20,000€** | **95,000-100,000 RON** |

### Costuri Operaționale Lunare (Recurring)

| Serviciu | Cost/lună (€) | Cost/lună (RON) | Note |
|----------|---------------|-----------------|------|
| **Firebase (Blaze Plan)** | 50-100 | 250-500 | 1,000 WAU × 10 sheets/user = 10k reads |
| **Email (SendGrid/Mailgun)** | 0-20 | 0-100 | Free tier 10k/lună, apoi 0.001€/email |
| **SMS (opțional)** | 0 | 0 | Future, pay-per-use |
| **Domain & Hosting** | 10 | 50 | Inclus în plan existent |
| **Monitoring (Sentry)** | 0-26 | 0-130 | Free tier 5k events, apoi 26€/lună |
| **TOTAL OPERATIONAL** | **60-156€** | **300-780 RON** | Scale cu numărul useri |

### Costuri Externe (One-time)

| Item | Cost (€) | Cost (RON) | Note |
|------|----------|------------|------|
| **PWA Icons Design** | 0 | 0 | Tool online gratuit sau in-house |
| **Email Templates Design** | 0-200 | 0-1,000 | Poate fi făcut in-house cu HTML/CSS |
| **Legal (T&C, GDPR)** | 200-500 | 1,000-2,500 | Consultanță avocat specializat |
| **TOTAL EXTERNAL** | **200-700€** | **1,000-3,500 RON** | |

### TOTAL INVESTIȚIE INIȚIALĂ

- **Development:** 95,000-100,000 RON
- **Externe:** 1,000-3,500 RON
- **TOTAL:** **96,000-103,500 RON** (~19,200-20,700 EUR)

### TOTAL COSTURI LUNARE (după lansare)

- **Operational:** 300-780 RON/lună (~60-156 EUR/lună)
- **Scale projection (1,000 useri activi):** ~1,500 RON/lună (~300 EUR/lună)

---

## 🚀 DEPLOYMENT & ROLLOUT STRATEGY

### **Medii de Deployment**

1. **Development:** `dev.proprietari.blocapp.ro`
   - Branch: `develop`
   - Auto-deploy on push
   - Acces: Team only

2. **Staging:** `staging.proprietari.blocapp.ro`
   - Branch: `staging`
   - Manual deploy (după QA pass)
   - Acces: Team + Beta testers

3. **Production:** `proprietari.blocapp.ro`
   - Branch: `main`
   - Manual deploy (după final approval)
   - Acces: Public

### **Faza Beta (Săptămâna 9) - 1-2 săptămâni**

**Obiectiv:** Testare în condiții reale cu utilizatori reali

**Selecție Beta Testers:**
- 5-10 apartamente (prieteni/early adopters/admini cooperanți)
- Profil divers:
  - 2-3 useri tech-savvy (feedback rapid pe bugs)
  - 2-3 useri non-tech (testare UX simplitate)
  - 1-2 useri cu multiple apartamente (testare edge case)

**Process:**
1. **Ziua 1:** Trimitere invitații beta testers
2. **Zilele 1-3:** Daily check-ins (call/chat 15 min)
   - "Ce ai încercat azi?"
   - "Ce nu a funcționat?"
   - "Ce e confuz?"
3. **Zilele 4-7:** Bug fixing sprint (critical & high priority)
4. **Zilele 8-10:** Re-testare după fixes
5. **Zilele 11-14:** Iterare UI/UX bazat pe feedback

**Metrics Beta:**
- Signup completion rate (target: >90%)
- Feature discovery rate (target: >80% găsesc detalii, istoric, etc.)
- Bug reports count (target: <10 bugs critical după primele 3 zile)
- User satisfaction (survey 1-5 stars, target: >4.2)

### **Faza Soft Launch (Săptămâna 10) - 2 săptămâni**

**Obiectiv:** Lansare limitată pentru 1-2 asociații pilot (20-50 apartamente)

**Selecție Asociații Pilot:**
- Administratori deschisi la tehnologie nouă
- Mărime medie (20-50 apartamente = suficient de relevant, nu prea complex)
- Asociație cu date complete în BlocApp (min 3 luni istorice)

**Process:**
1. **Kick-off meeting cu admin:**
   - Prezentare portal (demo live 30 min)
   - Q&A despre implementare
   - Plan roll-out (timing invitații)

2. **Wave 1 (Ziua 1):** Invitații 20% apartamente (early adopters)
3. **Wave 2 (Ziua 3):** Invitații 30% apartamente
4. **Wave 3 (Ziua 7):** Invitații 50% apartamente rămase

**Support intensiv:**
- Live chat dedicat (Intercom/Crisp)
- Email support <2h response time
- Weekly call cu admin pentru feedback

**Metrics Soft Launch:**
- Adoption rate (target: >50% după 2 săptămâni)
- WAU (target: >30%)
- Support tickets per user (target: <0.5)
- Admin satisfaction (survey, target: >4.5/5)

### **Faza Production Launch (Săptămâna 12+) - Rolling**

**Obiectiv:** Enable pentru toți adminii BlocApp (opt-in)

**Process:**
1. **Anunț în BlocApp admin dashboard:**
   ```
   ┌─────────────────────────────────────────────┐
   │ 🎉 NOU: Portal Proprietari Disponibil!     │
   │                                             │
   │ Oferă-le proprietarilor acces online la     │
   │ detalii întreținere, istoric plăți, și mai │
   │ mult!                                       │
   │                                             │
   │ [📺 Vezi Demo] [✓ Activează Portal]         │
   └─────────────────────────────────────────────┘
   ```

2. **Opt-in gradual:**
   - Admin activează portal (checkbox în Settings)
   - Setup wizard:
     - Step 1: Verificare email-uri apartamente (completează lipsă)
     - Step 2: Setare deadline indecși
     - Step 3: Customizare mesaj invitație (opțional)
     - Step 4: Review & Launch
   - Trimitere automată invitații (opțional batch sau manual per apartament)

3. **Marketing & Communication:**
   - Blog post: "Lansăm Portal Proprietari - Ce trebuie să știi"
   - Email newsletter către admini existenți
   - Video tutorial YouTube (10 min)
   - Social media posts (LinkedIn, Facebook groups)

4. **Monitoring & Support:**
   - Dashboard metrics live (adoption, errors, performance)
   - Weekly reports către stakeholders
   - Monthly feature updates bazate pe feedback

**Metrics Production:**
- **Month 1:** 10% admini activează portal (conservative)
- **Month 3:** 30% admini activează portal
- **Month 6:** 50% admini activează portal
- **Year 1:** 70% admini activează portal (target success)

---

## 📚 DOCUMENTAȚIE & TRAINING

### Pentru Administratori

**1. Ghid Setup Portal (PDF/Video):**
- Cum să activezi portalul
- Cum să trimiți invitații
- Cum să gestionezi conturi proprietari
- Cum să vezi progres adopție
- FAQ: Întrebări frecvente

**2. Video Tutorials:**
- "Activarea Portal Proprietari" (5 min)
- "Trimitere Invitații în Masă" (3 min)
- "Gestionare Indecși Contoare" (7 min)
- "Rapoarte și Statistici Portal" (5 min)

### Pentru Proprietari

**1. Ghid Utilizare Portal (In-app):**
- Secțiune "Ajutor" în portal cu articole:
  - "Primii pași în portal"
  - "Cum să citesc detaliile întreținerii?"
  - "Cum să descarc chitanțe?"
  - "Cum să introduc indecșii contoarelor?"
  - "Cum să îmi modific datele de contact?"

**2. Video Tutorial (scurt, 3 min):**
- Embedded în dashboard la prima accesare
- Walkthrough rapid: Dashboard → Detalii → Istoric → Profil

**3. Tooltips Interactive:**
- Explicații inline pentru termeni tehnici
- Tour ghidat la prima accesare (opțional, dismiss-able)

---

## ⚠️ RISCURI & MITIGĂRI

| Risc | Probabilitate | Impact | Mitigare |
|------|---------------|--------|----------|
| **Bug critic în production (data loss)** | Scăzut | Critic | Testing exhaustiv Faza 3, Firebase backups automate, rollback plan |
| **Adopție lentă proprietari (<30%)** | Mediu | Înalt | Freemium portal (zero cost pentru proprietari), onboarding excelent, email reminders |
| **Supraîncărcare support (mulți tickets)** | Mediu | Mediu | Documentație comprehensivă, FAQ, chatbot (Faza 4), soft launch gradual |
| **Performance issues la scale (1000+ users)** | Scăzut | Mediu | Firebase optimization (indexuri, queries), load testing, CDN pentru assets |
| **Security breach (data exposure)** | Scăzut | Critic | Firestore Security Rules riguroase, penetration testing, audit code security |
| **Indecși introduși greșit (proprietari)** | Mediu | Scăzut | Validări stricte (index nou >= vechi), warning pentru valori neobișnuite, admin poate override |
| **Confusion multi-apartament (useri)** | Mediu | Scăzut | UI clar pentru selector apartamente, breadcrumbs, confirmări la acțiuni |
| **Încetarea BlocApp testing înainte de portal** | Înalt | Critic | **MITIGARE PLAN:** Faza 0 OBLIGATORIE, stakeholder buy-in pentru timeline |

---

## 📈 POST-LAUNCH ROADMAP (Faza 4+)

### Features Viitoare (după MVP)

**Faza 4: Notificări & Comunicare (Săpt 11-13) - 40h**
1. ✉️ Email automat la publicare lună nouă (template implementat deja)
2. 📲 Push notifications (infrastructure există din Faza 3)
3. 🔔 SMS reminders (integrare SMS provider)
4. 📣 Anunțuri asociație (admin publică anunțuri, proprietari văd în portal)

**Faza 5: Plată Online (Săpt 14-17) - 60h**
1. 💳 Integrare Stripe/Netopia
2. 🔐 Flow plată securizat (3D Secure)
3. ✅ Reconciliere automată plăți
4. 📧 Email confirmare plată instant
5. 📊 Dashboard admin - plăți online vs. manual

**Faza 6: Features Advanced (Săpt 18-24) - 80h**
1. 🗳️ Sistem votare AGA (Adunări Generale) din portal
2. 📁 Biblioteca documente (PV, contracte, regulamente)
3. 🛠️ Sistem sesizări/reclamații (ticketing)
4. 👥 Contact vecini (cu privacy controls)
5. 📊 Analytics & Rapoarte (grafice comparative, trends)

**Faza 7: React Native App (Săpt 25-32) - 160h**
1. 📱 Migrare la React Native (iOS + Android)
2. 🔔 Push notifications native (vs. PWA)
3. 📷 Camera access (poze contoare, documente)
4. 🔐 Biometric authentication (Face ID, Touch ID)
5. 📴 Offline mode îmbunătățit

---

## 🎯 CONCLUZII & NEXT STEPS

### Rezumat Plan

✅ **Pre-requisite CRITICAL:** Finalizare modul contoare + testing intensiv BlocApp (2-3 săpt)
✅ **MVP Portal Proprietari:** 8-10 săptămâni development complet funcțional
✅ **Features Core:** Detalii întreținere, Istoric, Plăți, Indecși contoare, PWA
✅ **Multi-apartament support:** Proprietar poate avea N apartamente la M asociații
✅ **Sistem invitații:** Admin controlled, zero friction pentru proprietari
✅ **Plată online:** Buton dummy în MVP, implementare Faza 5 (după validare)
✅ **Investiție:** ~100,000 RON one-time + 500 RON/lună operational

### Decizie ACUM

**Opțiunea A: START IMEDIAT cu Faza 0 (recomandat)**
- **PRO:** Portal gata în 10-12 săptămâni, competitive parity cu Xisoft/Aviziero
- **CON:** Necesită commitment ~400h development, presiune timeline

**Opțiunea B: AMÂNĂ 1-2 luni pentru stabilizare BlocApp**
- **PRO:** BlocApp rock-solid înainte de portal, mai puțină presiune
- **CON:** Întârziere time-to-market, risc că Aviziero lansează features noi între timp

**Opțiunea C: PHASED APPROACH (compromiș)**
- **Faza 0:** Săpt 1-3 (finalizare contoare + testing)
- **Review meeting:** Săpt 3 (decizie GO/NO-GO pentru portal)
- **Faza 1-3 portal:** Săpt 4-13 (dacă GO)

### Recomandare Finală

🎯 **OPȚIUNEA C** - Phased Approach cu review gate după Faza 0.

**Rationale:**
1. **Risk mitigation:** Testing intensiv BlocApp înainte de portal reduce risk catastrophic
2. **Flexibility:** Review meeting la săpt 3 permite re-prioritizare dacă apar probleme majore
3. **Momentum:** Nu pierdem complet momentum, start cu Faza 0 ACUM
4. **Quality first:** Portal pe fundație solidă = user experience excelentă = adoption înaltă

### Next Step IMEDIAT (această săptămână)

1. ✅ **Aprobare plan** - Review acest document, confirmă alignment cu viziune
2. 📅 **Sprint planning** - Breakdown Faza 0 în task-uri (2-3h)
3. 🚀 **Start Sprint 0.1** - Finalizare modul contoare (30-40h)
4. 📊 **Setup tracking** - Project management tool (Jira/Trello/Notion) cu timeline

---

**Gata să construim cei 5-10M EUR? Let's go! 🚀💰**

---

**Document versiune:** 1.0
**Data ultimei actualizări:** 10 Noiembrie 2025
**Status:** Draft pentru aprobare
**Contact:** [Your contact info]

