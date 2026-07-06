import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DeviceCard from './DeviceCard';
import { Box, HelpCircle } from 'lucide-react';

export default function ZoneContainer({ zone, devices, onSelectDevice }) {
  // Filter devices belonging to this zone
  const zoneDevices = devices.filter((d) => d.zone && (d.zone._id === zone._id || d.zone === zone._id));

  return (
    <div className="glass-card p-6 flex flex-col h-full min-h-[300px]">
      {/* Zone Header */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-brand-600">
            {zone.code}
          </span>
          <h3 className="text-xl font-bold text-slate-800 mt-0.5">{zone.name}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm line-clamp-1">
            {zone.description}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 px-3 py-1 rounded-full text-brand-600 text-xs font-bold font-mono">
          <Box className="w-3.5 h-3.5" />
          {zoneDevices.length} DEV
        </div>
      </div>

      {/* Grid of Devices in Zone */}
      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow content-start overflow-y-auto max-h-[600px] pr-1"
      >
        <AnimatePresence mode="popLayout">
          {zoneDevices.length > 0 ? (
            zoneDevices.map((device) => (
              <motion.div
                key={device.deviceId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              >
                <DeviceCard device={device} onSelect={onSelectDevice} />
              </motion.div>
            ))
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="col-span-full py-16 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50"
            >
              <HelpCircle className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No active resources in this zone</p>
              <p className="text-xs text-slate-400 mt-1">Reassign devices in the console below</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
