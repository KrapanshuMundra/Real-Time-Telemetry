import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Activity, Thermometer, Battery } from 'lucide-react';

export default function TelemetryCharts({ devices }) {
  const [chartData, setChartData] = useState([]);

  // Calculate aggregates when devices update
  useEffect(() => {
    if (!devices || devices.length === 0) return;

    // Filter active (online, maintenance, alert) devices for average calculations
    const activeDevices = devices.filter((d) => d.status !== 'offline');
    
    const avgTemp = activeDevices.length > 0
      ? activeDevices.reduce((sum, d) => sum + d.temperature, 0) / activeDevices.length
      : 0;

    const avgBattery = devices.reduce((sum, d) => sum + d.battery, 0) / devices.length;

    const newPoint = {
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      temperature: parseFloat(avgTemp.toFixed(1)),
      battery: parseFloat(avgBattery.toFixed(1))
    };

    setChartData((prev) => {
      const next = [...prev, newPoint];
      if (next.length > 20) {
        return next.slice(next.length - 20); // Keep last 20 ticks
      }
      return next;
    });
  }, [devices]);

  return (
    <div className="glass-card p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-600 animate-pulse" />
            Live System Analytics
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Aggregated metrics streaming at 1.5s interval</p>
        </div>

        {/* Legend pills */}
        <div className="flex gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-red-600">
            <Thermometer className="w-4 h-4" />
            Avg Temp
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <Battery className="w-4 h-4" />
            Avg Battery
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-grow w-full h-[260px] select-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#64748B" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              yAxisId="left"
              domain={[20, 100]} 
              stroke="#DC2626" 
              fontSize={10}
              tickLine={false}
              axisLine={false} 
              tickFormatter={(v) => `${v}°C`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={[0, 100]} 
              stroke="#059669" 
              fontSize={10}
              tickLine={false}
              axisLine={false} 
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '12px',
                color: '#1E293B',
                fontSize: '11px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
              labelStyle={{ fontWeight: 'extrabold', color: '#0EA5E9' }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temperature"
              name="Avg Temp (°C)"
              stroke="#DC2626"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#DC2626', strokeWidth: 2, fill: '#FFFFFF' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="battery"
              name="Avg Battery (%)"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#059669', strokeWidth: 2, fill: '#FFFFFF' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
