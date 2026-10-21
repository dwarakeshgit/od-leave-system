const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema(
  {
    period: { type: Number, required: true, min: 1, max: 12 },
    status: {
      type: String,
      enum: ['present', 'absent', 'od', 'leave'],
      default: 'present',
    },
    subject: { type: String, default: '' },
    // 'faculty' entries are typed in by a teacher.
    // 'auto' entries are written by an approved OD/leave request.
    source: { type: String, enum: ['faculty', 'auto'], default: 'faculty' },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    // Stored at 00:00 UTC so a day always matches exactly.
    date: { type: Date, required: true, index: true },
    periods: [periodSchema],
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
