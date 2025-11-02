const mongoose = require('mongoose');

const annoucementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    postBy: {
        type: String,
        required: true
    },
    picture: {
        type: String
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Annoucement", annoucementSchema);