const mongoose = require('mongoose');
const { Schema } = mongoose;

const requestSchema = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    requestType: {
        type: String,
        required: true,
        enum: [
            'Xin nghỉ học',
            'Phúc khảo điểm',
            'Cấp lại thẻ sinh viên',
            'Xác nhận sinh viên',
            'Khác'
        ] 
    },
    title: {
        type: String,
        required: [true, 'Vui lòng nhập tiêu đề.']
    },
    description: {
        type: String,
        required: [true, 'Vui lòng nhập nội dung chi tiết.']
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    response: {
        type: String
    },
    handlerId: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Request", requestSchema);