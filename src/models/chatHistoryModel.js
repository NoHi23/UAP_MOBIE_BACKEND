const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatHistorySchema = new Schema({
    accountId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'model'],
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true
        }
    }]
}, { timestamps: true });

chatHistorySchema.index({ accountId: 1 });

module.exports = mongoose.model("ChatHistory", chatHistorySchema);