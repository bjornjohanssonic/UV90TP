/**
 * GPS battery drain analysis.
 *
 * Computes per-km and per-hour drain rates from activities that have both
 * battery_start and battery_end recorded.  Flags anomalies (runs with drain
 * rate >2× the median) and predicts how long the device will last on a given
 * planned distance/duration.
 *
 * Pure — no server deps, safe for client-side use.
 */

import type { Activity } from "@/types";

export interface BatteryRunSample {
  stravaId: string;
  name: string;
  date: string;
  distanceKm: number;
  durationHours: number;
  drainPct: number;
  drainPerKm: number;
  drainPerHour: number;
}

export interface BatteryStats {
  samples: BatteryRunSample[];
  medianDrainPerHour: number;
  medianDrainPerKm: number;
  predictedHoursAt100pct: number; // how many hours from 100% to 0% at median rate
  anomalies: BatteryRunSample[]; // drain rate > 2× median
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeBatteryStats(activities: Activity[]): BatteryStats | null {
  const samples: BatteryRunSample[] = [];

  for (const a of activities) {
    if (a.battery_start == null || a.battery_end == null) continue;
    const drain = a.battery_start - a.battery_end;
    if (drain <= 0) continue; // charged or same level — skip
    const distanceKm = a.distance / 1000;
    const durationHours = a.elapsed_time / 3600;
    if (distanceKm < 1 || durationHours < 0.1) continue;

    samples.push({
      stravaId: a.strava_id,
      name: a.name,
      date: a.start_date.slice(0, 10),
      distanceKm,
      durationHours,
      drainPct: drain,
      drainPerKm: drain / distanceKm,
      drainPerHour: drain / durationHours,
    });
  }

  if (samples.length < 2) return null;

  const medianDrainPerHour = median(samples.map((s) => s.drainPerHour));
  const medianDrainPerKm = median(samples.map((s) => s.drainPerKm));
  const predictedHoursAt100pct = medianDrainPerHour > 0 ? 100 / medianDrainPerHour : 0;

  const anomalies = samples.filter((s) => s.drainPerHour > medianDrainPerHour * 2);

  return { samples, medianDrainPerHour, medianDrainPerKm, predictedHoursAt100pct, anomalies };
}

/** Given a planned distance and average pace, predict battery drain */
export function predictBatteryDrain(
  stats: BatteryStats,
  plannedKm: number,
  avgPaceMinPerKm: number,
): { drainPct: number; hoursRunning: number } {
  const hoursRunning = (plannedKm * avgPaceMinPerKm) / 60;
  const drainPct = stats.medianDrainPerHour * hoursRunning;
  return { drainPct, hoursRunning };
}
