const bcrypt = require('bcryptjs');
const User = require('../models/User');

const envTrim = (key) => {
  const v = process.env[key];
  if (typeof v !== 'string') return '';
  return v.trim();
};

const ensureAdminUser = async () => {
  await User.updateMany(
    { isEmailVerified: { $exists: false } },
    { $set: { isEmailVerified: true } }
  );

  const ADMIN_EMAIL = envTrim('ADMIN_EMAIL') || 'admin@gadkille.local';
  const ADMIN_PASSWORD = envTrim('ADMIN_PASSWORD') || 'Admin@12345';
  const ADMIN_NAME = envTrim('ADMIN_NAME') || 'GadKille Admin';
  const explicitEnv = Boolean(envTrim('ADMIN_EMAIL'));
  const forceSync = process.env.ADMIN_SYNC_PASSWORD === 'true' || explicitEnv;

  const emailNorm = ADMIN_EMAIL.toLowerCase().trim();
  const existingAdmin = await User.findOne({ email: emailNorm }).select('+password');

  if (existingAdmin) {
    let changed = false;
    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      changed = true;
    }
    if (existingAdmin.isEmailVerified !== true) {
      existingAdmin.isEmailVerified = true;
      changed = true;
    }
    if (existingAdmin.authProvider !== 'local') {
      existingAdmin.authProvider = 'local';
      changed = true;
    }
    if (ADMIN_PASSWORD) {
      let passwordMatches = false;
      if (existingAdmin.password) {
        passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, existingAdmin.password);
      }
      if (forceSync || !passwordMatches) {
        const salt = await bcrypt.genSalt(10);
        existingAdmin.password = await bcrypt.hash(ADMIN_PASSWORD, salt);
        changed = true;
        console.log(`[admin] Password synced for ${emailNorm}`);
      }
    }
    if (changed) await existingAdmin.save();
    console.log(`[admin] Ready: ${emailNorm} (role=admin)`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

  await User.create({
    name: ADMIN_NAME,
    email: emailNorm,
    password: hashedPassword,
    role: 'admin',
    isEmailVerified: true,
    authProvider: 'local',
  });

  console.log(`[admin] Created: ${emailNorm}`);
};

module.exports = ensureAdminUser;
