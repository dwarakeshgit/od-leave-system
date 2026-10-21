const mongoose = require('mongoose');

// Every approval action is recorded so the office has a paper trail
// that replaces the old WhatsApp screenshots.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    details: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
