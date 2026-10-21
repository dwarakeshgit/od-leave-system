const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['student', 'tutor', 'hod', 'admin'],
      required: true,
    },
    phone: { type: String, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

    // Student-only fields
    rollNo: { type: String, trim: true, sparse: true, unique: true },
    registerNo: { type: String, trim: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection' },
    year: { type: Number, min: 1, max: 5 },
    parentPhone: { type: String, trim: true },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function matchPassword(entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
