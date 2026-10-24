/**
 * API Documentation & Windows Setup Modal
 */

import React from 'react';
import { X, BookOpen, Terminal, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">
                API Specification &amp; Local Setup Guide
              </h2>
              <span className="text-[11px] text-slate-400">
                FastAPI Endpoints, Python Pytest Suite, and Windows Deployment
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
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Section 1: Endpoints */}
          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-2">
              1. FastAPI Backend Endpoints
            </h3>
            <div className="border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800/80 bg-slate-950">
              <div className="p-2.5 flex items-center justify-between font-mono">
                <span className="text-emerald-400 font-bold">GET /health</span>
                <span className="text-slate-400 text-[11px]">System health and simulator status</span>
              </div>
              <div className="p-2.5 flex items-center justify-between font-mono">
                <span className="text-emerald-400 font-bold">GET /api/vehicles</span>
                <span className="text-slate-400 text-[11px]">List all active vehicles with distance &amp; kinematics</span>
              </div>
              <div className="p-2.5 flex items-center justify-between font-mono">
                <span className="text-blue-400 font-bold">POST /api/vehicles</span>
                <span className="text-slate-400 text-[11px]">Ingest vehicle V2X CAM/BSM beacon</span>
              </div>
              <div className="p-2.5 flex items-center justify-between font-mono">
                <span className="text-emerald-400 font-bold">GET /api/scenarios</span>
                <span className="text-slate-400 text-[11px]">Retrieve the 7 deterministic test scenarios</span>
              </div>
              <div className="p-2.5 flex items-center justify-between font-mono">
                <span className="text-blue-400 font-bold">POST /api/scenarios/{'{id}'}/start</span>
                <span className="text-slate-400 text-[11px]">Launch specific highway scenario</span>
              </div>
              <div className="p-2.5 flex items-center justify-between font-mono">
                <span className="text-purple-400 font-bold">WS /ws/vehicles</span>
                <span className="text-slate-400 text-[11px]">Live WebSocket streaming vehicle updates at 10Hz</span>
              </div>
            </div>
          </div>

          {/* Section 2: Windows Setup instructions */}
          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              2. Windows Installation &amp; Execution Guide
            </h3>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-[11px] space-y-3 leading-relaxed">
              <div>
                <p className="text-slate-400 mb-1"># Step 1: Clone and install Node dependencies</p>
                <p className="text-cyan-300">npm install</p>
              </div>

              <div>
                <p className="text-slate-400 mb-1"># Step 2: Set up Python Virtual Environment (Windows PowerShell)</p>
                <p className="text-cyan-300">python -m venv venv</p>
                <p className="text-cyan-300">.\venv\Scripts\Activate.ps1</p>
                <p className="text-cyan-300">pip install -r backend/requirements.txt</p>
              </div>

              <div>
                <p className="text-slate-400 mb-1"># Step 3: Run Python Unit Tests (Pytest)</p>
                <p className="text-cyan-300">pytest backend/tests -v</p>
              </div>

              <div>
                <p className="text-slate-400 mb-1"># Step 4: Start Frontend Vite Dev Server</p>
                <p className="text-cyan-300">npm run dev</p>
                <p className="text-slate-500">Opens at http://localhost:3000</p>
              </div>

              <div>
                <p className="text-slate-400 mb-1"># Step 5: Start Python FastAPI Backend (Optional dual mode)</p>
                <p className="text-cyan-300">uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload</p>
              </div>
            </div>
          </div>

          {/* Section 3: Speed limit & Collision Logic Formula */}
          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              3. Speed Violation &amp; Safety Threshold Formula
            </h3>
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2 leading-relaxed">
              <p>
                <strong>Speed Violation Logic:</strong> If vehicle speed <code className="font-mono text-cyan-300">v &gt; (V_limit + &Delta;v_threshold)</code>, status is flagged as <span className="text-rose-400 font-bold">SPEEDING</span> (RED marker).
              </p>
              <p>
                <strong>Direction Angle Calculation:</strong> Normalized angular delta <code className="font-mono text-cyan-300">&Delta;&theta; = |&theta;_host - &theta;_target|</code>. If <code className="font-mono">&Delta;&theta; &ge; 135&deg;</code>, classified as <span className="text-amber-400 font-bold">OPPOSITE DIRECTION</span>.
              </p>
              <p>
                <strong>Closing Speed &amp; TTC:</strong> Line-of-sight closing rate <code className="font-mono text-cyan-300">v_closing = v_host,los + v_target,los</code>. Time-to-Collision <code className="font-mono text-cyan-300">TTC = Distance / v_closing</code>. If <code className="font-mono">TTC &lt; 3.5s</code> within 25m, alert level is <span className="text-rose-400 font-bold">CRITICAL</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded transition-colors"
          >
            Close Spec
          </button>
        </div>
      </div>
    </div>
  );
};
