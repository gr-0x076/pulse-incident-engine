const mongoose = require('mongoose');
const crypto = require('crypto');
const { INVITE_STATUS, ROLES } = require('../config/constants');

const inviteSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: [true, 'Role is required'],
    },
    token: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    status: {
      type: String,
      enum: Object.values(INVITE_STATUS),
      default: INVITE_STATUS.PENDING,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
  }
);

inviteSchema.index({ orgId: 1, email: 1 }, { unique: true });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

// Virtual: check if invite is expired
inviteSchema.virtual('isExpired').get(function () {
  return this.expiresAt < new Date();
});

module.exports = mongoose.model('Invite', inviteSchema);
