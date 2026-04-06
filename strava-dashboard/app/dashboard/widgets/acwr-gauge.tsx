"use client";

import type { ACWRResult } from "@/types/coach";

const ZONE_COLORS = {
  green: { color: "var(--color-zone-green)", label: "text-green-400" },
  yellow: { color: "var(--color-zone-yellow)", label: "text-yellow-400" },
  red: { color: "var(--color-zone-red)", label: "text-red-400" },
};

export function ACWRGauge({ acwr }: { acwr: ACWRResult | null }) {
  if (!acwr) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-center">
        <div className="text-stone-400 text-sm">Computing...</div>
      </div>
    );
  }

  const zoneStyle = ZONE_COLORS[acwr.zone];

  // Position marker on the gauge: map ratio 0-2.0 to 0-100%
  const markerPos = Math.min(Math.max((acwr.ratio / 2) * 100, 2), 98);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div
        className="text-[0.7rem] text-stone-400 uppercase tracking-wider font-medium mb-3"
        data-tooltip="Acute:Chronic Workload Ratio — compares your last 7 days to your 28-day weekly average"
      >
        Training Load
      </div>

      {/* Ratio hero */}
      <div
        className="text-center mb-4"
        data-tooltip={`Ratio ${acwr.ratio.toFixed(2)} = ${acwr.acuteLoadKm} km (7d) ÷ ${acwr.chronicLoadKm} km/wk (28d avg). Green 0.8–1.3, yellow 0.6–0.8 or 1.3–1.5, red <0.6 or >1.5.`}
      >
        <div className={`text-4xl font-light tracking-tight ${zoneStyle.label}`}>
          {acwr.ratio.toFixed(2)}
        </div>
        <div className="text-[0.7rem] text-stone-500 mt-1 uppercase tracking-wide">{acwr.label}</div>
      </div>

      {/* Gauge bar */}
      <div className="relative mb-4">
        <div className="flex h-2 rounded-full overflow-hidden">
          {/* Red zone: 0-0.6 (30%) */}
          <div className="h-full" style={{ width: "30%", backgroundColor: "var(--color-zone-red)", opacity: 0.25 }} />
          {/* Yellow zone: 0.6-0.8 (10%) */}
          <div className="h-full" style={{ width: "10%", backgroundColor: "var(--color-zone-yellow)", opacity: 0.25 }} />
          {/* Green zone: 0.8-1.3 (25%) */}
          <div className="h-full" style={{ width: "25%", backgroundColor: "var(--color-zone-green)", opacity: 0.3 }} />
          {/* Yellow zone: 1.3-1.5 (10%) */}
          <div className="h-full" style={{ width: "10%", backgroundColor: "var(--color-zone-yellow)", opacity: 0.25 }} />
          {/* Red zone: 1.5-2.0 (25%) */}
          <div className="h-full" style={{ width: "25%", backgroundColor: "var(--color-zone-red)", opacity: 0.25 }} />
        </div>
        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
          style={{
            left: `${markerPos}%`,
            transform: `translate(-50%, -50%)`,
            backgroundColor: zoneStyle.color,
            boxShadow: `0 0 8px ${zoneStyle.color}`,
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div data-tooltip="Total running distance in the last 7 days (acute load)">
          <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider">7-Day</div>
          <div className="text-sm font-light text-stone-700">{acwr.acuteLoadKm} km</div>
        </div>
        <div data-tooltip="Average weekly running distance over the last 28 days (chronic load)">
          <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider">28-Day Avg</div>
          <div className="text-sm font-light text-stone-700">{acwr.chronicLoadKm} km/wk</div>
        </div>
      </div>
    </div>
  );
}
