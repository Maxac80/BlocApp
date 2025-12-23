import { useState } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { db, auth } from '../firebase';

/**
 * Hook pentru gestionarea invitațiilor proprietarilor
 *
 * Flow:
 * 1. Admin trimite invitație → creează owner în Firestore cu token
 * 2. Proprietar click pe link → validează token
 * 3. Proprietar setează parolă → creează cont Firebase Auth
 * 4. Owner status devine 'active' → redirect la portal
 */
export const useOwnerInvitation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Generează un token unic pentru invitație
   */
  const generateToken = () => {
    return crypto.randomUUID() + '-' + Date.now().toString(36);
  };

  /**
   * Calculează data expirării (7 zile de la creare)
   */
  const getExpirationDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString();
  };

  /**
   * Trimite invitație unui proprietar
   *
   * @param {string} email - Email-ul proprietarului
   * @param {Object} apartmentData - Datele apartamentului {id, number, stairId, blocId}
   * @param {Object} associationData - Datele asociației {id, name}
   * @param {string} adminId - ID-ul adminului care trimite invitația
   * @param {Object} ownerInfo - Info suplimentare {firstName, lastName, phone} - opțional
   */
  const sendInvitation = async (email, apartmentData, associationData, adminId, ownerInfo = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Normalizează email-ul
      const normalizedEmail = email.toLowerCase().trim();

      // Verifică dacă există deja un owner cu acest email
      const existingOwner = await findOwnerByEmail(normalizedEmail);

      const token = generateToken();
      const expiresAt = getExpirationDate();

      if (existingOwner) {
        // Owner există - actualizează și adaugă apartamentul nou dacă nu există deja
        const updatedAssociations = updateAssociations(
          existingOwner.associations || [],
          associationData,
          apartmentData
        );

        await updateDoc(doc(db, 'owners', existingOwner.id), {
          associations: updatedAssociations,
          invitation: {
            token,
            expiresAt,
            sentBy: adminId,
            sentAt: new Date().toISOString()
          },
          updatedAt: serverTimestamp()
        });

        // Trimite email
        await sendInvitationEmail(
          normalizedEmail,
          token,
          ownerInfo.firstName || existingOwner.firstName,
          associationData.name,
          apartmentData.number
        );

        return {
          success: true,
          ownerId: existingOwner.id,
          isNew: false,
          token,
          magicLink: getMagicLink(token)
        };
      } else {
        // Owner nou - creează document
        const ownerId = crypto.randomUUID();

        const ownerData = {
          email: normalizedEmail,
          firstName: ownerInfo.firstName || '',
          lastName: ownerInfo.lastName || '',
          phone: ownerInfo.phone || '',

          status: 'invited',
          invitedAt: new Date().toISOString(),
          registeredAt: null,
          lastLoginAt: null,

          firebaseUid: null,

          associations: [{
            associationId: associationData.id,
            associationName: associationData.name || '',
            apartments: [{
              apartmentId: apartmentData.id || null,
              number: apartmentData.number || '',
              stairId: apartmentData.stairId || null,
              blocId: apartmentData.blocId || null
            }]
          }],

          invitation: {
            token,
            expiresAt,
            sentBy: adminId,
            sentAt: new Date().toISOString()
          },

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'owners', ownerId), ownerData);

        // Trimite email
        await sendInvitationEmail(
          normalizedEmail,
          token,
          ownerInfo.firstName,
          associationData.name,
          apartmentData.number
        );

        return {
          success: true,
          ownerId,
          isNew: true,
          token,
          magicLink: getMagicLink(token)
        };
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Găsește un owner după email
   */
  const findOwnerByEmail = async (email) => {
    const normalizedEmail = email.toLowerCase().trim();
    const q = query(
      collection(db, 'owners'),
      where('email', '==', normalizedEmail)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  };

  /**
   * Găsește un owner după Firebase UID
   */
  const findOwnerByUid = async (uid) => {
    const q = query(
      collection(db, 'owners'),
      where('firebaseUid', '==', uid)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  };

  /**
   * Validează un token de invitație
   * Folosește API serverless pentru a evita probleme cu Firestore Security Rules
   *
   * @param {string} token - Token-ul din magic link
   * @returns {Object} - {valid: boolean, owner: Object, error: string}
   */
  const validateToken = async (token) => {
    setLoading(true);
    setError(null);

    try {
      // Folosește API-ul serverless pentru validare (evită probleme cu security rules)
      const apiUrl = process.env.NODE_ENV === 'production'
        ? '/api/validate-invite-token'
        : 'http://localhost:3000/api/validate-invite-token';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          valid: false,
          error: data.error || 'Token invalid sau expirat',
          alreadyActive: data.alreadyActive || false
        };
      }

      return {
        valid: true,
        owner: data.owner
      };
    } catch (err) {
      console.error('Error validating token:', err);
      setError(err.message);
      return { valid: false, error: 'Eroare la validarea invitației. Încearcă din nou.' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Finalizează înregistrarea proprietarului
   *
   * @param {string} token - Token-ul din magic link
   * @param {string} password - Parola setată de proprietar
   * @returns {Object} - {success: boolean, user: Object, error: string}
   */
  const completeRegistration = async (token, password) => {
    setLoading(true);
    setError(null);

    try {
      // Validează token-ul mai întâi
      const validation = await validateToken(token);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const owner = validation.owner;

      // Creează cont Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        owner.email,
        password
      );

      const firebaseUser = userCredential.user;

      // Actualizează owner în Firestore
      await updateDoc(doc(db, 'owners', owner.id), {
        status: 'active',
        firebaseUid: firebaseUser.uid,
        registeredAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        'invitation.token': null, // Invalidează token-ul
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        user: firebaseUser,
        owner: {
          ...owner,
          status: 'active',
          firebaseUid: firebaseUser.uid
        }
      };
    } catch (err) {
      console.error('Error completing registration:', err);

      // Traducere erori Firebase
      let errorMessage = err.message;
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Există deja un cont cu această adresă de email. Încearcă să te autentifici.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Parola trebuie să aibă minim 6 caractere.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Retrimite invitația unui proprietar
   *
   * @param {string} ownerId - ID-ul owner-ului
   * @param {string} adminId - ID-ul adminului care retrimite
   */
  const resendInvitation = async (ownerId, adminId) => {
    setLoading(true);
    setError(null);

    try {
      const ownerRef = doc(db, 'owners', ownerId);
      const ownerSnap = await getDoc(ownerRef);

      if (!ownerSnap.exists()) {
        return { success: false, error: 'Proprietarul nu a fost găsit' };
      }

      const owner = ownerSnap.data();

      if (owner.status === 'active') {
        return { success: false, error: 'Proprietarul are deja cont activ' };
      }

      // Generează token nou
      const token = generateToken();
      const expiresAt = getExpirationDate();

      await updateDoc(ownerRef, {
        invitation: {
          token,
          expiresAt,
          sentBy: adminId,
          sentAt: new Date().toISOString()
        },
        updatedAt: serverTimestamp()
      });

      // Extrage info despre asociație și apartament pentru email
      const firstAssoc = owner.associations?.[0];
      const firstApt = firstAssoc?.apartments?.[0];

      // Trimite email
      await sendInvitationEmail(
        owner.email,
        token,
        owner.firstName,
        firstAssoc?.associationName || '',
        firstApt?.number || ''
      );

      return {
        success: true,
        token,
        magicLink: getMagicLink(token)
      };
    } catch (err) {
      console.error('Error resending invitation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifică statusul invitației pentru un apartament
   *
   * @param {string} email - Email-ul proprietarului
   */
  const getInvitationStatus = async (email) => {
    if (!email) return { status: 'none' };

    try {
      const owner = await findOwnerByEmail(email);

      if (!owner) {
        return { status: 'none' }; // Nu există invitație
      }

      if (owner.status === 'active') {
        return { status: 'active', owner }; // Cont activ
      }

      // Verifică expirarea
      const expiresAt = new Date(owner.invitation?.expiresAt);
      if (expiresAt < new Date()) {
        return { status: 'expired', owner }; // Invitație expirată
      }

      return { status: 'pending', owner }; // Invitație trimisă, așteaptă activare
    } catch (err) {
      console.error('Error getting invitation status:', err);
      return { status: 'error', error: err.message };
    }
  };

  /**
   * Actualizează array-ul de asociații cu un apartament nou
   */
  const updateAssociations = (associations, associationData, apartmentData) => {
    const existingAssocIndex = associations.findIndex(
      a => a.associationId === associationData.id
    );

    if (existingAssocIndex >= 0) {
      // Asociația există - verifică dacă apartamentul există
      const existingApartIndex = associations[existingAssocIndex].apartments.findIndex(
        apt => apt.apartmentId === apartmentData.id
      );

      if (existingApartIndex < 0) {
        // Adaugă apartamentul nou
        associations[existingAssocIndex].apartments.push({
          apartmentId: apartmentData.id || null,
          number: apartmentData.number || '',
          stairId: apartmentData.stairId || null,
          blocId: apartmentData.blocId || null
        });
      }
    } else {
      // Asociație nouă
      associations.push({
        associationId: associationData.id,
        associationName: associationData.name || '',
        apartments: [{
          apartmentId: apartmentData.id || null,
          number: apartmentData.number || '',
          stairId: apartmentData.stairId || null,
          blocId: apartmentData.blocId || null
        }]
      });
    }

    return associations;
  };

  /**
   * Generează magic link pentru invitație
   */
  const getMagicLink = (token) => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://portal.blocapp.ro'
      : 'http://localhost:3000';

    return `${baseUrl}/invite/${token}`;
  };

  /**
   * Trimite email de invitație via Resend API
   *
   * @param {string} email - Email destinatar
   * @param {string} token - Token invitație
   * @param {string} firstName - Prenume proprietar
   * @param {string} associationName - Nume asociație
   * @param {string} apartmentNumber - Număr apartament
   */
  const sendInvitationEmail = async (email, token, firstName, associationName = '', apartmentNumber = '') => {
    const magicLink = getMagicLink(token);

    // Log pentru debugging
    console.log('📧 [SENDING EMAIL]');
    console.log('To:', email);
    console.log('Name:', firstName || 'Proprietar');
    console.log('Magic Link:', magicLink);

    try {
      // Determină URL-ul API-ului
      const apiUrl = process.env.NODE_ENV === 'production'
        ? '/api/send-invitation-email'
        : 'http://localhost:3000/api/send-invitation-email';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          ownerName: firstName || '',
          associationName: associationName,
          apartmentNumber: apartmentNumber,
          magicLink: magicLink
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Email send failed:', data);

        // Fallback pentru development - salvează în localStorage
        if (process.env.NODE_ENV === 'development') {
          console.log('💡 [DEV FALLBACK] Email API unavailable, saving to localStorage');
          saveToLocalStorage(email, firstName, magicLink);
        }

        return { success: false, error: data.error || 'Failed to send email' };
      }

      console.log('✅ Email sent successfully:', data.messageId);
      return { success: true, messageId: data.messageId };

    } catch (error) {
      console.error('❌ Email send error:', error);

      // Fallback pentru development când API-ul nu e disponibil
      if (process.env.NODE_ENV === 'development') {
        console.log('💡 [DEV FALLBACK] Saving invitation to localStorage');
        saveToLocalStorage(email, firstName, magicLink);
        console.log('💡 [DEV] Deschide direct:', magicLink);
        return { success: true, fallback: true };
      }

      return { success: false, error: error.message };
    }
  };

  /**
   * Salvează invitația în localStorage pentru development
   */
  const saveToLocalStorage = (email, firstName, magicLink) => {
    const invitations = JSON.parse(localStorage.getItem('pendingInvitations') || '[]');
    invitations.push({
      email,
      firstName,
      magicLink,
      sentAt: new Date().toISOString()
    });
    localStorage.setItem('pendingInvitations', JSON.stringify(invitations));
  };

  return {
    // State
    loading,
    error,

    // Functions
    sendInvitation,
    validateToken,
    completeRegistration,
    resendInvitation,
    getInvitationStatus,
    findOwnerByEmail,
    findOwnerByUid,
    getMagicLink
  };
};

export default useOwnerInvitation;
