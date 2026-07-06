import React, { useState } from 'react';
import { Shield, Key, RefreshCw, Layers, LogIn, LogOut, Info, CheckCircle, XCircle } from 'lucide-react';

export default function ControlPanel({
  devices,
  zones,
  user,
  loading,
  error,
  login,
  logout,
  updateDeviceStatus,
  reassignDeviceZone
}) {
  // Auth Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Status Update State
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [targetStatus, setTargetStatus] = useState('online');
  const [simulateRetry, setSimulateRetry] = useState(false);
  const [idempotencyLogs, setIdempotencyLogs] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);

  // Zone Reassign State
  const [reassignDeviceId, setReassignDeviceId] = useState('');
  const [targetZoneId, setTargetZoneId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignMessage, setReassignMessage] = useState('');

  // Handle Quick Login
  const handleQuickLogin = async (role) => {
    try {
      if (role === 'admin') {
        await login('admin', 'admin123');
      } else {
        await login('viewer', 'viewer123');
      }
      // reset form
      setUsername('');
      setPassword('');
    } catch (err) {
      // handled in custom hook error state
    }
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (err) {
      // error handled in hook
    }
  };

  // Status Change with Optional Idempotency Retry Simulation
  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedDeviceId) return;

    setStatusLoading(true);
    setIdempotencyLogs([]);
    
    // Generate a single key for this transaction
    const baseKey = `sim-key-${selectedDeviceId}-${Date.now()}`;

    try {
      if (simulateRetry) {
        // Fire Request 1
        setIdempotencyLogs((prev) => [...prev, { req: 1, status: 'sending', message: 'Sending request 1...' }]);
        const req1Promise = updateDeviceStatus(selectedDeviceId, targetStatus, baseKey);

        // Fire Request 2 immediately after (15ms delay) with the exact same key
        let req2Promise;
        await new Promise((resolve) => setTimeout(() => {
          setIdempotencyLogs((prev) => [...prev, { req: 2, status: 'sending', message: 'Sending duplicate request 2 with identical key...' }]);
          req2Promise = updateDeviceStatus(selectedDeviceId, targetStatus, baseKey);
          resolve();
        }, 15));

        const [res1, res2] = await Promise.allSettled([req1Promise, req2Promise]);

        const logEntries = [];
        if (res1.status === 'fulfilled') {
          logEntries.push({ 
            req: 1, 
            status: 'success', 
            message: `Request 1 Success: DB updated. Status: ${res1.value.device.status}`,
            details: `Audit ID: ${res1.value.auditLogId}`
          });
        } else {
          logEntries.push({ req: 1, status: 'error', message: `Request 1 Failed: ${res1.reason.message}` });
        }

        if (res2.status === 'fulfilled') {
          logEntries.push({ 
            req: 2, 
            status: 'success', 
            message: `Request 2 Success: Idempotent Cache hit! Status: ${res2.value.device.status}`,
            details: `Served cached copy. Audit ID: ${res2.value.auditLogId}`
          });
        } else {
          logEntries.push({ req: 2, status: 'error', message: `Request 2 Failed: ${res2.reason.message}` });
        }

        setIdempotencyLogs(logEntries);
      } else {
        // Normal single request
        setIdempotencyLogs([{ req: 1, status: 'sending', message: 'Sending single request...' }]);
        const res = await updateDeviceStatus(selectedDeviceId, targetStatus, baseKey);
        setIdempotencyLogs([
          { 
            req: 1, 
            status: 'success', 
            message: `Success: Status updated to '${res.device.status}'`,
            details: `Idempotency Key: ${baseKey.slice(0, 18)}...`
          }
        ]);
      }
    } catch (err) {
      setIdempotencyLogs((prev) => [...prev, { req: 1, status: 'error', message: err.message }]);
    } finally {
      setStatusLoading(false);
    }
  };

  // Reassign Zone (Atomic Transaction)
  const handleZoneReassign = async (e) => {
    e.preventDefault();
    if (!reassignDeviceId || !targetZoneId) return;

    setReassignLoading(true);
    setReassignMessage('');

    try {
      const res = await reassignDeviceZone(reassignDeviceId, targetZoneId);
      setReassignMessage(`Success! Reassigned via ${res.transactionMode}.`);
    } catch (err) {
      setReassignMessage(`Error: ${err.message}`);
    } finally {
      setReassignLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Credentials / Authentication Panel */}
      <div className="glass-card p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-brand-600" />
            Security & Authentication
          </h3>
          <p className="text-xs text-slate-500 mb-4 font-semibold">Access tiers govern status controls and zone reassignments</p>
          
          {error && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-semibold">
              {error}
            </div>
          )}

          {!user ? (
            <form onSubmit={handleManualLogin} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-brand-500 mt-1 font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. admin123"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-brand-500 mt-1 font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors mt-2 cursor-pointer shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            </form>
          ) : (
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active User</div>
                  <div className="text-base font-bold text-slate-800">@{user.username}</div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  user.role === 'admin' 
                    ? 'bg-red-50 border border-red-200 text-red-600' 
                    : 'bg-emerald-550/10 border border-emerald-200 text-emerald-600'
                }`}>
                  {user.role}
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Quick Access */}
        {!user && (
          <div className="mt-4 pt-4 border-t border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Quick Demo Login</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => handleQuickLogin('admin')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs py-1.5 px-2 rounded-lg font-bold transition-all text-red-600 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
              >
                Admin (RW)
              </button>
              <button
                onClick={() => handleQuickLogin('viewer')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs py-1.5 px-2 rounded-lg font-bold transition-all text-emerald-600 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
              >
                Viewer (RO)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Idempotent Status Toggle Panel */}
      <div className="glass-card p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
            <Key className="w-5 h-5 text-amber-500" />
            Device Status Controller
          </h3>
          <p className="text-xs text-slate-500 mb-4 font-semibold">Requires Admin tier. Demands an X-Idempotency-Key header.</p>

          <form onSubmit={handleStatusUpdate} className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Select Resource</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-500 mt-1 font-semibold"
              >
                <option value="">-- Choose Device --</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.name} ({d.deviceId}) - {d.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Target Operational State</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-500 mt-1 font-semibold"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
                <option value="alert">Critical Alert</option>
              </select>
            </div>

            <div className="flex items-center gap-2 py-1 select-none">
              <input
                id="retry-checkbox"
                type="checkbox"
                checked={simulateRetry}
                onChange={(e) => setSimulateRetry(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
              />
              <label htmlFor="retry-checkbox" className="text-xs text-slate-600 cursor-pointer flex items-center gap-1 font-semibold">
                Simulate Network Retry
                <Info className="w-3.5 h-3.5 text-slate-400" title="Sends the exact same key twice rapidly" />
              </label>
            </div>

            <button
              type="submit"
              disabled={statusLoading || !selectedDeviceId || !user || user.role !== 'admin'}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all mt-2 cursor-pointer shadow-sm"
            >
              {statusLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Apply State Change'}
            </button>
          </form>
        </div>

        {/* Idempotency Audit Terminal */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 bg-slate-50 p-2.5 rounded-xl font-mono text-[10px] min-h-[70px] max-h-[110px] overflow-y-auto border border-slate-200/60">
          <div className="text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Idempotency Engine Logs
          </div>
          {idempotencyLogs.length === 0 ? (
            <span className="text-slate-400">Awaiting status execution...</span>
          ) : (
            idempotencyLogs.map((log, i) => (
              <div key={i} className="mb-1">
                <span className={log.status === 'success' ? 'text-emerald-600 font-bold' : log.status === 'error' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                  {log.status === 'success' ? '✔' : log.status === 'error' ? '✘' : '⚡'} [{log.req}] {log.message}
                </span>
                {log.details && <div className="text-slate-400 pl-4">{log.details}</div>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Mongoose Transaction reassignment Panel */}
      <div className="glass-card p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-brand-600" />
            Zone Reassignment Portal
          </h3>
          <p className="text-xs text-slate-500 mb-4 font-semibold">Requires Admin tier. Executes Mongoose Atomic Transactions.</p>

          <form onSubmit={handleZoneReassign} className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Select Resource</label>
              <select
                value={reassignDeviceId}
                onChange={(e) => setReassignDeviceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-500 mt-1 font-semibold"
              >
                <option value="">-- Choose Device --</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.name} ({d.deviceId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Target Functional Zone</label>
              <select
                value={targetZoneId}
                onChange={(e) => setTargetZoneId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-500 mt-1 font-semibold"
              >
                <option value="">-- Choose Target Zone --</option>
                {zones.map((z) => (
                  <option key={z._id} value={z._id}>
                    {z.name} ({z.code})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={reassignLoading || !reassignDeviceId || !targetZoneId || !user || user.role !== 'admin'}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all mt-8 cursor-pointer shadow-sm"
            >
              {reassignLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm Relocation'}
            </button>
          </form>
        </div>

        {/* Transaction confirmation feedback */}
        {reassignMessage && (
          <div className={`mt-4 p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            reassignMessage.startsWith('Error') 
              ? 'bg-red-50 border-red-200 text-red-600' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
          }`}>
            {reassignMessage.startsWith('Error') ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            <span className="truncate">{reassignMessage}</span>
          </div>
        )}
      </div>

    </div>
  );
}
