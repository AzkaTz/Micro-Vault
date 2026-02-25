import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import db from "../config/db.js";
import { authenticateToken, checkRole } from "../middleware/auth.js";

const router = express.Router();
// POST /api/auth/register
// POST /api/auth/register (DISABLED)
router.post('/register', async (req, res) => {
  console.log("DB URL REGISTER:", process.env.DATABASE_URL);
  try {
    // 1. Cek apakah admin sudah ada
    const adminCheck = await db.query(
      `SELECT COUNT(*) FROM users 
       WHERE role='admin' AND deleted_at IS NULL`
    );

    const adminCount = parseInt(adminCheck.rows[0].count);

    // 2. Jika sudah ada admin → blokir register
    if (adminCount > 0) {
      return res.status(403).json({
        error: 'System locked. Admin already exists. Contact administrator.'
      });
    }

    // 3. Jika BELUM ada admin → hanya boleh buat ADMIN
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        error: 'email, password, full_name required'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, biosafety_clearance)
       VALUES ($1,$2,$3,'admin',4)
       RETURNING id,email,role`,
      [email, hash, full_name]
    );

    res.status(201).json({
      message: 'Bootstrap admin created',
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bootstrap failed' });
  }
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
  console.log("DB URL LOGIN:", process.env.DATABASE_URL);
  console.log("=== LOGIN DEBUG START ===");
  console.log("EMAIL INPUT:", email);

  try {
    const result = await db.query(
      `SELECT id, email, password_hash, full_name, role, biosafety_clearance, deleted_at
       FROM users
       WHERE email = $1
       AND deleted_at IS NULL`,
      [email]
    );

    console.log("DB RESULT:", result.rows);

    if (result.rows.length === 0) {
      console.log("USER NOT FOUND IN THIS DATABASE");
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    console.log("HASH FROM DB:", user.password_hash);
    console.log("DELETED_AT:", user.deleted_at);

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log("COMPARE RESULT:", isValidPassword);

    if (!isValidPassword) {
      console.log("PASSWORD MISMATCH");
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log("JWT_SECRET EXISTS?:", !!process.env.JWT_SECRET);

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

    console.log("JWT GENERATED SUCCESS");

    await db.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['USER_LOGIN', 'user', user.id, user.id, req.ip, JSON.stringify({ email })]
    );

    console.log("=== LOGIN SUCCESS ===");

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
    console.error('LOGIN ERROR:', error);
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

export default router;