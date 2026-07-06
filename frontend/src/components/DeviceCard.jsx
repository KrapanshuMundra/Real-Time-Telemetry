import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Battery, Thermometer, MapPin } from 'lucide-react';

const statusConfig = {
  online: {
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-500/20',
    glowClass: 'glow-green',
    label: 'Online'
  },
  offline: {
    color: 'bg-slate-500',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-300',
    glowClass: 'glow-blue',
    label: 'Offline'
  },
  maintenance: {
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-500/20',
    glowClass: 'glow-orange',
    label: 'Maintenance'
  },
  alert: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-500/20',
    glowClass: 'glow-red',
    label: 'Critical'
  }
};

export default function DeviceCard({ device, onSelect }) {
  const config = statusConfig[device.status] || statusConfig.online;

  // Battery bar tinting
  const getBatteryColor = (level) => {
    if (level < 20) return 'bg-red-500';
    if (level < 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => onSelect && onSelect(device)}
      className={`glass-card glass-card-hover p-4 border cursor-pointer select-none flex flex-col justify-between h-auto min-h-[200px] relative overflow-hidden ${config.borderColor} ${config.glowClass}`}
    >
      {/* Background Glow */}
      <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full opacity-5 filter blur-2xl ${config.color}`} />

      {/* Top Row: Info & Status */}
      <div className="flex justify-between items-start z-10 gap-2 mb-3">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider">{device.deviceId}</span>
          <h4 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5 truncate" title={device.name}>
            <Cpu className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="truncate">{device.name}</span>
          </h4>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/60 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${config.color} animate-pulse`} />
          <span className={`text-[9px] font-black uppercase tracking-wider ${config.textColor}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Middle Row: Live metrics (Flexible boxes to prevent overlap) */}
      <div className="grid grid-cols-2 gap-2 my-2 z-10">
        {/* Temperature */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <Thermometer className={`w-4 h-4 shrink-0 ${device.temperature > 80 ? 'text-red-500' : 'text-slate-400'}`} />
          <div className="min-w-0">
            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Temp</div>
            <div className="text-xs font-black font-mono text-slate-700 truncate">
              {device.temperature.toFixed(1)}°C
            </div>
          </div>
        </div>

        {/* Spatial Coordinates */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Location</div>
            <div className="text-xs font-black font-mono text-slate-700 truncate">
              {device.coordinates.x},{device.coordinates.y}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Battery tracking */}
      <div className="z-10 mt-3">
        <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold mb-1">
          <span className="flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-slate-400" />
            Battery
          </span>
          <span className="font-mono font-black text-slate-700">{device.battery}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${device.battery}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full ${getBatteryColor(device.battery)}`}
          />
        </div>
      </div>

      {/* Trigger Critical Overlay if Alert is active */}
      {device.status === 'alert' && (
        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
      )}
    </motion.div>
  );
}
