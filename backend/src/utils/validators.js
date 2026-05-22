const { body, validationResult } = require('express-validator');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0]?.msg || 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must be 8+ chars with upper, lower, and a number'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^[+]?[\d\s-]{10,15}$/)
    .withMessage('Enter a valid 10-digit mobile number'),
];

const loginRules = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const checkEmailRules = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const verifyEmailRules = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit code'),
];

const resendVerificationRules = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const forgotPasswordRules = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordRules = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must be 8+ chars with upper, lower, and a number'),
];

const completeProfileRules = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s-]{10,15}$/)
    .withMessage('Enter a valid 10-digit mobile number'),
];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  checkEmailRules,
  verifyEmailRules,
  resendVerificationRules,
  forgotPasswordRules,
  resetPasswordRules,
  completeProfileRules,
  PASSWORD_REGEX,
};
