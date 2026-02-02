# Arhitectura Utilizatori și Roluri - BlocApp

> **Versiune**: 2.2
> **Ultima actualizare**: Ianuarie 2025
> **Status**: Planificat pentru implementare

---

## Viziune generală

BlocApp suportă trei scenarii de utilizare:
1. **Administrator individual** - o persoană fizică care administrează una sau mai multe asociații direct
2. **Firmă de administrare** - o companie cu mai mulți angajați care administrează multiple asociații
3. **Model hibrid** - un user poate avea și firmă și asociații administrate direct simultan

---

## Decizii arhitecturale cheie

| Decizie | Alegere |
|---------|---------|
| Multi-org membership | User poate fi angajat în MAI MULTE firme simultan |
| Multi-org ownership | User poate DEȚINE mai multe firme proprii |
| Hibrid org + direct | User poate avea și firme și asociații directe |
| Rol global | Toți devin `user`, permisiunile vin din org/assoc |
| Multiple owners | Owners egali + Founder privilege light |
| President/Cenzor | Opțional - pot avea cont sau doar nume text |
| UI switching | Sidebar adaptiv + pagini în content area (NU modale) |
| Invitare angajați | Email cu link magic (via Resend) |
| Ștergere organizație | Soft delete + tranziție asociații |
| Backend storage | Firebase Firestore cu transactions |
| Email provider | Resend (existent în proiect) |

---

## Entități principale

```
┌──────────────────────────────────────────────────────────────┐
│                         USER                                  │
│  (persoană fizică care se înregistrează)                     │
│  - organizations[] - poate fi în MAI MULTE firme             │
│  - directAssociations[] - asociații fără firmă               │
│  - POATE avea AMBELE simultan (hibrid)                       │
└──────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────┐  ┌─────────────────────┐
│      ORGANIZATION           │  │     ASSOCIATION     │
│   (firmă administrare)      │  │  (asociație prop.)  │
│                             │  │                     │
│  - ownerIds[] (MULTIPLE!)   │  │  - adminId          │
│  - createdBy (founder)      │  │  - organizationId?  │
│  - members[]                │  │  - president        │
│  - associations             │  │  - censors[]        │
└─────────────────────────────┘  │  - members[]        │
          │                      └─────────────────────┘
          │                              ▲
          └──────────────────────────────┘
```

---

## Model Founder Privilege Light

Pentru organizații cu **multiple owners egali**, aplicăm următoarele reguli:

| Actor | Poate adăuga owner | Poate șterge owner | Poate fi șters |
|-------|-------------------|-------------------|----------------|
| Founder (createdBy) | ✅ Oricine | ✅ Oricine | ❌ Niciodată* |
| Alt owner | ✅ Oricine | ❌ Doar self-remove | ✅ De founder |

*Founder-ul poate transfera statutul de founder către alt owner.

**Reguli:**
- `createdBy` = founder-ul original, NU poate fi șters de alți owners
- Founder-ul poate adăuga/șterge orice owner
- Alți owners pot adăuga noi owners
- Alți owners pot doar SELF-REMOVE (se scot pe ei înșiși)
- Founder-ul poate transfera statutul de founder la alt owner

---

## Roluri

### 1. Roluri globale (la nivel de aplicație)

| Rol | Descriere |
|-----|-----------|
| `master` | Developeri - acces total la sistem |
| `user` | Utilizator normal înregistrat |

> **Notă**: Rolurile vechi (`admin_asociatie`, `presedinte`, `cenzor`, `proprietar`) sunt ELIMINATE.
> Permisiunile vin acum din context (organizație/asociație).

### 2. Roluri la nivel de Organization (firmă)

| Rol | Descriere | Permisiuni |
|-----|-----------|------------|
| `org_owner` | Proprietar/fondator firmă (pot fi MULTIPLI) | Full access, poate gestiona owners |
| `org_admin` | Administrator în firmă | Gestionează angajați și asociații |
| `org_member` | Angajat | Administrează doar asociațiile alocate |

### 3. Roluri la nivel de Association (asociație)

| Rol | Descriere | Permisiuni |
|-----|-----------|------------|
| `assoc_admin` | Administratorul asociației | Full CRUD pe asociație |
| `assoc_president` | Președinte (OPȚIONAL) | Read + aprobare publicare (configurabil) |
| `assoc_censor` | Cenzor (1-3 per asociație, OPȚIONAL) | Read + audit reports |
| `assoc_owner` | Proprietar apartament | Read doar apartamentul/apartamentele lui |

**Notă importantă - Roluri multiple permise**:
- Orice user poate avea **multiple roluri în contexte diferite**
- Un `org_owner` poate fi și `assoc_owner` (proprietar apartament) într-o asociație
- Un `org_member` poate fi și `assoc_president` într-o altă asociație
- Președintele/cenzorii sunt adesea și proprietari în aceeași asociație
- **Nu există limitări** - rolurile sunt complet independente per context

**Președintele și cenzorii pot fi**:
- Useri cu cont în sistem (pentru acces la portal și funcționalități)
- Sau doar nume text (pentru afișare în PDF-uri, fără funcționalitate)

---

## Matrice permisiuni detaliată

### Pentru app.blocapp.ro (Administrare)

| Acțiune | org_owner | org_admin | org_member | assoc_admin | president | censor |
|---------|-----------|-----------|------------|-------------|-----------|--------|
| Creare organizație | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ștergere organizație | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| Adăugare owner | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ștergere owner | ✅** | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invitare angajați | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Alocare asociații | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Creare asociație | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editare asociație | ✅ | ✅ | ✅*** | ✅ | ❌ | ❌ |
| Adăugare cheltuieli | ✅ | ✅ | ✅*** | ✅ | ❌ | ❌ |
| Gestionare apartamente | ✅ | ✅ | ✅*** | ✅ | ❌ | ❌ |
| Creare sheet lunar | ✅ | ✅ | ✅*** | ✅ | ❌ | ❌ |
| Publicare sheet | ✅ | ✅ | ✅*** | ✅ | ⚙️**** | ❌ |
| Vizualizare sheet | ✅ | ✅ | ✅*** | ✅ | ✅ | ✅ |
| Vizualizare audit log | ✅ | ✅ | ✅*** | ✅ | ✅ | ✅ |
| Export rapoarte | ✅ | ✅ | ✅*** | ✅ | ✅ | ✅ |
| Invitare proprietari | ✅ | ✅ | ✅*** | ✅ | ❌ | ❌ |
| Setări președinte/cenzori | ✅ | ✅ | ✅*** | ✅ | ❌ | ❌ |

*Soft delete - asociațiile trec la directAssociations ale adminilor
**Founder poate șterge oricine; alți owners doar self-remove
***Doar pentru asociațiile alocate
****Configurabil în setări (aprobare sau doar notificare)

