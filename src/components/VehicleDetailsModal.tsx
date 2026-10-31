/**
 * Deep Telemetry Vehicle Inspector Modal
 * Displays comprehensive kinematics, speed violation delta, vector calculations,
 * and data provenance (clearly distinguished SIMULATED vs GPS).
 */

import React from 'react';
import { Vehicle } from '../types/vehicle';
import { X, ShieldAlert, AlertTriangle, CheckCircle, Clock, Radio, Compass, Navigation } from 'lucide-react';

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  speedLimitKmh: number;
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  vehicle,
  onClose,
  speedLimitKmh,
}) => {
  if (!vehicle) return null;

  const isSpeeding = vehicle.speedStatus === 'SPEEDING';
  const isStale = vehicle.communicationStatus === 'STALE';
  const isOpposite = vehicle.directionStatus === 'OPPOSITE_DIRECTION';
  const deltaKmh = vehicle.speedKmh !== null ? vehicle.speedKmh - speedLimitKmh : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white ${
                isStale
                  ? 'bg-slate-600'
                  : isSpeeding
                  ? 'bg-rose-600 shadow-sm shadow-rose-600/30'
                  : 'bg-emerald-600 shadow-sm shadow-emerald-600/30'
              }`}
            >
              {vehicle.category.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <span>{vehicle.name}</span>
                <span className="font-mono text-xs text-slate-400 font-normal">
                  [{vehicle.id}]
                </span>
              </h2>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="capitalize">{vehicle.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-cyan-400 font-medium">
                  {vehicle.dataSource} TELEMETRY
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provenance Banner */}
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="font-mono">
            DATA ORIGIN: {vehicle.dataSource} BEACON
          </span>
          <span className="text-amber-400 font-mono">
            {vehicle.dataSource === 'SIMULATED' ? 'DEMO TEST MODEL' : 'AUTHENTIC DEVICE GNSS'}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* Main Kinematics Row */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Current Speed */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Current Speed
              </span>
              <span
                className={`text-xl font-bold font-mono tabular-nums block mt-1 ${
                  isStale
                    ? 'text-slate-400'
                    : isSpeeding
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {vehicle.speedKmh !== null ? `${vehicle.speedKmh}` : '---'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">km/h</span>
            </div>

            {/* Configured Limit */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Road Limit
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-200 block mt-1">
                {speedLimitKmh}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">km/h</span>
            </div>

            {/* Speed Delta */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Limit Delta
              </span>
              <span
                className={`text-xl font-bold font-mono tabular-nums block mt-1 ${
                  isStale
                    ? 'text-slate-400'
                    : isSpeeding
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {deltaKmh !== null ? (deltaKmh > 0 ? `+${deltaKmh}` : `${deltaKmh}`) : '---'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">km/h</span>
            </div>
          </div>

          {/* Deep Kinematics Table */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 overflow-hidden divide-y divide-slate-800/80 text-xs">
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Separation Distance:</span>
              <span className="font-mono tabular-nums font-bold text-white">
                {vehicle.distanceMeters >= 1000
                  ? `${vehicle.distanceMeters} m (${(vehicle.distanceMeters / 1000).toFixed(2)} km)`
                  : `${vehicle.distanceMeters} meters`}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Movement Direction:</span>
              <span
                className={`font-semibold font-mono ${
                  isOpposite ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {vehicle.directionStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Compass Heading:</span>
              <span className="font-mono text-slate-200">
                {vehicle.heading !== null ? `${vehicle.heading}°` : 'Unavailable / Stationary'}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Closing Velocity:</span>
              <span className="font-mono text-slate-200">
                {vehicle.closingSpeedKmh ? `${vehicle.closingSpeedKmh} km/h` : '0 km/h (Stable headway)'}
              </span>
            </div>

            {vehicle.timeToCollisionSeconds !== null ? (
              <div className="p-2.5 flex items-center justify-between bg-rose-950/30">
                <span className="text-rose-300 font-medium">Estimated Time-to-Collision (TTC):</span>
                <span className="font-mono tabular-nums font-bold text-rose-300">
                  {vehicle.timeToCollisionSeconds} seconds
                </span>
              </div>
            ) : null}

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Communication Status:</span>
              <span
                className={`font-mono text-xs font-semibold ${
                  isStale
                    ? 'text-slate-400'
                    : vehicle.communicationStatus === 'ACTIVE'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {vehicle.communicationStatus}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Position Coordinates:</span>
              <span className="font-mono text-[11px] text-slate-400">
                {vehicle.latitude.toFixed(6)}, {vehicle.longitude.toFixed(6)}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-slate-400">Last Telemetry Beacon:</span>
              <span className="font-mono text-[11px] text-slate-400">
                {new Date(vehicle.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Safety Reason Callout */}
          {vehicle.collisionRiskReason ? (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              <span className="font-semibold text-slate-300 block mb-0.5">
                Evaluation Notes:
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {vehicle.collisionRiskReason}
              </span>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
