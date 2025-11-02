const mongoose = require('mongoose');
const { Schema } = mongoose;

const subjectSchema = new Schema({
  // Tên môn học (tiếng Việt)
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  // Tên môn học (tiếng Anh)
  subjectEnglish: {
    type: String,
    trim: true
  },
  // Mã môn học
  subjectCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Số tín chỉ
  subjectNoCredit: {
    type: Number,
    required: true,
    min: 0
  },
  degreeLevel: {
    type: String,
  },
  timeAllocation: {
    type: String 
  },
  preRequisite: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  description: {
    type: String
  },
  studentTask: {
    type: String
  },
  tools: {
    type: String
  },
  scoringScale: {
    type: String,
    default: 'Thang điểm 10'
  },
  decisionNumber: {
    type: String
  },
  minAvgMarkToPass: {
    type: Number,
    required: true,
    min: 0,
    max: 10,
    default: 4.0
  },
  status: {
    type: Boolean,
    default: true 
  },
  approveDate: {
    type: Date
  },
  majorId: {
    type: Schema.Types.ObjectId,
    ref: 'Major',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Subject", subjectSchema);