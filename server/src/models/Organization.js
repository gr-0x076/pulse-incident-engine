const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    settings: {
      sla: {
        p1AcknowledgeMinutes: { type: Number, default: 5 },
        p2AcknowledgeMinutes: { type: Number, default: 15 },
        p3AcknowledgeMinutes: { type: Number, default: 60 },
        p4AcknowledgeMinutes: { type: Number, default: 240 },
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Organization', organizationSchema);
