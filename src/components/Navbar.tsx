/**
 * Sleek, Minimalist Top Navigation Bar
 * Conforms to Top Bar Contract: [Brand wordmark] — [Nav links] — [Map Engine & Status Action]
 */

import React from 'react';
import { Shield, Radio, FileText, Database, Layers } from 'lucide-react';

interface NavbarProps {
  onOpenArchitecture: () => void;
  onOpenLogs: () => void;
  onOpenDocs: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSimulatedOffline: boolean;
  mapEngine: 'google' | 'leaflet';
  setMapEngine: (engine: 'google' | 'leaflet') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenArchitecture,
  onOpenLogs,
  onOpenDocs,
  activeTab,
  setActiveTab,
  isSimulatedOffline,
  mapEngine,
  setMapEngine,
}) => {
  return (
    <header className="h-14 px-5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-6 shrink-0 sticky top-0 z-40">
      {/* Zone 1: Clean Brand Wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Shield className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap leading-none">
            Highway Guardian
          </span>
          <span className="text-[10px] font-mono text-cyan-400/90 tracking-wider uppercase leading-tight mt-0.5">
            ITS Radar · V2X
          </span>
        </div>
      </div>

      {/* Zone 2: Single-line Clean Nav Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`whitespace-nowrap transition-colors hover:text-white pb-0.5 ${
            activeTab === 'monitor'
              ? 'text-cyan-400 font-semibold border-b border-cyan-400'
              : 'text-slate-400'
          }`}
        >
          Live Tracking Radar
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`whitespace-nowrap transition-colors hover:text-white pb-0.5 ${
            activeTab === 'vehicles'
              ? 'text-cyan-400 font-semibold border-b border-cyan-400'
              : 'text-slate-400'
          }`}
        >
          Vehicle Cohort
        </button>
        <button
          onClick={onOpenLogs}
          className="whitespace-nowrap transition-colors text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <Database className="w-3.5 h-3.5 text-slate-500" />
          Offline Telemetry Logs
        </button>
        <button
          onClick={onOpenArchitecture}
          className="whitespace-nowrap transition-colors text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <Radio className="w-3.5 h-3.5 text-slate-500" />
          V2X Architecture
        </button>
        <button
          onClick={onOpenDocs}
          className="whitespace-nowrap transition-colors text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          API &amp; Setup
        </button>
      </nav>

      {/* Zone 3: Neat Map Engine Selector & Status Indicator */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Map Engine Segmented Control */}
        <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px]">
          <button
            onClick={() => setMapEngine('google')}
            className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
              mapEngine === 'google'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Google Satellite
          </button>
          <button
            onClick={() => setMapEngine('leaflet')}
            className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
              mapEngine === 'leaflet'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Leaflet OSM
          </button>
        </div>

        {isSimulatedOffline ? (
          <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded">
            Offline Cache
          </span>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>60 FPS Live</span>
          </div>
        )}

        <button
          onClick={onOpenArchitecture}
          className="px-3 py-1.5 text-xs font-semibold text-slate-100 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap hidden sm:flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Architecture
        </button>
      </div>
    </header>
  );
};
