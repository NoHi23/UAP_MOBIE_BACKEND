const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentSchema = new Schema({
  studentCode: {
    type: String,
    required: true,
    unique: true
  },
  studentAvatar: {
    type: String,
    required: false,
    validate: {
      validator(v) {
        if (!v) return true; // allow empty
        // allow data URI (base64) for common image types or http(s) URLs
        return /^data:image\/(png|jpe?g|gif|webp);base64,/.test(v) || /^https?:\/\//.test(v);
      },
      message: 'studentAvatar must be a base64 data URI (image) or a valid http(s) URL'
    }
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  citizenID: {
    type: Number,
    required: true
  },
  gender: {
    type: Boolean,
    default: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  semester: {
    type: String
  },
  semesterNo: {
    type: Number
  },
  curriculumId: {
    type: Schema.Types.ObjectId,
    ref: 'Curriculum',
    required: true
  },
  accountId: {
    type: Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    unique: true
  },
  majorId: {
    type: Schema.Types.ObjectId,
    ref: 'Major',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Student", studentSchema);