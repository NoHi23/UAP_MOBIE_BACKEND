const mongoose = require('mongoose');
const { Schema } = mongoose;

const scheduleOfStudentSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },

  attendance: [{
    scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule' },
    status: {
      type: String,
      enum: ['Not Yet', 'Present', 'Absent'],
      default: 'Not Yet'
    },
    note: String
  }]
}, { timestamps: true });

scheduleOfStudentSchema.index({ studentId: 1, classId: 1 }, { unique: true });

module.exports = mongoose.models.ScheduleOfStudent || mongoose.model("ScheduleOfStudent", scheduleOfStudentSchema);