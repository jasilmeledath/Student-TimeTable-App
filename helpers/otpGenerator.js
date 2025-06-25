const otpGenerator = require('otp-generator');
const crypto = require('crypto');

/**
 * Generate a secure OTP
 * @param {number} length - Length of the OTP (default: 6)
 * @returns {string} Generated OTP
 */
exports.generateOTP = (length = 6) => {
  return otpGenerator.generate(length, {
    digits: true,
    alphabets: false,
    upperCase: false,
    specialChars: false
  });
};

/**
 * Generate a secure reset token
 * @returns {Object} Object containing token and hashed token
 */
exports.generateResetToken = () => {
  // Generate a random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token for storage
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  return {
    resetToken,
    hashedToken
  };
};

/**
 * Hash a token for verification
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
exports.hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

/**
 * Generate expiry timestamp
 * @param {number} minutes - Minutes until expiry
 * @returns {Date} Expiry timestamp
 */
exports.generateExpiryTime = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Check if a timestamp is expired
 * @param {Date} timestamp - Timestamp to check
 * @returns {boolean} True if timestamp is expired
 */
exports.isExpired = (timestamp) => {
  return Date.now() > timestamp.getTime();
}; 