const mongoose = require('mongoose');
const { Schema } = mongoose;

const scheduleOfLectureSchema = new Schema({
  attendance: {
    type: Boolean,
    default: false 
  },
  scheduleId: {
    type: Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true
  },
  lecturerId: { 
    type: Schema.Types.ObjectId,
    ref: 'Lecturer', 
    required: true
  }
}, {
  timestamps: true
});

scheduleOfLectureSchema.index({ scheduleId: 1, lecturerId: 1 }, { unique: true });

module.exports = mongoose.model("ScheduleOfLecture", scheduleOfLectureSchema);