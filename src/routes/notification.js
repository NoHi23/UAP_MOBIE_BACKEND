const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authorization'); // Middleware bảo vệ

const { 
    getMySlotNotifications,
    getNotificationsForSlot 
} = require('../controllers/notificationController');

router.use(verifyToken);

router.get('/slots', getMySlotNotifications); 

router.get('/slot/:scheduleId', getNotificationsForSlot);

module.exports = router;