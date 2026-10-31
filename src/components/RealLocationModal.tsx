/**
 * Real-World Location & GPS Sensor Manager Modal
 * Grants real-time browser Geolocation access, reveals physical sensor telemetry,
 * performs reverse geocoding, and provides 1-click highway corridor presets worldwide.
 */

import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
  Gauge,
  Globe2,
  Radio,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';
import { GpsData } from '../hooks/useGeolocation';
import { HostVehicleState } from '../types/vehicle';
import { REAL_WORLD_PRESETS, RealWorldLocationPreset } from '../utils/realLocations';

interface RealLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gpsData: GpsData;
  onRequestGps: () => void;
  onStopGps: () => void;
  hostVehicle: HostVehicleState;
  onSelectPreset: (preset: RealWorldLocationPreset) => void;
  onApplyCustomCoords: (lat: number, lon: number, name?: string) => void;
}

export const RealLocationModal: React.FC<RealLocationModalProps> = ({
  isOpen,
  onClose,
  gpsData,
  onRequestGps,
  onStopGps,
  hostVehicle,
  onSelectPreset,
  onApplyCustomCoords,
}) => {
  const [customLat, setCustomLat] = useState<string>('');
  const [customLon, setCustomLon] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setCustomError('Latitude must be between -90 and +90 degrees.');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setCustomError('Longitude must be between -180 and +180 degrees.');
      return;
    }

    setCustomError(null);
    onApplyCustomCoords(lat, lon, customName.trim() || `Coord: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <MapPin className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Real-World Location &amp; GPS Radar Access
                {gpsData.status === 'ACTIVE' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-bold uppercase tracking-wider">
                    GPS Locked
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Center the 1 km radar horizon and nearby vehicle telemetry around your real physical position.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Section 1: Live Browser Geolocation Sensor */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${gpsData.status === 'ACTIVE' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Physical Device Geolocation Sensor
                </span>
              </div>
              {gpsData.status === 'ACTIVE' && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Sensor Active
                </span>
              )}
            </div>

            {/* Current Real Location Card */}
            {gpsData.status === 'ACTIVE' && gpsData.latitude && gpsData.longitude ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/50 rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">
                      Current Physical Position
                    </span>
                    <span className="text-sm font-semibold text-white block mt-0.5">
                      {gpsData.placeName || `${gpsData.latitude.toFixed(5)}°N, ${gpsData.longitude.toFixed(5)}°E`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">Accuracy</span>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      ±{gpsData.accuracyMeters ?? 5}m
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-800/30 text-[11px] font-mono">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">LATITUDE</span>
                    <span className="text-white font-bold">{gpsData.latitude.toFixed(5)}°</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">LONGITUDE</span>
                    <span className="text-white font-bold">{gpsData.longitude.toFixed(5)}°</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">LIVE SPEED</span>
                    <span className="text-cyan-300 font-bold">
                      {gpsData.speedKmh !== null ? `${gpsData.speedKmh} km/h` : '0.0 km/h (Stationary)'}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">HEADING</span>
                    <span className="text-white font-bold">
                      {gpsData.heading !== null ? `${gpsData.heading}°` : '360° North'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg text-slate-300 text-xs leading-relaxed">
                <p>
                  Clicking <strong className="text-cyan-300">Access Real Device Location</strong> requests your browser&apos;s HTML5 Geolocation permission.
                  Your radar and nearby vehicles will instantly reposition around your true coordinates.
                </p>
                {gpsData.error && (
                  <div className="mt-2 p-2 bg-rose-950/40 border border-rose-800/80 rounded text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{gpsData.error}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={onRequestGps}
                disabled={gpsData.status === 'REQUESTING'}
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all text-xs"
              >
                {gpsData.status === 'REQUESTING' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Acquiring High-Accuracy GPS...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-4 h-4" />
                    <span>{gpsData.status === 'ACTIVE' ? 'Re-acquire & Lock GPS' : 'Access My Real Location (Live GPS)'}</span>
                  </>
                )}
              </button>

              {gpsData.status === 'ACTIVE' && (
                <button
                  onClick={onStopGps}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-slate-700 transition-colors text-xs font-semibold"
                >
                  Disconnect Live GPS
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Real-World Highway Corridors Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Real-World Highway Corridors (1-Click Teleport)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Satellite Ready</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {REAL_WORLD_PRESETS.map((preset) => {
                const isActive =
                  Math.abs(hostVehicle.latitude - preset.latitude) < 0.005 &&
                  Math.abs(hostVehicle.longitude - preset.longitude) < 0.005;

                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-cyan-950/50 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs truncate">{preset.name}</span>
                        {isActive && (
                          <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800 shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        {preset.badge} · {preset.region}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>
                        Lat: {preset.latitude.toFixed(2)}°, Lon: {preset.longitude.toFixed(2)}°
                      </span>
                      <span className="text-cyan-400 font-bold">{preset.speedLimitKmh} km/h Limit</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Custom Coordinates Input */}
          <form onSubmit={handleCustomSubmit} className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2.5">
            <span className="font-bold text-white uppercase tracking-wider text-[11px] block">
              Direct Coordinates Entry (Any Global Road)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Latitude (°N/S)</label>
                <input
                  type="text"
                  placeholder="e.g. 17.4485"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Longitude (°E/W)</label>
                <input
                  type="text"
                  placeholder="e.g. 78.3742"
                  value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Location Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. NH-44 Toll Plaza"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {customError && <p className="text-[11px] text-rose-400">{customError}</p>}

            <button
              type="submit"
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 font-semibold rounded-lg border border-slate-700 transition-colors text-xs"
            >
              Teleport Radar to Custom Coordinates
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Google Satellite / Hybrid imagery automatically loads at chosen coordinates</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
