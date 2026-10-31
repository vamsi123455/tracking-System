/**
 * Ultra-Neat High-Density Vehicle Telemetry List
 * Clean, modern ITS layout with scannable kinematics, limit comparison, and instant telemetry drawer.
 */

import React, { useState } from 'react';
import { Vehicle, VehicleCategory } from '../types/vehicle';
import { Car, Bike, Truck, Bus, ArrowUpRight, ArrowDownLeft, Compass, Info, X } from 'lucide-react';

interface VehicleListProps {
  vehicles: Vehicle[];
  speedLimitKmh: number;
  targetRadiusMeters: number;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  onOpenDetailsModal?: () => void;
}

export const VehicleList: React.FC<VehicleListProps> = ({
  vehicles,
  speedLimitKmh,
  targetRadiusMeters,
  selectedVehicleId,
  onSelectVehicle,
  onOpenDetailsModal,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRadiusOnly, setFilterRadiusOnly] = useState<boolean>(false);

  const filtered = vehicles.filter((v) => {
    if (filterCategory !== 'all' && v.category !== filterCategory) return false;
    if (filterRadiusOnly && v.distanceMeters > targetRadiusMeters) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => a.distanceMeters - b.distanceMeters);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  const getCategoryIcon = (cat: VehicleCategory) => {
    switch (cat) {
      case 'bike':
        return <Bike className="w-3.5 h-3.5 text-cyan-400" />;
      case 'truck':
        return <Truck className="w-3.5 h-3.5 text-amber-400" />;
      case 'bus':
        return <Bus className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Car className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[580px] bg-slate-900/90 border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl">
      {/* List Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/70 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-white tracking-wide uppercase">
              Highway Radar Cohort
            </h2>
            <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.2 rounded font-semibold">
              {sorted.length} Active
            </span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={filterRadiusOnly}
              onChange={(e) => setFilterRadiusOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-3 h-3"
            />
            <span>&le;{targetRadiusMeters}m only</span>
          </label>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
          {(['all', 'car', 'bike', 'truck', 'bus'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`flex-1 py-1 rounded font-medium transition-colors capitalize ${
                filterCategory === cat
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'All' : `${cat}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Scannable Vehicle Telemetry Table */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No participants match filter criteria in range.
          </div>
        ) : (
          sorted.map((vehicle) => {
            const isSelected = vehicle.id === selectedVehicleId;
            const isSpeeding = vehicle.speedStatus === 'SPEEDING';
            const isStale = vehicle.communicationStatus === 'STALE';
            const isOpposite = vehicle.directionStatus === 'OPPOSITE_DIRECTION';
            const isWithinRadius = vehicle.distanceMeters <= targetRadiusMeters;
            const deltaKmh = vehicle.speedKmh !== null ? vehicle.speedKmh - speedLimitKmh : null;

            return (
              <div
                key={vehicle.id}
                onClick={() => onSelectVehicle(vehicle.id)}
                className={`px-3 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-2.5 text-xs ${
                  isSelected
                    ? 'bg-cyan-950/50 border-l-2 border-cyan-400'
                    : 'hover:bg-slate-800/40'
                } ${!isWithinRadius ? 'opacity-40' : 'opacity-100'}`}
              >
                {/* Vehicle Identity */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    {getCategoryIcon(vehicle.category)}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate flex items-center gap-1.5 leading-tight">
                      <span className="truncate">{vehicle.name}</span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {vehicle.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 leading-none">
                      <span className="font-mono tabular-nums text-slate-300 font-medium">
                        {vehicle.distanceMeters >= 1000
                          ? `${(vehicle.distanceMeters / 1000).toFixed(2)} km`
                          : `${vehicle.distanceMeters}m`}
                      </span>
                      <span className="text-slate-600">·</span>
                      {isOpposite ? (
                        <span className="text-amber-400 font-medium flex items-center gap-0.5">
                          <ArrowDownLeft className="w-2.5 h-2.5" /> Oncoming
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-0.5">
                          <ArrowUpRight className="w-2.5 h-2.5 text-slate-500" /> Ahead
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Speed & Violation Status */}
                <div className="text-right shrink-0">
                  <div className="font-mono tabular-nums font-bold text-xs">
                    {isStale ? (
                      <span className="text-slate-500">STALE</span>
                    ) : vehicle.speedKmh !== null ? (
                      <span
                        className={
                          isSpeeding
                            ? 'text-rose-400 font-extrabold'
                            : 'text-emerald-400'
                        }
                      >
                        {vehicle.speedKmh}{' '}
                        <span className="text-[10px] font-normal text-slate-500">km/h</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </div>

                  <div className="text-[10px] font-mono mt-0.5">
                    {isStale ? (
                      <span className="text-slate-600">No Beacon</span>
                    ) : isSpeeding && deltaKmh !== null ? (
                      <span className="text-rose-400 font-bold">+{deltaKmh} (SPEEDING)</span>
                    ) : (
                      <span className="text-emerald-500">Within Limit</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* INLINE QUICK TELEMETRY INSPECTOR (When a vehicle is selected) */}
      {selectedVehicle && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <span className="text-cyan-400 font-mono">[{selectedVehicle.id}]</span>
              <span>{selectedVehicle.name}</span>
            </div>
            <button
              onClick={() => onSelectVehicle('')}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase block">Speed</span>
              <span className={`font-bold ${selectedVehicle.speedStatus === 'SPEEDING' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {selectedVehicle.speedKmh} km/h
              </span>
            </div>

            <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase block">Distance</span>
              <span className="font-bold text-white">
                {selectedVehicle.distanceMeters}m
              </span>
            </div>

            <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase block">Direction</span>
              <span className="font-bold text-amber-400 truncate block">
                {selectedVehicle.directionStatus === 'OPPOSITE_DIRECTION' ? 'Oncoming' : 'Same'}
              </span>
            </div>
          </div>

          {selectedVehicle.collisionRiskReason && (
            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
              {selectedVehicle.collisionRiskReason}
            </div>
          )}

          {onOpenDetailsModal && (
            <button
              onClick={onOpenDetailsModal}
              className="w-full py-1 bg-slate-800 hover:bg-slate-750 text-cyan-300 font-semibold rounded text-[11px] transition-colors border border-slate-700"
            >
              Open Full Kinematic Inspector
            </button>
          )}
        </div>
      )}
    </div>
  );
};
