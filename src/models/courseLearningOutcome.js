const mongoose = require('mongoose');
const { Schema } = mongoose;

const cloSchema = new Schema({
  cloDetails: {
    type: String,
    required: true,
    trim: true,
  },
  loDetails: {
    type: String,
    trim: true
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject', 
    required: true
  }
}, {
  timestamps: true
});

cloSchema.index({ subjectId: 1, cloDetails: 1 }, { unique: true });


module.exports = mongoose.model("CLO", cloSchema);