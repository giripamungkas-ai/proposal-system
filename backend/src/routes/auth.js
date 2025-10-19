/**
 * Authentication Routes
 *
 * Complete authentication system with:
 * - User registration and login
 * - JWT token generation and validation
 * - Password hashing and verification
 * - Session management
 * - Role-based access control
 * - Password reset functionality
 * - Email verification
 * - User profile management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key';

/**
 * User Registration
 * POST /api/auth/register
 */
router.post('/register', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 6, max: 100 }).withMessage('Password must be 6-100 characters'),
  body('firstName').isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('lastName').isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'manager', 'sales', 'viewer', 'guest']).withMessage('Invalid role'),
  body('phone').optional().isMobilePhone('id-ID').withMessage('Please provide a valid Indonesian phone number')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, username, password, firstName, lastName, role = 'viewer', phone } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, full_name, role, phone, is_active, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, username, first_name, last_name, full_name, role, phone, is_active, is_verified, created_at`,
      [email, username, hashedPassword, firstName, lastName, `${firstName} ${lastName}`, role, phone]
    );

    // Generate tokens
    const user = newUser.rows[0];
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '30d' }
    );

    // Log user registration
    logger.info('User registered successfully:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    });

    // Send response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
          isActive: user.is_active,
          isVerified: user.is_verified,
          createdAt: user.created_at
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const userQuery = await pool.query(
      'SELECT id, email, username, password_hash, first_name, last_name, full_name, role, phone, is_active, is_verified, last_login_at, created_at FROM users WHERE email = $1',
      [email]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userQuery.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '30d' }
    );

    // Log user login
    logger.info('User logged in successfully:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
          isActive: user.is_active,
          isVerified: user.is_verified,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Refresh Token
 * POST /api/auth/refresh
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Get user from database
    const userQuery = await pool.query(
      'SELECT id, email, username, first_name, last_name, full_name, role, phone, is_active, is_verified FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userQuery.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Send response
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
          isActive: user.is_active,
          isVerified: user.is_verified
        }
      }
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Log user logout
    logger.info('User logged out:', {
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get Current User Profile
 * GET /api/auth/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Get user profile from database
    const userProfile = await pool.query(
      'SELECT id, email, username, first_name, last_name, full_name, role, department, position, phone, avatar_url, is_active, is_verified, last_login_at, created_at, updated_at FROM users WHERE id = $1',
      [user.id]
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const profile = userProfile.rows[0];

    // Send response
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        firstName: profile.first_name,
        lastName: profile.last_name,
        fullName: profile.full_name,
        role: profile.role,
        department: profile.department,
        position: profile.position,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        isActive: profile.is_active,
        isVerified: profile.is_verified,
        lastLoginAt: profile.last_login_at,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Update User Profile
 * PUT /api/auth/profile
 */
router.put('/profile', authenticateToken, [
  body('firstName').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('phone').optional().isMobilePhone('id-ID').withMessage('Please provide a valid Indonesian phone number'),
  body('department').optional().isLength({ min: 1, max: 100 }).withMessage('Department must be 1-100 characters'),
  body('position').optional().isLength({ min: 1, max: 100 }).withMessage('Position must be 1-100 characters')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = req.user;
    const { firstName, lastName, phone, department, position } = req.body;

    // Update user profile
    const updateQuery = `
      UPDATE users
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          full_name = COALESCE($3, first_name || '') || COALESCE($4, last_name || ''),
          phone = COALESCE($5, phone),
          department = COALESCE($6, department),
          position = COALESCE($7, position),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id, email, username, first_name, last_name, full_name, role, phone, department, position, is_active, is_verified, created_at, updated_at
    `;

    const updateResult = await pool.query(updateQuery, [
      firstName,
      lastName,
      firstName || user.firstName,
      lastName || user.lastName,
      phone,
      department,
      position,
      user.id
    ]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = updateResult.rows[0];

    // Log profile update
    logger.info('User profile updated:', {
      id: updatedUser.id,
      email: updatedUser.email,
      changes: { firstName, lastName, phone, department, position }
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        fullName: updatedUser.full_name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        department: updatedUser.department,
        position: updatedUser.position,
        isActive: updatedUser.is_active,
        isVerified: updatedUser.is_verified,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Change Password
 * PUT /api/auth/change-password
 */
router.put('/change-password', authenticateToken, [
  body('currentPassword').exists().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6, max: 100 }).withMessage('New password must be 6-100 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  }).withMessage('Password confirmation does not match')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const userQuery = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password_hash } = userQuery.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, user.id]
    );

    // Log password change
    logger.info('Password changed successfully:', {
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Forgot Password
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user
    const userQuery = await pool.query(
      'SELECT id, email, username, first_name, last_name FROM users WHERE email = $1',
      [email]
    );

    if (userQuery.rows.length === 0) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });
    }

    const user = userQuery.rows[0];

    // Generate reset token (in a real implementation, this would be saved to database)
    const resetToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'password_reset',
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Log password reset request
    logger.info('Password reset requested:', {
      id: user.id,
      email: user.email,
      username: user.username
    });

    // In a real implementation, you would send an email with the reset token
    // For now, we'll just return success message

    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent'
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Reset Password
 * POST /api/auth/reset-password
 */
router.post('/reset-password', [
  body('token').exists().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6, max: 100 }).withMessage('New password must be 6-100 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  }).withMessage('Password confirmation does not match')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(401).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check if token is expired (older than 1 hour)
    if (Date.now() - decoded.timestamp > 3600000) { // 1 hour in milliseconds
      return res.status(401).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    // Get user
    const userQuery = await pool.query(
      'SELECT id, email, username, password_hash FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userQuery.rows[0];

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, user.id]
    );

    // Log password reset
    logger.info('Password reset successfully:', {
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Verify Email
 * POST /api/auth/verify-email
 */
router.post('/verify-email', [
  body('token').exists().withMessage('Verification token is required')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    if (decoded.type !== 'email_verification') {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Update user verification status
    await pool.query(
      'UPDATE users SET is_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [decoded.id]
    );

    // Log email verification
    logger.info('Email verified successfully:', {
      id: decoded.id,
      email: decoded.email
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Check Token Validity
 * POST /api/auth/check-token
 */
router.post('/check-token', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Send response
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    });

  } catch (error) {
    logger.error('Token check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
