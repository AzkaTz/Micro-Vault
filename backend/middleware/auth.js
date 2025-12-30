const jwt = require('jsonwebtoken');

// Verify JWT token
function authenticateToken(req, res, next) {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Verify token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Attach user info to request
    req.user = user;
    next();
  });
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