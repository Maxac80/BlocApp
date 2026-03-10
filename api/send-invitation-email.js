/**
 * Vercel Serverless Function pentru trimitere email invitație
 *
 * Endpoint: POST /api/send-invitation-email
 * Body: { to, ownerName, associationName, apartmentNumber, magicLink }
 */

// Domenii permise pentru CORS
const ALLOWED_ORIGINS = [
  'https://administratori.blocapp.ro',
  'https://locatari.blocapp.ro',
  'https://blocapp.ro',
  'http://localhost:3000',
  'http://localhost:3001'
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

export default async function handler(req, res) {
  // CORS headers - restrictive
  setCorsHeaders(req, res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, ownerName, associationName, apartmentNumber, magicLink } = req.body;

  if (!to || !magicLink) {
    return res.status(400).json({ error: 'Missing required fields: to, magicLink' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  // Template HTML pentru email
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Invitație BlocApp</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Logo pe fundal alb -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 40px 16px; text-align: center;" bgcolor="#ffffff">
              <img src="https://locatari.blocapp.ro/blocapp-logo-locatari.png" alt="BlocApp" width="200" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>
          <!-- Header colorat cu subtitlu -->
          <tr>
            <td style="padding: 16px 40px; text-align: center; background-color: #2D5016;" bgcolor="#2D5016">
              <p style="margin: 0; color: #ffffff; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
                Portal pentru proprietari
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 22px;">
                Bună${ownerName ? `, ${ownerName}` : ''}!
              </h2>

              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Ai fost invitat să accesezi portalul proprietarilor pentru:
              </p>

              <!-- Info Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a;">
                    <p style="margin: 0 0 8px; color: #166534; font-size: 14px; font-weight: 600;">
                      ${associationName || 'Asociația ta'}
                    </p>
                    ${apartmentNumber ? `
                    <p style="margin: 0; color: #16a34a; font-size: 18px; font-weight: 700;">
                      Apartament ${apartmentNumber}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Pentru a-ți activa contul și a accesa situația apartamentului tău,
                click pe butonul de mai jos:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${magicLink}"
                       style="display: inline-block; padding: 16px 40px; background-color: #2D5016; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Activează Contul
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <p style="margin: 30px 0 0; color: #ef4444; font-size: 13px; text-align: center;">
                ⏰ Acest link expiră în 7 zile
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#F9FAFB" style="background-color: #F9FAFB; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; font-family: Arial, Helvetica, sans-serif;">
                Ai primit acest email pentru că administratorul asociației
                te-a invitat în platforma BlocApp.
              </p>
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
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BlocApp <noreply@blocapp.ro>',
        to: [to],
        subject: `Invitație BlocApp - ${associationName || 'Portal Proprietari'}`,
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(response.status).json({
        error: data.message || 'Failed to send email',
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      messageId: data.id
    });

  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
}
