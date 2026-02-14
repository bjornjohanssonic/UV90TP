import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "strava.db");

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initTables(db);
  }
  return db;
}

export function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strava_athlete_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strava_id TEXT UNIQUE NOT NULL,
      name TEXT,
      type TEXT,
      distance REAL,
      moving_time INTEGER,
      elapsed_time INTEGER,
      average_speed REAL,
      max_speed REAL,
      average_heartrate REAL,
      max_heartrate REAL,
      total_elevation_gain REAL,
      start_date TEXT,
      suffer_score REAL,
      splits TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      race_name TEXT,
      race_date TEXT NOT NULL,
      race_distance_km REAL NOT NULL,
      start_date TEXT NOT NULL,
      starting_volume_km REAL NOT NULL,
      peak_volume_km REAL,
      total_weeks INTEGER NOT NULL,
      build_increment REAL NOT NULL DEFAULT 0.10,
      recovery_factor REAL NOT NULL DEFAULT 0.70,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS training_weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      target_volume_km REAL NOT NULL,
      long_run_km REAL NOT NULL DEFAULT 0,
      back_to_back INTEGER NOT NULL DEFAULT 0,
      phase TEXT NOT NULL,
      cycle_number INTEGER,
      week_in_cycle INTEGER,
      UNIQUE(plan_id, week_number)
    )
  `);

  // Migration: add columns if missing (existing DB)
  try {
    db.exec(`ALTER TABLE training_weeks ADD COLUMN long_run_km REAL NOT NULL DEFAULT 0`);
  } catch {
    /* column already exists */
  }
  try {
    db.exec(`ALTER TABLE training_weeks ADD COLUMN back_to_back INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column already exists */
  }
}

export default getDb;
