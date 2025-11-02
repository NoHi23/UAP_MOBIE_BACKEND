const mongoose = require('mongoose');
const { Schema } = mongoose;

const weekSchema = new Schema({
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

const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};

weekSchema.virtual('weekNumber').get(function() {
  if (this.startDate) {
    return getWeekNumber(this.startDate);
  }
  return null;
});

weekSchema.virtual('name').get(function() {
  if (this.startDate) {
    return `Tuần ${getWeekNumber(this.startDate)}`;
  }
  return null;
});


module.exports = mongoose.model("Week", weekSchema);