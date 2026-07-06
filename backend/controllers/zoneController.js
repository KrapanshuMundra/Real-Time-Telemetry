import mongoose from 'mongoose';
import Device from '../models/Device.js';
import Zone from '../models/Zone.js';
import AuditLog from '../models/AuditLog.js';
import { getIO } from '../config/socket.js';

// Get all zones with associated devices populated
export const getZones = async (req, res) => {
  try {
    const zones = await Zone.find().populate('devices');
    res.status(200).json(zones);
  } catch (err) {
    res.status(500).json({ error: 'Server Error fetching zones', message: err.message });
  }
};

// Create a new zone
export const createZone = async (req, res) => {
  const { name, code, description } = req.body;
  try {
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }
    const zone = new Zone({ name, code, description });
    await zone.save();
    res.status(201).json(zone);
  } catch (err) {
    res.status(500).json({ error: 'Server Error creating zone', message: err.message });
  }
};

// Reassign device to a new zone (Atomic session transaction)
export const reassignDevice = async (req, res) => {
  const { deviceId, newZoneId } = req.body;

  if (!deviceId || !newZoneId) {
    return res.status(400).json({ error: 'deviceId and newZoneId are required' });
  }

  try {
    // 1. Verify target zone exists
    const newZone = await Zone.findById(newZoneId);
    if (!newZone) {
      return res.status(404).json({ error: 'Target zone not found' });
    }

    // 2. Verify device exists
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const oldZoneId = device.zone;

    // Skip transaction logic if device is already in target zone
    if (oldZoneId && oldZoneId.toString() === newZoneId) {
      return res.status(400).json({ error: 'Device is already in this zone' });
    }

    let transactionMode = 'Atomic Transaction';
    const session = await mongoose.startSession();
    let transactionSuccess = false;
    let transactionError = null;

    try {
      session.startTransaction();

      // Step A: Update the device's zone field
      device.zone = newZoneId;
      device.lastUpdated = new Date();
      await device.save({ session });

      // Step B: Pull device ref from old zone's array (if it exists)
      if (oldZoneId) {
        await Zone.findByIdAndUpdate(
          oldZoneId,
          { $pull: { devices: device._id } },
          { session }
        );
      }

      // Step C: Push device ref to new zone's array
      newZone.devices.push(device._id);
      await newZone.save({ session });

      // Step D: Write transaction details to audit log
      const log = new AuditLog({
        deviceId,
        operation: 'zone_reassignment',
        details: {
          previousZone: oldZoneId,
          newZone: newZoneId,
          note: `Device reassigned from zone ${oldZoneId || 'None'} to ${newZoneId}`
        },
        performedBy: req.user ? req.user.username : 'system'
      });
      await log.save({ session });

      await session.commitTransaction();
      transactionSuccess = true;
    } catch (err) {
      await session.abortTransaction();
      transactionError = err;
      console.error('[Transaction Aborted] Error details:', err.message);
    } finally {
      session.endSession();
    }

    // Fallback: If transaction fails specifically because replica sets are not configured locally,
    // execute sequential operations (still preserving DB integrity logic as fallback).
    if (!transactionSuccess && transactionError) {
      const errorMsg = transactionError.message || '';
      const isReplicaSetError = 
        errorMsg.includes('Replica Set') || 
        errorMsg.includes('Transaction numbers') || 
        errorMsg.includes('does not support retryable writes');

      if (isReplicaSetError) {
        console.warn('[Transaction Fallback] Local MongoDB does not support transactions (No Replica Set). Executing sequential fallback...');
        
        // Execute sequential update
        device.zone = newZoneId;
        device.lastUpdated = new Date();
        await device.save();

        if (oldZoneId) {
          await Zone.findByIdAndUpdate(oldZoneId, { $pull: { devices: device._id } });
        }

        newZone.devices.push(device._id);
        await newZone.save();

        const log = new AuditLog({
          deviceId,
          operation: 'zone_reassignment',
          details: {
            previousZone: oldZoneId,
            newZone: newZoneId,
            note: 'Device reassigned using sequential fallback mode'
          },
          performedBy: req.user ? req.user.username : 'system'
        });
        await log.save();

        transactionMode = 'Sequential Fallback';
      } else {
        // For other operational validation/syntax errors, return the actual error
        return res.status(500).json({
          error: 'Zone reassignment transaction aborted',
          message: transactionError.message
        });
      }
    }

    // Retrieve fully populated device and emit Socket.IO events to all clients
    const populatedDevice = await Device.findOne({ deviceId }).populate('zone');
    const io = getIO();

    // Broadcast updated device telemetry
    io.emit('device-update', populatedDevice);

    // Broadcast reassigned zone event alert
    io.emit('zone-reassigned', {
      deviceId,
      oldZoneId,
      newZoneId,
      deviceName: device.name,
      newZoneName: newZone.name,
      transactionMode
    });

    res.status(200).json({
      message: 'Device zone reassigned successfully',
      device: populatedDevice,
      transactionMode
    });
  } catch (err) {
    console.error('Error reassigning zone:', err);
    res.status(500).json({ error: 'Server Error during zone reassignment', message: err.message });
  }
};
