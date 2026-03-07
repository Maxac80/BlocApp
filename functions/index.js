/**
 * 📧 BLOCAPP CLOUD FUNCTIONS
 *
 * Funcții pentru trimiterea emailurilor prin Resend
 * - Verificare email
 * - Resetare parolă
 * - Notificări
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { Resend } = require("resend");

// Inițializare Firebase Admin
initializeApp();

// Define secret pentru API key (se încarcă la runtime)
const resendApiKey = defineSecret("RESEND_API_KEY");

// Helper pentru a obține instanța Resend
const getResend = () => new Resend(resendApiKey.value());

// Configurare
const CONFIG = {
  fromEmail: "BlocApp <noreply@blocapp.ro>",
  appUrl: "https://administratori.blocapp.ro",
  appName: "BlocApp"
};

// ============================================
// 📧 TEMPLATE-URI EMAIL
// ============================================

const emailTemplates = {
  // Template verificare email
  // CSS simplu pentru compatibilitate cu Yahoo, Outlook, etc.
  verification: (userName, verificationLink) => ({
    subject: "Verifică-ți adresa de email - BlocApp",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificare Email - BlocApp</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td bgcolor="#2563EB" style="background-color: #2563EB; padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">BlocApp</h1>
              <p style="margin: 8px 0 0 0; color: #BFDBFE; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Management Asociații de Proprietari</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1F2937; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">Bună, ${userName}!</h2>

              <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                Mulțumim că te-ai înregistrat în BlocApp! Pentru a-ți activa contul și a începe să folosești aplicația, te rugăm să îți verifici adresa de email.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" bgcolor="#2563EB" style="background-color: #2563EB; border-radius: 8px;">
                    <a href="${verificationLink}" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                      Verifică adresa de email
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; border-top: 1px solid #E5E7EB;">
                <tr>
                  <td style="padding-top: 24px;">
                    <p style="margin: 0; color: #9CA3AF; font-size: 12px; font-family: Arial, Helvetica, sans-serif;">
                      Acest link expiră în 24 de ore. Dacă nu ai solicitat acest email, îl poți ignora în siguranță.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#F9FAFB" style="background-color: #F9FAFB; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
                Cu drag,<br><strong>Echipa BlocApp</strong>
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px; font-family: Arial, Helvetica, sans-serif;">
                © ${new Date().getFullYear()} BlocApp. Toate drepturile rezervate.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }),

  // Template resetare parolă
  // CSS simplu pentru compatibilitate cu Yahoo, Outlook, etc.
  passwordReset: (userName, resetLink) => ({
    subject: "Resetare parolă - BlocApp",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resetare Parolă - BlocApp</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td bgcolor="#F59E0B" style="background-color: #F59E0B; padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">BlocApp</h1>
              <p style="margin: 8px 0 0 0; color: #FEF3C7; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Resetare Parolă</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1F2937; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">Bună, ${userName}!</h2>

              <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                Am primit o cerere de resetare a parolei pentru contul tău BlocApp. Dacă ai făcut această cerere, apasă butonul de mai jos pentru a-ți seta o parolă nouă.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" bgcolor="#F59E0B" style="background-color: #F59E0B; border-radius: 8px;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                      Resetează parola
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px;">
                <tr>
                  <td bgcolor="#FEF3C7" style="background-color: #FEF3C7; padding: 16px; border-left: 4px solid #F59E0B;">
                    <p style="margin: 0; color: #92400E; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
                      <strong>Nu ai solicitat resetarea parolei?</strong><br>
                      Ignoră acest email. Parola ta rămâne neschimbată.
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; border-top: 1px solid #E5E7EB;">
                <tr>
                  <td style="padding-top: 24px;">
                    <p style="margin: 0; color: #9CA3AF; font-size: 12px; font-family: Arial, Helvetica, sans-serif;">
                      Acest link expiră în 1 oră.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#F9FAFB" style="background-color: #F9FAFB; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
                Cu drag,<br><strong>Echipa BlocApp</strong>
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px; font-family: Arial, Helvetica, sans-serif;">
                © ${new Date().getFullYear()} BlocApp. Toate drepturile rezervate.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  })
};

// ============================================
// 🔗 HELPER: Rescrie link-urile Firebase Auth pe domeniul nostru
// Firebase generează link-uri la authDomain-ul proiectului (poate fi vechi/inexistent)
// Le rescriem pentru a duce direct la aplicația noastră care apelează applyActionCode()
// ============================================

// Origini permise pentru link-uri de verificare/resetare
const ALLOWED_ORIGINS = [
  "https://administratori.blocapp.ro",
  "https://locatari.blocapp.ro",
  "https://master.blocapp.ro",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002"
];

const rewriteFirebaseLink = (firebaseLink, targetPath, appUrl = CONFIG.appUrl) => {
  try {
    const url = new URL(firebaseLink);
    const oobCode = url.searchParams.get("oobCode");
    const mode = url.searchParams.get("mode");
    const apiKey = url.searchParams.get("apiKey");

    if (!oobCode) return firebaseLink; // fallback

    return `${appUrl}${targetPath}?mode=${mode}&oobCode=${oobCode}&apiKey=${apiKey}`;
  } catch (e) {
    console.error("Error rewriting Firebase link:", e);
    return firebaseLink;
  }
};

// Validează originea trimisă de frontend (whitelist)
const getValidOrigin = (requestOrigin) => {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return CONFIG.appUrl;
};

// ============================================
// 📧 FUNCȚII CLOUD
// ============================================

/**
 * Trimite email de verificare customizat
 * Apelat din frontend după crearea contului
 */
