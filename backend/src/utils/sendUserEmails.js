<<<<<<< HEAD
const { sendWelcomeEmail, sendBookingCongratulationsEmail } = require('./emailService');
=======
const {
  sendWelcomeEmail,
  sendGoogleRegistrationEmail,
  sendRegistrationCompleteEmail,
  sendBookingConfirmationEmail,
} = require('./emailService');
>>>>>>> 3ce6641800867fc68ec0b4861a0597d0483a0bc5

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

<<<<<<< HEAD
const sendBookingCongratulationsSafe = async (booking) => {
=======
const sendGoogleSignupEmailsSafe = async ({ user, otp, verifyToken }) => {
  if (!user?.email) return;
  try {
    const result = await sendGoogleRegistrationEmail({
      email: user.email,
      name: user.name || 'Traveller',
      otp,
      verifyToken,
    });
    if (result.sent) {
      console.log(`[email] Google registration email sent to ${user.email}`);
    }
  } catch (err) {
    logEmailFailure('Google registration email', err);
  }
};

const sendRegistrationCompleteEmailSafe = (user) => {
  if (!user?.email || !user.phone) return;
  sendRegistrationCompleteEmail({
    email: user.email,
    name: user.name || 'Traveller',
    phone: user.phone,
  })
    .then((result) => {
      if (result.sent) {
        console.log(`[email] Registration complete email sent to ${user.email}`);
      }
    })
    .catch((err) => logEmailFailure('Registration complete email', err));
  sendWelcomeEmailSafe(user);
};

const sendBookingConfirmationSafe = (booking) => {
>>>>>>> 3ce6641800867fc68ec0b4861a0597d0483a0bc5
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
<<<<<<< HEAD
  sendBookingCongratulationsSafe,
  sendBookingConfirmationSafe: sendBookingCongratulationsSafe,
=======
  sendGoogleSignupEmailsSafe,
  sendRegistrationCompleteEmailSafe,
  sendBookingConfirmationSafe,
>>>>>>> 3ce6641800867fc68ec0b4861a0597d0483a0bc5
};
