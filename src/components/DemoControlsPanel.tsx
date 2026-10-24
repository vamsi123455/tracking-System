/**
 * Interactive Demo Controls Panel
 * Provides fully-wired controls for deterministic highway scenarios,
 * target horizon slider, road speed limits, speed multipliers, and offline toggle.
 */

import React from 'react';
import { Play, Pause, RotateCcw, Sliders, Wifi, WifiOff, MapPin, Gauge } from 'lucide-react';
import { SCENARIOS } from '../simulator/scenarios';
import { SystemSettings, HostVehicleState } from '../types/vehicle';

interface DemoControlsPanelProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  hostVehicle: HostVehicleState;
  onToggleGps: (enable: boolean) => void;
  gpsStatus: string;
  onRequestGps: () => void;
}

export const DemoControlsPanel: React.FC<DemoControlsPanelProps> = ({
  isRunning,
  onStart,
  onPause,
  onReset,
  activeScenarioId,
  onSelectScenario,
  settings,
  onUpdateSettings,
  hostVehicle,
  onToggleGps,
  gpsStatus,
  onRequestGps,
}) => {
  const currentScenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
      {/* Simulation Playback & Scenario Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={onPause}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause Sim
            </button>
          ) : (
            <button
              onClick={onStart}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              Start Sim
            </button>
          )}

          <button
            onClick={onReset}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Scenario
          </button>

          {isRunning && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-1 rounded flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Continuous Motion (No Delay)
            </span>
          )}
        </div>

        {/* Scenario Dropdown */}
        <div className="flex items-center gap-2 min-w-[240px]">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Scenario:</span>
          <select
            value={activeScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {SCENARIOS.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Scenario Description card */}
      <div className="bg-slate-950/70 p-3 rounded border border-slate-800 text-xs">
        <div className="font-semibold text-cyan-300 flex items-center justify-between">
          <span>{currentScenario.title}</span>
          <div className="flex items-center gap-1.5">
            {currentScenario.tags.map((t, idx) => (
              <span key={idx} className="text-[10px] text-slate-400 font-mono">
                {idx > 0 ? '· ' : ''}{t}
              </span>
            ))}
          </div>
        </div>
        <p className="text-slate-400 mt-1 leading-relaxed">
          {currentScenario.description}
        </p>
      </div>

      {/* Sliders Grid: Speed Limit & Target Horizon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Speed Limit Slider */}
        <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Road Speed Limit
            </span>
            <span className="font-mono tabular-nums text-cyan-400 font-bold">
              {settings.speedLimitKmh} km/h
            </span>
          </div>
          <input
            type="range"
            min="40"
            max="130"
            step="5"
            value={settings.speedLimitKmh}
            onChange={(e) => onUpdateSettings({ speedLimitKmh: Number(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>40 km/h</span>
            <span>Default: 80 km/h</span>
            <span>130 km/h</span>
          </div>
        </div>

        {/* Target Detection Radius Slider */}
        <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Target Radar Radius
            </span>
            <span className="font-mono tabular-nums text-cyan-400 font-bold">
              {settings.targetRadiusMeters} meters
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="350"
            step="10"
            value={settings.targetRadiusMeters}
            onChange={(e) => onUpdateSettings({ targetRadiusMeters: Number(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>50m (Close)</span>
            <span>Target: 100m</span>
            <span>350m (Far)</span>
          </div>
        </div>
      </div>

      {/* Secondary Controls: Simulation Speed, Offline Simulation, GPS Input */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-300">
        {/* Speed multiplier */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Sim Pace:</span>
          {[0.5, 1, 2, 4].map((mult) => (
            <button
              key={mult}
              onClick={() => onUpdateSettings({ simulationMultiplier: mult })}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                settings.simulationMultiplier === mult
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {mult}x
            </button>
          ))}
        </div>

        {/* Offline Mode Toggle */}
        <button
          onClick={() => onUpdateSettings({ isOfflineSimulated: !settings.isOfflineSimulated })}
          className={`px-3 py-1 rounded border text-xs font-medium transition-colors flex items-center gap-1.5 ${
            settings.isOfflineSimulated
              ? 'bg-amber-950 text-amber-300 border-amber-600'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
          }`}
        >
          {settings.isOfflineSimulated ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              Offline Simulation ON
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              Online (V2X Active)
            </>
          )}
        </button>

        {/* Live GPS toggle */}
        <div className="flex items-center gap-2">
          {hostVehicle.isGpsActive ? (
            <button
              onClick={() => onToggleGps(false)}
              className="px-3 py-1 bg-cyan-950 border border-cyan-600 text-cyan-300 rounded text-xs font-medium flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Switch to Simulated Highway
            </button>
          ) : (
            <button
              onClick={onRequestGps}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded text-xs font-medium flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Acquire Live Browser GPS
            </button>
          )}
        </div>
      </div>

      {/* GPS Status feedback note */}
      {hostVehicle.isGpsActive ? (
        <div className="text-[11px] bg-cyan-950/40 border border-cyan-900/60 p-2 rounded text-cyan-200 flex items-center justify-between">
          <span>
            Live Device GPS connected: Lat {hostVehicle.latitude.toFixed(4)}, Lon {hostVehicle.longitude.toFixed(4)}
          </span>
          <span className="font-mono">
            Speed: {hostVehicle.speedKmh !== null ? `${hostVehicle.speedKmh} km/h` : 'Unavailable (Stationary)'}
          </span>
        </div>
      ) : null}
    </div>
  );
};
