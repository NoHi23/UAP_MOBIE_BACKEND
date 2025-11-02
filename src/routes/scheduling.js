const express = require('express');
const router = express.Router();
const { generateSchedule } = require('../controllers/schedulingController');
const { verifyToken, authorize } = require('../middleware/authorization');

router.post('/generate', verifyToken, authorize('staff', 'admin'), generateSchedule);

module.exports = router;