### Pentru portal.blocapp.ro (Proprietari)

| Acțiune | owner |
|---------|-------|
| Vizualizare dashboard | ✅ |
| Vizualizare apartament propriu | ✅ |
| Vizualizare întreținere lunară | ✅ |
| Vizualizare istoric plăți | ✅ |
| Descărcare PDF întreținere | ✅ |
| Transmitere index contor | ✅ |
| Vizualizare anunțuri asociație | ✅ |

---

## Structura Firebase

### Users Collection
```javascript
/users/{userId} {
  // Date personale
  email: string,
  displayName: string,
  phone: string,

  // Rol global - SIMPLIFICAT
  role: 'user' | 'master',

  // Apartenența la firme - ARRAY (poate fi în multiple firme!)
  organizations: [
    {
      id: string,                        // organizationId
      role: 'org_owner' | 'org_admin' | 'org_member',
      joinedAt: timestamp
    }
  ],  // Array gol dacă nu e în nicio firmă

  // Asociații administrate DIRECT (fără firmă)
  // POATE COEXISTA cu organizations[]
  directAssociations: string[],

  // Profile extins (nested - structura existentă)
  profile: {
    personalInfo: {...},
    professionalInfo: {...},
    documents: {...},
    settings: {...},
    metadata: {...}
  },

  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Organizations Collection
```javascript
/organizations/{orgId} {
  name: string,                    // "SC Administrare SRL"
  cui: string,                     // CUI firmă
  registrationNumber: string,      // Nr. Reg. Comerț

  address: {
    street: string,
    city: string,
    county: string,
    zipCode: string
  },

  contact: {
    phone: string,
    email: string
  },

  // SCHIMBAT: Array de owners în loc de unul singur
  ownerIds: string[],              // Array de userIds - MULTIPLE owners
  createdBy: string,               // userId fondator original (Founder privilege)

  status: 'active' | 'inactive',   // Pentru soft delete

  settings: {
    requirePresidentApproval: boolean,
    defaultPenaltyEnabled: boolean,
    defaultPenaltyPercentage: number,
    // ... alte setări implicite pentru asociații noi
  },

  createdAt: timestamp,
  updatedAt: timestamp
}

// Sub-colecție pentru membri/angajați
/organizations/{orgId}/members/{memberId} {
  userId: string,
  role: 'org_admin' | 'org_member',
  assignedAssociations: string[],  // IDs asociații alocate
  invitedBy: string,               // userId care a invitat
  invitedAt: timestamp,
  joinedAt: timestamp,
  status: 'pending' | 'active' | 'inactive'
}

// Sub-colecție pentru invitații
/organizations/{orgId}/invitations/{invitationId} {
  email: string,
  role: 'org_admin' | 'org_member',
  token: string,
  expiresAt: timestamp,
  createdBy: string,
  usedAt: timestamp | null
}
```

### Associations Collection
```javascript
/associations/{assocId} {
  name: string,
  cui: string,
  registrationNumber: string,

  address: {
    street: string,
    number: string,
    city: string,
    county: string
  },

  contact: {
    phone: string,
    email: string
  },

  bankAccount: string,

  // Cine administrează
  adminId: string,                 // userId admin principal
  organizationId: string | null,   // ID firmă (null = asociație directă)

  // Conducerea asociației - OPȚIONAL
  president: {
    userId: string | null,         // null = doar informativ (fără cont)
    name: string,
    phone: string,
    email: string
  } | null,

  censors: [                       // 1-3 cenzori, OPȚIONAL
    {
      userId: string | null,       // null = doar informativ
      name: string,
      phone: string,
      email: string
    }
  ],

  settings: {
    // Workflow
    requirePresidentApproval: boolean,
    notifyPresidentOnPublish: boolean,
    notifyCensorsOnPublish: boolean,

    // Penalizări
    penaltyEnabled: boolean,
    penaltyPercentage: number,
    penaltyStartDay: number,

    // Alte setări
    // ...
  },

  createdAt: timestamp,
  updatedAt: timestamp
}

// Sub-colecție pentru membri asociație
/associations/{assocId}/members/{memberId} {
  userId: string,
  role: 'assoc_admin' | 'assoc_president' | 'assoc_censor' | 'assoc_owner',
  apartmentIds: string[],          // Pentru owners - ce apartamente deține
  addedBy: string,
  addedAt: timestamp,
  status: 'active' | 'inactive'
}
```

---

## Flow-uri principale

### 1. Înregistrare utilizator nou
```
1. User completează formularul de înregistrare
2. Se creează cont Firebase Auth
3. Se creează document în /users cu role: 'user'
4. User parcurge onboarding
5. La final: Pagina de selecție context
   - "Creează asociație directă"
   - "Creează organizație (firmă)"
```

### 2. Creare firmă de administrare
```
1. User autentificat → Pagina selecție → "Creează Organizație"
2. Completează date firmă (nume, CUI, etc.)
3. Se creează document în /organizations cu ownerIds: [userId]
4. User.organizations.push({ id, role: 'org_owner', joinedAt })
5. Opțional: Migrare asociații existente din directAssociations[]
6. Redirect la dashboard organizație
```

### 3. Adăugare owner în organizație
```
1. org_owner → Organizație → Setări → Owners → "Adaugă Owner"
2. Selectează user existent din members SAU invită prin email
3. Se adaugă userId în /organizations/{orgId}.ownerIds
4. Se updatează user.organizations[].role = 'org_owner'
```

### 4. Invitare angajat în firmă (Email Magic Link)
```
1. org_owner/org_admin → Organizație → Angajați → "Invită"
2. Introduce email și rol (org_admin sau org_member)
3. Se creează /organizations/{orgId}/invitations/{id} cu token
4. Se trimite email cu link: app.blocapp.ro/invite/{token}
5. Destinatar click pe link:
   - Dacă are cont → login → redirect la accept
   - Dacă nu are cont → register → redirect la accept
6. La accept:
   - Se creează document în /organizations/{orgId}/members
   - User.organizations.push({ id, role, joinedAt })
   - Se marchează invitația ca folosită
```

### 5. Alocare asociație la angajat
```
1. org_owner/org_admin → Organizație → Angajați → "Alocă asociații"
2. Selectează asociațiile pentru angajat
3. Se updatează /organizations/{orgId}/members/{memberId}.assignedAssociations
4. Angajatul vede doar asociațiile alocate în pagina de selecție
```

### 6. Setare președinte/cenzori
```
1. Admin asociație → Setări Asociație → Conducere
2. Pentru fiecare rol (președinte, cenzori):
   - Opțiunea A: Introduce doar date (nume, telefon, email) → informativ
   - Opțiunea B: Selectează user existent → are acces în portal
   - Opțiunea C: Trimite invitație → user nou cu acces
