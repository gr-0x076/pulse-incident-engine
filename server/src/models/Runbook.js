const mongoose = require('mongoose');
const { SEVERITY } = require('../config/constants');

const runbookStepSchema = new mongoose.Schema(
  {
    order: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Step title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    // Optional terminal command block (copyable in UI)
    command: {
      type: String,
      default: null,
    },
    // Whether this step requires verification input from the responder
    requiresVerification: {
      type: Boolean,
      default: false,
    },
    verificationPrompt: {
      type: String,
      default: '',
    },
    // Whether this step can be skipped
    isOptional: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const runbookSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Runbook name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
    },
    // Auto-attach matching criteria
    matchCriteria: {
      // Match by service name (from incident title or tags)
      services: [{
        type: String,
        trim: true,
        lowercase: true,
      }],
      // Match by severity level
      severities: [{
        type: String,
        enum: Object.values(SEVERITY),
      }],
      // Match by keyword in incident title
      keywords: [{
        type: String,
        trim: true,
        lowercase: true,
      }],
    },
    steps: [runbookStepSchema],
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

runbookSchema.index({ orgId: 1, isActive: 1 });
runbookSchema.index({ 'matchCriteria.services': 1 });
runbookSchema.index({ 'matchCriteria.keywords': 1 });

/**
 * Find the best matching runbook for an incident
 * @param {ObjectId} orgId
 * @param {string} title - Incident title
 * @param {string} severity - Incident severity
 * @returns {Promise<Document|null>}
 */
runbookSchema.statics.findMatchingRunbook = async function (orgId, title, severity) {
  const titleLower = title.toLowerCase();
  const activeRunbooks = await this.find({ orgId, isActive: true });
  
  let bestMatch = null;
  let bestScore = 0;

  for (const runbook of activeRunbooks) {
    let score = 0;

    // Keyword match (highest weight)
    for (const keyword of runbook.matchCriteria.keywords) {
      if (titleLower.includes(keyword)) {
        score += 10;
      }
    }

    // Service match
    for (const service of runbook.matchCriteria.services) {
      if (titleLower.includes(service)) {
        score += 5;
      }
    }

    // Severity match
    if (runbook.matchCriteria.severities.includes(severity)) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = runbook;
    }
  }

  return bestMatch;
};

module.exports = mongoose.model('Runbook', runbookSchema);
