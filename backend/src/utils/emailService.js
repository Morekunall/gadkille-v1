const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  if (SMTP_HOST.includes('@')) {
    console.error(
      '[email] SMTP_HOST must be a mail server hostname (e.g. smtp.gmail.com), not an email address.'
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: SMTP_USER,
      pass: String(SMTP_PASS).replace(/\s/g, ''),
    },
  });

  return transporter;
};

const fromAddress = () =>
  process.env.EMAIL_FROM || `"GadKille" <${process.env.SMTP_USER || 'noreply@gadkille.com'}>`;

const frontendUrl = () => {
  const raw = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return String(raw).trim().replace(/\/$/, '');
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const isDev = () => process.env.NODE_ENV !== 'production';

const sendMail = async ({ to, subject, html, text }) => {
  const transport = getTransporter();

  if (!transport) {
    console.warn('[email] SMTP not configured — email not sent.');
    console.warn(`[email] To: ${to} | Subject: ${subject}`);
    if (text) console.warn(`[email] Body:\n${text}`);
    return { devMode: true, sent: false };
  }

  try {
    await transport.sendMail({
      from: fromAddress(),
      to,
      subject,
      html,
      text,
    });
    return { devMode: false, sent: true };
  } catch (err) {
    console.error('[email] Failed to send:', err.message);
    console.warn(`[email] To: ${to} | Subject: ${subject}`);
    if (text) console.warn(`[email] Body (fallback):\n${text}`);
    return { devMode: true, sent: false, error: err.message };
  }
};

const sendVerificationEmail = async ({ email, name, otp, verifyToken }) => {
  const verifyLink = `${frontendUrl()}/verify-email?token=${verifyToken}`;
  const subject = 'Verify your GadKille account';
  const text = `Hi ${name},\n\nYour verification code is: ${otp}\n\nOr verify using this link (expires in 15 minutes):\n${verifyLink}\n\nIf you did not create an account, ignore this email.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#1E3E45">
      <h2 style="color:#2F6D66">Verify your email</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Use this code to activate your GadKille account:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#2F6D66">${otp}</p>
      <p>Or <a href="${verifyLink}" style="color:#2F6D66">click here to verify</a> (expires in 15 minutes).</p>
      <p style="font-size:12px;color:#666">If you did not sign up, you can ignore this email.</p>
    </div>
  `;

  return sendMail({ to: email, subject, text, html });
};

const emailLayout = (title, bodyHtml) => `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1E3E45;line-height:1.5">
    <div style="background:linear-gradient(135deg,#2F6D66,#1E3E45);padding:20px 24px;border-radius:12px 12px 0 0">
      <p style="margin:0;color:#fff;font-size:18px;font-weight:600">GadKille</p>
      <p style="margin:4px 0 0;color:#EAF2EE;font-size:13px">${escapeHtml(title)}</p>
    </div>
    <div style="padding:24px;border:1px solid #EAF2EE;border-top:none;border-radius:0 0 12px 12px;background:#fff">
      ${bodyHtml}
      <p style="margin:24px 0 0;font-size:12px;color:#888">— Team GadKille</p>
    </div>
  </div>
`;

const sendWelcomeEmail = async ({ email, name }) => {
  const dashboardLink = `${frontendUrl()}/dashboard`;
  const subject = 'Welcome to GadKille — your account is ready!';
  const text = `Hi ${name},\n\nWelcome to GadKille! Your email is verified and your account is active.\n\nExplore forts, book stays, guides and cabs, and plan your next adventure.\n\nDashboard: ${dashboardLink}\n\nHappy travels!\nTeam GadKille`;

  const html = emailLayout(
    'Welcome aboard',
    `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your account has been created successfully. We're glad to have you on GadKille!</p>
      <p>You can now explore historic forts, book <strong>hotels</strong>, <strong>guides</strong>, and <strong>cabs</strong>, and manage everything from your dashboard.</p>
      <p style="margin-top:20px">
        <a href="${dashboardLink}" style="display:inline-block;background:#2F6D66;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600">Go to your dashboard</a>
      </p>
    `
  );

  return sendMail({ to: email, subject, text, html });
};

const BOOKING_TYPE_LABELS = {
  stay: { service: 'Hotel / Stay', short: 'hotel stay' },
  guide: { service: 'Fort Guide', short: 'guide booking' },
  vehicle: { service: 'Cab / Vehicle', short: 'cab booking' },
  trip: { service: 'Trip Package', short: 'trip booking' },
};

const formatBookingDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(date);
  }
};

