import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient, type Client } from "@libsql/client";
import { z } from "zod";

// ─── DB connection ────────────────────────────────────────────────────────────

const TURSO_URL = process.env.TURSO_DB_URL;
const TURSO_TOKEN = process.env.TURSO_TOKEN;

if (!TURSO_URL) {
  console.error("Missing TURSO_DB_URL environment variable");
  process.exit(1);
}

const db: Client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mpsToMinPerKm(mps: number): string {
  if (!mps || mps <= 0) return "–";
  const secPerKm = 1000 / mps;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

function metersToKm(m: number): string {
  return (m / 1000).toFixed(1) + " km";
}

function secondsToHms(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}

// libsql returns rows as arrays; map to objects using column names
function toObjects(result: { columns: string[]; rows: any[][] }): Record<string, any>[] {
  return result.rows.map((row) =>
    Object.fromEntries(result.columns.map((col, i) => [col, row[i]]))
  );
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "strava-running",
  version: "1.0.0",
});

// ── Tool: get_recent_activities ───────────────────────────────────────────────

server.tool(
  "get_recent_activities",
  "Hämta senaste löpturer och aktiviteter. Returnerar distans, tid, tempo, puls och mer.",
  {
    limit: z.number().min(1).max(100).default(20).describe("Antal aktiviteter (max 100)"),
    type: z
      .enum(["Run", "WeightTraining", "Walk", "Ride", "Hike", "all"])
      .default("Run")
      .describe("Aktivitetstyp (default: Run)"),
  },
  async ({ limit, type }) => {
    const typeClause = type === "all" ? "" : "AND type = ?";
    const args: (string | number)[] = [];
    if (type !== "all") args.push(type);
    args.push(limit);

    const result = await db.execute({
      sql: `SELECT strava_id, name, type, distance, moving_time, average_speed,
                   average_heartrate, max_heartrate, total_elevation_gain,
                   start_date, suffer_score, battery_start, battery_end
            FROM activities
            WHERE 1=1 ${typeClause}
            ORDER BY start_date DESC
            LIMIT ?`,
      args,
    });

    const rows = toObjects(result as any);

    if (rows.length === 0) {
      return { content: [{ type: "text", text: "Inga aktiviteter hittades." }] };
    }

    const lines = rows.map((r, i) => {
      const date = String(r.start_date ?? "?").slice(0, 10);
      const dist = r.distance ? metersToKm(Number(r.distance)) : "–";
      const time = r.moving_time ? secondsToHms(Number(r.moving_time)) : "–";
      const pace = r.average_speed ? mpsToMinPerKm(Number(r.average_speed)) : "–";
      const hr = r.average_heartrate ? `${Math.round(Number(r.average_heartrate))} bpm` : "–";
      const elev = r.total_elevation_gain ? `${Math.round(Number(r.total_elevation_gain))}m ↑` : "–";
      const suffer = r.suffer_score ? `suffer=${Math.round(Number(r.suffer_score))}` : "";
      const battery =
        r.battery_start != null && r.battery_end != null
          ? `batteri: ${r.battery_start}% → ${r.battery_end}%`
          : "";
      return `${i + 1}. [${date}] ${r.name} — ${dist}, ${time}, ${pace}, puls: ${hr}, elev: ${elev}${suffer ? ", " + suffer : ""}${battery ? ", " + battery : ""}`;
    });

    return {
      content: [{ type: "text", text: `## Senaste ${rows.length} aktiviteter (typ: ${type})\n\n${lines.join("\n")}` }],
    };
  }
);

// ── Tool: get_week_summary ────────────────────────────────────────────────────

