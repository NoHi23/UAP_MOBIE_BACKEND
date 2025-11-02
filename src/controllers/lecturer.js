const Class = require('../models/class');
const Lecturer = require('../models/lecturer');
const Account = require('../models/account');
const ScheduleOfStudent = require('../models/ScheduleOfStudent');
const ScheduleOfLecture = require('../models/scheduleOfLecture');
const Schedule = require('../models/schedule');
const Support = require('../models/support');

const Semester = require('../models/semester');
const Subject = require('../models/subject');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// GET /lecturer/classes — Lấy danh sách lớp giảng dạy của giảng viên

const getClasses = async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const schedules = await Schedule.find({ lecturerId }).populate('classId');
    const classMap = {};
    const classes = [];
    schedules.forEach(sch => {
      if (sch.classId && !classMap[sch.classId._id]) {
        classMap[sch.classId._id] = true;
        classes.push(sch.classId);
      }
    });
    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
};
// GET /lecturer/studentsbyclass/:classId?scheduleId=... — Lấy danh sách sinh viên của lớp, kèm thông tin điểm danh cho scheduleId nếu có

const getStudentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    // optional scheduleId query to include attendance for that schedule
    const { scheduleId } = req.query;
    if (!classId) return res.status(400).json({ success: false, message: 'classId is required' });

    // Query ScheduleOfStudent records for the class and populate student.accountId for email
    const scheduleRecords = await ScheduleOfStudent.find({ classId })
      .populate({ path: 'studentId', populate: { path: 'accountId', model: 'Account', select: 'email' } })
      .lean();

    const recordsArray = Array.isArray(scheduleRecords) ? scheduleRecords : (scheduleRecords ? [scheduleRecords] : []);

    // Helper to extract attendance entry for given scheduleId from a ScheduleOfStudent record
    const findAttendance = (sos, schId) => {
      if (!sos || !Array.isArray(sos.attendance) || !schId) return null;
      return sos.attendance.find(a => String(a.scheduleId) === String(schId)) || null;
    };

    const students = recordsArray
      .map(r => {
        const s = r.studentId;
        if (!s) return null;
        return {
          _id: s._id,
          studentCode: s.studentCode,
          studentAvatar: s.studentAvatar || null,
          firstName: s.firstName,
          lastName: s.lastName,
          phone: s.phone,
          email: s.accountId?.email || null,
          // If scheduleId provided, return that single attendance entry; otherwise return full attendance array so frontend can compute counts
          attendance: scheduleId ? findAttendance(r, scheduleId) : (Array.isArray(r.attendance) ? r.attendance : [])
        };
      })
      .filter(Boolean);

    return res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error('getStudentsByClass error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// GET /lecturer/semesters — Lấy danh sách kỳ học (trả về currentSemesterId nếu có)

const getSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find().sort({ startDate: -1 }).lean();
    const today = new Date();
    let currentSemesterId = null;
    for (const s of semesters) {
      if (s.startDate && s.endDate) {
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        if (start <= today && today <= end) {
          currentSemesterId = s._id;
          break;
        }
      }
    }
    const payload = semesters.map(s => ({ _id: s._id, semesterName: s.semesterName, startDate: s.startDate, endDate: s.endDate }));
    return res.status(200).json({ success: true, data: payload, currentSemesterId });
  } catch (err) {
    console.error('getSemesters error', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// GET /lecturer/semester-options?semesterId=...  -> Trả về danh sách lớp và môn (kèm lịch) của giảng viên trong kỳ học đó

const getSemesterOptions = async (req, res) => {
  try {
    const lecturerAccountId = req.user.id;
    const lecturer = await Lecturer.findOne({ accountId: lecturerAccountId });
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });

    const { semesterId } = req.query;
    if (!semesterId) return res.status(400).json({ success: false, message: 'semesterId is required' });

    // Find schedules for this lecturer in semester
    const schedules = await Schedule.find({ lecturerId: lecturer._id, semesterId })
      .populate('classId', 'className')
      .populate('subjectId', 'subjectName subjectCode')
      .populate('roomId', 'roomName roomCode')
      .sort({ date: 1, slot: 1 })
      .lean();

    const classesMap = {};
    const subjectsMap = {};

    for (const sch of schedules) {
      const cls = sch.classId || null;
      const subj = sch.subjectId || null;

      const schedEntry = {
        scheduleId: sch._id,
        date: sch.date,
        slot: sch.slot,
        startTime: sch.startTime,
        endTime: sch.endTime,
        room: sch.roomId ? (sch.roomId.roomName || sch.roomId.roomCode) : null
      };

      if (cls) {
        const cid = String(cls._id);
        if (!classesMap[cid]) classesMap[cid] = { classId: cls._id, className: cls.className || '', schedules: [] };
        classesMap[cid].schedules.push(schedEntry);
      }

      if (subj) {
        const sid = String(subj._id);
        if (!subjectsMap[sid]) subjectsMap[sid] = { subjectId: subj._id, subjectName: subj.subjectName || subj.subjectCode || '', subjectCode: subj.subjectCode || '', schedules: [] };
        subjectsMap[sid].schedules.push(schedEntry);
      }
    }

    const classes = Object.values(classesMap);
    const subjects = Object.values(subjectsMap);

    return res.status(200).json({ success: true, data: { classes, subjects } });
  } catch (err) {
    console.error('getSemesterOptions error', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// GET /lecturer/classes-by-semester?semesterId=...
// Trả về các teaching-instance (classId + subjectId) cùng schedules, start/end date, tổng số buổi và số sinh viên
const getClassesBySemester = async (req, res) => {
  try {
    const lecturerAccountId = req.user.id;
    const lecturer = await Lecturer.findOne({ accountId: lecturerAccountId });
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });

  const { semesterId, subject, subjectId } = req.query;

    // Lấy tất cả schedules của giảng viên — nếu semesterId không truyền sẽ lấy tất cả kỳ
    const baseFilter = { lecturerId: lecturer._id };
    if (semesterId) baseFilter.semesterId = semesterId;
    // If subjectId provided, filter at DB level
    if (subjectId) baseFilter.subjectId = subjectId;

    let schedules = await Schedule.find(baseFilter)
      .populate('classId', 'className classCode')
      .populate('subjectId', 'subjectName subjectCode')
      .populate('roomId', 'roomName roomCode')
      .lean();

    // Nếu truyền subject (chuỗi) (hoặc subjectId không cung cấp), lọc các schedule theo tên/mã môn (case-insensitive)
    if (!subjectId && subject && String(subject).trim() !== '') {
      const q = String(subject).trim().toLowerCase();
      schedules = schedules.filter(sch => {
        const sname = ((sch.subjectId && (sch.subjectId.subjectName || sch.subjectId.subjectCode)) || '') + '';
        return sname.toLowerCase().includes(q);
      });
    }

    // Nhóm theo classId + subjectId (teaching-instance)
    const groups = {};
    for (const sch of schedules) {
      const classId = sch.classId?._id || sch.classId;
      const subjectId = sch.subjectId?._id || sch.subjectId || 'no-subject';
      const key = `${classId}::${subjectId}`;
      if (!groups[key]) {
        groups[key] = {
          classId: classId,
          className: sch.classId?.className || '',
          classCode: sch.classId?.classCode || '',
          subjectId: subjectId,
          subjectName: sch.subjectId?.subjectName || '',
          subjectCode: sch.subjectId?.subjectCode || '',
          schedules: []
        };
      }
      groups[key].schedules.push({ scheduleId: sch._id, date: sch.date, slot: sch.slot, startTime: sch.startTime, endTime: sch.endTime, room: sch.roomId ? (sch.roomId.roomName || sch.roomId.roomCode) : null });
    }

    const out = [];
    for (const k of Object.keys(groups)) {
      const g = groups[k];
      const dates = g.schedules.map(s => new Date(s.date));
      const startDate = dates.length ? new Date(Math.min(...dates)) : null;
      const endDate = dates.length ? new Date(Math.max(...dates)) : null;
      const scheduleIds = g.schedules.map(s => String(s.scheduleId));

      // Count students for the class (ScheduleOfStudent documents)
      const studentCount = await ScheduleOfStudent.countDocuments({ classId: g.classId });

      out.push({
        ...g,
        totalSlots: g.schedules.length,
        startDate,
        endDate,
        scheduleIds,
        studentCount
      });
    }

    return res.status(200).json({ success: true, data: out });
  } catch (err) {
    console.error('getClassesBySemester error', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
// GET /lecturer/schedules/my-week — Lấy lịch giảng dạy tuần hiện tại của giảng viên

const getMyWeeklySchedule = async (req, res) => {
    // Hàm xác định thứ trong tuần từ ngày bất kỳ
    function getDayOfWeek(dateString) {
  const d = new Date(dateString);
  d.setHours(d.getHours() + 7); // Chuyển sang giờ VN
  const daysVN = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return { num: d.getDay(), name: daysVN[d.getDay()] };
    }
  try {
    console.log('DEBUG getMyWeeklySchedule: req.user =', req.user);
    const lecturer = await Lecturer.findOne({ accountId: req.user.id });
    console.log('DEBUG getMyWeeklySchedule: lecturer =', lecturer);
    if (!lecturer) {
      console.log('DEBUG getMyWeeklySchedule: Không tìm thấy giảng viên với accountId', req.user.id);
      return res.status(404).json({ message: "Không tìm thấy thông tin giảng viên." });
    }

    // Cho phép filter tuần bất kỳ qua body from/to (POST), nếu không có thì lấy tuần hiện tại
  let { from, to } = req.body;
  console.log('DEBUG getMyWeeklySchedule: from =', from, 'to =', to);
 
    let firstDay, lastDay;
    if (from && to) {
      firstDay = new Date(from);
      lastDay = new Date(to);
    } else {
      const now = new Date();
      firstDay = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Thứ 2
      lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 7)); // Chủ nhật
    }
    firstDay.setHours(0, 0, 0, 0);
    lastDay.setHours(23, 59, 59, 999);
    console.log('DEBUG getMyWeeklySchedule: firstDay =', firstDay, 'lastDay =', lastDay);

    const schedules = await Schedule.find({
      lecturerId: lecturer._id,
      date: { $gte: firstDay, $lte: lastDay }
    })
      .populate('subjectId', 'subjectName subjectCode')
      .populate('classId', 'className')
      .populate('roomId', 'roomName roomCode')
      .sort({ date: 1, slot: 1 });
    console.log('DEBUG getMyWeeklySchedule: schedules.length =', schedules.length);
    // Map lại dữ liệu để trả về lecturer info (vì model Schedule không có)
    // Additionally fetch ScheduleOfLecture records to determine lecture-level attendance (taught flag)
    const scheduleIds = schedules.map(s => String(s._id));
    const lectureRecords = await ScheduleOfLecture.find({ scheduleId: { $in: scheduleIds }, lecturerId: lecturer._id }).lean();
    const lectureMap = {};
    for (const lr of lectureRecords) {
      lectureMap[String(lr.scheduleId)] = lr;
    }

    const responseData = schedules.map(s => {
      const obj = s.toObject();
      const lr = lectureMap[String(s._id)];
      const taught = !!(lr && lr.attendance === true);
      return {
        ...obj,
        lecturer: { // Thêm thông tin giảng viên để frontend dễ tái sử dụng component
          _id: lecturer._id,
          firstName: lecturer.firstName,
          lastName: lecturer.lastName
        },
        lectureAttendance: lr || null,
        taught: taught
      };
    });

    // Count how many slots in this week the lecturer has marked as taught
    const attendedCount = responseData.filter(r => r.taught).length;

    console.log('API /lecturer/schedules/my-week trả về:', { success: true, attendedCount, data: responseData });
    res.status(200).json({ success: true, data: responseData, attendedCount });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

// Get current lecturer profile (based on logged-in account)

const getMyProfile = async (req, res) => {
  try {
    const accountId = req.user.id;
    const lecturer = await Lecturer.findOne({ accountId })
      .populate('majorId', 'majorName majorCode')
      .lean();
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });

    // Attach account info (email, role, status) if available
    if (lecturer.accountId) {
      try {
        const acct = await Account.findById(lecturer.accountId).select('email role status').lean();
        lecturer.account = acct || null;
      } catch (e) {
        lecturer.account = null;
      }
    } else {
      lecturer.account = null;
    }

    return res.status(200).json({ success: true, data: lecturer });
  } catch (err) {
    console.error('getMyProfile error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update current lecturer profile (allow editing a safe subset of fields)

const updateMyProfile = async (req, res) => {
  try {
    const accountId = req.user.id;
    const lecturer = await Lecturer.findOne({ accountId });
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });

  // Allowed updates: include citizenID and remove birthDate/birthPlace (not used)
  const allowed = ['lecturerAvatar', 'firstName', 'lastName', 'gender', 'phone', 'semester', 'semesterNo', 'curriculumId', 'majorId', 'citizenID'];
    const data = {};
    for (const k of allowed) {
      if (k in req.body) data[k] = req.body[k];
    }

    const updated = await Lecturer.findByIdAndUpdate(lecturer._id, { $set: data }, { new: true, runValidators: true });

    // Re-fetch and populate related fields (major) and attach account email so response shape
    // matches what frontend expects from getMyProfile
    const updatedFull = await Lecturer.findById(updated._id)
      .populate('majorId', 'majorName majorCode')
      .lean();

    if (updatedFull) {
      if (updatedFull.accountId) {
        try {
          const acct = await Account.findById(updatedFull.accountId).select('email role status').lean();
          updatedFull.account = acct || null;
        } catch (e) {
          updatedFull.account = null;
        }
      } else {
        updatedFull.account = null;
      }
    }

    return res.status(200).json({ success: true, data: updatedFull });
  } catch (err) {
    console.error('updateMyProfile error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};



// Thêm hàm getScheduleById nếu chưa có (an toàn để thêm ở cuối file)

const getScheduleById = async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const schedule = await Schedule.findById(scheduleId)
      .populate('subjectId', 'subjectName subjectCode')
      .populate({ path: 'classId', populate: { path: 'subjectId', model: 'Subject' } })
      .populate('roomId', 'roomName roomCode')
      // populate lecturer basic fields and include accountId so we can attach email
      .populate({ path: 'lecturerId', select: 'firstName lastName lecturerCode lecturerAvatar accountId' });

    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    // Attach lecturer account email (if accountId exists) so frontend can read schedule.lecturerId.email
    if (schedule.lecturerId && schedule.lecturerId.accountId) {
      try {
        const acct = await Account.findById(schedule.lecturerId.accountId).select('email').lean();
        if (acct) {
          // normalize to schedule.lecturerId.email for frontend compatibility
          schedule.lecturerId = schedule.lecturerId.toObject ? { ...schedule.lecturerId.toObject(), email: acct.email } : { ...schedule.lecturerId, email: acct.email };
        }
      } catch (e) {
        // ignore account fetch errors but keep schedule
        console.error('Failed to attach lecturer account email for schedule', scheduleId, e.message);
      }
    }

    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error getScheduleById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /lecturer/notifications/slots?scheduleId=...
// Trả về thông báo liên quan đến 1 schedule — chỉ lecturer phụ trách schedule đó mới xem được
const getNotificationsBySchedule = async (req, res) => {
  try {
    const lecturerAccountId = req.user.id;
    const lecturer = await Lecturer.findOne({ accountId: lecturerAccountId });
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });

    const scheduleId = req.query.scheduleId;
    if (!scheduleId) return res.status(400).json({ success: false, message: 'scheduleId is required' });

    const schedule = await Schedule.findById(scheduleId).lean();
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    // Authorization: ensure the lecturer is owner of the schedule (or is staff/admin — but this endpoint is lecturer-scoped)
    if (!schedule.lecturerId || String(schedule.lecturerId) !== String(lecturer._id)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thông báo cho tiết học này' });
    }

    const SlotNotification = require('../models/slotNotificationModel');
    const notifications = await SlotNotification.find({ scheduleId })
      .populate('senderId', 'email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    console.error('getNotificationsBySchedule error', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// POST /lecturer/notifications/slots
// Lecturer creates a slot notification for a schedule they teach
const createNotificationForSchedule = async (req, res) => {
  try {
    const lecturerAccountId = req.user.id;
    const lecturer = await Lecturer.findOne({ accountId: lecturerAccountId });
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });

    const { scheduleId, title, content } = req.body;
    if (!scheduleId || !title || !content) return res.status(400).json({ success: false, message: 'scheduleId, title and content are required' });

    const schedule = await Schedule.findById(scheduleId).lean();
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

    if (!schedule.lecturerId || String(schedule.lecturerId) !== String(lecturer._id)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này.' });
    }

    const SlotNotification = require('../models/slotNotificationModel');
    const senderId = req.user.id; // account id
    const notification = await SlotNotification.create({ scheduleId, title, content, senderId });

    return res.status(201).json({ success: true, message: 'Tạo thông báo thành công.', data: notification });
  } catch (err) {
    console.error('createNotificationForSchedule error', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// POST /lecturer/supports
// Create a support request for the logged-in lecturer (account id comes from token)
const createLecturerSupport = async (req, res) => {
  try {
    const accountId = req.user?.id;
    const { request } = req.body;
    if (!request || String(request).trim() === '') return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung yêu cầu hỗ trợ.' });

    const SupportModel = require('../models/support');
    const newSupport = await SupportModel.create({ accountId, request });
    return res.status(201).json({ success: true, message: 'Yêu cầu hỗ trợ đã được gửi thành công.', data: newSupport });
  } catch (err) {
    console.error('createLecturerSupport error', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// GET /lecturer/supports
// Get supports created by the logged-in lecturer
const getMySupports = async (req, res) => {
  try {
    const accountId = req.user?.id;
    const SupportModel = require('../models/support');
    const supports = await SupportModel.find({ accountId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, message: 'Danh sách yêu cầu hỗ trợ của bạn', data: supports });
  } catch (err) {
    console.error('getMySupports error', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};


// Tổng hợp điểm danh theo kỳ (cần semesterId). Tham số tuỳ chọn: classId, subjectId

const getAttendanceSummary = async (req, res) => {
  try {
    const lecturerAccountId = req.user.id;
    const lecturer = await Lecturer.findOne({ accountId: lecturerAccountId });
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });

    const { semesterId, classId, subjectId } = req.query;
    if (!semesterId) return res.status(400).json({ success: false, message: 'semesterId is required' });

    const filter = { lecturerId: lecturer._id, semesterId };
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;

    const schedules = await Schedule.find(filter)
      .populate('subjectId', 'subjectName subjectCode')
      .populate('classId', 'className')
      .populate('roomId', 'roomName roomCode')
      .sort({ date: 1, slot: 1 })
      .lean();

    // Decide grouping mode: if subjectId present and classId not present -> group by subject, else group by class
    const groupBySubject = !!(subjectId && !classId);

    const groups = {};
    for (const sch of schedules) {
      if (groupBySubject) {
        const sid = String(sch.subjectId?._id || sch.subjectId);
        if (!groups[sid]) groups[sid] = { subjectId: sch.subjectId?._id || sch.subjectId, subjectName: sch.subjectId?.subjectName || sch.subjectId?.subjectCode || '', subjectCode: sch.subjectId?.subjectCode || '', schedules: [] };
        groups[sid].schedules.push(sch);
      } else {
        const cid = String(sch.classId?._id || sch.classId);
        if (!groups[cid]) groups[cid] = { classId: sch.classId?._id || sch.classId, className: sch.classId?.className || '', subjectId: sch.subjectId?._id || sch.subjectId, subjectName: sch.subjectId?.subjectName || sch.subjectId?.subjectCode || '', schedules: [] };
        groups[cid].schedules.push(sch);
      }
    }

    const result = [];
    for (const key of Object.keys(groups)) {
      const g = groups[key];
        // Build scheduleId list for this group (normalize populated ids)
        const scheduleIds = g.schedules.map(s => String((s._id) ? s._id : s));

        // Fetch lecture-level records to determine which slots the lecturer already marked attendance for
        const lectureRecords = await ScheduleOfLecture.find({ scheduleId: { $in: scheduleIds }, lecturerId: lecturer._id }).lean();
        const lectureMap = {};
        for (const lr of lectureRecords) {
          lectureMap[String(lr.scheduleId)] = lr;
        }

        // Build per-schedule info with only lecture-level 'taught' flag
        const schedulesWithCounts = g.schedules.map(sch => {
          const lectureRec = lectureMap[String(sch._id)];
          const taught = !!(lectureRec && lectureRec.attendance === true);
          return {
            scheduleId: sch._id,
            date: sch.date,
            slot: sch.slot,
            startTime: sch.startTime,
            endTime: sch.endTime,
            room: sch.roomId ? (sch.roomId.roomName || sch.roomId.roomCode) : null,
            // include class info so frontend can show class when grouping by subject
            classId: sch.classId?._id || sch.classId || null,
            className: sch.classId?.className || sch.className || null,
            taught
          };
        });

        // totalSlots for this group: count of ScheduleOfLecture docs (slots recorded for this lecturer)
        const totalLectureSlots = lectureRecords.length;
        const taughtSlots = lectureRecords.filter(lr => lr.attendance === true).length;
        const notTaughtSlots = totalLectureSlots - taughtSlots;

        const out = groupBySubject ? {
          subjectId: g.subjectId,
          subjectName: g.subjectName,
          subjectCode: g.subjectCode,
          totalSlots: totalLectureSlots,
          taughtSlots,
          notTaughtSlots,
          schedules: schedulesWithCounts
        } : {
          classId: g.classId,
          className: g.className,
          subjectId: g.subjectId,
          subjectName: g.subjectName,
          totalSlots: totalLectureSlots,
          taughtSlots,
          notTaughtSlots,
          schedules: schedulesWithCounts
        };

      result.push(out);
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('getAttendanceSummary error', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

//------------------>  điểm danh theo lớp (single hoặc bulk)<-------------------------

const markAttendance = async (req, res) => {
  try {
    const payload = req.body;
    // Cho phép truyền 1 object hoặc mảng -> chuẩn hoá thành mảng items để xử lý chung
    const items = Array.isArray(payload) ? payload : [payload];

    // helper nhỏ: chuẩn hoá tên trạng thái attendance để tránh các biến thể (NotYet / Not Yet / Present...)
    const normalizeStatus = (s) => {
      if (!s) return 'Not Yet';
      const map = {
        'NotYet': 'Not Yet',
        'Not Yet': 'Not Yet',
        'Present': 'Present',
        'Absent': 'Absent',
        'Excused': 'Excused'
      };
      return map[s] || s;
    };

    // results sẽ chứa kết quả xử lý cho từng item (để frontend/để debug)
    const results = [];

    // Xử lý từng item: mỗi item cần có scheduleId và studentId
    for (const it of items) {
      const { scheduleId, studentId, status, note, date } = it || {};
      if (!scheduleId || !studentId) {
        // Nếu thiếu dữ liệu bắt buộc thì ghi lỗi cho item đó và chuyển tiếp
        results.push({ success: false, message: 'scheduleId and studentId required', item: it });
        continue;
      }

      // Lấy schedule từ DB để kiểm tra classId, date, và lecturer (nếu cần authorization sau này)
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        results.push({ success: false, message: 'Schedule not found', scheduleId });
        continue;
      }

      // Chỉ cho phép chấm điểm đúng ngày của schedule (so sánh theo YYYY-MM-DD)
      const schedDateStr = (new Date(schedule.date)).toISOString().slice(0,10);
      const attendanceDateStr = date ? (new Date(date)).toISOString().slice(0,10) : (new Date()).toISOString().slice(0,10);
      if (schedDateStr !== attendanceDateStr) {
        results.push({ success: false, message: 'Attendance allowed only on schedule date', scheduleId, expectedDate: schedDateStr, receivedDate: attendanceDateStr });
        continue;
      }

      // Tìm (hoặc tạo) record ScheduleOfStudent cho cặp classId + studentId
      // ScheduleOfStudent lưu attendance dưới dạng mảng subdocs { scheduleId, status, note }
      let sos = await ScheduleOfStudent.findOne({ classId: schedule.classId, studentId });
      if (!sos) {
        // Nếu chưa có document ScheduleOfStudent cho học sinh này trong lớp -> tạo mới
        sos = new ScheduleOfStudent({ classId: schedule.classId, studentId, attendance: [] });
      }

      // Tìm attendance entry đã tồn tại cho schedule này trong sos.attendance
      const schIdStr = String(scheduleId);
      const existing = Array.isArray(sos.attendance) ? sos.attendance.find(a => String(a.scheduleId) === schIdStr) : null;
      const normalizedStatus = normalizeStatus(status);

      if (existing) {
        // Nếu đã có entry -> cập nhật status và note (note giữ nguyên nếu không truyền mới)
        existing.status = normalizedStatus;
        existing.note = note || existing.note;
      } else {
        // Nếu chưa có entry -> push một entry mới vào mảng attendance
        sos.attendance.push({ scheduleId, status: normalizedStatus, note: note || '' });
      }

      // Lưu lại ScheduleOfStudent (upsert behavior nếu doc mới)
      await sos.save();
      // Ghi kết quả thành công cho item này
      results.push({ success: true, scheduleId, studentId });
    }

    // Sau khi xử lý xong tất cả items, kiểm tra từng schedule xem đã đầy đủ attendance cho cả lớp hay chưa
    // Nếu tất cả sinh viên trong lớp đã được đánh dấu (không còn 'Not Yet'), thì upsert flag attendance=true trong ScheduleOfLecture
    const scheduleIds = [...new Set(items.map(i => i?.scheduleId).filter(Boolean))];
    const schedulesChecked = [];
    for (const schId of scheduleIds) {
      try {
        const scheduleDoc = await Schedule.findById(schId);
        if (!scheduleDoc) continue;
        // Lấy tất cả ScheduleOfStudent cho lớp tương ứng
        const sosRecords = await ScheduleOfStudent.find({ classId: scheduleDoc.classId }).lean();
        if (!sosRecords || sosRecords.length === 0) continue; // nếu không có records thì bỏ qua

        // helper nhỏ để chuẩn hoá status thành string dễ so sánh
        const norm = (v) => {
          if (!v && v !== 0) return '';
          const s = String(v).trim().toLowerCase();
          if (s === 'notyet' || s === 'not yet' || s === 'not_yet' || s === 'noknown') return 'not yet';
          if (s === 'present') return 'present';
          if (s === 'absent') return 'absent';
          if (s === 'excused') return 'excused';
          return s;
        };

        // Nếu một ScheduleOfStudent không có entry cho schedule này -> coi như 'Not Yet'
        const anyNotYet = sosRecords.some(r => {
          const a = Array.isArray(r.attendance) ? r.attendance.find(x => String(x.scheduleId) === String(schId)) : null;
          if (!a) return true; // chưa có entry -> Not Yet
          const stNorm = norm(a.status || '');
          if (stNorm === '' || stNorm === 'not yet' || stNorm === 'notyet') return true;
          return false;
        });

        schedulesChecked.push({ scheduleId: schId, anyNotYet });
        if (!anyNotYet) {
          // Nếu không còn 'Not Yet' cho schedule này -> đánh dấu lecture-level attendance = true
          try {
            // Upsert vào ScheduleOfLecture để không sửa trực tiếp model Schedule
            await ScheduleOfLecture.findOneAndUpdate(
              { scheduleId: scheduleDoc._id, lecturerId: scheduleDoc.lecturerId },
              { attendance: true },
              { new: true, upsert: true }
            );
          } catch (err) {
            // Nếu upsert thất bại thì log để debug nhưng không phá vỡ flow
            console.error('Failed to update ScheduleOfLecture attendance flag for', schId, err);
          }
        } else {
          // Nếu còn ít nhất một học sinh chưa điểm danh -> đảm bảo lecture-level attendance = false
          // Lưu ý: ở đây ta chỉ update nếu record ScheduleOfLecture tồn tại (upsert: false)
          // để tránh tạo ra nhiều bản ghi có attendance=false không cần thiết.
          try {
            await ScheduleOfLecture.findOneAndUpdate(
              { scheduleId: scheduleDoc._id, lecturerId: scheduleDoc.lecturerId },
              { attendance: false },
              { new: true, upsert: false }
            );
          } catch (err) {
            console.error('Failed to clear ScheduleOfLecture attendance flag for', schId, err);
          }
        }
      } catch (err) {
        console.error('Error checking attendance completion for schedule', schId, err);
      }
    }

    // Trả về kết quả xử lý và thông tin diagnostic (schedulesChecked) để frontend hoặc dev kiểm tra
    return res.status(200).json({ success: true, results, schedulesChecked });
  } catch (error) {
    console.error('markAttendance error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


module.exports = {
  // Profile
  getMyProfile,
  updateMyProfile,
  // Classes & Students
  getClasses,
  getStudentsByClass,
  // Schedule
  getScheduleById,
  getMyWeeklySchedule,
  getSemesters,
  getSemesterOptions,
  getClassesBySemester,
  // Notifications
  getNotificationsBySchedule,
  createNotificationForSchedule,
  // Supports (lecturer-scoped)
  createLecturerSupport,
  getMySupports,
  // Attendance
  getAttendanceSummary,
  markAttendance
};
