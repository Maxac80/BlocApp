/**
 * Vercel Serverless Function pentru validare token invitație
 *
 * Endpoint: POST /api/validate-invite-token
 * Body: { token }
 *
 * Returnează datele owner-ului dacă token-ul e valid
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inițializare Firebase Admin (o singură dată)
function getFirebaseAdmin() {
  if (getApps().length === 0) {
    // Credențialele sunt stocate ca environment variable în Vercel
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!rawServiceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch (parseError) {
      throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: ${parseError.message}`);
    }

    // Fix pentru newlines în private_key (Vercel poate escapa \n)
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    // Validare că avem câmpurile necesare
    if (!serviceAccount.project_id) {
      throw new Error('Service account missing project_id');
    }
    if (!serviceAccount.private_key) {
      throw new Error('Service account missing private_key');
    }
    if (!serviceAccount.client_email) {
      throw new Error('Service account missing client_email');
    }

    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const db = getFirebaseAdmin();

    // Caută owner-ul cu acest token
    const ownersRef = db.collection('owners');
    const snapshot = await ownersRef.where('invitation.token', '==', token).get();

    if (snapshot.empty) {
      return res.status(404).json({
        valid: false,
        error: 'Token invalid sau expirat'
      });
    }

    const ownerDoc = snapshot.docs[0];
    const owner = { id: ownerDoc.id, ...ownerDoc.data() };

    // Verifică expirarea
    const expiresAt = new Date(owner.invitation?.expiresAt);
    if (expiresAt < new Date()) {
      return res.status(410).json({
        valid: false,
        error: 'Invitația a expirat. Contactează administratorul pentru o nouă invitație.'
      });
    }

    // Verifică dacă owner-ul e deja activ
    if (owner.status === 'active') {
      return res.status(409).json({
        valid: false,
        error: 'Contul a fost deja activat. Te poți autentifica.',
        alreadyActive: true
      });
    }

    // Token valid - returnează datele necesare pentru înregistrare
    // NU returnăm date sensibile
    return res.status(200).json({
      valid: true,
      owner: {
        id: owner.id,
        email: owner.email,
        firstName: owner.firstName || '',
        lastName: owner.lastName || '',
        associations: owner.associations || [],
        status: owner.status
      }
    });

  } catch (error) {
    console.error('Error validating token:', error);

    // Returnează erori specifice pentru debugging
    let errorMessage = 'Eroare la validarea invitației';
    let errorType = 'UNKNOWN';

    if (error.message?.includes('FIREBASE_SERVICE_ACCOUNT')) {
      errorType = 'CONFIG_ERROR';
      errorMessage = 'Configurare server incompletă';
    } else if (error.message?.includes('Failed to parse')) {
      errorType = 'JSON_PARSE_ERROR';
      errorMessage = 'Eroare configurare credențiale';
    } else if (error.message?.includes('missing')) {
      errorType = 'MISSING_FIELD';
      errorMessage = 'Credențiale incomplete';
    } else if (error.code === 'permission-denied') {
      errorType = 'PERMISSION_ERROR';
      errorMessage = 'Eroare permisiuni Firebase';
    }

    return res.status(500).json({
      valid: false,
      error: errorMessage,
      errorType: errorType,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
