/**
 * Sleek Telemetry HUD Strip
 * Compact single-row telemetry bar replacing bulky stat cards,
 * conserving vertical space for an expansive map view.
 */

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, Compass, Gauge, Radio } from 'lucide-react';
import { HostVehicleState } from '../types/vehicle';

interface TelemetryHudBarProps {
  vehiclesWithinHorizon: number;
  totalVehicles: number;
  targetRadiusMeters: number;
  speedingCount: number;
  speedLimitKmh: number;
  oncomingCount: number;
  hostVehicle: HostVehicleState;
}

export const TelemetryHudBar: React.FC<TelemetryHudBarProps> = ({
  vehiclesWithinHorizon,
  totalVehicles,
  targetRadiusMeters,
  speedingCount,
  speedLimitKmh,
  oncomingCount,
  hostVehicle,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs text-slate-300">
      {/* Metric 1: Radar Horizon */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
          <Radio className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium leading-none">Radar Horizon</span>
          <span className="font-mono tabular-nums font-bold text-cyan-300 text-xs mt-0.5 block leading-none">
            {targetRadiusMeters}m ({vehiclesWithinHorizon}/{totalVehicles} tracked)
          </span>
        </div>
      </div>

      <div className="hidden lg:block w-px h-6 bg-slate-800" />

      {/* Metric 2: Road Speed Limit */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium leading-none">Configured Limit</span>
          <span className="font-mono tabular-nums font-bold text-white text-xs mt-0.5 block leading-none">
            {speedLimitKmh} km/h
          </span>
        </div>
      </div>

      <div className="hidden lg:block w-px h-6 bg-slate-800" />

      {/* Metric 3: Speed Violations */}
      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center border ${
            speedingCount > 0
              ? 'bg-rose-950/80 border-rose-800 text-rose-400'
              : 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
          }`}
        >
          {speedingCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium leading-none">Speed Status</span>
          <span
            className={`font-mono tabular-nums font-bold text-xs mt-0.5 block leading-none ${
              speedingCount > 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'
            }`}
          >
            {speedingCount > 0 ? `${speedingCount} Speeding Violation` : 'All Compliant (Green)'}
          </span>
        </div>
      </div>

      <div className="hidden lg:block w-px h-6 bg-slate-800" />

      {/* Metric 4: Opposite-Direction */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center">
          <AlertCircle className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium leading-none">Opposite Corridor</span>
          <span className="font-mono tabular-nums font-bold text-amber-300 text-xs mt-0.5 block leading-none">
            {oncomingCount > 0 ? `${oncomingCount} Oncoming Active` : '0 Oncoming'}
          </span>
        </div>
      </div>

      <div className="hidden lg:block w-px h-6 bg-slate-800" />

      {/* Metric 5: Host Vehicle Kinematics */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-mono text-[10px] font-bold">
          <Compass className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium leading-none">Host Kinematics</span>
          <span className="font-mono tabular-nums font-semibold text-white text-xs mt-0.5 block leading-none">
            {hostVehicle.speedKmh !== null ? `${hostVehicle.speedKmh} km/h` : 'Unavailable'} · {hostVehicle.heading ?? 45}° ({hostVehicle.dataSource})
          </span>
        </div>
      </div>
    </div>
  );
};
