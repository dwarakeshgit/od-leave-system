const router = require('express').Router();
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(items);
  })
);

router.put(
  '/read',
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'All caught up' });
  })
);

module.exports = router;
