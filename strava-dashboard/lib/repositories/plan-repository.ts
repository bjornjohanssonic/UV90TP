import type Database from "better-sqlite3";
import type { WeekRow, VolumeRow, GymRow, GeneratedPlan } from "@/types";
import getDb from "@/lib/db";

export function getActivePlan(db: Database.Database = getDb()): Record<string, unknown> | undefined {
  return db.prepare("SELECT * FROM training_plans WHERE active = 1 LIMIT 1").get() as
    | Record<string, unknown>
    | undefined;
}

export function getPlanWeeks(planId: number | bigint, db: Database.Database = getDb()): WeekRow[] {
  return db.prepare("SELECT * FROM training_weeks WHERE plan_id = ? ORDER BY week_number").all(planId) as WeekRow[];
}

export function getWeeklyRunVolumes(planId: number | bigint, db: Database.Database = getDb()): VolumeRow[] {
  return db
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
       GROUP BY tw.start_date`,
    )
    .all(planId) as VolumeRow[];
}

export function getWeeklyGymCounts(planId: number | bigint, db: Database.Database = getDb()): GymRow[] {
  return db
    .prepare(
      `SELECT tw.start_date as week_start,
              COUNT(a.id) as gym_count
       FROM training_weeks tw
       LEFT JOIN activities a
         ON a.type = 'WeightTraining'
         AND date(a.start_date) >= tw.start_date
         AND date(a.start_date) < date(tw.start_date, '+7 days')
       WHERE tw.plan_id = ?
       GROUP BY tw.start_date`,
    )
    .all(planId) as GymRow[];
}

export function deactivateAllPlans(db: Database.Database = getDb()): void {
  db.prepare("UPDATE training_plans SET active = 0 WHERE active = 1").run();
}

export function createPlan(
  generated: GeneratedPlan,
  db: Database.Database = getDb(),
): { planId: number | bigint } {
  const result = db
    .prepare(
      `INSERT INTO training_plans (name, race_name, race_date, race_distance_km,
        start_date, starting_volume_km, peak_volume_km, total_weeks,
        build_increment, recovery_factor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      generated.recoveryFactor,
    );

  const planId = result.lastInsertRowid;

  const insertWeek = db.prepare(
    `INSERT INTO training_weeks (plan_id, week_number, start_date, target_volume_km,
      long_run_km, back_to_back, phase, cycle_number, week_in_cycle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const w of generated.weeks) {
    insertWeek.run(planId, w.weekNumber, w.startDate, w.targetVolumeKm, w.longRunKm, w.backToBack ? 1 : 0, w.phase, w.cycleNumber, w.weekInCycle);
  }

  return { planId };
}

export function deletePlan(planId: number, db: Database.Database = getDb()): void {
  db.prepare("DELETE FROM training_weeks WHERE plan_id = ?").run(planId);
  db.prepare("DELETE FROM training_plans WHERE id = ?").run(planId);
}
