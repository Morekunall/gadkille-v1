const { sendWelcomeEmail, sendBookingCongratulationsEmail } = require('./emailService');

const logEmailFailure = (label, err) => {
  console.error(`[email] ${label} failed:`, err?.message || err);
};

const sendWelcomeEmailSafe = (user) => {
  if (!user?.email) return;
  sendWelcomeEmail({ email: user.email, name: user.name || 'Traveller' })
    .then((result) => {
      if (result.sent) {
        console.log(`[email] Welcome email sent to ${user.email}`);
      }
    })
    .catch((err) => logEmailFailure('Welcome email', err));
};

const sendBookingCongratulationsSafe = async (booking) => {
  const user = booking.userId;
  const email = user?.email;
  if (!email) {
    console.warn(`[email] Congratulations email skipped — no customer email on booking ${booking._id}`);
    return false;
  }

  try {
    const result = await sendBookingCongratulationsEmail({
      email,
      name: user.name || 'Traveller',
      booking,
    });
    if (result.sent) {
      console.log(`[email] Congratulations email (${booking.bookingType}) sent to ${email}`);
    }
    return Boolean(result.sent);
  } catch (err) {
    logEmailFailure('Booking congratulations', err);
    return false;
  }
};

module.exports = {
  sendWelcomeEmailSafe,
  sendBookingCongratulationsSafe,
  sendBookingConfirmationSafe: sendBookingCongratulationsSafe,
};
