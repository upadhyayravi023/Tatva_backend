const scanService = require('../services/scan.service');

exports.initialScan = async (req, res, next) => {
  try {
    const { qrId } = req.body;
    const log = await scanService.initialScan(qrId);

    res.status(200).json({
      success: true,
      data: log,
      message: 'Initial scan successful. Participant has entered the venue.'
    });
  } catch (err) {
    next(err);
  }
};

exports.exitScan = async (req, res, next) => {
  try {
    const { qrId, breakType } = req.body;
    const log = await scanService.exitScan(qrId, breakType);

    res.status(200).json({
      success: true,
      data: log,
      message: `Exit logged for ${breakType} break.`
    });
  } catch (err) {
    next(err);
  }
};

exports.entryScan = async (req, res, next) => {
  try {
    const { qrId } = req.body;
    const log = await scanService.entryScan(qrId);

    res.status(200).json({
      success: true,
      data: log,
      message: 'Entry logged successfully.',
      violationAlert: log.violationFlag ? log.violationReason : null
    });
  } catch (err) {
    next(err);
  }
};
