const User = require('../models/User');
const Department = require('../models/Department');
const ClassSection = require('../models/ClassSection');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/admin/users?role=&classSection=&q=
const listUsers = asyncHandler(async (req, res) => {
  const { role, classSection, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (classSection) filter.classSection = classSection;
  if (q) {
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
      { rollNo: new RegExp(q, 'i') },
    ];
  }
  const users = await User.find(filter)
    .populate('department classSection')
    .sort({ role: 1, rollNo: 1, name: 1 });
  res.json(users);
});

// POST /api/admin/users
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('Name, email, password and role are required');
  }
  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    res.status(409);
    throw new Error('An account with that email already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    phone: req.body.phone,
    department: req.body.department || undefined,
    rollNo: req.body.rollNo || undefined,
    registerNo: req.body.registerNo,
    classSection: req.body.classSection || undefined,
    year: req.body.year || undefined,
    parentPhone: req.body.parentPhone,
  });

  await AuditLog.create({
    actor: req.user._id,
    action: 'user.created',
    details: `${user.role} ${user.name}`,
  });

  res.status(201).json(await user.populate('department classSection'));
});

// PUT /api/admin/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const fields = [
    'name',
    'email',
    'role',
    'phone',
    'department',
    'rollNo',
    'registerNo',
    'classSection',
    'year',
    'parentPhone',
    'active',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined && req.body[f] !== '') user[f] = req.body[f];
  });
  if (req.body.password) user.password = req.body.password;
  await user.save();
  res.json(await user.populate('department classSection'));
});

// DELETE /api/admin/users/:id  (soft delete)
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.active = false;
  await user.save();
  res.json({ message: `${user.name} deactivated` });
});

// GET /api/admin/departments
const listDepartments = asyncHandler(async (req, res) => {
  res.json(await Department.find().populate('hod', 'name email').sort({ code: 1 }));
});

// POST /api/admin/departments
const createDepartment = asyncHandler(async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    res.status(400);
    throw new Error('Department name and code are required');
  }
  res.status(201).json(await Department.create({ name, code, hod: req.body.hod || undefined }));
});

// GET /api/admin/classes  (also used by tutors and HODs)
const listClasses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'tutor') filter.tutor = req.user._id;
  if (req.user.role === 'hod' && req.user.department) filter.department = req.user.department._id;
  const classes = await ClassSection.find(filter)
    .populate('department', 'name code')
    .populate('tutor', 'name email')
    .sort({ year: 1, section: 1 });
  res.json(classes);
});

// POST /api/admin/classes
const createClass = asyncHandler(async (req, res) => {
  const { name, year, section, department } = req.body;
  if (!name || !year || !section || !department) {
    res.status(400);
    throw new Error('Name, year, section and department are required');
  }
  const created = await ClassSection.create({
    name,
    year,
    section,
    department,
    tutor: req.body.tutor || undefined,
    periodsPerDay: req.body.periodsPerDay || 8,
    minAttendance: req.body.minAttendance || 75,
  });
  res.status(201).json(created);
});

// PUT /api/admin/classes/:id
const updateClass = asyncHandler(async (req, res) => {
  const section = await ClassSection.findById(req.params.id);
  if (!section) {
    res.status(404);
    throw new Error('Class not found');
  }
  ['name', 'year', 'section', 'department', 'tutor', 'periodsPerDay', 'minAttendance'].forEach(
    (f) => {
      if (req.body[f] !== undefined && req.body[f] !== '') section[f] = req.body[f];
    }
  );
  await section.save();
  res.json(section);
});

// GET /api/admin/audit
const listAudit = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find()
    .populate('actor', 'name role')
    .populate('request', 'ticket type')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json(logs);
});

module.exports = {
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
};
