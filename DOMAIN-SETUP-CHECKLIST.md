# 📋 CHECKLIST - Configurare Domeniu Producție

## 🌐 DUPĂ CE CUMPERI DOMENIUL:

### 1. **Actualizează API Key Restrictions în Google Cloud Console**
- [ ] Mergi la: https://console.cloud.google.com/apis/credentials/key/31d4f6cb-9b35-4d58-89a4-11e69a2e9c14?project=blocapp-production
- [ ] La "Website restrictions", adaugă:
  - `https://your-domain.ro/*`
  - `https://www.your-domain.ro/*`
  - `http://your-domain.ro/*` (temporar, până configurezi HTTPS)
  - `http://www.your-domain.ro/*` (temporar)

### 2. **Configurează Firebase Authentication**
- [ ] Firebase Console → Authentication → Settings → Authorized domains
- [ ] Adaugă domeniul tău nou:
  - `your-domain.ro`
  - `www.your-domain.ro`

### 3. **Actualizează Security Configuration**
- [ ] Editează `/src/config/security.js`
- [ ] Adaugă domeniul în `ALLOWED_DOMAINS`:
```javascript
const ALLOWED_DOMAINS = [
  'localhost:3000',
  'your-domain.ro',
  'www.your-domain.ro'
];
```

### 4. **Setup Hosting (Opțiuni)**

#### Opțiunea A: Firebase Hosting (GRATUIT și UȘOR)
```bash
# Instalează Firebase CLI
npm install -g firebase-tools

# Inițializează Firebase Hosting
firebase init hosting

# Build aplicația
npm run build

# Deploy
firebase deploy --only hosting
```

#### Opțiunea B: Netlify (GRATUIT)
1. Build: `npm run build`
2. Upload folderul `build` la Netlify
3. Configurează domeniul custom în Netlify

#### Opțiunea C: Vercel (GRATUIT)
```bash
npm i -g vercel
vercel --prod
```

### 5. **Configurează SSL/HTTPS**
- [ ] Dacă folosești Firebase Hosting - SSL automat ✅
- [ ] Dacă folosești Netlify/Vercel - SSL automat ✅
- [ ] Dacă folosești alt hosting - Let's Encrypt gratuit

### 6. **Environment Variables pentru Producție**
- [ ] În serviciul de hosting ales, setează variabilele:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=blocapp-production.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=blocapp-production
REACT_APP_FIREBASE_STORAGE_BUCKET=blocapp-production.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=863224331178
REACT_APP_FIREBASE_APP_ID=1:863224331178:web:ef06ed8ffa96051bc0c9d3
```

### 7. **DNS Configuration**
După ce cumperi domeniul:
- [ ] Dacă folosești Firebase Hosting:
  - A record → IP-urile de la Firebase
  - CNAME pentru www → your-project.web.app
- [ ] Dacă folosești Netlify/Vercel:
  - Urmează instrucțiunile lor pentru DNS

### 8. **Testare Finală**
- [ ] Testează pe `https://your-domain.ro`
- [ ] Verifică autentificarea funcționează
- [ ] Verifică că Firestore funcționează
- [ ] Testează pe mobil și desktop

### 9. **Monitorizare Post-Launch**
- [ ] Setează Google Analytics
- [ ] Verifică Firebase Console pentru erori
- [ ] Monitorizează Usage & Billing

### 10. **Backup & Securitate**
- [ ] Activează Firestore backups automate
- [ ] Documentează procesul de deploy
- [ ] Salvează DNS settings

## 🚀 COMENZI RAPIDE PENTRU DEPLOY:

### Firebase Hosting:
```bash
npm run build && firebase deploy
```

### Manual Upload:
```bash
npm run build
# Apoi upload manual folderul 'build' la hosting
```

## 📝 NOTE IMPORTANTE:
- ÎNTOTDEAUNA testează pe localhost înainte de deploy
- Fă backup la baza de date înainte de schimbări majore
- Păstrează versiunea de development separată
- Nu uita să elimini restricțiile HTTP după ce HTTPS funcționează

## 🔒 SECURITATE EXTRA DUPĂ DOMENIU:
1. Activează HSTS headers
2. Implementează Content Security Policy
3. Adaugă rate limiting
4. Configurează CORS corect

## 💰 COSTURI ESTIMATE:
- Domeniu .ro: ~50 RON/an
- Firebase (Free tier): 0 RON pentru început
- SSL: Gratuit cu Firebase/Netlify/Vercel
- Total: ~50 RON/an

## 🆘 TROUBLESHOOTING:
- Dacă API Key nu funcționează: așteaptă 5-10 minute
- Dacă SSL nu merge: verifică DNS propagation (24-48h)
- Dacă auth nu merge: verifică Authorized Domains în Firebase