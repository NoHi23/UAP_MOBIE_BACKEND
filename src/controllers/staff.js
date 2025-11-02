const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const XLSX = require('xlsx');
const fs = require('fs');
const { sendWelcomeEmail, sendResetPasswordEmail } = require('../services/emailService');
const validator = require('validator');
const Account = require('../models/account');
const Student = require('../models/student');
const Lecturer = require('../models/lecturer');
const Major = require('../models/major');
const Class = require('../models/class')
const Curriculum = require('../models/curriculum')
const Subject = require('../models/subject')
const CurriculumDetail = require('../models/curriculumDetail');
const Schedule = require('../models/schedule');
const ScheduleOfStudent = require('../models/scheduleOfStudent');


const {
    computeSemesterNo,
    generateUniqueCode,
    makeStudentEmail,
    makeLecturerEmail,
    generateInitialPassword,
    isValidImageDataUri,
    pick
} = require('../helpers/staff.helpers');
const subject = require('../models/subject');

// Helper: parse possible Excel date formats or strings to JS Date
function parseExcelDate(v) {
    if (v === undefined || v === null || v === '') return null;
    // If numeric (Excel date serial)
    if (typeof v === 'number') {
        // Excel's epoch starts at 1900-01-01 with a leap year bug; use common conversion
        const date = new Date(Math.round((v - 25569) * 86400 * 1000));
        return isNaN(date.getTime()) ? null : date;
    }
    // If already a Date
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    // Try to parse ISO or common date strings
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
}

// ==========STUDENT=============

// create account
const createStudentAccount = async (req, res) => {
    try {
        const {
            firstName, lastName, citizenID, gender, phone,
            majorId, curriculumId, avatarBase64,
            personalEmail,
            address,
            dateOfBirth
        } = req.body;

        // Validate cơ bản
        if (!firstName || !lastName || !citizenID || typeof gender === 'undefined' ||
            !phone || !majorId || !curriculumId || !avatarBase64 || !personalEmail || !address || !dateOfBirth) {
            return res.status(400).json({ message: 'Thiếu dữ liệu đầu vào' });
        }

        if (!isValidImageDataUri(avatarBase64)) {
            return res.status(400).json({ message: 'studentAvatar phải là data URI base64 của ảnh (png/jpg/jpeg/gif/webp)' });
        }

        if (!validator.isEmail(personalEmail)) {
            return res.status(400).json({ message: 'personalEmail không đúng định dạng email' });
        }

        // Check trùng citizenID & personalEmail
        const citizenTaken = await Student.exists({ citizenID });
        if (citizenTaken) return res.status(409).json({ message: 'CitizenID đã tồn tại cho Student' });

        const personalTaken = await Account.exists({ personalEmail });
        if (personalTaken) return res.status(409).json({ message: 'personalEmail đã tồn tại trên hệ thống' });

        const major = await Major.findById(majorId).lean();
        if (!major) return res.status(404).json({ message: 'Major không tồn tại' });

        const { number: semesterNo, str2: sem2 } = computeSemesterNo();

        const studentCode = await generateUniqueCode({
            majorCode: major.majorCode, sem2,
            model: Student, field: 'studentCode'
        });

        // Tạo email trường
        const baseEmail = makeStudentEmail({ firstName, lastName, studentCode });
        let finalEmail = baseEmail;
        if (await Account.exists({ email: finalEmail })) {
            const suffix = Math.floor(100 + Math.random() * 900);
            finalEmail = baseEmail.replace('@edu.vn', `${suffix}@edu.vn`);
            if (await Account.exists({ email: finalEmail })) {
                return res.status(409).json({ message: 'Không thể tạo email duy nhất, vui lòng thử lại' });
            }
        }

        const plainPassword = generateInitialPassword(12);
        const hashed = await bcrypt.hash(plainPassword, 10);

        // Tạo Account kèm personalEmail
        const account = await Account.create({
            email: finalEmail,
            personalEmail,
            password: hashed,
            role: 'student',
            status: true
        });

        let student;
        try {
            // validate dateOfBirth
            const dob = new Date(dateOfBirth);
            if (isNaN(dob.getTime())) {
                await Account.deleteOne({ _id: account._id }).catch(() => { });
                return res.status(400).json({ message: 'dateOfBirth không hợp lệ' });
            }

            student = await Student.create({
                studentCode,
                studentAvatar: avatarBase64,
                firstName,
                lastName,
                citizenID,
                gender,
                phone,
                dateOfBirth: dob,
                semester: sem2,
                semesterNo,
                curriculumId,
                accountId: account._id,
                majorId,
                address               // ✅ NEW
            });
        } catch (err) {
            await Account.deleteOne({ _id: account._id }).catch(() => { });
            throw err;
        }

        // Gửi email
        let emailSent = true;
        try {
            await sendWelcomeEmail({
                to: personalEmail,
                fullName: `${lastName} ${firstName}`,
                schoolEmail: finalEmail,
                initialPassword: plainPassword
            });
        } catch (mailErr) {
            console.error('Gửi email thất bại:', mailErr);
            emailSent = false;
        }

        return res.status(201).json({
            message: 'Tạo account student thành công',
            emailSent,
            account: {
                _id: account._id,
                email: account.email,
                personalEmail: account.personalEmail,
                role: account.role,
                status: account.status,
                createdAt: account.createdAt
            },
            student: {
                _id: student._id,
                studentCode: student.studentCode,
                firstName: student.firstName,
                lastName: student.lastName,
                citizenID: student.citizenID,
                gender: student.gender,
                phone: student.phone,
                semester: student.semester,
                semesterNo: student.semesterNo,
                major: {
                    _id: major._id,
                    majorName: major.majorName,
                    majorCode: major.majorCode
                },
                curriculumId: student.curriculumId,
                accountId: student.accountId,
                address: student.address,
                createdAt: student.createdAt
            },
            initialPassword: plainPassword
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'server error' });
    }
};

