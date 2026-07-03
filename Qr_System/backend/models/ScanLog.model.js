const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    scanType: {
      type: String,
      enum: ['ENTRY', 'EXIT'],
      required: true,
    },
    breakType: {
      type: String,
      enum: ['SHORT', 'LUNCH', 'BREAKFAST', 'INITIAL'],
      required: true,
    },
    violationFlag: {
      type: Boolean,
      default: false,
    },
    violationReason: {
      type: String,
    },
  },
  // Ensure we don't automatically override manual timestamps during testing etc
  { timestamps: false }
);

module.exports = mongoose.model('ScanLog', scanLogSchema);
