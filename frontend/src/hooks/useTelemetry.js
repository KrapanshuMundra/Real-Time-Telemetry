import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const useTelemetry = () => {
  const [devices, setDevices] = useState([]);
  const [zones, setZones] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('telemetry_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('telemetry_user')) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial devices & zones
  const fetchData = useCallback(async () => {
    try {
      const [devicesRes, zonesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/devices`),
        fetch(`${BACKEND_URL}/api/zones`)
      ]);
      if (devicesRes.ok && zonesRes.ok) {
        const devicesData = await devicesRes.json();
        const zonesData = await zonesRes.json();
        setDevices(devicesData);
        setZones(zonesData);
      }
    } catch (err) {
      console.error('[useTelemetry] Error fetching initial state:', err);
    }
  }, []);

  // Set up connection and listeners
  useEffect(() => {
    fetchData();

    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected to telemetry stream');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket] Disconnected from telemetry stream');
    });

    // Handle high-frequency bulk updates (from simulator)
    socket.on('telemetry-update', (updatedDevices) => {
      setDevices(updatedDevices);
    });

    // Handle discrete single-device updates (from manual control or simulator state flips)
    socket.on('device-update', (updatedDevice) => {
      setDevices((prev) =>
        prev.map((device) =>
          device.deviceId === updatedDevice.deviceId ? { ...device, ...updatedDevice } : device
        )
      );
    });

    // Handle zone reassignment logs
    socket.on('zone-reassigned', (info) => {
      const { deviceName, newZoneName, transactionMode } = info;
      const logEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        message: `${deviceName} relocated to ${newZoneName}`,
        details: `Protocol: ${transactionMode}`,
        type: 'reassign'
      };
      setLogs((prev) => [logEntry, ...prev.slice(0, 49)]); // Cap history at last 50 log items
      fetchData(); // Trigger full refresh to sync populated devices in zones
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('telemetry-update');
      socket.off('device-update');
      socket.off('zone-reassigned');
      socket.disconnect();
    };
  }, [fetchData]);

  // Periodic poll of zones to keep populated device list up to date
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const zonesRes = await fetch(`${BACKEND_URL}/api/zones`);
        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          setZones(zonesData);
        }
      } catch (err) {
        // Silently swallow network polling drops
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Sign In Admin / Viewer
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('telemetry_token', data.token);
      localStorage.setItem('telemetry_user', JSON.stringify(data.user));

      const logEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        message: `User '${data.user.username}' logged in successfully`,
        details: `Access Level: ${data.user.role.toUpperCase()}`,
        type: 'auth'
      };
      setLogs((prev) => [logEntry, ...prev.slice(0, 49)]);

      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign Out
  const logout = () => {
    const username = user?.username || 'user';
    setToken(null);
    setUser(null);
    localStorage.removeItem('telemetry_token');
    localStorage.removeItem('telemetry_user');

    const logEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      message: `User '${username}' logged out`,
      details: 'Session terminated',
      type: 'auth'
    };
    setLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
  };

  // Update Status with strict Idempotency Key
  const updateDeviceStatus = async (deviceId, status, customIdempotencyKey = null) => {
    if (!token) {
      throw new Error('Authorization token missing. Please log in.');
    }

    const key = customIdempotencyKey || `idemp-key-${deviceId}-${Date.now()}`;

    try {
      const res = await fetch(`${BACKEND_URL}/api/devices/${deviceId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': key
        },
        body: JSON.stringify({ status })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update status');
      }

      const logEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        message: `Device ${deviceId} changed to '${status}'`,
        details: `Idempotency Key: ${key.substring(0, 18)}...`,
        type: 'status'
      };
      setLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
      
      fetchData(); // Sync states
      return data;
    } catch (err) {
      console.error('[useTelemetry] Error updating device status:', err.message);
      throw err;
    }
  };

  // Reassign Device Zone (Atomic MongoDB Transaction)
  const reassignDeviceZone = async (deviceId, newZoneId) => {
    if (!token) {
      throw new Error('Authorization token missing. Please log in.');
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/zones/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId, newZoneId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to reassign zone');
      }

      fetchData(); // Sync states
      return data;
    } catch (err) {
      console.error('[useTelemetry] Error reassigning device zone:', err.message);
      throw err;
    }
  };

  return {
    devices,
    zones,
    isConnected,
    logs,
    user,
    token,
    loading,
    error,
    login,
    logout,
    updateDeviceStatus,
    reassignDeviceZone,
    refetch: fetchData
  };
};
