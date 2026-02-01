/**
 * 💳 PAYU CLIENT - PLACEHOLDER PENTRU INTEGRARE
 *
 * Acest fișier conține structura pentru integrarea cu PayU România.
 * Va fi conectat când vei avea credențialele de la PayU.
 *
 * Documentație PayU:
 * - API Reference: https://developers.payu.com/en/restapi.html
 * - Recurring Payments: https://developers.payu.com/en/recurring.html
 * - Romania Specifics: https://romania.payu.com/
 *
 * Credențiale necesare (de obținut de la PayU):
 * - POS_ID (Merchant ID)
 * - CLIENT_ID
 * - CLIENT_SECRET
 * - SECOND_KEY (pentru verificare signature)
 *
 * IMPORTANT: Credențialele trebuie stocate în environment variables,
 * NU în cod! Folosește .env.local pentru development.
 */

// ============================================
// CONFIGURARE
// ============================================

const PAYU_CONFIG = {
  // Sandbox URLs (pentru testare)
  sandbox: {
    baseUrl: 'https://secure.snd.payu.com',
    authUrl: 'https://secure.snd.payu.com/pl/standard/user/oauth/authorize',
    orderUrl: 'https://secure.snd.payu.com/api/v2_1/orders',
    tokenUrl: 'https://secure.snd.payu.com/pl/standard/user/oauth/token'
  },
  // Production URLs
  production: {
    baseUrl: 'https://secure.payu.com',
    authUrl: 'https://secure.payu.com/pl/standard/user/oauth/authorize',
    orderUrl: 'https://secure.payu.com/api/v2_1/orders',
    tokenUrl: 'https://secure.payu.com/pl/standard/user/oauth/token'
  }
};

// Detectează environment (va fi setat în .env)
const isProduction = process.env.REACT_APP_PAYU_ENVIRONMENT === 'production';
const config = isProduction ? PAYU_CONFIG.production : PAYU_CONFIG.sandbox;

// Credențiale (din environment variables)
const CREDENTIALS = {
  posId: process.env.REACT_APP_PAYU_POS_ID || null,
  clientId: process.env.REACT_APP_PAYU_CLIENT_ID || null,
  clientSecret: process.env.REACT_APP_PAYU_CLIENT_SECRET || null,
  secondKey: process.env.REACT_APP_PAYU_SECOND_KEY || null
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verifică dacă PayU este configurat
 */
export const isPayuConfigured = () => {
  return !!(
    CREDENTIALS.posId &&
    CREDENTIALS.clientId &&
    CREDENTIALS.clientSecret
  );
};

/**
 * Obține statusul configurării PayU
 */
export const getPayuConfigStatus = () => {
  const missing = [];
  if (!CREDENTIALS.posId) missing.push('POS_ID');
  if (!CREDENTIALS.clientId) missing.push('CLIENT_ID');
  if (!CREDENTIALS.clientSecret) missing.push('CLIENT_SECRET');

  return {
    configured: missing.length === 0,
    missingCredentials: missing,
    environment: isProduction ? 'production' : 'sandbox'
  };
};

// ============================================
// OAUTH TOKEN MANAGEMENT
// ============================================

let cachedToken = null;
let tokenExpiry = null;

/**
 * Obține OAuth access token de la PayU
 * Token-ul este cache-uit până la expirare
 */
export const getAccessToken = async () => {
  if (!isPayuConfigured()) {
    throw new Error('PayU is not configured. Missing credentials.');
  }

  // Verifică dacă avem token valid în cache
  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CREDENTIALS.clientId,
        client_secret: CREDENTIALS.clientSecret
      })
    });

    if (!response.ok) {
      throw new Error(`PayU auth failed: ${response.status}`);
    }

    const data = await response.json();

    // Cache token
    cachedToken = data.access_token;
    // Setează expiry cu 5 minute înainte de expirarea reală (safety margin)
    tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);

    return cachedToken;
  } catch (error) {
    console.error('❌ PayU getAccessToken error:', error);
    throw error;
  }
};

// ============================================
// ORDER CREATION
// ============================================

/**
 * Creează o comandă de plată în PayU
 *
 * @param {object} orderData - Datele comenzii
 * @returns {object} - Răspunsul PayU cu redirectUri
 */