const buildBookingDetailsHtml = (bookingType, details = {}) => {
  const rows = [];
  if (details.guests) rows.push(['Guests', details.guests]);
  if (bookingType === 'stay' && details.stay) {
    rows.push(['Property', details.stay.name]);
    if (details.stay.pricePerNight) rows.push(['Price/night', `₹${details.stay.pricePerNight}`]);
    if (details.stay.maxGuests) rows.push(['Max guests', details.stay.maxGuests]);
  }
  if (bookingType === 'guide' && details.guide) {
    rows.push(['Guide', details.guide.name]);
    if (details.guide.language) rows.push(['Languages', details.guide.language]);
    if (details.guide.pricing) rows.push(['Pricing', details.guide.pricing]);
  }
  if (bookingType === 'vehicle' && details.vehicle) {
    rows.push(['Vehicle', `${details.vehicle.type || ''} ${details.vehicle.model || ''}`.trim()]);
    if (details.vehicle.driverName) rows.push(['Driver', details.vehicle.driverName]);
    if (details.vehicle.pricePerDay) rows.push(['Price/day', `₹${details.vehicle.pricePerDay}`]);
  }
  if (!rows.length) return '<p>Your booking details are saved in your dashboard.</p>';
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#666;border-bottom:1px solid #EAF2EE;width:40%">${escapeHtml(label)}</td>
          <td style="padding:8px 0;font-weight:500;border-bottom:1px solid #EAF2EE">${escapeHtml(String(value))}</td>
        </tr>`
        )
        .join('')}
    </table>
  `;
};

const sendBookingCongratulationsEmail = async ({ email, name, booking }) => {
  const typeInfo = BOOKING_TYPE_LABELS[booking.bookingType] || {
    service: 'Booking',
    short: 'booking',
  };
  const fortName = booking.fortId?.name || 'Fort';
  const fortLocation = booking.fortId?.location || '';
  const dateStr = formatBookingDate(booking.date);
  const dashboardLink = `${frontendUrl()}/dashboard`;

  const subject = `Congratulations! Your ${typeInfo.service} booking is confirmed — GadKille`;
  const text = `Hi ${name},\n\nCongratulations! Your ${typeInfo.short} has been accepted by our team.\n\nFort: ${fortName}${fortLocation ? `, ${fortLocation}` : ''}\nDate: ${dateStr}\nService: ${typeInfo.service}\n\nView your booking: ${dashboardLink}\n\nWe look forward to your adventure!\nTeam GadKille`;

  const html = emailLayout(
    'Congratulations!',
    `
      <p>Hi ${escapeHtml(name)},</p>
      <p style="font-size:20px;font-weight:700;color:#2F6D66;margin:12px 0">Congratulations!</p>
      <p>Your <strong>${escapeHtml(typeInfo.service)}</strong> request has been <strong style="color:#2F6D66">accepted</strong> by the GadKille team. Your booking is confirmed — get ready for an amazing fort adventure!</p>
      <div style="background:#EAF2EE;border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#2F6D66;font-weight:600">Your booking</p>
        <p style="margin:0 0 4px"><strong>Fort:</strong> ${escapeHtml(fortName)}${fortLocation ? `, ${escapeHtml(fortLocation)}` : ''}</p>
        <p style="margin:0 0 4px"><strong>Service:</strong> ${escapeHtml(typeInfo.service)}</p>
        <p style="margin:0"><strong>Date:</strong> ${escapeHtml(dateStr)}</p>
      </div>
      ${buildBookingDetailsHtml(booking.bookingType, booking.details)}
      <p style="margin-top:20px">
        <a href="${dashboardLink}" style="display:inline-block;background:#2F6D66;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600">View my bookings</a>
      </p>
    `
  );

  return sendMail({ to: email, subject, text, html });
};

const sendBookingConfirmationEmail = sendBookingCongratulationsEmail;

const sendPasswordResetEmail = async ({ email, name, resetToken }) => {
  const resetLink = `${frontendUrl()}/reset-password?token=${resetToken}`;
  const subject = 'Reset your GadKille password';
  const text = `Hi ${name},\n\nReset your password using this link (expires in 1 hour):\n${resetLink}\n\nIf you did not request this, ignore this email.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#1E3E45">
      <h2 style="color:#2F6D66">Password reset</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p><a href="${resetLink}" style="color:#2F6D66">Reset your password</a> (link expires in 1 hour).</p>
      <p style="font-size:12px;color:#666">If you did not request a reset, ignore this email.</p>
    </div>
  `;

  return sendMail({ to: email, subject, text, html });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendBookingCongratulationsEmail,
  sendBookingConfirmationEmail,
  getTransporter,
  frontendUrl,
  isDev,
};
