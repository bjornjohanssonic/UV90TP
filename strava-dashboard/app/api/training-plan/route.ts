import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "@/lib/training-plan";
import {
  getActivePlan,
  getPlanWeeks,
  getWeeklyRunVolumes,
  getWeeklyGymCounts,
  deactivateAllPlans,
  createPlan,
  deletePlan,
} from "@/lib/repositories";
import { getAuthenticatedAthleteId } from "@/lib/session";

export async function GET() {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const plan = await getActivePlan(athleteId);
  if (!plan) {
    return NextResponse.json({ plan: null });
  }

  const weeks = await getPlanWeeks(plan.id as number);

  if (weeks.length === 0) {
    return NextResponse.json({ plan, weeks: [] });
  }

  const runVolumes = await getWeeklyRunVolumes(plan.id as number, athleteId);
  const gymCounts = await getWeeklyGymCounts(plan.id as number, athleteId);

  const volumeMap = new Map(runVolumes.map((r) => [r.week_start, r]));
  const gymMap = new Map(gymCounts.map((r) => [r.week_start, r]));

  const weeksWithActual = weeks.map((w) => {
    const vol = volumeMap.get(w.start_date);
    const gym = gymMap.get(w.start_date);
    return {
      ...w,
      actualVolumeKm: vol ? Math.round(vol.actual_km * 10) / 10 : 0,
      runCount: vol ? vol.run_count : 0,
      gymCount: gym ? gym.gym_count : 0,
    };
  });

  return NextResponse.json({ plan, weeks: weeksWithActual });
}

export async function POST(request: NextRequest) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const config = await request.json();

  try {
    const generated = generatePlan(config);

    await deactivateAllPlans(athleteId);
    const { planId } = await createPlan(generated, athleteId);

    return NextResponse.json({ id: planId, plan: generated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plan generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await request.json();
  await deletePlan(id, athleteId);
  return NextResponse.json({ success: true });
}
