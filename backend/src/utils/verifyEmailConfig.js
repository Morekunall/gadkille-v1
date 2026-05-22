const { getTransporter } = require('./emailService');

const verifyEmailConfig = async () => {
  const transport = getTransporter();
  if (!transport) {
    console.warn(
      '[email] SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS on Render for verification & welcome emails.'
    );
    return { configured: false, verified: false };
  }

  try {
    await transport.verify();
    console.log('[email] SMTP connection verified');
    return { configured: true, verified: true };
  } catch (err) {
    console.error('[email] SMTP verify failed:', err.message);
    return { configured: true, verified: false, error: err.message };
  }
};

module.exports = verifyEmailConfig;
