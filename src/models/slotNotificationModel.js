const mongoose = require('mongoose');
const { Schema } = mongoose;

const slotNotificationSchema = new Schema({
    // Liên kết đến buổi học/slot học cụ thể
    scheduleId: {
        type: Schema.Types.ObjectId,
        ref: 'Schedule',
        required: true
    },
    // Người gửi (Giảng viên hoặc Nhân viên)
    senderId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("SlotNotification", slotNotificationSchema);