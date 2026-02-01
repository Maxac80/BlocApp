# Plan: Integrare PayU Marketplace în BlocApp

**Data creării:** 25 Ianuarie 2026
**Status:** În așteptare implementare
**Prioritate:** Feature strategic

---

## Obiectiv

Implementarea plăților online pentru întreținere prin PayU Marketplace, unde:
- Locatarii plătesc prin portalul proprietarilor
- Banii merg direct în contul asociației (submerchant)
- BlocApp încasează comision procentual din fiecare tranzacție

## Context

După suspendarea platformei e-bloc de către BNR (20 ianuarie 2026), piața românească nu mai are o soluție de plăți online pentru asociații de proprietari. BlocApp poate deveni prima platformă care oferă această funcționalitate în mod legal, folosind modelul **PayU Marketplace** care respectă cerințele PSD2.

### De ce PayU Marketplace?
- **Conformitate PSD2** - PayU este procesator licențiat, BlocApp nu atinge banii
- **Split payments** - Banii merg direct la asociație, comisionul la BlocApp
- **Prezență locală** - Suport în România, documentație în română
- **Metode multiple** - Card, Google Pay, Apple Pay, transfer bancar

---

## Arhitectura Propusă

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOCATAR                                  │
│                   (OwnerPaymentsView)                           │
│                          │                                       │
│                    Click "Plătește"                             │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE CLOUD FUNCTION                       │
│                   initiatePayUPayment()                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 1. Validează user + apartament + datorii               │    │
│  │ 2. Obține submerchant ID (asociație) din Firestore     │    │
│  │ 3. Calculează: amount + commission (ex: 1.5%)          │    │
│  │ 4. Creează order PayU cu shoppingCarts (split)         │    │
│  │ 5. Returnează URL pagină de plată                      │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PayU HOSTED PAGE                            │
│         Locatar introduce date card / Google Pay / etc.         │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PayU SPLIT AUTOMATIC                          │
│  ┌──────────────────┐    ┌──────────────────────────────┐      │
│  │ 98.5% → Asociație│    │ 1.5% → BlocApp (comision)    │      │
│  │  (submerchant)   │    │     (marketplace fee)        │      │
│  └──────────────────┘    └──────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK PayU → Cloud Function                 │
│                     handlePayUWebhook()                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 1. Validează HMAC signature                            │    │
│  │ 2. Verifică idempotency (duplicate check)              │    │
│  │ 3. Dacă SUCCESS → salvează în sheet.payments[]         │    │
│  │ 4. Real-time sync actualizează UI instant              │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Faze de Implementare

### Faza 1: Setup PayU Account & Config

