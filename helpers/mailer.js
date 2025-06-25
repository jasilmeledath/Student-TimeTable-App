const nodemailer = require('nodemailer');

/**
 * Email transport configuration
 * @type {nodemailer.Transporter}
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send password reset email with OTP
 * @param {string} to - Recipient email address
 * @param {string} otp - One-time password
 * @returns {Promise<void>}
 */
exports.sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: 'Password Reset OTP',
    html: `
      <h1>Password Reset Request</h1>
      <p>Your one-time password (OTP) for resetting your password is:</p>
      <h2 style="color: #2c3e50; background: #f7f9fc; padding: 10px; text-align: center; font-size: 24px;">
        ${otp}
      </h2>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not request this password reset, please ignore this email.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send password reset link email
 * @param {string} to - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Password reset URL
 * @returns {Promise<void>}
 */
exports.sendResetLinkEmail = async (to, resetToken, resetUrl) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: 'Password Reset Link',
    html: `
      <h1>Password Reset Request</h1>
      <p>You have requested to reset your password. Click the button below to reset it:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </div>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this password reset, please ignore this email.</p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all;">${resetUrl}</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send welcome email to new student
 * @param {string} to - Recipient email address
 * @param {string} name - Student's name
 * @param {string} rollNo - Student's roll number
 * @param {string} defaultPassword - Default password
 * @returns {Promise<void>}
 */
exports.sendWelcomeEmail = async (to, name, rollNo, defaultPassword) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: 'Welcome to Student Timetable Manager',
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Your account has been created in the Student Timetable Management System.</p>
      <h2>Your Login Credentials:</h2>
      <ul style="list-style: none; padding: 0;">
        <li><strong>Roll Number:</strong> ${rollNo}</li>
        <li><strong>Default Password:</strong> ${defaultPassword}</li>
      </ul>
      <p style="color: #e74c3c;">
        <strong>Important:</strong> For security reasons, you will be required to change your password on first login.
      </p>
      <p>Please keep your credentials secure and do not share them with anyone.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Verify email transport configuration
 * @returns {Promise<boolean>} True if configuration is valid
 */
exports.verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}; 