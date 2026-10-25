const { Organization, User, Invite } = require('../../models');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

class OrgController {
  getTeam = asyncHandler(async (req, res) => {
    const [members, invites] = await Promise.all([
      User.find({ orgId: req.orgId }).sort({ role: 1, name: 1 }),
      Invite.find({ orgId: req.orgId, status: 'PENDING' }).sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: { members, invites },
    });
  });

  getSettings = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.orgId);
    if (!org) throw new AppError('Organization not found.', 404, 'ORG_NOT_FOUND');
    res.status(200).json({ success: true, data: org });
  });

  updateSettings = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.orgId);
    if (!org) throw new AppError('Organization not found.', 404, 'ORG_NOT_FOUND');

    if (req.body.name) org.name = req.body.name;
    if (req.body.sla) {
      org.settings.sla = { ...org.settings.sla, ...req.body.sla };
    }

    await org.save();
    res.status(200).json({
      success: true,
      data: org,
      message: 'Organization configuration updated successfully.',
    });
  });
}

module.exports = new OrgController();
