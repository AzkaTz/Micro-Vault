const db = require('../config/db');
const jwt = require('jsonwebtoken');

async function authenticateToken(req, res, next) {

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // cek user masih aktif
    const result = await db.query(
      `SELECT id, role, biosafety_clearance, deleted_at
       FROM users
       WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    const dbUser = result.rows[0];

    if (dbUser.deleted_at !== null) {
      return res.status(403).json({ error: 'Account disabled' });
    }

    // attach user dari DB (bukan dari token)
    req.user = {
      userId: dbUser.id,
      role: dbUser.role,
      biosafety_clearance: dbUser.biosafety_clearance
    };

    next();

  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Check biosafety clearance level
function checkBiosafety(requiredLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.biosafety_clearance < requiredLevel) {
      return res.status(403).json({ 
        error: 'Insufficient biosafety clearance',
        required: requiredLevel,
        current: req.user.biosafety_clearance
      });
    }

    next();
  };
}

// Check role
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  checkBiosafety,
  checkRole
};