const mongoose = require('mongoose');
const { Schema } = mongoose;

const majorSchema = new Schema({
  majorName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  majorCode: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: Number,
    default: 1,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Major", majorSchema);