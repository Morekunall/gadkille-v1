const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { hashToken, generateOtp, generateSecureToken } = require('../utils/tokenUtils');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  frontendUrl,
  isDev,
} = require('../utils/emailService');
const crypto = require('crypto');
const querystring = require('querystring');
const { sendAccountCreatedEmailSafe } = require('../utils/sendUserEmails');
const { getAuthJwtSecret } = require('../utils/jwtSecret');
const {
  handleValidation,
  registerRules,
  loginRules,
  checkEmailRules,
  verifyEmailRules,
  resendVerificationRules,
  forgotPasswordRules,
  resetPasswordRules,
  completeProfileRules,
} = require('../utils/validators');
const {
  authLimiter,
  loginLimiter,
  registerLimiter,
  verifyLimiter,
  forgotPasswordLimiter,
} = require('../middleware/rateLimiters');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const OTP_EXPIRY_MS = 15 * 60 * 1000;
const RESET_EXPIRY_MS = 60 * 60 * 1000;

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  authProvider: user.authProvider || 'local',
  isEmailVerified: user.isEmailVerified !== false,
  needsPhone: !String(user.phone || '').trim(),
});

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, getAuthJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const envTrim = (key) => {
  const v = process.env[key];
  if (typeof v !== 'string') return v;
  return v.trim().replace(/^\uFEFF/, '').replace(/\uFEFF/g, '');
};

const getGoogleRedirectUri = (req) => {
  const fromEnv = envTrim('GOOGLE_REDIRECT_URI');
  if (fromEnv) return fromEnv;

  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.headers.host || 'localhost:5000';
  return `${protocol}://${host}/api/auth/google/callback`;
};

/**
 * OAuth `state` as a short-lived JWT (same secret as app JWTs).
 * More reliable than nonce.sig through Google’s redirect + query parsing.
 */
const GOOGLE_OAUTH_STATE_PURPOSE = 'gk-google-oauth';

const signGoogleOAuthState = () => {
  const secret = getAuthJwtSecret();
  if (!secret) {
    throw new Error('JWT_SECRET is required for Google OAuth (signs the state parameter).');
  }
  return jwt.sign(
    {
      p: GOOGLE_OAUTH_STATE_PURPOSE,
      n: crypto.randomBytes(16).toString('base64url'),
    },
    secret,
    { expiresIn: '30m', algorithm: 'HS256' }
  );
};

const verifyGoogleOAuthState = (state) => {
  try {
    if (!state || typeof state !== 'string') return false;
    const secret = getAuthJwtSecret();
    if (!secret) return false;
    let raw = String(state).trim();
    if (raw.includes(' ') && raw.split('.').length === 3) {
      raw = raw.replace(/ /g, '+');
    }
    const payload = jwt.verify(raw, secret, {
      algorithms: ['HS256'],
      clockTolerance: 120,
    });
    return Boolean(payload && payload.p === GOOGLE_OAUTH_STATE_PURPOSE);
  } catch (e) {
    console.warn('[Google OAuth] state verify failed:', e.message);
    return false;
  }
};

