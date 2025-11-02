const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentClassSchema = new Schema({
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class', 
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

studentClassSchema.index({ classId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("StudentClass", studentClassSchema);