//import Student from excel
const importStudentsExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Không có file Excel được tải lên' });

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const createdStudents = [];
        const failed = [];

        for (const [i, row] of rows.entries()) {
            try {
                const { firstName, lastName, citizenID, gender, phone, majorCode, curriculumId, address } = row; // ✅ bỏ avatarBase64

                // Accept multiple possible column names for DOB
                const dobRaw = row.dateOfBirth || row.dob || row.DOB || row.DateOfBirth || row.ngaySinh || row['Ngày sinh'];
                const dob = parseExcelDate(dobRaw);

                // Validate cơ bản
                if (!firstName || !lastName || !citizenID || typeof gender === 'undefined' || !phone || !majorCode || !curriculumId || !address || !dob) {
                    throw new Error(`Thiếu dữ liệu ở dòng ${i + 2}`);
                }

                // Check trùng citizenID
                if (await Student.exists({ citizenID })) throw new Error(`CitizenID ${citizenID} đã tồn tại`);

                // Tìm Major theo majorCode
                const major = await Major.findOne({ majorCode }).lean();
                if (!major) throw new Error(`MajorCode "${majorCode}" không tồn tại`);

                const { number: semesterNo, str2: sem2 } = computeSemesterNo();

                const studentCode = await generateUniqueCode({
                    majorCode: major.majorCode, sem2,
                    model: Student, field: 'studentCode'
                });

                const email = makeStudentEmail({ firstName, lastName, studentCode });
                let finalEmail = email;
                if (await Account.exists({ email })) {
                    const suffix = Math.floor(100 + Math.random() * 900);
                    finalEmail = email.replace('@edu.vn', `${suffix}@edu.vn`);
                }

                const plainPassword = generateInitialPassword(12);
                const hashed = await bcrypt.hash(plainPassword, 10);

                const account = await Account.create({
                    email: finalEmail,
                    password: hashed,
                    role: 'student',
                    status: true
                });

                const student = await Student.create({
                    studentCode,
                    firstName,
                    lastName,
                    citizenID,
                    gender,
                    phone,
                    dateOfBirth: dob,
                    semester: sem2,
                    semesterNo,
                    curriculumId,
                    accountId: account._id,
                    majorId: major._id,
                    address             // ✅ Lưu vào DB
                });

                createdStudents.push({
                    studentCode,
                    email: finalEmail,
                    password: plainPassword,
                    fullName: `${firstName} ${lastName}`,
                    majorCode
                });

            } catch (err) {
                failed.push({ row: i + 2, error: err.message });
            }
        }

        fs.unlinkSync(req.file.path);

        return res.status(201).json({
            message: 'Import hoàn tất',
            successCount: createdStudents.length,
            failCount: failed.length,
            createdStudents,
            failed
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'server error' });
    }
};




