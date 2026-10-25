const express = require('express');
const router = express.Router();
const orgController = require('./org.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { ROLES } = require('../../config/constants');

router.use(authenticate);

router.get('/team', orgController.getTeam);
router.get('/settings', orgController.getSettings);
router.patch('/settings', authorize(ROLES.ADMIN), orgController.updateSettings);

module.exports = router;
