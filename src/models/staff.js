const mongoose = require('mongoose');
const { Schema } = mongoose;

const staffSchema = new Schema({
  staffCode: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  gender: {
    type: Boolean,
    default: true   // true: Nam, false: Nữ
  },
  phone: {
    type: String,
    required: true
  },
  accountId: {
    type: Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    unique: true
  },
  status: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Staff", staffSchema);
