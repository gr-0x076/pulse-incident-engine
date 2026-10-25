const { Incident, TimelineEvent, Organization } = require('../models');
const { INCIDENT_STATUS, TIMELINE_EVENT_TYPES, SLA_DEFAULTS } = require('../config/constants');
const { emitToOrg, emitToIncident } = require('../socket');

let monitorInterval = null;
const TICK_INTERVAL_MS = 5000; // 5-second deterministic heartbeat

/**
 * Checks all unacknowledged FIRED incidents across organizations.
 * If an incident breaches its SLA window, it is automatically transitioned to ESCALATED.
 */
const checkSLABreaches = async () => {
  try {
    const firedIncidents = await Incident.find({
      status: INCIDENT_STATUS.FIRED,
    }).populate('orgId', 'name settings');

    if (!firedIncidents || firedIncidents.length === 0) {
      return;
    }

    const now = new Date();

    for (const incident of firedIncidents) {
      const org = incident.orgId;
      const orgSlaSettings = org?.settings?.sla;
      const severity = incident.severity;

      // Determine SLA window in minutes
      const slaMinutes =
        orgSlaSettings?.[`${severity.toLowerCase()}AcknowledgeMinutes`] ||
        SLA_DEFAULTS[severity] ||
        15;

      const slaWindowMs = slaMinutes * 60 * 1000;
      const ageMs = now.getTime() - new Date(incident.createdAt).getTime();

      if (ageMs > slaWindowMs) {
        // SLA Breached! Execute autonomous escalation
        incident.status = INCIDENT_STATUS.ESCALATED;
        incident.slaBreachedAt = now;
        await incident.save();

        const breachText = `[SLA BREACH ALERT] Incident unacknowledged for >${slaMinutes}m (Severity: ${severity}). Autonomous escalation protocol activated by Pulse SLA Sentinel.`;

        const timelineEvent = await TimelineEvent.create({
          incidentId: incident._id,
          orgId: org._id || incident.orgId,
          type: TIMELINE_EVENT_TYPES.ESCALATION,
          actor: null,
          actorName: 'Pulse SLA Sentinel',
          content: breachText,
          metadata: {
            fromStatus: INCIDENT_STATUS.FIRED,
            toStatus: INCIDENT_STATUS.ESCALATED,
            escalationReason: `SLA window breached (${slaMinutes} minutes)`,
          },
        });

        const populated = await Incident.findById(incident._id)
          .populate('commander', 'name email role')
          .populate('responders', 'name email role')
          .populate('createdBy', 'name email')
          .populate('runbookId');

        emitToOrg(incident.orgId._id || incident.orgId, 'incident:escalated', {
          incident: populated,
          breachMinutes: Math.floor(ageMs / 60000),
          slaLimitMinutes: slaMinutes,
        });

        emitToOrg(incident.orgId._id || incident.orgId, 'incident:updated', populated);
        emitToIncident(incident._id.toString(), 'incident:transitioned', {
          incident: populated,
          timelineEvent,
        });

        console.log(`⚠️ SLA Sentinel: Escalated incident INC-${incident.incidentNumber} (${severity}) - breached by ${Math.floor((ageMs - slaWindowMs) / 1000)}s`);
      }
    }
  } catch (error) {
    console.error('Error in SLA Sentinel worker heartbeat:', error);
  }
};

const startSLAMonitor = () => {
  if (monitorInterval) return;
  console.log(`⏱️ Pulse SLA Sentinel activated (checking every ${TICK_INTERVAL_MS / 1000}s)`);
  monitorInterval = setInterval(checkSLABreaches, TICK_INTERVAL_MS);
};

const stopSLAMonitor = () => {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('⏱️ Pulse SLA Sentinel stopped.');
  }
};

module.exports = {
  startSLAMonitor,
  stopSLAMonitor,
  checkSLABreaches,
};
