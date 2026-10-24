/**
 * Telemetry Logs Modal
 * Allows inspection of offline stored telemetry records,
 * export to CSV/JSON for ITS audit trails, and log resets.
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, Database, ShieldAlert } from 'lucide-react';
import { getTelemetryLogs, clearTelemetryLogs, TelemetryLogEntry } from '../utils/storage';

interface TelemetryLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelemetryLogsModal: React.FC<TelemetryLogsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<TelemetryLogEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLogs(getTelemetryLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    clearTelemetryLogs();
    setLogs([]);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `highway_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Time', 'VehicleID', 'Category', 'SpeedKmh', 'SpeedLimitKmh', 'Status', 'DistanceM', 'Event'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      `"${new Date(l.timestamp).toISOString()}"`,
      l.vehicleId,
      l.category,
      l.speedKmh ?? '',
      l.speedLimitKmh ?? '',
      l.status,
      l.distanceMeters,
      `"${l.event.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `highway_telemetry_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">
                Offline Telemetry &amp; Event Audit Log
              </h2>
              <span className="text-[11px] text-slate-400">
                Preserved locally in browser storage ({logs.length} records)
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

        {/* Toolbar */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            Recorded events (Speed violations, Collision hazards, etc.)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Export CSV
            </button>
            <button
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Export JSON
            </button>
            <button
              onClick={handleClear}
              disabled={logs.length === 0}
              className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-40 text-rose-300 rounded border border-rose-800/80 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Log
            </button>
          </div>
        </div>

        {/* Log rows */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No safety events recorded yet. Run the simulation to trigger speeding or collision hazard alerts.
            </div>
          ) : (
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
              {logs.map((entry) => (
                <div key={entry.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-900/50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-white font-semibold">
                        {entry.vehicleId} ({entry.category})
                      </span>
                      <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-300">
                        {entry.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {entry.event}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-cyan-300 tabular-nums">
                      {entry.speedKmh !== null ? `${entry.speedKmh} km/h` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-500 tabular-nums">
                      {entry.distanceMeters}m dist
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
