const router = require('express').Router();
const {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  listDepartments,
  createDepartment,
  listClasses,
  createClass,
  updateClass,
  listAudit,
} = require('../controllers/adminController');
const { protect, allow } = require('../middleware/auth');

router.use(protect);

// Tutors and HODs need the class list to mark attendance and run reports.
router.get('/classes', allow('tutor', 'hod', 'admin'), listClasses);
router.get('/users', allow('tutor', 'hod', 'admin'), listUsers);

router.post('/users', allow('admin'), createUser);
router.put('/users/:id', allow('admin'), updateUser);
router.delete('/users/:id', allow('admin'), deactivateUser);
router.get('/departments', allow('admin', 'hod'), listDepartments);
router.post('/departments', allow('admin'), createDepartment);
router.post('/classes', allow('admin'), createClass);
router.put('/classes/:id', allow('admin'), updateClass);
router.get('/audit', allow('admin'), listAudit);

module.exports = router;
