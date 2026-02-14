import type Database from "better-sqlite3";
import type { Activity } from "@/types";
import getDb from "@/lib/db";

export function getAllActivities(db: Database.Database = getDb()): Activity[] {
  return db
    .prepare(
      `SELECT strava_id, name, type, distance, moving_time, elapsed_time,
        average_speed, max_speed, average_heartrate, max_heartrate,
        total_elevation_gain, start_date, suffer_score, splits
       FROM activities
       ORDER BY start_date DESC`,
    )
    .all() as Activity[];
}

export function getMostRecentActivityDate(
  db: Database.Database = getDb(),
): { start_date: string } | undefined {
  return db.prepare("SELECT start_date FROM activities ORDER BY start_date DESC LIMIT 1").get() as
    | { start_date: string }
    | undefined;
}

export function getActivitySplits(
  stravaId: string,
  db: Database.Database = getDb(),
): { strava_id: string; splits: string | null } | undefined {
  return db.prepare("SELECT strava_id, splits FROM activities WHERE strava_id = ?").get(stravaId) as
    | { strava_id: string; splits: string | null }
    | undefined;
}

export function upsertActivity(
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
  },
  db: Database.Database = getDb(),
): void {
  db.prepare(
    `INSERT INTO activities (strava_id, name, type, distance, moving_time, elapsed_time,
      average_speed, max_speed, average_heartrate, max_heartrate,
      total_elevation_gain, start_date, suffer_score, splits)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(strava_id) DO UPDATE SET
       name = excluded.name, type = excluded.type, distance = excluded.distance,
       moving_time = excluded.moving_time, elapsed_time = excluded.elapsed_time,
       average_speed = excluded.average_speed, max_speed = excluded.max_speed,
       average_heartrate = excluded.average_heartrate, max_heartrate = excluded.max_heartrate,
       total_elevation_gain = excluded.total_elevation_gain, start_date = excluded.start_date,
       suffer_score = excluded.suffer_score, splits = excluded.splits`,
  ).run(
    params.strava_id,
    params.name,
    params.type,
    params.distance,
    params.moving_time,
    params.elapsed_time,
    params.average_speed,
    params.max_speed,
    params.average_heartrate,
    params.max_heartrate,
    params.total_elevation_gain,
    params.start_date,
    params.suffer_score,
    params.splits,
  );
}