//get student by ID
const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;

        // Tìm sinh viên theo ID và populate Account và Major
        const s = await Student.findById(id)
            .populate('majorId', 'majorName majorCode') // Populate thông tin Major
            .populate('accountId', 'email role status personalEmail') // Populate thông tin Account
            .lean(); // Sử dụng lean() để trả về kết quả dưới dạng plain object (không phải mongoose document)

        if (!s) return res.status(404).json({ message: 'Student không tồn tại' });

        // Trả về dữ liệu đã populate
        return res.json({
            _id: s._id,
            studentCode: s.studentCode,
            studentAvatar: s.studentAvatar,
            firstName: s.firstName,
            lastName: s.lastName,
            citizenID: s.citizenID,
            gender: s.gender,
            phone: s.phone,
            semester: s.semester,
            semesterNo: s.semesterNo,
            curriculumId: s.curriculumId,
            address: s.address,  // Thêm địa chỉ của sinh viên
            account: s.accountId ? {
                _id: s.accountId._id,
                email: s.accountId.email,
                role: s.accountId.role,
                status: s.accountId.status,
                personalEmail: s.accountId.personalEmail
            } : null, // Populate account thông qua accountId
            major: s.majorId ? {
                _id: s.majorId._id,
                majorName: s.majorId.majorName,
                majorCode: s.majorId.majorCode
            } : null, // Populate major thông qua majorId
            dateOfBirth: s.dateOfBirth || null,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'server error' });
    }
};



// get all student (có lọc, tìm kiếm, phân trang, sắp xếp)
const listStudents = async (req, res) => {
    try {
        const {
            q = "",                 // tìm kiếm theo tên, mã, email
            major = "",             // lọc theo majorId
            page = "1",
            limit = "20",
            sort = "-createdAt",    // sắp xếp mới nhất trước
            fields = ""             // chọn field trả về
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        // Điều kiện lọc
        const where = {};
        if (q) {
            where.$or = [
                { firstName: { $regex: q, $options: "i" } },
                { lastName: { $regex: q, $options: "i" } },
                { studentCode: { $regex: q, $options: "i" } },
            ];
        }
        if (major) where.majorId = major;

        // Projection (chọn field)
        const projection = {};
        if (fields) {
            fields
                .split(",")
                .map(s => s.trim())
                .filter(Boolean)
                .forEach(f => (projection[f] = 1));
        }

        // Truy vấn DB
        const [items, total] = await Promise.all([
            Student.find(where, Object.keys(projection).length ? projection : undefined)
                .populate('accountId', 'email')
                .populate('majorId', 'majorName majorCode')
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Student.countDocuments(where),
        ]);

        // ✅ Trả JSON chuẩn RESTful
        return res.json({
            data: items,
            meta: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (e) {
        console.error('❌ Lỗi listStudents:', e);
        return res.status(500).json({ message: 'Server error', error: e.message });
    }
};


//update student
const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;

        if ('citizenID' in req.body) {
            return res.status(400).json({ message: 'Không được cập nhật citizenID' });
        }
        if ('email' in req.body) {
            return res.status(400).json({ message: 'Không được cập nhật email qua student; email thuộc Account' });
        }

        // Chỉ cho phép cập nhật những trường an toàn theo yêu cầu: phone, majorId, curriculumId, address, dateOfBirth
        const allowed = [
            'phone', 'majorId', 'curriculumId', 'address', 'dateOfBirth'
        ];
        const data = pick(req.body, allowed);

        // Loại bỏ các trường có giá trị rỗng (chuỗi rỗng) để tránh lỗi cast ObjectId
        Object.keys(data).forEach((k) => {
            if (data[k] === "" || data[k] === null || typeof data[k] === 'undefined') {
                delete data[k];
            }
        });

        // Nếu majorId hoặc curriculumId được gửi lên, kiểm tra tính hợp lệ của ObjectId
        const { Types } = mongoose;
        if (data.majorId && !Types.ObjectId.isValid(data.majorId)) {
            return res.status(400).json({ message: 'majorId không hợp lệ' });
        }
        if (data.curriculumId && !Types.ObjectId.isValid(data.curriculumId)) {
            return res.status(400).json({ message: 'curriculumId không hợp lệ' });
        }
        // Nếu dateOfBirth được gửi lên, kiểm tra hợp lệ
        if (data.dateOfBirth) {
            const dob = new Date(data.dateOfBirth);
            if (isNaN(dob.getTime())) {
                return res.status(400).json({ message: 'dateOfBirth không hợp lệ' });
            }
            data.dateOfBirth = dob;
        }

        const updated = await Student.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) return res.status(404).json({ message: 'Student không tồn tại' });

        return res.json({ message: 'Cập nhật student thành công', student: updated });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'server error' });
    }
};


