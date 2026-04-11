/**
 * Heart rate zone computation from per-km split data.
 *
 * Uses a standard 5-zone model based on % of max HR:
 *   Z1 Recovery   < 60%
 *   Z2 Endurance  60–70%
 *   Z3 Aerobic    70–80%
 *   Z4 Threshold  80–90%
 *   Z5 VO2max     ≥ 90%
 *
 * When max HR is unknown we estimate it from the highest HR observed
 * in the splits, floored at 165 bpm to avoid wildly small zone widths.
 */

export interface ZoneDistribution {
  z1: number; // seconds in zone 1
  z2: number;
  z3: number;
  z4: number;
  z5: number;
  totalSeconds: number;
  maxHRUsed: number; // the max HR value that drove the zone boundaries
}

interface SplitRecord {
  distance: number;
  moving_time: number;
  average_heartrate?: number;
}

export function computeHRZones(
  splitsJson: string | null,
  activityAvgHR: number | null,
  knownMaxHR?: number,
): ZoneDistribution | null {
  if (!splitsJson) return null;

  let splits: SplitRecord[];
  try {
    splits = JSON.parse(splitsJson) as SplitRecord[];
  } catch {
    return null;
  }

  // Filter to splits that carry HR data
  const hrSplits = splits.filter(
    (s) => typeof s.average_heartrate === "number" && s.average_heartrate > 0 && s.moving_time > 0,
  );
  if (hrSplits.length === 0) return null;

  // Determine max HR to use for zone boundaries
  const observedMax = Math.max(...hrSplits.map((s) => s.average_heartrate!));
  const maxHRUsed = knownMaxHR ?? Math.max(observedMax, activityAvgHR ? activityAvgHR * 1.15 : 0, 165);

  const dist: ZoneDistribution = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, totalSeconds: 0, maxHRUsed };

  for (const s of hrSplits) {
    const t = s.moving_time;
    const pct = s.average_heartrate! / maxHRUsed;
    dist.totalSeconds += t;
    if (pct >= 0.9) dist.z5 += t;
    else if (pct >= 0.8) dist.z4 += t;
    else if (pct >= 0.7) dist.z3 += t;
    else if (pct >= 0.6) dist.z2 += t;
    else dist.z1 += t;
  }

  if (dist.totalSeconds === 0) return null;
  return dist;
}

/** Return zone distribution as an array of { zone, label, color, pct } for rendering */
export function zoneBreakdown(d: ZoneDistribution) {
  const total = d.totalSeconds;
  return [
    { zone: 1, label: "Z1", color: "#60a5fa", seconds: d.z1, pct: total > 0 ? (d.z1 / total) * 100 : 0 },
    { zone: 2, label: "Z2", color: "#4ade80", seconds: d.z2, pct: total > 0 ? (d.z2 / total) * 100 : 0 },
    { zone: 3, label: "Z3", color: "#fbbf24", seconds: d.z3, pct: total > 0 ? (d.z3 / total) * 100 : 0 },
    { zone: 4, label: "Z4", color: "#f97316", seconds: d.z4, pct: total > 0 ? (d.z4 / total) * 100 : 0 },
    { zone: 5, label: "Z5", color: "#f87171", seconds: d.z5, pct: total > 0 ? (d.z5 / total) * 100 : 0 },
  ];
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export { formatSeconds as formatZoneTime };
