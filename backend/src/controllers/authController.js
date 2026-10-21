const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Department = require('../models/Department');
const ClassSection = require('../models/ClassSection');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const shape = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  rollNo: user.rollNo,
  registerNo: user.registerNo,
  year: user.year,
  phone: user.phone,
  department: user.department,
  classSection: user.classSection,
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Enter your email and password');
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select('+password')
    .populate('department classSection');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Email or password is incorrect');
  }
  if (!user.active) {
    res.status(403);
    throw new Error('This account has been deactivated. Contact the office.');
  }

  res.json({ token: signToken(user._id), user: shape(user) });
});

// POST /api/auth/register (public student self-registration)
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    rollNo,
    registerNo,
    department,
    classSection,
    year,
    phone,
  } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Full name is required');
  }

  if (!email || !email.trim()) {
    res.status(400);
    throw new Error('College email is required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    res.status(400);
    throw new Error('Please enter a valid email address');
  }

  if (!password) {
    res.status(400);
    throw new Error('Password is required');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long');
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    res.status(400);
    throw new Error('Passwords do not match');
  }

  // Duplicate email check
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409);
    throw new Error('An account with that email already exists');
  }

  // Duplicate roll number check (if provided)
  if (rollNo && rollNo.trim()) {
    const existingRoll = await User.findOne({ rollNo: rollNo.trim().toUpperCase() });
    if (existingRoll) {
      res.status(409);
      throw new Error('An account with that roll number already exists');
    }
  }

  // Duplicate register number check (if provided)
  if (registerNo && registerNo.trim()) {
    const existingReg = await User.findOne({ registerNo: registerNo.trim() });
    if (existingReg) {
      res.status(409);
      throw new Error('An account with that register number already exists');
    }
  }

  let deptId = undefined;
  if (department) {
    const deptDoc = await Department.findById(department);
    if (!deptDoc) {
      res.status(400);
      throw new Error('Selected department does not exist');
    }
    deptId = deptDoc._id;
  }

  let classId = undefined;
  let resolvedYear = year ? Number(year) : undefined;
  if (classSection) {
    const csDoc = await ClassSection.findById(classSection);
    if (!csDoc) {
      res.status(400);
      throw new Error('Selected class section does not exist');
    }
    classId = csDoc._id;
    if (!resolvedYear && csDoc.year) {
      resolvedYear = csDoc.year;
    }
    if (!deptId && csDoc.department) {
      deptId = csDoc.department;
    }
  }

  // Public registration MUST ALWAYS assign role = 'student'
  // Prevents any privilege escalation (admin, hod, tutor)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password, // Hashed by User model pre('save') hook
    role: 'student',
    rollNo: rollNo && rollNo.trim() ? rollNo.trim().toUpperCase() : undefined,
    registerNo: registerNo && registerNo.trim() ? registerNo.trim() : undefined,
    department: deptId,
    classSection: classId,
    year: resolvedYear,
    phone: phone && phone.trim() ? phone.trim() : undefined,
    active: true,
  });

  const populatedUser = await User.findById(user._id).populate('department classSection');

  res.status(201).json({
    message: 'Registration successful',
    token: signToken(user._id),
    user: shape(populatedUser),
  });
});

// GET /api/auth/meta (public dropdown metadata for registration)
const getRegistrationMeta = asyncHandler(async (req, res) => {
  const departments = await Department.find({}, 'name code').sort({ code: 1 });
  const classes = await ClassSection.find({}, 'name year section department').sort({
    year: 1,
    section: 1,
  });
  res.json({ departments, classes });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json(shape(req.user));
});

// PUT /api/auth/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters');
  }
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword || ''))) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password changed' });
});

module.exports = { login, register, getRegistrationMeta, me, changePassword, signToken, shape };
