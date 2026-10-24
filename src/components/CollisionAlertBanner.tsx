/**
 * Collision Risk & Speed Safety Alert Banner
 * Clearly labeled as illustrative prototype algorithm requiring real-world validation.
 */

import React from 'react';
import { SafetyAlert } from '../types/vehicle';
import { AlertTriangle, AlertOctagon, Info, X, Volume2, VolumeX } from 'lucide-react';

interface CollisionAlertBannerProps {
  alerts: SafetyAlert[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const CollisionAlertBanner: React.FC<CollisionAlertBannerProps> = ({
  alerts,
  onDismiss,
  onClearAll,
  soundEnabled,
  onToggleSound,
}) => {
  if (alerts.length === 0) return null;

  const topAlert = alerts[0];
  const isCritical = topAlert.level === 'CRITICAL';

  return (
    <div
      className={`border rounded-lg p-3.5 shadow-xl transition-all ${
        isCritical
          ? 'bg-rose-950/80 border-rose-600/80 text-rose-100 shadow-rose-950/50'
          : 'bg-amber-950/80 border-amber-600/80 text-amber-100 shadow-amber-950/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
              isCritical
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-amber-600 text-white'
            }`}
          >
            {isCritical ? (
              <AlertOctagon className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">
                {isCritical ? 'CRITICAL COLLISION WARNING' : 'SAFETY ADVISORY'}
              </span>
              <span className="text-[11px] text-white/70">
                {new Date(topAlert.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mt-1">
              {topAlert.message}
            </h3>

            <p className="text-xs text-white/80 mt-0.5">
              {topAlert.details}
            </p>

            <div className="text-[10px] text-white/60 mt-1.5 flex items-center gap-1 italic">
              <Info className="w-3 h-3 shrink-0" />
              <span>
                Demonstration warning logic based on trajectory and relative closing vectors. Real-world systems require dedicated multi-sensor fusion.
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute alert sound' : 'Enable alert sound'}
            className="p-1.5 rounded bg-black/30 hover:bg-black/50 text-white transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => onDismiss(topAlert.id)}
            title="Dismiss this alert"
            className="p-1.5 rounded bg-black/30 hover:bg-black/50 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {alerts.length > 1 ? (
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
          <span>+{alerts.length - 1} more active warning(s)</span>
          <button
            onClick={onClearAll}
            className="text-xs font-semibold hover:text-white underline underline-offset-2"
          >
            Acknowledge All
          </button>
        </div>
      ) : null}
    </div>
  );
};
