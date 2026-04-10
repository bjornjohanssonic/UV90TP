import type { WeekRow, VolumeRow, GymRow, GeneratedPlan } from "@/types";
import getDb from "@/lib/db";

export async function getActivePlan(athleteId: string): Promise<Record<string, unknown> | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM training_plans WHERE active = 1 AND athlete_id = ? LIMIT 1",
    args: [athleteId],
  });
  return result.rows[0] as unknown as Record<string, unknown> | undefined;
}

export async function getPlanWeeks(planId: number | bigint): Promise<WeekRow[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM training_weeks WHERE plan_id = ? ORDER BY week_number",
    args: [planId],
  });
  return result.rows as unknown as WeekRow[];
}

export async function getWeeklyRunVolumes(planId: number | bigint, athleteId: string): Promise<VolumeRow[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT tw.start_date as week_start,
                 COALESCE(SUM(a.distance), 0) / 1000.0 as actual_km,
                 COUNT(a.id) as run_count
          FROM training_weeks tw
          LEFT JOIN activities a
            ON a.type = 'Run'
            AND a.athlete_id = ?
            AND date(a.start_date) >= tw.start_date
            AND date(a.start_date) < date(tw.start_date, '+7 days')
          WHERE tw.plan_id = ?
          GROUP BY tw.start_date`,
    args: [athleteId, planId],
  });
  return result.rows as unknown as VolumeRow[];
}

export async function getWeeklyGymCounts(planId: number | bigint, athleteId: string): Promise<GymRow[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT tw.start_date as week_start,
                 COUNT(a.id) as gym_count
          FROM training_weeks tw
          LEFT JOIN activities a
            ON a.type = 'WeightTraining'
            AND a.athlete_id = ?
            AND date(a.start_date) >= tw.start_date
            AND date(a.start_date) < date(tw.start_date, '+7 days')
          WHERE tw.plan_id = ?
          GROUP BY tw.start_date`,
    args: [athleteId, planId],
  });
  return result.rows as unknown as GymRow[];
}

export async function deactivateAllPlans(athleteId: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE training_plans SET active = 0 WHERE active = 1 AND athlete_id = ?",
    args: [athleteId],
  });
}

export async function createPlan(
  generated: GeneratedPlan,
  athleteId: string,
): Promise<{ planId: number }> {
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO training_plans (name, race_name, race_date, race_distance_km,
            start_date, starting_volume_km, peak_volume_km, total_weeks,
            build_increment, recovery_factor, athlete_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      generated.name, generated.raceName, generated.raceDate, generated.raceDistanceKm,
      generated.startDate, generated.startingVolumeKm, generated.peakVolumeKm,
      generated.totalWeeks, generated.buildIncrement, generated.recoveryFactor,
      athleteId,
    ],
  });
  const planId = Number(result.lastInsertRowid);

  await db.batch(
    generated.weeks.map((w) => ({
      sql: `INSERT INTO training_weeks (plan_id, week_number, start_date, target_volume_km,
              long_run_km, back_to_back, phase, cycle_number, week_in_cycle)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        planId, w.weekNumber, w.startDate, w.targetVolumeKm,
        w.longRunKm, w.backToBack ? 1 : 0, w.phase, w.cycleNumber, w.weekInCycle,
      ],
    })),
    "write",
  );

  return { planId };
}

export async function deletePlan(planId: number, athleteId: string): Promise<void> {
  const db = await getDb();
  await db.batch(
    [
      {
        sql: "DELETE FROM training_weeks WHERE plan_id = (SELECT id FROM training_plans WHERE id = ? AND athlete_id = ?)",
        args: [planId, athleteId],
      },
      { sql: "DELETE FROM training_plans WHERE id = ? AND athlete_id = ?", args: [planId, athleteId] },
    ],
    "write",
  );
}
