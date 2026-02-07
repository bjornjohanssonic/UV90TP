import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { generatePlan } from "@/lib/training-plan";

interface WeekRow {
  id: number;
  plan_id: number;
  week_number: number;
  start_date: string;
  target_volume_km: number;
  long_run_km: number;
  back_to_back: number;
  phase: string;
  cycle_number: number | null;
  week_in_cycle: number | null;
}

interface VolumeRow {
  week_start: string;
  actual_km: number;
  run_count: number;
}

interface GymRow {
  week_start: string;
  gym_count: number;
}

export async function GET() {
  const db = getDb();

  const plan = db.prepare("SELECT * FROM training_plans WHERE active = 1 LIMIT 1").get() as Record<string, unknown> | undefined;
  if (!plan) {
    return NextResponse.json({ plan: null });
  }

  const weeks = db
    .prepare("SELECT * FROM training_weeks WHERE plan_id = ? ORDER BY week_number")
    .all(plan.id) as WeekRow[];

  if (weeks.length === 0) {
    return NextResponse.json({ plan, weeks: [] });
  }

  // Batch: actual run volumes grouped by week (2 queries instead of 2*N)
  const runVolumes = db
    .prepare(
      `SELECT tw.start_date as week_start,
              COALESCE(SUM(a.distance), 0) / 1000.0 as actual_km,
              COUNT(a.id) as run_count
       FROM training_weeks tw
       LEFT JOIN activities a
         ON a.type = 'Run'
         AND date(a.start_date) >= tw.start_date
         AND date(a.start_date) < date(tw.start_date, '+7 days')
       WHERE tw.plan_id = ?
       GROUP BY tw.start_date`
    )
    .all(plan.id) as VolumeRow[];

  const gymCounts = db
    .prepare(
      `SELECT tw.start_date as week_start,
              COUNT(a.id) as gym_count
       FROM training_weeks tw
       LEFT JOIN activities a
         ON a.type = 'WeightTraining'
         AND date(a.start_date) >= tw.start_date
         AND date(a.start_date) < date(tw.start_date, '+7 days')
       WHERE tw.plan_id = ?
       GROUP BY tw.start_date`
    )
    .all(plan.id) as GymRow[];

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
  const config = await request.json();
  const db = getDb();

  try {
    const generated = generatePlan(config);

    // Deactivate existing plans
    db.prepare("UPDATE training_plans SET active = 0 WHERE active = 1").run();

    const result = db
      .prepare(
        `INSERT INTO training_plans (name, race_name, race_date, race_distance_km,
          start_date, starting_volume_km, peak_volume_km, total_weeks,
          build_increment, recovery_factor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        generated.name,
        generated.raceName,
        generated.raceDate,
        generated.raceDistanceKm,
        generated.startDate,
        generated.startingVolumeKm,
        generated.peakVolumeKm,
        generated.totalWeeks,
        generated.buildIncrement,
        generated.recoveryFactor
      );

    const planId = result.lastInsertRowid;

    const insertWeek = db.prepare(
      `INSERT INTO training_weeks (plan_id, week_number, start_date, target_volume_km,
        long_run_km, back_to_back, phase, cycle_number, week_in_cycle)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const w of generated.weeks) {
      insertWeek.run(
        planId,
        w.weekNumber,
        w.startDate,
        w.targetVolumeKm,
        w.longRunKm,
        w.backToBack ? 1 : 0,
        w.phase,
        w.cycleNumber,
        w.weekInCycle
      );
    }

    return NextResponse.json({ id: planId, plan: generated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plan generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  const db = getDb();
  db.prepare("DELETE FROM training_weeks WHERE plan_id = ?").run(id);
  db.prepare("DELETE FROM training_plans WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
