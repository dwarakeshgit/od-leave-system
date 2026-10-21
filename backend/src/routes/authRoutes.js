const router = require('express').Router();
const {
  login,
  register,
  getRegistrationMeta,
  me,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.get('/meta', getRegistrationMeta);
router.get('/me', protect, me);
router.put('/password', protect, changePassword);

module.exports = router;