//delete Student
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;

        const s = await Student.findById(id).lean();
        if (!s) return res.status(404).json({ message: 'Student không tồn tại' });

        // xóa student trước
        await Student.deleteOne({ _id: id });

        // rồi xóa account (nếu có)
        if (s.accountId) {
            await Account.deleteOne({ _id: s.accountId }).catch(err => {
                console.error('Delete linked Account failed:', err);
            });
        }

        return res.json({ message: 'Xoá student (và account liên kết) thành công' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'server error' });
    }
};


// ========LECTURER=========

//Create lecturer
const createLecturerAccount = async (req, res) => {
    try {
        const { firstName, lastName, citizenID, gender, phone, majorId, curriculumId, address, dateOfBirth } = req.body; // ✅ thêm address, dateOfBirth

        if (!firstName || !lastName || !citizenID || typeof gender === 'undefined' ||
            !phone || !majorId || !curriculumId || !address || !dateOfBirth) { // ✅ buộc có address & dateOfBirth
            return res.status(400).json({ message: 'Thiếu dữ liệu đầu vào' });
        }

        const citizenTaken = await Lecturer.exists({ citizenID });
        if (citizenTaken) return res.status(409).json({ message: 'CitizenID đã tồn tại cho Lecturer' });

        const major = await Major.findById(majorId).lean();
        if (!major) return res.status(404).json({ message: 'Major không tồn tại' });

        const { number: semesterNo, str2: sem2 } = computeSemesterNo();

        const lecturerCode = await generateUniqueCode({
            majorCode: major.majorCode, sem2,
            model: Lecturer, field: 'lecturerCode'
        });

        const email = makeLecturerEmail({ firstName, lastName, lecturerCode });
        let finalEmail = email;
        if (await Account.exists({ email })) {
            const suffix = Math.floor(100 + Math.random() * 900);
            finalEmail = email.replace('@edu.vn', `${suffix}@edu.vn`);
            if (await Account.exists({ email: finalEmail })) {
                return res.status(409).json({ message: 'Không thể tạo email duy nhất, vui lòng thử lại' });
            }
        }

        const plainPassword = generateInitialPassword(12);
        const hashed = await bcrypt.hash(plainPassword, 10);

        const account = await Account.create({
            email: finalEmail,
            password: hashed,
            role: 'lecture',
            status: true
        });

        let lecturer;
        try {
            const dob = new Date(dateOfBirth);
            if (isNaN(dob.getTime())) {
                await Account.deleteOne({ _id: account._id }).catch(() => { });
                return res.status(400).json({ message: 'dateOfBirth không hợp lệ' });
            }

            lecturer = await Lecturer.create({
                lecturerCode,
                lecturerAvatar: req.body.lecturerAvatar || '',
                firstName,
                lastName,
                citizenID,
                gender,
                phone,
                dateOfBirth: dob,
                semester: sem2,
                semesterNo,
                curriculumId,
                accountId: account._id,
                majorId,
                address
            });
        } catch (err) {
            await Account.deleteOne({ _id: account._id }).catch(() => { });
            throw err;
        }

        return res.status(201).json({
            message: 'Tạo account lecture thành công',
            account: {
                _id: account._id,
                email: account.email,
                role: account.role,
                status: account.status,
                createdAt: account.createdAt
            },
            lecturer: {
                _id: lecturer._id,
                lecturerCode: lecturer.lecturerCode,
                firstName: lecturer.firstName,
                lastName: lecturer.lastName,
                citizenID: lecturer.citizenID,
                gender: lecturer.gender,
                phone: lecturer.phone,
                semester: lecturer.semester,
                semesterNo: lecturer.semesterNo,
                major: {
                    _id: major._id,
                    majorName: major.majorName,
                    majorCode: major.majorCode
                },
                curriculumId: lecturer.curriculumId,
                accountId: lecturer.accountId,
                address: lecturer.address,
                createdAt: lecturer.createdAt
            },
            initialPassword: plainPassword
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'server error' });
    }
};

