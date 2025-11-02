const mongoose = require('mongoose');
const { Schema } = mongoose;

const gradeSchema = new Schema({
  score: {
    type: Number,
    required: true,
    min: 0, 
    max: 10 
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject', 
    required: true
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student', 
    required: true
  },
  componentId: {
    type: Schema.Types.ObjectId,
    ref: 'GradeComponent', 
    required: true
  }
}, {
  timestamps: true
});

gradeSchema.index({ studentId: 1, subjectId: 1, componentId: 1 }, { unique: true });

module.exports = mongoose.model("Grade", gradeSchema);