import type { Activity } from "@/types";
import type { PlanWeek } from "@/types/plan";
import type { RunQualityScore } from "@/types/coach";

interface Split {
  distance: number;
  moving_time: number;
  average_speed: number;
  elevation_difference: number;
}

export function scoreRun(
  run: Activity,
  planWeek: PlanWeek | null,
  dayOfWeek: number,
  recentRuns?: Activity[],
): RunQualityScore {
  const distKm = run.distance / 1000;

  // 1. Pace consistency (0-25) — coefficient of variation of split paces
  let paceConsistency = 12;
  if (run.splits) {
    try {
      const splits: Split[] = JSON.parse(run.splits);
      // Only use full-distance splits (filter out partial last km)
      const fullSplits = splits.filter((s) => s.distance >= 800);
      if (fullSplits.length >= 3) {
        const paces = fullSplits.map((s) => s.moving_time / (s.distance / 1000));
        const mean = paces.reduce((a, b) => a + b, 0) / paces.length;
        const variance = paces.reduce((a, p) => a + (p - mean) ** 2, 0) / paces.length;
        const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
        paceConsistency = cv < 0.03 ? 25 : cv < 0.06 ? 22 : cv < 0.1 ? 18 : cv < 0.15 ? 12 : 5;
      }
    } catch {
      paceConsistency = 12;
    }
  }

  // 2. Heart rate efficiency (0-25) — pace per heartbeat
  let heartRateEfficiency = 12;
  if (run.average_heartrate && run.average_heartrate > 0 && run.average_speed > 0) {
    const paceMinPerKm = 1000 / run.average_speed / 60;
    const efficiencyIndex = paceMinPerKm / run.average_heartrate;

    // Normalize against personal range if recent runs available
    if (recentRuns && recentRuns.length >= 5) {
      const efficiencies = recentRuns
        .filter((r) => r.average_heartrate && r.average_heartrate > 0 && r.average_speed > 0)
        .map((r) => 1000 / r.average_speed / 60 / r.average_heartrate!);

      if (efficiencies.length >= 5) {
        efficiencies.sort((a, b) => a - b);
        const rank = efficiencies.filter((e) => e > efficiencyIndex).length / efficiencies.length;
        // Lower index = better (faster pace per HR beat)
        heartRateEfficiency = rank >= 0.75 ? 25 : rank >= 0.5 ? 22 : rank >= 0.25 ? 18 : 12;
      } else {
        heartRateEfficiency = efficiencyIndex < 0.03 ? 25 : efficiencyIndex < 0.035 ? 22 : efficiencyIndex < 0.04 ? 18 : 14;
      }
    } else {
      heartRateEfficiency = efficiencyIndex < 0.03 ? 25 : efficiencyIndex < 0.035 ? 22 : efficiencyIndex < 0.04 ? 18 : 14;
    }
  }

  // 3. Elevation handling (0-25)
  let elevationHandling = 18;
  if (run.total_elevation_gain > 50 && distKm > 1) {
    const elevPerKm = run.total_elevation_gain / distKm;
    elevationHandling = elevPerKm < 10 ? 22 : elevPerKm < 25 ? 20 : elevPerKm < 40 ? 17 : elevPerKm < 60 ? 14 : 10;
  }

  // 4. Plan alignment (0-25)
  let planAlignment = 15;
  if (planWeek) {
    const isWeekend = dayOfWeek >= 6;
    const isRecoveryWeek = planWeek.phase === "recovery";

    if (isWeekend && planWeek.long_run_km > 0) {
      // Long run: score based on distance achieved
      const pct = distKm / planWeek.long_run_km;
      planAlignment = pct >= 0.9 ? 25 : pct >= 0.75 ? 20 : pct >= 0.5 ? 15 : 10;
    } else if (isRecoveryWeek) {
      // Recovery: should be easy
      if (run.average_heartrate && run.average_heartrate < 145) {
        planAlignment = 25;
      } else if (run.average_heartrate && run.average_heartrate < 155) {
        planAlignment = 20;
      } else {
        planAlignment = 15;
      }
    } else {
      // Build week, non-weekend: moderate effort is fine
      planAlignment = 18;
    }
  }

  return {
    total: paceConsistency + heartRateEfficiency + elevationHandling + planAlignment,
    paceConsistency,
    heartRateEfficiency,
    elevationHandling,
    planAlignment,
  };
}
