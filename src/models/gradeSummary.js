const mongoose = require('mongoose');
const { Schema } = mongoose;

const gradeSummarySchema = new Schema({
  semesterNo: {
    type: String,
    required: true,
    trim: true
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed', 'passed'],
    default: 'in_progress'
  },
  gradeId: {
    type: Schema.Types.ObjectId,
    ref: 'Grade',
    required: true
  },
  componentId: { 
    type: Schema.Types.ObjectId,
    ref: 'GradeComponent',
    required: true
  },
  majorId: {
    type: Schema.Types.ObjectId,
    ref: 'Major',
    required: true
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  }
}, {
  timestamps: true
});

gradeSummarySchema.index({ studentId: 1, semesterNo: 1 }, { unique: true });

module.exports = mongoose.model("GradeSummary", gradeSummarySchema);