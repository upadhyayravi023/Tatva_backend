const Participant = require('../models/Participant.model');
const ScanLog = require('../models/ScanLog.model');
const AppError = require('../utils/AppError');

/**
 * Register a new participant
 * @param {Object} data 
 * @returns {Object} participant document
 */
exports.registerParticipant = async (data) => {
  // Check if QR already exists
  const existing = await Participant.findOne({ qrId: data.qrId });
  if (existing) {
    throw new AppError('Participant with this QR Code is already registered', 400);
  }

  const participant = await Participant.create(data);
  return participant;
};

/**
 * Get participant status and history
 * @param {string} qrId 
 * @returns {Object} 
 */
exports.getParticipantStatus = async (qrId) => {
  const participant = await Participant.findOne({ qrId });
  if (!participant) {
    throw new AppError('Participant not found', 404);
  }

  const logs = await ScanLog.find({ participantId: participant._id }).sort({ timestamp: -1 });

  let shortBreakCount = 0;
  let lunchBreakCount = 0;
  let breakfastBreakCount = 0;
  let accumulatedShortBreakMins = 0;

  logs.forEach(log => {
     if (log.scanType === 'EXIT') {
       if (log.breakType === 'SHORT') shortBreakCount++;
       if (log.breakType === 'LUNCH') lunchBreakCount++;
       if (log.breakType === 'BREAKFAST') breakfastBreakCount++;
     }
  });

  // To calculate exact times we would pair Entry and Exit logs.
  // For simplicity, we can pair them by traversing the logs chronologically
  // But wait, the dashboard just needs remaining breaks based on history.
  // We'll calculate accurately by traversing from oldest to newest:
  const chronologicalLogs = [...logs].reverse();
  
  let currentExit = null;
  let totalShortBreakMs = 0;

  chronologicalLogs.forEach(log => {
      if (log.scanType === 'EXIT') {
          currentExit = log;
      } else if (log.scanType === 'ENTRY' && currentExit) {
          const duration = log.timestamp - currentExit.timestamp;
          if (currentExit.breakType === 'SHORT') {
              totalShortBreakMs += duration;
          }
          currentExit = null;
      }
  });

  const accumulatedShortBreakMinsActual = Math.floor(totalShortBreakMs / 60000);

  return {
    participant,
    history: logs,
      shortBreaksTaken: shortBreakCount,
      shortBreaksRemaining: Math.max(0, 4 - shortBreakCount),
      lunchBreaksTaken: lunchBreakCount,
      lunchBreaksRemaining: Math.max(0, 2 - lunchBreakCount),
      breakfastBreaksTaken: breakfastBreakCount,
      breakfastBreaksRemaining: Math.max(0, 2 - breakfastBreakCount),
      accumulatedShortBreakMins: accumulatedShortBreakMinsActual,
  };
};
