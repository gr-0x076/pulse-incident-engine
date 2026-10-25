const mongoose = require('mongoose');
const { WEBHOOK_STATUS } = require('../config/constants');

const webhookDeliverySchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    // Source system identifier
    source: {
      type: String,
      required: [true, 'Webhook source is required'],
      enum: ['prometheus', 'datadog', 'pagerduty', 'grafana', 'stripe', 'custom', 'simulator'],
      trim: true,
    },
    // Fingerprint for deduplication (hash of normalized payload)
    fingerprint: {
      type: String,
      required: true,
    },
    // Raw payload (stored for audit trail)
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    // Normalized alert data extracted from raw payload
    normalizedAlert: {
      title: String,
      description: String,
      severity: String,
      service: String,
      source: String,
    },
    // Processing status
    status: {
      type: String,
      enum: Object.values(WEBHOOK_STATUS),
      default: WEBHOOK_STATUS.RECEIVED,
    },
    // If this delivery created a new incident
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },
    // If deduplicated, reference to the existing incident
    deduplicatedToIncidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },
    // Processing metadata
    processedAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for deduplication lookups
webhookDeliverySchema.index({ orgId: 1, fingerprint: 1, createdAt: -1 });
webhookDeliverySchema.index({ orgId: 1, status: 1 });
webhookDeliverySchema.index({ orgId: 1, createdAt: -1 });

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
