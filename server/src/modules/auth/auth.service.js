const { User, Organization } = require('../../models');
const { ROLES } = require('../../config/constants');
const AppError = require('../../utils/AppError');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../../utils/generateToken');

class AuthService {
  async register({ name, email, password, orgName, orgSlug }) {
    const existingOrg = await Organization.findOne({ slug: orgSlug.toLowerCase() });
    if (existingOrg) {
      throw new AppError('An organization with this slug already exists.', 409, 'ORG_SLUG_EXISTS');
    }

    const org = await Organization.create({
      name: orgName,
      slug: orgSlug.toLowerCase(),
    });

    const user = await User.create({
      orgId: org._id,
      name,
      email: email.toLowerCase(),
      passwordHash: password, // Pre-save hook hashes this
      role: ROLES.ADMIN, // First creator is Admin
    });

    const payload = { userId: user._id, orgId: org._id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: org._id,
      },
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .populate('orgId', 'name slug settings');

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const payload = { userId: user._id, orgId: user.orgId._id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId._id,
      },
      organization: {
        id: user.orgId._id,
        name: user.orgId.name,
        slug: user.orgId.slug,
        settings: user.orgId.settings,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  async refreshToken(token) {
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token.', 401, 'AUTH_REFRESH_TOKEN_INVALID');
    }

    const user = await User.findById(decoded.userId).populate('orgId', 'name slug settings');
    if (!user) {
      throw new AppError('User not found.', 401, 'AUTH_USER_NOT_FOUND');
    }

    const payload = { userId: user._id, orgId: user.orgId._id, role: user.role };
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    return {
      tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    };
  }

  async getMe(userId) {
    const user = await User.findById(userId).populate('orgId', 'name slug settings');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      activeIncidentCount: user.activeIncidentCount,
      organization: {
        id: user.orgId._id,
        name: user.orgId.name,
        slug: user.orgId.slug,
        settings: user.orgId.settings,
      },
    };
  }

  /**
   * 1-Click Evaluator Switcher: returns credentials for specified role in default demo org
   */
  async demoSwitch(targetRole) {
    if (!Object.values(ROLES).includes(targetRole)) {
      throw new AppError(`Invalid target role: ${targetRole}`, 400, 'INVALID_ROLE');
    }

    // Role mapping to default demo seed users
    const roleEmailMap = {
      [ROLES.ADMIN]: 'admin@acme.dev',
      [ROLES.INCIDENT_COMMANDER]: 'commander@acme.dev',
      [ROLES.RESPONDER]: 'responder@acme.dev',
      [ROLES.VIEWER]: 'viewer@acme.dev',
    };

    const targetEmail = roleEmailMap[targetRole];
    let user = await User.findOne({ email: targetEmail }).populate('orgId', 'name slug settings');

    if (!user) {
      // Fallback: find any user with that role
      user = await User.findOne({ role: targetRole }).populate('orgId', 'name slug settings');
    }

    if (!user) {
      throw new AppError(`No demo user found for role ${targetRole}. Please run seed first.`, 404, 'DEMO_USER_NOT_FOUND');
    }

    const payload = { userId: user._id, orgId: user.orgId._id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId._id,
      },
      organization: {
        id: user.orgId._id,
        name: user.orgId.name,
        slug: user.orgId.slug,
        settings: user.orgId.settings,
      },
      tokens: { accessToken, refreshToken },
    };
  }
}

module.exports = new AuthService();
