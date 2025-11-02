const mongoose = require('mongoose');
const { Schema } = mongoose;

const curriculumSchema = new Schema({
  curriculumName: {
    type: String,
    required: true,
    trim: true
  },
  majorId: {
    type: Schema.Types.ObjectId,
    ref: 'Major',
    required: true
  },
  totalSemester: {
    type: Number,
    default: 0
  },
  yearApplied: {
    type: Number
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Curriculum", curriculumSchema);