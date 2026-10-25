const AppError = require('../utils/AppError');

/**
 * RBAC authorization middleware factory
 * @param  {...string} allowedRoles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before authorization.', 401, 'AUTH_REQUIRED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: Role '${req.user.role}' is not authorized for this operation. Required: [${allowedRoles.join(', ')}]`,
          403,
          'AUTHZ_INSUFFICIENT_ROLE',
          {
            userRole: req.user.role,
            requiredRoles: allowedRoles,
          }
        )
      );
    }

    next();
  };
};

module.exports = authorize;