3. Se updatează /associations/{assocId}.president și .censors
4. Dacă au userId, se creează și în /associations/{assocId}/members
```

### 7. Soft Delete Organization
```
1. Founder → Organizație → Setări → "Șterge Organizație"
2. Confirmare (trebuie să scrie numele organizației)
3. Pentru fiecare asociație din organizație:
   - Găsește adminul care o administra
   - Adaugă asociația în user.directAssociations[]
   - Setează association.organizationId = null
4. Pentru fiecare member:
   - Elimină organizația din user.organizations[]
5. Set organization.status = 'inactive'
6. Redirect la pagina de selecție
```

### 8. Context Switching (Pagina Selecție)
```
1. User se loghează
2. Dacă are doar 1 context (1 asociație directă SAU 1 org cu 1 asociație):
   - Skip la dashboard direct
3. Altfel, afișează Pagina Selecție:
   - Secțiune "Organizațiile mele" (unde e owner/member)
     - Click pe org → listă asociații din org → click → dashboard
   - Secțiune "Asociații directe" (directAssociations[])
     - Click → dashboard
   - Buton "Creează organizație"
   - Buton "Creează asociație directă"
4. Linkul "Schimbă context" în sidebar → revine la pagina selecție
```

---

## Reguli importante

1. **Un user poate aparține la MULTIPLE firme** - schimbat de la "max 1"
2. **Un user poate DEȚINE multiple firme** - este org_owner la mai multe
3. **Hibrid permis** - user poate avea și organizations[] și directAssociations[] simultan
4. **Founder privilege** - createdBy nu poate fi șters de alți owners
5. **Președintele și cenzorii sunt OPȚIONALI** - pot fi doar text informativ
6. **Workflow-ul de aprobare președinte este configurabil** per asociație
7. **Cenzorii sunt 1-3** conform legislației românești
8. **Soft delete pentru organizații** - datele nu se șterg, asociațiile se transferă

---

## Setări configurabile

### La nivel de Organization
- `requirePresidentApproval` - implicit pentru asociațiile noi
- `defaultPenaltyEnabled` - penalizări activate implicit
- `defaultPenaltyPercentage` - procent penalizare implicit

### La nivel de Association
- `requirePresidentApproval` - Necesită aprobarea președintelui pentru publicare
- `notifyPresidentOnPublish` - Notificare președinte la publicare
- `notifyCensorsOnPublish` - Notificare cenzori la publicare
- `penaltyEnabled` - Calculează penalizări automat
- `penaltyPercentage` - Procent penalizare (ex: 0.5%)
- `penaltyStartDay` - Din ce zi se aplică penalizarea

---

## UI/UX - Navigare și Context Switching

### Principiu de bază: Full Context Switch
Când utilizatorul navighează între contexte diferite (asociații, organizații, liste generale):
- **Întreaga zonă de conținut se înlocuiește** (inclusiv header-ul)
- **Sidebar-ul se adaptează** la noul context
- **NU folosim modale** pentru navigarea între contexte (modalele sunt pentru acțiuni, nu pentru navigare)

### Sidebar Adaptiv

#### Când userul este pe o asociație specifică:
```
┌─────────────────┐
│ [Avatar] Nume   │ ← Click deschide meniu user
│─────────────────│
│ Dashboard       │
│ Date Asociație  │
│ Cheltuieli      │
│ Liste întreț.   │
│ Apartamente     │
│ Furnizori       │
│ ...             │
└─────────────────┘
```

#### Meniu User (click pe avatar) - Adaptiv pe număr:
```
┌──────────────────────────────────┐
│ Asociații directe:               │  ← Apare dacă are directAssociations[]
│   • Asociația Vulturul (curent)  │
│   • Asociația Florilor           │
│   [+ Creează asociație]          │  ← Dispare dacă are 4+ asociații
│──────────────────────────────────│
│ Organizații:                     │  ← Apare dacă are organizations[]
│   • SC Admin SRL                 │
│   [+ Creează organizație]        │  ← Dispare dacă are 4+ organizații
│──────────────────────────────────│
│ [Asociațiile mele]               │  ← Apare dacă are 4+ asociații total
│ [Organizațiile mele]             │  ← Apare dacă are 4+ organizații
│──────────────────────────────────│
│ Setări cont                      │
│ Deconectare                      │
└──────────────────────────────────┘
```

#### Reguli adaptive:
| Număr items | Comportament |
|-------------|--------------|
| 0 items | Afișează doar butoanele de creare |
| 1-3 items | Afișează lista direct + butoane de creare |
| 4+ items | Afișează link "Asociațiile mele" / "Organizațiile mele" (fără butoane creare în meniu) |

### Pagini de tip "Lista mea" (Asociațiile mele / Organizațiile mele)

Când userul face click pe "Asociațiile mele":
```
┌─────────────────┬──────────────────────────────────────────────┐
│ Sidebar         │ Header: Asociațiile Mele                     │
│ (general)       │──────────────────────────────────────────────│
│─────────────────│                                              │
│ Dashboard       │  [+ Creează asociație nouă]                  │
│ Asociațiile     │                                              │
│   mele (activ)  │  ┌────────────────┐ ┌────────────────┐       │
│ Organizațiile   │  │ Vulturul B4A   │ │ Florilor A2    │       │
│   mele          │  │ 45 apartamente │ │ 32 apartamente │       │
│ Setări          │  │ Luna: Sept     │ │ Luna: Sept     │       │
│                 │  │ [Deschide →]   │ │ [Deschide →]   │       │
│                 │  └────────────────┘ └────────────────┘       │
│                 │                                              │
└─────────────────┴──────────────────────────────────────────────┘
```

**Sidebar în context general** (când NU ești pe o asociație specifică):
- Dashboard general (overview toate asociațiile)
- Asociațiile mele
- Organizațiile mele
- Setări cont

**Click pe card asociație** → Full context switch la acea asociație (sidebar se schimbă)

---

## Câmpuri Editabile - Matrice de Permisiuni

### Organization - Ce poate edita fiecare rol

| Câmp | org_owner | org_admin | org_member |
|------|-----------|-----------|------------|
| name | ✅ Edit | ❌ | ❌ |
| cui | ✅ Edit | ❌ | ❌ |
| registrationNumber | ✅ Edit | ❌ | ❌ |
| address.* | ✅ Edit | ❌ | ❌ |
| contact.phone | ✅ Edit | ✅ Edit | ❌ |
| contact.email | ✅ Edit | ✅ Edit | ❌ |
| ownerIds[] | ✅ Add/Remove* | ❌ | ❌ |
| settings.* | ✅ Edit | ✅ Edit | ❌ |
| members/* | ✅ Full | ✅ Add/Edit** | ❌ |

*Cu restricțiile Founder Privilege Light
**Poate adăuga/edita membri, dar nu owners

### Association - Ce poate edita fiecare rol

| Câmp | org_owner | org_admin | org_member | assoc_admin | president | censor |
|------|-----------|-----------|------------|-------------|-----------|--------|
| name | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| cui | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| address.* | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| contact.* | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| bankAccount | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| president | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| censors[] | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| settings.* | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| organizationId | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Doar pentru asociațiile alocate

### User Profile - Ce poate edita

| Câmp | Userul însuși | master |
|------|---------------|-------------|
| email | ❌ (Auth change) | ✅ |
| displayName | ✅ Edit | ✅ |
| phone | ✅ Edit | ✅ |
| profile.* | ✅ Edit | ✅ |
| role | ❌ | ✅ |
| organizations[] | ❌ (Sistem) | ✅ |
| directAssociations[] | ❌ (Sistem) | ✅ |

---

## Firebase - Implementare Tehnică

### Firestore Indexes (de creat în Firebase Console)

```javascript
// Index compus pentru query-uri frecvente

