const webhookService = require('./webhook.service');
const asyncHandler = require('../../utils/asyncHandler');
const { Organization } = require('../../models');
const AppError = require('../../utils/AppError');

class WebhookController {
  handleAlert = asyncHandler(async (req, res) => {
    // Ingest may come with orgId in header/query/body or use default seeded org
    let orgId = req.headers['x-org-id'] || req.query.orgId || req.body.orgId;
    if (!orgId) {
      const defaultOrg = await Organization.findOne();
      if (!defaultOrg) {
        throw new AppError('No organization found to route webhook.', 400, 'ORG_NOT_FOUND');
      }
      orgId = defaultOrg._id;
    }

    const source = req.params.source || req.body.source || 'custom';
    const result = await webhookService.processAlertWebhook({
      orgId,
      source,
      payload: req.body,
    });

    res.status(result.status === 'PROCESSED' ? 201 : 200).json({
      success: true,
      data: result,
    });
  });

  simulateChaos = asyncHandler(async (req, res) => {
    const orgId = req.orgId || req.body.orgId;
    const { preset = 'API_GATEWAY_5XX' } = req.body;

    const result = await webhookService.simulateOutage(orgId, preset);
    res.status(200).json({
      success: true,
      data: result,
      message: `Chaos Outage simulation [${preset}] executed successfully.`,
    });
  });
}

module.exports = new WebhookController();
