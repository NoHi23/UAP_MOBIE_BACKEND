const mongoose = require('mongoose');
const { Schema } = mongoose;

const materialSchema = new Schema({
  materialDescription: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    trim: true
  },
  publisher: {
    type: String
  },
  publishDate: {
    type: Date
  },
  edition: {
    type: Number,
    min: 1 
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true 
  },
  isMainMaterial: {
    type: Boolean,
    default: false 
  },
  isHardCopy: {
    type: Boolean,
    default: false 
  },
  isOnline: {
    type: Boolean,
    default: false 
  },
  note: {
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

module.exports = mongoose.model("Material", materialSchema);