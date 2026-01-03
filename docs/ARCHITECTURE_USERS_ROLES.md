# Arhitectura Utilizatori și Roluri - BlocApp

## Viziune generală

BlocApp suportă două scenarii de utilizare:
1. **Administrator individual** - o persoană fizică care administrează una sau mai multe asociații
2. **Firmă de administrare** - o companie cu mai mulți angajați care administrează multiple asociații

---

## Entități principale

```
┌──────────────────────────────────────────────────────────────┐
│                         USER                                  │
│  (persoană fizică care se înregistrează)                     │
│  - Poate fi admin independent                                 │
│  - Poate aparține unei Organization (max 1)                  │
│  - Poate fi proprietar (owner) în portal                     │
└──────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────┐      ┌─────────────────────┐
│    ORGANIZATION     │      │     ASSOCIATION     │
│  (firmă administrare)│      │  (asociație prop.)  │
│  - opțional         │      │                     │
│  - are members[]    │      │  - adminId          │
│  - are associations │      │  - organizationId?  │
└─────────────────────┘      │  - president        │
          │                  │  - censors[]        │
          │                  │  - owners[]         │
          └──────────────────┴─────────────────────┘
```

---

## Roluri

### 1. Roluri globale (la nivel de aplicație)

| Rol | Descriere |
|-----|-----------|
| `super_admin` | Developeri - acces total la sistem |
| `user` | Utilizator normal înregistrat |

### 2. Roluri la nivel de Organization (firmă)

| Rol | Descriere | Permisiuni |
|-----|-----------|------------|
| `org_owner` | Proprietarul/fondatorul firmei | Full access, poate șterge firma, transfer ownership |
| `org_admin` | Administrator în firmă | Gestionează angajați și asociații |
| `org_member` | Angajat | Administrează doar asociațiile alocate |

### 3. Roluri la nivel de Association (asociație)

| Rol | Descriere | Permisiuni |
|-----|-----------|------------|
| `assoc_admin` | Administratorul asociației | Full CRUD pe asociație |
| `assoc_president` | Președinte | Read + aprobare publicare (opțional) |
| `assoc_censor` | Cenzor (1-3 per asociație) | Read + audit reports |
| `assoc_owner` | Proprietar apartament | Read doar apartamentul/apartamentele lui |

**Notă**: Președintele și cenzorii sunt de obicei și proprietari (același user poate avea mai multe roluri).

---

## Matrice permisiuni detaliată

### Pentru app.blocapp.ro (Administrare)

| Acțiune | org_owner | org_admin | org_member | assoc_admin | president | censor |
|---------|-----------|-----------|------------|-------------|-----------|--------|
| Creare organizație | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ștergere organizație | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invitare angajați | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Alocare asociații | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Creare asociație | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Editare asociație | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| Adăugare cheltuieli | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| Gestionare apartamente | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| Creare sheet lunar | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| Publicare sheet | ✅ | ✅ | ✅* | ✅ | ⚙️** | ❌ |
| Vizualizare sheet | ✅ | ✅ | ✅* | ✅ | ✅ | ✅ |
| Vizualizare audit log | ✅ | ✅ | ✅* | ✅ | ✅ | ✅ |
| Export rapoarte | ✅ | ✅ | ✅* | ✅ | ✅ | ✅ |
| Invitare proprietari | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| Setări președinte/cenzori | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |

*doar pentru asociațiile alocate
**configurabil în setări (aprobare sau doar notificare)

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

  // Rol global
  role: 'user' | 'super_admin',

  // Apartenență la firmă (opțional, max 1)
  organization: {
    id: string,
    role: 'org_owner' | 'org_admin' | 'org_member',
    joinedAt: timestamp
  } | null,

  // Asociații administrate DIRECT (fără firmă)
  // Array gol dacă e angajat într-o firmă
  directAssociations: string[],

  // Profile extins (nested)
  profile: {
    personalInfo: {...},
    settings: {...},
    ...
  },

  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Organizations Collection (NOU)
```javascript
/organizations/{orgId} {
  name: string,              // "SC Administrare SRL"
  cui: string,               // CUI firmă
  registrationNumber: string, // Nr. Reg. Comerț
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

  ownerId: string,           // userId fondator/proprietar

  settings: {
    requirePresidentApproval: boolean,  // Workflow aprobare publicare
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
```

### Associations Collection (actualizat)
```javascript
/associations/{assocId} {
  name: string,
  cui: string,
  address: {...},
  contact: {...},
  bankAccount: string,

  // Cine administrează
  adminId: string,               // userId admin principal
  organizationId: string | null, // ID firmă (dacă e administrat de firmă)

  // Conducerea asociației
  president: {
    userId: string | null,       // Dacă are cont în sistem
    name: string,                // Numele (chiar dacă nu are cont)
    phone: string,
    email: string
  } | null,

  censors: [                     // 1-3 cenzori
    {
      userId: string | null,
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
/associations/{assocId}/members/{oderId} {
  oderId: string,
  role: 'assoc_admin' | 'assoc_president' | 'assoc_censor' | 'assoc_owner',
  apartmentIds: string[],        // Pentru owners - ce apartamente deține
  addedBy: string,               // Cine l-a adăugat
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
5. User poate crea asociații direct SAU crea/se alătura unei firme
```

### 2. Creare firmă de administrare
```
1. User autentificat → Setări → "Creează Organizație"
2. Completează date firmă (nume, CUI, etc.)
3. Se creează document în /organizations
4. User.organization = { id, role: 'org_owner', joinedAt }
5. User devine org_owner
```

### 3. Invitare angajat în firmă
```
1. org_owner/org_admin → Organizație → Invită angajat
2. Se trimite email cu link invitație
3. Destinatar click pe link:
   - Dacă are cont → login → acceptă invitație
   - Dacă nu are cont → register → acceptă invitație
4. Se creează document în /organizations/{orgId}/members
5. User.organization = { id, role: 'org_member', joinedAt }
```

### 4. Alocare asociație la angajat
```
1. org_owner/org_admin → Organizație → Angajați → Alocă asociații
2. Se updatează /organizations/{orgId}/members/{memberId}.assignedAssociations
3. Angajatul vede doar asociațiile alocate în dashboard
```

### 5. Setare președinte/cenzori
```
1. Admin asociație → Setări Asociație → Conducere
2. Introduce date președinte/cenzori
3. Opțional: trimite invitație să-și creeze cont (pentru acces portal)
4. Se updatează /associations/{assocId}.president și .censors
```

---

## Reguli importante

1. **Un user poate aparține la maximum O SINGURĂ firmă**
2. **Președintele și cenzorii sunt de obicei și proprietari** - același user poate avea mai multe roluri
3. **Asociațiile pot fi administrate direct sau prin firmă**, nu ambele simultan
4. **Workflow-ul de aprobare președinte este configurabil** per asociație
5. **Cenzorii sunt 1-3** conform legislației românești

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

## Migrare de la structura actuală

### Ce trebuie făcut:
1. Adăugare câmpuri noi în `/users` (organization, directAssociations)
2. Creare colecție `/organizations`
3. Adăugare câmpuri în `/associations` (organizationId, president, censors, settings)
4. Actualizare Firestore Security Rules
5. Actualizare UI pentru gestionare roluri

### Backward compatibility:
- Utilizatorii existenți rămân ca admini individuali (organization: null)
- Asociațiile existente rămân cu adminId actual (organizationId: null)

---

*Document creat: Ianuarie 2025*
*Ultima actualizare: Ianuarie 2025*
