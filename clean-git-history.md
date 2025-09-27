# 🧹 Curățare Istoric Git - Eliminare Chei API

## ⚠️ AVERTISMENT
Această procedură va RESCRIE istoricul Git și necesită force push.
Toți colaboratorii vor trebui să-și cloneze din nou repository-ul.

## Opțiunea 1: BFG Repo-Cleaner (RECOMANDATĂ)

### Pași:
1. **Fă backup la repository**:
```bash
cp -r blocapp blocapp-backup
```

2. **Descarcă BFG**:
- https://rtyley.github.io/bfg-repo-cleaner/

3. **Creează un fișier cu cheile de înlocuit**:
```bash
echo "AIzaSyAnXz1rkkMqxe564Px5OUAIJCbSbZKHvw8" > keys-to-remove.txt
```

4. **Rulează BFG**:
```bash
java -jar bfg.jar --replace-text keys-to-remove.txt blocapp
```

5. **Curăță și push**:
```bash
cd blocapp
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

## Opțiunea 2: Git Filter-Branch

```bash
# DOAR dacă nu merge BFG
git filter-branch --tree-filter \
  "find . -type f -name '*.js' -o -name '*.json' -o -name '.env*' | \
   xargs sed -i 's/AIzaSyAnXz1rkkMqxe564Px5OUAIJCbSbZKHvw8/REMOVED_API_KEY/g'" \
  --tag-name-filter cat -- --all
```

## După Curățare:

1. **Verifică că nu mai există chei**:
```bash
git log -p | grep "AIzaSy"
```

2. **Notifică colaboratorii** să facă:
```bash
git clone https://github.com/yourusername/blocapp.git blocapp-new
```

## Alternative Sigure:

Dacă nu vrei să modifici istoricul:

1. **Creează repository nou**:
   - Fă export la codul actual (fără .git)
   - Creează repo nou pe GitHub
   - Comite codul curat

2. **Arhivează repo-ul vechi**:
   - Settings → Archive repository
   - Lasă un README cu link către noul repo