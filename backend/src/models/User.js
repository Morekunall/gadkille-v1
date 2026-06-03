const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true, default: '' },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationOtpHash: { type: String, select: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    accountCreatedEmailSent: { type: Boolean, default: false, select: false },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    savedForts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fort' }],
  },
  { timestamps: true }
);

userSchema.virtual('isLocked').get(function isLocked() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incLoginAttempts = async function incLoginAttempts() {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME_MS = 15 * 60 * 1000;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  const attempts = (this.loginAttempts || 0) + 1;

  if (attempts >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME_MS };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function resetLoginAttempts() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

userSchema.methods.clearVerificationFields = function clearVerificationFields() {
  this.isEmailVerified = true;
  this.emailVerificationOtpHash = undefined;
  this.emailVerificationTokenHash = undefined;
  this.emailVerificationExpires = undefined;
};

userSchema.methods.clearPasswordResetFields = function clearPasswordResetFields() {
  this.passwordResetTokenHash = undefined;
  this.passwordResetExpires = undefined;
};

module.exports = mongoose.model('User', userSchema);
