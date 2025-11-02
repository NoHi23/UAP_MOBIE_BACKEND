const Semester = require('../models/semester');
const subject = require('../models/subject');
const Room = require('../models/room');



const getAllSemesters = async (req, res) => {
    try {
        const semesters = await Semester.find().sort({ startDate: -1 }); 
        res.status(200).json({ success: true, data: semesters });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getAllSubjects = async (req, res) => {
    try {
        const subjects = await subject.find().sort({ subjectCode: 1 }); 
        res.status(200).json({ success: true, data: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ status: true }).sort({ roomCode: 1 }); 
        res.status(200).json({ success: true, data: rooms });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getAllSemesters,
    getAllSubjects,
    getAllRooms
};