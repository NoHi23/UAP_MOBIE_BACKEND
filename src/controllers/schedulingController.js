const Student = require('../models/student');
const Subject = require('../models/subject');
const Class = require('../models/class');
const Curriculum = require('../models/curriculum');
const CurriculumDetail = require('../models/curriculumDetail');
const Lecturer = require('../models/lecturer');
const Room = require('../models/room');
const Schedule = require('../models/schedule');
const ScheduleOfStudent = require('../models/scheduleOfStudent');
const ScheduleOfLecture = require('../models/scheduleOfLecture');
const Grade = require('../models/grade');
const Semester = require('../models/semester');
const GradeSummary = require('../models/gradeSummary')
const GradeComponent = require('../models/gradeComponent')

// --- BẢN ĐỒ THỜI GIAN CÁC SLOT ---
const slotTimes = [
    { slot: 1, startTime: '07:30', endTime: '09:50' },
    { slot: 2, startTime: '10:00', endTime: '12:20' },
    { slot: 3, startTime: '12:50', endTime: '15:10' },
    { slot: 4, startTime: '15:20', endTime: '17:40' },
    { slot: 5, startTime: '18:00', endTime: '20:20' },
    { slot: 6, startTime: '20:30', endTime: '22:50' }
];

// --- HÀM HELPER: LẤY SỐ THỨ TỰ CỦA TUẦN ---
const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};

// --- HÀM HELPER: KIỂM TRA MÔN TIÊN QUYẾT ---
const checkPrerequisites = async (studentId, targetSemester, curriculumId) => {
    if (targetSemester <= 1) return true;
    const previousSemester = targetSemester - 1;

    // 1. Tìm các môn học (subjectId) của kỳ trước đó
    const prevSemesterSubjects = await CurriculumDetail.find({
        curriculumId,
        cdSemester: previousSemester.toString()
    }).select('subjectId');

    if (prevSemesterSubjects.length === 0) return true; // Kỳ trước không có môn nào

    const prevSubjectIds = prevSemesterSubjects.map(s => s.subjectId);

    // --- LOGIC MỚI: TÍNH ĐIỂM TRUNG BÌNH TỪ GRADE ---
    for (const subjectId of prevSubjectIds) {
        // 2. Tìm tất cả điểm thành phần (Grade) của môn này
        const gradesForSubject = await Grade.find({ studentId, subjectId }).populate('componentId');

        // 3. Tìm tất cả các thành phần điểm của môn học đó
        const componentsForSubject = await GradeComponent.find({ subjectId });

        if (gradesForSubject.length === 0 || componentsForSubject.length === 0) {
            console.log(`[DEBUG] Sinh viên ${studentId} thiếu điểm thành phần hoặc cấu hình thành phần điểm cho môn ${subjectId}`);
            return false; // Chưa có điểm thành phần hoặc môn chưa có cấu hình thành phần điểm
        }

        // 4. Tính điểm trung bình có trọng số (ước lượng)
        let totalScore = 0;
        let totalWeight = 0;

        componentsForSubject.forEach(component => {
            const grade = gradesForSubject.find(g => g.componentId && g.componentId._id.equals(component._id)); // Thêm kiểm tra componentId tồn tại
            if (grade && component.weightPercentage != null) { // Thêm kiểm tra weightPercentage tồn tại
                totalScore += grade.score * (component.weightPercentage / 100);
                totalWeight += (component.weightPercentage / 100);
            } else {
                // Giả sử nếu thiếu điểm thành phần thì = 0
                // Bạn có thể xử lý phức tạp hơn nếu cần
                console.log(`[DEBUG] Thiếu điểm hoặc trọng số cho thành phần ${component.name} của môn ${subjectId}`);
            }
        });

        // Chuẩn hóa nếu tổng trọng số không phải 100% (hoặc lớn hơn 0)
        const finalScore = (totalWeight > 0) ? (totalScore / totalWeight) : 0;

        // 5. Kiểm tra điểm trung bình
        if (finalScore < 4) {
            console.log(`[DEBUG] Sinh viên ${studentId} trượt môn ${subjectId} (Điểm TB ước lượng: ${finalScore.toFixed(2)})`);
            return false; // Trượt môn
        }
    }
    // ------------------------------------------

    // Nếu qua tất cả các môn
    return true;
};

