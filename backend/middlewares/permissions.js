// backend/middlewares/permissions.js
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');

/**
 * Middleware to check user permissions
 * @param {string} requiredPermission - The permission required to access the route
 * @returns {Function} - Express middleware function
 */
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      // Assuming user roles and permissions are attached to req.user
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required');
      }

      // Check if user has the required permission
      if (!req.user.permissions?.includes(requiredPermission)) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkPermission };