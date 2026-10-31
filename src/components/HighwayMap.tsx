/**
 * Highway Interactive Map Component (Leaflet + OpenStreetMap)
 * Ultra-neat frosted glass floating HUD controls, 60 FPS smooth kinematic following,
 * radar horizon overlay, and conflict vectors.
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Vehicle, HostVehicleState, SystemSettings } from '../types/vehicle';
import { SCENARIOS } from '../simulator/scenarios';
import { Crosshair, Navigation, Play, Pause, RotateCcw, Sliders, Activity, MapPin } from 'lucide-react';

interface HighwayMapProps {
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

export const HighwayMap: React.FC<HighwayMapProps> = ({
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const hostMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const markerIconSignaturesRef = useRef<Map<string, string>>(new Map());
  const trajectoryLinesRef = useRef<L.Polyline[]>([]);
  const roadGuideLineRef = useRef<L.Polyline | null>(null);
  
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [showControlsDrawer, setShowControlsDrawer] = useState<boolean>(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [hostVehicle.latitude, hostVehicle.longitude],
      zoom: 15,
      minZoom: 13,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      className: 'map-tiles-dark',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('dragstart', () => {
      setAutoFollow(false);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Host Vehicle Marker, Radius Circle, and Smooth Camera Follow
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hostPos: L.LatLngExpression = [hostVehicle.latitude, hostVehicle.longitude];

    if (autoFollow) {
      map.panTo(hostPos, { animate: false });
    }

    const hostHeading = hostVehicle.heading ?? 45;
    const hostIcon = L.divIcon({
      className: 'host-marker-wrapper',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
          <div class="absolute w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/40 radar-pulse"></div>
          <div class="w-8 h-8 rounded-full bg-cyan-600 border-2 border-white shadow-lg flex items-center justify-center text-white" style="transform: rotate(${hostHeading}deg)">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-[10px] font-bold text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
            HOST (${hostVehicle.dataSource === 'GPS' ? 'GPS' : 'SIM'})
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!hostMarkerRef.current) {
      hostMarkerRef.current = L.marker(hostPos, { icon: hostIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      hostMarkerRef.current.setLatLng(hostPos);
      hostMarkerRef.current.setIcon(hostIcon);
    }

    if (!radiusCircleRef.current) {
      radiusCircleRef.current = L.circle(hostPos, {
        radius: targetRadiusMeters,
        color: '#06b6d4',
        weight: 1.5,
        dashArray: '4, 6',
        fillColor: '#06b6d4',
        fillOpacity: 0.05,
      }).addTo(map);
    } else {
      radiusCircleRef.current.setLatLng(hostPos);
      radiusCircleRef.current.setRadius(targetRadiusMeters);
    }
  }, [hostVehicle, targetRadiusMeters, autoFollow]);

  // Road Corridor Guide Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (settings.showRoadGuide && roadPolyline && roadPolyline.length > 1) {
      const latLngs: L.LatLngExpression[] = roadPolyline.map((p) => [p.lat, p.lng]);
      if (!roadGuideLineRef.current) {
        roadGuideLineRef.current = L.polyline(latLngs, {
          color: '#0ea5e9',
          weight: 4,
          opacity: 0.6,
        }).addTo(map);
      } else {
        roadGuideLineRef.current.setLatLngs(latLngs);
        if (!map.hasLayer(roadGuideLineRef.current)) {
          roadGuideLineRef.current.addTo(map);
        }
      }
    } else if (roadGuideLineRef.current) {
      roadGuideLineRef.current.remove();
      roadGuideLineRef.current = null;
    }
  }, [roadPolyline, settings.showRoadGuide]);

  // Update Nearby Vehicles Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    trajectoryLinesRef.current.forEach((line) => line.remove());
    trajectoryLinesRef.current = [];

    const existingMarkerIds = new Set(vehicleMarkersRef.current.keys());
    const currentVehicleIds = new Set(vehicles.map((v) => v.id));

    existingMarkerIds.forEach((id) => {
      if (!currentVehicleIds.has(id)) {
        vehicleMarkersRef.current.get(id)?.remove();
        vehicleMarkersRef.current.delete(id);
        markerIconSignaturesRef.current.delete(id);
      }
    });

    const getCategoryIconSvg = (cat: string) => {
      switch (cat) {
        case 'bike':
          return `<path d="M5.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM15 6h2l2 4M9 14l3-7h3M12 7h3"/>`;
        case 'truck':
          return `<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2m13-3h2.382a1 1 0 0 0 .894-.553l1.448-2.894A1 1 0 0 0 22 12V8a2 2 0 0 0-2-2h-6v12h1m-9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>`;
        case 'bus':
          return `<path d="M8 6v6m8-6v6M4 18h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Zm2 3v-3m12 3v-3M6 10h12"/>`;
        default:
          return `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3C2 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2m14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>`;
      }
    };

    vehicles.forEach((vehicle) => {
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

      const isHazard = vehicle.collisionRiskLevel === 'CRITICAL' || vehicle.collisionRiskLevel === 'CAUTION';
      const iconSig = `${vehicle.category}-${vehicle.speedStatus}-${isHazard}-${isSelected}-${isWithinTargetRadius}-${heading}-${speedDisplay}`;
      const lastSig = markerIconSignaturesRef.current.get(vehicle.id);

      let marker = vehicleMarkersRef.current.get(vehicle.id);
      const pos: L.LatLngExpression = [vehicle.latitude, vehicle.longitude];
      const distLabel = vehicle.distanceMeters >= 1000
        ? `${(vehicle.distanceMeters / 1000).toFixed(2)}km`
        : `${vehicle.distanceMeters}m`;

      if (!marker) {
        const iconHtml = `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
            !isWithinTargetRadius ? 'opacity-40 hover:opacity-100' : 'opacity-100'
          } ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
            ${isHazard ? `<div class="absolute -inset-3 rounded-full bg-rose-500/30 animate-ping"></div>` : ''}
            ${isSelected ? `<div class="absolute -inset-2 rounded-full border-2 border-cyan-400 animate-pulse"></div>` : ''}
            <div class="w-8 h-8 rounded-full ${markerBg} border-2 ${markerBorder} shadow-md flex items-center justify-center text-white relative">
              <div class="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none" style="transform-origin: 50% 20px; transform: rotate(${heading}deg);">
                <svg class="w-3.5 h-3.5 text-white filter drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 18h16z"/>
                </svg>
              </div>
              <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                ${getCategoryIconSvg(vehicle.category)}
              </svg>
            </div>
            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 ${statusTextColor} text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-700/80 shadow flex items-center gap-1">
              <span>${vehicle.speedStatus === 'SPEEDING' ? '⚡ ' : ''}${speedDisplay}</span>
              <span class="text-slate-600">·</span>
              <span class="text-cyan-300 font-normal">${distLabel}</span>
            </div>
          </div>
        `;

        const markerIcon = L.divIcon({
          className: 'vehicle-marker-wrapper',
          html: iconHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        marker = L.marker(pos, { icon: markerIcon }).addTo(map);
        marker.on('click', () => {
          onSelectVehicle(vehicle.id);
        });
        vehicleMarkersRef.current.set(vehicle.id, marker);
        markerIconSignaturesRef.current.set(vehicle.id, iconSig);
      } else {
        marker.setLatLng(pos);
        if (lastSig !== iconSig) {
          const iconHtml = `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
              !isWithinTargetRadius ? 'opacity-40 hover:opacity-100' : 'opacity-100'
            } ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
              ${isHazard ? `<div class="absolute -inset-3 rounded-full bg-rose-500/30 animate-ping"></div>` : ''}
              ${isSelected ? `<div class="absolute -inset-2 rounded-full border-2 border-cyan-400 animate-pulse"></div>` : ''}
              <div class="w-8 h-8 rounded-full ${markerBg} border-2 ${markerBorder} shadow-md flex items-center justify-center text-white relative">
                <div class="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none" style="transform-origin: 50% 20px; transform: rotate(${heading}deg);">
                  <svg class="w-3.5 h-3.5 text-white filter drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L4 18h16z"/>
                  </svg>
                </div>
                <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  ${getCategoryIconSvg(vehicle.category)}
                </svg>
              </div>
              <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 ${statusTextColor} text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-700/80 shadow flex items-center gap-1">
                <span>${vehicle.speedStatus === 'SPEEDING' ? '⚡ ' : ''}${speedDisplay}</span>
                <span class="text-slate-600">·</span>
                <span class="text-cyan-300 font-normal">${distLabel}</span>
              </div>
            </div>
          `;

          const markerIcon = L.divIcon({
            className: 'vehicle-marker-wrapper',
            html: iconHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          marker.setIcon(markerIcon);
          markerIconSignaturesRef.current.set(vehicle.id, iconSig);
        }
      }

      // Render Dynamic Vehicle Breadcrumb Trajectory Trail
      if (settings.showTraces && vehicle.trail && vehicle.trail.length > 1) {
        let trailColor = '#10b981';
        if (vehicle.communicationStatus === 'STALE') trailColor = '#64748b';
        else if (vehicle.speedStatus === 'SPEEDING') trailColor = '#f43f5e';
        else if (vehicle.directionStatus === 'OPPOSITE_DIRECTION') trailColor = '#f59e0b';

        const latLngs: L.LatLngExpression[] = vehicle.trail.map((p) => [p.latitude, p.longitude]);
        const tracePoly = L.polyline(latLngs, {
          color: trailColor,
          weight: 3,
          opacity: 0.75,
        }).addTo(map);
        trajectoryLinesRef.current.push(tracePoly);
      }

      // Hazard collision vector
      if (isHazard && vehicle.distanceMeters <= targetRadiusMeters) {
        const polyline = L.polyline(
          [
            [hostVehicle.latitude, hostVehicle.longitude],
            [vehicle.latitude, vehicle.longitude],
          ],
          {
            color: vehicle.collisionRiskLevel === 'CRITICAL' ? '#f43f5e' : '#f59e0b',
            weight: 2,
            dashArray: '3, 4',
            opacity: 0.8,
          }
        ).addTo(map);
        trajectoryLinesRef.current.push(polyline);
      }
    });

    // Render Host Vehicle Trajectory Trail
    if (settings.showTraces && hostVehicle.trail && hostVehicle.trail.length > 1) {
      const hostLatLngs: L.LatLngExpression[] = hostVehicle.trail.map((p) => [p.latitude, p.longitude]);
      const hostTracePoly = L.polyline(hostLatLngs, {
        color: '#06b6d4',
        weight: 3.5,
        opacity: 0.85,
      }).addTo(map);
      trajectoryLinesRef.current.push(hostTracePoly);
    }
  }, [vehicles, hostVehicle, selectedVehicleId, targetRadiusMeters, settings.showTraces]);

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[580px]" />

      {/* FLOATING TOP HUD: Compact Scenario Player & Legend */}
      <div className="absolute top-3 inset-x-3 z-[1000] flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
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
        <div className="absolute top-14 right-3 z-[1001] bg-slate-950/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-700 shadow-2xl w-72 text-xs flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
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
      <div className="absolute bottom-3 inset-x-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-800/90 shadow-xl">
          <button
            onClick={() => {
              setAutoFollow(true);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([hostVehicle.latitude, hostVehicle.longitude], 17, { duration: 0.5 });
              }
            }}
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

        <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/90 text-xs text-slate-400 font-mono">
          Leaflet Dark Matter OSM
        </div>
      </div>
    </div>
  );
};
