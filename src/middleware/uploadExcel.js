const multer = require('multer');
const path = require('path');

// Cấu hình Multer để lưu tệp tải lên
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Đảm bảo thư mục 'uploads' đã tồn tại
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Lấy đuôi file
        cb(null, `${Date.now()}${ext}`); // Đặt tên file là timestamp + đuôi file
    },
});

// Chỉ cho phép các tệp Excel (.xls, .xlsx)
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.xls' && ext !== '.xlsx') {
        return cb(new Error('Chỉ cho phép tệp .xls và .xlsx'), false);
    }
    cb(null, true);
};

// Khởi tạo Multer với cấu hình trên
const uploadExcel = multer({ storage, fileFilter });

module.exports = { uploadExcel };
