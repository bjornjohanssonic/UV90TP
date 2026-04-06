import { useMemo } from "react";
import type { Activity, Plan, PlanWeek, WeekData, StreakData, PlanAdherence } from "@/types";
import { aggregateWeeks, generateNextActions, getMonday, toLocalDateStr } from "@/lib/dashboard-helpers";

function computeStreaks(weeks: WeekData[]): StreakData {
  // A "streak week" = week with 3+ runs
  // `weeks` only contains weeks with actual runs — missing weeks (0 runs) are gaps.
  // We need to fill those gaps so they correctly break streaks.
  // Exclude the current (incomplete) week.
  if (weeks.length === 0) return { currentStreak: 0, longestStreak: 0, consistency: 0 };

  const currentMonday = toLocalDateStr(getMonday(new Date()));

  // Build a map of weekStart → run count
  const weekMap = new Map<string, number>();
  for (const w of weeks) {
    if (w.weekStart !== currentMonday) {
      weekMap.set(w.weekStart, w.runs);
    }
  }

  // Generate a continuous list of Mondays from last week backwards
  // (enough to cover all data + find streaks)
  const lastMonday = new Date(currentMonday + "T00:00:00");
  lastMonday.setDate(lastMonday.getDate() - 7); // previous week (most recent completed)
  const numWeeks = Math.max(weekMap.size + 8, 52); // at least a year back
  const completedWeeks: number[] = []; // run counts, newest first
  for (let i = 0; i < numWeeks; i++) {
    const monday = new Date(lastMonday);
    monday.setDate(monday.getDate() - i * 7);
    const key = toLocalDateStr(monday);
    completedWeeks.push(weekMap.get(key) ?? 0);
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Current streak: consecutive weeks from newest backwards with 3+ runs
  for (const runs of completedWeeks) {
    if (runs >= 2) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Longest streak across all weeks
  for (const runs of completedWeeks) {
    if (runs >= 2) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Consistency: % of last 8 completed weeks with 3+ runs
  const last8 = completedWeeks.slice(0, 8);
  const consistency = last8.length > 0 ? Math.round((last8.filter((r) => r >= 3).length / last8.length) * 100) : 0;

  return { currentStreak, longestStreak, consistency };
}

function computePlanAdherence(planWeeks: PlanWeek[]): PlanAdherence | null {
  // Exclude the current (incomplete) week — its partial volume would drag down stats
  const currentMonday = toLocalDateStr(getMonday(new Date()));
  const completedWeeks = planWeeks.filter((w) => w.actualVolumeKm > 0 && w.start_date !== currentMonday);
  if (completedWeeks.length === 0) return null;

  // Overall adherence: % of weeks where actual >= 90% of target (flexible threshold)
  const weeksMetTarget = completedWeeks.filter((w) => w.actualVolumeKm >= w.target_volume_km * 0.9).length;
  const overallPercent = Math.round((weeksMetTarget / completedWeeks.length) * 100);

  // Long run hit rate: weeks where longest run >= 90% of long_run_km target
  const weeksWithLongRun = completedWeeks.filter((w) => w.long_run_km > 0);
  let longRunHitRate = "N/A";
  if (weeksWithLongRun.length > 0) {
    // We can't directly know the longest run per week from PlanWeek alone,
    // but we can approximate: if actual volume >= target * 0.8, long run likely happened
    const hits = weeksWithLongRun.filter((w) => w.actualVolumeKm >= w.target_volume_km * 0.8).length;
    longRunHitRate = `${hits}/${weeksWithLongRun.length} weeks`;
  }

  // Recovery compliance: avg volume reduction in recovery weeks
  const recoveryWeeks = completedWeeks.filter((w) => w.phase === "recovery");
  let recoveryCompliance = "N/A";
  if (recoveryWeeks.length > 0) {
    const avgReduction = recoveryWeeks.reduce((s, w) => {
      const pct = w.target_volume_km > 0 ? (w.actualVolumeKm / w.target_volume_km) * 100 : 100;
      return s + pct;
    }, 0) / recoveryWeeks.length;
    recoveryCompliance = `${Math.round(avgReduction)}% of target`;
  }

  // Build progression: avg week-over-week increase during build weeks
  const buildWeeks = completedWeeks.filter((w) => w.phase === "build" && w.actualVolumeKm > 0);
  let buildProgression = "N/A";
  if (buildWeeks.length >= 2) {
    let totalIncrease = 0;
    let increases = 0;
    for (let i = 1; i < buildWeeks.length; i++) {
      if (buildWeeks[i - 1].actualVolumeKm > 0) {
        const pctChange =
          ((buildWeeks[i].actualVolumeKm - buildWeeks[i - 1].actualVolumeKm) / buildWeeks[i - 1].actualVolumeKm) *
          100;
        totalIncrease += pctChange;
        increases++;
      }
    }
    if (increases > 0) {
      buildProgression = `${totalIncrease > 0 ? "+" : ""}${Math.round(totalIncrease / increases)}%/week`;
    }
  }

  return { overallPercent, longRunHitRate, recoveryCompliance, buildProgression };
}

export function useDashboardData(activities: Activity[], plan: Plan | null, planWeeks: PlanWeek[]) {
  return useMemo(() => {
    const weeks = aggregateWeeks(activities);
    const currentWeek = weeks.length > 0 ? weeks[0] : undefined;
    const prev4 = weeks.slice(1, 5);
    const prev4AvgDist = prev4.length > 0 ? prev4.reduce((s, w) => s + w.totalDistance, 0) / prev4.length : 0;
    const weekChange =
      prev4AvgDist > 0 && currentWeek ? ((currentWeek.totalDistance - prev4AvgDist) / prev4AvgDist) * 100 : 0;

    const prev4AvgSuffer = prev4.length > 0 ? prev4.reduce((s, w) => s + w.totalSufferScore, 0) / prev4.length : 0;
    const sufferScoreChange =
      prev4AvgSuffer > 0 && currentWeek ? ((currentWeek.totalSufferScore - prev4AvgSuffer) / prev4AvgSuffer) * 100 : 0;

    const runs = activities.filter((a) => a.type === "Run");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentPlanWeek =
      planWeeks.find((w) => {
        const start = new Date(w.start_date + "T00:00:00");
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return today >= start && today < end;
      }) || null;

    if (!currentPlanWeek && planWeeks.length > 0) {
      const planStartDate = new Date(planWeeks[0].start_date + "T00:00:00");
      const planEndDate = new Date(planWeeks[planWeeks.length - 1].start_date + "T00:00:00");
      planEndDate.setDate(planEndDate.getDate() + 7);
      if (today < planStartDate) currentPlanWeek = planWeeks[0];
      else if (today >= planEndDate) currentPlanWeek = planWeeks[planWeeks.length - 1];
    }

    const nextActions = generateNextActions(currentWeek, weeks, activities, currentPlanWeek, !!plan);

    const daysToRace = plan
      ? Math.ceil((new Date(plan.race_date + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // v2: Streaks
    const streaks = computeStreaks(weeks);

    // v2: Plan adherence
    const adherence = planWeeks.length > 0 ? computePlanAdherence(planWeeks) : null;

    // v2: Current week start (Monday)
    const currentWeekStart = toLocalDateStr(getMonday(today));

    return {
      weeks,
      currentWeek,
      weekChange,
      sufferScoreChange,
      runs,
      currentPlanWeek,
      nextActions,
      daysToRace,
      streaks,
      adherence,
      currentWeekStart,
    };
  }, [activities, plan, planWeeks]);
}
