const Request = require('../models/Request');
const User = require('../models/User');
const ClassSection = require('../models/ClassSection');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../utils/notify');
const { normalizeDate, eachDay, isSunday, formatDate } = require('../utils/dates');
const {
  applyRequestToAttendance,
  revertRequestFromAttendance,
} = require('../utils/attendanceSync');

const POPULATE = [
  { path: 'student', select: 'name rollNo email year phone parentPhone' },
  { path: 'classSection', select: 'name year section periodsPerDay' },
  { path: 'department', select: 'name code' },
  { path: 'approvals.approver', select: 'name role' },
];

// POST /api/requests   (student)
const createRequest = asyncHandler(async (req, res) => {
  const { type, category, fromDate, toDate, reason, venue } = req.body;
  let periods = req.body.periods;

  if (!type || !category || !fromDate || !toDate || !reason) {
    res.status(400);
    throw new Error('Fill in the type, category, dates and reason');
  }

  if (typeof periods === 'string') {
    periods = periods ? periods.split(',').map((n) => Number(n.trim())) : [];
  }
  periods = Array.isArray(periods) ? periods.filter((n) => Number.isInteger(n) && n > 0) : [];

  const from = normalizeDate(fromDate);
  const to = normalizeDate(toDate);
  if (to < from) {
    res.status(400);
    throw new Error('The end date cannot be before the start date');
  }

  const student = await User.findById(req.user._id);
  if (!student.classSection) {
    res.status(400);
    throw new Error('Your class is not assigned yet. Contact the office.');
  }

  // Block a second request that covers the same dates.
  const clash = await Request.findOne({
    student: student._id,
    status: { $in: ['pending', 'approved'] },
    fromDate: { $lte: to },
    toDate: { $gte: from },
  });
  if (clash) {
    res.status(409);
    throw new Error(`Request ${clash.ticket} already covers these dates`);
  }

  const workingDays = eachDay(from, to).filter((d) => !isSunday(d));
  if (workingDays.length === 0) {
    res.status(400);
    throw new Error('Those dates contain no working days');
  }

  const section = await ClassSection.findById(student.classSection).populate('tutor');

  const request = await Request.create({
    student: student._id,
    classSection: section._id,
    department: student.department,
    type,
    category,
    fromDate: from,
    toDate: to,
    periods,
    totalDays: workingDays.length,
    reason: reason.trim(),
    venue: venue ? venue.trim() : '',
    attachment: req.file ? `/uploads/${req.file.filename}` : '',
    currentStage: 'tutor',
    approvals: [
      { stage: 'tutor', approver: section.tutor ? section.tutor._id : undefined },
      { stage: 'hod' },
    ],
  });

  if (section.tutor) {
    await notify(
      section.tutor._id,
      `New ${type.toUpperCase()} request from ${student.name}`,
      `${formatDate(from)} to ${formatDate(to)} · ${request.ticket}`,
      '/approvals'
    );
  }
  await AuditLog.create({
    actor: student._id,
    action: 'request.created',
    request: request._id,
    details: `${request.ticket} submitted`,
  });

  res.status(201).json(await request.populate(POPULATE));
});

// GET /api/requests   (role aware)
const listRequests = asyncHandler(async (req, res) => {
  const { status, type, stage, from, to, q } = req.query;
  const filter = {};

  if (req.user.role === 'student') {
    filter.student = req.user._id;
  } else if (req.user.role === 'tutor') {
    const sections = await ClassSection.find({ tutor: req.user._id }).select('_id');
    filter.classSection = { $in: sections.map((s) => s._id) };
  } else if (req.user.role === 'hod') {
    filter.department = req.user.department ? req.user.department._id : null;
  }

  if (status) filter.status = status;
  if (type) filter.type = type;
  if (stage) filter.currentStage = stage;
  if (from || to) {
    filter.fromDate = {};
    if (from) filter.fromDate.$gte = normalizeDate(from);
    if (to) filter.fromDate.$lte = normalizeDate(to);
  }

  let query = Request.find(filter).populate(POPULATE).sort({ createdAt: -1 });
  let results = await query;

  if (q) {
    const needle = q.toLowerCase();
    results = results.filter(
      (r) =>
        r.ticket.toLowerCase().includes(needle) ||
        (r.student && r.student.name.toLowerCase().includes(needle)) ||
        (r.student && (r.student.rollNo || '').toLowerCase().includes(needle))
    );
  }

  res.json(results);
});

