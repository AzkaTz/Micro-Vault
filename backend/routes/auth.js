const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters'),
  body('full_name').trim().notEmpty(),
  body('role').isIn(['admin', 'researcher', 'technician']),
  body('biosafety_clearance').optional().isInt({ min: 1, max: 4 })
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, full_name, role, biosafety_clearance, lab_affiliation } = req.body;

  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, biosafety_clearance, lab_affiliation)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, biosafety_clearance, created_at`,
      [email, password_hash, full_name, role, biosafety_clearance || null, lab_affiliation || null]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        biosafety_clearance: user.biosafety_clearance
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      ['USER_REGISTERED', 'user', user.id, user.id, JSON.stringify({ email, role })]
    );

    res.status(201).json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        biosafety_clearance: user.biosafety_clearance
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user
    const result = await db.query(
      'SELECT id, email, password_hash, full_name, role, biosafety_clearance FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        biosafety_clearance: user.biosafety_clearance
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['USER_LOGIN', 'user', user.id, user.id, req.ip, JSON.stringify({ email })]
    );

    res.json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        biosafety_clearance: user.biosafety_clearance
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Helper function: Validate password strength
function validatePassword(password) {
  const minLength = 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  if (password.length < minLength) errors.push(`Minimum ${minLength} characters required`);
  if (!hasUppercase) errors.push('At least one uppercase letter required');
  if (!hasLowercase) errors.push('At least one lowercase letter required');
  if (!hasNumber) errors.push('At least one number required');
  if (!hasSpecialChar) errors.push('At least one special character required');
  
  return { valid: errors.length === 0, errors };
}

module.exports = router;