const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AbsenceRequestSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  slotId: { type: String, required: true }, 
  reason: { type: String, required: true }, // HTML từ JoditEditor
  attachments: [{ type: String }],
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "Staff" },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AbsenceRequest", AbsenceRequestSchema);
