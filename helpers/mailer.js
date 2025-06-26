/**
 * Email Service Module
 * Provides email functionality for user notifications and authentication
 * Configures and manages Nodemailer transport for sending emails
 * @module helpers/mailer
 */

const nodemailer = require('nodemailer');

/**
 * Email transport configuration
 * Uses environment variables for SMTP settings
 * Supports both secure (465) and non-secure ports
 * 
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
 * Sends password reset email containing OTP
 * Includes formatted HTML template with OTP display
 * Sets 10-minute expiration notice
 * 
 * @async
 * @param {string} to - Recipient email address
 * @param {string} otp - One-time password for verification
 * @returns {Promise<void>} Resolves when email is sent
 * @throws {Error} If email sending fails
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
 * Sends password reset link via email
 * Includes formatted HTML template with reset button
 * Provides fallback URL for button failure
 * 
 * @async
 * @param {string} to - Recipient email address
 * @param {string} resetToken - Unique token for password reset
 * @param {string} resetUrl - Complete URL for password reset page
 * @returns {Promise<void>} Resolves when email is sent
 * @throws {Error} If email sending fails
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
 * Sends welcome email to newly registered students
 * Includes login credentials and security instructions
 * Notifies about required password change on first login
 * 
 * @async
 * @param {string} to - Recipient email address
 * @param {string} name - Student's full name
 * @param {string} rollNo - Student's roll number for login
 * @param {string} defaultPassword - Temporary password for first login
 * @returns {Promise<void>} Resolves when email is sent
 * @throws {Error} If email sending fails
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
 * Validates email transport configuration
 * Tests SMTP connection and authentication
 * Used during application startup to ensure email functionality
 * 
 * @async
 * @returns {Promise<boolean>} True if configuration is valid and connection test succeeds
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