//import Lecturer from Excel
const importLecturersExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Không có file Excel được tải lên' });

        // Đọc file Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const createdLecturers = [];
        const failed = [];

        for (const [i, row] of rows.entries()) {
            try {
                const { firstName, lastName, citizenID, gender, phone, majorId, curriculumId, lecturerAvatar, address } = row; // ✅ thêm address

                // parse DOB from multiple possible column names
                const dobRaw = row.dateOfBirth || row.dob || row.DOB || row.DateOfBirth || row.ngaySinh || row['Ngày sinh'];
                const dob = parseExcelDate(dobRaw);

                // Validate dữ liệu cơ bản
                if (!firstName || !lastName || !citizenID || typeof gender === 'undefined' || !phone || !majorId || !curriculumId || !address || !dob) {
                    throw new Error(`Thiếu dữ liệu ở dòng ${i + 2}`);
                }

                if (lecturerAvatar && !isValidImageDataUri(lecturerAvatar)) {
                    throw new Error(`Avatar không hợp lệ ở dòng ${i + 2}`);
                }

                // Check trùng citizenID
                const citizenTaken = await Lecturer.exists({ citizenID });
                if (citizenTaken) throw new Error(`CitizenID ${citizenID} đã tồn tại`);

                // Check major tồn tại
                const major = await Major.findById(majorId).lean();
                if (!major) throw new Error(`MajorId ${majorId} không tồn tại`);

                // Sinh mã giảng viên
                const { number: semesterNo, str2: sem2 } = computeSemesterNo();

                const lecturerCode = await generateUniqueCode({
                    majorCode: major.majorCode, sem2,
                    model: Lecturer, field: 'lecturerCode'
                });

                // Sinh email
                const email = makeLecturerEmail({ firstName, lastName, lecturerCode });
                let finalEmail = email;
                if (await Account.exists({ email })) {
                    const suffix = Math.floor(100 + Math.random() * 900);
                    finalEmail = email.replace('@edu.vn', `${suffix}@edu.vn`);
                    if (await Account.exists({ email: finalEmail })) {
                        throw new Error(`Không thể tạo email duy nhất cho ${citizenID}`);
                    }
                }

                // Sinh password
                const plainPassword = generateInitialPassword(12);
                const hashed = await bcrypt.hash(plainPassword, 10);

                // Tạo Account
                const account = await Account.create({
                    email: finalEmail,
                    password: hashed,
                    role: 'lecture',
                    status: true
                });

                // Tạo Lecturer
                const lecturer = await Lecturer.create({
                    lecturerCode,
                    lecturerAvatar: lecturerAvatar || '',
                    firstName,
                    lastName,
                    citizenID,
                    gender,
                    phone,
                    dateOfBirth: dob,
                    semester: sem2,
                    semesterNo,
                    curriculumId,
                    accountId: account._id,
                    majorId,
                    address              // ✅ NEW (lưu vào DB)
                });

                createdLecturers.push({
                    lecturerCode,
                    email: finalEmail,
                    password: plainPassword,
                    fullName: `${firstName} ${lastName}`
                });

            } catch (err) {
                failed.push({ row: i + 2, error: err.message });
            }
        }

        // Xoá file sau khi đọc
        fs.unlinkSync(req.file.path);

        return res.status(201).json({
            message: 'Import giảng viên hoàn tất',
            successCount: createdLecturers.length,
            failCount: failed.length,
            createdLecturers,
            failed
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'server error' });
    }
};