**Acțiuni manuale (nu cod):**
1. Contact PayU Romania pentru contract Marketplace
2. Obține credențiale sandbox: `POS_ID`, `SECOND_KEY`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`
3. Configurează webhook URL în PayU Dashboard

**Fișiere de creat:**
- `functions/.env` - variabile de mediu pentru Cloud Functions
- `functions/config/payu.js` - configurare PayU

### Faza 2: Firebase Cloud Functions pentru PayU

**Fișier nou:** `functions/src/payu/index.js`

```javascript
// Funcții de implementat:
1. initiatePayUPayment(data) - Creează order cu split
2. handlePayUWebhook(req, res) - Procesează callback
3. getPayUAccessToken() - OAuth pentru API
4. validateWebhookSignature(req) - Securitate HMAC
```

**Fișier nou:** `functions/src/payu/payuApi.js`
- Wrapper pentru PayU REST API
- Metode: createOrder, getOrderStatus, initiateRefund

**Structura order PayU cu split:**
```javascript
{
  merchantPosId: "POS_ID",
  totalAmount: 50000, // 500 RON în bani
  currencyCode: "RON",
  description: "Întreținere Ianuarie 2026 - Ap. 102",
  buyer: {
    email: "locatar@email.com",
    extCustomerId: "user_firebase_uid"
  },
  shoppingCarts: [
    {
      extCustomerId: "asociatie_abc123", // Submerchant ID
      amount: 49250, // 492.50 RON (98.5%)
      products: [{
        name: "Întreținere Ianuarie 2026",
        unitPrice: 49250,
        quantity: 1
      }]
    }
  ],
  // Diferența 7.50 RON (1.5%) = marketplace fee
  notifyUrl: "https://us-central1-blocapp.cloudfunctions.net/handlePayUWebhook",
  continueUrl: "https://blocapp.ro/owner/payment-success"
}
```

### Faza 3: Onboarding Asociații ca Submerchants

**Fișier nou:** `functions/src/payu/submerchants.js`
- `registerSubmerchant(associationData)` - Înregistrare nouă asociație
- `getSubmerchantStatus(extCustomerId)` - Verifică status KYC
- `getSubmerchantBalance(extCustomerId)` - Sold disponibil

**Modificări Firestore - schema asociație:**
```javascript
// /associations/{associationId}
{
  // ... câmpuri existente ...

  // NOU - PayU integration
  payu: {
    submerchantId: "asociatie_abc123", // extCustomerId în PayU
    status: "ACTIVE", // PENDING, ACTIVE, SUSPENDED
    onboardedAt: Timestamp,
    bankAccount: {
      iban: "RO49AAAA1B31007593840000",
      bankName: "BCR",
      accountHolder: "Asociația de Proprietari Bloc 5"
    },
    kycDocuments: {
      cui: "uploaded",
      contract: "verified"
    },
    feeModel: "PAYER", // sau "ASSOCIATION"
    blocappFeePercent: 1.5
  }
}
```

**UI pentru onboarding (Admin):**
- Nou view în settings asociație pentru configurare PayU
- Formular pentru date bancare + documente KYC
- Status indicator pentru procesul de verificare

### Faza 4: Hook usePayU pentru Frontend

**Fișier nou:** `src/hooks/usePayU.js`

```javascript
export const usePayU = () => {
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);

  // Metode
  const initiatePayment = async (apartmentId, amount, breakdown) => {...};
  const checkPaymentStatus = async (paymentId) => {...};
  const getPaymentHistory = async (apartmentId) => {...};

  return {
    initiatePayment,
    checkPaymentStatus,
    getPaymentHistory,
    isProcessing,
    paymentStatus,
    error
  };
};
```

### Faza 5: Modificări UI Portal Locatari

**Fișier modificat:** `src/components/owner/views/OwnerPaymentsView.js`

Înlocuiește placeholder-ul cu:
1. Buton "Plătește cu cardul" care apelează `initiatePayment()`
2. Modal cu breakdown (restanțe, întreținere, penalități, comision)
3. Redirect la PayU hosted page
4. Pagină de return cu status (success/failure)

**Fișier nou:** `src/components/owner/views/PaymentSuccessView.js`
- Confirmare plată
- Chitanță digitală
- Link înapoi la dashboard

**Fișier nou:** `src/components/owner/views/PaymentFailedView.js`
- Mesaj eroare
- Opțiuni retry
- Contact suport

### Faza 6: Extindere useIncasari pentru PayU

**Fișier modificat:** `src/hooks/useIncasari.js`

Adaugă:
```javascript
// Metodă nouă pentru plăți PayU (apelată din webhook)
const addPayUIncasare = async (payuData) => {
  const paymentRecord = {
    id: `payment_payu_${payuData.orderId}`,
    apartmentId: payuData.apartmentId,
    restante: payuData.breakdown.restante,
    intretinere: payuData.breakdown.intretinere,
    penalitati: payuData.breakdown.penalitati,
    total: payuData.amount,
    timestamp: new Date().toISOString(),
    paymentMethod: "payu",
    payuOrderId: payuData.orderId,
    payuTransactionId: payuData.transactionId,
    receiptNumber: generateReceiptNumber(),
    notes: `Plată online PayU - ${payuData.cardType || 'Card'}`
  };

  return addIncasare(paymentRecord);
};
```

### Faza 7: Admin View pentru Plăți Online

**Fișier nou:** `src/components/views/OnlinePaymentsView.js`

Dashboard admin pentru:
- Lista plăților online (filtru pe asociații)
- Status tranzacții (pending, completed, failed)
- Rapoarte comisioane încasate
- Export CSV/Excel

---

## Fișiere de Creat/Modificat

### Fișiere Noi (Cloud Functions)
| Fișier | Descriere |
|--------|-----------|
| `functions/src/payu/index.js` | Entry point funcții PayU |
| `functions/src/payu/payuApi.js` | Wrapper PayU REST API |
| `functions/src/payu/submerchants.js` | Gestionare submerchants |
| `functions/src/payu/webhooks.js` | Handler webhook-uri |
| `functions/src/payu/utils.js` | HMAC validation, helpers |

### Fișiere Noi (Frontend)
| Fișier | Descriere |
|--------|-----------|
| `src/hooks/usePayU.js` | Hook pentru plăți PayU |
| `src/hooks/useSubmerchantOnboarding.js` | Hook pentru onboarding asociații |
| `src/components/owner/views/PaymentSuccessView.js` | Pagină confirmare |
| `src/components/owner/views/PaymentFailedView.js` | Pagină eroare |
| `src/components/views/OnlinePaymentsView.js` | Admin dashboard plăți |
| `src/components/modals/PayUOnboardingModal.js` | Modal setup asociație |

### Fișiere Modificate
| Fișier | Modificări |
|--------|------------|
| `src/hooks/useIncasari.js` | Adaugă `addPayUIncasare()` |
| `src/components/owner/views/OwnerPaymentsView.js` | Integrare buton plată |
| `src/components/owner/OwnerApp.js` | Adaugă rute success/failed |
| `src/components/views/AssociationSettingsView.js` | Secțiune PayU setup |

---

## Model Comision

**Structură: Comision BlocApp 1.5% + Comision PayU variabil (~2.5%)**

### Cine suportă comisionul PayU?

Fiecare asociație alege una din opțiuni la configurare:

**Opțiunea A: Locatarul suportă comisionul (feeModel: "PAYER")**
```
Întreținere: 500 RON
+ Comision procesare: 12.50 RON (2.5%)
= Total plătit: 512.50 RON

