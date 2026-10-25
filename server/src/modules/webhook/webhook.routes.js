const express = require('express');
const router = express.Router();
const webhookController = require('./webhook.controller');
const authenticate = require('../../middleware/authenticate');

// Public webhook alert ingression endpoint (Datadog, Prometheus, Stripe, etc.)
router.post('/alerts', webhookController.handleAlert);
router.post('/alerts/:source', webhookController.handleAlert);

// Authenticated Evaluator Chaos Simulator
router.post('/simulate', authenticate, webhookController.simulateChaos);

module.exports = router;
