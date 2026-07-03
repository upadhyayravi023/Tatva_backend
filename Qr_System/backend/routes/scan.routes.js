const express = require('express');
const router = express.Router();

const scanController = require('../controllers/scan.controller');
const validateRequest = require('../middlewares/validateRequest');
const { initialScanSchema, exitScanSchema, entryScanSchema } = require('../validations/scan.validation');

router.post('/initial', validateRequest(initialScanSchema), scanController.initialScan);
router.post('/exit', validateRequest(exitScanSchema), scanController.exitScan);
router.post('/entry', validateRequest(entryScanSchema), scanController.entryScan);

module.exports = router;
