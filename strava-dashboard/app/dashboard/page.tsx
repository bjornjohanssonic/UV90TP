"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Activity {
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
}

interface PlanWeek {
  week_number: number;
  start_date: string;
  target_volume_km: number;
  long_run_km: number;
  back_to_back: number;
  phase: string;
  cycle_number: number | null;
  week_in_cycle: number | null;
  actualVolumeKm: number;
  runCount: number;
  gymCount: number;
}

interface Plan {
  id: number;
  name: string;
  race_name: string | null;
  race_date: string;
  race_distance_km: number;
  peak_volume_km: number;
}

interface WeekData {
  weekStart: string;
  weekLabel: string;
  totalDistance: number;
  totalTime: number;
  runs: number;
  avgPace: number;
  longestRun: number;
  totalElevation: number;
}

interface PersonalRecord {
  label: string;
  value: string;
  activity: string;
  date: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatKm(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPace(meters: number, seconds: number): string {
  if (meters === 0) return "-";
  const pace = seconds / (meters / 1000);
  const m = Math.floor(pace / 60);
  const s = Math.round(pace % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" });
}

function weekLabel(mondayStr: string): string {
  const mon = new Date(mondayStr);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return `${mon.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })} – ${sun.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}`;
}

function getDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

const PHASE_COLORS: Record<string, string> = {
  build: "#fc4c02",
  recovery: "#a78bfa",
  taper: "#f0ad4e",
  race: "#4ecdc4",
};

const PHASE_LABELS: Record<string, string> = {
  build: "Build",
  recovery: "Recovery",
  taper: "Taper",
  race: "Race Week",
};

// ─── Weekly aggregation ─────────────────────────────────────────────────────

function aggregateWeeks(activities: Activity[]): WeekData[] {
  const runs = activities.filter((a) => a.type === "Run");
  const weekMap = new Map<string, Activity[]>();

  for (const run of runs) {
    const monday = getMonday(new Date(run.start_date));
    const key = monday.toISOString().slice(0, 10);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(run);
  }

  const weeks: WeekData[] = [];
  for (const [mondayKey, acts] of weekMap) {
    const totalDistance = acts.reduce((s, a) => s + a.distance, 0);
    const totalTime = acts.reduce((s, a) => s + a.moving_time, 0);
    const longestRun = Math.max(...acts.map((a) => a.distance));
    const totalElevation = acts.reduce((s, a) => s + a.total_elevation_gain, 0);
    weeks.push({
      weekStart: mondayKey,
      weekLabel: weekLabel(mondayKey),
      totalDistance,
      totalTime,
      runs: acts.length,
      avgPace: totalDistance > 0 ? totalTime / (totalDistance / 1000) : 0,
      longestRun,
      totalElevation,
    });
  }

  weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return weeks;
}

// ─── Personal Records ───────────────────────────────────────────────────────

function computePRs(activities: Activity[]): PersonalRecord[] {
  const runs = activities.filter((a) => a.type === "Run" && a.distance > 0);
  if (runs.length === 0) return [];

  const prs: PersonalRecord[] = [];

  const longest = runs.reduce((best, r) => (r.distance > best.distance ? r : best), runs[0]);
  prs.push({ label: "Longest Run", value: `${formatKm(longest.distance)} km`, activity: longest.name, date: formatDate(longest.start_date) });

  const paceRuns = runs.filter((r) => r.distance >= 1000);
  if (paceRuns.length > 0) {
    const fastest = paceRuns.reduce((best, r) => {
      const pace = r.moving_time / (r.distance / 1000);
      const bestPace = best.moving_time / (best.distance / 1000);
      return pace < bestPace ? r : best;
    }, paceRuns[0]);
    prs.push({ label: "Fastest Pace", value: `${formatPace(fastest.distance, fastest.moving_time)} /km`, activity: fastest.name, date: formatDate(fastest.start_date) });
  }

  const highestElev = runs.reduce((best, r) => r.total_elevation_gain > best.total_elevation_gain ? r : best, runs[0]);
  if (highestElev.total_elevation_gain > 0) {
    prs.push({ label: "Most Elevation", value: `${Math.round(highestElev.total_elevation_gain)} m`, activity: highestElev.name, date: formatDate(highestElev.start_date) });
  }

  const longestTime = runs.reduce((best, r) => r.moving_time > best.moving_time ? r : best, runs[0]);
  prs.push({ label: "Longest Time", value: formatTime(longestTime.moving_time), activity: longestTime.name, date: formatDate(longestTime.start_date) });

  const hrRuns = runs.filter((r) => r.max_heartrate);
  if (hrRuns.length > 0) {
    const maxHr = hrRuns.reduce((best, r) => (r.max_heartrate || 0) > (best.max_heartrate || 0) ? r : best, hrRuns[0]);
    prs.push({ label: "Max Heart Rate", value: `${Math.round(maxHr.max_heartrate!)} bpm`, activity: maxHr.name, date: formatDate(maxHr.start_date) });
  }

  return prs;
}

// ─── Suggestions (plan-aware) ───────────────────────────────────────────────

interface Suggestion {
  emoji: string;
  title: string;
  detail: string;
  color: string;
}

function generateSuggestions(
  currentWeek: WeekData | undefined,
  weeks: WeekData[],
  activities: Activity[],
  planWeek: PlanWeek | null
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const dayOfWeek = getDayOfWeek();
  const daysLeft = 7 - dayOfWeek;
  const runs = activities.filter((a) => a.type === "Run");

  // Average pace from last 4 weeks
  const recentWeeks = weeks.slice(0, 4).filter((w) => w.runs > 0);
  const avgPace4w = recentWeeks.length > 0
    ? recentWeeks.reduce((s, w) => s + w.avgPace, 0) / recentWeeks.length
    : 0;
  const paceStr = avgPace4w > 0 ? formatPace(1000, avgPace4w) : "easy";

  // Consecutive run days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let consecutiveDays = 0;
  const checkDate = new Date(today);
  for (let i = 0; i < 7; i++) {
    const dayStr = checkDate.toISOString().slice(0, 10);
    if (runs.some((r) => r.start_date.slice(0, 10) === dayStr)) {
      consecutiveDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }

  if (consecutiveDays >= 3) {
    suggestions.push({
      emoji: "\u{1F6CC}",
      title: "Rest day recommended",
      detail: `You've run ${consecutiveDays} days in a row. Recovery makes you stronger.`,
      color: "#a78bfa",
    });
  }

  // Plan-aware suggestions
  if (planWeek) {
    const remaining = planWeek.target_volume_km - planWeek.actualVolumeKm;

    if (planWeek.phase === "recovery") {
      suggestions.push({
        emoji: "\u{1F9D8}",
        title: "Recovery week \u2014 keep it easy",
        detail: `Target is ${planWeek.target_volume_km} km. Run at a comfortable ${paceStr} /km pace. No hard efforts.`,
        color: "#a78bfa",
      });
    } else if (planWeek.phase === "taper") {
      suggestions.push({
        emoji: "\u{1F3AF}",
        title: "Taper \u2014 trust your training",
        detail: `Only ${planWeek.target_volume_km} km this week. Keep runs short but maintain some intensity. You've done the work.`,
        color: "#f0ad4e",
      });
    } else if (planWeek.phase === "race") {
      suggestions.push({
        emoji: "\u{1F3C1}",
        title: "Race week!",
        detail: "Short easy shakeout runs only. Stay rested, hydrated, and trust your preparation.",
        color: "#4ecdc4",
      });
    } else if (remaining <= 0) {
      suggestions.push({
        emoji: "\u{1F389}",
        title: "Weekly target hit!",
        detail: `You've reached ${planWeek.target_volume_km} km. Any extra running should be easy effort.`,
        color: "#4ecdc4",
      });
    } else if (daysLeft > 0) {
      const perDay = remaining / daysLeft;
      suggestions.push({
        emoji: "\u{1F3C3}",
        title: `${remaining.toFixed(1)} km remaining this week`,
        detail: `Run ~${perDay.toFixed(1)} km on each of the ${daysLeft} remaining day${daysLeft > 1 ? "s" : ""} at ${paceStr} /km.`,
        color: "#fc4c02",
      });
    }

    // Long run suggestion
    if (planWeek.long_run_km > 0 && planWeek.phase !== "race") {
      const longestThisWeek = currentWeek ? currentWeek.longestRun / 1000 : 0;
      if (longestThisWeek < planWeek.long_run_km * 0.9) {
        suggestions.push({
          emoji: "\u{1F6E3}\u{FE0F}",
          title: `Long run: ${planWeek.long_run_km} km`,
          detail: planWeek.back_to_back
            ? `Back-to-back weekend: Sat ${planWeek.long_run_km} km + Sun ~${Math.round(planWeek.long_run_km * 0.6 * 10) / 10} km. Run at easy effort.`
            : `Plan your long run for the weekend at easy conversational pace.`,
          color: "#f0ad4e",
        });
      }
    }
  } else if (runs.length > 0) {
    suggestions.push({
      emoji: "\u{1F4CB}",
      title: "No training plan active",
      detail: "Set up a plan on the Training Plan page to get personalized weekly targets.",
      color: "#888",
    });
  }

  return suggestions;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planWeeks, setPlanWeeks] = useState<PlanWeek[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);
  const [syncCount, setSyncCount] = useState(0);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [showAllWeeks, setShowAllWeeks] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("athlete");
    if (id) {
      setAthleteId(id);
      localStorage.setItem("athleteId", id);
    } else {
      setAthleteId(localStorage.getItem("athleteId"));
    }
  }, []);

  const loadData = useCallback(async () => {
    const [actRes, planRes] = await Promise.all([
      fetch("/api/activities"),
      fetch("/api/training-plan"),
    ]);
    if (actRes.ok) setActivities(await actRes.json());
    if (planRes.ok) {
      const data = await planRes.json();
      setPlan(data.plan);
      setPlanWeeks(data.weeks || []);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSync() {
    if (!athleteId) {
      setSyncResult({ message: "No athlete ID found. Please reconnect with Strava.", type: "error" });
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    setSyncStatus("Connecting to Strava...");
    setSyncCount(0);

    try {
      const res = await fetch("/api/activities/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      });

      if (!res.body) {
        setSyncResult({ message: "Sync failed \u2014 no response stream.", type: "error" });
        setSyncing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataMatch = line.match(/^data: (.+)$/m);
          if (!dataMatch) continue;
          try {
            const event = JSON.parse(dataMatch[1]);
            if (event.type === "status") {
              setSyncStatus(event.message);
            } else if (event.type === "progress") {
              setSyncCount(event.total);
              setSyncStatus(`Syncing: ${event.total} activities (${event.latest?.name || ""})`);
            } else if (event.type === "rate_limit") {
              setSyncStatus(null);
              setSyncResult({ message: event.message, type: "warning" });
            } else if (event.type === "done") {
              setSyncStatus(null);
              setSyncResult({
                message: event.message,
                type: event.rateLimited ? "warning" : "success",
              });
              await loadData();
            } else if (event.type === "error") {
              setSyncStatus(null);
              setSyncResult({ message: event.message, type: "error" });
            }
          } catch { /* ignore parse errors */ }
        }
      }

      // Reload data after stream ends in case we missed the done event
      await loadData();
    } catch {
      setSyncResult({ message: "Sync failed \u2014 network error.", type: "error" });
    } finally {
      setSyncing(false);
      setSyncStatus(null);
    }
  }

  const weeks = aggregateWeeks(activities);
  const currentWeek = weeks.length > 0 ? weeks[0] : undefined;
  const prev4 = weeks.slice(1, 5);
  const prev4AvgDist = prev4.length > 0 ? prev4.reduce((s, w) => s + w.totalDistance, 0) / prev4.length : 0;
  const weekChange = prev4AvgDist > 0 && currentWeek ? ((currentWeek.totalDistance - prev4AvgDist) / prev4AvgDist) * 100 : 0;

  const runs = activities.filter((a) => a.type === "Run");
  const gymSessions = activities.filter((a) => a.type === "WeightTraining");

  // Current plan week
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentPlanWeek = planWeeks.find((w) => {
    const start = new Date(w.start_date + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return today >= start && today < end;
  }) || null;

  // Gym sessions this week
  const mondayStr = getMonday(today).toISOString().slice(0, 10);
  const sundayEnd = new Date(getMonday(today));
  sundayEnd.setDate(sundayEnd.getDate() + 7);
  const gymThisWeek = gymSessions.filter((a) => {
    const d = new Date(a.start_date);
    return d.toISOString().slice(0, 10) >= mondayStr && d < sundayEnd;
  });

  // Bar chart: last 8 weeks with plan targets
  const last8 = weeks.slice(0, 8).reverse();
  const last8Targets = last8.map((w) => {
    const pw = planWeeks.find((p) => p.start_date === w.weekStart);
    return pw ? pw.target_volume_km * 1000 : 0;
  });
  const maxDist = Math.max(...last8.map((w) => w.totalDistance), ...last8Targets, 1);

  const suggestions = generateSuggestions(currentWeek, weeks, activities, currentPlanWeek);
  const prs = computePRs(activities);

  const daysToRace = plan ? Math.ceil((new Date(plan.race_date + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <a href="/training-plan" style={{ color: "#fc4c02", border: "1px solid #fc4c02", borderRadius: "6px", padding: "8px 16px", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>
            Training Plan
          </a>
          <button onClick={handleSync} disabled={syncing} style={{ backgroundColor: syncing ? "#555" : "#fc4c02", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "0.9rem", fontWeight: 600, cursor: syncing ? "not-allowed" : "pointer" }}>
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Sync progress */}
      {syncing && syncStatus && (
        <div style={{ backgroundColor: "#1a1a2e", borderRadius: "8px", padding: "12px 16px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "14px", height: "14px", border: "2px solid #fc4c02", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ color: "#ccc", fontSize: "0.85rem" }}>{syncStatus}</span>
          {syncCount > 0 && <span style={{ color: "#888", fontSize: "0.8rem", marginLeft: "auto" }}>{syncCount} saved</span>}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {syncResult && (
        <p style={{
          color: syncResult.type === "error" ? "#ff6b6b" : syncResult.type === "warning" ? "#f0ad4e" : "#4ecdc4",
          marginBottom: "1rem",
          fontSize: "0.85rem",
        }}>{syncResult.message}</p>
      )}

      {activities.length === 0 && !syncing && (
        <p style={{ color: "#888", textAlign: "center", marginTop: "4rem" }}>No activities yet. Hit &quot;Sync&quot; to pull your data from Strava.</p>
      )}

      {activities.length > 0 && (
        <>
          {/* ── This Week Summary ── */}
          {currentWeek && (
            <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "20px", marginBottom: "1.5rem", borderLeft: currentPlanWeek ? `4px solid ${PHASE_COLORS[currentPlanWeek.phase]}` : "4px solid #fc4c02" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
                  This Week
                  {currentPlanWeek && (
                    <span style={{ color: PHASE_COLORS[currentPlanWeek.phase], fontSize: "0.8rem", fontWeight: 400, marginLeft: "8px" }}>
                      {PHASE_LABELS[currentPlanWeek.phase]}
                      {currentPlanWeek.cycle_number ? ` \u00B7 Cycle ${currentPlanWeek.cycle_number}` : ""}
                    </span>
                  )}
                </h2>
                <span style={{ color: weekChange >= 0 ? "#4ecdc4" : "#ff6b6b", fontSize: "0.85rem", fontWeight: 600 }}>
                  {weekChange >= 0 ? "+" : ""}{weekChange.toFixed(0)}% vs 4-wk avg
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: currentPlanWeek ? "repeat(7, 1fr)" : "repeat(5, 1fr)", gap: "16px" }}>
                {currentPlanWeek && (
                  <div>
                    <div style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Target</div>
                    <div style={{ color: PHASE_COLORS[currentPlanWeek.phase], fontSize: "1.15rem", fontWeight: 700 }}>{currentPlanWeek.target_volume_km} km</div>
                  </div>
                )}
                {currentPlanWeek && currentPlanWeek.long_run_km > 0 && (
                  <div>
                    <div style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Long Run</div>
                    <div style={{ color: "#f0ad4e", fontSize: "1.15rem", fontWeight: 700 }}>
                      {currentPlanWeek.long_run_km} km
                      {currentPlanWeek.back_to_back ? <span style={{ fontSize: "0.65rem", color: "#ff6b6b", marginLeft: "4px" }}>B2B</span> : null}
                    </div>
                  </div>
                )}
                {[
                  { label: "Distance", value: `${formatKm(currentWeek.totalDistance)} km` },
                  { label: "Time", value: formatTime(currentWeek.totalTime) },
                  { label: "Runs", value: String(currentWeek.runs) },
                  { label: "Avg Pace", value: `${formatPace(currentWeek.totalDistance, currentWeek.totalTime)} /km` },
                  { label: "Longest", value: `${formatKm(currentWeek.longestRun)} km` },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{stat.label}</div>
                    <div style={{ color: "#fff", fontSize: "1.15rem", fontWeight: 700 }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Target progress bar */}
              {currentPlanWeek && (
                <div style={{ backgroundColor: "#222", borderRadius: "4px", height: "6px", marginTop: "12px", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(100, (currentWeek.totalDistance / (currentPlanWeek.target_volume_km * 1000)) * 100)}%`,
                    height: "100%",
                    backgroundColor: currentWeek.totalDistance >= currentPlanWeek.target_volume_km * 1000 ? "#4ecdc4" : PHASE_COLORS[currentPlanWeek.phase],
                    borderRadius: "4px",
                    transition: "width 0.3s",
                  }} />
                </div>
              )}
            </div>
          )}

          {/* ── Race Countdown (if plan active) ── */}
          {plan && (
            <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "12px 20px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#999", fontSize: "0.85rem" }}>{plan.race_name || `${plan.race_distance_km}km Ultra`}</span>
              <span style={{ color: "#fc4c02", fontSize: "0.95rem", fontWeight: 700 }}>{daysToRace} days to race</span>
            </div>
          )}

          {/* ── Suggestions ── */}
          {suggestions.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>Suggestions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {suggestions.map((s, i) => (
                  <div key={i} style={{ backgroundColor: "#141414", borderRadius: "8px", padding: "14px 16px", borderLeft: `3px solid ${s.color}`, display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.3rem" }}>{s.emoji}</span>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>{s.title}</div>
                      <div style={{ color: "#999", fontSize: "0.85rem", marginTop: "2px" }}>{s.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Weekly Distance Chart ── */}
          {last8.length > 1 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>Weekly Distance</h2>
              <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "140px" }}>
                  {last8.map((w, i) => {
                    const height = (w.totalDistance / maxDist) * 120;
                    const targetH = last8Targets[i] > 0 ? (last8Targets[i] / maxDist) * 120 : 0;
                    const isCurrentWeek = i === last8.length - 1;
                    const metTarget = last8Targets[i] > 0 && w.totalDistance >= last8Targets[i];
                    return (
                      <div key={w.weekStart} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", position: "relative" }}>
                        <span style={{ color: "#ccc", fontSize: "0.65rem" }}>{formatKm(w.totalDistance)}</span>
                        {/* Target line */}
                        {targetH > 0 && (
                          <div style={{
                            position: "absolute",
                            bottom: `${targetH}px`,
                            width: "100%",
                            height: "1px",
                            borderTop: "2px dashed #555",
                          }} />
                        )}
                        <div style={{
                          width: "100%",
                          height: `${Math.max(height, 4)}px`,
                          backgroundColor: metTarget ? "#4ecdc4" : isCurrentWeek ? "#fc4c02" : "#333",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.3s",
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  {last8.map((w) => (
                    <div key={w.weekStart} style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ color: "#666", fontSize: "0.6rem" }}>{new Date(w.weekStart).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}</span>
                    </div>
                  ))}
                </div>
                {last8Targets.some((t) => t > 0) && (
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "16px", borderTop: "2px dashed #555" }} />
                      <span style={{ color: "#666", fontSize: "0.65rem" }}>Target</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "10px", height: "10px", backgroundColor: "#4ecdc4", borderRadius: "2px" }} />
                      <span style={{ color: "#666", fontSize: "0.65rem" }}>Target met</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Gym Sessions + PRs ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.5rem" }}>
            {/* Gym this week */}
            <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "16px" }}>
              <h2 style={{ color: "#fff", fontSize: "1rem", fontWeight: 600, marginBottom: "12px" }}>
                Gym This Week <span style={{ color: "#888", fontWeight: 400, fontSize: "0.8rem" }}>({gymThisWeek.length})</span>
              </h2>
              {gymThisWeek.length === 0 && <p style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}>No gym sessions yet.</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {gymThisWeek.map((g) => (
                  <div key={g.strava_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#ccc", fontSize: "0.8rem" }}>{g.name}</span>
                    <span style={{ color: "#888", fontSize: "0.8rem" }}>{formatTime(g.moving_time)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PRs */}
            <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "16px" }}>
              <h2 style={{ color: "#fff", fontSize: "1rem", fontWeight: 600, marginBottom: "12px" }}>Personal Records</h2>
              {prs.length === 0 && <p style={{ color: "#555", fontSize: "0.85rem" }}>No records yet.</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {prs.slice(0, 4).map((pr) => (
                  <div key={pr.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#999", fontSize: "0.8rem" }}>{pr.label}</span>
                    <span style={{ color: "#f0ad4e", fontSize: "0.85rem", fontWeight: 600 }}>{pr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Weekly Breakdown ── */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Weekly Breakdown</h2>
              {weeks.length > 4 && (
                <button onClick={() => setShowAllWeeks(!showAllWeeks)} style={{ backgroundColor: "transparent", color: "#fc4c02", border: "1px solid #fc4c02", borderRadius: "4px", padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer" }}>
                  {showAllWeeks ? "Show less" : `Show all ${weeks.length} weeks`}
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(showAllWeeks ? weeks : weeks.slice(0, 4)).map((w, i) => {
                const prevWeek = weeks[i + 1];
                const change = prevWeek && prevWeek.totalDistance > 0 ? ((w.totalDistance - prevWeek.totalDistance) / prevWeek.totalDistance) * 100 : 0;
                return (
                  <div key={w.weekStart} style={{ backgroundColor: "#141414", borderRadius: "8px", padding: "12px 16px", display: "grid", gridTemplateColumns: "160px 80px 60px 50px 70px 80px", alignItems: "center", gap: "8px", borderLeft: i === 0 ? "3px solid #fc4c02" : "3px solid transparent" }}>
                    <span style={{ color: i === 0 ? "#fff" : "#999", fontSize: "0.85rem", fontWeight: i === 0 ? 600 : 400 }}>{w.weekLabel}</span>
                    <span style={{ color: "#4ecdc4", fontSize: "0.9rem", fontWeight: 600 }}>{formatKm(w.totalDistance)} km</span>
                    <span style={{ color: "#ccc", fontSize: "0.8rem" }}>{formatTime(w.totalTime)}</span>
                    <span style={{ color: "#ccc", fontSize: "0.8rem" }}>{w.runs} run{w.runs !== 1 ? "s" : ""}</span>
                    <span style={{ color: "#ccc", fontSize: "0.8rem" }}>{formatPace(w.totalDistance, w.totalTime)} /km</span>
                    {prevWeek ? (
                      <span style={{ color: change >= 0 ? "#4ecdc4" : "#ff6b6b", fontSize: "0.8rem", textAlign: "right" }}>{change >= 0 ? "+" : ""}{change.toFixed(0)}%</span>
                    ) : (
                      <span style={{ color: "#333", fontSize: "0.8rem", textAlign: "right" }}>\u2014</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Recent Runs ── */}
          <div>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>Recent Runs</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 80px 70px 80px 60px", padding: "8px 14px", color: "#888", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #333" }}>
                <span>Date</span><span>Name</span><span>Distance</span><span>Time</span><span>Pace</span><span>HR</span>
              </div>
              {runs.slice(0, 20).map((act) => (
                <div key={act.strava_id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 80px 70px 80px 60px", padding: "10px 14px", backgroundColor: "#141414", borderBottom: "1px solid #1a1a1a", alignItems: "center" }}>
                  <span style={{ color: "#999", fontSize: "0.8rem" }}>{formatDate(act.start_date)}</span>
                  <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.name}</span>
                  <span style={{ color: "#4ecdc4", fontSize: "0.85rem", fontWeight: 600 }}>{formatKm(act.distance)} km</span>
                  <span style={{ color: "#ccc", fontSize: "0.8rem" }}>{formatTime(act.moving_time)}</span>
                  <span style={{ color: "#ccc", fontSize: "0.8rem" }}>{formatPace(act.distance, act.moving_time)} /km</span>
                  <span style={{ color: act.average_heartrate ? "#ff6b6b" : "#555", fontSize: "0.8rem" }}>{act.average_heartrate ? Math.round(act.average_heartrate) : "\u2014"}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ color: "#444", fontSize: "0.7rem", textAlign: "center", marginTop: "2rem" }}>
            {activities.length} activities cached &middot; {runs.length} runs &middot; {gymSessions.length} gym sessions
          </p>
        </>
      )}
    </main>
  );
}
