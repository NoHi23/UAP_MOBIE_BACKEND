const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
    tuitionFeeId: {
        type: Schema.Types.ObjectId,
        ref: 'TuitionFee',
        required: true
    },
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    transactionCode: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        default: 'vietqr_transfer'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    bankTransactionId: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Transaction", transactionSchema);