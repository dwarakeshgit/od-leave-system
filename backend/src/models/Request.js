const mongoose = require('mongoose');

const approvalStepSchema = new mongoose.Schema(
  {
    stage: { type: String, enum: ['tutor', 'hod'], required: true },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    comment: { type: String, default: '' },
    actedAt: { type: Date },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    ticket: { type: String, unique: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },

    type: { type: String, enum: ['od', 'leave'], required: true },
    category: {
      type: String,
      enum: [
        'symposium',
        'internship',
        'placement',
        'sports',
        'nss_ncc',
        'medical',
        'family',
        'personal',
        'other',
      ],
      required: true,
    },

    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    // Empty array means the whole day. Otherwise only these period numbers.
    periods: [{ type: Number, min: 1, max: 12 }],
    totalDays: { type: Number, default: 1 },

    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    venue: { type: String, trim: true },
    attachment: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    currentStage: { type: String, enum: ['tutor', 'hod', 'done'], default: 'tutor' },
    approvals: [approvalStepSchema],

    attendanceSynced: { type: Boolean, default: false },
  },
  { timestamps: true }
);

requestSchema.pre('validate', async function generateTicket(next) {
  if (this.ticket) return next();
  const prefix = this.type === 'od' ? 'OD' : 'LV';
  const year = new Date().getFullYear().toString().slice(-2);
  const count = await mongoose.model('Request').countDocuments();
  this.ticket = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Request', requestSchema);