//get lecturer by ID
const getLecturerById = async (req, res) => {
    try {
        const { id } = req.params;

        const l = await Lecturer.findById(id).lean();
        if (!l) return res.status(404).json({ message: 'Lecturer không tồn tại' });

        const [major, account] = await Promise.all([
            Major.findById(l.majorId).lean(),
            Account.findById(l.accountId).lean()
        ]);

        return res.json({
            _id: l._id,
            lecturerCode: l.lecturerCode,
            lecturerAvatar: l.lecturerAvatar,
            firstName: l.firstName,
            lastName: l.lastName,
            citizenID: l.citizenID,
            gender: l.gender,
            phone: l.phone,
            semester: l.semester,
            semesterNo: l.semesterNo,
            curriculumId: l.curriculumId,
            account: account ? {
                _id: account._id,
                email: account.email,
                role: account.role,
                status: account.status
            } : null,
            major: major ? {
                _id: major._id,
                majorName: major.majorName,
                majorCode: major.majorCode
            } : null,
            dateOfBirth: l.dateOfBirth || null,
            createdAt: l.createdAt,
            updatedAt: l.updatedAt
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'server error' });
    }
};

//list lecturer
const listLecturers = async (req, res) => {
    try {
        const {
            q = "",
            major = "",
            page = "1",
            limit = "20",
            sort = "-createdAt",
            fields = ""
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const where = {};
        if (q) {
            where.$or = [
                { firstName: { $regex: q, $options: "i" } },
                { lastName: { $regex: q, $options: "i" } },
                { lecturerCode: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } }, // nếu model Lecturer có trường email
            ];
        }
        if (major) where.majorId = major;

        const projection = {};
        if (fields) {
            fields.split(",").map(s => s.trim()).filter(Boolean).forEach(f => projection[f] = 1);
        }

        const [items, total] = await Promise.all([
            Lecturer
                .find(where, Object.keys(projection).length ? projection : undefined)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Lecturer.countDocuments(where)
        ]);

        return res.json({
            data: items,
            meta: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "server error" });
    }
};


//update lecturer
const updateLecturer = async (req, res) => {
    try {
        const { id } = req.params;

        if ('citizenID' in req.body) {
            return res.status(400).json({ message: 'Không được cập nhật citizenID' });
        }
        if ('email' in req.body) {
            return res.status(400).json({ message: 'Không được cập nhật email qua lecturer; email thuộc Account' });
        }

        const allowed = [
            'lecturerAvatar', 'firstName', 'lastName', 'gender', 'phone',
            'semester', 'semesterNo', 'curriculumId', 'majorId',
            'address', 'dateOfBirth' // ✅ NEW
        ];
        const data = pick(req.body, allowed);

        if (data.lecturerAvatar && !isValidImageDataUri(data.lecturerAvatar)) {
            return res.status(400).json({ message: 'lecturerAvatar phải là data URI base64 (png/jpg/jpeg/gif/webp)' });
        }

        // validate dateOfBirth if present
        if (data.dateOfBirth) {
            const dob = new Date(data.dateOfBirth);
            if (isNaN(dob.getTime())) {
                return res.status(400).json({ message: 'dateOfBirth không hợp lệ' });
            }
            data.dateOfBirth = dob;
        }

        const updated = await Lecturer.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) return res.status(404).json({ message: 'Lecturer không tồn tại' });

        return res.json({ message: 'Cập nhật lecturer thành công', lecturer: updated });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'server error' });
    }
};


