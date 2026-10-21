/**
 * Fills the database with a demo department, one class, staff, students,
 * two weeks of attendance and a few requests in different states.
 *
 * Run it with:  npm run seed
 * It clears the collections it writes to, so never run it on real data.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Department = require('../models/Department');
const ClassSection = require('../models/ClassSection');
const Request = require('../models/Request');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const { dayjs, normalizeDate, eachDay, isSunday } = require('./dates');
const { applyRequestToAttendance } = require('./attendanceSync');

const STUDENTS = [
  ['Aarthi Balan', '21CS001'],
  ['Dinesh Kumar', '21CS002'],
  ['Farhan Ahmed', '21CS003'],
  ['Gowri Shankar', '21CS004'],
  ['Harini Raj', '21CS005'],
  ['Jeyanth Prabhu', '21CS006'],
  ['Kavya Narayanan', '21CS007'],
  ['Mohamed Rizwan', '21CS008'],
  ['Nandhini Selvam', '21CS009'],
  ['Praveen Kannan', '21CS010'],
  ['Sanjana Iyer', '21CS011'],
  ['Vishal Murugan', '21CS012'],
];

async function run() {
  await connectDB(process.env.MONGO_URI);
  console.log('Clearing old demo data...');
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    ClassSection.deleteMany({}),
    Request.deleteMany({}),
    Attendance.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const dept = await Department.create({ name: 'Computer Science and Engineering', code: 'CSE' });

  const admin = await User.create({
    name: 'Office Admin',
    email: 'admin@college.edu',
    password: 'admin123',
    role: 'admin',
    department: dept._id,
  });

  const hod = await User.create({
    name: 'Dr. Latha Venkatesan',
    email: 'hod@college.edu',
    password: 'hod123',
    role: 'hod',
    department: dept._id,
    phone: '9840000001',
  });
  dept.hod = hod._id;
  await dept.save();

  const tutor = await User.create({
    name: 'Prof. Ramesh Iyer',
    email: 'tutor@college.edu',
    password: 'tutor123',
    role: 'tutor',
    department: dept._id,
    phone: '9840000002',
  });

  const section = await ClassSection.create({
    name: 'CSE III Year - A',
    year: 3,
    section: 'A',
    department: dept._id,
    tutor: tutor._id,
    periodsPerDay: 8,
    minAttendance: 75,
  });

  const students = [];
  for (const [name, rollNo] of STUDENTS) {
    const email = `${rollNo.toLowerCase()}@college.edu`;
    students.push(
      await User.create({
        name,
        email,
        password: 'student123',
        role: 'student',
        rollNo,
        registerNo: `9192${rollNo.slice(-3)}`,
        department: dept._id,
        classSection: section._id,
        year: 3,
        phone: '9840100000',
        parentPhone: '9840200000',
      })
    );
  }

  console.log('Creating two weeks of attendance...');
  const start = dayjs().subtract(14, 'day');
  const days = eachDay(start.toDate(), dayjs().subtract(1, 'day').toDate()).filter(
    (d) => !isSunday(d)
  );

  const subjects = ['Compiler Design', 'Networks', 'DBMS', 'AI', 'Cloud', 'Lab', 'Lab', 'Mentoring'];

  for (const student of students) {
    for (const date of days) {
      const periods = [];
      for (let p = 1; p <= section.periodsPerDay; p += 1) {
        // Roughly 92% present, the rest absent, so percentages look realistic.
        const status = Math.random() < 0.92 ? 'present' : 'absent';
        periods.push({ period: p, status, subject: subjects[p - 1], source: 'faculty' });
      }
      await Attendance.create({
        student: student._id,
        classSection: section._id,
        date,
        periods,
        markedBy: tutor._id,
      });
    }
  }

  console.log('Creating sample requests...');
  const mk = (data) =>
    Request.create({
      classSection: section._id,
      department: dept._id,
      approvals: [{ stage: 'tutor' }, { stage: 'hod' }],
      ...data,
    });

  // Waiting with the tutor
  await mk({
    student: students[0]._id,
    type: 'od',
    category: 'symposium',
    fromDate: normalizeDate(dayjs().add(3, 'day')),
    toDate: normalizeDate(dayjs().add(3, 'day')),
    periods: [],
    totalDays: 1,
    reason: 'Presenting a paper on federated learning at the Anna University symposium.',
    venue: 'Anna University, Chennai',
    currentStage: 'tutor',
  });

  // Waiting with the HOD
  await mk({
    student: students[1]._id,
    type: 'od',
    category: 'placement',
    fromDate: normalizeDate(dayjs().add(1, 'day')),
    toDate: normalizeDate(dayjs().add(2, 'day')),
    periods: [],
    totalDays: 2,
    reason: 'Final round interview at Zoho Corporation.',
    venue: 'Zoho, Estancia',
    currentStage: 'hod',
    approvals: [
      { stage: 'tutor', approver: tutor._id, status: 'approved', comment: 'Verified the call letter.', actedAt: new Date() },
      { stage: 'hod' },
    ],
  });

  // Already approved, so its attendance is written automatically
  const approved = await mk({
    student: students[2]._id,
    type: 'od',
    category: 'sports',
    fromDate: normalizeDate(dayjs().subtract(4, 'day')),
    toDate: normalizeDate(dayjs().subtract(3, 'day')),
    periods: [],
    totalDays: 2,
    reason: 'Inter-college volleyball tournament, representing the institution.',
    venue: 'SRM Campus',
    status: 'approved',
    currentStage: 'done',
    approvals: [
      { stage: 'tutor', approver: tutor._id, status: 'approved', comment: 'Selected in the college team.', actedAt: new Date() },
      { stage: 'hod', approver: hod._id, status: 'approved', comment: 'Approved.', actedAt: new Date() },
    ],
  });
  await applyRequestToAttendance(approved);
  approved.attendanceSynced = true;
  await approved.save();

  // A medical leave that was approved
  const leave = await mk({
    student: students[3]._id,
    type: 'leave',
    category: 'medical',
    fromDate: normalizeDate(dayjs().subtract(6, 'day')),
    toDate: normalizeDate(dayjs().subtract(6, 'day')),
    periods: [],
    totalDays: 1,
    reason: 'Viral fever, certificate from the campus health centre attached.',
    status: 'approved',
    currentStage: 'done',
    approvals: [
      { stage: 'tutor', approver: tutor._id, status: 'approved', comment: 'Certificate seen.', actedAt: new Date() },
      { stage: 'hod', approver: hod._id, status: 'approved', comment: 'Approved.', actedAt: new Date() },
    ],
  });
  await applyRequestToAttendance(leave);
  leave.attendanceSynced = true;
  await leave.save();

  // A rejected one
  await mk({
    student: students[4]._id,
    type: 'leave',
    category: 'personal',
    fromDate: normalizeDate(dayjs().subtract(2, 'day')),
    toDate: normalizeDate(dayjs().subtract(2, 'day')),
    periods: [3, 4],
    totalDays: 1,
    reason: 'Family function in the afternoon.',
    status: 'rejected',
    currentStage: 'done',
    approvals: [
      { stage: 'tutor', approver: tutor._id, status: 'rejected', comment: 'Model exam is scheduled that afternoon.', actedAt: new Date() },
      { stage: 'hod' },
    ],
  });

  await Notification.create({
    user: tutor._id,
    title: 'One OD request is waiting for you',
    body: 'Aarthi Balan, symposium',
    link: '/approvals',
  });

  console.log('\nDemo accounts (password in brackets):');
  console.log(`  Admin   ${admin.email}   (admin123)`);
  console.log(`  HOD     ${hod.email}     (hod123)`);
  console.log(`  Tutor   ${tutor.email}   (tutor123)`);
  console.log(`  Student ${students[0].email} (student123)  ... 21cs001 to 21cs012`);
  console.log('\nSeed complete.');

  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
  process.exit(1);
});