// --- HÀM HELPER: TÌM SLOT HỌC HỢP LỆ ---
const findValidScheduleSlot = (students, lecturers, rooms, conflictSet, semesterStartDate, scheduledSlotsForThisClass) => {
    const startDate = new Date(semesterStartDate);
    for (let dayOffset = 0; dayOffset < 15 * 7; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayOffset);

        const currentWeekNumber = getWeekNumber(currentDate);
        const slotsInCurrentWeek = scheduledSlotsForThisClass.filter(slot => getWeekNumber(new Date(slot.date)) === currentWeekNumber);

        if (slotsInCurrentWeek.length >= 2) {
            continue;
        }

        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0) continue;

        for (const slotPair of [[1, 2], [3, 4], [5, 6]]) {
            const lastSlotInfo = scheduledSlotsForThisClass.length > 0 ? scheduledSlotsForThisClass[scheduledSlotsForThisClass.length - 1] : null;
            const isLookingForSecondSlotOfPair = scheduledSlotsForThisClass.length % 2 !== 0;

            let targetSlot;
            if (isLookingForSecondSlotOfPair) {
                if (slotPair.indexOf(lastSlotInfo.slot) === -1) continue;
                targetSlot = (lastSlotInfo.slot === slotPair[0]) ? slotPair[1] : slotPair[0];

                const timeDiff = currentDate.getTime() - new Date(lastSlotInfo.date).getTime();
                if (timeDiff < (2 * 24 * 60 * 60 * 1000) || timeDiff > (4 * 24 * 60 * 60 * 1000)) {
                    continue;
                }
            } else {
                targetSlot = slotPair[0];
            }

            for (const lecturer of lecturers) {
                for (const room of rooms) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const lecturerConflictKey = `${lecturer._id}-${dateStr}-${targetSlot}`;
                    const roomConflictKey = `${room._id}-${dateStr}-${targetSlot}`;

                    if (conflictSet.has(lecturerConflictKey) || conflictSet.has(roomConflictKey)) continue;

                    let studentConflict = false;
                    for (const student of students) {
                        if (conflictSet.has(`${student._id}-${dateStr}-${targetSlot}`)) {
                            studentConflict = true;
                            break;
                        }
                    }

                    if (!studentConflict) {
                        return { date: currentDate, slot: targetSlot, lecturerId: lecturer._id, roomId: room._id };
                    }
                }
            }
        }
    }
    return null;
};

