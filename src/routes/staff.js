const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/authorization');

const { createMaterial, getAllMaterials, updateMaterial, deleteMaterial } = require('../controllers/material');
const { getAllRequests, updateRequest } = require('../controllers/requestController');
const { createSlotNotification } = require('../controllers/notificationController');

const { getAllSemesters } = require('../controllers/semesterController');
const { getAllMajors } = require('../controllers/majorController');
const { createSubject, getSubjects, getSubjectById, bulkCreateMaterials, bulkCreateCLOs, bulkCreateSessionMaterials, getCLOs, getSessionMaterials, updateSubject } = require('../controllers/MaterialManagerController');

const { getEligibleStudentsForManualEnroll, createManualClass, enrollStudentsManually } = require('../controllers/staff')
const {
    getAllSubjects,
    getAllRooms
} = require('../controllers/semesterController');


const {
    getAllTools,
    createTool,
    updateTool,
    deleteTool
} = require('../controllers/aiToolController');

router.use(verifyToken, authorize('staff', 'admin', 'lecturer'));



router.route('/materials')
    .post(authorize('staff', 'admin'), createMaterial)
    .get(getAllMaterials);
router.post('/materials/bulk', authorize('staff', 'admin'), bulkCreateMaterials);
router.post('/clos/bulk', authorize('staff', 'admin'), bulkCreateCLOs);
router.post('/session-materials/bulk', authorize('staff', 'admin'), bulkCreateSessionMaterials);
router.get('/clos', getCLOs);
router.get('/session-materials', getSessionMaterials);
router.route('/materials/:id')
    .put(authorize('staff', 'admin'), updateMaterial)
    .delete(authorize('staff', 'admin'), deleteMaterial);

router.route('/requests')
    .get(authorize('staff', 'admin'), getAllRequests);
router.route('/requests/:id')
    .put(authorize('staff', 'admin'), updateRequest);


router.post('/notifications/slots', createSlotNotification);

router.get('/semesters', getAllSemesters);
router.get('/majors', getAllMajors);
// Create subject (used by Material Manager UI) - staff only
router.get('/subjects', authorize('staff', 'admin'), getSubjects);
router.post('/subjects', authorize('staff', 'admin'), createSubject);
router.put('/subjects/:id', authorize('staff', 'admin'), updateSubject);
router.get('/subjects/:id', authorize('staff', 'admin'), getSubjectById);

router.get('/eligible-students', getEligibleStudentsForManualEnroll);
router.post('/classes/manual', createManualClass);
router.post('/classes/:classId/enroll-manual', enrollStudentsManually);
router.get('/subjects', getAllSubjects);
router.get('/rooms', getAllRooms);

router.route('/ai-tools')
    .get(getAllTools)
    .post(createTool);

router.route('/ai-tools/:id')
    .put(updateTool)
    .delete(deleteTool);

module.exports = router;