# ⚠️ ALERTĂ SECURITATE - Chei Firebase Expuse

## 🔴 PROBLEMĂ CRITICĂ IDENTIFICATĂ
Cheile Firebase au fost expuse în istoricul Git în commit-urile anterioare. Deși acum sunt mutate în `.env`, ele încă există în istoricul repository-ului.

## 🛡️ CE AM FĂCUT DEJA
✅ **1. Am mutat configurația Firebase în variabile de mediu:**
- Creat fișier `.env` cu cheile Firebase
- Modificat `src/firebase.js` să folosească `process.env`
- Adăugat `.env` în `.gitignore`
- Creat `.env.example` pentru documentație

## 🚨 CE TREBUIE FĂCUT URGENT

### Opțiunea A: **RECOMANDATĂ - Regenerează Cheile Firebase**
1. **Mergi în Firebase Console:** https://console.firebase.google.com
2. **Navighează la:** Project Settings → General
3. **Regenerează API Key:**
   - Click pe "Web API Key" → Generate new key
4. **Actualizează `.env`** cu noua cheie
5. **Testează aplicația** să funcționeze cu noua cheie

### Opțiunea B: **Curăță Istoricul Git (Complexă)**
```bash
# ATENȚIE: Aceasta va rescrie ÎNTREGUL istoric Git!
# Fă backup înainte!

# 1. Instalează BFG Repo-Cleaner
# Download: https://rtyley.github.io/bfg-repo-cleaner/

# 2. Clonează repository-ul
git clone --mirror https://github.com/[username]/blocapp.git

# 3. Creează un fișier cu cheile de înlocuit
echo "AIzaSyAnXz1rkkMqxe564Px5OUAIJCbSbZKHvw8" >> passwords.txt
echo "863224331178" >> passwords.txt
echo "1:863224331178:web:ef06ed8ffa96051bc0c9d3" >> passwords.txt

# 4. Rulează BFG pentru a înlocui cheile
java -jar bfg.jar --replace-text passwords.txt blocapp.git

# 5. Curăță și forțează push
cd blocapp.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### Opțiunea C: **Arhivează și Recreează Repository**
1. Fă backup la codul actual
2. Șterge repository-ul de pe GitHub  
3. Creează un repository nou
4. Push doar codul curat (fără istoric)

## 📋 CHECKLIST SECURITATE POST-REMEDIERE

- [ ] **Firebase Security Rules** - Verifică și întărește regulile în Firebase Console
- [ ] **Activează App Check** - Pentru a preveni utilizarea neautorizată
- [ ] **Setează Domain Restrictions** - Permite doar domeniile tale
- [ ] **Monitorizează Usage** - Verifică Firebase Console pentru activitate suspectă
- [ ] **Rotește toate cheile** - Nu doar API key, ci toate credențialele

## 🔒 PREVENȚIE VIITOARE

1. **NICIODATĂ nu hardcoda chei în cod**
2. **Folosește `.env` pentru toate secretele**  
3. **Verifică înainte de commit:** `git diff --staged`
4. **Folosește git-secrets:** 
   ```bash
   # Instalează git-secrets
   brew install git-secrets # sau echivalent Windows
   
   # Configurează pentru proiect
   git secrets --install
   git secrets --register-aws # detectează pattern-uri comune
   ```

5. **Pre-commit hooks:**
   ```bash
   # Adaugă în .git/hooks/pre-commit
   if git diff --staged | grep -E "(apiKey|authDomain|projectId)"; then
     echo "EROARE: Posibile chei Firebase detectate!"
     exit 1
   fi
   ```

## 📞 ACȚIUNI IMEDIATE

### 1️⃣ **URGENT (Azi):**
- Regenerează API Key în Firebase Console
- Actualizează `.env` cu noua cheie
- Testează aplicația

### 2️⃣ **IMPORTANT (Această săptămână):**
- Configurează Firebase Security Rules stricte
- Activează App Check
- Setează domain restrictions

### 3️⃣ **CURÂND (Această lună):**
- Decide asupra curățării istoricului Git
- Implementează git-secrets
- Training echipă despre securitate

## 📝 NOTE IMPORTANTE

- **Cheile actuale pot fi compromise** - Oricine cu acces la istoricul Git le poate vedea
- **Firebase facturare** - Monitorizează pentru utilizare neașteptată
- **Acest fișier** - Poate fi șters după rezolvarea completă

## 🆘 RESURSE UTILE

- [Firebase Security Checklist](https://firebase.google.com/docs/projects/security-checklist)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Git-secrets by AWS](https://github.com/awslabs/git-secrets)

---

**Data alertei:** 16 Septembrie 2025
**Severitate:** CRITICĂ
**Status:** În remediere