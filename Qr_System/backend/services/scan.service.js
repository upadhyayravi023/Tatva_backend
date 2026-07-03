const mongoose = require('mongoose');
const Participant = require('../models/Participant.model');
const ScanLog = require('../models/ScanLog.model');
const Settings = require('../models/Settings.model');
const AppError = require('../utils/AppError');

// Configurable logic was deprecated in favor of hard-coded fixed rules
const MAX_SHORT_BREAKS = 4;
const MAX_SHORT_BREAK_DURATION_MINS = 30;

/**
 * Perform INITIAL scan
 */
exports.initialScan = async (qrId) => {
  const participant = await Participant.findOne({ qrId });
  if (!participant) throw new AppError('Participant not found', 404);

  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const existingLog = await ScanLog.findOne({
        participantId: participant._id,
        scanType: 'ENTRY',
        breakType: 'INITIAL'
      }).session(session);

      if (existingLog) throw new AppError('Initial scan already completed', 400);

      const log = await ScanLog.create([{
        participantId: participant._id,
        scanType: 'ENTRY',
        breakType: 'INITIAL',
        violationFlag: false
      }], { session });

      participant.isInsideVenue = true;
      await participant.save({ session });
      return log[0];
    });
  } finally {
    session.endSession();
  }
};

/**
 * Perform EXIT scan
 */
exports.exitScan = async (qrId, breakType) => {
  const participant = await Participant.findOne({ qrId });
  if (!participant) throw new AppError('Participant not found', 404);

  const hasInitial = await ScanLog.findOne({ participantId: participant._id, breakType: 'INITIAL' });
  if (!hasInitial) {
    throw new AppError('Participant is registered but requires an Initial Entry scan first.', 400);
  }

  if (!participant.isInsideVenue) {
    throw new AppError('Participant is already outside the venue', 400);
  }

  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      let violationFlag = false;
      const violationReasons = [];

      if (breakType === 'LUNCH') {
        const pastLunches = await ScanLog.countDocuments({ participantId: participant._id, scanType: 'EXIT', breakType: 'LUNCH' }).session(session);
        if (pastLunches >= 2) {
          violationFlag = true;
          violationReasons.push(`Maximum of 2 lunch breaks exceeded.`);
        }
      } else if (breakType === 'BREAKFAST') {
        const pastBreakfasts = await ScanLog.countDocuments({ participantId: participant._id, scanType: 'EXIT', breakType: 'BREAKFAST' }).session(session);
        if (pastBreakfasts >= 2) {
          violationFlag = true;
          violationReasons.push(`Maximum of 2 breakfast breaks exceeded.`);
        }
      } else if (breakType === 'SHORT') {
        const pastShorts = await ScanLog.countDocuments({ participantId: participant._id, scanType: 'EXIT', breakType: 'SHORT' }).session(session);
        if (pastShorts >= MAX_SHORT_BREAKS) {
          violationFlag = true;
          violationReasons.push(`Maximum of ${MAX_SHORT_BREAKS} short breaks exceeded.`);
        }
      }

      const log = await ScanLog.create([{
        participantId: participant._id,
        scanType: 'EXIT',
        breakType,
        violationFlag,
        violationReason: violationReasons.join(' ') || undefined,
      }], { session });

      participant.isInsideVenue = false;
      await participant.save({ session });
      return log[0];
    });
  } finally {
    session.endSession();
  }
};

/**
 * Perform ENTRY scan & Evaluate Rule Engine
 */
exports.entryScan = async (qrId) => {
  const participant = await Participant.findOne({ qrId });
  if (!participant) throw new AppError('Participant not found', 404);

  const hasInitial = await ScanLog.findOne({ participantId: participant._id, breakType: 'INITIAL' });
  if (!hasInitial) {
    throw new AppError('Participant is registered but requires an Initial Entry scan first.', 400);
  }

  if (participant.isInsideVenue) {
    throw new AppError('Participant is already inside the venue', 400);
  }

  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      // Find the last EXIT log
      const lastExit = await ScanLog.findOne({
        participantId: participant._id,
        scanType: 'EXIT'
      }).sort({ timestamp: -1 }).session(session);

      if (!lastExit) {
        throw new AppError('No prior EXIT log found to match an ENTRY.', 400);
      }

      const now = new Date();
      const durationMins = Math.round((now - lastExit.timestamp) / 60000);
      const breakType = lastExit.breakType;

      let violationFlag = false;
      const violationReasons = [];

      // ── LUNCH BREAK RULES ─────────────────────────────────────────────────────
      if (breakType === 'LUNCH') {
        if (durationMins > 45) {
          violationFlag = true;
          violationReasons.push(`Lunch break exceeded 45 min limit (was ${durationMins} mins).`);
        }
      }

      // ── BREAKFAST BREAK RULES ──────────────────────────────────────────────────
      else if (breakType === 'BREAKFAST') {
        if (durationMins > 45) {
          violationFlag = true;
          violationReasons.push(`Breakfast break exceeded 45 min limit (was ${durationMins} mins).`);
        }
      }

      // ── SHORT BREAK RULES ─────────────────────────────────────────────────────
      else if (breakType === 'SHORT') {
        if (durationMins > MAX_SHORT_BREAK_DURATION_MINS) {
          violationFlag = true;
          violationReasons.push(`Short break exceeded ${MAX_SHORT_BREAK_DURATION_MINS} min limit (was ${durationMins} mins).`);
        }
      }

      // Create Entry Log
      const entryLog = await ScanLog.create([{
        participantId: participant._id,
        scanType: 'ENTRY',
        breakType,
        violationFlag,
        violationReason: violationReasons.join(' ') || undefined,
        breakDurationMins: durationMins,
      }], { session });

      participant.isInsideVenue = true;
      await participant.save({ session });

      return { ...entryLog[0].toObject(), violationFlag, violationReason: violationReasons.join(' ') };
    });
  } finally {
    session.endSession();
  }
};