// --- CONTROLLER CHÍNH: XẾP LỊCH TỰ ĐỘNG ---
const generateSchedule = async (req, res) => {
    let processLogs = [];
    try {
        const { semesterId, majorId } = req.body;
        if (!semesterId || !majorId) return res.status(400).json({ message: 'Vui lòng cung cấp học kỳ và chuyên ngành.' });

        console.log(`[BẮT ĐẦU] Xếp lịch cho Major ID: ${majorId}, Semester ID: ${semesterId}`);
        processLogs.push(`[BẮT ĐẦU] Xếp lịch cho Major ID: ${majorId}, Semester ID: ${semesterId}`);

        const semester = await Semester.findById(semesterId);
        const curriculum = await Curriculum.findOne({ majorId: majorId, status: 'active' });
        if (!curriculum) return res.status(404).json({ message: 'Không tìm thấy chương trình học đang hoạt động cho chuyên ngành này.' });

        console.log(`[DỌN DẸP] Xóa dữ liệu lịch học cũ của học kỳ ${semester.semesterName}...`);
        processLogs.push(`[DỌN DẸP] Xóa dữ liệu lịch học cũ của học kỳ ${semester.semesterName}...`);
        const oldClasses = await Class.find({ className: { $regex: semester.semesterName } });
        const oldClassIds = oldClasses.map(c => c._id);

        if (oldClassIds.length > 0) {
            await Schedule.deleteMany({ classId: { $in: oldClassIds } });
            await ScheduleOfStudent.deleteMany({ classId: { $in: oldClassIds } });
            await ScheduleOfLecture.deleteMany({ classId: { $in: oldClassIds } });
            await Class.deleteMany({ _id: { $in: oldClassIds } });
        }
        console.log(`[DỌN DẸP] Đã xóa ${oldClassIds.length} lớp học cũ và các dữ liệu liên quan.`);
        processLogs.push(`[DỌN DẸP] Đã xóa ${oldClassIds.length} lớp học cũ và các dữ liệu liên quan.`);

        const studentsInMajor = await Student.find({ majorId });
        let eligibleStudents = [];
        for (const student of studentsInMajor) {
            const targetSemester = (student.semesterNo || 0) + 1;
            const hasPassed = await checkPrerequisites(student._id, targetSemester, curriculum._id);
            if (hasPassed) {
                eligibleStudents.push({ student, targetSemester });
            }
        }
        if (eligibleStudents.length === 0) return res.status(404).json({ message: 'Không có sinh viên nào đủ điều kiện để xếp lịch.' });
        console.log(`[BƯỚC 1] Tìm thấy ${eligibleStudents.length} sinh viên đủ điều kiện.`);
        processLogs.push(`[BƯỚC 1] Tìm thấy ${eligibleStudents.length} sinh viên đủ điều kiện.`);

        const lecturersForMajor = await Lecturer.find({ majorId });
        const allRooms = await Room.find({ status: true });
        if (lecturersForMajor.length === 0) return res.status(404).json({ message: 'Không tìm thấy giảng viên nào thuộc chuyên ngành này.' });
        if (allRooms.length === 0) return res.status(404).json({ message: 'Không có phòng học nào khả dụng.' });

        const commonSemester = eligibleStudents[0].targetSemester;
        const subjectsForSemester = await CurriculumDetail.find({ curriculumId: curriculum._id, cdSemester: commonSemester.toString() }).populate('subjectId');
        if (subjectsForSemester.length === 0) return res.status(404).json({ message: `Không tìm thấy môn học nào cho kỳ ${commonSemester} trong chương trình học.` });
        console.log(`[BƯỚC 2] Các môn cần xếp cho kỳ ${commonSemester}: ${subjectsForSemester.map(s => s.subjectId.subjectCode).join(', ')}`);
        processLogs.push(`[BƯỚC 2] Các môn cần xếp cho kỳ ${commonSemester}: ${subjectsForSemester.map(s => s.subjectId.subjectCode).join(', ')}`);

        let classesToSchedule = [];
        for (const detail of subjectsForSemester) {
            const studentsForSubject = eligibleStudents.filter(s => s.targetSemester === commonSemester);
            const numberOfClasses = Math.ceil(studentsForSubject.length / 30);
            for (let i = 0; i < numberOfClasses; i++) {
                const classStudents = studentsForSubject.slice(i * 30, (i + 1) * 30);
                const newClass = new Class({
                    className: `${detail.subjectId.subjectCode}-${semester.semesterName}-${i + 1}`,
                    subjectId: detail.subjectId._id,
                    roomId: allRooms[0]._id,
                    lecturerId: lecturersForMajor[0]._id
                });
                await newClass.save();
                classesToSchedule.push({ class: newClass, students: classStudents.map(s => s.student) });
                console.log(`   -> Đã tạo lớp ${newClass.className} với ${classStudents.length} sinh viên.`);
                processLogs.push(`   -> Đã tạo lớp ${newClass.className} với ${classStudents.length} sinh viên.`);

            }
        }

        console.log('[BƯỚC 3] Bắt đầu thuật toán xếp lịch...');
        processLogs.push('[BƯỚC 3] Bắt đầu thuật toán xếp lịch...');

        const conflictSet = new Set();
        for (const classToSchedule of classesToSchedule) {
            console.log(` -> Đang xếp lịch cho lớp: ${classToSchedule.class.className}`);
            processLogs.push(` -> Đang xếp lịch cho lớp: ${classToSchedule.class.className}`);

            let createdSchedules = [];
            let scheduledSlotsForThisClass = [];
            for (let i = 0; i < 20; i++) {
                const validSlot = findValidScheduleSlot(classToSchedule.students, lecturersForMajor, allRooms, conflictSet, semester.startDate, scheduledSlotsForThisClass);
                if (validSlot) {
                    const timeInfo = slotTimes.find(t => t.slot === validSlot.slot);
                    if (!timeInfo) {
                        console.error(`Lỗi cấu hình: Không tìm thấy thời gian cho slot ${validSlot.slot}`);
                        processLogs.push(`Lỗi cấu hình: Không tìm thấy thời gian cho slot ${validSlot.slot}`);
                        continue;
                    }

                    const newSchedule = new Schedule({
                        ...validSlot,
                        semesterId,
                        subjectId: classToSchedule.class.subjectId,
                        classId: classToSchedule.class._id,
                        startTime: timeInfo.startTime,
                        endTime: timeInfo.endTime
                    });

                    await newSchedule.save();
                    createdSchedules.push(newSchedule);
                    scheduledSlotsForThisClass.push(validSlot);
                    const dateStr = validSlot.date.toISOString().split('T')[0];
                    conflictSet.add(`${validSlot.lecturerId}-${dateStr}-${validSlot.slot}`);
                    conflictSet.add(`${validSlot.roomId}-${dateStr}-${validSlot.slot}`);
                    classToSchedule.students.forEach(student => conflictSet.add(`${student._id}-${dateStr}-${validSlot.slot}`));
                } else {
                    console.error(`   - LỖI: Không thể tìm thấy buổi học thứ ${i + 1} cho lớp ${classToSchedule.class.className}. Dừng xếp lịch cho lớp này.`);
                    processLogs.push(`   - LỖI: Không thể tìm thấy buổi học thứ ${i + 1} cho lớp ${classToSchedule.class.className}. Dừng xếp lịch cho lớp này.`);
                    break;
                }
            }

            if (createdSchedules.length > 0) {
                console.log(`[BƯỚC 4] Đang tạo bản ghi ghi danh cho lớp ${classToSchedule.class.className}`);
                processLogs.push(`[BƯỚC 4] Đang tạo bản ghi ghi danh cho lớp ${classToSchedule.class.className}`);

                const lecturerId = createdSchedules[0].lecturerId;
                for (const schedule of createdSchedules) {
                    await ScheduleOfLecture.create({ scheduleId: schedule._id, lecturerId });
                }
                for (const student of classToSchedule.students) {
                    const attendanceRecords = createdSchedules.map(schedule => ({ scheduleId: schedule._id }));
                    await ScheduleOfStudent.create({ studentId: student._id, classId: classToSchedule.class._id, attendance: attendanceRecords });
                }
            }
        }

        console.log('[HOÀN TẤT] Quá trình xếp lịch đã xong.');
        processLogs.push('[HOÀN TẤT] Quá trình xếp lịch đã xong.');

        res.status(200).json({ message: 'Hoàn tất quá trình xếp lịch!', classesScheduledCount: classesToSchedule.length, logs: processLogs });

    } catch (error) {
        console.error("Lỗi khi tạo lịch:", error);
        res.status(500).json({ message: 'Lỗi server khi đang tạo lịch.', error: error.message, logs: processLogs });
    }
};

module.exports = {
    generateSchedule
};