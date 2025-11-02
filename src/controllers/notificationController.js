const SlotNotification = require('../models/slotNotificationModel');
const ScheduleOfStudent = require('../models/scheduleOfStudent');
const Student = require('../models/student');
const Schedule = require('../models/schedule');
const Account = require('../models/account');

    
const getMySlotNotifications = async (req, res) => {
    try {
        const student = await Student.findOne({ accountId: req.user.id });
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy sinh viên.' });
        }

        const enrollments = await ScheduleOfStudent.find({ studentId: student._id }).select('classId');
        if (!enrollments || enrollments.length === 0) {
            return res.status(200).json({ success: true, count: 0, data: [] }); 
        }
        const enrolledClassIds = enrollments.map(e => e.classId);

        const schedules = await Schedule.find({ classId: { $in: enrolledClassIds } }).select('_id');
        const scheduleIds = schedules.map(s => s._id);

        const notifications = await SlotNotification.find({ scheduleId: { $in: scheduleIds } })
            .populate({
                path: 'scheduleId',
                select: 'classId subjectId date slot',
                populate: [
                    { path: 'classId', select: 'className' },
                    { path: 'subjectId', select: 'subjectName subjectCode' },
                ]
            })
            .populate('senderId', 'email role')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: notifications.length, data: notifications });

    } catch (error) {
        console.error("Lỗi khi lấy thông báo slot:", error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

const getNotificationsForSlot = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const accountId = req.user.id; 

        const schedule = await Schedule.findById(scheduleId).select('classId').lean();
        if (!schedule) {
            return res.status(404).json({ message: 'Không tìm thấy buổi học.' });
        }
        

        const notifications = await SlotNotification.find({ scheduleId: scheduleId })
            .populate('senderId', 'email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: notifications.length, data: notifications });

    } catch (error) {
        console.error("Lỗi khi lấy thông báo slot:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const createSlotNotification = async (req, res) => {
    try {
        const { scheduleId, title, content } = req.body;
        const senderId = req.user.id; 

        const schedule = await Schedule.findById(scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Lịch học này không tồn tại.' });
        }

        const notification = await SlotNotification.create({
            scheduleId,
            title,
            content,
            senderId
        });
        
        res.status(201).json({ success: true, message: "Tạo thông báo thành công.", data: notification });

    } catch (error) {
        res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', error: error.message });
    }
};

module.exports = {
    getMySlotNotifications,
    createSlotNotification,
    getNotificationsForSlot
};