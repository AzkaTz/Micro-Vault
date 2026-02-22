const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticateToken, checkRole } = require('../middleware/auth');

// POST /api/auth/register
// POST /api/auth/register (DISABLED)
router.post('/register', (req, res) => {
  return res.status(403).json({
    error: 'Self registration is disabled. Contact administrator.'
  });
});
router.post(
  '/admin/create-user',
  authenticateToken,
  checkRole('admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 12 }),
    body('full_name').notEmpty(),
    body('role').isIn(['admin','researcher','technician']),
    body('biosafety_clearance').optional().isInt({ min:1, max:4 })
  ],
  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, role, biosafety_clearance } = req.body;

    try {

      // cek user sudah ada
      const existing = await db.query(
        `SELECT id FROM users 
        WHERE email=$1 
        AND deleted_at IS NULL`,
        [email]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // hash password
      const hash = await bcrypt.hash(password, 10);

      const result = await db.query(
        `INSERT INTO users 
         (email,password_hash,full_name,role,biosafety_clearance)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id,email,role`,
        [email, hash, full_name, role, biosafety_clearance || null]
      );

      await db.query(
        `INSERT INTO audit_logs(action,resource_type,resource_id,user_id)
         VALUES($1,$2,$3,$4)`,
        ['USER_CREATED','user',result.rows[0].id,req.user.userId]
      );

      res.status(201).json({
        message: 'User created',
        user: result.rows[0]
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Create user failed' });
    }
  }
);
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
      `SELECT id, email, password_hash, full_name, role, biosafety_clearance
      FROM users
      WHERE email = $1
      AND deleted_at IS NULL`,
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

// DELETE USER (soft delete)
router.delete(
  '/admin/users/:id',
  authenticateToken,
  checkRole('admin'),
  async (req, res) => {

    const { id } = req.params;

    try {

      // jangan biarkan admin hapus dirinya sendiri
      if (req.user.userId === parseInt(id)) {
        return res.status(400).json({
          error: 'You cannot delete your own account'
        });
      }

      const result = await db.query(
        `UPDATE users 
         SET deleted_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id, email`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Audit log
      await db.query(
        `INSERT INTO audit_logs 
         (action, resource_type, resource_id, user_id)
         VALUES ($1, $2, $3, $4)`,
        ['USER_DELETED', 'user', id, req.user.userId]
      );

      res.json({
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Delete failed' });
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