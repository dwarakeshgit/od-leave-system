const mongoose = require('mongoose');

// A class section is one batch of students, e.g. "CSE - III Year - Section A".
const classSectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 5 },
    section: { type: String, required: true, uppercase: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    periodsPerDay: { type: Number, default: 8, min: 1, max: 12 },
    // Minimum attendance the institution expects, used for warnings.
    minAttendance: { type: Number, default: 75 },
  },
  { timestamps: true }
);

classSectionSchema.index({ department: 1, year: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('ClassSection', classSectionSchema);
