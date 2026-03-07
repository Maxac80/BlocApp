/**
 * Vercel Serverless Function pentru validare token invitație asociație
 *
 * Endpoint: POST /api/validate-assoc-invite-token
 * Body: { token }
 *
 * Returnează datele invitației dacă token-ul e valid.
 * Funcționează fără autentificare client-side (folosește Firebase Admin).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Domenii permise pentru CORS
const ALLOWED_ORIGINS = [
  'https://administratori.blocapp.ro',
  'https://locatari.blocapp.ro',
  'https://blocapp.ro',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Inițializare Firebase Admin (o singură dată)
function initFirebaseAdmin() {
  if (getApps().length === 0) {
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

    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

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
}

function getFirebaseAdmin() {
  initFirebaseAdmin();
  return { db: getFirestore() };
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ valid: false, error: 'TOKEN_REQUIRED' });
  }

  try {
    const { db } = getFirebaseAdmin();

    // Caută invitația în toate asociațiile
    const assocsSnapshot = await db.collection('associations').get();
    let foundInvitation = null;
    let foundAssocData = null;

    for (const assocDoc of assocsSnapshot.docs) {
      const invSnapshot = await db
        .collection('associations')
        .doc(assocDoc.id)
        .collection('invitations')
        .where('token', '==', token)
        .get();

      if (!invSnapshot.empty) {
        foundInvitation = { id: invSnapshot.docs[0].id, ...invSnapshot.docs[0].data() };
        foundAssocData = { id: assocDoc.id, name: assocDoc.data().name };
        break;
      }
    }

    if (!foundInvitation) {
      return res.status(404).json({
        valid: false,
        error: 'INVITATION_NOT_FOUND'
      });
    }

    if (foundInvitation.status !== 'pending') {
      return res.status(410).json({
        valid: false,
        error: `INVITATION_${foundInvitation.status.toUpperCase()}`
      });
    }

    if (new Date(foundInvitation.expiresAt) < new Date()) {
      // Marchează ca expirată
      await db
        .collection('associations')
        .doc(foundAssocData.id)
        .collection('invitations')
        .doc(foundInvitation.id)
        .update({ status: 'expired' });

      return res.status(410).json({
        valid: false,
        error: 'INVITATION_EXPIRED'
      });
    }

    // Token valid - returnează doar date non-sensibile
    return res.status(200).json({
      valid: true,
      invitation: {
        id: foundInvitation.id,
        email: foundInvitation.email,
        name: foundInvitation.name || '',
        role: foundInvitation.role,
        associationId: foundAssocData.id
      },
      association: {
        id: foundAssocData.id,
        name: foundAssocData.name
      }
    });

  } catch (error) {
    console.error('Error validating assoc invite token:', error);

    let errorMessage = 'Eroare la validarea invitației';

    if (error.message?.includes('FIREBASE_SERVICE_ACCOUNT')) {
      errorMessage = 'Configurare server incompletă';
    }

    return res.status(500).json({
      valid: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
