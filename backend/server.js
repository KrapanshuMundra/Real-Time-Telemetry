import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initSocket } from './config/socket.js';

// Middlewares
import { authenticateJWT, requireRole } from './middleware/auth.js';
import { idempotencyCheck } from './middleware/idempotency.js';

// Controllers
import { signup, login, getMe } from './controllers/authController.js';
import { getDevices, getDeviceById, updateDeviceStatus } from './controllers/deviceController.js';
import { getZones, createZone, reassignDevice } from './controllers/zoneController.js';

// Simulator
import { startTelemetrySimulator } from './simulator/telemetrySimulator.js';

// Models for Seeding
import User from './models/User.js';
import Zone from './models/Zone.js';
import Device from './models/Device.js';
import AuditLog from './models/AuditLog.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket initialization
initSocket(server);

// --- ROUTES ---

// Authentication Endpoints
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticateJWT, getMe);

// Device Endpoints
app.get('/api/devices', getDevices);
app.get('/api/devices/:deviceId', getDeviceById);
// Critical status update requires JWT Admin role and Idempotency key
app.post(
  '/api/devices/:deviceId/status',
  authenticateJWT,
  requireRole(['admin']),
  idempotencyCheck,
  updateDeviceStatus
);

// Zone Endpoints
app.get('/api/zones', getZones);
app.post('/api/zones', authenticateJWT, requireRole(['admin']), createZone);
// Atomic zone reassignment requires JWT Admin role
app.post(
  '/api/zones/reassign',
  authenticateJWT,
  requireRole(['admin']),
  reassignDevice
);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Database Seed Function
const seedDatabase = async () => {
  try {
    // 1. Seed Users if empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Database Seeding] Creating default administrative and viewer accounts...');
      
      const admin = new User({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      await admin.save();

      const viewer = new User({
        username: 'viewer',
        password: 'viewer123',
        role: 'viewer'
      });
      await viewer.save();
      
      console.log('[Database Seeding] Created accounts - User: admin/admin123, User: viewer/viewer123');
    }

    // 2. Seed Zones and Devices if empty
    const zoneCount = await Zone.countDocuments();
    const deviceCount = await Device.countDocuments();

    if (zoneCount === 0 && deviceCount === 0) {
      console.log('[Database Seeding] Seeding Zones and Devices...');

      // Create Zones
      const zoneA = new Zone({
        name: 'Manufacturing Grid A',
        code: 'ZONE-A',
        description: 'Heavy fabrication, robotics operations, and assembly lines'
      });
      const zoneB = new Zone({
        name: 'Storage Facility B',
        code: 'ZONE-B',
        description: 'Automated climate-controlled inventory tracking and warehouse'
      });
      const zoneC = new Zone({
        name: 'Hazard Zone C',
        code: 'ZONE-C',
        description: 'High-temperature testing chambers and sensitive chemical storage'
      });

      await Promise.all([zoneA.save(), zoneB.save(), zoneC.save()]);

      // Create Devices
      const dev1 = new Device({
        deviceId: 'DEV-001',
        name: 'Thermal Excavator 1',
        status: 'online',
        battery: 92,
        temperature: 42.5,
        coordinates: { x: 25, y: 30 },
        zone: zoneA._id
      });

      const dev2 = new Device({
        deviceId: 'DEV-002',
        name: 'Material Hauler 4',
        status: 'online',
        battery: 78,
        temperature: 35.2,
        coordinates: { x: 30, y: 70 },
        zone: zoneA._id
      });

      const dev3 = new Device({
        deviceId: 'DEV-003',
        name: 'Drone Monitor A',
        status: 'maintenance',
        battery: 45,
        temperature: 28.0,
        coordinates: { x: 12, y: 15 },
        zone: zoneB._id
      });

      const dev4 = new Device({
        deviceId: 'DEV-004',
        name: 'Reactor Cooler B',
        status: 'alert',
        battery: 60,
        temperature: 81.2,
        coordinates: { x: 80, y: 85 },
        zone: zoneC._id
      });

      const dev5 = new Device({
        deviceId: 'DEV-005',
        name: 'Zone Scanner 9',
        status: 'online',
        battery: 10,
        temperature: 31.0,
        coordinates: { x: 50, y: 55 },
        zone: zoneB._id
      });

      const dev6 = new Device({
        deviceId: 'DEV-006',
        name: 'Autonomous Welder B',
        status: 'offline',
        battery: 0,
        temperature: 22.0,
        coordinates: { x: 60, y: 40 },
        zone: zoneA._id
      });

      await Promise.all([
        dev1.save(),
        dev2.save(),
        dev3.save(),
        dev4.save(),
        dev5.save(),
        dev6.save()
      ]);

      // Assign devices to zones
      zoneA.devices = [dev1._id, dev2._id, dev6._id];
      zoneB.devices = [dev3._id, dev5._id];
      zoneC.devices = [dev4._id];

      await Promise.all([zoneA.save(), zoneB.save(), zoneC.save()]);
      console.log('[Database Seeding] Completed seeding Zones and Devices successfully.');
    }
  } catch (err) {
    console.error('[Database Seeding] Error occurred during seeding:', err.message);
  }
};

// Bootstrap Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Run database seeding
  await seedDatabase();

  // Start Telemetry Simulator
  startTelemetrySimulator();

  server.listen(PORT, () => {
    console.log(`[Server] Telemetry Engine Server running on port ${PORT}`);
  });
};

startServer();
