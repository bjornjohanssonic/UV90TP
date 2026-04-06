import getDb from "./db";
import type { Shoe, ShoeType } from "@/types";

export async function getAllShoes(athleteId: string): Promise<Shoe[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT s.*,
        COUNT(a.id) as activity_count,
        COALESCE(SUM(a.distance) / 1000.0, 0) as activity_km,
        COALESCE(SUM(a.distance) / 1000.0, 0) + s.manual_km as total_km
       FROM shoes s
       LEFT JOIN activities a ON a.shoe_id = s.id AND a.type = 'Run'
       WHERE s.athlete_id = ?
       GROUP BY s.id
       ORDER BY s.retired ASC, s.created_at DESC`,
    args: [athleteId],
  });
  return result.rows as unknown as Shoe[];
}

export async function createShoe(name: string, type: ShoeType, athleteId: string): Promise<Shoe> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO shoes (name, type, athlete_id) VALUES (?, ?, ?)`,
    args: [name, type, athleteId],
  });
  const result = await db.execute({
    sql: `SELECT * FROM shoes WHERE name = ? AND type = ? AND athlete_id = ? ORDER BY id DESC LIMIT 1`,
    args: [name, type, athleteId],
  });
  return result.rows[0] as unknown as Shoe;
}

export async function updateShoe(
  id: number,
  updates: { retired?: number; manual_km?: number },
): Promise<Shoe | null> {
  const db = await getDb();
  if (updates.retired !== undefined) {
    await db.execute({ sql: `UPDATE shoes SET retired = ? WHERE id = ?`, args: [updates.retired, id] });
  }
  if (updates.manual_km !== undefined) {
    await db.execute({ sql: `UPDATE shoes SET manual_km = ? WHERE id = ?`, args: [updates.manual_km, id] });
  }
  const result = await db.execute({ sql: `SELECT * FROM shoes WHERE id = ?`, args: [id] });
  return (result.rows[0] as unknown as Shoe) ?? null;
}

export async function assignShoeToActivity(stravaId: string, shoeId: number | null): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE activities SET shoe_id = ? WHERE strava_id = ?`,
    args: [shoeId, stravaId],
  });
}
