const crypto = require('crypto');

// Học kỳ dựa theo năm (base 2025)
const computeSemesterNo = (date = new Date()) => {
    const baseYear = 2025;
    const y = date.getFullYear();
    const n = Math.max(1, y - baseYear + 1);
    return { number: n, str2: String(n).padStart(2, '0') };
};

// Sinh mã duy nhất: majorCode + sem2 + 4 số
const generateUniqueCode = async ({ majorCode, sem2, model, field }) => {
    for (let i = 0; i < 10; i++) {
        const rand4 = Math.floor(1000 + Math.random() * 9000);
        const code = `${majorCode}${sem2}${rand4}`;
        const exists = await model.exists({ [field]: code });
        if (!exists) return code;
    }
    throw new Error('Không thể tạo mã duy nhất, vui lòng thử lại');
};

// Bỏ dấu nhưng GIỮ khoảng trắng
const removeDiacriticsKeepSpace = (s = '') =>
    s.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');

// TitleCase + bỏ dấu
const toTitleCaseNoDiacritics = (s = '') =>
    removeDiacriticsKeepSpace(s)
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

// Lấy initials IN HOA từ lastName
const getInitialsUpper = (s = '') => {
    const cleaned = removeDiacriticsKeepSpace(s).trim();
    if (!cleaned) return '';
    return cleaned
        .split(/\s+/)
        .filter(Boolean)
        .map(w => {
            const m = w.match(/[A-Za-z0-9]/);
            return m ? m[0].toUpperCase() : '';
        })
        .join('');
};

// Email Student: FirstName(no space) + Initials(LastName) + studentCode + @edu.vn
const makeStudentEmail = ({ firstName, lastName, studentCode }) => {
    const firstTitle = toTitleCaseNoDiacritics(firstName);
    const firstNoSpace = firstTitle.replace(/\s+/g, '');
    const lastInitials = getInitialsUpper(lastName);
    return `${firstNoSpace}${lastInitials}${studentCode}@student.edu.vn`;
};

// Email Lecturer: FirstName(no space) + Initials(LastName) + lecturerCode + @edu.vn
const makeLecturerEmail = ({ firstName, lastName, lecturerCode }) => {
    const firstTitle = toTitleCaseNoDiacritics(firstName);
    const firstNoSpace = firstTitle.replace(/\s+/g, '');
    const lastInitials = getInitialsUpper(lastName);
    return `${firstNoSpace}${lastInitials}${lecturerCode}@lecturer.edu.vn`;
};

// Mật khẩu ngẫu nhiên
const generateInitialPassword = (len = 12) => {
    const raw = crypto.randomBytes(16).toString('base64url');
    return raw.slice(0, len);
};

// Validate data URI ảnh
const isValidImageDataUri = (v) =>
    /^data:image\/(png|jpe?g|gif|webp);base64,/.test(v);

// Lấy các field cho phép từ object
const pick = (obj = {}, allowed = []) =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => allowed.includes(k))
  );

module.exports = {
    computeSemesterNo,
    generateUniqueCode,
    removeDiacriticsKeepSpace,
    toTitleCaseNoDiacritics,
    getInitialsUpper,
    makeStudentEmail,
    makeLecturerEmail,
    generateInitialPassword,
    isValidImageDataUri,
    pick,
};