server.tool(
  "get_week_summary",
  "Veckovis summering av löpning — distans, tid, antal löpturer, puls, elevation. Täcker de senaste N veckorna.",
  {
    weeks: z.number().min(1).max(52).default(8).describe("Antal veckor bakåt (max 52)"),
  },
  async ({ weeks }) => {
    const result = await db.execute({
      sql: `SELECT
               strftime('%Y-W%W', start_date) AS week,
               date(start_date, 'weekday 1', '-7 days') AS week_start,
               COUNT(*) AS runs,
               SUM(distance) AS total_dist,
               SUM(moving_time) AS total_time,
               AVG(average_heartrate) AS avg_hr,
               SUM(total_elevation_gain) AS total_elev,
               SUM(suffer_score) AS total_suffer
             FROM activities
             WHERE type = 'Run'
               AND start_date >= date('now', ?)
             GROUP BY week
             ORDER BY week DESC`,
      args: [`-${weeks * 7} days`],
    });

    const rows = toObjects(result as any);

    if (rows.length === 0) {
      return { content: [{ type: "text", text: "Inga data hittades." }] };
    }

    const lines = rows.map((r) => {
      const dist = r.total_dist ? metersToKm(Number(r.total_dist)) : "0 km";
      const time = r.total_time ? secondsToHms(Number(r.total_time)) : "–";
      const hr = r.avg_hr ? `${Math.round(Number(r.avg_hr))} bpm` : "–";
      const elev = r.total_elev ? `${Math.round(Number(r.total_elev))}m ↑` : "–";
      const suffer = r.total_suffer ? `, suffer: ${Math.round(Number(r.total_suffer))}` : "";
      return `${r.week_start}: ${dist} på ${r.runs} löpturer, tid: ${time}, puls: ${hr}, elev: ${elev}${suffer}`;
    });

    return {
      content: [{ type: "text", text: `## Veckosummering — senaste ${weeks} veckor\n\n${lines.join("\n")}` }],
    };
  }
);

// ── Tool: get_training_plan ───────────────────────────────────────────────────

server.tool(
  "get_training_plan",
  "Hämta aktiv träningsplan med alla veckor — mål, fas, faktisk volym och progress.",
  {},
  async () => {
    const planResult = await db.execute(
      "SELECT * FROM training_plans WHERE active = 1 ORDER BY created_at DESC LIMIT 1"
    );
    const plans = toObjects(planResult as any);
    const plan = plans[0];

    if (!plan) {
      return { content: [{ type: "text", text: "Ingen aktiv träningsplan hittades." }] };
    }

    const raceDate = new Date(String(plan.race_date) + "T00:00:00");
    const today = new Date();
    const daysToRace = Math.ceil((raceDate.getTime() - today.getTime()) / 86400000);

    const weeksResult = await db.execute({
      sql: `SELECT tw.*,
                   (SELECT SUM(a.distance) / 1000.0
                    FROM activities a
                    WHERE a.type = 'Run'
                      AND date(a.start_date) >= tw.start_date
                      AND date(a.start_date) <= date(tw.start_date, '+6 days')
                   ) AS actual_km,
                   (SELECT COUNT(*)
                    FROM activities a
                    WHERE a.type = 'Run'
                      AND date(a.start_date) >= tw.start_date
                      AND date(a.start_date) <= date(tw.start_date, '+6 days')
                   ) AS run_count
            FROM training_weeks tw
            WHERE tw.plan_id = ?
            ORDER BY tw.week_number`,
      args: [plan.id as number],
    });

    const weeks = toObjects(weeksResult as any);
    const todayStr = today.toISOString().slice(0, 10);
    const currentWeek = weeks.find((w) => {
      const end = new Date(String(w.start_date));
      end.setDate(end.getDate() + 6);
      return todayStr >= String(w.start_date) && todayStr <= end.toISOString().slice(0, 10);
    });

    const header = [
      `## Träningsplan: ${plan.race_name ?? "Lopp"}`,
      `Lopp: ${plan.race_date} (${daysToRace} dagar kvar)`,
      `Distans: ${plan.race_distance_km} km`,
      `Startvolym: ${plan.starting_volume_km} km/v → Toppvolym: ${plan.peak_volume_km ?? "auto"} km/v`,
      `Plan: ${plan.total_weeks} veckor (${plan.start_date} – ${weeks[weeks.length - 1]?.start_date ?? "?"})`,
      "",
    ].join("\n");

    const currentInfo = currentWeek
      ? [
          `### Aktuell vecka (v${currentWeek.week_number}, ${currentWeek.phase})`,
          `Mål: ${Number(currentWeek.target_volume_km).toFixed(1)} km | Faktisk: ${Number(currentWeek.actual_km ?? 0).toFixed(1)} km | Löpturer: ${currentWeek.run_count ?? 0}`,
          `Långpass mål: ${currentWeek.long_run_km} km | Back-to-back: ${currentWeek.back_to_back ? "Ja" : "Nej"}`,
          "",
        ].join("\n")
      : "";

    const weekLines = weeks.map((w) => {
      const target = Number(w.target_volume_km);
      const actual = Number(w.actual_km ?? 0);
      const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
      const isCurrent = currentWeek?.week_number === w.week_number ? " ◄" : "";
      return `v${String(w.week_number).padStart(2, "0")} [${String(w.phase).padEnd(8)}] mål: ${target.toFixed(1).padStart(5)} km | faktisk: ${actual.toFixed(1).padStart(5)} km (${pct}%) | LR: ${w.long_run_km} km${w.back_to_back ? " B2B" : ""}${isCurrent}`;
    });

    return {
      content: [{ type: "text", text: header + currentInfo + "### Alla veckor\n\n" + weekLines.join("\n") }],
    };
  }
);

