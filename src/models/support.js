const mongoose = require('mongoose');
const { Schema } = mongoose;

const supportSchema = new Schema({
  accountId: {
    type: Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  request: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'closed'], 
    default: 'open',
    index: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Support", supportSchema);