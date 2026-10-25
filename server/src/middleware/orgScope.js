const AppError = require('../utils/AppError');

/**
 * Enforces that accessed resources belong to the user's organization.
 */
const orgScope = (req, res, next) => {
  if (!req.orgId) {
    return next(new AppError('Organization context missing.', 400, 'ORG_CONTEXT_MISSING'));
  }

  // If a param or query specifies orgId, verify match
  const targetOrgId = req.params.orgId || req.query.orgId || req.body?.orgId;
  if (targetOrgId && targetOrgId.toString() !== req.orgId.toString()) {
    return next(new AppError('Cross-organization access prohibited.', 403, 'CROSS_ORG_FORBIDDEN'));
  }

  next();
};

module.exports = orgScope;
