import { createClient, type Client } from "@libsql/client";

let _initPromise: Promise<Client> | null = null;

/** Returns an initialised libsql client (singleton per process). */
export function getDb(): Promise<Client> {
  if (!_initPromise) {
    _initPromise = (async () => {
      const url = process.env.TURSO_DB_URL ?? "file:./strava.db";
      const authToken = process.env.TURSO_TOKEN ?? undefined;
      const client = createClient({ url, authToken });
      await initTables(client);
      return client;
    })();
  }
  return _initPromise;
}

async function exec(db: Client, sql: string): Promise<void> {
  try {
    await db.execute(sql);
  } catch {
    /* ignore: statement may already exist */
  }
}

async function tryAlter(db: Client, sql: string): Promise<void> {
  try {
    await db.execute(sql);
  } catch {
    /* column already exists */
  }
}

async function initTables(db: Client): Promise<void> {
  try { await db.execute("PRAGMA foreign_keys = ON"); } catch { /* remote Turso ignores pragma */ }

  // ─── core tables ────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strava_athlete_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at INTEGER NOT NULL
    )`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strava_id TEXT UNIQUE NOT NULL,
      name TEXT, type TEXT,
      distance REAL, moving_time INTEGER, elapsed_time INTEGER,
      average_speed REAL, max_speed REAL,
      average_heartrate REAL, max_heartrate REAL,
      total_elevation_gain REAL,
      start_date TEXT, suffer_score REAL, splits TEXT,
      summary_polyline TEXT,
      battery_start INTEGER, battery_end INTEGER,
      shoe_id INTEGER REFERENCES shoes(id),
      athlete_id TEXT
    )`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, race_name TEXT,
      race_date TEXT NOT NULL, race_distance_km REAL NOT NULL,
      start_date TEXT NOT NULL,
      starting_volume_km REAL NOT NULL, peak_volume_km REAL,
      total_weeks INTEGER NOT NULL,
      build_increment REAL NOT NULL DEFAULT 0.10,
      recovery_factor REAL NOT NULL DEFAULT 0.70,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      athlete_id TEXT
    )`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS training_weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      target_volume_km REAL NOT NULL,
      long_run_km REAL NOT NULL DEFAULT 0,
      back_to_back INTEGER NOT NULL DEFAULT 0,
      phase TEXT NOT NULL,
      cycle_number INTEGER, week_in_cycle INTEGER,
      UNIQUE(plan_id, week_number)
    )`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'road',
      retired INTEGER NOT NULL DEFAULT 0,
      manual_km REAL NOT NULL DEFAULT 0,
      athlete_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, trigger TEXT NOT NULL,
      severity TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
      source TEXT,
      min_weekly_km REAL DEFAULT 0, max_weekly_km REAL DEFAULT 999,
      active INTEGER NOT NULL DEFAULT 1
    )`);

  // tip_history with per-user unique constraint
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tip_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tip_id INTEGER NOT NULL REFERENCES tips(id),
      shown_date TEXT NOT NULL,
      context TEXT,
      dismissed INTEGER NOT NULL DEFAULT 0,
      athlete_id TEXT,
      UNIQUE(tip_id, shown_date, athlete_id)
    )`);

  // daily_readiness with per-user unique constraint
  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_readiness (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      score INTEGER NOT NULL,
      factors TEXT NOT NULL,
      computed_at TEXT NOT NULL,
      athlete_id TEXT,
      UNIQUE(date, athlete_id)
    )`);

  // ─── column migrations for existing databases ────────────────────────────
  await tryAlter(db, `ALTER TABLE activities ADD COLUMN summary_polyline TEXT`);
  await tryAlter(db, `ALTER TABLE activities ADD COLUMN battery_start INTEGER`);
  await tryAlter(db, `ALTER TABLE activities ADD COLUMN battery_end INTEGER`);
  await tryAlter(db, `ALTER TABLE activities ADD COLUMN shoe_id INTEGER REFERENCES shoes(id)`);
  await tryAlter(db, `ALTER TABLE activities ADD COLUMN athlete_id TEXT`);
  await tryAlter(db, `ALTER TABLE training_plans ADD COLUMN athlete_id TEXT`);
  await tryAlter(db, `ALTER TABLE training_weeks ADD COLUMN long_run_km REAL NOT NULL DEFAULT 0`);
  await tryAlter(db, `ALTER TABLE training_weeks ADD COLUMN back_to_back INTEGER NOT NULL DEFAULT 0`);
  await tryAlter(db, `ALTER TABLE shoes ADD COLUMN manual_km REAL NOT NULL DEFAULT 0`);
  await tryAlter(db, `ALTER TABLE shoes ADD COLUMN athlete_id TEXT`);
  await tryAlter(db, `ALTER TABLE daily_readiness ADD COLUMN athlete_id TEXT`);

  // ─── tip_history: recreate with per-user UNIQUE if upgrading old schema ──
  // If the ALTER succeeds the old UNIQUE(tip_id,shown_date) constraint exists;
  // recreate the table so the constraint becomes UNIQUE(tip_id,shown_date,athlete_id).
  try {
    await db.execute(`ALTER TABLE tip_history ADD COLUMN athlete_id TEXT`);
    await exec(db, `DROP TABLE IF EXISTS _tip_history_new`);
    await db.execute(`
      CREATE TABLE _tip_history_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tip_id INTEGER NOT NULL REFERENCES tips(id),
        shown_date TEXT NOT NULL, context TEXT,
        dismissed INTEGER NOT NULL DEFAULT 0,
        athlete_id TEXT,
        UNIQUE(tip_id, shown_date, athlete_id)
      )`);
    await db.execute(`
      INSERT OR IGNORE INTO _tip_history_new (id, tip_id, shown_date, context, dismissed, athlete_id)
      SELECT id, tip_id, shown_date, context, dismissed, athlete_id FROM tip_history`);
    await db.execute(`DROP TABLE tip_history`);
    await db.execute(`ALTER TABLE _tip_history_new RENAME TO tip_history`);
  } catch { /* already migrated */ }

  // ─── daily_readiness: recreate with per-user UNIQUE if upgrading ─────────
  try {
    await db.execute(`ALTER TABLE daily_readiness ADD COLUMN athlete_id TEXT`);
    await exec(db, `DROP TABLE IF EXISTS _daily_readiness_new`);
    await db.execute(`
      CREATE TABLE _daily_readiness_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL, score INTEGER NOT NULL,
        factors TEXT NOT NULL, computed_at TEXT NOT NULL,
        athlete_id TEXT,
        UNIQUE(date, athlete_id)
      )`);
    await db.execute(`
      INSERT OR IGNORE INTO _daily_readiness_new (id, date, score, factors, computed_at, athlete_id)
      SELECT id, date, score, factors, computed_at, athlete_id FROM daily_readiness`);
    await db.execute(`DROP TABLE daily_readiness`);
    await db.execute(`ALTER TABLE _daily_readiness_new RENAME TO daily_readiness`);
  } catch { /* already migrated */ }

  // ─── backfill athlete_id on existing single-user data ───────────────────
  for (const table of ["activities", "training_plans", "shoes"]) {
    await exec(db,
      `UPDATE ${table} SET athlete_id = (SELECT strava_athlete_id FROM users LIMIT 1)
       WHERE athlete_id IS NULL AND EXISTS (SELECT 1 FROM users LIMIT 1)`);
  }
  await exec(db,
    `UPDATE daily_readiness SET athlete_id = (SELECT strava_athlete_id FROM users LIMIT 1)
     WHERE athlete_id IS NULL AND EXISTS (SELECT 1 FROM users LIMIT 1)`);
  await exec(db,
    `UPDATE tip_history SET athlete_id = (SELECT strava_athlete_id FROM users LIMIT 1)
     WHERE athlete_id IS NULL AND EXISTS (SELECT 1 FROM users LIMIT 1)`);
}

export default getDb;
