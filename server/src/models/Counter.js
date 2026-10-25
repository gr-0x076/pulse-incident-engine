const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

counterSchema.index({ orgId: 1, name: 1 }, { unique: true });

/**
 * Atomically increment and return the next sequence number
 * @param {ObjectId} orgId - Organization ID
 * @param {string} name - Counter name (e.g., 'incidentNumber')
 * @returns {Promise<number>} The next sequence number
 */
counterSchema.statics.getNextSequence = async function (orgId, name) {
  const counter = await this.findOneAndUpdate(
    { orgId, name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