// 1. Asociații per organizație
Collection: associations
Fields: organizationId ASC, name ASC

// 2. Membri organizație activi
Collection: organizations/{orgId}/members
Fields: status ASC, role ASC

// 3. Invitații neexpirate
Collection: organizations/{orgId}/invitations
Fields: expiresAt ASC, usedAt ASC

// 4. Asociații per admin
Collection: associations
Fields: adminId ASC, createdAt DESC
```

### Transactions - Operații Atomice

**Obligatoriu transactions pentru:**

```javascript
// 1. Creare organizație
async function createOrganization(userId, orgData) {
  return runTransaction(db, async (transaction) => {
    // a) Creează org document
    const orgRef = doc(collection(db, 'organizations'));
    transaction.set(orgRef, {
      ...orgData,
      ownerIds: [userId],
      createdBy: userId,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // b) Update user.organizations[]
    const userRef = doc(db, 'users', userId);
    transaction.update(userRef, {
      organizations: arrayUnion({
        id: orgRef.id,
        role: 'org_owner',
        joinedAt: new Date()
      }),
      updatedAt: serverTimestamp()
    });

    return orgRef.id;
  });
}

// 2. Accept invitație
async function acceptInvitation(userId, invitationToken) {
  return runTransaction(db, async (transaction) => {
    // a) Validează invitația
    // b) Creează member document
    // c) Update user.organizations[]
    // d) Marchează invitația ca folosită
  });
}

// 3. Adăugare/Ștergere owner
async function addOwner(orgId, newOwnerId, addedByUserId) {
  return runTransaction(db, async (transaction) => {
    // a) Verifică că addedByUserId e owner
    // b) Adaugă în org.ownerIds[]
    // c) Update newOwner.organizations[]
  });
}

// 4. Soft delete organizație
async function softDeleteOrganization(orgId, userId) {
  return runTransaction(db, async (transaction) => {
    // a) Verifică că userId e founder
    // b) Pentru fiecare asociație: setează organizationId = null, update adminId
    // c) Pentru fiecare member: remove din user.organizations[]
    // d) Set org.status = 'inactive'
  });
}
```

### Batch Operations - Operații Multiple

```javascript
// Pentru operații care afectează mai multe documente fără dependențe

// Exemplu: Alocă multiple asociații la un angajat
async function allocateAssociations(orgId, memberId, associationIds) {
  const batch = writeBatch(db);

  // Update member document
  const memberRef = doc(db, 'organizations', orgId, 'members', memberId);
  batch.update(memberRef, {
    assignedAssociations: associationIds,
    updatedAt: serverTimestamp()
  });

  // Optional: log pentru fiecare asociație
  associationIds.forEach(assocId => {
    const logRef = doc(collection(db, 'associations', assocId, 'audit_logs'));
    batch.set(logRef, {
      action: 'MEMBER_ASSIGNED',
      userId: memberId,
      timestamp: serverTimestamp()
    });
  });

  await batch.commit();
}
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isMaster() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'master';
    }

    function isOrgOwner(orgId) {
      return request.auth.uid in get(/databases/$(database)/documents/organizations/$(orgId)).data.ownerIds;
    }

    function isOrgMember(orgId) {
      return exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid));
    }

    function canAccessAssociation(assocId) {
      let assoc = get(/databases/$(database)/documents/associations/$(assocId)).data;
      return assoc.adminId == request.auth.uid ||
             (assoc.organizationId != null && isOrgMember(assoc.organizationId));
    }

    // Users
    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isMaster());
      allow write: if isAuthenticated() && (isOwner(userId) || isMaster());
    }

    // Organizations
    match /organizations/{orgId} {
      allow read: if isAuthenticated() && (isOrgOwner(orgId) || isOrgMember(orgId) || isMaster());
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (isOrgOwner(orgId) || isMaster());
      allow delete: if false; // Soft delete only

      // Organization members
      match /members/{memberId} {
        allow read: if isAuthenticated() && (isOrgOwner(orgId) || isOrgMember(orgId));
        allow write: if isAuthenticated() && isOrgOwner(orgId);
      }

      // Organization invitations
      match /invitations/{invitationId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated() && isOrgOwner(orgId);
        allow update: if isAuthenticated(); // Pentru accept
      }
    }

    // Associations
    match /associations/{assocId} {
      allow read: if isAuthenticated() && canAccessAssociation(assocId);
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && canAccessAssociation(assocId);
      allow delete: if false; // Soft delete only

      // Nested collections inherit permission check
      match /{subcollection}/{docId} {
        allow read, write: if isAuthenticated() && canAccessAssociation(assocId);
      }
    }
  }
}
```

---

## Email - Integrare Resend

### Template-uri Email

#### 1. Invitație Angajat în Organizație
```javascript
const orgInviteTemplate = {
  subject: "Ai fost invitat să te alături {organizationName}",
  body: `
    Salut,

    {inviterName} te-a invitat să te alături organizației {organizationName}
    pe platforma BlocApp cu rolul de {role}.

    Click pe butonul de mai jos pentru a accepta invitația:

    [Acceptă Invitația] → {inviteUrl}

    Invitația expiră în 7 zile.

    Dacă nu cunoști persoana care ți-a trimis această invitație,
    te rugăm să ignori acest email.

    ---
    Echipa BlocApp
  `
};
```

#### 2. Notificare Președinte - Sheet Publicat
```javascript
const presidentNotifyTemplate = {
  subject: "[{associationName}] Lista de întreținere {month} a fost publicată",
  body: `
    Stimate {presidentName},

    Lista de întreținere pentru luna {month} a fost publicată
    de către {adminName} pentru {associationName}.

    Sumar:
    - Total de încasat: {totalAmount} RON
    - Apartamente: {apartmentCount}

    [Vizualizează Lista] → {sheetUrl}

    ---
    Echipa BlocApp
  `
};
```

#### 3. Notificare Owner - Adăugat în Organizație
```javascript
const newOwnerTemplate = {
  subject: "Ai devenit co-proprietar al {organizationName}",
  body: `
    Salut {ownerName},

    {adderName} te-a adăugat ca proprietar al organizației {organizationName}.

    Acum ai acces complet la gestionarea organizației, inclusiv:
    - Adăugare/eliminare alți proprietari
    - Gestionare angajați
    - Setări organizație

    [Accesează Organizația] → {orgUrl}

    ---
    Echipa BlocApp
  `
};
```

### Implementare Resend

```javascript
// src/hooks/useEmailService.js

