const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);
router.get('/overview', analyticsController.getOverview);

module.exports = router;
