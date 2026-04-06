import getDb from "@/lib/db";

interface ReadinessRow {
  date: string;
  score: number;
  factors: string;
  computed_at: string;
}

export async function getCachedReadiness(
  date: string,
  athleteId: string,
): Promise<ReadinessRow | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT date, score, factors, computed_at FROM daily_readiness WHERE date = ? AND athlete_id = ?",
    args: [date, athleteId],
  });
  return result.rows[0] as unknown as ReadinessRow | undefined;
}

export async function upsertReadiness(
  date: string,
  score: number,
  factors: string,
  athleteId: string,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO daily_readiness (date, score, factors, computed_at, athlete_id)
          VALUES (?, ?, ?, datetime('now'), ?)
          ON CONFLICT(date, athlete_id) DO UPDATE SET
            score = excluded.score,
            factors = excluded.factors,
            computed_at = excluded.computed_at`,
    args: [date, score, factors, athleteId],
  });
}