exports.sendVerificationEmail = onCall(
  {
    region: "europe-west1",
    cors: ["https://administratori.blocapp.ro", "https://locatari.blocapp.ro", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    secrets: [resendApiKey]
  },
  async (request) => {
    // Verifică autentificarea
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat.");
    }

    const { email, userName, origin } = request.data;
    const uid = request.auth.uid;
    const appUrl = getValidOrigin(origin);

    try {
      // Generează link de verificare custom folosind Firebase Admin
      const firebaseLink = await getAuth().generateEmailVerificationLink(email, {
        url: `${appUrl}/email-verified`,
        handleCodeInApp: false
      });

      // Rescrie link-ul să ducă la domeniul corect (localhost sau producție)
      const verificationLink = rewriteFirebaseLink(firebaseLink, "/email-verified", appUrl);

      // Trimite email prin Resend
      const template = emailTemplates.verification(userName || "Utilizator", verificationLink);

      const { data, error } = await getResend().emails.send({
        from: CONFIG.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html
      });

      if (error) {
        console.error("Resend error:", error);
        throw new HttpsError("internal", "Eroare la trimiterea emailului.");
      }

      // Log în Firestore
      await getFirestore().collection("email_logs").add({
        type: "verification",
        userId: uid,
        email: email,
        resendId: data.id,
        sentAt: new Date(),
        status: "sent"
      });

      return { success: true, message: "Email de verificare trimis!" };
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

/**
 * Trimite email de resetare parolă customizat
 */
exports.sendPasswordResetEmail = onCall(
  {
    region: "europe-west1",
    cors: ["https://administratori.blocapp.ro", "https://locatari.blocapp.ro", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    secrets: [resendApiKey]
  },
  async (request) => {
    const { email, origin } = request.data;
    const appUrl = getValidOrigin(origin);

    if (!email) {
      throw new HttpsError("invalid-argument", "Email-ul este obligatoriu.");
    }

    try {
      // Verifică dacă utilizatorul există
      let user;
      try {
        user = await getAuth().getUserByEmail(email);
      } catch (e) {
        // Nu dezvăluim dacă emailul există sau nu (securitate)
        return { success: true, message: "Dacă acest email există, vei primi instrucțiuni." };
      }

      // Obține numele din Firestore
      const userDoc = await getFirestore().collection("users").doc(user.uid).get();
      const userName = userDoc.exists ?
        (userDoc.data().profile?.personalInfo?.firstName || userDoc.data().name || "Utilizator") :
        "Utilizator";

      // Generează link de resetare
      const firebaseResetLink = await getAuth().generatePasswordResetLink(email, {
        url: `${appUrl}/login`,
        handleCodeInApp: false
      });

      // Rescrie link-ul să ducă la domeniul corect (localhost sau producție)
      const resetLink = rewriteFirebaseLink(firebaseResetLink, "/email-verified", appUrl);

      // Trimite email prin Resend
      const template = emailTemplates.passwordReset(userName, resetLink);

      const { data, error } = await getResend().emails.send({
        from: CONFIG.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html
      });

      if (error) {
        console.error("Resend error:", error);
        throw new HttpsError("internal", "Eroare la trimiterea emailului.");
      }

      // Log în Firestore
      await getFirestore().collection("email_logs").add({
        type: "password_reset",
        email: email,
        resendId: data.id,
        sentAt: new Date(),
        status: "sent"
      });

      return { success: true, message: "Email de resetare trimis!" };
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

/**
 * Retrimite email de verificare
 */
exports.resendVerificationEmail = onCall(
  {
    region: "europe-west1",
    cors: ["https://administratori.blocapp.ro", "https://locatari.blocapp.ro", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    secrets: [resendApiKey]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat.");
    }

    const uid = request.auth.uid;
    const appUrl = getValidOrigin(request.data?.origin);

    try {
      // Obține datele utilizatorului
      const user = await getAuth().getUser(uid);

      if (user.emailVerified) {
        return { success: true, message: "Email-ul este deja verificat!" };
      }

      // Obține numele din Firestore
      const userDoc = await getFirestore().collection("users").doc(uid).get();
      const userName = userDoc.exists ?
        (userDoc.data().profile?.personalInfo?.firstName || userDoc.data().name || "Utilizator") :
        "Utilizator";

      // Generează link nou
      const firebaseLink = await getAuth().generateEmailVerificationLink(user.email, {
        url: `${appUrl}/email-verified`,
        handleCodeInApp: false
      });

      // Rescrie link-ul să ducă la domeniul corect (localhost sau producție)
      const verificationLink = rewriteFirebaseLink(firebaseLink, "/email-verified", appUrl);

      // Trimite email
      const template = emailTemplates.verification(userName, verificationLink);

      const { data, error } = await getResend().emails.send({
        from: CONFIG.fromEmail,
        to: user.email,
        subject: template.subject,
        html: template.html
      });

      if (error) {
        throw new HttpsError("internal", "Eroare la trimiterea emailului.");
      }

      return { success: true, message: "Email de verificare retrimis!" };
    } catch (error) {
      console.error("Error resending verification email:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

// ============================================
// 💰 BILLING EMAIL TEMPLATES
// ============================================

const billingEmailTemplates = {
  // Template trial expiring
  trialExpiring: (userName, daysRemaining) => ({
    subject: `Perioada de trial expiră în ${daysRemaining} zile - BlocApp`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td bgcolor="#F59E0B" style="background-color: #F59E0B; padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">BlocApp</h1>
              <p style="margin: 8px 0 0 0; color: #FEF3C7; font-size: 14px;">Perioada de trial</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1F2937; font-size: 24px;">Bună, ${userName}!</h2>
              <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
                Perioada ta de trial la BlocApp expiră în <strong>${daysRemaining} zile</strong>.
                Pentru a continua să folosești aplicația fără întreruperi, te rugăm să adaugi o metodă de plată.
              </p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" bgcolor="#2563EB" style="background-color: #2563EB; border-radius: 8px;">
                    <a href="${CONFIG.appUrl}/subscription" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: bold;">
                      Adaugă metodă de plată
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px;">
                Dacă ai întrebări, ne poți contacta la support@blocapp.ro
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }),

  // Template trial expired
  trialExpired: (userName) => ({
    subject: "Perioada de trial a expirat - BlocApp",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td bgcolor="#DC2626" style="background-color: #DC2626; padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">BlocApp</h1>
              <p style="margin: 8px 0 0 0; color: #FEE2E2; font-size: 14px;">Trial Expirat</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1F2937; font-size: 24px;">Bună, ${userName}!</h2>
              <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
                Perioada ta de trial la BlocApp a expirat. Contul tău este acum în modul <strong>read-only</strong>.
                Pentru a continua să editezi și să publici liste de întreținere, te rugăm să activezi abonamentul.
              </p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" bgcolor="#2563EB" style="background-color: #2563EB; border-radius: 8px;">
                    <a href="${CONFIG.appUrl}/subscription" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: bold;">
                      Activează abonamentul
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }),

  // Template invoice generated
  invoiceGenerated: (userName, invoiceNumber, amount, dueDate) => ({
    subject: `Factură nouă ${invoiceNumber} - BlocApp`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td bgcolor="#2563EB" style="background-color: #2563EB; padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">BlocApp</h1>
              <p style="margin: 8px 0 0 0; color: #BFDBFE; font-size: 14px;">Factură Nouă</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1F2937; font-size: 24px;">Bună, ${userName}!</h2>
              <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
                Ai o factură nouă pentru abonamentul BlocApp.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">Număr factură</p>
                    <p style="margin: 0 0 16px 0; color: #1F2937; font-size: 18px; font-weight: bold;">${invoiceNumber}</p>
                    <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">Sumă de plată</p>
                    <p style="margin: 0 0 16px 0; color: #1F2937; font-size: 24px; font-weight: bold;">${amount} RON</p>
                    <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">Scadență</p>
                    <p style="margin: 0; color: #1F2937; font-size: 16px; font-weight: bold;">${dueDate}</p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" bgcolor="#2563EB" style="background-color: #2563EB; border-radius: 8px;">
                    <a href="${CONFIG.appUrl}/subscription" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: bold;">
                      Vezi factura
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }),

  // Template payment reminder
  paymentReminder: (userName, invoiceNumber, amount, daysOverdue) => ({
    subject: `Reminder: Factură ${invoiceNumber} neplătită - BlocApp`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td bgcolor="#F59E0B" style="background-color: #F59E0B; padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">BlocApp</h1>
              <p style="margin: 8px 0 0 0; color: #FEF3C7; font-size: 14px;">Reminder Plată</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1F2937; font-size: 24px;">Bună, ${userName}!</h2>
              <p style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
                Factura ${invoiceNumber} în valoare de <strong>${amount} RON</strong> este scadentă de ${daysOverdue} zile.
                Te rugăm să efectuezi plata pentru a evita suspendarea contului.
              </p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" bgcolor="#F59E0B" style="background-color: #F59E0B; border-radius: 8px;">
                    <a href="${CONFIG.appUrl}/subscription" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: bold;">
                      Plătește acum
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  })
};

// ============================================
// 💰 BILLING CLOUD FUNCTIONS
// ============================================

/**
 * Verifică zilnic trial-urile care expiră și trimite notificări
 * Rulează zilnic la 09:00 Europe/Bucharest
 */
exports.checkTrialExpirations = onSchedule(
  {
    schedule: "0 9 * * *", // Zilnic la 09:00
    timeZone: "Europe/Bucharest",
    region: "europe-west1",
    secrets: [resendApiKey]
  },
  async (event) => {
    const db = getFirestore();
    const now = new Date();

    console.log("🔍 Checking trial expirations...");

    try {
      // Obține toți userii cu status trial
      const usersSnapshot = await db.collection("users")
        .where("subscription.status", "==", "trial")
        .get();

      let notificationsSent = 0;
      let trialExpired = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const trialEndsAt = userData.subscription?.trialEndsAt?.toDate();

        if (!trialEndsAt) continue;

        const daysRemaining = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
        const userName = userData.profile?.personalInfo?.firstName || userData.name || "Utilizator";
        const email = userData.email;

        // Verifică dacă trial-ul a expirat
        if (daysRemaining <= 0) {
          // Marchează ca past_due
          await db.collection("users").doc(userDoc.id).update({
            "subscription.status": "past_due",
            "subscription.statusChangedAt": FieldValue.serverTimestamp()
          });

          // Trimite email trial expirat
          const template = billingEmailTemplates.trialExpired(userName);
          await getResend().emails.send({
            from: CONFIG.fromEmail,
            to: email,
            subject: template.subject,
            html: template.html
          });

          trialExpired++;
          console.log(`❌ Trial expirat pentru ${email}`);
        }
        // Trimite reminder la 14, 7, 3, 1 zile
        else if ([14, 7, 3, 1].includes(daysRemaining)) {
          const template = billingEmailTemplates.trialExpiring(userName, daysRemaining);
          await getResend().emails.send({
            from: CONFIG.fromEmail,
            to: email,
            subject: template.subject,
            html: template.html
          });

          notificationsSent++;
          console.log(`📧 Reminder trimis pentru ${email} - ${daysRemaining} zile rămase`);
        }
      }

      console.log(`✅ Trial check complete: ${notificationsSent} reminders, ${trialExpired} expired`);
      return { notificationsSent, trialExpired };
    } catch (error) {
      console.error("❌ Error checking trial expirations:", error);
      throw error;
    }
  }
);

/**
 * Generează facturi lunare pentru userii activi
 * Rulează în prima zi a lunii la 00:05
 */
exports.generateMonthlyInvoices = onSchedule(
  {
    schedule: "5 0 1 * *", // Prima zi a lunii la 00:05
    timeZone: "Europe/Bucharest",
    region: "europe-west1",
    secrets: [resendApiKey]
  },
  async (event) => {
    const db = getFirestore();
    const now = new Date();

    console.log("📄 Generating monthly invoices...");

    try {
      // Obține toți userii cu status active
      const usersSnapshot = await db.collection("users")
        .where("subscription.status", "==", "active")
        .get();

      let invoicesGenerated = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const email = userData.email;
        const userName = userData.profile?.personalInfo?.firstName || "Utilizator";

        // Calculează apartamentele active (simplificat - în producție ar trebui logica completă)
        // TODO: Implementează contorizare reală din asociații
        const pricePerApartment = userData.subscription?.customPricing?.pricePerApartment || 5.00;
        const discountPercent = userData.subscription?.customPricing?.discountPercent || 0;

        // Obține numărul de facturi pentru a genera numărul următor
        const invoicesCount = await db.collection("invoices")
          .where("userId", "==", userId)
          .count()
          .get();

        const invoiceNumber = `BLC-${now.getFullYear()}-${String(invoicesCount.data().count + 1).padStart(6, "0")}`;

        // Perioada facturării
        const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const dueDate = new Date(now.getFullYear(), now.getMonth(), 14); // 14 zile termen

        // TODO: Calculează totalApartments și totalAmount din asociații reale
        // Pentru moment, folosim un placeholder
        const totalApartments = 0; // Va fi calculat din asociații
        const subtotal = totalApartments * pricePerApartment;
        const discountAmount = subtotal * (discountPercent / 100);
        const totalAmount = subtotal - discountAmount;

        // Nu genera factură dacă suma este 0
        if (totalAmount <= 0) {
          console.log(`⏭️ Skip ${email} - no billable apartments`);
          continue;
        }

        // Creează factura
        const invoiceRef = await db.collection("invoices").add({
          userId,
          invoiceNumber,
          status: "pending",
          periodStart,
          periodEnd,
          issuedAt: now,
          dueAt: dueDate,
          lineItems: [], // TODO: Populează cu detalii asociații
          subtotal,
          discountPercent,
          discountAmount,
          totalAmount,
          currency: "RON",
          billingContact: userData.subscription?.billingContact || null,
          createdAt: FieldValue.serverTimestamp()
        });

        // Trimite email
        const template = billingEmailTemplates.invoiceGenerated(
          userName,
          invoiceNumber,
          totalAmount.toFixed(2),
          dueDate.toLocaleDateString("ro-RO")
        );

        await getResend().emails.send({
          from: CONFIG.fromEmail,
          to: email,
          subject: template.subject,
          html: template.html
        });

        invoicesGenerated++;
        console.log(`📄 Invoice ${invoiceNumber} generated for ${email}`);
      }

      console.log(`✅ Invoice generation complete: ${invoicesGenerated} invoices`);
      return { invoicesGenerated };
    } catch (error) {
      console.error("❌ Error generating invoices:", error);
      throw error;
    }
  }
);

/**
 * Trimite remindere pentru plăți restante
 * Rulează zilnic la 10:00
 */
exports.sendPaymentReminders = onSchedule(
  {
    schedule: "0 10 * * *", // Zilnic la 10:00
    timeZone: "Europe/Bucharest",
    region: "europe-west1",
    secrets: [resendApiKey]
  },
  async (event) => {
    const db = getFirestore();
    const now = new Date();

    console.log("📧 Sending payment reminders...");

    try {
      // Obține facturile pending care au depășit scadența
      const overdueInvoices = await db.collection("invoices")
        .where("status", "==", "pending")
        .where("dueAt", "<", now)
        .get();

      let remindersSent = 0;

      for (const invoiceDoc of overdueInvoices.docs) {
        const invoice = invoiceDoc.data();
        const daysOverdue = Math.ceil((now - invoice.dueAt.toDate()) / (1000 * 60 * 60 * 24));

        // Trimite reminder la 1, 3, 7, 14 zile după scadență
        if (![1, 3, 7, 14].includes(daysOverdue)) continue;

        // Obține datele userului
        const userDoc = await db.collection("users").doc(invoice.userId).get();
        if (!userDoc.exists) continue;

        const userData = userDoc.data();
        const userName = userData.profile?.personalInfo?.firstName || "Utilizator";
        const email = userData.email;

        const template = billingEmailTemplates.paymentReminder(
          userName,
          invoice.invoiceNumber,
          invoice.totalAmount.toFixed(2),
          daysOverdue
        );

        await getResend().emails.send({
          from: CONFIG.fromEmail,
          to: email,
          subject: template.subject,
          html: template.html
        });

        // După 14 zile, suspendă contul
        if (daysOverdue >= 14) {
          await db.collection("users").doc(invoice.userId).update({
            "subscription.status": "suspended",
            "subscription.statusChangedAt": FieldValue.serverTimestamp()
          });
          console.log(`🔒 User ${email} suspended due to non-payment`);
        }

        remindersSent++;
        console.log(`📧 Reminder sent to ${email} - ${daysOverdue} days overdue`);
      }

      console.log(`✅ Payment reminders complete: ${remindersSent} sent`);
      return { remindersSent };
    } catch (error) {
      console.error("❌ Error sending payment reminders:", error);
      throw error;
    }
  }
);

/**
 * Marchează plată manuală (apelat din admin portal)
 */
exports.recordManualPayment = onCall(
  {
    region: "europe-west1",
    cors: ["https://administratori.blocapp.ro", "https://locatari.blocapp.ro", "https://master.blocapp.ro", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat.");
    }

    const db = getFirestore();
    const adminUid = request.auth.uid;

    // Verifică dacă este super_admin
    const adminDoc = await db.collection("users").doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data().role !== "super_admin") {
      throw new HttpsError("permission-denied", "Nu ai permisiunea pentru această acțiune.");
    }

    const { invoiceId, amount, paymentDate, bankReference, notes } = request.data;

    if (!invoiceId || !amount) {
      throw new HttpsError("invalid-argument", "Invoice ID și suma sunt obligatorii.");
    }

    try {
      const invoiceRef = db.collection("invoices").doc(invoiceId);
      const invoiceDoc = await invoiceRef.get();

      if (!invoiceDoc.exists) {
        throw new HttpsError("not-found", "Factura nu a fost găsită.");
      }

      const invoice = invoiceDoc.data();

      // Creează înregistrarea de plată
      const paymentRef = await db.collection("payments").add({
        invoiceId,
        userId: invoice.userId,
        amount: parseFloat(amount),
        currency: "RON",
        status: "completed",
        method: "manual",
        bankReference: bankReference || null,
        notes: notes || null,
        recordedBy: adminUid,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        createdAt: FieldValue.serverTimestamp()
      });

      // Actualizează factura
      await invoiceRef.update({
        status: "paid",
        paidAt: FieldValue.serverTimestamp(),
        paymentId: paymentRef.id
      });

      // Reactivează subscripția userului dacă era suspendată
      await db.collection("users").doc(invoice.userId).update({
        "subscription.status": "active",
        "subscription.statusChangedAt": FieldValue.serverTimestamp()
      });

      console.log(`✅ Manual payment recorded for invoice ${invoiceId}`);

      return { success: true, paymentId: paymentRef.id };
    } catch (error) {
      console.error("❌ Error recording manual payment:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

console.log("✅ BlocApp Cloud Functions loaded (including billing)");
