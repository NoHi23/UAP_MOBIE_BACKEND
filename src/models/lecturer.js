const mongoose = require('mongoose');
const { Schema } = mongoose;

const lecturerSchema = new Schema({
  lecturerCode: {
    type: String,
    required: true,
    unique: true
  },
  lecturerAvatar: {
    type: String,
    required: true,
    validate: {
      validator(v) {
        // chấp nhận data URI ảnh base64
        return /^data:image\/(png|jpe?g|gif|webp);base64,/.test(v);
      },
      message: 'lecturerAvatar phải là data URI base64 của ảnh'
    }
  },
  citizenID: {
    type: Number,
    required: true
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

module.exports = mongoose.model("Lecturer", lecturerSchema);