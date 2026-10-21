const router = require('express').Router();
const {
  roster,
  markAttendance,
  myAttendance,
  studentAttendance,
  classReport,
  classReportCsv,
} = require('../controllers/attendanceController');
const { protect, allow } = require('../middleware/auth');

router.use(protect);

router.get('/me', allow('student'), myAttendance);
router.get('/roster', allow('tutor', 'hod', 'admin'), roster);
router.post('/mark', allow('tutor', 'hod', 'admin'), markAttendance);
router.get('/report', allow('tutor', 'hod', 'admin'), classReport);
router.get('/report.csv', allow('tutor', 'hod', 'admin'), classReportCsv);
router.get('/student/:id', allow('tutor', 'hod', 'admin'), studentAttendance);

module.exports = router;
