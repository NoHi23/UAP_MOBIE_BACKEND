const mongoose = require('mongoose');
const { Schema } = mongoose;

const semesterSchema = new Schema({
  semesterName: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: Boolean,
    default: true 
  },
  yearId: {
    type: Schema.Types.ObjectId,
    ref: 'Year',
    required: true
  }
}, {
  timestamps: true
});

semesterSchema.index({ yearId: 1, semesterName: 1 }, { unique: true });

module.exports = mongoose.model("Semester", semesterSchema);