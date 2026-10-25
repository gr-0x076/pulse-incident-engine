const mongoose = require('mongoose');
const { Incident, User } = require('../../models');

class AnalyticsService {
  async getOverviewMetrics(orgId) {
    const orgObjectId = new mongoose.Types.ObjectId(orgId);

    // Multi-faceted aggregation pipeline executing in single database round-trip
    const [result] = await Incident.aggregate([
      { $match: { orgId: orgObjectId } },
      {
        $facet: {
          // 1. Overall counts & SLA metrics
          summary: [
            {
              $group: {
                _id: null,
                totalIncidents: { $sum: 1 },
                activeCount: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          '$status',
                          ['FIRED', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'],
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                resolvedCount: {
                  $sum: {
                    $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0],
                  },
                },
                slaBreachCount: {
                  $sum: {
                    $cond: [{ $ne: ['$slaBreachedAt', null] }, 1, 0],
                  },
                },
              },
            },
          ],

          // 2. MTTA (Mean Time to Acknowledge) in minutes via $project and $avg
          mtta: [
            {
              $match: {
                acknowledgedAt: { $ne: null },
              },
            },
            {
              $project: {
                acknowledgeDurationMinutes: {
                  $divide: [
                    { $subtract: ['$acknowledgedAt', '$createdAt'] },
                    60000,
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgMTTA: { $avg: '$acknowledgeDurationMinutes' },
                minMTTA: { $min: '$acknowledgeDurationMinutes' },
                maxMTTA: { $max: '$acknowledgeDurationMinutes' },
              },
            },
          ],

          // 3. MTTR (Mean Time to Resolve) in minutes
          mttr: [
            {
              $match: {
                resolvedAt: { $ne: null },
              },
            },
            {
              $project: {
                resolveDurationMinutes: {
                  $divide: [
                    { $subtract: ['$resolvedAt', '$createdAt'] },
                    60000,
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgMTTR: { $avg: '$resolveDurationMinutes' },
                minMTTR: { $min: '$resolveDurationMinutes' },
                maxMTTR: { $max: '$resolveDurationMinutes' },
              },
            },
          ],

          // 4. Severity Distribution
          severityBreakdown: [
            {
              $group: {
                _id: '$severity',
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // 5. Status Breakdown
          statusBreakdown: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],

          // 6. Root Cause Category Breakdown
          rootCauseBreakdown: [
            {
              $match: {
                'rootCause.category': { $ne: null },
              },
            },
            {
              $group: {
                _id: '$rootCause.category',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],

          // 7. Recent 14-day timeline volume
          timelineVolume: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                count: { $sum: 1 },
                p1Count: {
                  $sum: { $cond: [{ $eq: ['$severity', 'P1'] }, 1, 0] },
                },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 14 },
          ],
        },
      },
    ]);

    // Responder workload distribution
    const responderWorkload = await User.aggregate([
      { $match: { orgId: orgObjectId } },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          activeIncidentCount: 1,
        },
      },
      { $sort: { activeIncidentCount: -1 } },
    ]);

    const summary = result.summary[0] || {
      totalIncidents: 0,
      activeCount: 0,
      resolvedCount: 0,
      slaBreachCount: 0,
    };

    const slaBreachRate =
      summary.totalIncidents > 0
        ? Math.round((summary.slaBreachCount / summary.totalIncidents) * 100)
        : 0;

    return {
      summary: {
        ...summary,
        slaBreachRate,
      },
      mtta: {
        avgMinutes: Math.round(result.mtta[0]?.avgMTTA || 0),
        minMinutes: Math.round(result.mtta[0]?.minMTTA || 0),
        maxMinutes: Math.round(result.mtta[0]?.maxMTTA || 0),
      },
      mttr: {
        avgMinutes: Math.round(result.mttr[0]?.avgMTTR || 0),
        minMinutes: Math.round(result.mttr[0]?.minMTTR || 0),
        maxMinutes: Math.round(result.mttr[0]?.maxMTTR || 0),
      },
      severityBreakdown: result.severityBreakdown,
      statusBreakdown: result.statusBreakdown,
      rootCauseBreakdown: result.rootCauseBreakdown,
      timelineVolume: result.timelineVolume,
      responderWorkload,
    };
  }
}

module.exports = new AnalyticsService();
