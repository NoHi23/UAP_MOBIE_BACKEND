const mongoose = require('mongoose');
const { Schema } = mongoose;

const curriculumDetailSchema = new Schema({
  // semester number or identifier (e.g., 1, 2, 'Fall 2022')
  semester: {
    type: Number,
    required: true
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  curriculumId: {
    type: Schema.Types.ObjectId,
    ref: 'Curriculum',
    required: true
  }
  ,
  // denormalized subject snapshot fields to make API responses self-contained
  subjectCode: { type: String },
  subjectName: { type: String },
  subjectEnglish: { type: String },
  credits: { type: Number },
  type: { type: String },
  lecturer: { type: String },
  description: { type: String },
  learningOutcomes: { type: [String], default: [] }
}, {
  timestamps: true
});

curriculumDetailSchema.index({ curriculumId: 1, subjectId: 1 }, { unique: true });


module.exports = mongoose.model("CurriculumDetail", curriculumDetailSchema);
