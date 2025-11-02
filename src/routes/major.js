const express = require('express');
const router = express.Router();
const { getAllMajors } = require('../controllers/major');
const { verifyToken, authorize } = require('../middleware/authorization');

// GET /api/major
router.get('/', getAllMajors);

module.exports = router;
