const Support = require('../models/support');
const Staff = require('../models/staff');

// POST /api/support

const createSupport = async (req, res) => {
    try {
        const { request } = req.body;
        const accountId = req.user?.id || req.body.accountId; // Nếu bạn dùng middleware verifyToken

        if (!request) {
            return res.status(400).json({ message: 'Vui lòng nhập nội dung yêu cầu hỗ trợ.' });
        }

        const newSupport = await Support.create({
            accountId,
            request,
        });

        return res.status(201).json({
            message: 'Yêu cầu hỗ trợ đã được gửi thành công.',
            data: newSupport,
        });
    } catch (error) {
        console.error(' Lỗi createSupport:', error);
        return res.status(500).json({ message: 'Lỗi khi tạo yêu cầu hỗ trợ.', error: error.message });
    }
};

// PUT /api/support/:id/answer

const answerSupport = async (req, res) => {
    try {
        const { id } = req.params;
        const { answer } = req.body;

        const support = await Support.findById(id);
        if (!support) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ.' });
        }

        support.answer = answer;
        support.status = 'in_progress';
        await support.save();

        return res.status(200).json({
            message: 'Đã trả lời yêu cầu hỗ trợ.',
            data: support,
        });
    } catch (error) {
        console.error(' Lỗi answerSupport:', error);
        return res.status(500).json({ message: 'Lỗi khi trả lời yêu cầu.', error: error.message });
    }
};

//PUT /api/support/:id/status

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['open', 'in_progress', 'closed'].includes(status)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }

        const support = await Support.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!support) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ.' });
        }

        return res.status(200).json({
            message: `Đã cập nhật trạng thái yêu cầu hỗ trợ thành "${status}".`,
            data: support,
        });
    } catch (error) {
        console.error('Lỗi updateStatus:', error);
        return res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái.', error: error.message });
    }
};

//  GET /api / support
const getAllSupports = async (req, res) => {
    try {
        const { status } = req.query;

        // Nếu có query ?status=open thì lọc, còn không thì lấy tất cả
        const filter = status ? { status } : {};

        const supports = await Support.find(filter)
            .populate('accountId', 'username email role') // Hiển thị thông tin user nếu cần
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Danh sách yêu cầu hỗ trợ',
            data: supports,
        });
    } catch (error) {
        console.error('❌ Lỗi getAllSupports:', error);
        return res.status(500).json({
            message: 'Lỗi khi lấy danh sách yêu cầu hỗ trợ.',
            error: error.message,
        });
    }
};


//  GET /api/support/account/:accountId
const getSupportsByAccountId = async (req, res) => {
    try {
        const { accountId } = req.params;

        const supports = await Support.find({ accountId })
            .sort({ createdAt: -1 });

        if (!supports || supports.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ nào.' });
        }

        return res.status(200).json({
            message: `Danh sách yêu cầu hỗ trợ của tài khoản ${accountId}`,
            data: supports,
        });
    } catch (error) {
        console.error('❌ Lỗi getSupportsByAccountId:', error);
        return res.status(500).json({
            message: 'Lỗi khi lấy yêu cầu hỗ trợ theo tài khoản.',
            error: error.message,
        });
    }
};


// GET /api/support/:id
const getSupportById = async (req, res) => {
    try {
        const { id } = req.params;

        const support = await Support.findById(id)
            .populate('accountId', 'username email role');

        if (!support) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ.' });
        }

        return res.status(200).json({
            message: 'Chi tiết yêu cầu hỗ trợ',
            data: support,
        });
    } catch (error) {
        console.error('❌ Lỗi getSupportById:', error);
        return res.status(500).json({
            message: 'Lỗi khi lấy chi tiết yêu cầu hỗ trợ.',
            error: error.message,
        });
    }
};


module.exports = {
    createSupport,
    answerSupport,
    updateStatus,
    getAllSupports,
    getSupportsByAccountId,
    getSupportById
};
