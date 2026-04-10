import type { Activity } from "@/types";
import getDb from "@/lib/db";

export async function getAllActivities(athleteId: string): Promise<Activity[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT strava_id, name, type, distance, moving_time, elapsed_time,
            average_speed, max_speed, average_heartrate, max_heartrate,
            total_elevation_gain, start_date, suffer_score, splits, summary_polyline,
            battery_start, battery_end, shoe_id
          FROM activities
          WHERE athlete_id = ?
          ORDER BY start_date DESC`,
    args: [athleteId],
  });
  return result.rows as unknown as Activity[];
}

export async function countActivitiesMissingPolyline(athleteId: string): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT COUNT(*) as c FROM activities
          WHERE athlete_id = ?
            AND (summary_polyline IS NULL OR summary_polyline = '')
            AND type IN ('Run', 'Walk', 'Ride', 'Hike', 'Swim')
            AND COALESCE(summary_polyline, '') != 'none'`,
    args: [athleteId],
  });
  return (result.rows[0] as unknown as { c: number }).c;
}

export async function getActivitiesMissingPolyline(
  athleteId: string,
): Promise<{ strava_id: string; name: string }[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT strava_id, name FROM activities
          WHERE athlete_id = ?
            AND (summary_polyline IS NULL OR summary_polyline = '')
            AND type IN ('Run', 'Walk', 'Ride', 'Hike', 'Swim')
            AND COALESCE(summary_polyline, '') != 'none'`,
    args: [athleteId],
  });
  return result.rows as unknown as { strava_id: string; name: string }[];
}

export async function getMostRecentActivityDate(
  athleteId: string,
): Promise<{ start_date: string } | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT start_date FROM activities WHERE athlete_id = ? ORDER BY start_date DESC LIMIT 1",
    args: [athleteId],
  });
  return result.rows[0] as unknown as { start_date: string } | undefined;
}

export async function getActivitySplits(
  stravaId: string,
): Promise<{ strava_id: string; splits: string | null; summary_polyline: string | null } | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT strava_id, splits, summary_polyline FROM activities WHERE strava_id = ?",
    args: [stravaId],
  });
  return result.rows[0] as unknown as
    | { strava_id: string; splits: string | null; summary_polyline: string | null }
    | undefined;
}

export async function updateBattery(
  stravaId: string,
  batteryStart: number | null,
  batteryEnd: number | null,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE activities SET battery_start = ?, battery_end = ? WHERE strava_id = ?",
    args: [batteryStart, batteryEnd, stravaId],
  });
}

export async function upsertActivity(
  params: {
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
    summary_polyline: string | null;
    athlete_id: string;
  },
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO activities (strava_id, name, type, distance, moving_time, elapsed_time,
            average_speed, max_speed, average_heartrate, max_heartrate,
            total_elevation_gain, start_date, suffer_score, splits, summary_polyline, athlete_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(strava_id) DO UPDATE SET
            name = excluded.name, type = excluded.type, distance = excluded.distance,
            moving_time = excluded.moving_time, elapsed_time = excluded.elapsed_time,
            average_speed = excluded.average_speed, max_speed = excluded.max_speed,
            average_heartrate = excluded.average_heartrate, max_heartrate = excluded.max_heartrate,
            total_elevation_gain = excluded.total_elevation_gain, start_date = excluded.start_date,
            suffer_score = excluded.suffer_score, splits = excluded.splits,
            summary_polyline = excluded.summary_polyline,
            athlete_id = COALESCE(activities.athlete_id, excluded.athlete_id),
            battery_start = COALESCE(activities.battery_start, NULL),
            battery_end = COALESCE(activities.battery_end, NULL)`,
    args: [
      params.strava_id, params.name, params.type, params.distance,
      params.moving_time, params.elapsed_time, params.average_speed, params.max_speed,
      params.average_heartrate, params.max_heartrate, params.total_elevation_gain,
      params.start_date, params.suffer_score, params.splits, params.summary_polyline,
      params.athlete_id,
    ],
  });
}
