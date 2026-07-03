const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      required: [true, 'Please add a team ID'],
    },
    teamName: {
      type: String,
      required: [true, 'Please add a team Name'],
    },
    name: {
      type: String,
      required: [true, 'Please add participant name'],
    },
    rollNumber: {
      type: String,
      required: [true, 'Please add roll number'],
    },
    mobile: {
      type: String,
      required: [true, 'Please add mobile number'],
    },
    hostel: {
      type: String,
    },
    qrId: {
      type: String,
      required: [true, 'QR ID is required'],
      unique: true,
      index: true,
    },
    isInsideVenue: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Participant', participantSchema);
