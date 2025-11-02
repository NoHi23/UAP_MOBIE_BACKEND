const mongoose = require('mongoose');
const { Schema } = mongoose;

const evaluationSchema = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    lecturerId: {
        type: Schema.Types.ObjectId,
        ref: 'Lecturer',
        required: true
    },
    classId: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    criteria: [{
        name: {
            type: String,
            required: true,
        },
        score: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        }
    }],
    comment: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

evaluationSchema.index({ studentId: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model("Evaluation", evaluationSchema);