export const createOrder = async (orderData) => {
  if (!isPayuConfigured()) {
    console.warn('⚠️ PayU not configured. Returning mock response.');
    return {
      success: false,
      configured: false,
      message: 'PayU is not configured. Please add credentials to enable card payments.',
      mockOrder: {
        orderId: `MOCK_${Date.now()}`,
        redirectUri: null
      }
    };
  }

  const {
    amount, // în bani (lei * 100, ex: 500 = 5.00 RON)
    currency = 'RON',
    description,
    customerEmail,
    customerFirstName,
    customerLastName,
    customerPhone,
    externalOrderId, // ID-ul plății din sistemul nostru
    continueUrl, // URL unde redirectăm după plată
    notifyUrl, // Webhook URL pentru notificări
    recurring = false, // Pentru tokenizare card
    cardOnFile = null // Token card salvat pentru recurring
  } = orderData;

  try {
    const accessToken = await getAccessToken();

    const order = {
      notifyUrl: notifyUrl || `${window.location.origin}/api/payu/webhook`,
      continueUrl: continueUrl || `${window.location.origin}/payment/complete`,
      customerIp: '127.0.0.1', // Ar trebui obținut din request
      merchantPosId: CREDENTIALS.posId,
      description,
      currencyCode: currency,
      totalAmount: Math.round(amount * 100).toString(), // PayU așteaptă în bani
      extOrderId: externalOrderId,
      buyer: {
        email: customerEmail,
        firstName: customerFirstName,
        lastName: customerLastName,
        phone: customerPhone,
        language: 'ro'
      },
      products: [
        {
          name: description,
          unitPrice: Math.round(amount * 100).toString(),
          quantity: '1'
        }
      ]
    };

    // Pentru tokenizare (salvare card pentru recurring)
    if (recurring) {
      order.recurring = 'FIRST';
    }

    // Pentru plată cu card salvat
    if (cardOnFile) {
      order.recurring = 'STANDARD';
      order.payMethods = {
        payMethod: {
          type: 'CARD_TOKEN',
          value: cardOnFile
        }
      };
    }

    const response = await fetch(config.orderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(order)
    });

    const data = await response.json();

    if (data.status?.statusCode === 'SUCCESS') {
      return {
        success: true,
        orderId: data.orderId,
        redirectUri: data.redirectUri,
        extOrderId: externalOrderId
      };
    } else {
      return {
        success: false,
        error: data.status?.statusDesc || 'Unknown error',
        statusCode: data.status?.statusCode
      };
    }
  } catch (error) {
    console.error('❌ PayU createOrder error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================
// ORDER STATUS
// ============================================

/**
 * Verifică statusul unei comenzi
 */
export const getOrderStatus = async (orderId) => {
  if (!isPayuConfigured()) {
    return {
      success: false,
      configured: false,
      message: 'PayU is not configured'
    };
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${config.orderUrl}/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    return {
      success: true,
      order: data.orders?.[0] || null,
      status: data.orders?.[0]?.status
    };
  } catch (error) {
    console.error('❌ PayU getOrderStatus error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Anulează o comandă
 */
export const cancelOrder = async (orderId) => {
  if (!isPayuConfigured()) {
    return { success: false, configured: false };
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${config.orderUrl}/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      success: response.ok
    };
  } catch (error) {
    console.error('❌ PayU cancelOrder error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================
// REFUNDS
// ============================================

/**
 * Procesează refund pentru o comandă
 */
export const createRefund = async (orderId, amount, description) => {
  if (!isPayuConfigured()) {
    return { success: false, configured: false };
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${config.orderUrl}/${orderId}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        refund: {
          description: description || 'Refund',
          amount: amount ? Math.round(amount * 100).toString() : undefined // Partial refund
        }
      })
    });

    const data = await response.json();

    return {
      success: data.status?.statusCode === 'SUCCESS',
      refund: data.refund,
      error: data.status?.statusDesc
    };
  } catch (error) {
    console.error('❌ PayU createRefund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================
// WEBHOOK VERIFICATION
// ============================================

/**
 * Verifică semnătura webhook-ului PayU
 * IMPORTANT: Aceasta ar trebui făcută pe server (Cloud Function)
 */
export const verifyWebhookSignature = (payload, signature) => {
  if (!CREDENTIALS.secondKey) {
    console.warn('⚠️ SECOND_KEY not configured for webhook verification');
    return false;
  }

  // Implementare verificare semnătură
  // Aceasta ar trebui făcută pe server folosind crypto
  // const expectedSignature = crypto
  //   .createHmac('md5', CREDENTIALS.secondKey)
  //   .update(payload)
  //   .digest('hex');

  // return signature === expectedSignature;

  console.warn('⚠️ Webhook signature verification should be done server-side');
  return true; // Placeholder
};

/**
 * Parsează notificarea webhook de la PayU
 */
export const parseWebhookNotification = (notification) => {
  const { order, localReceiptDateTime, properties } = notification;

  return {
    orderId: order?.orderId,
    extOrderId: order?.extOrderId,
    status: order?.status,
    totalAmount: order?.totalAmount ? parseInt(order.totalAmount) / 100 : 0,
    currencyCode: order?.currencyCode,
    customerEmail: order?.buyer?.email,
    payMethod: order?.payMethod,
    receivedAt: localReceiptDateTime,
    cardToken: properties?.find(p => p.name === 'PAYMENT_ID')?.value
  };
};

// ============================================
// CARD TOKEN MANAGEMENT
// ============================================

/**
 * Obține token-urile de card salvate pentru un customer
 * (Necesită integrare cu PayU Token Service)
 */
export const getStoredCards = async (customerId) => {
  if (!isPayuConfigured()) {
    return { success: false, cards: [] };
  }

  // PayU nu are un API direct pentru listare carduri
  // Token-urile sunt gestionate prin webhook-uri la prima plată
  // Ar trebui stocate în Firestore

  console.warn('⚠️ Card tokens should be stored in Firestore after first payment');
  return {
    success: true,
    cards: [],
    message: 'Card tokens are managed through payment webhooks'
  };
};

/**
 * Șterge un card salvat
 */
export const deleteStoredCard = async (cardToken) => {
  // PayU nu oferă API pentru ștergere token
  // Token-ul trebuie șters din Firestore
  console.warn('⚠️ Delete card token from Firestore');
  return { success: true };
};

// ============================================
// HELPERS
// ============================================

/**
 * Mapează statusul PayU la statusul intern
 */
export const mapPayuStatus = (payuStatus) => {
  const statusMap = {
    NEW: 'pending',
    PENDING: 'processing',
    WAITING_FOR_CONFIRMATION: 'processing',
    COMPLETED: 'completed',
    CANCELED: 'cancelled',
    REJECTED: 'failed'
  };

  return statusMap[payuStatus] || 'pending';
};

/**
 * Formatează suma pentru PayU (în bani)
 */
export const formatAmountForPayu = (amount) => {
  return Math.round(amount * 100);
};

/**
 * Parsează suma de la PayU (din bani în RON)
 */
export const parseAmountFromPayu = (amount) => {
  return parseInt(amount) / 100;
};

// ============================================
// EXPORT DEFAULT
// ============================================

const payuClient = {
  // Config
  isConfigured: isPayuConfigured,
  getConfigStatus: getPayuConfigStatus,

  // Auth
  getAccessToken,

  // Orders
  createOrder,
  getOrderStatus,
  cancelOrder,

  // Refunds
  createRefund,

  // Webhooks
  verifyWebhookSignature,
  parseWebhookNotification,

  // Cards
  getStoredCards,
  deleteStoredCard,

  // Helpers
  mapPayuStatus,
  formatAmountForPayu,
  parseAmountFromPayu
};

export default payuClient;

/**
 * ============================================
 * SETUP INSTRUCTIONS
 * ============================================
 *
 * 1. Obține credențiale de la PayU România:
 *    - Contactează PayU pentru cont de merchant
 *    - Solicită acces la sandbox pentru testare
 *
 * 2. Adaugă credențialele în .env.local:
 *    REACT_APP_PAYU_ENVIRONMENT=sandbox
 *    REACT_APP_PAYU_POS_ID=your_pos_id
 *    REACT_APP_PAYU_CLIENT_ID=your_client_id
 *    REACT_APP_PAYU_CLIENT_SECRET=your_client_secret
 *    REACT_APP_PAYU_SECOND_KEY=your_second_key
 *
 * 3. Configurează webhook URL în dashboard-ul PayU:
 *    https://your-domain.com/api/payu/webhook
 *
 * 4. Creează Cloud Function pentru procesare webhook:
 *    - Verifică semnătura
 *    - Actualizează statusul plății în Firestore
 *    - Salvează token card pentru recurring
 *
 * 5. Pentru go-live:
 *    - Schimbă REACT_APP_PAYU_ENVIRONMENT=production
 *    - Actualizează credențialele cu cele de producție
 *
 * ============================================
 */
