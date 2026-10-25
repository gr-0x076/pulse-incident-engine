const express = require('express');
const router = express.Router();
const inviteController = require('./invite.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { ROLES } = require('../../config/constants');

// Public invite routes
router.get('/:token', inviteController.getInviteByToken);
router.post('/accept', inviteController.acceptInvite);

// Authenticated invite management
router.post('/', authenticate, authorize(ROLES.ADMIN), inviteController.createInvite);

module.exports = router;
