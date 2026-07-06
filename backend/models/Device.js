import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'maintenance', 'alert'],
      default: 'online',
      index: true
    },
    battery: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    temperature: {
      type: Number,
      required: true
    },
    coordinates: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      index: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying a device's chronological telemetry logs/history efficiently
DeviceSchema.index({ deviceId: 1, lastUpdated: -1 });

// Compound index for filtering devices by status and zone
DeviceSchema.index({ status: 1, zone: 1 });

const Device = mongoose.model('Device', DeviceSchema);
export default Device;
