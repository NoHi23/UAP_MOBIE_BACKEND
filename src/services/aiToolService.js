const Student = require('../models/student');
const Lecturer = require('../models/lecturer');
const Schedule = require('../models/schedule');
const ScheduleOfStudent = require('../models/scheduleOfStudent');
const Subject = require('../models/subject');
const TuitionFee = require('../models/tuitionFeeModel');
const dayjs = require('dayjs');

const get_schedule_for_date = async (accountId, date) => {
    try {
        console.log(`[TOOL] get_schedule_for_date | accountId: ${accountId}, date: ${date}`);
        const student = await Student.findOne({ accountId });
        if (!student) return { error: "Không tìm thấy sinh viên." };

        const targetDate = dayjs(date);
        const startOfDay = targetDate.startOf('day').toDate();
        const endOfDay = targetDate.endOf('day').toDate();

        const enrollments = await ScheduleOfStudent.find({ studentId: student._id });
        if (!enrollments.length) return { schedule: [] };

        const classIds = enrollments.map(e => e.classId);
        const schedules = await Schedule.find({
            classId: { $in: classIds },
            date: { $gte: startOfDay, $lte: endOfDay }
        })
            .populate('subjectId', 'subjectName subjectCode')
            .populate('roomId', 'roomName')
            .populate('lecturerId', 'firstName lastName')
            .sort({ slot: 1 })
            .lean();

        return { schedule: schedules };
    } catch (e) {
        return { error: e.message };
    }
};

const get_schedule_for_week = async (accountId, date) => {
    try {
        console.log(`[TOOL] get_schedule_for_week | accountId: ${accountId}, date: ${date}`);
        const student = await Student.findOne({ accountId });
        if (!student) return { error: "Không tìm thấy sinh viên." };

        const targetDate = dayjs(date);
        const firstDay = targetDate.startOf('week').add(1, 'day').toDate(); // Thứ 2
        const lastDay = targetDate.endOf('week').add(1, 'day').toDate();   // Chủ Nhật

        const enrollments = await ScheduleOfStudent.find({ studentId: student._id });
        if (!enrollments.length) return { schedule: [] };

        const classIds = enrollments.map(e => e.classId);
        const schedules = await Schedule.find({
            classId: { $in: classIds },
            date: { $gte: firstDay, $lte: lastDay }
        })
            .populate('subjectId', 'subjectName subjectCode')
            .populate('roomId', 'roomName')
            .populate('lecturerId', 'firstName lastName')
            .sort({ date: 1, slot: 1 })
            .lean();

        return { schedule: schedules };
    } catch (e) {
        return { error: e.message };
    }
};


const get_tuition_fee = async (accountId) => {
    try {
        console.log(`[TOOL] get_tuition_fee | accountId: ${accountId}`);
        const student = await Student.findOne({ accountId });
        if (!student) return { error: "Không tìm thấy sinh viên." };

        const tuition = await TuitionFee.findOne({ studentId: student._id, status: 'unpaid' });
        if (!tuition) return { message: "Bạn không có công nợ học phí nào." };

        return { tuition };
    } catch (e) {
        return { error: e.message };
    }
};

const get_subject_info = async (subjectCode) => {
    try {
        console.log(`[TOOL] get_subject_info | subjectCode: ${subjectCode}`);
        const subject = await Subject.findOne({ subjectCode: subjectCode.toUpperCase() });
        if (!subject) return { error: "Không tìm thấy môn học." };

        return { subject: { subjectName: subject.subjectName, subjectCode: subject.subjectCode, subjectNoCredit: subject.subjectNoCredit } };
    } catch (e) {
        return { error: e.message };
    }
};

const get_classmates_list = async (accountId, className) => {
    try {
        console.log(`[TOOL] get_classmates_list | className: ${className}`);
        const targetClass = await Class.findOne({ className: className });
        if (!targetClass) return { error: "Không tìm thấy lớp học." };

        // Kiểm tra sinh viên có trong lớp này không
        const student = await Student.findOne({ accountId });
        const isEnrolled = await ScheduleOfStudent.exists({ studentId: student._id, classId: targetClass._id });
        if (!isEnrolled) return { error: "Bạn không ở trong lớp này." };

        const enrollments = await ScheduleOfStudent.find({ classId: targetClass._id }).populate('studentId', 'firstName lastName studentCode');
        const students = enrollments.map(e => e.studentId);

        return { className: targetClass.className, classmates: students };
    } catch (e) {
        return { error: e.message };
    }
};

const toolFunctions = {
    'get_schedule_for_date': get_schedule_for_date,
    'get_schedule_for_week': get_schedule_for_week,
    'get_tuition_fee': get_tuition_fee,
    'get_subject_info': get_subject_info,
    'get_classmates_list': get_classmates_list,
};
const executeTool = async (toolName, args, accountId) => {
    const tool = toolFunctions[toolName];
    if (!tool) {
        return { error: `Tool "${toolName}" không tồn tại.` };
    }

    try {
        // Tự động điều phối tham số chính xác
        if (toolName === 'get_schedule_for_date') {
            return await tool(accountId, args.date);
        }
        if (toolName === 'get_schedule_for_week') {
            return await tool(accountId, args.date);
        }
        if (toolName === 'get_tuition_fee') {
            return await tool(accountId);
        }
        if (toolName === 'get_subject_info') {
            return await tool(args.subjectCode);
        }
        if (toolName === 'get_classmates_list') {
            return await tool(accountId, args.className);
        }

    } catch (e) {
        console.error(`Lỗi khi thực thi tool ${toolName}:`, e);
        return { error: `Lỗi khi chạy công cụ ${toolName}.` };
    }
};

module.exports = {
    executeTool
};