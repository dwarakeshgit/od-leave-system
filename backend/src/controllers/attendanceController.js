const Attendance = require('../models/Attendance');
const User = require('../models/User');
const ClassSection = require('../models/ClassSection');
const asyncHandler = require('../utils/asyncHandler');
const { normalizeDate, dayjs } = require('../utils/dates');
const { summarise } = require('../utils/attendanceSync');

// GET /api/attendance/roster?classSection=&date=&period=
// Returns every student in the class with the status already recorded for
// that period, so approved OD/leave shows up pre-filled and locked.
const roster = asyncHandler(async (req, res) => {
  const { classSection, date, period } = req.query;
  if (!classSection || !date || !period) {
    res.status(400);
    throw new Error('Choose a class, a date and a period');
  }
  const day = normalizeDate(date);
  const periodNo = Number(period);

  const students = await User.find({ role: 'student', classSection, active: true })
    .select('name rollNo')
    .sort({ rollNo: 1 });

  const records = await Attendance.find({
    student: { $in: students.map((s) => s._id) },
    date: day,
  });

  const rows = students.map((student) => {
    const record = records.find((r) => r.student.toString() === student._id.toString());
    const slot = record && record.periods.find((p) => p.period === periodNo);
    return {
      student: { _id: student._id, name: student.name, rollNo: student.rollNo },
      status: slot ? slot.status : 'present',
      source: slot ? slot.source : null,
      locked: Boolean(slot && slot.source === 'auto'),
    };
  });

  res.json({ date: day, period: periodNo, rows });
});

// POST /api/attendance/mark
// body: { classSection, date, period, subject, entries: [{ student, status }] }
const markAttendance = asyncHandler(async (req, res) => {
  const { classSection, date, period, subject = '', entries } = req.body;
  if (!classSection || !date || !period || !Array.isArray(entries)) {
    res.status(400);
    throw new Error('Send the class, date, period and the list of students');
  }
  const day = normalizeDate(date);
  const periodNo = Number(period);
  let saved = 0;
  let skipped = 0;

  for (const entry of entries) {
    let record = await Attendance.findOne({ student: entry.student, date: day });
    if (!record) {
      record = new Attendance({ student: entry.student, classSection, date: day, periods: [] });
    }
    const slot = record.periods.find((p) => p.period === periodNo);

    // An approved OD or leave always wins over a manual entry.
    if (slot && slot.source === 'auto') {
      skipped += 1;
      continue;
    }
    if (slot) {
      slot.status = entry.status;
      slot.subject = subject;
      slot.source = 'faculty';
    } else {
      record.periods.push({ period: periodNo, status: entry.status, subject, source: 'faculty' });
    }
    record.periods.sort((a, b) => a.period - b.period);
    record.markedBy = req.user._id;
    await record.save();
    saved += 1;
  }

  res.json({ message: `Attendance saved for ${saved} students`, saved, skippedAutoEntries: skipped });
});

// GET /api/attendance/me?from=&to=   (student)
const myAttendance = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = { student: req.user._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = normalizeDate(from);
    if (to) filter.date.$lte = normalizeDate(to);
  }
  const records = await Attendance.find(filter).sort({ date: -1 });
  const section = req.user.classSection;

  res.json({
    summary: summarise(records),
    minAttendance: section ? section.minAttendance : 75,
    days: records.map((r) => ({
      date: r.date,
      periods: r.periods,
    })),
  });
});

// GET /api/attendance/student/:id?from=&to=   (staff)
const studentAttendance = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = { student: req.params.id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = normalizeDate(from);
    if (to) filter.date.$lte = normalizeDate(to);
  }
  const student = await User.findById(req.params.id).select('name rollNo year');
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  const records = await Attendance.find(filter).sort({ date: -1 });
  res.json({
    student,
    summary: summarise(records),
    days: records.map((r) => ({ date: r.date, periods: r.periods })),
  });
});

async function buildClassReport(classSection, from, to) {
  const students = await User.find({ role: 'student', classSection, active: true })
    .select('name rollNo')
    .sort({ rollNo: 1 });

  const filter = { student: { $in: students.map((s) => s._id) } };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = normalizeDate(from);
    if (to) filter.date.$lte = normalizeDate(to);
  }
  const records = await Attendance.find(filter);

  return students.map((student) => {
    const mine = records.filter((r) => r.student.toString() === student._id.toString());
    return { student, ...summarise(mine) };
  });
}

// GET /api/attendance/report?classSection=&from=&to=
const classReport = asyncHandler(async (req, res) => {
  const { classSection, from, to } = req.query;
  if (!classSection) {
    res.status(400);
    throw new Error('Choose a class to report on');
  }
  const section = await ClassSection.findById(classSection);
  const rows = await buildClassReport(classSection, from, to);
  res.json({
    classSection: section,
    from: from || null,
    to: to || null,
    rows,
  });
});

// GET /api/attendance/report.csv?classSection=&from=&to=
const classReportCsv = asyncHandler(async (req, res) => {
  const { classSection, from, to } = req.query;
  if (!classSection) {
    res.status(400);
    throw new Error('Choose a class to export');
  }
  const section = await ClassSection.findById(classSection);
  const rows = await buildClassReport(classSection, from, to);

  const header = [
    'Roll No',
    'Name',
    'Total periods',
    'Present',
    'OD',
    'Leave',
    'Absent',
    'Attendance % (OD counted)',
    'Attendance % (strict)',
  ].join(',');

  const body = rows
    .map((r) =>
      [
        r.student.rollNo || '',
        `"${r.student.name}"`,
        r.totalPeriods,
        r.present,
        r.od,
        r.leave,
        r.absent,
        r.percentageWithOd,
        r.percentageStrict,
      ].join(',')
    )
    .join('\n');

  const label = section ? section.name.replace(/\s+/g, '_') : 'class';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="attendance_${label}_${dayjs().format('YYYYMMDD')}.csv"`
  );
  res.send(`${header}\n${body}`);
});

module.exports = {
  roster,
  markAttendance,
  myAttendance,
  studentAttendance,
  classReport,
  classReportCsv,
};