import { Resend } from 'resend';

const resend = new Resend(process.env.REACT_APP_RESEND_API_KEY);

export const useEmailService = () => {

  const sendOrgInvitation = async (invitation, organization, inviter) => {
    const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;

    try {
      await resend.emails.send({
        from: 'BlocApp <noreply@blocapp.ro>',
        to: invitation.email,
        subject: `Ai fost invitat să te alături ${organization.name}`,
        html: renderTemplate('orgInvite', {
          organizationName: organization.name,
          inviterName: inviter.displayName,
          role: invitation.role === 'org_admin' ? 'Administrator' : 'Membru',
          inviteUrl
        }),
        tags: [
          { name: 'type', value: 'org-invitation' },
          { name: 'orgId', value: organization.id }
        ]
      });

      return { success: true };
    } catch (error) {
      console.error('Email send failed:', error);
      // Log to audit
      return { success: false, error: error.message };
    }
  };

  const sendPresidentNotification = async (president, sheet, association, admin) => {
    // Similar implementation
  };

  return {
    sendOrgInvitation,
    sendPresidentNotification,
    // ... alte funcții
  };
};
```

### Rate Limiting & Retry

```javascript
// În Firebase Functions sau API route

const EMAIL_RATE_LIMITS = {
  perUser: { max: 10, window: '1h' },      // Max 10 emails/user/oră
  perOrg: { max: 50, window: '1d' },       // Max 50 emails/org/zi
  global: { max: 1000, window: '1h' }      // Max 1000 emails/oră total
};

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 5000, 15000]  // 1s, 5s, 15s
};
```

---

## Edge Cases și Error Handling

### 1. User eliminat din org în timp ce o vizualizează

```javascript
// În useOrganization hook
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'organizations', orgId),
    (snapshot) => {
      const org = snapshot.data();
      const userOrg = user.organizations.find(o => o.id === orgId);

      if (!org || org.status === 'inactive') {
        // Organizație ștearsă
        showToast('Această organizație nu mai există', 'warning');
        navigate('/select-context');
        return;
      }

      if (!org.ownerIds.includes(user.uid) && !userOrg) {
        // User eliminat
        showToast('Nu mai ai acces la această organizație', 'warning');
        navigate('/select-context');
        return;
      }

      setOrganization(org);
    }
  );

  return unsubscribe;
}, [orgId, user]);
```

### 2. Invitație expirată

```javascript
const validateInvitation = async (token) => {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return { valid: false, error: 'INVALID_TOKEN', message: 'Link invalid' };
  }

  if (invitation.usedAt) {
    return { valid: false, error: 'ALREADY_USED', message: 'Invitația a fost deja folosită' };
  }

  if (invitation.expiresAt.toDate() < new Date()) {
    return { valid: false, error: 'EXPIRED', message: 'Invitația a expirat. Contactează administratorul pentru o nouă invitație.' };
  }

  return { valid: true, invitation };
};
```

### 3. User invitat are deja cont

```javascript
// În pagina de accept invitație
const handleInviteAccept = async (token) => {
  const { valid, invitation, error } = await validateInvitation(token);

  if (!valid) {
    showError(error);
    return;
  }

  if (user) {
    // User deja autentificat
    if (user.email === invitation.email) {
      // Email-ul corespunde - accept direct
      await acceptInvitation(user.uid, token);
      navigate(`/organization/${invitation.organizationId}`);
    } else {
      // Email diferit - cere confirmare
      showModal({
        title: 'Email diferit',
        message: `Invitația a fost trimisă la ${invitation.email}, dar ești autentificat cu ${user.email}. Dorești să continui?`,
        onConfirm: () => acceptInvitation(user.uid, token),
        onCancel: () => logout().then(() => navigate(`/invite/${token}`))
      });
    }
  } else {
    // User neautentificat
    const existingUser = await checkEmailExists(invitation.email);

    if (existingUser) {
      // Cont existent - redirect la login
      navigate(`/login?redirect=/invite/${token}&email=${invitation.email}`);
    } else {
      // Cont nou - redirect la register
      navigate(`/register?redirect=/invite/${token}&email=${invitation.email}`);
    }
  }
};
```

### 4. Concurrent edits (2 owneri editează simultan)

```javascript
// Optimistic locking cu updatedAt
const updateOrganization = async (orgId, updates) => {
  const orgRef = doc(db, 'organizations', orgId);

  try {
    await runTransaction(db, async (transaction) => {
      const orgDoc = await transaction.get(orgRef);
      const currentData = orgDoc.data();

      // Verifică dacă datele s-au schimbat între timp
      if (currentData.updatedAt.toMillis() !== lastKnownUpdatedAt) {
        throw new Error('CONCURRENT_MODIFICATION');
      }

      transaction.update(orgRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    });

    showToast('Salvat cu succes', 'success');
  } catch (error) {
    if (error.message === 'CONCURRENT_MODIFICATION') {
      showModal({
        title: 'Modificare în conflict',
        message: 'Altcineva a modificat aceste date. Dorești să reîncarci?',
        onConfirm: () => reloadData()
      });
    } else {
      showError('Eroare la salvare');
    }
  }
};
```

### 5. Network offline / Firestore offline

```javascript
// În App.js sau un hook global
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, '.info/connected'),
    (snapshot) => {
      // Firestore detectează automat offline
    },
    (error) => {
      if (error.code === 'unavailable') {
        showToast('Conexiune pierdută. Modificările vor fi salvate când revii online.', 'warning');
        setIsOffline(true);
      }
    }
  );

  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs - ok
    } else if (err.code === 'unimplemented') {
      // Browser nu suportă
    }
  });

  return unsubscribe;
}, []);
```

---

## Validare

### Validare CUI (România)

```javascript
const validateCUI = (cui) => {
  // Elimină RO prefix dacă există
  const cleanCUI = cui.replace(/^RO/i, '').trim();

  // Verifică format (6-10 cifre)
  if (!/^\d{6,10}$/.test(cleanCUI)) {
    return { valid: false, error: 'CUI trebuie să conțină 6-10 cifre' };
  }

  // Algoritm de validare CUI România
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = cleanCUI.padStart(10, '0').split('').map(Number);
  const controlDigit = digits.pop();

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }

  const calculatedControl = (sum * 10) % 11 % 10;

  if (calculatedControl !== controlDigit) {
    return { valid: false, error: 'CUI invalid (cifra de control incorectă)' };
  }

  return { valid: true, normalized: cleanCUI };
};
```

### Validare Email

```javascript
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: 'Adresă email invalidă' };
  }

  // Normalizare
  const normalized = email.toLowerCase().trim();

  return { valid: true, normalized };
};
```

### Validare Telefon (România)

```javascript
const validatePhone = (phone) => {
  // Elimină spații, puncte, liniuțe
  const cleanPhone = phone.replace(/[\s.\-()]/g, '');

  // Acceptă formate: 07xxxxxxxx, +407xxxxxxxx, 004xxxxxxxx
  const phoneRegex = /^(\+40|0040|0)?7\d{8}$/;

  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, error: 'Număr de telefon invalid' };
  }

  // Normalizare la format +40
  let normalized = cleanPhone;
  if (normalized.startsWith('0040')) {
    normalized = '+40' + normalized.slice(4);
  } else if (normalized.startsWith('0')) {
    normalized = '+40' + normalized.slice(1);
  } else if (!normalized.startsWith('+')) {
    normalized = '+40' + normalized;
  }

  return { valid: true, normalized };
};
```

### Schema Validare Form (cu Yup sau Zod)

```javascript
// Folosind Yup
import * as yup from 'yup';

