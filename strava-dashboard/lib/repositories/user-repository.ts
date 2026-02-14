import type Database from "better-sqlite3";
import getDb from "@/lib/db";

export function getUserByAthleteId(
  athleteId: string,
  db: Database.Database = getDb(),
): { access_token: string; refresh_token: string; token_expires_at: number } | undefined {
  return db.prepare("SELECT * FROM users WHERE strava_athlete_id = ?").get(athleteId) as
    | { access_token: string; refresh_token: string; token_expires_at: number }
    | undefined;
}

export function upsertUser(
  athleteId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  db: Database.Database = getDb(),
): void {
  db.prepare(
    `INSERT INTO users (strava_athlete_id, access_token, refresh_token, token_expires_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(strava_athlete_id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       token_expires_at = excluded.token_expires_at`,
  ).run(athleteId, accessToken, refreshToken, expiresAt);
}

export function updateUserTokens(
  athleteId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  db: Database.Database = getDb(),
): void {
  db.prepare(
    `UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ?
     WHERE strava_athlete_id = ?`,
  ).run(accessToken, refreshToken, expiresAt, athleteId);
}
