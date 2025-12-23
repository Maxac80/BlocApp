/**
 * Vercel Serverless Function pentru trimitere email invitație
 *
 * Endpoint: POST /api/send-invitation-email
 * Body: { to, ownerName, associationName, apartmentNumber, magicLink }
 */

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
  <title>Invitație BlocApp</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #2563eb; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                BlocApp
              </h1>
              <p style="margin: 10px 0 0; color: #bfdbfe; font-size: 14px;">
                Portal pentru proprietari
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 22px;">
                Bună${ownerName ? `, ${ownerName}` : ''}! 👋
              </h2>

              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Ai fost invitat să accesezi portalul proprietarilor pentru:
              </p>

              <!-- Info Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600;">
                      ${associationName || 'Asociația ta'}
                    </p>
                    ${apartmentNumber ? `
                    <p style="margin: 0; color: #3b82f6; font-size: 18px; font-weight: 700;">
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
                       style="display: inline-block; padding: 16px 40px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Activează Contul
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
                Sau copiază acest link în browser:
              </p>
              <p style="margin: 8px 0 0; color: #6b7280; font-size: 12px; word-break: break-all; text-align: center; background: #f3f4f6; padding: 12px; border-radius: 6px;">
                ${magicLink}
              </p>

              <!-- Expiry Notice -->
              <p style="margin: 30px 0 0; color: #ef4444; font-size: 13px; text-align: center;">
                ⏰ Acest link expiră în 7 zile
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; text-align: center;">
                Ai primit acest email pentru că administratorul asociației
                te-a invitat în platforma BlocApp.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} BlocApp - Administrare Asociații de Proprietari
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
        from: 'BlocApp <onboarding@resend.dev>', // Pentru test, folosim domeniul Resend
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
