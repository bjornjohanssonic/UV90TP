import type { Activity } from "@/types";
import type { PlanWeek } from "@/types/plan";
import type { ACWRResult, ReadinessResult, ReadinessFactors } from "@/types/coach";
import { toLocalDateStr } from "@/lib/dashboard-helpers";

export function computeReadiness(
  activities: Activity[],
  planWeek: PlanWeek | null,
  acwr: ACWRResult,
): ReadinessResult {
  const runs = activities.filter((a) => a.type === "Run");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Factor 1: Rest since last run (0-30)
  let daysSinceRun = 7;
  if (runs.length > 0) {
    const lastRunDate = new Date(runs[0].start_date);
    lastRunDate.setHours(0, 0, 0, 0);
    daysSinceRun = Math.floor((today.getTime() - lastRunDate.getTime()) / 86400000);
  }
  const restScore =
    daysSinceRun === 0 ? 8 : daysSinceRun === 1 ? 27 : daysSinceRun === 2 ? 30 : daysSinceRun === 3 ? 25 : 20;

  // Factor 2: ACWR load balance (0-25)
  let loadScore: number;
  if (acwr.zone === "green") {
    loadScore = 25;
  } else if (acwr.zone === "yellow") {
    loadScore = acwr.ratio < 0.8 ? 15 : 12;
  } else {
    loadScore = 5;
  }

  // Factor 3: Yesterday's intensity (0-25)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);
  const yesterdayRuns = runs.filter((r) => r.start_date.slice(0, 10) === yesterdayStr);

  let intensityScore = 22; // no run yesterday = fresh
  if (yesterdayRuns.length > 0) {
    const recent20 = runs.slice(0, 20);
    const avgSuffer =
      recent20.length > 0 ? recent20.reduce((s, r) => s + (r.suffer_score ?? 0), 0) / recent20.length : 50;
    const yesterdaySuffer = yesterdayRuns.reduce((s, r) => s + (r.suffer_score ?? 0), 0);

    if (yesterdaySuffer > avgSuffer * 1.5) {
      intensityScore = 5;
    } else if (yesterdaySuffer > avgSuffer) {
      intensityScore = 12;
    } else {
      intensityScore = 20;
    }
  }

  // Factor 4: Plan phase (0-20)
  const phase = planWeek?.phase ?? "none";
  const phaseScore =
    phase === "recovery" ? 20 : phase === "taper" ? 17 : phase === "build" ? 13 : phase === "race" ? 10 : 13;

  const total = restScore + loadScore + intensityScore + phaseScore;

  const label: ReadinessResult["label"] =
    total >= 80 ? "Fresh" : total >= 60 ? "Ready" : total >= 40 ? "Moderate" : total >= 20 ? "Fatigued" : "Depleted";

  const factors: ReadinessFactors = {
    restDays: restScore,
    loadBalance: loadScore,
    recentIntensity: intensityScore,
    planPhase: phaseScore,
  };

  return { score: total, factors, label };
}
