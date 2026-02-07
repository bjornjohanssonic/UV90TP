import axios from "axios";
import getDb from "./db";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: { id: number };
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain: number;
  start_date: string;
  suffer_score?: number;
  splits_metric?: { average_speed: number; distance: number; elapsed_time: number; elevation_difference: number; moving_time: number; split: number }[];
}

export interface Activity {
  strava_id: string;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  max_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  total_elevation_gain: number;
  start_date: string;
  suffer_score: number | null;
  splits: string | null;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const response = await axios.post<TokenResponse>(
    "https://www.strava.com/oauth/token",
    {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }
  );
  return response.data;
}

export async function refreshAccessToken(athleteId: string): Promise<string> {
  const db = getDb();

  const user = db
    .prepare("SELECT * FROM users WHERE strava_athlete_id = ?")
    .get(athleteId) as {
    access_token: string;
    refresh_token: string;
    token_expires_at: number;
  } | undefined;

  if (!user) {
    throw new Error("User not found");
  }

  const now = Math.floor(Date.now() / 1000);
  if (user.token_expires_at > now) {
    return user.access_token;
  }

  const response = await axios.post<TokenResponse>(
    "https://www.strava.com/oauth/token",
    {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: user.refresh_token,
    }
  );

  const { access_token, refresh_token, expires_at } = response.data;

  db.prepare(
    `UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ?
     WHERE strava_athlete_id = ?`
  ).run(access_token, refresh_token, expires_at, athleteId);

  return access_token;
}

export function upsertUser(
  athleteId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO users (strava_athlete_id, access_token, refresh_token, token_expires_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(strava_athlete_id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       token_expires_at = excluded.token_expires_at`
  ).run(athleteId, accessToken, refreshToken, expiresAt);
}

export async function fetchAndStoreActivities(
  athleteId: string
): Promise<{ synced: number; total: number }> {
  const accessToken = await refreshAccessToken(athleteId);
  const db = getDb();

  // August 1, 2025 as Unix timestamp
  const after = Math.floor(new Date("2025-08-01T00:00:00Z").getTime() / 1000);

  let page = 1;
  const perPage = 100;
  let synced = 0;
  let total = 0;

  const upsertStmt = db.prepare(
    `INSERT INTO activities (strava_id, name, type, distance, moving_time, elapsed_time,
      average_speed, max_speed, average_heartrate, max_heartrate,
      total_elevation_gain, start_date, suffer_score, splits)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(strava_id) DO UPDATE SET
       name = excluded.name,
       type = excluded.type,
       distance = excluded.distance,
       moving_time = excluded.moving_time,
       elapsed_time = excluded.elapsed_time,
       average_speed = excluded.average_speed,
       max_speed = excluded.max_speed,
       average_heartrate = excluded.average_heartrate,
       max_heartrate = excluded.max_heartrate,
       total_elevation_gain = excluded.total_elevation_gain,
       start_date = excluded.start_date,
       suffer_score = excluded.suffer_score,
       splits = excluded.splits`
  );

  while (true) {
    const response = await axios.get<StravaActivity[]>(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { after, page, per_page: perPage },
      }
    );

    const activities = response.data;
    if (activities.length === 0) break;

    for (const act of activities) {
      // Check if we already have this activity with splits
      const existing = db
        .prepare("SELECT strava_id, splits FROM activities WHERE strava_id = ?")
        .get(String(act.id)) as { strava_id: string; splits: string | null } | undefined;

      let splitsJson: string | null = null;

      // Fetch detailed activity for splits if we don't have them cached
      if (!existing?.splits) {
        try {
          const detail = await axios.get<StravaActivity>(
            `https://www.strava.com/api/v3/activities/${act.id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (detail.data.splits_metric) {
            splitsJson = JSON.stringify(detail.data.splits_metric);
          }
          synced++;
        } catch {
          // Rate limited or error — store without splits
          synced++;
        }
      } else {
        splitsJson = existing.splits;
      }

      upsertStmt.run(
        String(act.id),
        act.name,
        act.type,
        act.distance,
        act.moving_time,
        act.elapsed_time,
        act.average_speed,
        act.max_speed,
        act.average_heartrate ?? null,
        act.max_heartrate ?? null,
        act.total_elevation_gain,
        act.start_date,
        act.suffer_score ?? null,
        splitsJson
      );
      total++;
    }

    if (activities.length < perPage) break;
    page++;
  }

  return { synced, total };
}

export function getCachedActivities(): Activity[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT strava_id, name, type, distance, moving_time, elapsed_time,
        average_speed, max_speed, average_heartrate, max_heartrate,
        total_elevation_gain, start_date, suffer_score, splits
       FROM activities
       ORDER BY start_date DESC`
    )
    .all() as Activity[];
}
