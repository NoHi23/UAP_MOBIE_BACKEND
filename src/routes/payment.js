const express = require('express');
const router = express.Router();
const { vnpayIpnHandler, vnpayReturnHandler } = require('../controllers/paymentController');

router.get('/vnpay_ipn', vnpayIpnHandler);

router.get('/vnpay_return', vnpayReturnHandler);

module.exports = router;