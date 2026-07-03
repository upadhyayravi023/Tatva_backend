const Participant = require('../models/Participant.model');
const ScanLog = require('../models/ScanLog.model');
const Settings = require('../models/Settings.model');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalRegistered = await Participant.countDocuments({});
    const currentlyInside = await Participant.countDocuments({ isInsideVenue: true });
    
    const violationLogs = await ScanLog.countDocuments({ violationFlag: true });
    const totalExited = await ScanLog.countDocuments({ scanType: 'EXIT' });

    res.status(200).json({
      success: true,
      data: {
        totalRegistered,
        currentlyInside,
        totalViolationsLogged: violationLogs,
        totalExited,
      }
    });

  } catch (err) {
    next(err);
  }
};

exports.getParticipants = async (req, res, next) => {
  try {
    const participants = await Participant.find({});
    // Fetch logs to calculate breaks accurately and detect violations
    const allLogs = await ScanLog.find({ 
      $or: [{ scanType: 'EXIT' }, { violationFlag: true }] 
    });
    
    const logsByParticipant = {};
    allLogs.forEach(log => {
      const pId = log.participantId.toString();
      if (!logsByParticipant[pId]) logsByParticipant[pId] = { short: 0, lunch: 0, breakfast: 0, hasViolation: false };
      
      if (log.scanType === 'EXIT') {
        if (log.breakType === 'SHORT') logsByParticipant[pId].short++;
        if (log.breakType === 'LUNCH') logsByParticipant[pId].lunch++;
        if (log.breakType === 'BREAKFAST') logsByParticipant[pId].breakfast++;
      }
      
      if (log.violationFlag) {
        logsByParticipant[pId].hasViolation = true;
      }
    });

    const data = participants.map(p => {
      const pId = p._id.toString();
      const stats = logsByParticipant[pId] || { short: 0, lunch: 0, breakfast: 0, hasViolation: false };
      return {
        id: p._id,
        qrId: p.qrId,
        name: p.name,
        team: p.teamName || p.teamId,
        rollNumber: p.rollNumber,
        inside: p.isInsideVenue,
        remainingShort: Math.max(0, 4 - stats.short),
        remainingLunch: Math.max(0, 2 - stats.lunch),
        remainingBreakfast: Math.max(0, 2 - stats.breakfast),
        hasViolation: stats.hasViolation
      };
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ singletonId: 'STATIC_SETTINGS' });
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { maxShortBreaks, maxShortBreakDurationMins } = req.body;
    let settings = await Settings.findOne({ singletonId: 'STATIC_SETTINGS' });
    if (!settings) {
      settings = new Settings({ maxShortBreaks, maxShortBreakDurationMins });
    } else {
      if (typeof maxShortBreaks === 'number')            settings.maxShortBreaks            = maxShortBreaks;
      if (typeof maxShortBreakDurationMins === 'number') settings.maxShortBreakDurationMins = maxShortBreakDurationMins;
    }
    await settings.save();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};
