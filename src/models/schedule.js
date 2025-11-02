const mongoose = require('mongoose');
const { Schema } = mongoose;

const scheduleSchema = new Schema({
  semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  lecturerId: { type: Schema.Types.ObjectId, ref: 'Lecturer', required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },

  date: { type: Date, required: true },
  slot: { type: Number, required: true, min: 1, max: 6 },
  startTime: { type: String, required: true }, // Ví dụ: "07:30"
  endTime: { type: String, required: true }
  
}, { timestamps: true });

scheduleSchema.index({ date: 1, slot: 1, lecturerId: 1 }, { unique: true });
scheduleSchema.index({ date: 1, slot: 1, roomId: 1 }, { unique: true });
scheduleSchema.index({ date: 1, slot: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model("Schedule", scheduleSchema);