const organizationSchema = yup.object({
  name: yup.string()
    .required('Numele este obligatoriu')
    .min(3, 'Minimum 3 caractere')
    .max(100, 'Maximum 100 caractere'),

  cui: yup.string()
    .required('CUI este obligatoriu')
    .test('valid-cui', 'CUI invalid', (value) => validateCUI(value).valid),

  registrationNumber: yup.string()
    .matches(/^J\d{2}\/\d+\/\d{4}$/, 'Format invalid (ex: J40/1234/2020)'),

  address: yup.object({
    street: yup.string().required('Strada este obligatorie'),
    city: yup.string().required('Orașul este obligatoriu'),
    county: yup.string().required('Județul este obligatoriu'),
    zipCode: yup.string().matches(/^\d{6}$/, 'Cod poștal invalid')
  }),

  contact: yup.object({
    email: yup.string()
      .required('Email-ul este obligatoriu')
      .email('Email invalid'),
    phone: yup.string()
      .required('Telefonul este obligatoriu')
      .test('valid-phone', 'Telefon invalid', (value) => validatePhone(value).valid)
  })
});
```

---

## Loading States și UX

### Skeleton Loading

```javascript
// OrganizationCard loading state
const OrganizationCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
  </div>
);
```

### Optimistic Updates

```javascript
const updateOrganizationName = async (newName) => {
  // 1. Update UI imediat (optimistic)
  setOrganization(prev => ({ ...prev, name: newName }));

  try {
    // 2. Salvează în Firebase
    await updateDoc(orgRef, { name: newName, updatedAt: serverTimestamp() });
    showToast('Salvat', 'success');
  } catch (error) {
    // 3. Rollback dacă eșuează
    setOrganization(prev => ({ ...prev, name: previousName }));
    showToast('Eroare la salvare', 'error');
  }
};
```

### Confirmation Dialogs pentru Acțiuni Destructive

```javascript
// Ștergere owner
const handleRemoveOwner = (ownerId, ownerName) => {
  showConfirmDialog({
    title: 'Confirmă eliminarea',
    message: `Ești sigur că vrei să elimini pe ${ownerName} din lista de proprietari?`,
    confirmText: 'Elimină',
    confirmVariant: 'danger',
    onConfirm: () => removeOwner(ownerId)
  });
};

// Soft delete organizație - necesită scriere nume
const handleDeleteOrganization = () => {
  showConfirmDialog({
    title: 'Șterge organizația',
    message: `Această acțiune este ireversibilă. Asociațiile vor fi transferate la administratorii lor.`,
    requireInput: true,
    inputLabel: `Scrie "${organization.name}" pentru a confirma`,
    inputValidation: (value) => value === organization.name,
    confirmText: 'Șterge definitiv',
    confirmVariant: 'danger',
    onConfirm: () => softDeleteOrganization()
  });
};
```

---

## Billing & Data Retention

### Model de Facturare

#### Preț per Apartament
| Tier | Apartamente | Preț/Apartament/Lună |
|------|-------------|---------------------|
| Starter | 1-50 | 5 RON |
| Standard | 51-200 | 4 RON |
| Professional | 201-500 | 3 RON |
| Enterprise | 500+ | 2 RON (negociabil) |

#### Perioadă de Probă
- **Durată**: 90 zile de la prima asociație creată
- **Funcționalități**: Acces complet, fără restricții
- **La expirare**: Notificare cu 14, 7, 3, 1 zile înainte

### Moduri de Facturare

| Mod | Descriere | Cine plătește |
|-----|-----------|---------------|
| `trial` | Perioadă de probă (90 zile) | Nimeni |
| `organization` | Firma plătește pentru toate asociațiile | Organizația |
| `association` | Fiecare asociație plătește individual | Asociația |

#### Schema Firebase - Association Billing
```javascript
/associations/{assocId} {
  // ... alte câmpuri ...

  billing: {
    mode: 'trial' | 'organization' | 'association',
    billedToOrganizationId: string | null,  // Dacă mode === 'organization'

    // Dacă mode === 'association'
    billingContact: {
      name: string,
      email: string,
      phone: string,
      address: string
    } | null,

    // Status plată
    status: 'trial' | 'active' | 'overdue' | 'suspended',
    trialEndsAt: timestamp | null,
    currentPeriodStart: timestamp,
    currentPeriodEnd: timestamp,
    lastPaymentAt: timestamp | null,

    // Istoric transferuri
    transfers: [
      {
        fromMode: 'organization' | 'association',
        toMode: 'organization' | 'association',
        fromEntityId: string | null,
        toEntityId: string | null,
        transferredAt: timestamp,
        reason: string,
        initiatedBy: string  // userId
      }
    ]
  }
}
```

#### Schema Firebase - Organization Billing
```javascript
/organizations/{orgId} {
  // ... alte câmpuri ...

  billing: {
    status: 'trial' | 'active' | 'overdue' | 'suspended',
    trialEndsAt: timestamp | null,
    currentPeriodStart: timestamp,
    currentPeriodEnd: timestamp,
    lastPaymentAt: timestamp | null,

    billingContact: {
      name: string,
      email: string,
      phone: string,
      companyName: string,
      cui: string,
      address: string
    },

    // Sumar facturare
    totalApartments: number,      // Calculat din toate asociațiile
    monthlyAmount: number,        // Calculat pe baza tier-ului
    tier: 'starter' | 'standard' | 'professional' | 'enterprise'
  }
}
```

### Status și Tranziții

```
                    ┌──────────────┐
                    │    TRIAL     │
                    │  (90 zile)   │
                    └──────┬───────┘
                           │ Plătește / Expiră
              ┌────────────┴────────────┐
              ▼                         ▼
      ┌──────────────┐          ┌──────────────┐
      │    ACTIVE    │◄────────►│   OVERDUE    │
      │  (plătit)    │ neplată  │  (14 zile)   │
      └──────────────┘          └──────┬───────┘
                                       │ 14 zile fără plată
                                       ▼
                               ┌──────────────┐
                               │  SUSPENDED   │
                               │ (read-only)  │
                               └──────────────┘
