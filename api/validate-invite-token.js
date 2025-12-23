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
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID
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
    return res.status(500).json({
      valid: false,
      error: 'Eroare la validarea invitației',
      details: error.message
    });
  }
}
