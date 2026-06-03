const User = require('../models/User');
const { sendAccountCreatedEmail, sendBookingCongratulationsEmail } = require('./emailService');

const logEmailFailure = (label, err) => {
  console.error(`[email] ${label} failed:`, err?.message || err);
};

const sendAccountCreatedEmailSafe = async (user) => {
  if (!user?.email) {
    return { sent: false, error: 'No email on user' };
  }

  const fresh = await User.findById(user._id || user.id).select('email name accountCreatedEmailSent');
  if (!fresh) {
    return { sent: false, error: 'User not found' };
  }
  if (fresh.accountCreatedEmailSent) {
    return { sent: false, skipped: true };
  }

  try {
    const result = await sendAccountCreatedEmail({
      email: fresh.email,
      name: fresh.name || 'Traveller',
    });
    if (result.sent) {
      await User.findByIdAndUpdate(fresh._id, { accountCreatedEmailSent: true });
      console.log(`[email] Account created email sent to ${fresh.email}`);
    }
    return result;
  } catch (err) {
    logEmailFailure('Account created', err);
    return { sent: false, error: err.message || 'Email send failed' };
  }
};

const sendWelcomeEmailSafe = (user) => sendAccountCreatedEmailSafe(user);

const sendBookingCongratulationsSafe = async (booking) => {
  const user = booking.userId;
  const email = user?.email;
  if (!email) {
    const msg = 'Customer has no email on file for this booking.';
    console.warn(`[email] Booking confirmation skipped — ${msg} (${booking._id})`);
    return { sent: false, error: msg };
  }

  try {
    const result = await sendBookingCongratulationsEmail({
      email,
      name: user.name || 'Traveller',
      booking,
    });
    if (result.sent) {
      console.log(`[email] Booking confirmed email (${booking.bookingType}) sent to ${email}`);
      return { sent: true };
    }
    return { sent: false, error: result.error || 'Email could not be sent.' };
  } catch (err) {
    logEmailFailure('Booking confirmation', err);
    return { sent: false, error: err.message || 'Email send failed' };
  }
};

module.exports = {
  sendAccountCreatedEmailSafe,
  sendWelcomeEmailSafe,
  sendBookingCongratulationsSafe,
  sendBookingConfirmationSafe: sendBookingCongratulationsSafe,
};
