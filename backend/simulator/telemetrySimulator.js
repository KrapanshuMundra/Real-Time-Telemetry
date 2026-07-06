import Device from '../models/Device.js';
import { getIO } from '../config/socket.js';

let intervalId = null;

export const startTelemetrySimulator = () => {
  if (intervalId) return;

  console.log('[Telemetry Simulator] Starting simulation loop (interval: 1500ms)');

  intervalId = setInterval(async () => {
    try {
      const devices = await Device.find().populate('zone');
      if (devices.length === 0) return;

      const updatedDevices = [];

      for (const device of devices) {
        // Skip simulation rules depending on device state
        if (device.status === 'offline') {
          // 5% chance of coming back online
          if (Math.random() < 0.05) {
            device.status = 'online';
            device.battery = Math.min(100, Math.floor(device.battery + Math.random() * 20));
            device.temperature = 25 + Math.random() * 10;
          }
        } else if (device.status === 'maintenance') {
          // Simulate recharging battery in maintenance
          device.battery = Math.min(100, device.battery + 2);
          // Temperature slowly cools down to nominal
          const targetTemp = 30;
          if (device.temperature > targetTemp) {
            device.temperature -= Math.min(device.temperature - targetTemp, 0.8);
          } else {
            device.temperature += Math.min(targetTemp - device.temperature, 0.8);
          }
        } else {
          // Online or Alert status: simulate operational drift
          // 1. Battery depletion (0.1 to 0.4%)
          device.battery = Math.max(0, parseFloat((device.battery - (0.1 + Math.random() * 0.3)).toFixed(2)));

          // 2. Temperature drift (+/- 1.5 degrees C)
          // If temperature drifts high, it raises alert
          const tempDrift = (Math.random() - 0.48) * 3; // slight upward drift bias
          device.temperature = parseFloat((device.temperature + tempDrift).toFixed(1));

          // 3. Coordinate drift within a local region (drift by +/- 1 unit)
          device.coordinates.x = Math.max(0, Math.min(100, Math.floor(device.coordinates.x + (Math.random() * 3 - 1.5))));
          device.coordinates.y = Math.max(0, Math.min(100, Math.floor(device.coordinates.y + (Math.random() * 3 - 1.5))));

          // State transitions
          if (device.battery === 0) {
            device.status = 'offline';
          } else if (device.temperature > 82.0) {
            device.status = 'alert';
          } else if (device.status === 'alert' && device.temperature <= 78.0) {
            device.status = 'online'; // recover to online
          }
        }

        device.lastUpdated = new Date();
        await device.save();
        updatedDevices.push(device);
      }

      // Broadcast all telemetry updates to connected websockets
      const io = getIO();
      io.emit('telemetry-update', updatedDevices);

    } catch (err) {
      console.error('[Telemetry Simulator] Error in simulation tick:', err.message);
    }
  }, 1500);
};

export const stopTelemetrySimulator = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Telemetry Simulator] Simulation loop stopped');
  }
};
