const router = require('express').Router();
const { dashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/', protect, dashboard);

module.exports = router;
