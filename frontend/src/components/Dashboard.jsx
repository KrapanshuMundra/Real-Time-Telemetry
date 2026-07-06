import React, { useState } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import ZoneContainer from './ZoneContainer';
import TelemetryCharts from './TelemetryCharts';
import ControlPanel from './ControlPanel';
import { Activity, ShieldCheck, Database, Server, RefreshCw, Terminal, CheckCircle, LogIn, LogOut } from 'lucide-react';

export default function Dashboard() {
  const {
    devices,
    zones,
    isConnected,
    logs,
    user,
    loading,
    error,
    login,
    logout,
    updateDeviceStatus,
    reassignDeviceZone,
    refetch
  } = useTelemetry();

  const [selectedDevice, setSelectedDevice] = useState(null);

  // 1. Return Login Page if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 grid-bg">
        {/* Decorative background glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md glass-card p-8 shadow-xl relative z-10 border border-slate-200/90">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-3 shadow-sm">
              <Server className="w-8 h-8 text-brand-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              Telemetry <span className="text-brand-600">Engine</span>
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Real-Time Resource Tracking & Localized Zone Automation
            </p>
          </div>

          {error && (
            <div className="p-3 mb-5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target;
            const username = form.username.value;
            const password = form.password.value;
            try {
              await login(username, password);
            } catch (err) {
              // error is handled inside useTelemetry hook and rendered above
            }
          }} className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">Username</label>
              <input
                name="username"
                type="text"
                required
                placeholder="Enter username (e.g., admin)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                required
                placeholder="Enter password (e.g., admin123)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer mt-4"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Access Dashboard
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-6 pt-5 border-t border-slate-200/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block text-center mb-3">Quick Demo Access</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => login('admin', 'admin123')}
                className="bg-red-50 hover:bg-red-100/80 border border-red-200/60 text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-red-600 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin (RW)
              </button>
              <button
                onClick={() => login('viewer', 'viewer123')}
                className="bg-emerald-550/10 hover:bg-emerald-100/80 border border-emerald-200/60 text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-emerald-600 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Activity className="w-3.5 h-3.5" />
                Viewer (RO)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute status distributions
  const totalCount = devices.length;
  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const alertCount = devices.filter((d) => d.status === 'alert').length;
  const maintenanceCount = devices.filter((d) => d.status === 'maintenance').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 grid-bg">
      
      {/* 1. Header Section */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/90 backdrop-blur-xl border border-slate-200/80 p-6 rounded-2xl shadow-sm relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-24 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Server className="w-8 h-8 text-brand-600 animate-pulse" />
            Telemetry <span className="text-brand-600">Engine</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-semibold">
            Real-Time Resource Tracking & Localized Zone Automation
          </p>
        </div>

        {/* System Status Badges & Auth controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Refresh Manual trigger */}
          <button
            onClick={refetch}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title="Refresh database state"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>

          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs ${
            isConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'LIVE CHANNEL' : 'DISCONNECTED'}
          </div>

          {/* Active Database Health */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-slate-700 font-bold text-xs">
            <Database className="w-4 h-4 text-brand-600" />
            MongoDB: ACTIVE
          </div>

          {/* Active User Information & Logout */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Session</div>
              <div className="text-xs font-extrabold text-slate-800">
                @{user.username} <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-black ${
                  user.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>{user.role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-50 hover:bg-red-550/10 hover:text-red-600 border border-slate-200 transition-all text-slate-600 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. KPI Cards Panel */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Devices */}
        <div className="glass-card p-4 flex flex-col justify-between h-24">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Resources</span>
          <div className="text-3xl font-extrabold text-slate-800 mt-1">{totalCount}</div>
        </div>
        {/* Online Devices */}
        <div className="glass-card p-4 flex flex-col justify-between h-24 border-emerald-500/20">
          <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Online</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">{onlineCount}</div>
        </div>
        {/* Maintenance Devices */}
        <div className="glass-card p-4 flex flex-col justify-between h-24 border-amber-500/20">
          <span className="text-[10px] text-amber-600 uppercase font-bold tracking-wider">Maintenance</span>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">{maintenanceCount}</div>
        </div>
        {/* Alert Devices */}
        <div className="glass-card p-4 flex flex-col justify-between h-24 border-red-500/20">
          <span className="text-[10px] text-red-600 uppercase font-bold tracking-wider">Alerts</span>
          <div className="text-3xl font-extrabold text-red-600 mt-1">{alertCount}</div>
        </div>
        {/* Offline Devices */}
        <div className="glass-card p-4 flex flex-col justify-between h-24 border-slate-300 col-span-2 md:col-span-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Offline</span>
          <div className="text-3xl font-extrabold text-slate-500 mt-1">{offlineCount}</div>
        </div>
      </section>

      {/* 3. Main Board Grid: Zone containers & charts */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2 columns: Zones Grid */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-600" />
              Localized Operational Grid
            </h2>
            <span className="text-xs text-slate-400 font-semibold font-mono">
              Framer-Motion layout springs enabled
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {zones.map((zone) => (
              <ZoneContainer 
                key={zone._id} 
                zone={zone} 
                devices={devices} 
                onSelectDevice={(dev) => setSelectedDevice(dev)}
              />
            ))}
          </div>
        </div>

        {/* Right column: Charts & Live Logs */}
        <div className="space-y-6 flex flex-col">
          {/* Analytics Charts */}
          <div className="flex-grow">
            <TelemetryCharts devices={devices} />
          </div>

          {/* Event notifications logs */}
          <div className="glass-card p-6 flex flex-col h-[320px]">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3">
              <Terminal className="w-5 h-5 text-brand-600" />
              Live Events & Audit Trails
            </h3>
            
            <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 text-xs font-mono">
              {logs.length === 0 ? (
                <div className="text-slate-400 flex items-center justify-center h-full">
                  Waiting for system operations...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-2.5">
                    <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${
                      log.type === 'auth' 
                        ? 'text-emerald-500' 
                        : log.type === 'reassign' 
                        ? 'text-brand-600' 
                        : 'text-amber-500'
                    }`} />
                    <div className="min-w-0 flex-grow">
                      <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold">
                        <span>{log.details}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                      </div>
                      <p className="text-slate-700 font-bold mt-1 break-words">{log.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </section>

      {/* 4. Controls Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-600" />
          Control Center Console
        </h2>
        
        <ControlPanel
          devices={devices}
          zones={zones}
          user={user}
          loading={loading}
          error={error}
          login={login}
          logout={logout}
          updateDeviceStatus={updateDeviceStatus}
          reassignDeviceZone={reassignDeviceZone}
        />
      </section>

    </div>
  );
}
