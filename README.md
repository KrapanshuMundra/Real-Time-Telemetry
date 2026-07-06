# Real-Time-Telemetry

Real-time industrial IoT fleet monitoring dashboard — tracks equipment status, telemetry, and zone assignment live across a distributed device fleet, with production-grade backend patterns for write safety (idempotency keys) and data consistency (atomic MongoDB transactions).


## Overview

**Real-Time-Telemetry** is a full-stack MERN application that simulates and monitors a fleet of industrial IoT devices (e.g. equipment across a manufacturing grid, storage facility, and a hazard zone) in real time. It's built as a demonstration of backend patterns that go beyond typical CRUD — specifically **idempotent write APIs** and **atomic multi-document transactions** — layered under a live, animated dashboard.

Devices report status (`online`, `offline`, `maintenance`, `alert`), temperature, battery level, and location, and are grouped into zones. Admin users can update device status or reassign devices between zones; all changes broadcast instantly to every connected client over WebSockets.


## Features

- 🔐 **JWT authentication** with role-based access control (Admin / Viewer), enforced server-side via middleware — not just hidden UI elements
- ⚡ **Real-time updates** via Socket.io — device status, telemetry, and zone changes push to all clients instantly
- 🔁 **Idempotency-key middleware** on critical write endpoints — duplicate requests (e.g. from client retries) are safely deduplicated instead of double-processed
- 🔒 **Atomic MongoDB transactions** for zone reassignment, with an automatic sequential fallback for local/non-replica-set MongoDB instances
- 📊 **Live analytics charts** (temperature & battery averages over time) via Recharts
- 🗺️ **Zone-based device grouping** with animated, responsive grid layouts (Framer Motion)
- 🧪 **Background telemetry simulator** — generates realistic device drift (battery depletion, temperature fluctuation, automatic alert/offline transitions) so the system behaves like a live fleet without physical hardware
- 📜 **Audit logging** — every status change and zone reassignment is persisted to a dedicated audit log collection


## Tech Stack

**Frontend**
- React 19 + Vite
- Tailwind CSS
- Framer Motion (animations)
- Recharts (data visualization)
- Socket.io-client
- Lucide React (icons)

**Backend**
- Node.js + Express
- MongoDB + Mongoose (ODM)
- Socket.io (WebSocket server)
- JSON Web Tokens (JWT) for authentication
- Custom idempotency middleware (in-memory cache)


## Project Structure

```
Real-Time-Telemetry/
├── backend/
│   ├── config/
│   │   ├── db.js                # MongoDB connection
│   │   └── socket.js            # Socket.io initialization
│   ├── controllers/
│   │   ├── authController.js    # signup, login, getMe
│   │   ├── deviceController.js  # get devices, update status
│   │   └── zoneController.js    # get zones, create zone, reassign device
│   ├── middleware/
│   │   ├── auth.js              # authenticateJWT, requireRole
│   │   └── idempotency.js       # idempotency-key cache middleware
│   ├── models/
│   │   ├── AuditLog.js
│   │   ├── Device.js
│   │   ├── User.js
│   │   └── Zone.js
│   ├── simulator/
│   │   └── telemetrySimulator.js
│   ├── .env
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ControlPanel.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── DeviceCard.jsx
    │   │   ├── TelemetryCharts.jsx
    │   │   └── ZoneContainer.jsx
    │   ├── hooks/
    │   │   └── useTelemetry.js
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    └── package.json
```


## Key Engineering Highlights

**Idempotency-Key Middleware**
Every status-update request must include a client-generated `X-Idempotency-Key`. The middleware caches request outcomes in memory:
- A new key → the request is processed normally.
- A key currently mid-flight → returns `409 Conflict` (a genuine concurrent duplicate).
- A key already completed → returns the exact cached response instead of reprocessing, preventing duplicate state changes from network retries.

**Atomic Zone Reassignment**
Reassigning a device to a new zone updates multiple documents (the device's zone reference, the old zone's device list, the new zone's device list, and an audit log entry). This is wrapped in a MongoDB session/transaction so all writes succeed or none do. If the connected MongoDB instance doesn't support transactions (no replica set configured — common on local development), the system detects this specific failure and automatically falls back to sequential writes, explicitly reporting `transactionMode: "Sequential Fallback"` in the response so callers know the guarantee that was actually provided.

**Server-Side Role Enforcement**
Admin-only routes are protected by a middleware chain (`authenticateJWT` → `requireRole(['admin'])`), not just conditional rendering in the UI. A viewer-role token is rejected with `403 Forbidden` at the API layer regardless of what the frontend displays.

