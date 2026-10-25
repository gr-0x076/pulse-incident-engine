const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Organization and administrator account created successfully.',
    });
  });

  login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Authentication successful.',
    });
  });

  refresh = asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.body.refreshToken);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Tokens refreshed successfully.',
    });
  });

  getMe = asyncHandler(async (req, res) => {
    const result = await authService.getMe(req.user._id);
    res.status(200).json({
      success: true,
      data: result,
    });
  });

  demoSwitch = asyncHandler(async (req, res) => {
    const result = await authService.demoSwitch(req.body.role);
    res.status(200).json({
      success: true,
      data: result,
      message: `Switched session to role [${req.body.role}] successfully.`,
    });
  });
}

module.exports = new AuthController();
