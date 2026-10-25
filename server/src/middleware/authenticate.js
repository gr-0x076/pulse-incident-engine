const { verifyAccessToken } = require('../utils/generateToken');
const AppError = require('../utils/AppError');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Missing or invalid Authorization header.', 401, 'AUTH_REQUIRED'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new AppError('Authentication token missing.', 401, 'AUTH_TOKEN_MISSING'));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Authentication token has expired.', 401, 'AUTH_TOKEN_EXPIRED'));
      }
      return next(new AppError('Invalid authentication token.', 401, 'AUTH_INVALID_TOKEN'));
    }

    const user = await User.findById(decoded.userId).populate('orgId', 'name slug settings');
    if (!user) {
      return next(new AppError('User belonging to this token no longer exists.', 401, 'AUTH_USER_NOT_FOUND'));
    }

    req.user = user;
    req.orgId = user.orgId._id || user.orgId;
    req.org = user.orgId;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
