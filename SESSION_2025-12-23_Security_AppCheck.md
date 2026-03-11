# Sesiune 23 Decembrie 2025 - App Check & Security Audit

## Rezumat Executiv

Această sesiune a continuat implementarea sistemului de invitații pentru proprietari și a inclus re-activarea App Check plus un audit de securitate complet.

---

## Ce s-a realizat

### 1. Verificare Sistem Invitații Proprietari
- **Status**: ✅ FUNCȚIONAL
- Email-ul de invitație a fost primit cu succes
- Proprietarul s-a putut loga folosind magic link-ul
- Flow complet testat end-to-end

### 2. Re-activare App Check / reCAPTCHA v3
- **Status**: ✅ RE-ACTIVAT (cu throttle temporar ~24h)
- Fișier modificat: `src/services/appCheck.js`
- App Check era dezactivat temporar din cauza unei erori de throttle anterioare

**Cod App Check:**
```javascript
// src/services/appCheck.js
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import app from '../firebase';

export const initAppCheck = () => {
  if (process.env.NODE_ENV === 'production') {
    const reCaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    if (reCaptchaSiteKey) {
      try {
        const appCheckInstance = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(reCaptchaSiteKey),
          isTokenAutoRefreshEnabled: true
        });
        console.info('App Check initialized successfully');
        return appCheckInstance;
      } catch (error) {
        console.error('Failed to initialize App Check:', error);
      }
    }
  }
  return null;
};

initAppCheck();
```

### 3. Verificare Configurație reCAPTCHA
- **Status**: ✅ CORECT CONFIGURAT
- Domenii înregistrate:
  - `administratori.blocapp.ro`
  - `locatari.blocapp.ro`
  - `blocapp.ro`
  - `localhost`

### 4. Throttle App Check
- **Problemă**: Firebase a aplicat throttle de ~24 ore din cauza erorilor 403 anterioare
- **Mesaj consolă**: `Requests throttled due to previous 403 error. Attempts allowed again after 23h:59m:30s`
- **Impact**: Aplicația funcționează normal, doar warning-uri în consolă
- **Rezolvare**: Se rezolvă automat după expirarea throttle-ului

---

## Audit Securitate

### Ce este BINE configurat
| Aspect | Status |
|--------|--------|
| Firebase Config în env vars | ✅ |
| `.env` în `.gitignore` | ✅ |
| HTTPS forțat (Vercel + Firebase) | ✅ |
| API Keys server în Vercel env | ✅ |
| Magic Links cu expirare (7 zile) | ✅ |
| App Check cu reCAPTCHA v3 | ✅ |
| Email verificat (blocapp.ro) | ✅ |

### 🚨 PROBLEME CRITICE IDENTIFICATE

#### 1. Firestore Rules - WIDE OPEN!
**Locație**: `firestore.rules`

**Actual (NESIGUR):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Problemă**: Orice utilizator autentificat poate citi/scrie ORICE în baza de date!

**Impact**:
- Un proprietar poate vedea datele TUTUROR asociațiilor
- Poate modifica/șterge date ale altor utilizatori
- Poate accesa informații confidențiale

**Soluție propusă** (de implementat):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users - doar propriul profil
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Associations - doar membrii pot citi
    match /associations/{assocId} {
      allow read: if isAssociationMember(assocId);
      allow write: if isAssociationAdmin(assocId);
    }

    // Nested collections
    match /associations/{assocId}/{collection}/{docId} {
      allow read: if isAssociationMember(assocId);
      allow write: if isAssociationAdmin(assocId);
    }

    // Owners - doar admin-ul asociației
    match /owners/{ownerId} {
      allow read, write: if isAssociationAdmin(resource.data.associationId);
    }

    // Helper functions
    function isAssociationMember(assocId) {
      return request.auth != null &&
        exists(/databases/$(database)/documents/associations/$(assocId)/members/$(request.auth.uid));
    }

    function isAssociationAdmin(assocId) {
      return request.auth != null &&
        get(/databases/$(database)/documents/associations/$(assocId)).data.adminId == request.auth.uid;
    }
  }
}
```

#### 2. CORS Headers prea permisive
**Locație**: `api/validate-invite-token.js`, `api/send-invitation-email.js`

**Actual:**
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Recomandat:**
```javascript
const allowedOrigins = [
  'https://administratori.blocapp.ro',
  'https://locatari.blocapp.ro',
  'http://localhost:3000'
];
const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

---

## Plan de Acțiune (TODO pentru viitor)

### Prioritate CRITICĂ
1. [ ] Implementare Firestore Security Rules granulare
2. [ ] Restricționare API Key în Firebase Console la domeniile specifice

### Prioritate MEDIE
3. [ ] CORS restrictiv pe API-uri Vercel
4. [ ] Rate Limiting pe endpoints
5. [ ] CSP Headers

### Prioritate MICĂ
6. [ ] Logging și monitoring
7. [ ] Audit trail pentru acțiuni sensibile

---

## Fișiere Modificate în Sesiune

1. `src/services/appCheck.js` - Re-activat App Check

---

## Configurații Verificate

### Firebase Console - App Check
- BlocApp înregistrat cu reCAPTCHA v3
- Provider: reCAPTCHA Enterprise

### reCAPTCHA Admin Console
- Label: BlocApp Production
- Type: v3
- Domenii: administratori.blocapp.ro, locatari.blocapp.ro, blocapp.ro, localhost

### Environment Variables Necesare
```
# Client-side (React)
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
REACT_APP_RECAPTCHA_SITE_KEY=...

# Server-side (Vercel)
FIREBASE_SERVICE_ACCOUNT=... (JSON stringified)
RESEND_API_KEY=...
```

---

## Note Tehnice

### De ce App Check are throttle?
Firebase implementează un mecanism de protecție: dacă App Check primește erori 403 (forbidden), blochează cererile noi pentru ~24 ore. Aceasta previne abuzul în cazul configurărilor greșite.

### Firebase Config - De ce environment variables?
Deși Firebase API keys sunt "semi-publice" (apar în bundle-ul JS), folosirea env vars:
1. Permite configurații diferite per environment (dev/prod)
2. Previne commit-ul accidental în repository-uri publice
3. Respectă best practices de securitate

### Diferența App Check vs Firestore Rules
- **App Check**: Verifică că cererea vine de pe site-ul tău (anti-bot, anti-scraping)
- **Firestore Rules**: Verifică CE date poate accesa utilizatorul autentificat

AMBELE sunt necesare pentru securitate completă!

---

## Următoarea Sesiune

**PRIORITATE**: Implementare Firestore Security Rules

Aceasta este cea mai importantă problemă de securitate. Trebuie:
1. Analizat modelul de date complet
2. Definit relațiile user-association-owner
3. Scris reguli granulare
4. Testat cu Firebase Emulator
5. Deploy în producție

---

*Generat: 23 Decembrie 2025*
*Ultima actualizare App Check: throttle expiră ~24 Decembrie 2025*
