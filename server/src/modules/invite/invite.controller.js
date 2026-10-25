const { Invite, User, Organization } = require('../../models');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const { signAccessToken, signRefreshToken } = require('../../utils/generateToken');

class InviteController {
  createInvite = asyncHandler(async (req, res) => {
    const { email, role } = req.body;
    const orgId = req.orgId;

    const existingUser = await User.findOne({ orgId, email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('User is already a member of this organization.', 409, 'USER_ALREADY_EXISTS');
    }

    const existingInvite = await Invite.findOne({ orgId, email: email.toLowerCase(), status: 'PENDING' });
    if (existingInvite) {
      throw new AppError('An active invitation is already pending for this email address.', 409, 'INVITE_PENDING');
    }

    const invite = await Invite.create({
      orgId,
      email: email.toLowerCase(),
      role,
      invitedBy: req.user._id,
    });

    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${invite.token}`;

    res.status(201).json({
      success: true,
      data: {
        invite,
        inviteUrl,
      },
      message: 'Invitation link generated successfully.',
    });
  });

  getInviteByToken = asyncHandler(async (req, res) => {
    const invite = await Invite.findOne({ token: req.params.token }).populate('orgId', 'name slug');
    if (!invite) {
      throw new AppError('Invitation token not found.', 404, 'INVITE_NOT_FOUND');
    }
    if (invite.status !== 'PENDING') {
      throw new AppError(`This invitation has already been ${invite.status.toLowerCase()}.`, 409, 'INVITE_NOT_PENDING');
    }
    if (invite.isExpired) {
      throw new AppError('This invitation has expired.', 410, 'INVITE_EXPIRED');
    }

    res.status(200).json({ success: true, data: invite });
  });

  acceptInvite = asyncHandler(async (req, res) => {
    const { token, name, password } = req.body;
    const invite = await Invite.findOne({ token });

    if (!invite) throw new AppError('Invitation not found.', 404, 'INVITE_NOT_FOUND');
    if (invite.status !== 'PENDING') throw new AppError('Invitation is no longer valid.', 409, 'INVITE_NOT_PENDING');
    if (invite.isExpired) throw new AppError('Invitation has expired.', 410, 'INVITE_EXPIRED');

    const user = await User.create({
      orgId: invite.orgId,
      name,
      email: invite.email,
      passwordHash: password,
      role: invite.role,
    });

    invite.status = 'ACCEPTED';
    await invite.save();

    const payload = { userId: user._id, orgId: user.orgId, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.status(201).json({
      success: true,
      data: {
        user,
        tokens: { accessToken, refreshToken },
      },
      message: 'Account created and invitation accepted successfully.',
    });
  });
}

module.exports = new InviteController();
