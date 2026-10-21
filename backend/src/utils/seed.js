/**
 * CampusFlow Demo Data Seed Script
 *
 * Populates the development database with:
 * - 20 demo students (21CS001 through 21CS020)
 * - Realistic period-by-period attendance for the past 14 working days (65%–98% range)
 * - Department (CSE) and Class Section (CSE III Year - A)
 * - Staff accounts (Admin, HOD, Tutor)
 * - Sample OD and leave requests across different approval stages
 * - Attendance synchronization for approved requests
 *
 * This script is IDEMPOTENT: running it repeatedly safely updates/inserts records
 * without dropping collections or deleting existing user accounts.
 *
 * Run with: npm run seed (from od-leave-system/backend)
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
const { applyRequestToAttendance, summarise } = require('./attendanceSync');

// 20 Distinct Demo Students
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
  ['Ananya Ramesh', '21CS013'],
  ['Balaji Venkatesh', '21CS014'],
  ['Divya Bharathi', '21CS015'],
  ['Karthik Subramanian', '21CS016'],
  ['Meera Krishnan', '21CS017'],
  ['Naveen Kumar', '21CS018'],
  ['Pooja Srinivasan', '21CS019'],
  ['Rohit Sundaram', '21CS020'],
];

// Target attendance rates spanning approximately 65% to 98%
// Creates a realistic classroom profile: high achievers, regulars, borderlines (~75-78%), and shortfalls (<75%)
const ATTENDANCE_TARGETS = [
  0.92, // 21CS001: ~92% (High / regular)
  0.96, // 21CS002: ~96% (Top attendance)
  0.84, // 21CS003: ~84% strict, ~94% with OD (has approved sports OD)
  0.88, // 21CS004: ~88% strict, ~92% with Leave (has approved medical leave)
  0.86, // 21CS005: ~86% (Regular)
  0.94, // 21CS006: ~94% (High / approved OD today)
  0.77, // 21CS007: ~77% (Borderline just above 75%)
  0.89, // 21CS008: ~89% (Regular)
  0.73, // 21CS009: ~73% (Shortfall below 75%)
  0.91, // 21CS010: ~91% (High)
  0.78, // 21CS011: ~78% (Borderline just above 75%)
  0.67, // 21CS012: ~67% (Chronic shortfall)
  0.93, // 21CS013: ~93% (High)
  0.82, // 21CS014: ~82% (Regular)
  0.71, // 21CS015: ~71% (Shortfall below 75%)
  0.87, // 21CS016: ~87% (Regular)
  0.98, // 21CS017: ~98% (Highest attendance)
  0.69, // 21CS018: ~69% (Shortfall below 75%)
  0.84, // 21CS019: ~84% (Regular)
  0.76, // 21CS020: ~76% (Borderline just above 75%)
];

const SUBJECTS = [
  'Compiler Design',
  'Networks',
  'DBMS',
  'AI',
  'Cloud',
  'Lab',
  'Lab',
  'Mentoring',
];

async function run() {
  console.log('Connecting to MongoDB...');
  await connectDB(process.env.MONGO_URI);
  console.log('Database connected.\n');

  // 1. Ensure Department exists
  let dept = await Department.findOne({ code: 'CSE' });
  if (!dept) {
    dept = await Department.create({
      name: 'Computer Science and Engineering',
      code: 'CSE',
    });
    console.log('Created department: CSE');
  } else {
    console.log('Found existing department: CSE');
  }

  // 2. Ensure Staff Accounts exist
  let admin = await User.findOne({ email: 'admin@college.edu' });
  if (!admin) {
    admin = await User.create({
      name: 'Office Admin',
      email: 'admin@college.edu',
      password: 'admin123',
      role: 'admin',
      department: dept._id,
    });
    console.log('Created admin: admin@college.edu');
  }

  let hod = await User.findOne({ email: 'hod@college.edu' });
  if (!hod) {
    hod = await User.create({
      name: 'Dr. Latha Venkatesan',
      email: 'hod@college.edu',
      password: 'hod123',
      role: 'hod',
      department: dept._id,
      phone: '9840000001',
    });
    console.log('Created HOD: hod@college.edu');
  }

  if (!dept.hod || dept.hod.toString() !== hod._id.toString()) {
    dept.hod = hod._id;
    await dept.save();
  }

  let tutor = await User.findOne({ email: 'tutor@college.edu' });
  if (!tutor) {
    tutor = await User.create({
      name: 'Prof. Ramesh Iyer',
      email: 'tutor@college.edu',
      password: 'tutor123',
      role: 'tutor',
      department: dept._id,
      phone: '9840000002',
    });
    console.log('Created tutor: tutor@college.edu');
  }

  // 3. Ensure Class Section exists
  let section = await ClassSection.findOne({
    department: dept._id,
    year: 3,
    section: 'A',
  });
  if (!section) {
    section = await ClassSection.create({
      name: 'CSE III Year - A',
      year: 3,
      section: 'A',
      department: dept._id,
      tutor: tutor._id,
      periodsPerDay: 8,
      minAttendance: 75,
    });
    console.log('Created class section: CSE III Year - A');
  } else {
    section.tutor = tutor._id;
    await section.save();
    console.log('Found class section: CSE III Year - A');
  }

  // 4. Upsert 20 Demo Students
  console.log('\n--- Processing 20 Demo Students ---');
  let studentsCreated = 0;
  let studentsUpdated = 0;
  const studentDocs = [];

  for (let i = 0; i < STUDENTS.length; i++) {
    const [name, rollNo] = STUDENTS[i];
    const email = `${rollNo.toLowerCase()}@college.edu`;
    const registerNo = `9192${rollNo.slice(-3)}`;
    const phone = `9840100${rollNo.slice(-3)}`;
    const parentPhone = `9840200${rollNo.slice(-3)}`;

    let student = await User.findOne({
      $or: [{ email }, { rollNo }],
    });

    if (!student) {
      student = await User.create({
        name,
        email,
        password: 'student123',
        role: 'student',
        rollNo,
        registerNo,
        department: dept._id,
        classSection: section._id,
        year: 3,
        phone,
        parentPhone,
        active: true,
      });
      studentsCreated++;
    } else {
      student.department = dept._id;
      student.classSection = section._id;
      student.year = 3;
      if (!student.rollNo) student.rollNo = rollNo;
      if (!student.registerNo) student.registerNo = registerNo;
      await student.save();
      studentsUpdated++;
    }
    studentDocs.push(student);
  }

  // Also include any user-created students in this class section
  const extraStudents = await User.find({
    role: 'student',
    classSection: section._id,
    _id: { $nin: studentDocs.map((s) => s._id) },
  });
  for (const extra of extraStudents) {
    studentDocs.push(extra);
  }

  console.log(`Demo Students: ${studentsCreated} created, ${studentsUpdated} existing verified.`);
  console.log(`Total students in class: ${studentDocs.length}`);

  // 5. Generate Realistic Attendance for the Most Recent 14 Working Days
  console.log('\n--- Generating Realistic Attendance Records ---');
  const today = dayjs();
  const start = today.subtract(18, 'day');
  const workingDays = eachDay(start.toDate(), today.toDate())
    .filter((d) => !isSunday(d))
    .slice(-14);

  console.log(`Working days count: ${workingDays.length}`);
  console.log(
    `Date range: ${workingDays[0].toISOString().slice(0, 10)} to ${workingDays[
      workingDays.length - 1
    ]
      .toISOString()
      .slice(0, 10)}`
  );

  let attendanceCreated = 0;
  let attendanceUpdated = 0;
  const periodsPerDay = section.periodsPerDay || 8;
  const totalPossiblePeriods = workingDays.length * periodsPerDay;

  for (let sIdx = 0; sIdx < studentDocs.length; sIdx++) {
    const student = studentDocs[sIdx];
    const target = ATTENDANCE_TARGETS[sIdx] !== undefined ? ATTENDANCE_TARGETS[sIdx] : 0.85;

    // Calculate exact target absences for this student over the 14 days
    const totalAbsencesNeeded = Math.max(0, totalPossiblePeriods - Math.round(totalPossiblePeriods * target));
    let absencesAllocated = 0;

    // Build day-by-day attendance grid (14 days x 8 periods)
    // Distribute absences across days in realistic patterns (full days, half days, single periods)
    const dayPeriodsMap = [];
    for (let dIdx = 0; dIdx < workingDays.length; dIdx++) {
      dayPeriodsMap.push(new Array(periodsPerDay).fill('present'));
    }

    // Days eligible for absences (skip day 0 and day 13 to keep them realistic)
    const eligibleDays = [2, 5, 8, 11, 3, 7, 10, 4, 9, 6, 1, 12];
    let eIdx = 0;

    while (absencesAllocated < totalAbsencesNeeded && eIdx < eligibleDays.length) {
      const d = eligibleDays[eIdx % eligibleDays.length];
      const remaining = totalAbsencesNeeded - absencesAllocated;

      if (remaining >= 8 && Math.random() < 0.6) {
        // Absent whole day (8 periods)
        for (let p = 0; p < periodsPerDay; p++) {
          if (dayPeriodsMap[d][p] === 'present') {
            dayPeriodsMap[d][p] = 'absent';
            absencesAllocated++;
          }
        }
      } else if (remaining >= 4 && Math.random() < 0.7) {
        // Absent afternoon session (periods 5 to 8)
        for (let p = 4; p < periodsPerDay && absencesAllocated < totalAbsencesNeeded; p++) {
          if (dayPeriodsMap[d][p] === 'present') {
            dayPeriodsMap[d][p] = 'absent';
            absencesAllocated++;
          }
        }
      } else if (remaining >= 2 && Math.random() < 0.7) {
        // Absent morning session (periods 1 to 2)
        for (let p = 0; p < 2 && absencesAllocated < totalAbsencesNeeded; p++) {
          if (dayPeriodsMap[d][p] === 'present') {
            dayPeriodsMap[d][p] = 'absent';
            absencesAllocated++;
          }
        }
      } else {
        // Single period absence (period 1 or 8)
        const pChoice = absencesAllocated % 2 === 0 ? 0 : 7;
        if (dayPeriodsMap[d][pChoice] === 'present') {
          dayPeriodsMap[d][pChoice] = 'absent';
          absencesAllocated++;
        }
      }
      eIdx++;
    }

    // Save or update attendance records for this student
    for (let dIdx = 0; dIdx < workingDays.length; dIdx++) {
      const date = workingDays[dIdx];
      let record = await Attendance.findOne({ student: student._id, date });

      if (!record) {
        const periods = [];
        for (let p = 1; p <= periodsPerDay; p++) {
          periods.push({
            period: p,
            status: dayPeriodsMap[dIdx][p - 1],
            subject: SUBJECTS[p - 1] || `Period ${p}`,
            source: 'faculty',
          });
        }
        await Attendance.create({
          student: student._id,
          classSection: section._id,
          date,
          periods,
          markedBy: tutor._id,
        });
        attendanceCreated++;
      } else {
        // Merge periods: preserve auto entries (approved OD/leave)
        let modified = false;
        for (let p = 1; p <= periodsPerDay; p++) {
          let slot = record.periods.find((ep) => ep.period === p);
          if (slot && slot.source === 'auto') {
            continue; // Keep approved OD / leave
          }
          const newStatus = dayPeriodsMap[dIdx][p - 1];
          if (slot) {
            if (slot.status !== newStatus) {
              slot.status = newStatus;
              modified = true;
            }
            slot.subject = SUBJECTS[p - 1] || `Period ${p}`;
          } else {
            record.periods.push({
              period: p,
              status: newStatus,
              subject: SUBJECTS[p - 1] || `Period ${p}`,
              source: 'faculty',
            });
            modified = true;
          }
        }
        if (modified) {
          record.periods.sort((a, b) => a.period - b.period);
          record.classSection = section._id;
          record.markedBy = tutor._id;
          await record.save();
          attendanceUpdated++;
        }
      }
    }
  }

  console.log(`Attendance Records: ${attendanceCreated} inserted, ${attendanceUpdated} updated.`);

  // 6. Create / Update Sample Requests and Synchronize Approved Attendance
  console.log('\n--- Setting Up Sample Requests & Approvals ---');

  const mkRequest = async (criteria, data) => {
    let reqDoc = await Request.findOne(criteria);
    if (!reqDoc) {
      reqDoc = await Request.create({
        classSection: section._id,
        department: dept._id,
        ...data,
      });
      return { reqDoc, created: true };
    }
    return { reqDoc, created: false };
  };

  // Request 1: Pending with Tutor (Student 0 - Aarthi Balan, symposium tomorrow)
  const tomorrow = normalizeDate(dayjs().add(1, 'day'));
  await mkRequest(
    { student: studentDocs[0]._id, category: 'symposium' },
    {
      student: studentDocs[0]._id,
      type: 'od',
      category: 'symposium',
      fromDate: tomorrow,
      toDate: tomorrow,
      periods: [],
      totalDays: 1,
      reason: 'Presenting a paper on federated learning at the Anna University symposium.',
      venue: 'Anna University, Chennai',
      currentStage: 'tutor',
      status: 'pending',
      approvals: [{ stage: 'tutor' }, { stage: 'hod' }],
    }
  );

  // Request 2: Pending with HOD (Student 1 - Dinesh Kumar, placement interview)
  const afterTomorrow = normalizeDate(dayjs().add(2, 'day'));
  await mkRequest(
    { student: studentDocs[1]._id, category: 'placement' },
    {
      student: studentDocs[1]._id,
      type: 'od',
      category: 'placement',
      fromDate: afterTomorrow,
      toDate: normalizeDate(dayjs().add(3, 'day')),
      periods: [],
      totalDays: 2,
      reason: 'Final round technical interview at Zoho Corporation.',
      venue: 'Zoho, Estancia',
      currentStage: 'hod',
      status: 'pending',
      approvals: [
        {
          stage: 'tutor',
          approver: tutor._id,
          status: 'approved',
          comment: 'Verified call letter.',
          actedAt: new Date(),
        },
        { stage: 'hod' },
      ],
    }
  );

  // Request 3: Approved Sports OD Covering TODAY (Student 5 - Jeyanth Prabhu)
  // This locks today's attendance in Mark Attendance and gives realistic live counts!
  const todayDate = normalizeDate(dayjs());
  const { reqDoc: approvedToday } = await mkRequest(
    { student: studentDocs[5]._id, category: 'sports', fromDate: todayDate },
    {
      student: studentDocs[5]._id,
      type: 'od',
      category: 'sports',
      fromDate: todayDate,
      toDate: todayDate,
      periods: [],
      totalDays: 1,
      reason: 'Representing college in Anna University zonal cricket tournament.',
      venue: 'College Sports Ground',
      status: 'approved',
      currentStage: 'done',
      approvals: [
        {
          stage: 'tutor',
          approver: tutor._id,
          status: 'approved',
          comment: 'Selected in college team roster.',
          actedAt: new Date(),
        },
        {
          stage: 'hod',
          approver: hod._id,
          status: 'approved',
          comment: 'Good luck to the team.',
          actedAt: new Date(),
        },
      ],
    }
  );
  await applyRequestToAttendance(approvedToday);
  approvedToday.attendanceSynced = true;
  await approvedToday.save();

  // Request 4: Approved Sports OD in the past (Student 2 - Farhan Ahmed)
  const pastFrom = normalizeDate(dayjs().subtract(4, 'day'));
  const pastTo = normalizeDate(dayjs().subtract(3, 'day'));
  const { reqDoc: approvedPast } = await mkRequest(
    { student: studentDocs[2]._id, category: 'sports', fromDate: pastFrom },
    {
      student: studentDocs[2]._id,
      type: 'od',
      category: 'sports',
      fromDate: pastFrom,
      toDate: pastTo,
      periods: [],
      totalDays: 2,
      reason: 'Inter-college volleyball tournament, representing the institution.',
      venue: 'SRM Campus',
      status: 'approved',
      currentStage: 'done',
      approvals: [
        {
          stage: 'tutor',
          approver: tutor._id,
          status: 'approved',
          comment: 'Selected in college team.',
          actedAt: new Date(),
        },
        {
          stage: 'hod',
          approver: hod._id,
          status: 'approved',
          comment: 'Approved.',
          actedAt: new Date(),
        },
      ],
    }
  );
  await applyRequestToAttendance(approvedPast);
  approvedPast.attendanceSynced = true;
  await approvedPast.save();

  // Request 5: Approved Medical Leave in the past (Student 3 - Gowri Shankar)
  const medDate = normalizeDate(dayjs().subtract(6, 'day'));
  const { reqDoc: leaveReq } = await mkRequest(
    { student: studentDocs[3]._id, category: 'medical' },
    {
      student: studentDocs[3]._id,
      type: 'leave',
      category: 'medical',
      fromDate: medDate,
      toDate: medDate,
      periods: [],
      totalDays: 1,
      reason: 'Viral fever, medical certificate from health centre attached.',
      status: 'approved',
      currentStage: 'done',
      approvals: [
        {
          stage: 'tutor',
          approver: tutor._id,
          status: 'approved',
          comment: 'Certificate verified.',
          actedAt: new Date(),
        },
        {
          stage: 'hod',
          approver: hod._id,
          status: 'approved',
          comment: 'Excused.',
          actedAt: new Date(),
        },
      ],
    }
  );
  await applyRequestToAttendance(leaveReq);
  leaveReq.attendanceSynced = true;
  await leaveReq.save();

  // Request 6: Rejected Leave (Student 4 - Harini Raj)
  const rejDate = normalizeDate(dayjs().subtract(2, 'day'));
  await mkRequest(
    { student: studentDocs[4]._id, category: 'personal' },
    {
      student: studentDocs[4]._id,
      type: 'leave',
      category: 'personal',
      fromDate: rejDate,
      toDate: rejDate,
      periods: [3, 4],
      totalDays: 1,
      reason: 'Family function in the afternoon.',
      status: 'rejected',
      currentStage: 'done',
      approvals: [
        {
          stage: 'tutor',
          approver: tutor._id,
          status: 'rejected',
          comment: 'Model practical examination scheduled during those periods.',
          actedAt: new Date(),
        },
        { stage: 'hod' },
      ],
    }
  );

  // Notification for Tutor
  const notifExists = await Notification.findOne({
    user: tutor._id,
    title: 'One OD request is waiting for you',
  });
  if (!notifExists) {
    await Notification.create({
      user: tutor._id,
      title: 'One OD request is waiting for you',
      body: 'Aarthi Balan, symposium',
      link: '/approvals',
    });
  }

  // 7. Verification Summary Printout
  console.log('\n--- VERIFICATION: Student Attendance Percentages ---');
  console.log(
    'Roll No'.padEnd(10) +
      'Name'.padEnd(24) +
      'Total'.padEnd(8) +
      'Present'.padEnd(9) +
      'OD'.padEnd(6) +
      'Leave'.padEnd(7) +
      'Absent'.padEnd(8) +
      'With OD %'.padEnd(12) +
      'Strict %'
  );
  console.log('-'.repeat(90));

  for (const student of studentDocs) {
    const studentRecords = await Attendance.find({ student: student._id });
    const stats = summarise(studentRecords);
    const lowMark = stats.percentageWithOd < 75 ? '(!)' : '';
    console.log(
      (student.rollNo || '').padEnd(10) +
        student.name.padEnd(24) +
        String(stats.totalPeriods).padEnd(8) +
        String(stats.present).padEnd(9) +
        String(stats.od).padEnd(6) +
        String(stats.leave).padEnd(7) +
        String(stats.absent).padEnd(8) +
        `${stats.percentageWithOd}% ${lowMark}`.padEnd(12) +
        `${stats.percentageStrict}%`
    );
  }

  console.log('\n--- Seed Verification Complete ---');
  console.log(`Demo accounts (all with password in brackets):`);
  console.log(`  Admin   ${admin.email}   (admin123)`);
  console.log(`  HOD     ${hod.email}     (hod123)`);
  console.log(`  Tutor   ${tutor.email}   (tutor123)`);
  console.log(
    `  Students 21cs001@college.edu to 21cs020@college.edu (student123)`
  );

  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('\nSeed script error:', err);
  await mongoose.connection.close();
  process.exit(1);
});
