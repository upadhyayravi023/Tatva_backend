const participantService = require('../services/participant.service');

exports.register = async (req, res, next) => {
  try {
    const participant = await participantService.registerParticipant(req.body);
    res.status(201).json({
      success: true,
      data: participant
    });
  } catch (err) {
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const { qrId } = req.params;
    const statusData = await participantService.getParticipantStatus(qrId);
    
    res.status(200).json({
      success: true,
      data: statusData
    });
  } catch (err) {
    next(err);
  }
};
