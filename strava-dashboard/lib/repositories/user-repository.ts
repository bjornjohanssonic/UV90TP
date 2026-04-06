import getDb from "@/lib/db";

export async function getUserByAthleteId(
  athleteId: string,
): Promise<{ access_token: string; refresh_token: string; token_expires_at: number } | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE strava_athlete_id = ?",
    args: [athleteId],
  });
  return result.rows[0] as unknown as
    | { access_token: string; refresh_token: string; token_expires_at: number }
    | undefined;
}

export async function upsertUser(
  athleteId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO users (strava_athlete_id, access_token, refresh_token, token_expires_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(strava_athlete_id) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            token_expires_at = excluded.token_expires_at`,
    args: [athleteId, accessToken, refreshToken, expiresAt],
  });
}

export async function updateUserTokens(
  athleteId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ?
          WHERE strava_athlete_id = ?`,
    args: [accessToken, refreshToken, expiresAt, athleteId],
  });
}