→ Asociația primește: 492.50 RON (98.5%)
→ BlocApp primește: 7.50 RON (1.5%)
→ PayU primește: 12.50 RON (din suma adăugată)
```

**Opțiunea B: Asociația suportă comisionul (feeModel: "ASSOCIATION")**
```
Întreținere: 500 RON (locatarul plătește exact atât)

→ Asociația primește: 480 RON (96%)
→ BlocApp primește: 7.50 RON (1.5%)
→ PayU primește: 12.50 RON (2.5%)
```

### Payout: Automat
Banii sunt transferați automat în contul bancar al asociației:
- Frecvență: zilnic sau săptămânal (configurabil în PayU)
- Settlement: T+1 sau T+2 (depinde de contract PayU)

---

## Securitate

1. **HMAC Signature** - Validare obligatorie pe toate webhook-urile
2. **Idempotency** - Check duplicate payuOrderId înainte de salvare
3. **HTTPS only** - Toate endpoint-urile Cloud Functions
4. **Rate limiting** - Max 100 req/min per IP pe initiatePayment
5. **Input validation** - Sanitizare toate datele primite
6. **Audit logging** - Log toate tranzacțiile în `/associations/{id}/audit_logs`

---

## Testare

### Sandbox Testing
1. Folosește PayU Sandbox environment
2. Carduri test: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)
3. Webhook testing cu ngrok pentru development local

### Test Cases
- [ ] Plată completă cu succes
- [ ] Plată eșuată (card declined)
- [ ] Plată parțială (doar restanțe)
- [ ] Webhook duplicate (idempotency)
- [ ] Asociație fără PayU setup (error handling)
- [ ] Real-time sync după plată
- [ ] Refund flow

---

## Dependențe NPM

**Cloud Functions:**
```json
{
  "axios": "^1.6.0",
  "crypto": "built-in",
  "firebase-admin": "existing",
  "firebase-functions": "existing"
}
```

**Frontend:**
```json
{
  // Nu sunt necesare dependențe noi
  // PayU folosește redirect la hosted page
}
```

---

## Timeline

| Fază | Descriere | Dependențe |
|------|-----------|------------|
| 1 | Setup PayU Account | Contract cu PayU |
| 2 | Cloud Functions | Credențiale PayU |
| 3 | Submerchant Onboarding | Faza 2 |
| 4 | Hook usePayU | Faza 2 |
| 5 | UI Portal Locatari | Faza 4 |
| 6 | Extindere useIncasari | Faza 2 |
| 7 | Admin Dashboard | Faza 5, 6 |

---

## Decizii Luate

1. **Procesor plăți:** PayU Marketplace (nu Stripe Connect)
2. **Comision PayU:** Configurabil per asociație (locatar sau asociație suportă)
3. **Payout:** Automat (zilnic/săptămânal)
4. **Comision BlocApp:** 1.5% din tranzacție

## Întrebări Rămase

1. **Refund policy** - Cine poate iniția refund și în ce condiții?
2. **Minimum transaction** - Sumă minimă pentru plată online? (recomand: 10 RON)

---

## Verificare End-to-End

### Pre-requisite
- [ ] Contract PayU Marketplace semnat
- [ ] Credențiale sandbox primite
- [ ] Webhook URL configurat în PayU Dashboard

### Test Flow Complet
1. **Onboarding Asociație**
   - Creează asociație nouă în BlocApp
   - Configurează PayU în settings (IBAN, KYC)
   - Verifică status "ACTIVE" în Firestore

2. **Plată Test (Sandbox)**
   - Loghează ca locatar în portal
   - Click "Plătește cu cardul"
   - Folosește card test: `4242 4242 4242 4242`
   - Verifică redirect la success page

3. **Verificare Webhook**
   - Monitorizează Cloud Functions logs
   - Verifică plata salvată în `sheet.payments[]`
   - Verifică `paymentMethod: "payu"`

4. **Real-time Sync**
   - Verifică UI locatar actualizat instant
   - Verifică UI admin vede plata
   - Verifică breakdown corect (restanțe/întreținere/penalități)

5. **Verificare Split**
   - În PayU Dashboard, verifică suma la asociație
   - Verifică comision BlocApp

### Commands pentru Testare
```bash
# Deploy Cloud Functions
cd functions && npm run deploy

# Watch logs
firebase functions:log --only initiatePayUPayment,handlePayUWebhook

# Test local cu emulator
firebase emulators:start --only functions

# Ngrok pentru webhook testing
ngrok http 5001
```

---

## Resurse Utile

- [PayU Europe Developer Guide](https://developers.payu.com/europe/)
- [PayU Marketplace Integration](https://developers.payu.com/europe/docs/services/marketplace/integration/)
- [PayU Romania](https://romania.payu.com/en/marketplace/)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