// GET /api/requests/pending   (tutor / hod inbox)
const pendingForMe = asyncHandler(async (req, res) => {
  const filter = { status: 'pending' };

  if (req.user.role === 'tutor') {
    const sections = await ClassSection.find({ tutor: req.user._id }).select('_id');
    filter.classSection = { $in: sections.map((s) => s._id) };
    filter.currentStage = 'tutor';
  } else if (req.user.role === 'hod') {
    filter.department = req.user.department ? req.user.department._id : null;
    filter.currentStage = 'hod';
  } else {
    res.status(403);
    throw new Error('Only tutors and HODs have an approval inbox');
  }

  const results = await Request.find(filter).populate(POPULATE).sort({ createdAt: 1 });
  res.json(results);
});

// GET /api/requests/:id
const getRequest = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id).populate(POPULATE);
  if (!request) {
    res.status(404);
    throw new Error('Request not found');
  }
  if (req.user.role === 'student' && request.student._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only open your own requests');
  }
  res.json(request);
});

function canAct(user, request) {
  if (user.role === 'admin') return true;
  if (user.role === 'tutor') return request.currentStage === 'tutor';
  if (user.role === 'hod') {
    return (
      request.currentStage === 'hod' &&
      user.department &&
      request.department.toString() === user.department._id.toString()
    );
  }
  return false;
}

// PUT /api/requests/:id/decision   body: { decision: 'approved' | 'rejected', comment }
const decide = asyncHandler(async (req, res) => {
  const { decision, comment = '' } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    res.status(400);
    throw new Error('Choose approve or reject');
  }

  const request = await Request.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error('Request not found');
  }
  if (request.status !== 'pending') {
    res.status(409);
    throw new Error(`This request was already ${request.status}`);
  }
  if (!canAct(req.user, request)) {
    res.status(403);
    throw new Error('This request is not waiting on you');
  }

  const stage = req.user.role === 'admin' ? request.currentStage : req.user.role;
  const step = request.approvals.find((s) => s.stage === stage);
  step.approver = req.user._id;
  step.status = decision;
  step.comment = comment;
  step.actedAt = new Date();

  let message;
  if (decision === 'rejected') {
    request.status = 'rejected';
    request.currentStage = 'done';
    message = `${request.ticket} was rejected by your ${stage}`;
  } else if (stage === 'tutor') {
    request.currentStage = 'hod';
    message = `${request.ticket} cleared by your tutor and sent to the HOD`;
  } else {
    request.status = 'approved';
    request.currentStage = 'done';
    message = `${request.ticket} is approved. Your attendance has been updated.`;
  }

  await request.save();

  let sync = null;
  if (request.status === 'approved') {
    sync = await applyRequestToAttendance(request);
    request.attendanceSynced = true;
    await request.save();
  }

  if (request.currentStage === 'hod') {
    const hods = await User.find({ role: 'hod', department: request.department, active: true });
    await Promise.all(
      hods.map((h) =>
        notify(h._id, `${request.ticket} needs your approval`, 'Cleared by the class tutor', '/approvals')
      )
    );
  }

  await notify(request.student, message, comment, '/my-requests');
  await AuditLog.create({
    actor: req.user._id,
    action: `request.${decision}`,
    request: request._id,
    details: `${stage} stage${comment ? `: ${comment}` : ''}`,
  });

  res.json({ request: await request.populate(POPULATE), sync });
});

// PUT /api/requests/:id/cancel   (student withdraws)
const cancelRequest = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error('Request not found');
  }
  const isOwner = request.student.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('You can only withdraw your own requests');
  }
  if (request.status === 'cancelled') {
    res.status(409);
    throw new Error('This request is already withdrawn');
  }
  if (request.status === 'approved' && req.user.role !== 'admin') {
    res.status(409);
    throw new Error('Approved requests can only be reverted by the office');
  }

  if (request.status === 'approved') {
    await revertRequestFromAttendance(request);
    request.attendanceSynced = false;
  }
  request.status = 'cancelled';
  request.currentStage = 'done';
  await request.save();

  await AuditLog.create({
    actor: req.user._id,
    action: 'request.cancelled',
    request: request._id,
    details: request.ticket,
  });

  res.json(await request.populate(POPULATE));
});

module.exports = {
  createRequest,
  listRequests,
  pendingForMe,
  getRequest,
  decide,
  cancelRequest,
};
