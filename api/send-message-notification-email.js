/**
 * Vercel Serverless Function pentru notificări email mesaje
 *
 * Endpoint: POST /api/send-message-notification-email
 * Body: { recipients, subject, messageContent, conversationType, apartmentNumber, associationName, authorName, authorRole }
 */

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
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    recipients,
    subject,
    messageContent,
    conversationType,
    apartmentNumber,
    associationName,
    authorName,
    authorRole
  } = req.body;

  if (!recipients || !recipients.length || !messageContent) {
    return res.status(400).json({ error: 'Missing required fields: recipients, messageContent' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  // Determine branding based on who receives
  const isToOwner = authorRole === 'admin';
  const headerColor = isToOwner ? '#2D5016' : '#2563EB';
  const headerLabel = isToOwner ? 'Portal pentru proprietari' : 'Administrare Asociații de Proprietari';
  const logoUrl = isToOwner
    ? 'https://locatari.blocapp.ro/blocapp-logo-locatari.png'
    : 'https://administratori.blocapp.ro/blocapp-logo.png';

  // Type labels
  const typeLabels = {
    ticket: 'Solicitare',
    message: 'Mesaj',
    broadcast: 'Anunț'
  };
  const typeLabel = typeLabels[conversationType] || 'Mesaj';

  // Context info
  const contextInfo = apartmentNumber
    ? `Apartament ${apartmentNumber} • ${associationName || ''}`
    : associationName || '';

  const emailSubject = subject || `${typeLabel} nou - BlocApp`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${headerColor}; padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <img src="${logoUrl}" alt="BlocApp" height="36" style="height: 36px; display: block; margin-bottom: 8px;" />
              <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0;">${headerLabel}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px;">
              <!-- Type badge -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 4px 12px; background-color: ${
                  conversationType === 'ticket' ? '#FEF3C7' :
                  conversationType === 'broadcast' ? '#F3E8FF' : '#DBEAFE'
                }; color: ${
                  conversationType === 'ticket' ? '#92400E' :
                  conversationType === 'broadcast' ? '#6B21A8' : '#1E40AF'
                }; border-radius: 20px; font-size: 12px; font-weight: 600;">${typeLabel}</span>
              </div>

              <!-- Subject -->
              <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin: 0 0 8px 0;">
                ${escapeHtml(subject || 'Mesaj nou')}
              </h2>

              <!-- Context -->
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 20px 0;">
                ${escapeHtml(contextInfo)}${authorName ? ` • de la ${escapeHtml(authorName)}` : ''}
              </p>

              <!-- Message content -->
              <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-line;">${escapeHtml(messageContent)}</p>
              </div>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${headerColor}; border-radius: 8px; padding: 12px 24px;">
                    <a href="${isToOwner ? 'https://locatari.blocapp.ro' : 'https://administratori.blocapp.ro'}"
                       style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                      Vezi în ${isToOwner ? 'portal' : 'aplicație'}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 20px 32px; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 11px; margin: 0; text-align: center;">
                Acest mesaj a fost trimis prin BlocApp • ${new Date().getFullYear()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    // Send to all recipients
    const emailPromises = recipients.map(recipient =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'BlocApp <noreply@blocapp.ro>',
          to: [recipient.email],
          subject: emailSubject,
          html: htmlContent
        })
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const failures = results.filter(r => r.status === 'rejected');

    if (failures.length > 0) {
      console.error('Some emails failed:', failures);
    }

    return res.status(200).json({
      success: true,
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: failures.length
    });
  } catch (error) {
    console.error('Error sending message notification email:', error);
    return res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
