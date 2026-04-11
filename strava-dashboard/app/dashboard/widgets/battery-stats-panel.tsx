"use client";

import type { Activity } from "@/types";
import { computeBatteryStats } from "@/lib/battery-stats";

interface BatteryStatsPanelProps {
  runs: Activity[];
}

export default function BatteryStatsPanel({ runs }: BatteryStatsPanelProps) {
  const stats = computeBatteryStats(runs);
  if (!stats) return null;

  const hours = stats.predictedHoursAt100pct;
  const hh = Math.floor(hours);
  const mm = Math.round((hours - hh) * 60);
  const durationStr = hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-300 transition-all">
      <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-stone-500 mb-3">GPS Battery</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-[0.65rem] uppercase tracking-wider text-stone-400 mb-0.5">Drain / hour</div>
          <div className="text-lg font-light text-stone-800">{stats.medianDrainPerHour.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[0.65rem] uppercase tracking-wider text-stone-400 mb-0.5">Drain / km</div>
          <div className="text-lg font-light text-stone-800">{stats.medianDrainPerKm.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-[0.65rem] uppercase tracking-wider text-stone-400 mb-0.5">Full charge lasts</div>
          <div className="text-lg font-light text-stone-800">{durationStr}</div>
        </div>
        <div>
          <div className="text-[0.65rem] uppercase tracking-wider text-stone-400 mb-0.5">Samples</div>
          <div className="text-lg font-light text-stone-800">{stats.samples.length}</div>
        </div>
      </div>

      {stats.anomalies.length > 0 && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <div className="text-[0.65rem] uppercase tracking-wider text-stone-400 mb-1.5">High drain runs</div>
          <div className="flex flex-col gap-1">
            {stats.anomalies.slice(0, 3).map((a) => (
              <div key={a.stravaId} className="flex items-center gap-2 text-xs text-stone-500">
                <span className="text-yellow-500 font-medium">{a.drainPerHour.toFixed(1)}%/h</span>
                <span className="truncate">{a.name}</span>
                <span className="text-stone-400 shrink-0">{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
