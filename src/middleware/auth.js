const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../db/jsonDb');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers['x-auth-token'];
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token format.'
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = db.findById('users', decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User associated with this token no longer exists.'
      });
    }

    // Attach user without password
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      error: err.message
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }
  next();
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers['x-auth-token'];
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      if (token) {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = db.findById('users', decoded.id);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          req.user = userWithoutPassword;
        }
      }
    }
  } catch (err) {
    // Ignore error for optional authentication
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth
};
