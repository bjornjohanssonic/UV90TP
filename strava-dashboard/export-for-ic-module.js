#!/usr/bin/env node

/**
 * export-for-ic-module.js
 *
 * Exporterar all data från Strava-dashboardens SQLite-databas till ett JSON-format
 * som kan importeras i IC-modulen (running-dashboard).
 *
 * Användning:
 *   node export-for-ic-module.js
 *   node export-for-ic-module.js --output mitt-filnamn.json
 *   node export-for-ic-module.js --db /sökväg/till/strava.db
 *
 * Kräver:
 *   npm install better-sqlite3   (redan installerat i projektet)
 *
 * Output:
 *   running-dashboard-export-YYYY-MM-DD.json
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// --- CLI-argument ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const dbPath = getArg("--db", path.join(__dirname, "strava.db"));
const today = new Date().toISOString().split("T")[0];
const outputPath = getArg("--output", `running-dashboard-export-${today}.json`);

// --- Öppna databas ---
if (!fs.existsSync(dbPath)) {
    console.error(`Fel: Databasen hittades inte på ${dbPath}`);
    console.error('Ange sökväg med: node export-for-ic-module.js --db /sökväg/till/strava.db');
    process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

// --- Exportera aktiviteter ---
// Fältnamnen mappas till IC-modulens Activity-schema
const activities = db
    .prepare(
        `SELECT
            strava_id,
            name,
            type,
            start_date,
            distance,
            moving_time,
            elapsed_time,
            average_speed,
            max_speed,
            average_heartrate,
            max_heartrate,
            total_elevation_gain,
            suffer_score,
            summary_polyline,
            battery_start,
            battery_end,
            splits
        FROM activities
        ORDER BY start_date DESC`
    )
    .all()
    .map((row) => ({
        id: String(row.strava_id),
        name: row.name,
        type: row.type,
        date: row.start_date,
        distance_m: row.distance,
        moving_time_s: row.moving_time,
        elapsed_time_s: row.elapsed_time,
        average_speed_ms: row.average_speed,
        max_speed_ms: row.max_speed,
        average_heartrate: row.average_heartrate,
        max_heartrate: row.max_heartrate,
        total_elevation_gain_m: row.total_elevation_gain,
        suffer_score: row.suffer_score,
        summary_polyline: row.summary_polyline,
        battery_start: row.battery_start,
        battery_end: row.battery_end,
        splits_json: row.splits,
    }));

// --- Exportera träningsplan ---
const planRow = db.prepare(`SELECT * FROM training_plans WHERE active = 1 LIMIT 1`).get();

let training_plan = null;
let training_weeks = [];

if (planRow) {
    training_plan = {
        id: String(planRow.id),
        name: planRow.name,
        race_name: planRow.race_name,
        race_date: planRow.race_date,
        race_distance_km: planRow.race_distance_km,
        start_date: planRow.start_date,
        starting_volume_km: planRow.starting_volume_km,
        peak_volume_km: planRow.peak_volume_km,
        total_weeks: planRow.total_weeks,
        active: true,
        created_at: planRow.created_at,
    };

    training_weeks = db
        .prepare(
            `SELECT plan_id, week_number, start_date, target_volume_km,
                    long_run_km, back_to_back, phase, cycle_number, week_in_cycle
             FROM training_weeks
             WHERE plan_id = ?
             ORDER BY week_number`
        )
        .all(planRow.id)
        .map((w) => ({
            plan_id: String(w.plan_id),
            week_number: w.week_number,
            start_date: w.start_date,
            target_volume_km: w.target_volume_km,
            long_run_km: w.long_run_km,
            back_to_back: w.back_to_back === 1,
            phase: w.phase,
            cycle_number: w.cycle_number,
            week_in_cycle: w.week_in_cycle,
        }));
}

// --- Bygg exportobjekt ---
// OBS: Formatet är identiskt med vad IC-modulens handleImport() förväntar sig
// och vad IC-modulens exportJSON() producerar. Se symmetritabell nedan.
const exportData = {
    export_version: 1,
    exported_at: new Date().toISOString(),
    source: "strava-dashboard-sqlite",
    activities,
    training_plan,
    training_weeks,
    settings: {
        athlete_name: "",
        week_start_day: "monday",
        locale: "sv-SE",
        units: "metric",
    },
};

// --- Skriv fil ---
fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), "utf-8");

db.close();

// --- Rapport ---
const runCount = activities.filter((a) => a.type === "Run").length;
const gymCount = activities.filter((a) => a.type === "WeightTraining").length;
const otherCount = activities.length - runCount - gymCount;

console.log("=== Export klar ===");
console.log(`Fil:            ${outputPath}`);
console.log(`Aktiviteter:    ${activities.length} totalt (${runCount} löprundor, ${gymCount} gym, ${otherCount} övrigt)`);
console.log(`Träningsplan:   ${training_plan ? `${training_plan.race_name || training_plan.name} (${training_weeks.length} veckor)` : "Ingen"}`);
console.log(`Filstorlek:     ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
console.log("");
console.log("Importera filen i IC-modulen via Inställningar → Importera JSON.");
