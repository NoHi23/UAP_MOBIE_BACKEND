const mongoose = require('mongoose');
const { Schema } = mongoose;

const yearSchema = new Schema({
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: Boolean,
    default: true 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true }
});

yearSchema.virtual('name').get(function() {
  if (this.startDate && this.endDate) {
    return `${this.startDate.getFullYear()}-${this.endDate.getFullYear()}`;
  }
  return null;
});

module.exports = mongoose.model("Year", yearSchema);