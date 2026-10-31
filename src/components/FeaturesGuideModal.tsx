/**
 * Feature Guide & Operational Specifications Modal
 * Explains every system feature, its purpose, real-world ITS application, and mechanics.
 */

import React, { useState } from 'react';
import {
  X,
  Compass,
  Gauge,
  Radio,
  AlertTriangle,
  Volume2,
  Car,
  Layers,
  MapPin,
  Clock,
  Database,
  ShieldCheck,
  CheckCircle2,
  Navigation,
} from 'lucide-react';

interface FeaturesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeaturesGuideModal: React.FC<FeaturesGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState<number>(0);

  if (!isOpen) return null;

  const features = [
    {
      id: 'target-horizon',
      title: '1. 1 km (1000m) Target Detection & Speed Tracing Horizon',
      category: 'Proximity Filtering & Radar',
      icon: <Radio className="w-4 h-4 text-cyan-400" />,
      badge: '1.0 km Safety Zone',
      purpose:
        'Traces all nearby and oncoming vehicles and their speeds from up to 1 kilometer away (1000 meters) from the host vehicle’s position.',
      whatIsItUsedFor:
        'In highway driving at 80–120 km/h, spotting speeding violators or oncoming vehicles 100 meters away gives only 2-3 seconds of reaction time. By expanding radar detection and dynamic speed tracing up to 1 kilometer (1000m) ahead and behind, drivers and dispatchers have early situational awareness to anticipate traffic maneuvers, speed violations, and oncoming hazards long before they become critical.',
      howItWorks:
        'Uses spherical Haversine geodesic distance math: d = 2R · arcsin(√(sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2))). All vehicles within 1000m (1 km) are tracked continuously at 60 FPS, and their historical positions are rendered as color-coded trajectory speed traces (green for compliant, red for speeding, amber for oncoming, cyan for host).',
      visualIndicator:
        'Geographical 1000m cyan radar circle on Google Satellite and Leaflet maps, with concentric 250m/500m/750m distance guide rings, speed traces, and exact distance badges on markers.',
    },
    {
      id: 'speed-violation',
      title: '2. Speed-Limit Violation Engine',
      category: 'Speed Enforcement',
      icon: <Gauge className="w-4 h-4 text-rose-400" />,
      badge: 'Color-Coded Status',
      purpose:
        'Instantly differentiates law-abiding vehicles from high-speed violators to prevent rear-end collisions and speed differential crashes.',
      whatIsItUsedFor:
        'Highway speed differentials are a leading cause of fatal accidents. This feature alerts drivers to vehicles approaching at speeds far above the legal highway limit (e.g. 112 km/h on an 80 km/h stretch).',
      howItWorks:
        'Compares reported vehicle speed against road segment limit + configurable tolerance (default 3 km/h). Status is: SPEEDING (Red) if speed > limit + tolerance; NORMAL (Green) if compliant; UNKNOWN (Grey) if speed data is absent or stale.',
      visualIndicator:
        'Green markers = compliant. Red glowing markers = speed limit violation with exact "+XX km/h" violation delta badge. Grey markers = stale or unavailable data.',
    },
    {
      id: 'opposite-detection',
      title: '3. Opposite-Direction Vehicle Detection',
      category: 'Vector Kinematics',
      icon: <Compass className="w-4 h-4 text-amber-400" />,
      badge: 'Wrong-Way Warning',
      purpose:
        'Detects oncoming traffic in adjacent lanes or wrong-way highway ramp entries to avert catastrophic head-on collisions.',
      whatIsItUsedFor:
        'Identifies when a vehicle is moving against the host vehicle’s travel direction. Crucial for divided highway wrong-way entry warnings and undivided highway passing/overtaking maneuvers.',
      howItWorks:
        'Calculates normalized angular difference: Δθ = min(|θ_host - θ_target|, 360 - |θ_host - θ_target|). If Δθ ≥ 135°, classified as OPPOSITE DIRECTION. If Δθ ≤ 45°, classified as SAME DIRECTION. Otherwise CROSS TRAFFIC.',
      visualIndicator:
        'Amber badge with directional arrow icons, compass needle pointing against vehicle trajectory, and warning banner.',
    },
    {
      id: 'collision-risk',
      title: '4. Illustrative Collision Risk & TTC Engine',
      category: 'Active Safety',
      icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
      badge: 'Predictive Conflict',
      purpose:
        'Computes dynamic Time-to-Collision (TTC) using relative line-of-sight closing speeds to provide pre-crash visual & audio alerts.',
      whatIsItUsedFor:
        'Warns the driver when a leading vehicle brakes abruptly or when closing velocity indicates an imminent trajectory overlap before human driver reaction time expires.',
      howItWorks:
        'Projects host and target velocities onto the line-of-sight bearing axis: v_closing = v_host,los + v_target,los. If closing speed > 0, Time-to-Collision = Distance / v_closing. If TTC ≤ 3.0s and distance ≤ 25m, status escalates to CRITICAL.',
      visualIndicator:
        'Pulsing red marker animation, dashed collision vector line connecting host to danger vehicle, and high-priority banner.',
    },
    {
      id: 'audio-chimes',
      title: '5. Web Audio API Synthesizer Alerts',
      category: 'Auditory Feedback',
      icon: <Volume2 className="w-4 h-4 text-cyan-300" />,
      badge: 'Zero-Latency Sound',
      purpose:
        'Delivers instant acoustic cues without requiring the driver to take their eyes off the road.',
      whatIsItUsedFor:
        'Drivers checking mirrors or lane positioning need immediate sound feedback when an urgent hazard arises. Synthesizes distinctive frequencies for Critical Hazards (880Hz alternating sawtooth), Cautions (520Hz sine), and Speed Violations (440Hz triangle).',
      howItWorks:
        'Uses native browser Web Audio API OscillatorNode and GainNode with exponential decay envelopes, working completely client-side with no external audio file downloads or latency.',
      visualIndicator:
        'Speaker icon in banner with one-click Mute / Unmute toggle.',
    },
    {
      id: 'vehicle-categories',
      title: '6. Multi-Vehicle Category Classification',
      category: 'Cohort Tracking',
      icon: <Car className="w-4 h-4 text-blue-400" />,
      badge: '4 Distinct Types',
      purpose:
        'Differentiates vehicle physical profiles, braking distances, and acceleration dynamics across mixed highway traffic.',
      whatIsItUsedFor:
        'Recognizes Cars (fast overtaking/cruise), Bikes & Motorcycles (high agility, vulnerable road users), Heavy Trucks (large braking distance, slower acceleration), and Buses (passenger transit, blind spots).',
      howItWorks:
        'Vehicle beacon CAM/BSM packets include category enums mapped to category-specific SVG glyphs, separate filtering tabs, and cohort speed analytics.',
      visualIndicator:
        'Dedicated SVG vehicle icons inside map pins and segmented category filter buttons (All, Cars, Bikes, Trucks, Buses).',
    },
    {
      id: 'continuous-60fps',
      title: '7. Continuous 60 FPS Movement & Auto-Follow',
      category: 'Motion Dynamics',
      icon: <Clock className="w-4 h-4 text-emerald-400" />,
      badge: 'No 1-Second Freezes',
      purpose:
        'Eliminates stepped 1-second interval pauses, providing realistic, uninterrupted highway travel physics and smooth camera tracking.',
      whatIsItUsedFor:
        'Real vehicles travel smoothly at 20–35 meters every second. A 1-second refresh rate produces jerky, frozen displays. This continuous loop keeps map markers gliding smoothly in real time.',
      howItWorks:
        'Utilizes requestAnimationFrame with high-precision performance.now() delta-timing (dt). Vehicle coordinates update continuously along highway vectors with automated camera centering.',
      visualIndicator:
        'Smooth fluid marker gliding, live 60 FPS status badge in header, and Auto-Follow camera toggle button.',
    },
    {
      id: 'dual-map-engines',
      title: '8. Dual Map Engines (Google Satellite & Leaflet)',
      category: 'Geospatial Display',
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
      badge: 'Hybrid & Satellite',
      purpose:
        'Provides real-world high-resolution Google Satellite imagery with labeled highway lanes, alongside an offline Leaflet OSM fallback.',
      whatIsItUsedFor:
        'Google Satellite mode offers authentic aerial views of highway interchanges, bridges, and lane markings. Leaflet OSM mode provides a lightweight dark-matter aesthetic ideal for low-bandwidth environments.',
      howItWorks:
        'Integrated with @vis.gl/react-google-maps using modern AdvancedMarkerElement and mapId="DEMO_MAP_ID", seamlessly switchable via the navigation bar.',
      visualIndicator:
        'One-click engine toggle in top bar (Google Satellite vs Leaflet OSM) and map style selectors (Hybrid, Pure Satellite, Roadmap).',
    },
    {
      id: 'live-gps',
      title: '9. Real-World Location Access & Hardware GNSS Radar',
      category: 'Position Sensing & Geocoding',
      icon: <MapPin className="w-4 h-4 text-emerald-400" />,
      badge: 'Real-World GPS & Reverse Geocoding',
      purpose:
        'Locks the 1 km radar horizon and surrounding vehicle tracking onto your authentic physical position via browser Geolocation API with live reverse geocoding.',
      whatIsItUsedFor:
        'Turns the prototype into an authentic real-world road tracker. Whether driving on a real highway, commuting on a city corridor, or testing at your desk, the system centers Google Satellite imagery directly on your coordinates, computes physical velocity and compass heading, and performs reverse geocoding to display your actual street and city.',
      howItWorks:
        'Requests navigator.geolocation with enableHighAccuracy: true. Extracts device coordinates, altitude, and accuracy (±X meters). If raw velocity or heading is null, it computes them from successive GNSS fixes (haversine displacement over dt seconds). Automatically calls OpenStreetMap reverse geocoding to resolve locality names, while supporting 1-click global highway presets (Hyderabad ORR, Mumbai-Pune, Bengaluru NICE, Delhi-Meerut, US-101, German Autobahn).',
      visualIndicator:
        '"Real Location" launcher in header, pulsing green GPS locked badge in the HUD, reverse-geocoded place card, and full-screen RealLocationModal with one-click teleport presets.',
    },
    {
      id: 'deterministic-scenarios',
      title: '10. 7 Deterministic ITS Test Scenarios',
      category: 'Testing & Auditing',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      badge: 'Repeatable Demos',
      purpose:
        'Enables consistent, reproducible safety demonstrations for project presentations and engineering verification.',
      whatIsItUsedFor:
        'Demonstrates rare highway events on command: 1. Normal Flow, 2. Speed Violation, 3. Opposite Direction Approach, 4. Collision Hazard (Hard Braking), 5. Stale Data, 6. Mixed Traffic, and 7. Offline Mode.',
      howItWorks:
        'Scenario blueprints configure exact initial distances, lane offsets, speeds, and timing triggers so the exact same scenario plays deterministically every time.',
      visualIndicator:
        'Interactive scenario dropdown player directly in the floating map HUD with Play, Pause, and Reset controls.',
    },
    {
      id: 'offline-storage',
      title: '11. Offline Telemetry Cache & Audit Export',
      category: 'Data Governance',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      badge: 'CSV & JSON Export',
      purpose:
        'Preserves recent vehicle telemetry and safety violation events locally with export options for post-incident ITS analysis.',
      whatIsItUsedFor:
        'In highway dead-zones without cellular coverage, the system caches recent beacons, transitions expired vehicles to GREY / STALE status, and logs safety violations for black-box review.',
      howItWorks:
        'Maintains an indexed event ring-buffer in localStorage and provides one-click CSV and JSON data export anchors.',
      visualIndicator:
        '"Offline Telemetry Logs" modal with downloadable CSV and JSON log reports and timestamps.',
    },
    {
      id: 'road-lock',
      title: '12. Highway Road-Lock & Lane Geometry Kinematics',
      category: 'Road-Snapping & Corridor Adherence',
      icon: <Navigation className="w-4 h-4 text-emerald-400" />,
      badge: '100% on Road Lanes',
      purpose:
        'Keeps the Host Vehicle and all surrounding traffic strictly on authentic highway pavement and lane centerlines, eliminating off-road kinematic drift.',
      whatIsItUsedFor:
        'In linear kinematic simulations, vehicles moving along a fixed bearing eventually drift into adjacent fields, water, or terrain as the highway curves. Highway Road-Lock snaps and guides vehicles along authentic high-resolution road polylines (Hyderabad ORR, Mumbai-Pune Expressway, Bengaluru NICE, Delhi-Meerut, US-101, German Autobahn) with lane offsets for fast/overtake lanes, center cruising lanes, slow freight lanes, and oncoming carriageways.',
      howItWorks:
        'Precomputes arc-length distance s and segment tangent bearings along high-density road geometry. For every time step dt, s_host += v * dt. Host coordinates are interpolated along the road curve. Remote vehicles are positioned at s = s_host + longitudinalOffset with perpendicular lateral offset d for lane separation and median barriers. Oncoming vehicles travel on the opposite carriageway facing opposite direction along the exact highway curvature.',
      visualIndicator:
        'Glowing cyan road corridor centerline overlay, "🛣️ Road-Lock: ON" status badge in HUD, and interactive toggle in settings drawer.',
    },
  ];

  const current = features[selectedFeatureIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">
                Highway Vehicle Tracking &amp; Safety System — Feature Guide
              </h2>
              <span className="text-[11px] text-slate-400">
                Detailed Breakdown: Purpose, Mechanics, and Real-World ITS Application
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: 2-Column Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left: Scrollable Feature List */}
          <div className="md:col-span-5 overflow-y-auto p-2.5 space-y-1 bg-slate-950/40">
            {features.map((feat, idx) => {
              const isSelected = idx === selectedFeatureIndex;
              return (
                <button
                  key={feat.id}
                  onClick={() => setSelectedFeatureIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-slate-800/90 border border-cyan-500/40 shadow-sm'
                      : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5">
                    {feat.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-white truncate">
                        {feat.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span>{feat.category}</span>
                      <span>·</span>
                      <span className="text-cyan-400 font-mono">{feat.badge}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Detailed Feature Showcase */}
          <div className="md:col-span-7 overflow-y-auto p-6 space-y-4 bg-slate-900/60 text-xs">
            {/* Title & Badge */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-semibold block">
                  {current.category}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {current.title}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded font-semibold whitespace-nowrap">
                {current.badge}
              </span>
            </div>

            {/* Core Purpose Callout */}
            <div className="p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-xl text-cyan-200 leading-relaxed">
              <span className="font-bold text-cyan-300 block mb-1">
                Core Purpose:
              </span>
              {current.purpose}
            </div>

            {/* What is it used for? */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                What is this feature used for in the system?
              </h4>
              <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                {current.whatIsItUsedFor}
              </p>
            </div>

            {/* Technical Mechanism */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Underlying Mechanics &amp; Mathematics:
              </h4>
              <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
                {current.howItWorks}
              </p>
            </div>

            {/* Visual Indicator */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                How to observe it in the UI:
              </h4>
              <p className="text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                {current.visualIndicator}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>
            Feature {selectedFeatureIndex + 1} of {features.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors text-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
