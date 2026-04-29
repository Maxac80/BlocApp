# 🔒 SECURITY CHECKLIST pentru BlocApp

## ⚠️ ACȚIUNI URGENTE (Fă ACUM!)

### 1. **Restricționează API Key în Google Cloud Console**
- [ ] Deschide: https://console.cloud.google.com/apis/credentials
- [ ] Selectează proiectul "blocapp-production"
- [ ] Click pe API Key → Edit
- [ ] Setează **HTTP referrers**:
  - `http://localhost:3000/*`
  - `https://your-domain.com/*` (când ai domeniul)
- [ ] Limitează la API-urile necesare:
  - Firebase Auth API
  - Cloud Firestore API
  - Cloud Storage for Firebase API

### 2. **Actualizează Firebase Security Rules**
- [ ] Deschide: https://console.firebase.google.com
- [ ] Firestore Database → Rules
- [ ] Copiează regulile din `firebase-security-rules.txt`
- [ ] Click "Publish"

### 3. **Activează App Check (Protecție Anti-Bot)**
- [ ] Firebase Console → App Check
- [ ] Register your app cu reCAPTCHA v3
- [ ] Enable enforcement pentru Firestore și Storage

### 4. **Verifică Authentication Settings**
- [ ] Firebase Console → Authentication → Settings
- [ ] Activează doar metodele necesare
- [ ] Setează authorized domains

## 📝 CE TREBUIE SĂ FACI DUPĂ CE REVOCI/RESTRICȚIONEZI CHEIA:

1. **Creează un nou fișier `.env` local**:
```bash
# Copiază .env.example în .env
copy .env.example .env
```

2. **Adaugă noile credențiale în `.env`**:
- Obține valorile din Firebase Console → Project Settings
- NU comita niciodată acest fișier!

3. **Testează aplicația**:
```bash
npm start
```

## 🛡️ MĂSURI DE SECURITATE PERMANENTE:

### Pentru Development:
- ✅ `.env` în `.gitignore` - VERIFICAT
- ✅ Nu hardcoda credențiale - VERIFICAT
- ✅ Folosește variabile de mediu - VERIFICAT

### Pentru Production:
- [ ] Folosește environment variables pe server
- [ ] Activează HTTPS obligatoriu
- [ ] Implementează rate limiting
- [ ] Monitorizează usage în Firebase Console

### Verificări Regulate:
- [ ] Verifică lunar Firebase Usage & Billing
- [ ] Verifică logs pentru activitate suspectă
- [ ] Actualizează Security Rules când adaugi features noi

## 🚨 CE SĂ FACI DACĂ SUSPECTEZI BREACH:

1. **Imediat**:
   - Dezactivează proiectul din Firebase Console
   - Verifică Firebase Usage pentru activitate neobișnuită

2. **Apoi**:
   - Creează proiect Firebase nou
   - Migrează datele
   - Actualizează aplicația cu noile credențiale

## 📊 Monitorizare:

### Verifică regulat în Firebase Console:
- **Usage tab** - pentru spike-uri neașteptate
- **Authentication** - pentru conturi suspecte
- **Firestore Usage** - pentru reads/writes anormale

### Setează alerte:
- Firebase Console → Project Settings → Budget alerts
- Setează limită de buget lunar (ex: $10)
- Vei primi email dacă se depășește

## 🔍 Verificare Finală:

Rulează această comandă pentru a verifica că nu mai ai chei expuse:
```bash
git log -p | findstr "AIzaSy"
```

Dacă găsește ceva, trebuie să cureți istoricul Git!