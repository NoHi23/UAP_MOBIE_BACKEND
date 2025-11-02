const mongoose = require('mongoose');
const { Schema } = mongoose;

const timeSlotSchema = new Schema({
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  slot: {
    type: Number,
    required: true,
    min: 1 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

timeSlotSchema.virtual('timeRange').get(function() {
  if (this.startDate && this.endDate) {
    const options = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' };
    const startTime = this.startDate.toLocaleTimeString('vi-VN', options);
    const endTime = this.endDate.toLocaleTimeString('vi-VN', options);
    return `${startTime} - ${endTime}`;
  }
  return null;
});

module.exports = mongoose.model("TimeSlot", timeSlotSchema);