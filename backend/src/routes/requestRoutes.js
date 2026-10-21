const router = require('express').Router();
const {
  createRequest,
  listRequests,
  pendingForMe,
  getRequest,
  decide,
  cancelRequest,
} = require('../controllers/requestController');
const { protect, allow } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.route('/')
  .get(listRequests)
  .post(allow('student'), upload.single('attachment'), createRequest);

router.get('/pending', allow('tutor', 'hod'), pendingForMe);
router.get('/:id', getRequest);
router.put('/:id/decision', allow('tutor', 'hod', 'admin'), decide);
router.put('/:id/cancel', cancelRequest);

module.exports = router;
