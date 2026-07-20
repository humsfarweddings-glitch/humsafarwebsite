// Receives the Careers application form (frontend/pages/contact-team-form.html)
// and emails it via Resend. Requires RESEND_API_KEY to be set in the Vercel
// project's Environment Variables.

const REQUIRED_FIELDS = [
  ['fullName', 'Full Name'],
  ['email', 'Email Id'],
  ['phoneNumber', 'Phone Number'],
  ['position', 'Position Applying For'],
  ['workLocation', 'Preferred Work Location'],
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_LABELS = [
  ['fullName', 'Full Name'],
  ['email', 'Email Id'],
  ['phoneNumber', 'Phone Number'],
  ['linkedin', 'LinkedIn'],
  ['instagram', 'Instagram'],
  ['position', 'Position Applying For'],
  ['workLocation', 'Preferred Work Location'],
  ['experience', 'Experience (Years)'],
  ['cvFileUrl', 'Uploaded CV / Portfolio'],
  ['cvLink', 'CV / Portfolio Link'],
  ['availability', 'Availability to Join'],
  ['commitment', 'Open to a 2-Year Commitment?'],
  ['heardFrom', 'How They Heard About Us'],
  ['recentProjects', 'Top 3 Recent Wedding Projects'],
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const missing = REQUIRED_FIELDS.filter(([key]) => !String(body?.[key] ?? '').trim());
  if (missing.length > 0) {
    return Response.json(
      { error: `Missing required field(s): ${missing.map(([, label]) => label).join(', ')}` },
      { status: 400 },
    );
  }

  if (!EMAIL_PATTERN.test(String(body.email).trim())) {
    return Response.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('career-enquiry: RESEND_API_KEY is not configured');
    return Response.json(
      { error: 'Email service is not configured yet. Please try again later.' },
      { status: 500 },
    );
  }

  const toEmail = process.env.CAREER_ENQUIRY_TO_EMAIL || 'info@gnkevents.in';
  const fromEmail = process.env.CAREER_ENQUIRY_FROM_EMAIL || 'Humsafar Weddings <onboarding@resend.dev>';

  const rows = FIELD_LABELS.filter(([key]) => String(body[key] ?? '').trim())
    .map(
      ([key, label]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;vertical-align:top;white-space:nowrap;">${escapeHtml(
          label,
        )}</td><td style="padding:6px 12px;">${escapeHtml(body[key])}</td></tr>`,
    )
    .join('');

  const html = `<h2>New Career Application</h2><table style="border-collapse:collapse;">${rows}</table>`;

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: String(body.email).trim(),
        subject: `New Career Application: ${body.fullName}`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('career-enquiry: Resend API error', emailResponse.status, errorText);
      return Response.json(
        { error: 'Could not send your application right now. Please try again shortly.' },
        { status: 502 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('career-enquiry: failed to send email', error);
    return Response.json({ error: 'Something went wrong. Please try again shortly.' }, { status: 500 });
  }
}
