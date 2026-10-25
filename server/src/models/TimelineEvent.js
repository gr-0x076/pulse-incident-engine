const mongoose = require('mongoose');
const { TIMELINE_EVENT_TYPES } = require('../config/constants');

const timelineEventSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(TIMELINE_EVENT_TYPES),
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for SYSTEM events
    },
    actorName: {
      type: String,
      default: 'System', // Denormalized for display without joins
    },
    content: {
      type: String,
      required: [true, 'Timeline event content is required'],
      maxlength: [2000, 'Content cannot exceed 2000 characters'],
    },
    metadata: {
      fromStatus: String,
      toStatus: String,
      assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      previousSeverity: String,
      newSeverity: String,
      runbookStepIndex: Number,
      runbookStepTitle: String,
      runbookStepStatus: String,
      escalationReason: String,
    },
  },
  {
    timestamps: true,
  }
);

// Primary query: timeline for an incident, sorted by creation time
timelineEventSchema.index({ incidentId: 1, createdAt: 1 });
timelineEventSchema.index({ orgId: 1, createdAt: -1 }); // Org-wide activity feed

module.exports = mongoose.model('TimelineEvent', timelineEventSchema);
