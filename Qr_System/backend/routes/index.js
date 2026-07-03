const express = require('express');
const router = express.Router();

const participantRoutes = require('./participant.routes');
const scanRoutes = require('./scan.routes');
const adminRoutes = require('./admin.routes');

router.use('/participants', participantRoutes);
router.use('/scan', scanRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy and awake!' });
});

module.exports = router;
