const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/authorization');

const {
    createSupport,
    answerSupport,
    updateStatus,
    getAllSupports,
    getSupportsByAccountId,
    getSupportById
} = require('../controllers/support');

router.post('/request', verifyToken, createSupport);

router.get('/', verifyToken, authorize('staff'), getAllSupports);

router.get('/account/:accountId', verifyToken, getSupportsByAccountId);

router.get('/:id', verifyToken, getSupportById);

router.put('/:id/answer', verifyToken, authorize('staff'), answerSupport);

router.put('/:id/status', verifyToken, authorize('student', 'lecture'), updateStatus);

module.exports = router;
