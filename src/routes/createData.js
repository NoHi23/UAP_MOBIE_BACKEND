const express = require('express');
const router = express.Router();

// Import insert controller
const insertController = require('../controllers/createData/insertData');

// Insert routes only
router.post('/semester', insertController.createSemester);
router.post('/subject', insertController.createSubject);
router.post('/class', insertController.createClass);
router.post('/time', insertController.createTimeSlot);
router.post('/week', insertController.createWeek);
router.post('/room', insertController.createRoom);
router.post('/lecturer', insertController.createLecturer);
router.post('/schedule', insertController.createSchedule);

module.exports = router;