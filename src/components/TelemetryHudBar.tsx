/**
 * Sleek Telemetry HUD Strip
 * Compact single-row telemetry bar replacing bulky stat cards,
 * with real-world GPS status, reverse-geocoded location badge, and radar telemetry.
 */

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Compass,
  Gauge,
  Radio,
  MapPin,
  Crosshair,
  Loader2,
} from 'lucide-react';
import { HostVehicleState } from '../types/vehicle';

interface TelemetryHudBarProps {
  vehiclesWithinHorizon: number;
  totalVehicles: number;
  targetRadiusMeters: number;
  speedingCount: number;
  speedLimitKmh: number;
  oncomingCount: number;
  hostVehicle: HostVehicleState;
  onOpenLocationModal: () => void;
  gpsStatus: 'IDLE' | 'REQUESTING' | 'ACTIVE' | 'DENIED' | 'UNAVAILABLE';
  roadLockEnabled?: boolean;
  roadName?: string;
  onToggleRoadLock?: () => void;
}

export const TelemetryHudBar: React.FC<TelemetryHudBarProps> = ({
  vehiclesWithinHorizon,
  totalVehicles,
  targetRadiusMeters,
  speedingCount,
  speedLimitKmh,
  oncomingCount,
  hostVehicle,
  onOpenLocationModal,
  gpsStatus,
  roadLockEnabled = true,
  roadName,
  onToggleRoadLock,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-4 py-2 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs text-slate-300">
      {/* Metric 0: Real-World Location & GPS Sensor Lock */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenLocationModal}
          className={`px-2.5 py-1.5 rounded-md border flex items-center gap-2 transition-all group ${
            gpsStatus === 'ACTIVE'
              ? 'bg-emerald-950/70 border-emerald-700/80 hover:bg-emerald-900/70 text-emerald-300'
              : gpsStatus === 'REQUESTING'
              ? 'bg-cyan-950/70 border-cyan-700/80 text-cyan-300'
              : 'bg-slate-950/80 border-slate-700/80 hover:border-cyan-500/80 text-slate-200'
          }`}
          title="Click to access real GPS or change real-world highway corridor"
        >
          <div className="relative">
            {gpsStatus === 'ACTIVE' ? (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            ) : gpsStatus === 'REQUESTING' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            )}
          </div>
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-wider block font-mono text-slate-400 leading-none">
              {gpsStatus === 'ACTIVE' ? '📍 GPS Locked' : '📍 Real Location'}
            </span>
            <span className="font-semibold text-white text-[11px] block leading-tight mt-0.5 max-w-[170px] truncate">
              {hostVehicle.locationName || `${hostVehicle.latitude.toFixed(3)}°N, ${hostVehicle.longitude.toFixed(3)}°E`}
            </span>
          </div>
        </button>
      </div>

      <div className="hidden lg:block w-px h-6 bg-slate-800" />

      {/* Metric 0b: Highway Road-Lock Alignment */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRoadLock}
          className={`px-2.5 py-1.5 rounded-md border flex items-center gap-2 transition-all text-left group ${
            roadLockEnabled
              ? 'bg-emerald-950/70 border-emerald-700/80 hover:bg-emerald-900/70 text-emerald-300'
              : 'bg-slate-950/80 border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white'
          }`}
          title={roadLockEnabled ? 'Vehicles strictly locked to road pavement lanes' : 'Click to enable Road-Lock'}
        >
          <div className={`w-2 h-2 rounded-full ${roadLockEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <div>
            <span className="text-[9px] uppercase tracking-wider block font-mono text-slate-400 leading-none">
              Road Alignment
            </span>
            <span className="font-semibold text-[11px] block leading-tight mt-0.5 font-mono">
              {roadLockEnabled ? '🛣️ 100% On-Road' : 'Free Vector'}
            </span>
          </div>
        </button>
      </div>

      <div className="hidden lg:block w-px h-6 bg-slate-800" />

      {/* Metric 1: Radar Horizon */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
          <Radio className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium leading-none">Radar Horizon</span>
          <span className="font-mono tabular-nums font-bold text-cyan-300 text-xs mt-0.5 block leading-none">
            {targetRadiusMeters >= 1000 ? `${(targetRadiusMeters / 1000).toFixed(1)} km` : `${targetRadiusMeters}m`} ({vehiclesWithinHorizon}/{totalVehicles} tracked)
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
