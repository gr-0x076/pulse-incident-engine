const analyticsService = require('./analytics.service');
const asyncHandler = require('../../utils/asyncHandler');

class AnalyticsController {
  getOverview = asyncHandler(async (req, res) => {
    const metrics = await analyticsService.getOverviewMetrics(req.orgId);
    res.status(200).json({
      success: true,
      data: metrics,
    });
  });
}

module.exports = new AnalyticsController();