```

#### Comportament pe Status

| Status | Acces | Acțiuni permise |
|--------|-------|-----------------|
| `trial` | Full | Toate funcționalitățile |
| `active` | Full | Toate funcționalitățile |
| `overdue` | Full | Toate, dar afișează warning |
| `suspended` | Read-only | Vizualizare, export, plată |

### Data Retention - Reguli

#### Principiu de bază
> **Datele aparțin ASOCIAȚIEI, nu persoanei care le administrează.**
> Cine plătește are dreptul de ștergere.

#### Matrice Drepturi Ștergere

| Scenariu | Cine poate șterge asociația | Reguli |
|----------|----------------------------|--------|
| `billing.mode = 'organization'` | Organizația (org_owner) | Asociația e parte din contract org |
| `billing.mode = 'association'` | Asociația (assoc_admin) | Asociația plătește direct |
| `billing.mode = 'trial'` | Creatorul asociației | Trial personal |
| Org ștearsă, asoc neplătită | Asociația devine owner | Grace period 30 zile |
| Asoc neplătită suspended | Păstrare 90 zile, apoi arhivare | Date anonimizate |

#### Logica `canDeleteAssociation()`

```javascript
const canDeleteAssociation = (userId, association) => {
  const billing = association.billing;

  // Super admin poate oricând
  if (user.role === 'master') return true;

  // În funcție de billing mode
  switch (billing.mode) {
    case 'trial':
      // Doar creatorul asociației
      return association.createdBy === userId;

    case 'organization':
      // Doar org_owner al organizației care plătește
      const org = getOrganization(billing.billedToOrganizationId);
      return org.ownerIds.includes(userId);

    case 'association':
      // Doar assoc_admin care e și billing contact
      return association.adminId === userId &&
             billing.billingContact?.email === user.email;

    default:
      return false;
  }
};
```

### Transfer Flows

#### 1. Organizație → Asociație (Org nu mai plătește)

```
Trigger: Org owner anunță că nu mai plătește pentru o asociație

1. Notificare către association admin (email)
2. Grace period: 30 zile
   - Asociația continuă să funcționeze normal
   - Warning banner în UI
3. La expirarea grace period:
   - association.billing.mode = 'association'
   - association.billing.billedToOrganizationId = null
   - association.billing.status = 'overdue' (dacă nu a plătit)
4. Admin asociație primește notificare să completeze billing contact
5. Log în association.billing.transfers[]
```

```javascript
// Implementare
async function transferBillingToAssociation(orgId, assocId, initiatedBy) {
  await runTransaction(db, async (transaction) => {
    const assocRef = doc(db, 'associations', assocId);
    const assoc = (await transaction.get(assocRef)).data();

    // Update association
    transaction.update(assocRef, {
      'billing.mode': 'association',
      'billing.billedToOrganizationId': null,
      'billing.status': 'overdue',
      'billing.transfers': arrayUnion({
        fromMode: 'organization',
        toMode: 'association',
        fromEntityId: orgId,
        toEntityId: assocId,
        transferredAt: serverTimestamp(),
        reason: 'org_stopped_paying',
        initiatedBy
      }),
      updatedAt: serverTimestamp()
    });

    // Send notification to assoc admin
    await sendBillingTransferNotification(assoc.adminId, assoc);
  });
}
```

#### 2. Asociație → Organizație (Org preia plata)

```
Trigger: Org owner decide să plătească pentru o asociație

1. Org owner selectează asociația din "Asociații disponibile"
2. Confirmare de la association admin (sau automată dacă e același user)
3. Imediat:
   - association.billing.mode = 'organization'
   - association.billing.billedToOrganizationId = orgId
   - association.billing.status = org.billing.status
