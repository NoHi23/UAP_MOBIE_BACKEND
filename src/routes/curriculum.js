const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/authorization');
const ctrl = require('../controllers/curriculum');

// Allow any authenticated user (students) to view curriculums
router.use(verifyToken);

router.get('/', ctrl.getAllCurriculums);
router.get('/:id', ctrl.getCurriculumById);
router.get('/:id/details', ctrl.getCurriculumDetails);

module.exports = router;
