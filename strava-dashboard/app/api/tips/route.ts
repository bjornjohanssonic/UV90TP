import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAthleteId } from "@/lib/session";
import { getAllActivities } from "@/lib/repositories/activity-repository";
import { aggregateWeeks, toLocalDateStr } from "@/lib/dashboard-helpers";

export async function GET(request: NextRequest) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const trigger = searchParams.get("trigger") ?? "daily";
  const stravaId = searchParams.get("strava_id");

  // Dynamically import tips module (it may not exist yet during seed)
  let selectDailyTips: typeof import("@/lib/tips").selectDailyTips;
  let selectPostRunTips: typeof import("@/lib/tips").selectPostRunTips;
  try {
    const tipsModule = await import("@/lib/tips");
    selectDailyTips = tipsModule.selectDailyTips;
    selectPostRunTips = tipsModule.selectPostRunTips;
  } catch {
    return NextResponse.json({ daily: [], contextual: [] });
  }

  const activities = await getAllActivities(athleteId);
  const weeks = aggregateWeeks(activities);
  const currentWeekKm = weeks.length > 0 ? weeks[0].totalDistance / 1000 : 0;

  const today = toLocalDateStr(new Date());

  if (trigger === "post_run" && stravaId) {
    const run = activities.find((a) => a.strava_id === stravaId);
    if (!run) return NextResponse.json({ daily: [], contextual: [] });
    const contextual = await selectPostRunTips(run, currentWeekKm, athleteId);
    return NextResponse.json({ daily: [], contextual });
  }

  const daily = await selectDailyTips(today, currentWeekKm, athleteId);
  return NextResponse.json({ daily, contextual: [] });
}
