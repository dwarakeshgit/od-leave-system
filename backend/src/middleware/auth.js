const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Sign in to continue');
  }
  const token = header.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    res.status(401);
    throw new Error('Your session expired. Sign in again.');
  }
  const user = await User.findById(decoded.id).populate('department classSection');
  if (!user || !user.active) {
    res.status(401);
    throw new Error('This account is no longer active');
  }
  req.user = user;
  next();
});

const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error('You do not have access to this action');
  }
  next();
};

module.exports = { protect, allow };
