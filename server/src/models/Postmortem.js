const mongoose = require('mongoose');
const { POSTMORTEM_STATUS, ROOT_CAUSE_CATEGORIES } = require('../config/constants');

const actionItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Action item description is required'],
      trim: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const postmortemSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Postmortem title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    summary: {
      type: String,
      default: '',
    },
    impact: {
      durationMinutes: { type: Number, default: 0 },
      affectedServices: [{ type: String, trim: true }],
    },
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
    actionItems: [actionItemSchema],
    lessonsLearned: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(POSTMORTEM_STATUS),
      default: POSTMORTEM_STATUS.DRAFT,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One postmortem per incident
postmortemSchema.index({ incidentId: 1 }, { unique: true });
postmortemSchema.index({ orgId: 1, status: 1 });

module.exports = mongoose.model('Postmortem', postmortemSchema);
