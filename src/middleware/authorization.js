const jwt = require('jsonwebtoken');

// Middleware 1: Xác thực token
const verifyToken = (req, res, next) => {
    let token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Yêu cầu cần xác thực.' });
    }
    
    try {
        token = token.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // <<-- GIẢI PHÁP -->>
        req.UserID = decoded.id; // Giữ lại theo ý bạn
        req.user = decoded;      // Thêm để middleware phân quyền hoạt động
        
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token không hợp lệ.' });
    }
};

// Middleware 2: Phân quyền dựa trên vai trò (giữ nguyên)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    authorize
};