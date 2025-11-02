
const router = require('express').Router();
const { verifyToken, authorize } = require('../middleware/authorization');
const ctrl = require('../controllers/announcement');

// chỉ staff/admin được tạo/sửa/xóa; mọi role đã đăng nhập có thể xem list
router.get('/', verifyToken, ctrl.listAnnouncements);
router.get('/:id', verifyToken, ctrl.getAnnouncement);

router.post('/', verifyToken, authorize('staff', 'admin'), ctrl.createAnnouncement);
router.put('/:id', verifyToken, authorize('staff', 'admin'), ctrl.updateAnnouncement);
router.delete('/:id', verifyToken, authorize('staff', 'admin'), ctrl.deleteAnnouncement);

module.exports = router;