// ── Tool: get_current_week_status ─────────────────────────────────────────────

server.tool(
  "get_current_week_status",
  "Snabb status för aktuell vecka: vad som är gjort, vad som återstår, hur det ser ut mot planen.",
  {},
  async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const mondayStr = monday.toISOString().slice(0, 10);
    const sundayStr = new Date(monday.getTime() + 6 * 86400000).toISOString().slice(0, 10);

    const actResult = await db.execute({
      sql: `SELECT name, distance, moving_time, average_speed, average_heartrate,
                   total_elevation_gain, start_date, suffer_score, type
            FROM activities
            WHERE date(start_date) >= ? AND date(start_date) <= ?
            ORDER BY start_date`,
      args: [mondayStr, sundayStr],
    });

    const activities = toObjects(actResult as any);
    const runs = activities.filter((a) => a.type === "Run");
    const gym = activities.filter((a) => a.type === "WeightTraining");

    const totalKm = runs.reduce((s, r) => s + Number(r.distance ?? 0), 0) / 1000;
    const totalTime = runs.reduce((s, r) => s + Number(r.moving_time ?? 0), 0);

    const planResult = await db.execute({
      sql: `SELECT tp.*, tw.week_number, tw.target_volume_km, tw.long_run_km,
                   tw.back_to_back, tw.phase
            FROM training_plans tp
            JOIN training_weeks tw ON tw.plan_id = tp.id
            WHERE tp.active = 1 AND tw.start_date = ?
            LIMIT 1`,
      args: [mondayStr],
    });

    const planRows = toObjects(planResult as any);
    const plan = planRows[0];

    const lines: string[] = [
      `## Status denna vecka (${mondayStr} – ${sundayStr})`,
      "",
      `**Löpning:** ${totalKm.toFixed(1)} km på ${runs.length} löpturer, ${secondsToHms(totalTime)}`,
    ];

    if (gym.length > 0) lines.push(`**Gym:** ${gym.length} pass`);

    if (runs.length > 0) {
      lines.push("", "**Löpturer:**");
      runs.forEach((r) => {
        const date = String(r.start_date ?? "?").slice(0, 10);
        const km = r.distance ? (Number(r.distance) / 1000).toFixed(1) : "?";
        const pace = r.average_speed ? mpsToMinPerKm(Number(r.average_speed)) : "–";
        const hr = r.average_heartrate ? `${Math.round(Number(r.average_heartrate))} bpm` : "–";
        lines.push(`  • ${date}: ${r.name} — ${km} km @ ${pace}, puls: ${hr}`);
      });
    }

    if (plan) {
      const target = Number(plan.target_volume_km);
      const remaining = Math.max(0, target - totalKm);
      const pct = target > 0 ? Math.round((totalKm / target) * 100) : 0;
      lines.push(
        "",
        `**Planvecka v${plan.week_number} (${plan.phase}):**`,
        `  Mål: ${target.toFixed(1)} km | Gjort: ${totalKm.toFixed(1)} km (${pct}%)`,
        `  Återstår: ${remaining.toFixed(1)} km | Långpass mål: ${plan.long_run_km} km`
      );
      if (plan.back_to_back) lines.push("  Back-to-back helg planerad!");
    } else {
      lines.push("\n_Ingen aktiv träningsplan._");
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ── Tool: get_personal_records ────────────────────────────────────────────────

server.tool(
  "get_personal_records",
  "Hämta personliga rekord: längsta löptur, snabbaste tempo, mest elevation, längsta tid. Också top-N för varje kategori.",
  {
    top_n: z.number().min(1).max(10).default(3).describe("Visa top N för varje rekordkategori"),
  },
  async ({ top_n }) => {
    const q = (orderBy: string, extra = "") =>
      db.execute({
        sql: `SELECT name, distance, moving_time, average_speed, total_elevation_gain,
                     suffer_score, start_date
              FROM activities
              WHERE type = 'Run' ${extra}
              ORDER BY ${orderBy} DESC LIMIT ?`,
        args: [top_n],
      });

    const [longest, fastest, elevation, time, suffer] = await Promise.all([
      q("distance", "AND distance IS NOT NULL"),
      q("average_speed", "AND average_speed IS NOT NULL AND distance >= 3000"),
      q("total_elevation_gain", "AND total_elevation_gain IS NOT NULL"),
      q("moving_time", "AND moving_time IS NOT NULL"),
      q("suffer_score", "AND suffer_score IS NOT NULL"),
    ]);

    const fmt = (result: any, fn: (r: any) => string) =>
      toObjects(result).map((r, i) => `  ${i + 1}. ${r.name} (${String(r.start_date).slice(0, 10)}): ${fn(r)}`).join("\n");

    const text = [
      "## Personliga rekord",
      "",
      "### Längsta löpturer",
      fmt(longest, (r) => `${(Number(r.distance) / 1000).toFixed(1)} km (${secondsToHms(Number(r.moving_time))})`),
      "",
      "### Snabbaste tempo (min/km)",
      fmt(fastest, (r) => `${mpsToMinPerKm(Number(r.average_speed))} på ${(Number(r.distance) / 1000).toFixed(1)} km`),
      "",
      "### Mest elevation",
      fmt(elevation, (r) => `${Math.round(Number(r.total_elevation_gain))} m ↑ (${(Number(r.distance) / 1000).toFixed(1)} km)`),
      "",
      "### Längsta tid",
      fmt(time, (r) => `${secondsToHms(Number(r.moving_time))} (${(Number(r.distance) / 1000).toFixed(1)} km)`),
      "",
      "### Högst suffer score",
      fmt(suffer, (r) => `${Math.round(Number(r.suffer_score))} (${(Number(r.distance) / 1000).toFixed(1)} km)`),
    ].join("\n");

    return { content: [{ type: "text", text }] };
  }
);

// ── Tool: search_activities ───────────────────────────────────────────────────

server.tool(
  "search_activities",
  "Sök och filtrera aktiviteter på datum, distans, typ eller namn.",
  {
    from_date: z.string().optional().describe("Från datum (YYYY-MM-DD)"),
    to_date: z.string().optional().describe("Till datum (YYYY-MM-DD)"),
    type: z.string().optional().describe("Aktivitetstyp (t.ex. Run, WeightTraining)"),
    min_distance_km: z.number().optional().describe("Minsta distans i km"),
    max_distance_km: z.number().optional().describe("Största distans i km"),
    name_contains: z.string().optional().describe("Namn innehåller (skiftlägesokänslig)"),
    limit: z.number().min(1).max(200).default(50),
  },
  async ({ from_date, to_date, type, min_distance_km, max_distance_km, name_contains, limit }) => {
    const conditions: string[] = ["1=1"];
    const args: (string | number)[] = [];

    if (from_date) { conditions.push("date(start_date) >= ?"); args.push(from_date); }
    if (to_date) { conditions.push("date(start_date) <= ?"); args.push(to_date); }
    if (type) { conditions.push("type = ?"); args.push(type); }
    if (min_distance_km) { conditions.push("distance >= ?"); args.push(min_distance_km * 1000); }
    if (max_distance_km) { conditions.push("distance <= ?"); args.push(max_distance_km * 1000); }
    if (name_contains) { conditions.push("name LIKE ?"); args.push(`%${name_contains}%`); }
    args.push(limit);

    const result = await db.execute({
      sql: `SELECT name, type, distance, moving_time, average_speed,
                   average_heartrate, total_elevation_gain, start_date, suffer_score
            FROM activities
            WHERE ${conditions.join(" AND ")}
            ORDER BY start_date DESC
            LIMIT ?`,
      args,
    });

    const rows = toObjects(result as any);

    if (rows.length === 0) {
      return { content: [{ type: "text", text: "Inga aktiviteter matchar sökningen." }] };
    }

    const lines = rows.map((r, i) => {
      const date = String(r.start_date ?? "?").slice(0, 10);
      const dist = r.distance ? (Number(r.distance) / 1000).toFixed(1) + " km" : "–";
      const pace = r.average_speed ? mpsToMinPerKm(Number(r.average_speed)) : "–";
      const hr = r.average_heartrate ? `${Math.round(Number(r.average_heartrate))} bpm` : "";
      const elev = r.total_elevation_gain ? `, ${Math.round(Number(r.total_elevation_gain))}m ↑` : "";
      return `${i + 1}. [${date}] ${r.type}: ${r.name} — ${dist} @ ${pace}${hr ? ", " + hr : ""}${elev}`;
    });

    return {
      content: [{ type: "text", text: `## Sökresultat (${rows.length} aktiviteter)\n\n${lines.join("\n")}` }],
    };
  }
);

// ── Tool: get_acwr ────────────────────────────────────────────────────────────

server.tool(
  "get_acwr",
  "Beräkna Acute:Chronic Workload Ratio (ACWR). Mäter träningsbelastning: akut (7 dagar) vs kronisk (28 dagar). Grön zon: 0.8–1.3.",
  {},
  async () => {
    const today = new Date().toISOString().slice(0, 10);

    const result = await db.execute({
      sql: `SELECT date(start_date) AS day, SUM(distance) / 1000.0 AS km
            FROM activities
            WHERE type = 'Run'
              AND date(start_date) >= date(?, '-28 days')
              AND date(start_date) <= ?
            GROUP BY day
            ORDER BY day`,
      args: [today, today],
    });

    const rows = toObjects(result as any) as { day: string; km: number }[];
    const byDay = new Map(rows.map((r) => [r.day, Number(r.km)]));

    let acute = 0;
    let chronic = 0;
    for (let i = 0; i < 28; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const km = byDay.get(ds) ?? 0;
      if (i < 7) acute += km;
      chronic += km;
    }

    const chronicAvg = chronic / 4;
    const acwr = chronicAvg > 0 ? acute / chronicAvg : 0;

    let zone = "grön ✅";
    let advice = "Bra träningsbelastning.";
    if (acwr < 0.6) { zone = "röd 🔴 (för låg)"; advice = "Väldigt låg belastning — risk för dekonditionering."; }
    else if (acwr < 0.8) { zone = "gul ⚠️ (låg)"; advice = "Något låg belastning — öka försiktigt."; }
    else if (acwr > 1.5) { zone = "röd 🔴 (för hög)"; advice = "Hög belastning — vila prioriteras för att undvika skada."; }
    else if (acwr > 1.3) { zone = "gul ⚠️ (hög)"; advice = "Något hög belastning — kör försiktigt och prioritera sömn."; }

    return {
      content: [{
        type: "text", text: [
          "## ACWR — Acute:Chronic Workload Ratio", "",
          `Akut (senaste 7 dagarna): ${acute.toFixed(1)} km`,
          `Kronisk (snitt 28 dagar / vecka): ${chronicAvg.toFixed(1)} km/vecka`,
          `**ACWR: ${acwr.toFixed(2)} — Zon: ${zone}**`, "",
          advice,
        ].join("\n"),
      }],
    };
  }
);

// ── Tool: get_run_splits ──────────────────────────────────────────────────────

server.tool(
  "get_run_splits",
  "Hämta km-splittar för en specifik löptur (för taktik- och tempoanalys).",
  {
    activity_name: z.string().describe("Del av aktivitetens namn att söka på"),
    date: z.string().optional().describe("Datum (YYYY-MM-DD) för att begränsa sökningen"),
  },
  async ({ activity_name, date }) => {
    const args: (string | number)[] = [`%${activity_name}%`];
    if (date) args.push(date);

    const result = await db.execute({
      sql: `SELECT name, start_date, distance, splits, average_speed
            FROM activities
            WHERE name LIKE ?
              ${date ? "AND date(start_date) = ?" : ""}
            ORDER BY start_date DESC
            LIMIT 1`,
      args,
    });

    const rows = toObjects(result as any);
    const row = rows[0];

    if (!row) return { content: [{ type: "text", text: "Hittade ingen matchande aktivitet." }] };
    if (!row.splits) return { content: [{ type: "text", text: `${row.name} (${String(row.start_date).slice(0, 10)}) — inga split-data lagrade.` }] };

    let splits: any[];
    try {
      splits = JSON.parse(String(row.splits));
    } catch {
      return { content: [{ type: "text", text: "Kunde inte läsa split-data." }] };
    }

    const splitLines = splits.map((s: any, i: number) => {
      const pace = s.average_speed ? mpsToMinPerKm(s.average_speed) : "–";
      const hr = s.average_heartrate ? `${Math.round(s.average_heartrate)} bpm` : "–";
      const elev = s.elevation_difference != null ? `${s.elevation_difference > 0 ? "+" : ""}${Math.round(s.elevation_difference)}m` : "";
      return `  km ${i + 1}: ${pace}${hr !== "–" ? ", puls: " + hr : ""}${elev ? ", elev: " + elev : ""}`;
    });

    return {
      content: [{
        type: "text", text: [
          `## Splittar: ${row.name} (${String(row.start_date).slice(0, 10)})`,
          `Distans: ${(Number(row.distance) / 1000).toFixed(1)} km | Snitt: ${mpsToMinPerKm(Number(row.average_speed))}`,
          "", ...splitLines,
        ].join("\n"),
      }],
    };
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Strava MCP server igång (Turso) — lyssnar på stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
