/**
 * Architecture & ITS Specification Modal
 * Visualizes system architecture, V2X communication pipeline,
 * and the roadmap to native Android hardware & OBU integration.
 */

import React from 'react';
import { X, Cpu, Radio, Shield, Smartphone, Layers, CheckCircle } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">
                Highway Vehicle Tracking &amp; Safety System Architecture
              </h2>
              <span className="text-[11px] text-slate-400">
                End-to-End ITS Prototype, V2X Sidelink, &amp; Android Roadmap
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Section 1: Architecture Pipeline */}
          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              1. System Architecture Diagram
            </h3>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
{`+-----------------------------------------------------------------------------------+
|                        HIGHWAY VEHICLE TRACKING & SAFETY SYSTEM                   |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+--------------------------------+
        |                                                                  |
        v                                                                  v
[1. KINEMATIC SENSING]                                          [2. V2X NETWORKING]
- GNSS / GPS Receiver (Host)                                     - C-V2X (3GPP Rel 14/15 PC5)
- Speed (m/s -> km/h validation)                                 - DSRC (IEEE 802.11p) Sidelink
- Heading (0-359° vector angle)                                  - Local WebSockets / Fast API
- Timestamp & Age validation                                     - BSM / CAM Packet Parsing
        |                                                                  |
        +---------------------------------+--------------------------------+
                                          |
                                          v
                    [3. VEHICLE CORRIDOR ENGINE]
                    - 100-Meter Target Radius Filtering (Haversine)
                    - Vehicle Categorization: Cars | Bikes | Trucks | Buses
                    - Speed Limit Comparator (Road Limit: e.g. 80 km/h)
                    - Opposite-Direction Classifier (180° Δθ threshold)
                                          |
                                          v
                    [4. ILLUSTRATIVE COLLISION RISK ENGINE]
                    - Closing Speed Vector Decomposition (Los velocity)
                    - Time-to-Collision (TTC = d / v_closing)
                    - Risk Classification: CRITICAL (<3.5s) | CAUTION (<6s)
                                          |
                                          v
                    [5. CLIENT DASHBOARD & ALERT ACTUATION]
                    - Color-coded Markers: GREEN (Compliant) | RED (Violation) | GREY (Stale)
                    - Web Audio API Chime & Visual Warning Banners
                    - Offline Storage & IndexedDB Fallback State`}
            </div>
          </div>

          {/* Section 2: Four Vehicle Categories */}
          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              2. Vehicle Categories &amp; Detection Parameters
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-white block">Cars &amp; Sedans</span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Typical speed 60–120 km/h. Fast overtaking lane &amp; center corridor.
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-white block">Bikes / Motorcycles</span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  High agility, narrow footprint. Rapid acceleration &amp; shoulder riding.
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-white block">Heavy Freight Trucks</span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Extended braking distance. Lower speed ceiling (60–80 km/h) in slow lanes.
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-white block">Intercity Buses</span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Passenger transport, large visual occlusion, steady highway cruising.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Android Native & V2X Hardware Roadmap */}
          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              3. Android Native &amp; V2X Hardware Roadmap
            </h3>
            <div className="space-y-2 text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded border border-slate-800">
              <p>
                <strong>Phase 1 (Current Prototype):</strong> Web-based ITS visualizer utilizing Leaflet, Web Audio API, Browser Geolocation API, and simulated deterministic highway kinematic engines.
              </p>
              <p>
                <strong>Phase 2 (Android Native OBU Client):</strong> Kotlin/Jetpack Compose app using <code className="font-mono text-cyan-400">FusedLocationProviderClient</code> for raw 10Hz NMEA sentences and High-Accuracy GNSS Doppler speed collection without stationary jitter.
              </p>
              <p>
                <strong>Phase 3 (Direct Vehicle-to-Vehicle Sidelink):</strong> Integration with automotive C-V2X On-Board Units (OBUs) using 3GPP Release 14/15 PC5 direct wireless sidelink on the dedicated 5.9 GHz ITS band, enabling zero-infrastructure communication independent of cellular cell towers.
              </p>
            </div>
          </div>

          {/* Section 4: Offline Functionality & Safety Boundaries */}
          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
              <Radio className="w-4 h-4" />
              4. Offline Realities &amp; Disclaimers
            </h3>
            <div className="p-3.5 bg-slate-950 rounded border border-amber-900/50 text-slate-300 space-y-1.5 leading-relaxed">
              <p className="text-amber-300 font-semibold">
                Critical Safety Disclosure:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>A browser alone cannot directly detect non-connected vehicles without radar, LiDAR, or camera vision.</li>
                <li>In offline mode, cached vehicle positions stop receiving live beacons and transition to <strong>GREY / STALE</strong> status after 5 seconds.</li>
                <li>Absence of an alert does not guarantee an empty road. The prototype collision logic is illustrative.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-slate-950 rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
