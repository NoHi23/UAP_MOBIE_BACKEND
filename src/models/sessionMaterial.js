const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionMaterialSchema = new Schema({
  session:{
    type: Number,
    required: true
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  learningTeachingType: {
    type: String 
  },
  itu: {
    type: String
  },
  studentMaterial: {
    type: String
  },
  downloadable: {
    type: String
  },
  studentTask: {
    type: String
  },
  urls: {
    type: [String] 
  },
  learningOutcomes: {
    type: [String],
    required: true,
    default: []
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("SessionMaterial", sessionMaterialSchema);