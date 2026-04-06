import { NextResponse } from "next/server";
import { getAuthenticatedAthleteId } from "@/lib/session";
import { getAllActivities } from "@/lib/repositories/activity-repository";
import { getActivePlan, getPlanWeeks, getWeeklyRunVolumes } from "@/lib/repositories/plan-repository";
import { computeACWR } from "@/lib/acwr";
import { computeReadiness } from "@/lib/readiness";
import { generateDailyBriefing } from "@/lib/coach";
import { getMonday, toLocalDateStr, formatPace, getDayOfWeek, aggregateWeeks } from "@/lib/dashboard-helpers";
import type { CoachContext, CoachResponse } from "@/types/coach";
import type { PlanWeek } from "@/types/plan";

export async function GET() {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const activities = await getAllActivities(athleteId);
  const runs = activities.filter((a) => a.type === "Run");

  // ACWR
  const acwr = computeACWR(activities);

  // Find current plan week
  const plan = await getActivePlan(athleteId);
  let currentPlanWeek: PlanWeek | null = null;
  if (plan) {
    const planWeeks = await getPlanWeeks(plan.id as number);
    const volumes = await getWeeklyRunVolumes(plan.id as number, athleteId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matched = planWeeks.find((w) => {
      const start = new Date(w.start_date + "T00:00:00");
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return today >= start && today < end;
    });

    if (matched) {
      const vol = volumes.find((v) => v.week_start === matched.start_date);
      currentPlanWeek = {
        ...matched,
        actualVolumeKm: vol?.actual_km ?? 0,
        runCount: vol?.run_count ?? 0,
        gymCount: 0,
      } as PlanWeek;
    } else if (planWeeks.length > 0) {
      const planStart = new Date(planWeeks[0].start_date + "T00:00:00");
      if (today < planStart) {
        currentPlanWeek = { ...planWeeks[0], actualVolumeKm: 0, runCount: 0, gymCount: 0 } as PlanWeek;
      } else {
        const last = planWeeks[planWeeks.length - 1];
        const lastVol = volumes.find((v) => v.week_start === last.start_date);
        currentPlanWeek = {
          ...last,
          actualVolumeKm: lastVol?.actual_km ?? 0,
          runCount: lastVol?.run_count ?? 0,
          gymCount: 0,
        } as PlanWeek;
      }
    }
  }

  const dayOfWeek = getDayOfWeek();

  // Readiness
  const readiness = computeReadiness(activities, currentPlanWeek, acwr);

  // Consecutive run days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let consecutiveRunDays = 0;
  const checkDate = new Date(today);
  for (let i = 0; i < 7; i++) {
    const dayStr = toLocalDateStr(checkDate);
    if (runs.some((r) => r.start_date.slice(0, 10) === dayStr)) {
      consecutiveRunDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }

  // Current week stats
  const weeks = aggregateWeeks(activities);
  const currentWeek = weeks.length > 0 ? weeks[0] : null;

  // Average pace over last 4 weeks
  const recentWeeks = weeks.slice(0, 4).filter((w) => w.runs > 0);
  const avgPace4w =
    recentWeeks.length > 0
      ? formatPace(1000, recentWeeks.reduce((s, w) => s + w.avgPace, 0) / recentWeeks.length)
      : "6:00";

  // Days to race
  const daysToRace =
    plan && (plan as Record<string, unknown>).race_date
      ? Math.ceil(
          (new Date((plan as Record<string, unknown>).race_date + "T00:00:00").getTime() - today.getTime()) /
            86400000,
        )
      : null;

  const ctx: CoachContext = {
    dayOfWeek,
    planPhase: currentPlanWeek?.phase ?? null,
    planWeekNumber: currentPlanWeek?.week_number ?? null,
    targetVolumeKm: currentPlanWeek?.target_volume_km ?? 0,
    actualVolumeKm: currentPlanWeek?.actualVolumeKm ?? 0,
    longRunKm: currentPlanWeek?.long_run_km ?? 0,
    longestRunThisWeekKm: currentWeek ? currentWeek.longestRun / 1000 : 0,
    backToBack: currentPlanWeek?.back_to_back === 1,
    consecutiveRunDays,
    acwrRatio: acwr.ratio,
    acwrZone: acwr.zone,
    readinessScore: readiness.score,
    daysToRace,
    avgPace4w,
  };

  const briefing = generateDailyBriefing(ctx);

  const response: CoachResponse = { briefing, acwr, readiness };
  return NextResponse.json(response);
}
