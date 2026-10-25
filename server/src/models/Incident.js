const mongoose = require('mongoose');
const { INCIDENT_STATUS, SEVERITY, ROOT_CAUSE_CATEGORIES } = require('../config/constants');

const incidentSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    incidentNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Incident title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    severity: {
      type: String,
      enum: Object.values(SEVERITY),
      required: [true, 'Severity is required'],
    },
    status: {
      type: String,
      enum: Object.values(INCIDENT_STATUS),
      default: INCIDENT_STATUS.FIRED,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    commander: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    responders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    rootCause: {
      category: {
        type: String,
        enum: [...ROOT_CAUSE_CATEGORIES, null],
        default: null,
      },
      description: {
        type: String,
        default: '',
      },
    },
    mitigationSummary: {
      type: String,
      default: '',
    },
    postmortemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Postmortem',
      default: null,
    },
    // Linked runbook (auto-attached or manually attached)
    runbookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Runbook',
      default: null,
    },
    // Per-incident runbook step progress
    runbookProgress: [{
      stepIndex: { type: Number, required: true },
      status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'SKIPPED'],
        default: 'PENDING',
      },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      completedAt: Date,
      verificationInput: String,
    }],
    // Webhook fingerprint for deduplication
    alertFingerprint: {
      type: String,
      default: null,
      index: true,
    },
    // SLA tracking
    slaBreachedAt: { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },
    mitigatedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    // Optimistic concurrency control
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimized queries
incidentSchema.index({ orgId: 1, status: 1, severity: 1 });    // Dashboard filtering
incidentSchema.index({ orgId: 1, incidentNumber: 1 }, { unique: true }); // Lookup by INC-XXXXX
incidentSchema.index({ orgId: 1, createdAt: -1 });              // Recent incidents
incidentSchema.index({ responders: 1 });                         // "My incidents" query
incidentSchema.index({ orgId: 1, alertFingerprint: 1 });         // Webhook dedup
incidentSchema.index({ status: 1, createdAt: 1 });               // SLA monitor query

// Pre-save: increment version on every update
incidentSchema.pre('save', function (next) {
  if (!this.isNew) {
    this.version += 1;
  }
  next();
});

module.exports = mongoose.model('Incident', incidentSchema);
