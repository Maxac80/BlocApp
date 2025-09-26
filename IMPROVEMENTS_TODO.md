# 📋 IMPROVEMENTS TODO - Pentru după finalizarea logicii de business

## ⚠️ NOTĂ IMPORTANTĂ
Aceste îmbunătățiri sunt pentru **DUPĂ** ce logica de business este complet implementată și testată.
Momentan focus-ul este pe: **TESTARE FLOW-URI și IDENTIFICARE FUNCȚIONALITĂȚI LIPSĂ**

---

## 🔧 Îmbunătățiri Tehnice (Pentru Mai Târziu)

### 1. Performanță
- [ ] Creează index-uri Firebase necesare:
  - `invoices`: associationId + createdAt (DESC)
  - `incasari`: associationId + month + createdAt (DESC)
  - `sheets`: associationId + status + createdAt (DESC)
  - `expenses`: associationId + month
- [ ] Implementează lazy loading pentru componente mari
- [ ] Optimizează re-render-uri cu React.memo
- [ ] Cache pentru date frecvent accesate

### 2. Testing
- [ ] Adaugă teste unitare pentru hooks
- [ ] Teste de integrare pentru flows critice
- [ ] E2E tests cu Cypress/Playwright
- [ ] Coverage minim 70%

### 3. Code Quality
- [ ] Curăță fișiere deprecated (useMonthManagement.old.js, ExpensesViewNew.js)
- [ ] Elimină console.log din producție
- [ ] Refactor hooks mari (useMaintenanceCalculation)
- [ ] Consideră TypeScript pentru type safety

### 4. Securitate
- [ ] Rate limiting pentru operațiuni
- [ ] Audit log pentru acțiuni importante
- [ ] 2FA pentru admini
- [ ] Backup automat date

---

## 🚀 Focus Actual: TESTARE & IDENTIFICARE FUNCȚIONALITĂȚI

### Ce trebuie testat:
1. **Flow-uri complete de business**
2. **Componente care lipsesc**
3. **Validări de date**
4. **Cazuri speciale și edge cases**
5. **User experience și navigare**

### Data ultimei actualizări:
25 septembrie 2025 - Document creat pentru tracking îmbunătățiri viitoare