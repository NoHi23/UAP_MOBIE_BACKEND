const TuitionFee = require('../models/tuitionFeeModel');
const Transaction = require('../models/transactionModel');
const Student = require('../models/student');
const crypto = require('crypto');
const querystring = require('qs');
const moment = require('moment');


const createPaymentUrl = async (req, res) => {
  try {
    const student = await Student.findOne({ accountId: req.user.id });
    if (!student) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });

    const tuition = await TuitionFee.findOne({ studentId: student._id, status: 'unpaid' });
    if (!tuition) return res.status(404).json({ message: 'Không có công nợ học phí.' });

    const tmnCode = 'YOUR_VNP_TMNCODE';
    const secretKey = 'YOUR_VNP_HASHSECRET';
    const vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = 'http://localhost:3000/payment/vnpay_return';

    const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const amount = (tuition.totalAmount - tuition.amountPaid) * 100;
    const transactionCode = `FEE${student.studentCode}${Date.now()}`;

    await Transaction.create({
      tuitionFeeId: tuition._id,
      studentId: student._id,
      transactionCode: transactionCode,
      amount: amount / 100,
      status: 'pending'
    });

    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = transactionCode;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan hoc phi ' + transactionCode;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = moment().format('YYYYMMDDHHmmss');

    vnp_Params = Object.fromEntries(Object.entries(vnp_Params).sort());

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    vnp_Params['vnp_SecureHash'] = signed;

    const finalUrl = vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: false });

    res.status(200).json({ success: true, data: { paymentUrl: finalUrl } });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

const vnpayIpnHandler = async (req, res) => {
  let vnp_Params = req.query;
  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = Object.fromEntries(Object.entries(vnp_Params).sort());

  const secretKey = 'YOUR_VNP_HASHSECRET';
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

  if (secureHash === signed) {
    const transactionCode = vnp_Params['vnp_TxnRef'];
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const amount = vnp_Params['vnp_Amount'] / 100;

    try {
      const transaction = await Transaction.findOne({ transactionCode: transactionCode });
      if (!transaction) {
        return res.json({ RspCode: '01', Message: 'Order not found' });
      }

      if (transaction.status !== 'pending') {
        return res.json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      if (transaction.amount !== amount) {
        return res.json({ RspCode: '04', Message: 'Invalid amount' });
      }

      if (responseCode === '00') {
        transaction.status = 'completed';
        await transaction.save();

        const tuition = await TuitionFee.findById(transaction.tuitionFeeId);
        if (tuition) {
          tuition.amountPaid += transaction.amount;
          if (tuition.amountPaid >= tuition.totalAmount) {
            tuition.status = 'paid';
          }
          await tuition.save();
        }
      } else {
        transaction.status = 'failed';
        await transaction.save();
      }

      return res.json({ RspCode: '00', Message: 'Confirm Success' });

    } catch (error) {
      return res.json({ RspCode: '97', Message: 'Unknown error' });
    }
  } else {
    return res.json({ RspCode: '97', Message: 'Invalid Signature' });
  }
};


const vnpayReturnHandler = (req, res) => {
  const responseCode = req.query.vnp_ResponseCode;
  if (responseCode === '00') {
    res.send("<h1>Giao dịch thành công!</h1>");
  } else {
    res.send("<h1>Giao dịch thất bại!</h1>");
  }
};


const getTransactionHistory = async (req, res) => {
  try {
    const student = await Student.findOne({ accountId: req.user.id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });
    }

    const transactions = await Transaction.find({ studentId: student._id })
      .populate({
        path: 'tuitionFeeId',
        select: 'semesterNo totalAmount'
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });

  } catch (error) {
    console.error("Lỗi khi lấy lịch sử giao dịch:", error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};



const getTuitionInfo = async (req, res) => {
  try {
    const student = await Student.findOne({ accountId: req.user.id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });
    }

    const tuition = await TuitionFee.findOne({
      studentId: student._id,
      status: 'unpaid'
    });

    if (!tuition) {
      return res.status(404).json({ success: false, message: 'Hiện không có công nợ học phí nào.' });
    }

    res.status(200).json({ success: true, data: tuition });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

module.exports = {
  createPaymentUrl,
  vnpayReturnHandler,
  vnpayIpnHandler,
  getTransactionHistory,
  getTuitionInfo
};
