/**
 * Google Maps Platform Interactive Highway Tracking Radar
 * Ultra-neat, modern cockpit aesthetic with frosted glass floating HUD controls,
 * 60 FPS smooth kinematic following, radar horizon overlay, and conflict vectors.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import { Vehicle, HostVehicleState, SystemSettings } from '../types/vehicle';
import { SCENARIOS } from '../simulator/scenarios';
import {
  Crosshair,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Gauge,
  Eye,
  EyeOff,
  Activity,
  MapPin,
} from 'lucide-react';

interface GoogleHighwayMapProps {
  apiKey: string;
  hostVehicle: HostVehicleState;
  vehicles: Vehicle[];
  targetRadiusMeters: number;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  isSimulatedOffline: boolean;
  // Scenario & Simulation Controls
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onOpenLocationModal?: () => void;
  roadPolyline?: Array<{ lat: number; lng: number }>;
  roadName?: string;
}

// Smooth camera controller
function MapCameraController({
  hostVehicle,
  autoFollow,
}: {
  hostVehicle: HostVehicleState;
  autoFollow: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !autoFollow) return;
    map.panTo({ lat: hostVehicle.latitude, lng: hostVehicle.longitude });
  }, [map, hostVehicle.latitude, hostVehicle.longitude, autoFollow]);

  return null;
}

// Dedicated Layer for Geographical 1 km Radar Horizon Circles, Real-time Vehicle Traces, & Highway Road Guides
function GoogleRadarAndTracesLayer({
  hostVehicle,
  vehicles,
  targetRadiusMeters,
  showTraces,
  roadPolyline,
  showRoadGuide,
}: {
  hostVehicle: HostVehicleState;
  vehicles: Vehicle[];
  targetRadiusMeters: number;
  showTraces: boolean;
  roadPolyline?: Array<{ lat: number; lng: number }>;
  showRoadGuide?: boolean;
}) {
  const map = useMap();
  const primaryCircleRef = useRef<google.maps.Circle | null>(null);
  const ring250Ref = useRef<google.maps.Circle | null>(null);
  const ring500Ref = useRef<google.maps.Circle | null>(null);
  const polylinesMapRef = useRef<globalThis.Map<string, google.maps.Polyline>>(new globalThis.Map());
  const hostPolylineRef = useRef<google.maps.Polyline | null>(null);
  const roadGuidePolylineRef = useRef<google.maps.Polyline | null>(null);

  // 0. Highway Corridor Road Polyline Guide
  useEffect(() => {
    if (!map) return;

    if (showRoadGuide && roadPolyline && roadPolyline.length > 1) {
      const path = roadPolyline.map((p) => ({ lat: p.lat, lng: p.lng }));
      if (!roadGuidePolylineRef.current) {
        roadGuidePolylineRef.current = new google.maps.Polyline({
          map,
          path,
          strokeColor: '#0ea5e9',
          strokeOpacity: 0.55,
          strokeWeight: 4,
          clickable: false,
        });
      } else {
        roadGuidePolylineRef.current.setMap(map);
        roadGuidePolylineRef.current.setPath(path);
      }
    } else if (roadGuidePolylineRef.current) {
      roadGuidePolylineRef.current.setMap(null);
    }
  }, [map, roadPolyline, showRoadGuide]);

  // Clean up road guide on unmount
  useEffect(() => {
    return () => {
      if (roadGuidePolylineRef.current) {
        roadGuidePolylineRef.current.setMap(null);
        roadGuidePolylineRef.current = null;
      }
    };
  }, []);

  // 1. Geographical Radar Circles
  useEffect(() => {
    if (!map) return;
    const center = { lat: hostVehicle.latitude, lng: hostVehicle.longitude };

    // Primary target horizon circle (1000m / 1 km)
    if (!primaryCircleRef.current) {
      primaryCircleRef.current = new google.maps.Circle({
        map,
        center,
        radius: targetRadiusMeters,
        strokeColor: '#06b6d4',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: '#06b6d4',
        fillOpacity: 0.04,
        clickable: false,
      });
    } else {
      primaryCircleRef.current.setCenter(center);
      primaryCircleRef.current.setRadius(targetRadiusMeters);
    }

    // Inner concentric guide rings (500m & 250m)
    if (targetRadiusMeters >= 500) {
      if (!ring500Ref.current) {
        ring500Ref.current = new google.maps.Circle({
          map,
          center,
          radius: 500,
          strokeColor: '#38bdf8',
          strokeOpacity: 0.35,
          strokeWeight: 1,
          fillOpacity: 0,
          clickable: false,
        });
      } else {
        ring500Ref.current.setCenter(center);
      }

      if (!ring250Ref.current) {
        ring250Ref.current = new google.maps.Circle({
          map,
          center,
          radius: 250,
          strokeColor: '#38bdf8',
          strokeOpacity: 0.3,
          strokeWeight: 1,
          fillOpacity: 0,
          clickable: false,
        });
      } else {
        ring250Ref.current.setCenter(center);
      }
    } else {
      if (ring500Ref.current) {
        ring500Ref.current.setMap(null);
        ring500Ref.current = null;
      }
      if (ring250Ref.current) {
        ring250Ref.current.setMap(null);
        ring250Ref.current = null;
      }
    }
  }, [map, hostVehicle.latitude, hostVehicle.longitude, targetRadiusMeters]);

  // Clean up circles on unmount
  useEffect(() => {
    return () => {
      if (primaryCircleRef.current) primaryCircleRef.current.setMap(null);
      if (ring250Ref.current) ring250Ref.current.setMap(null);
      if (ring500Ref.current) ring500Ref.current.setMap(null);
    };
  }, []);

  // 2. Trajectory & Speed Traces (Polylines)
  useEffect(() => {
    if (!map) return;

    if (!showTraces) {
      polylinesMapRef.current.forEach((pl) => pl.setMap(null));
      polylinesMapRef.current.clear();
      if (hostPolylineRef.current) {
        hostPolylineRef.current.setMap(null);
        hostPolylineRef.current = null;
      }
      return;
    }

    // Host Vehicle Trace
    if (hostVehicle.trail && hostVehicle.trail.length > 1) {
      const hostPath = hostVehicle.trail.map((p) => ({ lat: p.latitude, lng: p.longitude }));
      if (!hostPolylineRef.current) {
        hostPolylineRef.current = new google.maps.Polyline({
          map,
          path: hostPath,
          strokeColor: '#06b6d4',
          strokeOpacity: 0.85,
          strokeWeight: 3.5,
          clickable: false,
        });
      } else {
        hostPolylineRef.current.setPath(hostPath);
      }
    }

    // Vehicle Traces
    const currentIds = new Set<string>();
    vehicles.forEach((v) => {
      currentIds.add(v.id);
      if (!v.trail || v.trail.length < 2) return;

      const path = v.trail.map((p) => ({ lat: p.latitude, lng: p.longitude }));
      let color = '#10b981'; // Green (compliant)
      if (v.communicationStatus === 'STALE') {
        color = '#64748b'; // Grey (stale)
      } else if (v.speedStatus === 'SPEEDING') {
        color = '#f43f5e'; // Red (speeding)
      } else if (v.directionStatus === 'OPPOSITE_DIRECTION') {
        color = '#f59e0b'; // Amber (oncoming)
      }

      let poly = polylinesMapRef.current.get(v.id);
      if (!poly) {
        poly = new google.maps.Polyline({
          map,
          path,
          strokeColor: color,
          strokeOpacity: 0.75,
          strokeWeight: 3,
          clickable: false,
        });
        polylinesMapRef.current.set(v.id, poly);
      } else {
        poly.setPath(path);
        poly.setOptions({ strokeColor: color });
      }
    });

    // Remove defunct vehicles
    polylinesMapRef.current.forEach((poly, id) => {
      if (!currentIds.has(id)) {
        poly.setMap(null);
        polylinesMapRef.current.delete(id);
      }
    });
  }, [map, showTraces, hostVehicle.trail, vehicles]);

  // Clean up polylines on unmount
  useEffect(() => {
    return () => {
      polylinesMapRef.current.forEach((pl) => pl.setMap(null));
      polylinesMapRef.current.clear();
      if (hostPolylineRef.current) {
        hostPolylineRef.current.setMap(null);
        hostPolylineRef.current = null;
      }
    };
  }, []);

  return null;
}

export const GoogleHighwayMap: React.FC<GoogleHighwayMapProps> = ({
  apiKey,
  hostVehicle,
  vehicles,
  targetRadiusMeters,
  selectedVehicleId,
  onSelectVehicle,
  isSimulatedOffline,
  isRunning,
  onStart,
  onPause,
  onReset,
  activeScenarioId,
  onSelectScenario,
  settings,
  onUpdateSettings,
  onOpenLocationModal,
  roadPolyline,
  roadName,
}) => {
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [mapType, setMapType] = useState<'hybrid' | 'satellite' | 'roadmap'>('hybrid');
  const [showControlsDrawer, setShowControlsDrawer] = useState<boolean>(false);

  const getCategoryIconSvg = (cat: string) => {
    switch (cat) {
      case 'bike':
        return (
          <path
            d="M5.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM15 6h2l2 4M9 14l3-7h3M12 7h3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        );
      case 'truck':
        return (
          <path
            d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2m13-3h2.382a1 1 0 0 0 .894-.553l1.448-2.894A1 1 0 0 0 22 12V8a2 2 0 0 0-2-2h-6v12h1m-9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        );
      case 'bus':
        return (
          <path
            d="M8 6v6m8-6v6M4 18h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Zm2 3v-3m12 3v-3M6 10h12"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        );
      default: // car
        return (
          <path
            d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3C2 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2m14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        );
    }
  };

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl">
      <APIProvider apiKey={apiKey}>
        <Map
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultCenter={{ lat: hostVehicle.latitude, lng: hostVehicle.longitude }}
          defaultZoom={15}
          mapTypeId={mapType}
          gestureHandling="greedy"
          disableDefaultUI={false}
          onDragstart={() => setAutoFollow(false)}
          className="w-full h-full min-h-[580px]"
        >
          <MapCameraController hostVehicle={hostVehicle} autoFollow={autoFollow} />

          {/* Geographical 1.0 km Radar Horizon & Real-Time Trajectory Speed Traces */}
          <GoogleRadarAndTracesLayer
            hostVehicle={hostVehicle}
            vehicles={vehicles}
            targetRadiusMeters={targetRadiusMeters}
            showTraces={settings.showTraces}
            roadPolyline={roadPolyline}
            showRoadGuide={settings.showRoadGuide}
          />

          {/* Host Vehicle Advanced Marker */}
          <AdvancedMarker
            position={{ lat: hostVehicle.latitude, lng: hostVehicle.longitude }}
            zIndex={1000}
          >
            <div className="relative flex items-center justify-center cursor-pointer group">
              {/* Subtle Host Proximity Halo */}
              <div className="absolute w-12 h-12 rounded-full border border-cyan-400/50 bg-cyan-500/15 pointer-events-none radar-pulse" />

              <div
                className="w-9 h-9 rounded-full bg-cyan-600 border-2 border-white shadow-xl flex items-center justify-center text-white transition-transform"
                style={{ transform: `rotate(${hostVehicle.heading ?? 45}deg)` }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
              </div>

              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-[10px] font-bold text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800 shadow-md">
                HOST ({hostVehicle.dataSource === 'GPS' ? 'GPS' : 'SIM'})
              </div>
            </div>
          </AdvancedMarker>

          {/* Surrounding Participating Vehicles Advanced Markers */}
          {vehicles.map((vehicle) => {
            const isSelected = vehicle.id === selectedVehicleId;
            const isWithinTargetRadius = vehicle.distanceMeters <= targetRadiusMeters;
            const heading = vehicle.heading ?? 0;

            let markerBg = 'bg-emerald-600';
            let markerBorder = 'border-emerald-300';
            let statusTextColor = 'text-emerald-400';
            let speedDisplay = `${vehicle.speedKmh ?? '--'} km/h`;

            if (vehicle.communicationStatus === 'STALE' || vehicle.speedStatus === 'UNKNOWN') {
              markerBg = 'bg-slate-600';
              markerBorder = 'border-slate-400';
              statusTextColor = 'text-slate-400';
            } else if (vehicle.speedStatus === 'SPEEDING') {
              markerBg = 'bg-rose-600';
              markerBorder = 'border-rose-300';
              statusTextColor = 'text-rose-400';
            }

            const isHazard =
              vehicle.collisionRiskLevel === 'CRITICAL' || vehicle.collisionRiskLevel === 'CAUTION';

            return (
              <AdvancedMarker
                key={vehicle.id}
                position={{ lat: vehicle.latitude, lng: vehicle.longitude }}
                onClick={() => onSelectVehicle(vehicle.id)}
                zIndex={isSelected ? 999 : isHazard ? 950 : 500}
              >
                <div
                  className={`relative flex items-center justify-center cursor-pointer transition-transform ${
                    !isWithinTargetRadius ? 'opacity-40 hover:opacity-100' : 'opacity-100'
                  } ${isSelected ? 'scale-125' : 'hover:scale-110'}`}
                >
                  {isHazard && (
                    <div className="absolute -inset-3 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
                  )}
                  {isSelected && (
                    <div className="absolute -inset-2 rounded-full border-2 border-cyan-400 animate-pulse pointer-events-none" />
                  )}

                  <div
                    className={`w-8 h-8 rounded-full ${markerBg} border-2 ${markerBorder} shadow-lg flex items-center justify-center text-white relative`}
                  >
                    {/* Heading Needle */}
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none"
                      style={{
                        transformOrigin: '50% 20px',
                        transform: `rotate(${heading}deg)`,
                      }}
                    >
                      <svg
                        className="w-3.5 h-3.5 text-white filter drop-shadow"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2L4 18h16z" />
                      </svg>
                    </div>

                    <svg className="w-4 h-4 fill-none" viewBox="0 0 24 24">
                      {getCategoryIconSvg(vehicle.category)}
                    </svg>
                  </div>

                  {/* Micro label badge with Speed and Distance */}
                  <div
                    className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 ${statusTextColor} text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-700/80 shadow flex items-center gap-1`}
                  >
                    <span>{vehicle.speedStatus === 'SPEEDING' ? '⚡ ' : ''}{speedDisplay}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-cyan-300 font-normal">
                      {vehicle.distanceMeters >= 1000
                        ? `${(vehicle.distanceMeters / 1000).toFixed(2)}km`
                        : `${vehicle.distanceMeters}m`}
                    </span>
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>

      {/* FLOATING TOP HUD: Compact Scenario Player & Legend */}
      <div className="absolute top-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left: Minimalist Status Legend & Road-Lock Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/90 shadow-xl flex items-center gap-3 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>&le;{settings.speedLimitKmh} km/h</span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Speeding</span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>Stale</span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Host</span>
            </div>
          </div>

          {/* Road-Lock Pill Button */}
          <button
            onClick={() => onUpdateSettings({ roadLockEnabled: !settings.roadLockEnabled })}
            className={`px-2.5 py-1.5 rounded-lg border backdrop-blur-md shadow-xl flex items-center gap-1.5 text-xs font-semibold transition-all ${
              settings.roadLockEnabled
                ? 'bg-emerald-950/85 border-emerald-600/80 text-emerald-300 hover:bg-emerald-900/85'
                : 'bg-slate-950/85 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={
              settings.roadLockEnabled
                ? `Strict Road-Lock ACTIVE: Vehicles strictly on ${roadName || 'Highway'} pavement lanes`
                : 'Free vector movement'
            }
          >
            <Navigation className={`w-3.5 h-3.5 ${settings.roadLockEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="font-mono text-[11px]">
              {settings.roadLockEnabled ? '🛣️ Road-Lock: ON' : 'Road-Lock: OFF'}
            </span>
          </button>
        </div>

        {/* Right: Integrated Scenario Control Capsule */}
        <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-800/90 shadow-xl flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={onPause}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1"
            >
              <Pause className="w-3 h-3" />
              Pause
            </button>
          ) : (
            <button
              onClick={onStart}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              Start
            </button>
          )}

          <select
            value={activeScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 max-w-[200px] truncate"
          >
            {SCENARIOS.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.title}
              </option>
            ))}
          </select>

          <button
            onClick={onReset}
            title="Reset Scenario"
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-800" />

          {/* Real-World Location Access Button */}
          {onOpenLocationModal && (
            <button
              onClick={onOpenLocationModal}
              className={`p-1.5 rounded transition-all flex items-center gap-1.5 text-xs ${
                hostVehicle.dataSource === 'GPS'
                  ? 'bg-emerald-950 border border-emerald-700/80 text-emerald-300 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
              title="Access Real Device GPS or Switch Highway Corridor"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline text-[11px] font-medium">
                {hostVehicle.dataSource === 'GPS' ? 'GPS Active' : 'Location'}
              </span>
            </button>
          )}

          {/* Quick Slider Drawer Toggle */}
          <button
            onClick={() => setShowControlsDrawer(!showControlsDrawer)}
            className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs ${
              showControlsDrawer ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
            title="Tune Speed Limit & Radar Horizon"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* QUICK EXPANDABLE SLIDERS DRAWER */}
      {showControlsDrawer && (
        <div className="absolute top-14 right-3 z-20 bg-slate-950/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-700 shadow-2xl w-72 text-xs flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800 pb-1.5">
            <span>Radar &amp; Speed Settings</span>
            <button
              onClick={() => setShowControlsDrawer(false)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              Done
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Road Speed Limit:</span>
              <span className="font-mono font-bold text-cyan-400">{settings.speedLimitKmh} km/h</span>
            </div>
            <input
              type="range"
              min="40"
              max="130"
              step="5"
              value={settings.speedLimitKmh}
              onChange={(e) => onUpdateSettings({ speedLimitKmh: Number(e.target.value) })}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Radar Target Radius:</span>
              <span className="font-mono font-bold text-cyan-400">
                {settings.targetRadiusMeters >= 1000
                  ? `${(settings.targetRadiusMeters / 1000).toFixed(1)} km (${settings.targetRadiusMeters}m)`
                  : `${settings.targetRadiusMeters} meters`}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={settings.targetRadiusMeters}
              onChange={(e) => onUpdateSettings({ targetRadiusMeters: Number(e.target.value) })}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            {/* Quick preset buttons */}
            <div className="flex gap-1 mt-1.5">
              {[250, 500, 1000, 1500, 2000].map((r) => (
                <button
                  key={r}
                  onClick={() => onUpdateSettings({ targetRadiusMeters: r })}
                  className={`px-1 py-0.5 rounded text-[10px] font-mono flex-1 text-center transition-colors ${
                    settings.targetRadiusMeters === r
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
                  }`}
                >
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Speed Traces Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              Dynamic Speed Traces:
            </span>
            <button
              onClick={() => onUpdateSettings({ showTraces: !settings.showTraces })}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                settings.showTraces
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {settings.showTraces ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          {/* Highway Road-Lock Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-300 flex items-center gap-1.5 font-medium">
              <Navigation className="w-3 h-3 text-emerald-400" />
              Highway Road-Lock:
            </span>
            <button
              onClick={() => onUpdateSettings({ roadLockEnabled: !settings.roadLockEnabled })}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                settings.roadLockEnabled
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/80 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {settings.roadLockEnabled ? 'LOCKED ON ROAD' : 'FREE VECTOR'}
            </button>
          </div>

          {/* Road Corridor Guide Line Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              Road Centerline Guide:
            </span>
            <button
              onClick={() => onUpdateSettings({ showRoadGuide: !settings.showRoadGuide })}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                settings.showRoadGuide
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {settings.showRoadGuide ? 'VISIBLE' : 'HIDDEN'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400">Pace:</span>
            <div className="flex gap-1">
              {[0.5, 1, 2].map((m) => (
                <button
                  key={m}
                  onClick={() => onUpdateSettings({ simulationMultiplier: m })}
                  className={`px-1.5 py-0.5 rounded font-mono ${
                    settings.simulationMultiplier === m
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-850 text-slate-400'
                  }`}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BOTTOM HUD: Camera Follow, Re-center, & Map Layer */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-800/90 shadow-xl">
          <button
            onClick={() => setAutoFollow(true)}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-xs font-semibold text-slate-200 border border-slate-700 rounded transition-colors flex items-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            Center
          </button>

          <button
            onClick={() => setAutoFollow(!autoFollow)}
            className={`px-2.5 py-1 text-xs font-semibold border rounded transition-colors flex items-center gap-1.5 ${
              autoFollow
                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/80'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${autoFollow ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            Auto-Follow: {autoFollow ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Satellite Mode Switcher */}
        <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md p-1 rounded-lg border border-slate-800/90 shadow-xl flex items-center gap-1 text-xs">
          <button
            onClick={() => setMapType('hybrid')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              mapType === 'hybrid' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Satellite (Hybrid)
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              mapType === 'satellite' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pure Satellite
          </button>
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              mapType === 'roadmap' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Roadmap
          </button>
        </div>
      </div>
    </div>
  );
};
