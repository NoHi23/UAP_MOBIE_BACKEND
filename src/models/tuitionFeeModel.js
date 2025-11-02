const mongoose = require('mongoose');
const { Schema } = mongoose;

const tuitionFeeSchema = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    semesterNo: {
        type: String,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    deadline: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['unpaid', 'paid', 'overdue'],
        default: 'unpaid'
    }
}, {
    timestamps: true
});

// Đảm bảo mỗi sinh viên chỉ có 1 công nợ học phí cho 1 kỳ
tuitionFeeSchema.index({ studentId: 1, semesterNo: 1 }, { unique: true });

module.exports = mongoose.model("TuitionFee", tuitionFeeSchema);