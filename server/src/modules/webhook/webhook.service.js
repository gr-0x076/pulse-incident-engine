const crypto = require('crypto');
const { WebhookDelivery, Incident, TimelineEvent, Counter, Runbook } = require('../../models');
const { INCIDENT_STATUS, TIMELINE_EVENT_TYPES, WEBHOOK_STATUS } = require('../../config/constants');
const { emitToOrg } = require('../../socket');

class WebhookService {
  computeFingerprint(source, alertData) {
    const rawString = `${source}:${(alertData.service || '').toLowerCase()}:${(alertData.title || '').toLowerCase()}`;
    return crypto.createHash('sha256').update(rawString).digest('hex');
  }

  async processAlertWebhook({ orgId, source, payload }) {
    const title = payload.title || payload.alert_name || payload.summary || 'Unspecified External Alert';
    const description = payload.description || payload.message || JSON.stringify(payload);
    const severity = payload.severity || 'P2';
    const service = (payload.service || payload.app || 'system').toLowerCase();

    const normalizedAlert = { title, description, severity, service, source };
    const fingerprint = this.computeFingerprint(source, normalizedAlert);

    // Check for open/active incident with identical fingerprint
    const activeIncident = await Incident.findOne({
      orgId,
      alertFingerprint: fingerprint,
      status: {
        $in: [
          INCIDENT_STATUS.FIRED,
          INCIDENT_STATUS.ACKNOWLEDGED,
          INCIDENT_STATUS.INVESTIGATING,
          INCIDENT_STATUS.ESCALATED,
        ],
      },
    });

    if (activeIncident) {
      // Deduplicate into existing active incident
      const delivery = await WebhookDelivery.create({
        orgId,
        source,
        fingerprint,
        rawPayload: payload,
        normalizedAlert,
        status: WEBHOOK_STATUS.DEDUPLICATED,
        deduplicatedToIncidentId: activeIncident._id,
        processedAt: new Date(),
      });

      // Append deduplication notice to timeline
      const timelineEvent = await TimelineEvent.create({
        incidentId: activeIncident._id,
        orgId,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: null,
        actorName: 'Pulse Alert Ingest Engine',
        content: `[Alert Ingest Deduplication] Repeat alert received from [${source.toUpperCase()}]. Grouped into INC-${String(activeIncident.incidentNumber).padStart(5, '0')} (Fingerprint: ${fingerprint.slice(0, 8)}...).`,
      });

      emitToOrg(orgId, 'webhook:deduplicated', {
        incidentId: activeIncident._id,
        deliveryId: delivery._id,
        source,
      });

      return {
        status: WEBHOOK_STATUS.DEDUPLICATED,
        incident: activeIncident,
        deliveryId: delivery._id,
        fingerprint,
        message: `Alert deduplicated into active incident INC-${activeIncident.incidentNumber}.`,
      };
    }

    // Otherwise: Create new incident with this fingerprint
    const incidentNumber = await Counter.getNextSequence(orgId, 'incidentNumber');

    // Scored runbook template auto-match
    const matchingRunbook = await Runbook.findMatchingRunbook(orgId, title, severity);
    let runbookProgress = [];
    let runbookId = null;

    if (matchingRunbook) {
      runbookId = matchingRunbook._id;
      runbookProgress = matchingRunbook.steps.map((step) => ({
        stepIndex: step.order,
        status: 'PENDING',
        verificationInput: '',
      }));
    }

    // Default creator: find first admin
    const incident = await Incident.create({
      orgId,
      incidentNumber,
      title,
      description,
      severity,
      status: INCIDENT_STATUS.FIRED,
      createdBy: payload.userId || (await require('../../models').User.findOne({ orgId }))._id,
      alertFingerprint: fingerprint,
      runbookId,
      runbookProgress,
      version: 0,
    });

    const delivery = await WebhookDelivery.create({
      orgId,
      source,
      fingerprint,
      rawPayload: payload,
      normalizedAlert,
      status: WEBHOOK_STATUS.PROCESSED,
      incidentId: incident._id,
      processedAt: new Date(),
    });

    await TimelineEvent.create({
      incidentId: incident._id,
      orgId,
      type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
      actor: null,
      actorName: `${source.toUpperCase()} Webhook`,
      content: `Incident INC-${String(incidentNumber).padStart(5, '0')} created automatically via ${source.toUpperCase()} alert ingestion. Severity [${severity}].`,
      metadata: {
        toStatus: INCIDENT_STATUS.FIRED,
        newSeverity: severity,
      },
    });

    if (matchingRunbook) {
      await TimelineEvent.create({
        incidentId: incident._id,
        orgId,
        type: TIMELINE_EVENT_TYPES.RUNBOOK_ATTACHED,
        actor: null,
        actorName: 'Pulse Playbook Engine',
        content: `Auto-attached runbook SOP: "${matchingRunbook.name}".`,
      });
    }

    const populated = await Incident.findById(incident._id)
      .populate('createdBy', 'name email')
      .populate('runbookId');

    emitToOrg(orgId, 'incident:created', populated);

    return {
      status: WEBHOOK_STATUS.PROCESSED,
      incident: populated,
      deliveryId: delivery._id,
      fingerprint,
      message: `New incident INC-${incidentNumber} declared via webhook.`,
    };
  }

  /**
   * Pre-configured Chaos Outage Simulator presets
   */
  async simulateOutage(orgId, presetType) {
    const presets = {
      API_GATEWAY_5XX: {
        source: 'datadog',
        payload: {
          title: 'API Gateway returning 503 — 5xx rate at 18.4%',
          service: 'api-gateway',
          severity: 'P1',
          description: 'High rate of HTTP 503 Service Unavailable errors on checkout API cluster. Upstream response timeout threshold exceeded.',
        },
      },
      DB_POOL_EXHAUSTION: {
        source: 'prometheus',
        payload: {
          title: 'Database connection pool exhaustion — primary replica',
          service: 'database',
          severity: 'P1',
          description: 'PostgreSQL active connection count > 98% capacity. High query queue latency detected on pg_stat_activity.',
        },
      },
      PAYMENT_TIMEOUT: {
        source: 'stripe',
        payload: {
          title: 'Stripe webhook timeout — payment confirmation latency > 15s',
          service: 'payments',
          severity: 'P2',
          description: 'Stripe webhook deliveries failing to receive 200 OK within 15000ms. Checkout flow degrading.',
        },
      },
      ALERT_STORM_DUPLICATES: {
        source: 'datadog',
        payload: {
          title: 'Kubernetes node memory pressure — us-east-prod-worker-04',
          service: 'kubernetes',
          severity: 'P2',
          description: 'Node memory usage exceeded 92%. Kubelet reporting eviction threshold warning.',
        },
      },
    };

    const config = presets[presetType] || presets.API_GATEWAY_5XX;
    return await this.processAlertWebhook({
      orgId,
      source: config.source,
      payload: config.payload,
    });
  }
}

module.exports = new WebhookService();
