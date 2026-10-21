const Attendance = require('../models/Attendance');
const ClassSection = require('../models/ClassSection');
const { eachDay, isSunday } = require('./dates');

/**
 * Writes an approved request into the attendance register.
 * OD periods count as attended, leave periods count as excused absence.
 * Faculty entries for the same period are overwritten, because the
 * approved request is the higher authority.
 */
async function applyRequestToAttendance(request) {
  const section = await ClassSection.findById(request.classSection);
  const periodsPerDay = section ? section.periodsPerDay : Number(process.env.PERIODS_PER_DAY || 8);
  const targetPeriods =
    request.periods && request.periods.length
      ? request.periods
      : Array.from({ length: periodsPerDay }, (_, i) => i + 1);

  const status = request.type === 'od' ? 'od' : 'leave';
  const days = eachDay(request.fromDate, request.toDate).filter((d) => !isSunday(d));
  let touched = 0;

  for (const date of days) {
    let record = await Attendance.findOne({ student: request.student, date });
    if (!record) {
      record = new Attendance({
        student: request.student,
        classSection: request.classSection,
        date,
        periods: [],
      });
    }

    for (const period of targetPeriods) {
      const existing = record.periods.find((p) => p.period === period);
      if (existing) {
        existing.status = status;
        existing.source = 'auto';
        existing.request = request._id;
      } else {
        record.periods.push({ period, status, source: 'auto', request: request._id });
      }
    }

    record.periods.sort((a, b) => a.period - b.period);
    await record.save();
    touched += 1;
  }

  return { daysUpdated: touched, periodsPerDay: targetPeriods.length };
}

/**
 * Undoes the attendance entries created by a request. Used when an
 * approved request is cancelled or reverted by an admin.
 */
async function revertRequestFromAttendance(request) {
  const records = await Attendance.find({ 'periods.request': request._id });
  for (const record of records) {
    record.periods = record.periods.filter(
      (p) => !(p.request && p.request.toString() === request._id.toString())
    );
    if (record.periods.length === 0) {
      await record.deleteOne();
    } else {
      await record.save();
    }
  }
  return records.length;
}

/**
 * Attendance percentage for one student.
 * "withOd" is the figure shown to students: OD periods count as attended.
 * "strict" ignores OD, which is what some universities audit against.
 */
function summarise(records) {
  let total = 0;
  let present = 0;
  let od = 0;
  let leave = 0;
  let absent = 0;

  for (const record of records) {
    for (const p of record.periods) {
      total += 1;
      if (p.status === 'present') present += 1;
      else if (p.status === 'od') od += 1;
      else if (p.status === 'leave') leave += 1;
      else absent += 1;
    }
  }

  const pct = (value) => (total === 0 ? 0 : Number(((value / total) * 100).toFixed(2)));

  return {
    totalPeriods: total,
    present,
    od,
    leave,
    absent,
    percentageWithOd: pct(present + od),
    percentageStrict: pct(present),
  };
}

module.exports = { applyRequestToAttendance, revertRequestFromAttendance, summarise };
