const mongoose = require('mongoose');
const { Schema } = mongoose;

const classSchema = new Schema({
  className: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: Boolean,
    default: true
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
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

// Đảm bảo tên lớp là duy nhất trong cùng 1 môn học
classSchema.index({ subjectId: 1, className: 1 }, { unique: true });

module.exports = mongoose.model("Class", classSchema);