import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true
    },
    operation: {
      type: String,
      required: true,
      enum: ['status_toggle', 'zone_reassignment', 'telemetry_alert']
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    performedBy: {
      type: String,
      default: 'system'
    },
    idempotencyKey: {
      type: String,
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for analyzing audit trails chronologically by device
AuditLogSchema.index({ deviceId: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