4. Recalculare org.billing.totalApartments și org.billing.monthlyAmount
5. Log în association.billing.transfers[]
```

```javascript
// Implementare
async function transferBillingToOrganization(orgId, assocId, initiatedBy) {
  await runTransaction(db, async (transaction) => {
    const orgRef = doc(db, 'organizations', orgId);
    const assocRef = doc(db, 'associations', assocId);

    const org = (await transaction.get(orgRef)).data();
    const assoc = (await transaction.get(assocRef)).data();

    // Count apartments in association
    const apartmentsSnapshot = await getDocs(
      query(collection(db, 'associations', assocId, 'apartments'))
    );
    const apartmentCount = apartmentsSnapshot.size;

    // Update association
    transaction.update(assocRef, {
      'billing.mode': 'organization',
      'billing.billedToOrganizationId': orgId,
      'billing.billingContact': null,
      'billing.status': org.billing.status,
      'billing.transfers': arrayUnion({
        fromMode: 'association',
        toMode: 'organization',
        fromEntityId: assocId,
        toEntityId: orgId,
        transferredAt: serverTimestamp(),
        reason: 'org_claimed_billing',
        initiatedBy
      }),
      updatedAt: serverTimestamp()
    });

    // Update organization billing totals
    const newTotalApartments = org.billing.totalApartments + apartmentCount;
    const newTier = calculateTier(newTotalApartments);
    const newMonthlyAmount = calculateMonthlyAmount(newTotalApartments, newTier);

    transaction.update(orgRef, {
      'billing.totalApartments': newTotalApartments,
      'billing.tier': newTier,
      'billing.monthlyAmount': newMonthlyAmount,
      updatedAt: serverTimestamp()
    });
  });
}
```

### Soft Delete Organization cu Billing

Când o organizație este ștearsă (soft delete):

```javascript
async function softDeleteOrganization(orgId, userId) {
  await runTransaction(db, async (transaction) => {
    const orgRef = doc(db, 'organizations', orgId);
    const org = (await transaction.get(orgRef)).data();

    // Verifică că e founder
    if (org.createdBy !== userId) {
      throw new Error('ONLY_FOUNDER_CAN_DELETE');
    }

    // Pentru fiecare asociație din organizație
    const associations = await getDocs(
      query(collection(db, 'associations'),
            where('organizationId', '==', orgId))
    );

    for (const assocDoc of associations.docs) {
      const assoc = assocDoc.data();
      const assocRef = doc(db, 'associations', assocDoc.id);

      // Transfer billing la asociație
      transaction.update(assocRef, {
        organizationId: null,
        'billing.mode': 'association',
        'billing.billedToOrganizationId': null,
        'billing.status': 'overdue',  // Intră în grace period
        'billing.transfers': arrayUnion({
          fromMode: 'organization',
          toMode: 'association',
          fromEntityId: orgId,
          toEntityId: assocDoc.id,
          transferredAt: serverTimestamp(),
          reason: 'organization_deleted',
          initiatedBy: userId
        }),
        updatedAt: serverTimestamp()
      });

      // Adaugă în directAssociations ale adminului
      const adminRef = doc(db, 'users', assoc.adminId);
      transaction.update(adminRef, {
        directAssociations: arrayUnion(assocDoc.id),
        updatedAt: serverTimestamp()
      });

      // Notificare admin
      await sendOrgDeletedNotification(assoc.adminId, assoc, org);
    }

    // Pentru fiecare member - elimină din user.organizations[]
    const members = await getDocs(
      collection(db, 'organizations', orgId, 'members')
    );

    for (const memberDoc of members.docs) {
      const member = memberDoc.data();
      const userRef = doc(db, 'users', member.userId);
      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data();

      transaction.update(userRef, {
        organizations: userData.organizations.filter(o => o.id !== orgId),
        updatedAt: serverTimestamp()
      });
    }

    // Elimină owners din user.organizations[]
    for (const ownerId of org.ownerIds) {
      const userRef = doc(db, 'users', ownerId);
      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data();

      transaction.update(userRef, {
        organizations: userData.organizations.filter(o => o.id !== orgId),
        updatedAt: serverTimestamp()
      });
    }

    // Soft delete organization
    transaction.update(orgRef, {
      status: 'inactive',
      deletedAt: serverTimestamp(),
      deletedBy: userId,
      updatedAt: serverTimestamp()
    });
  });
}
```

### Dashboard General - Statistici Complete

Când userul este pe Dashboard General (nu pe o asociație specifică):

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Dashboard General                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ 12          │  │ 847         │  │ 156,432 RON │  │ 23,567 RON  │    │
│  │ Asociații   │  │ Apartamente │  │ De încasat  │  │ Restanțe    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ Billing Overview                                                │     │
│  │ ─────────────────────────────────────────────────────────────── │     │
│  │ Plan: Professional (3 RON/apt)                                  │     │
│  │ Apartamente totale: 847                                         │     │
│  │ Cost lunar: 2,541 RON                                           │     │
│  │ Status: ✅ Active (plătit până la 15 Feb 2025)                  │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  Asociații                                                     [+ Nouă] │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│  │ Vulturul B4A   │ │ Florilor A2    │ │ Mihai Viteazu  │              │
│  │ 45 apt │ 🟢    │ │ 32 apt │ 🟢    │ │ 78 apt │ 🟡    │              │
│  │ Sept: 12,340   │ │ Sept: 8,456    │ │ Sept: 18,234   │              │
│  │ Restanțe: 450  │ │ Restanțe: 0    │ │ Restanțe: 2,100│              │
│  └────────────────┘ └────────────────┘ └────────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Indicatori status (punctele colorate):**
- 🟢 Verde: Totul în regulă
- 🟡 Galben: Restanțe > 5% din total sau sheet nepublicat
- 🔴 Roșu: Restanțe > 20% sau probleme critice

---

## Plan de implementare

### Faza 1: Schema & Backend
- Update User schema (organizations[], directAssociations[])
- Creare Organizations collection
- Update Association schema (organizationId, president object, censors[])
- Creare Association members subcollection

### Faza 2: Permissions System
- Hook usePermissions.js cu hasPermission(), canAccess()
- Permission matrix mapping role → permissions[]

### Faza 3: UI Components
- ContextSelectorView.js (pagina selecție)
- OrganizationView.js (dashboard organizație)
- OrganizationMembersView.js (gestionare angajați)
- Association leadership settings (tab nou)

### Faza 4: Flows & Integrations
- Invitation flow (email magic link)
- Organization creation flow
- Soft delete organization flow
- Context switching logic

### Faza 5: Security & Cleanup
- Firestore security rules per-tenant
- Update AuthContext
- Cleanup și teste

---

## Istoric versiuni

| Versiune | Data | Modificări |
|----------|------|------------|
| 1.0 | Ianuarie 2025 | Document inițial |
| 2.0 | Ianuarie 2025 | Multi-org, Founder privilege, Hibrid mode, President/Cenzor opțional |
| 2.1 | Ianuarie 2025 | UI/UX (sidebar adaptiv, full context switch), Firebase (transactions, indexes, security rules), Resend (email templates, rate limiting), Validare (CUI, email, telefon), Edge cases, Loading states |
| 2.2 | Ianuarie 2025 | Billing & Data Retention (pricing tiers, moduri facturare, transfer flows, soft delete cu billing, Dashboard General) |

---

## Checklist Completitudine

### Ce avem documentat:
- [x] Decizii arhitecturale (multi-org, founders, hibrid)
- [x] Entități și relații
- [x] Roluri și permisiuni (matrice detaliată)
- [x] Structura Firebase (users, organizations, associations)
- [x] Flow-uri principale (înregistrare, creare org, invitare, etc.)
- [x] UI/UX patterns (sidebar adaptiv, context switching)
- [x] Câmpuri editabile per rol
- [x] Firebase: Indexes, Transactions, Security Rules
- [x] Email: Templates, Resend integration, Rate limiting
- [x] Edge cases și error handling
- [x] Validare (CUI, email, telefon, forms)
- [x] Loading states și UX patterns
- [x] Billing & Data Retention (pricing tiers, modes, transfer flows)
- [x] Dashboard General (statistici complete)
- [x] canDeleteAssociation() logic

### Ce rămâne de făcut la implementare:
- [ ] Unit tests pentru validări
- [ ] Integration tests pentru flows
- [ ] E2E tests pentru UI
- [ ] Performance testing (large datasets)
- [ ] Accessibility audit
- [ ] Mobile responsiveness testing
- [ ] Integrare plăți (Stripe sau alt provider)
- [ ] Sistem de facturare automată

---

*Document actualizat: Ianuarie 2025*
