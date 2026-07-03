const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

router.get('/dashboard', adminController.getDashboardStats);
router.get('/participants', adminController.getParticipants);
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);

module.exports = router;
