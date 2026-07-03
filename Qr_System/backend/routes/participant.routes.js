const express = require('express');
const router = express.Router();

const participantController = require('../controllers/participant.controller');
const validateRequest = require('../middlewares/validateRequest');
const { registerParticipantSchema } = require('../validations/participant.validation');

router.post('/register', validateRequest(registerParticipantSchema), participantController.register);
router.get('/:qrId', participantController.getStatus);

module.exports = router;