const buildGoogleAuthUrl = (req) => {
  const clientId = envTrim('GOOGLE_CLIENT_ID');
  const redirectUri = getGoogleRedirectUri(req);
  if (!clientId) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID in your backend .env.');
  }
  const state = signGoogleOAuthState();
  const query = querystring.stringify({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${query}`, state };
};

const exchangeGoogleCode = async (code, req) => {
  const clientSecret = envTrim('GOOGLE_CLIENT_SECRET');
  const clientId = envTrim('GOOGLE_CLIENT_ID');
  if (!clientSecret || !clientId) {
    console.error('[exchangeGoogleCode] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return null;
  }
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const redirectUri = getGoogleRedirectUri(req);
  console.log('[exchangeGoogleCode] Redirect URI:', redirectUri);
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[exchangeGoogleCode] ❌ Token exchange failed. Status:', res.status, 'Error:', errorText);
      return null;
    }
    
    const data = await res.json();
    console.log('[exchangeGoogleCode] ✅ Token received');
    return data;
  } catch (error) {
    console.error('[exchangeGoogleCode] 🔴 Exception:', error.message);
    return null;
  }
};

const fetchGoogleUser = async (accessToken) => {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[fetchGoogleUser] ❌ Failed. Status:', res.status, 'Error:', errorText);
      return null;
    }
    
    const data = await res.json();
    console.log('[fetchGoogleUser] ✅ User profile received:', data.email);
    return data;
  } catch (error) {
    console.error('[fetchGoogleUser] 🔴 Exception:', error.message);
    return null;
  }
};

const assignVerificationCredentials = (user) => {
  const otp = generateOtp();
  const verifyToken = generateSecureToken();
  user.emailVerificationOtpHash = hashToken(otp);
  user.emailVerificationTokenHash = hashToken(verifyToken);
  user.emailVerificationExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  return { otp, verifyToken };
};

const sendVerificationForUser = async (user) => {
  const { otp, verifyToken } = assignVerificationCredentials(user);
  await user.save();
  const result = await sendVerificationEmail({
    email: user.email,
    name: user.name,
    otp,
    verifyToken,
  });
  const verifyLink = `${frontendUrl()}/verify-email?token=${verifyToken}`;
  if (!result.sent) {
    console.warn(`[dev] Verification OTP for ${user.email}: ${otp}`);
    console.warn(`[dev] Verification link: ${verifyLink}`);
  }
  return { otp, verifyToken, verifyLink, emailSent: result.sent };
};

// @route   POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  registerLimiter,
  registerRules,
  handleValidation,
  async (req, res) => {
    try {
      const { name, password, phone } = req.body;
      const email = String(req.body.email || '')
        .trim()
        .toLowerCase();

      const existingUser = await User.findOne({ email }).select(
        '+emailVerificationOtpHash +emailVerificationTokenHash +emailVerificationExpires'
      );

      if (existingUser) {
        if (existingUser.isEmailVerified === true) {
          return res.status(400).json({ message: 'An account with this email already exists' });
        }
        existingUser.name = name;
        existingUser.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
        existingUser.phone = typeof phone === 'string' ? phone.trim() : '';
        const verification = await sendVerificationForUser(existingUser);
        return res.status(200).json({
          message: verification.emailSent
            ? 'Verification code sent. Check your email to activate your account.'
            : 'Account updated. Check your email or the server console for the verification code.',
          email: existingUser.email,
          requiresVerification: true,
          ...(isDev() && !verification.emailSent
            ? { devVerifyLink: verification.verifyLink, devOtp: verification.otp }
            : {}),
        });
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = new User({
        name: String(name).trim(),
        email,
        password: hashedPassword,
        phone: typeof phone === 'string' ? phone.trim() : '',
        isEmailVerified: false,
      });

      let verification;
      try {
        verification = await sendVerificationForUser(user);
      } catch (emailErr) {
        console.error('Register: user saved but verification email failed:', emailErr.message);
        verification = {
          emailSent: false,
          otp: null,
          verifyLink: null,
        };
      }

      res.status(201).json({
        message: verification.emailSent
          ? 'Account created. Check your email for the verification code.'
          : 'Account created. Check your email or the server console for the verification code.',
        email: user.email,
        requiresVerification: true,
        ...(isDev() && !verification.emailSent
          ? { devVerifyLink: verification.verifyLink, devOtp: verification.otp }
          : {}),
      });
    } catch (error) {
      console.error('Register error:', error.message, error.stack);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({
        message: isDev() ? error.message || 'Server error' : 'Unable to create account. Please try again.',
      });
    }
  }
);

// @route   POST /api/auth/verify-email
router.post(
  '/verify-email',
  authLimiter,
  verifyLimiter,
  verifyEmailRules,
  handleValidation,
  async (req, res) => {
    try {
      const { email, otp } = req.body;

      const user = await User.findOne({ email }).select(
        '+emailVerificationOtpHash +emailVerificationTokenHash +emailVerificationExpires'
      );

      if (!user) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ message: 'Email is already verified. You can log in.' });
      }

      if (
        !user.emailVerificationExpires ||
        user.emailVerificationExpires < Date.now() ||
        user.emailVerificationOtpHash !== hashToken(otp)
      ) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }

      user.clearVerificationFields();
      await user.save();
      await user.resetLoginAttempts();

      sendAccountCreatedEmailSafe(user).catch((err) =>
        console.error('[auth] Account created email error:', err.message)
      );

      const token = generateToken(user);
      res.json({
        message: 'Email verified successfully. Check your inbox for account confirmation.',
        token,
        user: sanitizeUser(user),
      });
    } catch (error) {
      console.error('Verify email error:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/auth/verify-email?token=
router.get('/verify-email', authLimiter, verifyLimiter, async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationOtpHash +emailVerificationTokenHash +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    if (user.isEmailVerified) {
      return res.json({ message: 'Email already verified', alreadyVerified: true });
    }

    user.clearVerificationFields();
    await user.save();
    await user.resetLoginAttempts();

    sendAccountCreatedEmailSafe(user).catch((err) =>
      console.error('[auth] Account created email error:', err.message)
    );

    const jwtToken = generateToken(user);
    res.json({
      message: 'Email verified successfully. Check your inbox for account confirmation.',
      token: jwtToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Verify email link error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/resend-verification
router.post(
  '/resend-verification',
  authLimiter,
  verifyLimiter,
  resendVerificationRules,
  handleValidation,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email }).select(
        '+emailVerificationOtpHash +emailVerificationTokenHash +emailVerificationExpires'
      );

      if (!user || user.isEmailVerified) {
        return res.json({
          message: 'If an unverified account exists, a new code has been sent.',
        });
      }

      await sendVerificationForUser(user);
      res.json({ message: 'If an unverified account exists, a new code has been sent.' });
    } catch (error) {
      console.error('Resend verification error:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/check-email
router.post(
  '/check-email',
  authLimiter,
  checkEmailRules,
  handleValidation,
  async (req, res) => {
    try {
      const email = String(req.body.email || '').toLowerCase().trim();
      const user = await User.findOne({ email }).select('isEmailVerified');
      if (!user) {
        return res.json({ exists: false, verified: false });
      }
      return res.json({
        exists: true,
        verified: user.isEmailVerified !== false,
      });
    } catch (error) {
      console.error('Check email error:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  loginLimiter,
  loginRules,
  handleValidation,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const emailNorm = String(email || '').toLowerCase().trim();

      const user = await User.findOne({ email: emailNorm }).select(
        '+password +loginAttempts +lockUntil +isEmailVerified'
      );

      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      if (user.isLocked) {
        return res.status(423).json({
          message: 'Account temporarily locked due to failed login attempts. Try again later.',
          code: 'ACCOUNT_LOCKED',
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        await user.incLoginAttempts();
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      if (user.isEmailVerified === false) {
        return res.status(403).json({
          message: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
        });
      }

      await user.resetLoginAttempts();

      sendAccountCreatedEmailSafe(user).catch((err) =>
        console.error('[auth] Account created email on login:', err.message)
      );

      const token = generateToken(user);
      res.json({
        token,
        user: sanitizeUser(user),
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/auth/oauth-health — safe config check for Render (no secrets exposed)
router.get('/oauth-health', async (req, res) => {
  const mongoose = require('mongoose');
  const mongoState = mongoose.connection.readyState;
  const mongoStateLabel = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState] || 'unknown';

  let canQueryUsers = false;
  let dbError = null;
  if (mongoState === 1) {
    try {
      await User.estimatedDocumentCount();
      canQueryUsers = true;
    } catch (e) {
      dbError = e.message;
    }
  }

  let canSignJwt = false;
  let jwtError = null;
  try {
    const secret = getAuthJwtSecret();
    if (secret) {
      jwt.sign({ test: 1 }, secret, { expiresIn: '1m' });
      canSignJwt = true;
    } else {
      jwtError = 'JWT_SECRET is empty';
    }
  } catch (e) {
    jwtError = e.message;
  }

  const ok =
    Boolean(envTrim('GOOGLE_CLIENT_ID')) &&
    Boolean(envTrim('GOOGLE_CLIENT_SECRET')) &&
    Boolean(getAuthJwtSecret()) &&
    mongoState === 1 &&
    canQueryUsers &&
    canSignJwt;

  const smtpConfigured = Boolean(
    envTrim('SMTP_HOST') && envTrim('SMTP_USER') && envTrim('SMTP_PASS')
  );

  res.json({
    ok,
    jwtSecretConfigured: Boolean(getAuthJwtSecret()),
    googleClientIdConfigured: Boolean(envTrim('GOOGLE_CLIENT_ID')),
    googleClientSecretConfigured: Boolean(envTrim('GOOGLE_CLIENT_SECRET')),
    smtpConfigured,
    googleRedirectUri: getGoogleRedirectUri(req),
    frontendUrl: frontendUrl(),
    mongoState: mongoStateLabel,
    canQueryUsers,
    canSignJwt,
    dbError,
    jwtError,
  });
});

// @route   GET /api/auth/google
router.get('/google', (req, res) => {
  try {
    const { url, state } = buildGoogleAuthUrl(req);
    console.log('[Google OAuth Init] Redirecting to Google. State:', state.slice(0, 8));
    res.redirect(url);
  } catch (error) {
    console.error('Google OAuth config error:', error.message);
    const returnBase = getReturnUrlFromRequest(req);
    res.redirect(`${returnBase}/login?error=google_auth_not_configured`);
  }
});

// @route   GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  const fail = (code, logMsg, extra) => {
    if (logMsg) console.error('[Google OAuth]', logMsg, extra ?? '');
    return res.redirect(`${frontendUrl()}/login?error=${code}`);
  };

  try {
    const googleErr = req.query.error;
    if (googleErr === 'access_denied') {
      return fail('google_cancelled', 'User cancelled at Google consent screen');
    }
    if (googleErr) {
      return fail('google_auth_failed', `Google returned error=${googleErr}`);
    }

    let code = req.query.code;
    if (Array.isArray(code)) code = code[0];
    code = code ? String(code).trim() : '';

    console.log('[Google OAuth Callback] Received:', { code: !!code, state: req.query.state?.slice?.(0, 8) });

    if (!code) {
      return fail('google_no_code', 'Missing authorization code (try signing in again)');
    }

    const stateParam = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;
    const state = stateParam ? String(stateParam).trim() : '';

    if (!getAuthJwtSecret()) {
      return fail('google_server', 'JWT_SECRET is not set on the server');
    }
    if (!verifyGoogleOAuthState(state)) {
      return fail(
        'google_bad_state',
        'OAuth state JWT did not verify — usually JWT_SECRET has a BOM/hidden character on Render, or the tab is stale. Re-save JWT_SECRET (plain text, no quotes).'
      );
    }

    if (!envTrim('GOOGLE_CLIENT_SECRET')) {
      return fail('google_auth_not_configured', 'GOOGLE_CLIENT_SECRET is not set on the server');
    }

    console.log('[Google OAuth] Exchanging code for token...');
    const tokenData = await exchangeGoogleCode(code, req);
    if (!tokenData?.access_token) {
      return fail(
        'google_token',
        'Failed to get access token (check GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and Google Console redirect URI match exactly)'
      );
    }

    console.log('[Google OAuth] Fetching user profile...');
    const profile = await fetchGoogleUser(tokenData.access_token);
    const emailRaw = profile?.email ? String(profile.email).trim() : '';
    const emailNorm = emailRaw.toLowerCase();
    if (!emailNorm) {
      return fail('google_profile', 'No email in Google profile', profile);
    }

    console.log('[Google OAuth] Profile received for:', emailNorm);
    let user = await User.findOne({ email: emailNorm });
    if (!user) {
      console.log('[Google OAuth] Creating new user for:', emailNorm);
      const password = generateSecureToken();
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      user = await User.create({
        name:
          profile.name ||
          `${profile.given_name || ''} ${profile.family_name || ''}`.trim() ||
          emailNorm,
        email: emailNorm,
        password: hashedPassword,
        phone: '',
        authProvider: 'google',
        isEmailVerified: true,
      });
      sendAccountCreatedEmailSafe(user).catch((err) =>
        console.error('[Google OAuth] account created email error:', err.message)
      );
    } else if (!user.isEmailVerified) {
      console.log('[Google OAuth] Marking email as verified for existing user:', emailNorm);
      user.isEmailVerified = true;
      await user.save();
    } else {
      console.log('[Google OAuth] Existing verified user:', emailNorm);
    }

    const jwtToken = generateToken(user);
    console.log('[Google OAuth] ✅ Login successful for:', user.email);
    const redirectUrl = `${frontendUrl()}/login?token=${encodeURIComponent(jwtToken)}`;
    console.log('[Google OAuth] Redirecting to:', redirectUrl.substring(0, 50) + '...');
    res.redirect(redirectUrl);
  } catch (error) {
    const msg = error.message || String(error);
    console.error('🔴 Google OAuth callback error:', msg, error.stack);
    if (error.code === 11000) {
      return fail('google_server', 'Duplicate account email (database constraint)', msg);
    }
    return fail('google_server', 'Callback exception', msg);
  }
});

// @route   POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordLimiter,
  forgotPasswordRules,
  handleValidation,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      const genericMessage =
        'If an account exists for that email, password reset instructions have been sent.';

      if (!user) {
        return res.json({ message: genericMessage, emailSent: false });
      }

      const resetToken = generateSecureToken();
      user.passwordResetTokenHash = hashToken(resetToken);
      user.passwordResetExpires = new Date(Date.now() + RESET_EXPIRY_MS);
      await user.save({ validateBeforeSave: false });

      const resetLink = `${frontendUrl()}/reset-password?token=${resetToken}`;
      const result = await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetToken,
      });

      if (!result.sent) {
        console.warn(`[dev] Password reset link for ${user.email}: ${resetLink}`);
      }

      if (result.sent) {
        return res.json({
          message: `Password reset email sent to ${user.email}. Check your inbox and spam folder.`,
          emailSent: true,
        });
      }

      res.json({
        message:
          'We could not send the email. Check SMTP settings or use the development link below.',
        emailSent: false,
        ...(isDev() ? { devResetLink: resetLink } : {}),
      });
    } catch (error) {
      console.error('Forgot password error:', error.message, error.stack);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/reset-password
router.post(
  '/reset-password',
  authLimiter,
  forgotPasswordLimiter,
  resetPasswordRules,
  handleValidation,
  async (req, res) => {
    try {
      const { token, password } = req.body;

      const user = await User.findOne({
        passwordResetTokenHash: hashToken(token),
        passwordResetExpires: { $gt: Date.now() },
      }).select('+passwordResetTokenHash +passwordResetExpires');

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset link' });
      }

      user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
      user.clearPasswordResetFields();
      await user.save();
      await user.resetLoginAttempts();

      res.json({ message: 'Password updated successfully. You can now log in.' });
    } catch (error) {
      console.error('Reset password error:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/complete-profile — phone after Google sign-up
router.post(
  '/complete-profile',
  protect,
  authLimiter,
  completeProfileRules,
  handleValidation,
  async (req, res) => {
    try {
      const phone = String(req.body.phone || '').trim();
      const user = req.user;
      const hadPhone = Boolean(String(user.phone || '').trim());

      user.phone = phone;
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      await user.save();

      sendAccountCreatedEmailSafe(user).catch((err) =>
        console.error('[complete-profile] account created email error:', err.message)
      );

      const token = generateToken(user);
      res.json({
        message: 'Profile completed successfully. Check your inbox for account confirmation.',
        token,
        user: sanitizeUser(user),
      });
    } catch (error) {
      console.error('Complete profile error:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// @route   PUT /api/auth/me
router.put('/me', protect, async (req, res) => {
  const { phone } = req.body;
  req.user.phone = typeof phone === 'string' ? phone : req.user.phone;
  await req.user.save();
  res.json({ user: sanitizeUser(req.user) });
});

module.exports = router;
