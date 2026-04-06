import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAthleteId } from "@/lib/session";
import { getAllActivities } from "@/lib/repositories/activity-repository";
import { getActivePlan, getPlanWeeks, getWeeklyRunVolumes } from "@/lib/repositories/plan-repository";
import { scoreRun } from "@/lib/scoring";
import type { PlanWeek } from "@/types/plan";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ strava_id: string }> }) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { strava_id } = await params;
  const activities = await getAllActivities(athleteId);
  const run = activities.find((a) => a.strava_id === strava_id);
  if (!run) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  // Find plan week for this run's date
  let planWeek: PlanWeek | null = null;
  const plan = await getActivePlan(athleteId);
  if (plan) {
    const planWeeks = await getPlanWeeks(plan.id as number);
    const volumes = await getWeeklyRunVolumes(plan.id as number, athleteId);
    const runDate = new Date(run.start_date);
    runDate.setHours(0, 0, 0, 0);

    const matched = planWeeks.find((w) => {
      const start = new Date(w.start_date + "T00:00:00");
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return runDate >= start && runDate < end;
    });

    if (matched) {
      const vol = volumes.find((v) => v.week_start === matched.start_date);
      planWeek = { ...matched, actualVolumeKm: vol?.actual_km ?? 0, runCount: vol?.run_count ?? 0, gymCount: 0 } as PlanWeek;
    }
  }

  const runDayOfWeek = new Date(run.start_date).getDay();
  const dow = runDayOfWeek === 0 ? 7 : runDayOfWeek;

  // Get recent runs for HR efficiency comparison
  const recentRuns = activities.filter((a) => a.type === "Run").slice(0, 30);

  const score = scoreRun(run, planWeek, dow, recentRuns);
  return NextResponse.json(score);
}
