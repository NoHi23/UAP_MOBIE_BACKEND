const express = require('express')
const { verifyToken, authorize } = require('../middleware/authorization');
const lecturerController = require('../controllers/lecturer');
const lecturerRouter = express.Router();
const {
  getMyWeeklySchedule,
  getScheduleById
} = require('../controllers/lecturer');

const { getMyProfile, updateMyProfile } = require('../controllers/lecturer');

const { markAttendance } = require('../controllers/lecturer');
const { getSemesters, getSemesterOptions, getAttendanceSummary } = require('../controllers/lecturer');

lecturerRouter.get('/classes', verifyToken, lecturerController.getClasses);
lecturerRouter.get('/studentsbyclass/:classId', verifyToken, lecturerController.getStudentsByClass);
// API lấy lịch giảng dạy theo khoảng ngày bất kỳ
lecturerRouter.post('/schedules/my-week', verifyToken, getMyWeeklySchedule);
// Get schedule detail by id
lecturerRouter.get('/schedules/:id', verifyToken, getScheduleById);
// Lecturer profile (get/update own)
lecturerRouter.get('/profile', verifyToken, getMyProfile);
lecturerRouter.put('/profile', verifyToken, updateMyProfile);
// Mark attendance (single or bulk)
lecturerRouter.post('/attendance/mark', verifyToken, markAttendance);
// Attendance summary by semester (semesterId required)
lecturerRouter.get('/attendance/summary', verifyToken, getAttendanceSummary);
// Semesters list and current semester
lecturerRouter.get('/semesters', verifyToken, getSemesters);
// Return classes and subjects (with schedules) for a semester for this lecturer
lecturerRouter.get('/semester-options', verifyToken, getSemesterOptions);
// Trả về các teaching-instance (class + subject) trong kỳ: schedules, start/end, tổng buổi, số sinh viên
lecturerRouter.get('/classes-by-semester', verifyToken, lecturerController.getClassesBySemester);
// Lecturer can fetch notifications related to a schedule they teach
lecturerRouter.get('/notifications/slots', verifyToken, lecturerController.getNotificationsBySchedule);
// Lecturer create notification for a schedule they teach
lecturerRouter.post('/notifications/slots', verifyToken, lecturerController.createNotificationForSchedule);
// Lecturer support endpoints (create and list own supports)
lecturerRouter.post('/supports', verifyToken, lecturerController.createLecturerSupport);
lecturerRouter.get('/supports', verifyToken, lecturerController.getMySupports);
// Lecturers: get evaluations for themselves


module.exports = lecturerRouter