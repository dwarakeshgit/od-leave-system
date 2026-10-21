const Request = require('../models/Request');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const ClassSection = require('../models/ClassSection');
const asyncHandler = require('../utils/asyncHandler');
const { summarise } = require('../utils/attendanceSync');
const { dayjs } = require('../utils/dates');

// GET /api/dashboard
const dashboard = asyncHandler(async (req, res) => {
  const role = req.user.role;

  if (role === 'student') {
    const requests = await Request.find({ student: req.user._id }).sort({ createdAt: -1 }).limit(5);
    const counts = {
      pending: await Request.countDocuments({ student: req.user._id, status: 'pending' }),
      approved: await Request.countDocuments({ student: req.user._id, status: 'approved' }),
      rejected: await Request.countDocuments({ student: req.user._id, status: 'rejected' }),
    };
    const records = await Attendance.find({ student: req.user._id });
    const summary = summarise(records);
    return res.json({
      role,
      counts,
      attendance: summary,
      minAttendance: req.user.classSection ? req.user.classSection.minAttendance : 75,
      recent: requests,
    });
  }

  if (role === 'tutor') {
    const sections = await ClassSection.find({ tutor: req.user._id });
    const ids = sections.map((s) => s._id);
    const awaiting = await Request.countDocuments({
      classSection: { $in: ids },
      status: 'pending',
      currentStage: 'tutor',
    });
    const studentCount = await User.countDocuments({
      role: 'student',
      classSection: { $in: ids },
      active: true,
    });
    const todayCount = await Request.countDocuments({
      classSection: { $in: ids },
      createdAt: { $gte: dayjs().startOf('day').toDate() },
    });
    const onDutyToday = await Request.countDocuments({
      classSection: { $in: ids },
      status: 'approved',
      fromDate: { $lte: dayjs().endOf('day').toDate() },
      toDate: { $gte: dayjs().startOf('day').toDate() },
    });
    return res.json({
      role,
      classes: sections,
      counts: { awaiting, studentCount, todayCount, onDutyToday },
    });
  }

  if (role === 'hod') {
    const deptId = req.user.department ? req.user.department._id : null;
    const awaiting = await Request.countDocuments({
      department: deptId,
      status: 'pending',
      currentStage: 'hod',
    });
    const withTutors = await Request.countDocuments({
      department: deptId,
      status: 'pending',
      currentStage: 'tutor',
    });
    const approvedThisMonth = await Request.countDocuments({
      department: deptId,
      status: 'approved',
      updatedAt: { $gte: dayjs().startOf('month').toDate() },
    });
    const byCategory = await Request.aggregate([
      { $match: { department: deptId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return res.json({
      role,
      counts: { awaiting, withTutors, approvedThisMonth },
      byCategory,
    });
  }

  // admin
  const [students, staff, pending, approved] = await Promise.all([
    User.countDocuments({ role: 'student', active: true }),
    User.countDocuments({ role: { $in: ['tutor', 'hod'] }, active: true }),
    Request.countDocuments({ status: 'pending' }),
    Request.countDocuments({ status: 'approved' }),
  ]);
  return res.json({ role, counts: { students, staff, pending, approved } });
});

module.exports = { dashboard };
