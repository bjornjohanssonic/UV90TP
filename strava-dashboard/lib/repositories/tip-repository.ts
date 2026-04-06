import type { Tip } from "@/types/coach";
import getDb from "@/lib/db";

export async function getTipCount(): Promise<number> {
  const db = await getDb();
  const result = await db.execute("SELECT COUNT(*) as c FROM tips");
  return (result.rows[0] as unknown as { c: number }).c;
}

export async function getTipsByTrigger(
  trigger: string,
  volumeKm: number,
  athleteId?: string,
): Promise<Tip[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT id, category, trigger, severity, title, body, source
          FROM tips
          WHERE trigger = ? AND active = 1
            AND min_weekly_km <= ? AND max_weekly_km >= ?
          ORDER BY id`,
    args: [trigger, volumeKm, volumeKm],
  });
  return result.rows as unknown as Tip[];
}

export async function getTipsByCategory(
  category: string,
  volumeKm: number,
  athleteId?: string,
): Promise<Tip[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT id, category, trigger, severity, title, body, source
          FROM tips
          WHERE category = ? AND active = 1
            AND min_weekly_km <= ? AND max_weekly_km >= ?
          ORDER BY id`,
    args: [category, volumeKm, volumeKm],
  });
  return result.rows as unknown as Tip[];
}

export async function getRecentlyShownTipIds(days: number, athleteId?: string): Promise<number[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT DISTINCT tip_id FROM tip_history
          WHERE shown_date >= date('now', ?)
            AND (athlete_id = ? OR ? IS NULL)`,
    args: [`-${days} days`, athleteId ?? null, athleteId ?? null],
  });
  return (result.rows as unknown as { tip_id: number }[]).map((r) => r.tip_id);
}

export async function recordTipShown(
  tipId: number,
  date: string,
  context: string | null,
  athleteId?: string,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT OR IGNORE INTO tip_history (tip_id, shown_date, context, athlete_id)
          VALUES (?, ?, ?, ?)`,
    args: [tipId, date, context, athleteId ?? null],
  });
}

export async function insertTip(tip: {
  category: string;
  trigger: string;
  severity: string;
  title: string;
  body: string;
  source?: string;
  min_weekly_km?: number;
  max_weekly_km?: number;
}): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO tips (category, trigger, severity, title, body, source, min_weekly_km, max_weekly_km)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      tip.category, tip.trigger, tip.severity, tip.title, tip.body,
      tip.source ?? null, tip.min_weekly_km ?? 0, tip.max_weekly_km ?? 999,
    ],
  });
}

export async function clearAllTips(): Promise<void> {
  const db = await getDb();
  await db.batch(
    [
      { sql: "DELETE FROM tip_history", args: [] },
      { sql: "DELETE FROM tips", args: [] },
    ],
    "write",
  );
}
