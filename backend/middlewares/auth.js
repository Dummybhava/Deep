/**
 * Authentication middleware for Smart City Application
 * Verifies JWT tokens and attaches user data to request object
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token') || req.query.token;

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Verify token structure
    if (!decoded.id || !decoded.roles) {
      throw new Error('Invalid token structure');
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check specific roles
module.exports.checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.userDetails) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const hasRole = roles.some(role => req.userDetails.roles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ message: 'Access denied. Required role not found' });
    }
    
    next();
  };
};
