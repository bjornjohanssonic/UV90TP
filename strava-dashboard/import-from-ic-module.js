#!/usr/bin/env node

/**
 * import-from-ic-module.js
 *
 * Importerar data från en IC-modul JSON-export tillbaka till Strava-dashboardens
 * SQLite-databas. Symmetrisk motpart till export-for-ic-module.js.
 *
 * Användning:
 *   node import-from-ic-module.js running-dashboard-export-2026-02-16.json
 *   node import-from-ic-module.js data.json --db /sökväg/till/strava.db
 *   node import-from-ic-module.js data.json --dry-run   (förhandsgranska utan att skriva)
 *
 * Vad den gör:
 *   - Aktiviteter: upsert (insert eller update) baserat på strava_id
 *   - Träningsplan: ersätter aktiv plan (avaktiverar befintliga först)
 *   - Battery-värden: bevaras om de redan finns i databasen (COALESCE)
 *
 * Kräver:
 *   npm install better-sqlite3   (redan installerat i projektet)
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// --- CLI-argument ---
const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

function getArg(name, fallback) {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const dbPath = getArg("--db", path.join(__dirname, "strava.db"));

if (!inputPath) {
    console.error("Användning: node import-from-ic-module.js <fil.json> [--db sökväg] [--dry-run]");
    process.exit(1);
}

if (!fs.existsSync(inputPath)) {
    console.error(`Fel: Filen hittades inte: ${inputPath}`);
    process.exit(1);
}

// --- Läs och validera JSON ---
const raw = fs.readFileSync(inputPath, "utf-8");
let data;
try {
    data = JSON.parse(raw);
} catch (e) {
    console.error(`Fel: Ogiltig JSON — ${e.message}`);
    process.exit(1);
}

if (!data.export_version || !Array.isArray(data.activities)) {
    console.error("Fel: Filen saknar export_version eller activities-array.");
    console.error("Förväntat format: { export_version: 1, activities: [...], ... }");
    process.exit(1);
}

console.log(`Läser ${inputPath}...`);
console.log(`  export_version: ${data.export_version}`);
console.log(`  exported_at:    ${data.exported_at}`);
console.log(`  source:         ${data.source || "(okänd)"}`);
console.log(`  activities:     ${data.activities.length}`);
console.log(`  training_plan:  ${data.training_plan ? "Ja" : "Nej"}`);
console.log(`  training_weeks: ${data.training_weeks?.length || 0}`);
console.log("");

if (dryRun) {
    console.log("=== DRY RUN — ingen data skrivs ===");
    process.exit(0);
}

// --- Öppna databas ---
if (!fs.existsSync(dbPath)) {
    console.error(`Fel: Databasen hittades inte på ${dbPath}`);
    process.exit(1);
}

const db = new Database(dbPath);

// --- Importera aktiviteter ---
// Fältmappning: IC-modulens Activity-schema → SQLite-kolumner
// Symmetrisk invers av export-for-ic-module.js
const upsertActivity = db.prepare(`
    INSERT INTO activities (
        strava_id, name, type, distance, moving_time, elapsed_time,
        average_speed, max_speed, average_heartrate, max_heartrate,
        total_elevation_gain, start_date, suffer_score, summary_polyline,
        battery_start, battery_end, splits
    ) VALUES (
        @strava_id, @name, @type, @distance, @moving_time, @elapsed_time,
        @average_speed, @max_speed, @average_heartrate, @max_heartrate,
        @total_elevation_gain, @start_date, @suffer_score, @summary_polyline,
        @battery_start, @battery_end, @splits
    )
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
        summary_polyline = excluded.summary_polyline,
        battery_start = COALESCE(activities.battery_start, excluded.battery_start),
        battery_end = COALESCE(activities.battery_end, excluded.battery_end),
        splits = excluded.splits
`);

let insertedCount = 0;
let updatedCount = 0;

const importActivities = db.transaction(() => {
    for (const a of data.activities) {
        const existing = db
            .prepare("SELECT strava_id FROM activities WHERE strava_id = ?")
            .get(String(a.id));

        upsertActivity.run({
            strava_id: String(a.id),
            name: a.name,
            type: a.type,
            distance: a.distance_m,
            moving_time: a.moving_time_s,
            elapsed_time: a.elapsed_time_s,
            average_speed: a.average_speed_ms,
            max_speed: a.max_speed_ms,
            average_heartrate: a.average_heartrate,
            max_heartrate: a.max_heartrate,
            total_elevation_gain: a.total_elevation_gain_m,
            start_date: a.date,
            suffer_score: a.suffer_score,
            summary_polyline: a.summary_polyline,
            battery_start: a.battery_start,
            battery_end: a.battery_end,
            splits: a.splits_json,
        });

        if (existing) updatedCount++;
        else insertedCount++;
    }
});

importActivities();

// --- Importera träningsplan ---
let planImported = false;

if (data.training_plan && data.training_weeks?.length > 0) {
    const importPlan = db.transaction(() => {
        // Avaktivera befintliga planer
        db.prepare("UPDATE training_plans SET active = 0 WHERE active = 1").run();

        // Infoga ny plan
        const result = db
            .prepare(
                `INSERT INTO training_plans (
                    name, race_name, race_date, race_distance_km, start_date,
                    starting_volume_km, peak_volume_km, total_weeks, active, created_at
                ) VALUES (
                    @name, @race_name, @race_date, @race_distance_km, @start_date,
                    @starting_volume_km, @peak_volume_km, @total_weeks, 1, @created_at
                )`
            )
            .run({
                name: data.training_plan.name,
                race_name: data.training_plan.race_name,
                race_date: data.training_plan.race_date,
                race_distance_km: data.training_plan.race_distance_km,
                start_date: data.training_plan.start_date,
                starting_volume_km: data.training_plan.starting_volume_km,
                peak_volume_km: data.training_plan.peak_volume_km,
                total_weeks: data.training_plan.total_weeks,
                created_at: data.training_plan.created_at || new Date().toISOString(),
            });

        const newPlanId = result.lastInsertRowid;

        // Infoga veckor
        const insertWeek = db.prepare(`
            INSERT INTO training_weeks (
                plan_id, week_number, start_date, target_volume_km,
                long_run_km, back_to_back, phase, cycle_number, week_in_cycle
            ) VALUES (
                @plan_id, @week_number, @start_date, @target_volume_km,
                @long_run_km, @back_to_back, @phase, @cycle_number, @week_in_cycle
            )
        `);

        for (const w of data.training_weeks) {
            insertWeek.run({
                plan_id: newPlanId,
                week_number: w.week_number,
                start_date: w.start_date,
                target_volume_km: w.target_volume_km,
                long_run_km: w.long_run_km,
                back_to_back: w.back_to_back ? 1 : 0,
                phase: w.phase,
                cycle_number: w.cycle_number,
                week_in_cycle: w.week_in_cycle,
            });
        }
    });

    importPlan();
    planImported = true;
}

db.close();

// --- Rapport ---
console.log("=== Import klar ===");
console.log(`Aktiviteter: ${insertedCount} nya, ${updatedCount} uppdaterade`);
if (planImported) {
    console.log(`Träningsplan: ${data.training_plan.race_name || data.training_plan.name} (${data.training_weeks.length} veckor)`);
} else {
    console.log("Träningsplan: Ingen (ej inkluderad i filen)");
}
