const Major = require('../models/major');

// 📘 GET ALL MAJORS
const getAllMajors = async (req, res) => {
    try {
        const majors = await Major.find().sort({ createdAt: -1 }); // sắp xếp mới nhất lên đầu
        return res.status(200).json(majors);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách chuyên ngành:', error);
        return res.status(500).json({
            message: 'Lấy danh sách chuyên ngành thất bại',
            error: error.message,
        });
    }
};
module.exports = {
    getAllMajors
};