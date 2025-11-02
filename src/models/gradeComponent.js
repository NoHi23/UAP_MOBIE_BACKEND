const mongoose = require('mongoose');
const { Schema } = mongoose;

const gradeComponentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  weightPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100 
  },
  dropLowest: {
    type: String 
  },
  reLearnTime: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String
  },
  gradingGuide: {
    type: String
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject', 
    required: true
  }
}, {
  timestamps: true
});

// Đảm bảo trong cùng 1 môn học, không có 2 thành phần điểm trùng tên
gradeComponentSchema.index({ subjectId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("GradeComponent", gradeComponentSchema);