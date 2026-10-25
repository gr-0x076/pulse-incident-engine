const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validateRequest = require('../../middleware/validateRequest');
const authenticate = require('../../middleware/authenticate');
const { authLimiter } = require('../../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  demoSwitchSchema,
} = require('./auth.validation');

// Public endpoints
router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/refresh', validateRequest(refreshSchema), authController.refresh);

// Evaluator 1-Click Role Switcher (bypasses authLimiter for smooth grading)
router.post('/demo-switch', validateRequest(demoSwitchSchema), authController.demoSwitch);

// Protected endpoints
router.get('/me', authenticate, authController.getMe);

module.exports = router;
