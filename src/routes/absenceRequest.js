const router = require("express").Router();
const { verifyToken, authorize } = require("../middleware/authorization");
const ctrl = require("../controllers/absenceRequestController");

router.use(verifyToken);

router.post("/", authorize("student"), ctrl.submitAbsenceRequest);
router.get("/me", authorize("student"), ctrl.getMyAbsenceRequests);
router.get("/", authorize("staff", "admin"), ctrl.getAllAbsences);
router.get("/:id", authorize("staff", "admin"), ctrl.getAbsenceById);
router.put("/:id/review", authorize("staff", "admin"), ctrl.reviewAbsenceRequest);

module.exports = router;