// delete lecturer
const deleteLecturer = async (req, res) => {
    try {
        const { id } = req.params;

        const l = await Lecturer.findById(id).lean();
        if (!l) return res.status(404).json({ message: 'Lecturer không tồn tại' });

        await Lecturer.deleteOne({ _id: id });

        if (l.accountId) {
            await Account.deleteOne({ _id: l.accountId }).catch(err => {
                console.error('Delete linked Account failed:', err);
            });
        }

        return res.json({ message: 'Xoá lecturer (và account liên kết) thành công' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'server error' });
    }
};

// reset password
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { personalEmail } = req.body;

        // Validate email
        if (!validator.isEmail(personalEmail)) {
            return res.status(400).json({ message: 'Email cá nhân không hợp lệ' });
        }

        // Generate random password
        const newPassword = generateInitialPassword(12);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Find Account by accountId
        const account = await Account.findById(id);
        if (!account) {
            return res.status(404).json({ message: 'Account không tồn tại' });
        }

        // Check if the personal email matches the account email
        if (account.personalEmail !== personalEmail) {
            return res.status(400).json({ message: 'Email không khớp với tài khoản' });
        }

        // Update password for the account
        account.password = hashedPassword;
        // Đánh dấu lại là lần đăng nhập đầu tiên sau khi reset mật khẩu
        account.isFirstLogin = true;
        await account.save();

        // Get the user associated with this account (Student or Lecturer)
        let user;
        if (account.role === 'student') {
            // Find the student document by accountId (stored on the student)
            user = await Student.findOne({ accountId: id }).lean();
        } else if (account.role === 'lecturer') {
            // Find the lecturer document by accountId
            user = await Lecturer.findOne({ accountId: id }).lean();
        }

        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại' });
        }

        // Send the new password to the user's personal email
        let emailSent = true;
        let emailError = null;
        try {
            await sendResetPasswordEmail({
                to: personalEmail,
                fullName: `${user.firstName} ${user.lastName}`,
                schoolEmail: account.email,
                newPassword: newPassword
            });
        } catch (mailErr) {
            console.error('Gửi email thất bại:', mailErr);
            emailSent = false;
            // capture message for debugging (returned only in dev or for troubleshooting)
            emailError = mailErr?.message || String(mailErr);
        }

        return res.status(200).json({
            message: `${account.role === 'student' ? 'Sinh viên' : 'Giảng viên'} mật khẩu đã được reset thành công`,
            emailSent,
            ...(emailError ? { emailError } : {}),
            account: {
                _id: account._id,
                email: account.email,
                role: account.role,
                status: account.status,
                createdAt: account.createdAt
            },
            user: {
                _id: user._id,
                fullName: `${user.firstName} ${user.lastName}`,
                role: account.role
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'server error' });
    }
};



