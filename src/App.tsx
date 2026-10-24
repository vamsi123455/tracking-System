/**
 * Highway Vehicle Tracking & Safety System - Main Application
 * Ultra-neat, streamlined ITS radar dashboard with Google Maps Platform (Satellite / Hybrid)
 * and high-density telemetry tracking.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { TelemetryHudBar } from './components/TelemetryHudBar';
import { HighwayMap } from './components/HighwayMap';
import { GoogleHighwayMap } from './components/GoogleHighwayMap';
import { VehicleList } from './components/VehicleList';
import { CollisionAlertBanner } from './components/CollisionAlertBanner';
import { VehicleDetailsModal } from './components/VehicleDetailsModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { TelemetryLogsModal } from './components/TelemetryLogsModal';
import { ApiDocsModal } from './components/ApiDocsModal';
import { HighwaySafetySimulator } from './simulator/engine';
import { useGeolocation } from './hooks/useGeolocation';
import {
  Vehicle,
  HostVehicleState,
  SafetyAlert,
  SystemSettings,
} from './types/vehicle';
import {
  DEFAULT_SETTINGS,
  loadStoredSettings,
  saveStoredSettings,
} from './utils/storage';
import { Info } from 'lucide-react';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBLAC8IVh7IEjPfZ0l6NRneXGyWrFx3tVI';

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(() => loadStoredSettings());
  const simulatorRef = useRef<HighwaySafetySimulator | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hostVehicle, setHostVehicle] = useState<HostVehicleState>({
    id: 'HOST-01',
    name: 'Host Vehicle',
    category: 'car',
    latitude: 17.4485,
    longitude: 78.3742,
    speedKmh: 75,
    heading: 45,
    accuracyMeters: 2.5,
    timestamp: Date.now(),
    dataSource: 'SIMULATED',
    isGpsActive: false,
    gpsError: null,
  });
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('normal-traffic');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('monitor');
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('google');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);
  const [isDetailsModalExplicitOpen, setIsDetailsModalExplicitOpen] = useState<boolean>(false);

  // Modals state
  const [isArchModalOpen, setIsArchModalOpen] = useState<boolean>(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);

  // Browser Geolocation
  const { gpsData, startWatching, stopWatching } = useGeolocation();

  // Listen for Google Maps Platform quota event
  useEffect(() => {
    const onQuota = () => setIsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Initialize simulator
  useEffect(() => {
    const sim = new HighwaySafetySimulator(settings);
    simulatorRef.current = sim;

    const unsubscribe = sim.subscribe((state) => {
      setVehicles(state.vehicles);
      setHostVehicle(state.host);
      setAlerts(state.alerts);
    });

    // Auto-start simulation for continuous smooth tracking
    sim.start();
    setIsSimRunning(true);

    return () => {
      unsubscribe();
      sim.pause();
    };
  }, []);

  // Sync GPS updates to simulator if GPS is active
  useEffect(() => {
    if (gpsData.status === 'ACTIVE' && gpsData.latitude && gpsData.longitude && simulatorRef.current) {
      simulatorRef.current.setHostFromGps({
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        speedKmh: gpsData.speedKmh,
        heading: gpsData.heading,
        accuracyMeters: gpsData.accuracyMeters,
      });
    } else if (gpsData.status === 'DENIED' || gpsData.status === 'UNAVAILABLE') {
      simulatorRef.current?.setGpsError(gpsData.error);
    }
  }, [gpsData]);

  // Handle settings changes
  const handleUpdateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      saveStoredSettings(merged);
      simulatorRef.current?.updateSettings(merged);
      return merged;
    });
  };

  const handleStartSim = () => {
    simulatorRef.current?.start();
    setIsSimRunning(true);
  };

  const handlePauseSim = () => {
    simulatorRef.current?.pause();
    setIsSimRunning(false);
  };

  const handleResetSim = () => {
    simulatorRef.current?.reset();
    setIsSimRunning(false);
  };

  const handleSelectScenario = (id: string) => {
    setActiveScenarioId(id);
    simulatorRef.current?.initScenario(id);
    simulatorRef.current?.start();
    setIsSimRunning(true);
  };

  const handleRequestGps = () => {
    startWatching();
  };

  const handleToggleGps = (enable: boolean) => {
    if (!enable) {
      stopWatching();
      simulatorRef.current?.toggleGpsMode(false);
    } else {
      startWatching();
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  // Stats calculation
  const totalVehicles = vehicles.length;
  const vehiclesWithinHorizon = vehicles.filter((v) => v.distanceMeters <= settings.targetRadiusMeters).length;
  const speedingCount = vehicles.filter((v) => v.speedStatus === 'SPEEDING').length;
  const oncomingCount = vehicles.filter((v) => v.directionStatus === 'OPPOSITE_DIRECTION').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Tier 2 Quota Defense Notice */}
      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Sleek Minimalist Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenArchitecture={() => setIsArchModalOpen(true)}
        onOpenLogs={() => setIsLogsModalOpen(true)}
        onOpenDocs={() => setIsDocsModalOpen(true)}
        isSimulatedOffline={settings.isOfflineSimulated}
        mapEngine={mapEngine}
        setMapEngine={setMapEngine}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3.5 md:p-5 flex flex-col gap-3.5">
        {/* Collision & Safety Alert Banner (Only fires on hazards) */}
        <CollisionAlertBanner
          alerts={alerts}
          onDismiss={(id) => simulatorRef.current?.dismissAlert(id)}
          onClearAll={() => simulatorRef.current?.clearAlerts()}
          soundEnabled={settings.soundEnabled}
          onToggleSound={() => handleUpdateSettings({ soundEnabled: !settings.soundEnabled })}
        />

        {/* Compact Telemetry HUD Strip */}
        <TelemetryHudBar
          vehiclesWithinHorizon={vehiclesWithinHorizon}
          totalVehicles={totalVehicles}
          targetRadiusMeters={settings.targetRadiusMeters}
          speedingCount={speedingCount}
          speedLimitKmh={settings.speedLimitKmh}
          oncomingCount={oncomingCount}
          hostVehicle={hostVehicle}
        />

        {/* Tab 1: Live Monitor Radar */}
        {activeTab === 'monitor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 items-stretch">
            {/* Left Column: Full-Height Immersive Interactive Map */}
            <div className="lg:col-span-8 flex flex-col h-[620px] lg:h-[calc(100vh-190px)] min-h-[580px]">
              {mapEngine === 'google' ? (
                <GoogleHighwayMap
                  apiKey={GOOGLE_MAPS_API_KEY}
                  hostVehicle={hostVehicle}
                  vehicles={vehicles}
                  targetRadiusMeters={settings.targetRadiusMeters}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={(id) => setSelectedVehicleId(id)}
                  isSimulatedOffline={settings.isOfflineSimulated}
                  isRunning={isSimRunning}
                  onStart={handleStartSim}
                  onPause={handlePauseSim}
                  onReset={handleResetSim}
                  activeScenarioId={activeScenarioId}
                  onSelectScenario={handleSelectScenario}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                />
              ) : (
                <HighwayMap
                  hostVehicle={hostVehicle}
                  vehicles={vehicles}
                  targetRadiusMeters={settings.targetRadiusMeters}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={(id) => setSelectedVehicleId(id)}
                  isSimulatedOffline={settings.isOfflineSimulated}
                  isRunning={isSimRunning}
                  onStart={handleStartSim}
                  onPause={handlePauseSim}
                  onReset={handleResetSim}
                  activeScenarioId={activeScenarioId}
                  onSelectScenario={handleSelectScenario}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}
            </div>

            {/* Right Column: High-Density Vehicle List */}
            <div className="lg:col-span-4 h-[620px] lg:h-[calc(100vh-190px)] min-h-[580px]">
              <VehicleList
                vehicles={vehicles}
                speedLimitKmh={settings.speedLimitKmh}
                targetRadiusMeters={settings.targetRadiusMeters}
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={(id) => setSelectedVehicleId(id)}
                onOpenDetailsModal={() => setIsDetailsModalExplicitOpen(true)}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Vehicle Cohort & Multi-Category Analysis */}
        {activeTab === 'vehicles' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Highway Participant Cohort Classification
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time telemetry breakdown across Cars, Bikes, Trucks, and Buses.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('monitor')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors"
              >
                Return to Live Radar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['car', 'bike', 'truck', 'bus'] as const).map((category) => {
                const categoryVehicles = vehicles.filter((v) => v.category === category);
                const avgSpeed = categoryVehicles.length > 0
                  ? Math.round(categoryVehicles.reduce((sum, v) => sum + (v.speedKmh ?? 0), 0) / categoryVehicles.length)
                  : 0;
                const violators = categoryVehicles.filter((v) => v.speedStatus === 'SPEEDING').length;

                return (
                  <div key={category} className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between shadow-xl">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-mono tracking-wider text-cyan-400 font-semibold">
                          {category}s
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {categoryVehicles.length} Active
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-bold font-mono text-white">
                          {avgSpeed} <span className="text-xs font-normal text-slate-400">km/h avg</span>
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        Violations: <span className={violators > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{violators} vehicles</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1">
                      {categoryVehicles.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelectedVehicleId(v.id);
                            setIsDetailsModalExplicitOpen(true);
                          }}
                          className="flex items-center justify-between text-left hover:text-white py-0.5 transition-colors"
                        >
                          <span className="truncate">{v.name}</span>
                          <span className={`font-mono ${v.speedStatus === 'SPEEDING' ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                            {v.speedKmh} km/h
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Minimalist Bottom Disclaimer Strip */}
        <div className="py-1 px-2 text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>DEMO / SIMULATED ENVIRONMENT · 60 FPS Continuous Radar · 100m Detection Horizon</span>
          <span>Google Maps Platform Integration</span>
        </div>
      </main>

      {/* Modals */}
      {isDetailsModalExplicitOpen && selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setIsDetailsModalExplicitOpen(false)}
          speedLimitKmh={settings.speedLimitKmh}
        />
      )}

      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      <TelemetryLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
      />

      <ApiDocsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />
    </div>
  );
}
