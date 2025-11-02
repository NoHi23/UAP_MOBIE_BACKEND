const mongoose = require('mongoose');
const { Schema } = mongoose;

const roomSchema = new Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  roomName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Room", roomSchema);