import Device from '../models/Device.js';
import AuditLog from '../models/AuditLog.js';
import { getIO } from '../config/socket.js';

// Get all devices
export const getDevices = async (req, res) => {
  try {
    const devices = await Device.find().populate('zone');
    res.status(200).json(devices);
  } catch (err) {
    res.status(500).json({ error: 'Server Error fetching devices', message: err.message });
  }
};

// Get a single device by deviceId
export const getDeviceById = async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId }).populate('zone');
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.status(200).json(device);
  } catch (err) {
    res.status(500).json({ error: 'Server Error fetching device', message: err.message });
  }
};

// Update Device Status (Critical operation, protected by Idempotency check)
export const updateDeviceStatus = async (req, res) => {
  const { deviceId } = req.params;
  const { status } = req.body;
  const idempotencyKey = req.headers['x-idempotency-key'];

  try {
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['online', 'offline', 'maintenance', 'alert'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const previousStatus = device.status;

    // Update status
    device.status = status;
    device.lastUpdated = new Date();
    await device.save();

    // Log the transaction
    const log = new AuditLog({
      deviceId,
      operation: 'status_toggle',
      details: {
        previousStatus,
        newStatus: status,
        note: `Device status changed to ${status}`
      },
      performedBy: req.user ? req.user.username : 'system',
      idempotencyKey
    });
    await log.save();

    // Broadcast the update immediately via socket
    const io = getIO();
    io.emit('device-update', {
      deviceId,
      status,
      lastUpdated: device.lastUpdated
    });

    res.status(200).json({
      message: 'Device status updated successfully',
      device,
      auditLogId: log._id
    });
  } catch (err) {
    console.error('Error updating device status:', err);
    res.status(500).json({ error: 'Server Error updating device status', message: err.message });
  }
};
