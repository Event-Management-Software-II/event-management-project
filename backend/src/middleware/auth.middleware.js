const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Auth rejected: missing token', {
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Auth rejected: invalid/expired token', {
        path: req.path,
        error: err.message,
      });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = user.id;
    req.userRole = user.role;
    req.userEmail = user.email;
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Admin auth rejected: missing token', {
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Admin auth rejected: invalid/expired token', {
        path: req.path,
        error: err.message,
      });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    if (user.role !== 'admin') {
      logger.warn('Admin auth rejected: insufficient role', {
        userId: user.id,
        role: user.role,
        path: req.path,
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.userId = user.id;
    req.userRole = user.role;
    req.userEmail = user.email;
    next();
  });
};

module.exports = { authenticateToken, authenticateAdmin };
