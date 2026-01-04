/**
 * 📧 BLOCAPP CLOUD FUNCTIONS
 *
 * Funcții pentru trimiterea emailurilor prin Resend
 * - Verificare email
 * - Resetare parolă
 * - Notificări
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
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
  appUrl: "https://app.blocapp.ro",
  appName: "BlocApp"
};

// ============================================
// 📧 TEMPLATE-URI EMAIL
// ============================================

const emailTemplates = {
  // Template verificare email
  // Folosim CSS simplu pentru compatibilitate cu Yahoo, Outlook, etc.
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
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header - solid color fallback -->
          <tr>
            <td bgcolor="#2563EB" style="background-color: #2563EB; padding: 40px 40px; text-align: center;">
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

              <!-- Button cu table pentru compatibilitate maximă -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" bgcolor="#2563EB" style="background-color: #2563EB; border-radius: 8px;">
                    <a href="${verificationLink}" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                      Verifică adresa de email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                Dacă butonul nu funcționează, copiază și lipește acest link în browser:
              </p>
              <p style="margin: 8px 0 0 0; word-break: break-all;">
                <a href="${verificationLink}" style="color: #2563EB; font-size: 12px; font-family: Arial, Helvetica, sans-serif;">${verificationLink}</a>
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; border-top: 1px solid #E5E7EB;">
                <tr>
                  <td style="padding-top: 24px;">
                    <p style="margin: 0; color: #9CA3AF; font-size: 12px; font-family: Arial, Helvetica, sans-serif;">
                      Acest link expiră în 24 de ore.<br>
                      Dacă nu ai solicitat acest email, îl poți ignora în siguranță.
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
  // Folosim CSS simplu pentru compatibilitate cu Yahoo, Outlook, etc.
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
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header - solid color fallback -->
          <tr>
            <td bgcolor="#F59E0B" style="background-color: #F59E0B; padding: 40px 40px; text-align: center;">
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

              <!-- Button cu table pentru compatibilitate maximă -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td align="center" bgcolor="#F59E0B" style="background-color: #F59E0B; border-radius: 8px;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                      Resetează parola
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                Dacă butonul nu funcționează, copiază și lipește acest link în browser:
              </p>
              <p style="margin: 8px 0 0 0; word-break: break-all;">
                <a href="${resetLink}" style="color: #F59E0B; font-size: 12px; font-family: Arial, Helvetica, sans-serif;">${resetLink}</a>
              </p>

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
// 📧 FUNCȚII CLOUD
// ============================================

/**
 * Trimite email de verificare customizat
 * Apelat din frontend după crearea contului
 */
exports.sendVerificationEmail = onCall(
  {
    region: "europe-west1",
    cors: ["https://app.blocapp.ro", "http://localhost:3000"],
    secrets: [resendApiKey]
  },
  async (request) => {
    // Verifică autentificarea
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat.");
    }

    const { email, userName } = request.data;
    const uid = request.auth.uid;

    try {
      // Generează link de verificare custom folosind Firebase Admin
      const verificationLink = await getAuth().generateEmailVerificationLink(email, {
        url: `${CONFIG.appUrl}/email-verified`,
        handleCodeInApp: false
      });

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
    cors: ["https://app.blocapp.ro", "http://localhost:3000"],
    secrets: [resendApiKey]
  },
  async (request) => {
    const { email } = request.data;

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
      const resetLink = await getAuth().generatePasswordResetLink(email, {
        url: `${CONFIG.appUrl}/login`,
        handleCodeInApp: false
      });

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
    cors: ["https://app.blocapp.ro", "http://localhost:3000"],
    secrets: [resendApiKey]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat.");
    }

    const uid = request.auth.uid;

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
      const verificationLink = await getAuth().generateEmailVerificationLink(user.email, {
        url: `${CONFIG.appUrl}/email-verified`,
        handleCodeInApp: false
      });

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

console.log("✅ BlocApp Cloud Functions loaded");
