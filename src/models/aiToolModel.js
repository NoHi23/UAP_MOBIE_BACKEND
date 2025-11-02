const mongoose = require('mongoose');
const { Schema } = mongoose;

const aiToolSchema = new Schema({
    toolName: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['student', 'lecture', 'staff'],
        required: true
    },
    isEnabled: {
        type: Boolean,
        default: true
    },
    parameters: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("AiTool", aiToolSchema);