const getEligibleStudentsForManualEnroll = async (req, res) => {
    try {
        const { subjectId, semesterId } = req.query;
        if (!subjectId || !semesterId) {
            return res.status(400).json({ message: 'Vui lòng cung cấp môn học và học kỳ.' });
        }

        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).json({ message: 'Không tìm thấy môn học.' });
        const curriculum = await Curriculum.findOne({ majorId: subject.majorId, status: 'active' });
        if (!curriculum) return res.status(404).json({ message: 'Không tìm thấy chương trình học.' });
        // Tìm kỳ học mục tiêu dựa trên môn học này
        const detail = await CurriculumDetail.findOne({ curriculumId: curriculum._id, subjectId: subjectId });
        if (!detail) return res.status(404).json({ message: 'Môn học không thuộc chương trình học.' });
        const targetSemester = parseInt(detail.cdSemester);

        // Tìm tất cả sinh viên trong chuyên ngành
        const studentsInMajor = await Student.find({ majorId: subject.majorId });

        // Lọc sinh viên đủ điều kiện tiên quyết
        let eligibleStudents = [];
        for (const student of studentsInMajor) {
            const currentSemesterNo = student.semesterNo || 0;
            if (currentSemesterNo + 1 === targetSemester) { // Chỉ xét SV đúng kỳ
                const hasPassed = await checkPrerequisites(student._id, targetSemester, curriculum._id);
                if (hasPassed) {
                    eligibleStudents.push(student);
                }
            }
        }

        // Tìm những sinh viên đã có lịch học môn này trong kỳ này
        const existingSchedules = await Schedule.find({ subjectId, semesterId }).select('classId');
        const existingClassIds = existingSchedules.map(s => s.classId);
        const alreadyEnrolledStudents = await ScheduleOfStudent.find({ classId: { $in: existingClassIds } }).select('studentId');
        const alreadyEnrolledStudentIds = new Set(alreadyEnrolledStudents.map(e => e.studentId.toString()));

        // Lọc ra những sinh viên chưa được ghi danh
        const availableStudents = eligibleStudents.filter(student => !alreadyEnrolledStudentIds.has(student._id.toString()));

        res.status(200).json({ success: true, data: availableStudents });

    } catch (error) {
        console.error("Lỗi khi tìm sinh viên đủ điều kiện:", error);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};


const createManualClass = async (req, res) => {
    try {
        const { className, subjectId, roomId, lecturerId } = req.body;
        if (!className || !subjectId || !roomId || !lecturerId) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đủ thông tin lớp học.' });
        }

        // Kiểm tra trùng tên lớp (có thể thêm kiểm tra cả subjectId)
        const existingClass = await Class.findOne({ className });
        if (existingClass) {
            return res.status(400).json({ message: 'Tên lớp này đã tồn tại.' });
        }

        const newClass = new Class({
            className,
            subjectId,
            roomId,
            lecturerId,
            // status có thể để mặc định là true
        });
        await newClass.save();

        res.status(201).json({ success: true, message: 'Tạo lớp thủ công thành công.', data: newClass });

    } catch (error) {
        console.error("Lỗi khi tạo lớp thủ công:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ.', errors: error.errors });
        }
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

const enrollStudentsManually = async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentIds } = req.body;

        if (!studentIds || !Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'Vui lòng cung cấp danh sách ID sinh viên.' });
        }
        if (studentIds.length > 30) {
            return res.status(400).json({ message: 'Số lượng sinh viên không được vượt quá 30.' });
        }

        const targetClass = await Class.findById(classId);
        if (!targetClass) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học.' });
        }

        // Kiểm tra xem các sinh viên có hợp lệ không (có thể thêm kiểm tra đã enroll chưa)
        const validStudents = await Student.find({ _id: { $in: studentIds } });
        if (validStudents.length !== studentIds.length) {
            return res.status(400).json({ message: 'Một hoặc nhiều ID sinh viên không hợp lệ.' });
        }

        // Tạo các bản ghi ScheduleOfStudent
        const enrollmentPromises = studentIds.map(studentId => {
            return ScheduleOfStudent.create({
                studentId: studentId,
                classId: classId,
                attendance: [] // Mảng điểm danh ban đầu rỗng
            });
        });

        await Promise.all(enrollmentPromises);

        res.status(200).json({ success: true, message: `Đã ghi danh ${studentIds.length} sinh viên vào lớp ${targetClass.className}.` });

    } catch (error) {
        console.error("Lỗi khi ghi danh thủ công:", error);
        // Bắt lỗi unique nếu sinh viên đã được ghi danh vào lớp này rồi
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Một hoặc nhiều sinh viên đã tồn tại trong lớp này.' });
        }
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};



module.exports = {
    //STUDENT
    createStudentAccount,
    importStudentsExcel,
    getStudentById,
    listStudents,
    updateStudent,
    deleteStudent,
    //LECTURER
    createLecturerAccount,
    importLecturersExcel,
    getLecturerById,
    listLecturers,
    updateLecturer,
    deleteLecturer,
    resetPassword,
    getEligibleStudentsForManualEnroll,
    createManualClass,
    enrollStudentsManually
};
