"use client";

import { useEffect, useState } from "react";

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
  start_date: string;
  starting_volume_km: number;
  peak_volume_km: number;
  total_weeks: number;
  build_increment: number;
  recovery_factor: number;
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

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("sv-SE", {
    month: "short",
    day: "numeric",
  });
}

function getCurrentWeekIndex(weeks: PlanWeek[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < weeks.length; i++) {
    const start = new Date(weeks[i].start_date + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    if (today >= start && today < end) return i;
  }
  return -1;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TrainingPlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [weeks, setWeeks] = useState<PlanWeek[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("2026-08-18");
  const [raceDistance, setRaceDistance] = useState("90");
  const [startingVolume, setStartingVolume] = useState("26");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPlan() {
    const res = await fetch("/api/training-plan");
    if (res.ok) {
      const data = await res.json();
      setPlan(data.plan);
      setWeeks(data.weeks || []);
    }
    setLoading(false);
  }

  useEffect(() => { loadPlan(); }, []);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/training-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceName: raceName || undefined,
          raceDate,
          raceDistanceKm: Number(raceDistance),
          startingVolumeKm: Number(startingVolume),
        }),
      });
      if (res.ok) {
        await loadPlan();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create plan");
      }
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!plan) return;
    await fetch("/api/training-plan", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id }),
    });
    setPlan(null);
    setWeeks([]);
  }

  if (loading) {
    return (
      <main style={{ ...pageStyle, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p style={{ color: "#888" }}>Loading...</p>
      </main>
    );
  }

  // ── No plan yet → show setup form ──
  if (!plan) {
    return (
      <main style={pageStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0 }}>Training Plan</h1>
          <a href="/dashboard" style={{ color: "#fc4c02", textDecoration: "none", fontSize: "0.9rem" }}>&larr; Dashboard</a>
        </div>

        <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "24px", maxWidth: "500px" }}>
          <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, marginTop: 0, marginBottom: "16px" }}>
            Set Up Your Race Plan
          </h2>
          <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "20px" }}>
            Enter your race details and current fitness. The plan uses progressive periodization
            with volume-dependent increases (scaling down as volume grows), dynamic recovery cycles,
            long run planning, and a 3-week taper.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={labelStyle}>
              Race Name (optional)
              <input type="text" value={raceName} onChange={(e) => setRaceName(e.target.value)} placeholder="e.g. Ultravasan 90" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Race Date
              <input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Race Distance (km)
              <input type="number" value={raceDistance} onChange={(e) => setRaceDistance(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Current Weekly Volume (km)
              <input type="number" value={startingVolume} onChange={(e) => setStartingVolume(e.target.value)} style={inputStyle} />
            </label>
          </div>

          {error && <p style={{ color: "#ff6b6b", fontSize: "0.85rem", marginTop: "12px" }}>{error}</p>}

          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              backgroundColor: creating ? "#555" : "#fc4c02",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "12px 24px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: creating ? "not-allowed" : "pointer",
              marginTop: "20px",
              width: "100%",
            }}
          >
            {creating ? "Generating..." : "Generate Plan"}
          </button>
        </div>
      </main>
    );
  }

  // ── Plan exists → show overview ──
  const currentIdx = getCurrentWeekIndex(weeks);
  const currentWeek = currentIdx >= 0 ? weeks[currentIdx] : null;
  const maxTarget = Math.max(...weeks.map((w) => w.target_volume_km), 1);
  const maxActual = Math.max(...weeks.map((w) => w.actualVolumeKm), 1);
  const maxBar = Math.max(maxTarget, maxActual);
  const daysToRace = daysUntil(plan.race_date);
  const weeksToRace = Math.ceil(daysToRace / 7);

  // Count back-to-back weeks and peak long run
  const b2bWeekCount = weeks.filter((w) => w.back_to_back).length;
  const peakLongRun = Math.max(...weeks.map((w) => w.long_run_km), 0);

  return (
    <main style={pageStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0 }}>
          {plan.name}
        </h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a href="/dashboard" style={{ color: "#fc4c02", textDecoration: "none", fontSize: "0.9rem" }}>&larr; Dashboard</a>
          <button onClick={handleDelete} style={{ backgroundColor: "transparent", color: "#ff6b6b", border: "1px solid #ff6b6b", borderRadius: "4px", padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer" }}>
            Delete Plan
          </button>
        </div>
      </div>

      {/* Race countdown */}
      <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "16px 20px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase" }}>Race Day</span>
          <div style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600 }}>
            {plan.race_name || `${plan.race_distance_km}km Ultra`} &mdash;{" "}
            {new Date(plan.race_date + "T00:00:00").toLocaleDateString("sv-SE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#fc4c02", fontSize: "1.8rem", fontWeight: 700 }}>{daysToRace}</div>
          <div style={{ color: "#888", fontSize: "0.75rem" }}>days to go</div>
        </div>
      </div>

      {/* Current week card */}
      {currentWeek && (
        <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "16px 20px", marginBottom: "1.5rem", borderLeft: `4px solid ${PHASE_COLORS[currentWeek.phase]}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
            <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>
              Week {currentWeek.week_number} &mdash; {PHASE_LABELS[currentWeek.phase]}
            </h2>
            <span style={{ color: "#888", fontSize: "0.8rem" }}>
              {currentWeek.cycle_number ? `Cycle ${currentWeek.cycle_number}, W${currentWeek.week_in_cycle}` : ""} &middot; {weeksToRace} weeks to race
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: currentWeek.back_to_back ? "1fr 1fr 1fr 1fr 1fr" : "1fr 1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px" }}>Target</div>
              <div style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 700 }}>{currentWeek.target_volume_km} km</div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px" }}>Actual</div>
              <div style={{ color: currentWeek.actualVolumeKm >= currentWeek.target_volume_km ? "#4ecdc4" : "#fff", fontSize: "1.3rem", fontWeight: 700 }}>
                {currentWeek.actualVolumeKm} km
              </div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px" }}>Remaining</div>
              <div style={{ color: "#fc4c02", fontSize: "1.3rem", fontWeight: 700 }}>
                {Math.max(0, Math.round((currentWeek.target_volume_km - currentWeek.actualVolumeKm) * 10) / 10)} km
              </div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px" }}>Long Run</div>
              <div style={{ color: "#f0ad4e", fontSize: "1.3rem", fontWeight: 700 }}>
                {currentWeek.long_run_km > 0 ? `${currentWeek.long_run_km} km` : "—"}
              </div>
            </div>
            {currentWeek.back_to_back ? (
              <div>
                <div style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "4px" }}>Back-to-Back</div>
                <div style={{ color: "#ff6b6b", fontSize: "1.3rem", fontWeight: 700 }}>
                  {Math.round(currentWeek.long_run_km * 0.6 * 10) / 10} km
                </div>
                <div style={{ color: "#666", fontSize: "0.65rem" }}>day 2 (Sat+Sun)</div>
              </div>
            ) : null}
          </div>
          {/* Progress bar */}
          <div style={{ backgroundColor: "#222", borderRadius: "4px", height: "8px", marginTop: "12px", overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, (currentWeek.actualVolumeKm / currentWeek.target_volume_km) * 100)}%`,
              height: "100%",
              backgroundColor: currentWeek.actualVolumeKm >= currentWeek.target_volume_km ? "#4ecdc4" : PHASE_COLORS[currentWeek.phase],
              borderRadius: "4px",
              transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {/* Plan stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "1.5rem" }}>
        {[
          { label: "Start Volume", value: `${plan.starting_volume_km} km` },
          { label: "Peak Volume", value: `${plan.peak_volume_km} km` },
          { label: "Peak Long Run", value: `${peakLongRun} km` },
          { label: "B2B Weekends", value: String(b2bWeekCount) },
          { label: "Total Weeks", value: String(plan.total_weeks) },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: "#141414", borderRadius: "8px", padding: "12px" }}>
            <div style={{ color: "#888", fontSize: "0.65rem", textTransform: "uppercase", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Volume chart: target vs actual + long run overlay */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>Volume Plan</h2>
        <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "20px", overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "220px", minWidth: `${weeks.length * 28}px` }}>
            {weeks.map((w, i) => {
              const targetH = (w.target_volume_km / maxBar) * 180;
              const actualH = (w.actualVolumeKm / maxBar) * 180;
              const longRunH = (w.long_run_km / maxBar) * 180;
              const isCurrent = i === currentIdx;
              return (
                <div key={w.week_number} style={{ flex: "0 0 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", position: "relative" }}>
                  {/* Back-to-back marker */}
                  {w.back_to_back ? (
                    <div style={{ position: "absolute", top: "-16px", fontSize: "0.55rem", color: "#ff6b6b", fontWeight: 700 }}>B2B</div>
                  ) : null}
                  {/* Target bar (ghost) */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    width: "20px",
                    height: `${Math.max(targetH, 2)}px`,
                    backgroundColor: "transparent",
                    border: `1px solid ${PHASE_COLORS[w.phase]}40`,
                    borderRadius: "2px 2px 0 0",
                    opacity: 0.5,
                  }} />
                  {/* Long run indicator line */}
                  {w.long_run_km > 0 && (
                    <div style={{
                      position: "absolute",
                      bottom: `${longRunH}px`,
                      width: "20px",
                      height: "0",
                      borderTop: "2px dashed #f0ad4e50",
                    }} />
                  )}
                  {/* Actual bar */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    width: "14px",
                    height: `${Math.max(actualH, 0)}px`,
                    backgroundColor: w.actualVolumeKm >= w.target_volume_km ? "#4ecdc4" : PHASE_COLORS[w.phase],
                    borderRadius: "2px 2px 0 0",
                    opacity: isCurrent ? 1 : 0.7,
                  }} />
                  {/* Current week marker */}
                  {isCurrent && (
                    <div style={{ position: "absolute", top: w.back_to_back ? "-28px" : "-14px", fontSize: "0.6rem", color: "#fc4c02", fontWeight: 700 }}>NOW</div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Week labels - show every 4th */}
          <div style={{ display: "flex", gap: "3px", marginTop: "6px", minWidth: `${weeks.length * 28}px` }}>
            {weeks.map((w, i) => (
              <div key={w.week_number} style={{ flex: "0 0 24px", textAlign: "center" }}>
                {i % 4 === 0 && (
                  <span style={{ color: "#555", fontSize: "0.55rem" }}>{formatDate(w.start_date)}</span>
                )}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>
            {Object.entries(PHASE_COLORS).map(([phase, color]) => (
              <div key={phase} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "10px", height: "10px", backgroundColor: color, borderRadius: "2px" }} />
                <span style={{ color: "#888", fontSize: "0.7rem" }}>{PHASE_LABELS[phase]}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "10px", height: "10px", backgroundColor: "#4ecdc4", borderRadius: "2px" }} />
              <span style={{ color: "#888", fontSize: "0.7rem" }}>Target met</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "16px", borderTop: "2px dashed #f0ad4e50" }} />
              <span style={{ color: "#888", fontSize: "0.7rem" }}>Long run</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#ff6b6b", fontSize: "0.6rem", fontWeight: 700 }}>B2B</span>
              <span style={{ color: "#888", fontSize: "0.7rem" }}>Back-to-back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week-by-week table */}
      <div>
        <h2 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>Week by Week</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "46px 80px 68px 65px 70px 65px 55px 55px 45px 1fr",
            padding: "8px 12px",
            color: "#888",
            fontSize: "0.62rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            <span>Week</span>
            <span>Dates</span>
            <span>Phase</span>
            <span>Target</span>
            <span>Long Run</span>
            <span>Actual</span>
            <span>Runs</span>
            <span>Gym</span>
            <span>B2B</span>
            <span>Progress</span>
          </div>
          {weeks.map((w, i) => {
            const pct = w.target_volume_km > 0 ? (w.actualVolumeKm / w.target_volume_km) * 100 : 0;
            const isCurrent = i === currentIdx;
            const isPast = !isCurrent && new Date(w.start_date + "T00:00:00") < new Date();
            return (
              <div
                key={w.week_number}
                style={{
                  display: "grid",
                  gridTemplateColumns: "46px 80px 68px 65px 70px 65px 55px 55px 45px 1fr",
                  padding: "8px 12px",
                  backgroundColor: isCurrent ? "#1a1a2e" : "#141414",
                  borderRadius: "6px",
                  borderLeft: isCurrent ? `3px solid ${PHASE_COLORS[w.phase]}` : "3px solid transparent",
                  alignItems: "center",
                  opacity: isPast && pct === 0 ? 0.4 : 1,
                }}
              >
                <span style={{ color: isCurrent ? "#fff" : "#888", fontSize: "0.8rem", fontWeight: isCurrent ? 700 : 400 }}>
                  {w.week_number}
                </span>
                <span style={{ color: "#999", fontSize: "0.72rem" }}>{formatDate(w.start_date)}</span>
                <span style={{ color: PHASE_COLORS[w.phase], fontSize: "0.72rem", fontWeight: 600 }}>
                  {PHASE_LABELS[w.phase]}
                </span>
                <span style={{ color: "#ccc", fontSize: "0.8rem" }}>{w.target_volume_km} km</span>
                <span style={{ color: w.long_run_km > 0 ? "#f0ad4e" : "#333", fontSize: "0.8rem", fontWeight: w.long_run_km > 0 ? 600 : 400 }}>
                  {w.long_run_km > 0 ? `${w.long_run_km} km` : "—"}
                </span>
                <span style={{ color: w.actualVolumeKm > 0 ? (pct >= 90 ? "#4ecdc4" : "#fff") : "#333", fontSize: "0.8rem", fontWeight: 600 }}>
                  {w.actualVolumeKm > 0 ? `${w.actualVolumeKm} km` : "—"}
                </span>
                <span style={{ color: "#888", fontSize: "0.75rem" }}>{w.runCount > 0 ? w.runCount : "—"}</span>
                <span style={{ color: "#888", fontSize: "0.75rem" }}>{w.gymCount > 0 ? w.gymCount : "—"}</span>
                <span style={{ color: w.back_to_back ? "#ff6b6b" : "#333", fontSize: "0.7rem", fontWeight: w.back_to_back ? 700 : 400 }}>
                  {w.back_to_back ? "✓" : "—"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ flex: 1, backgroundColor: "#222", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(pct, 100)}%`,
                      height: "100%",
                      backgroundColor: pct >= 90 ? "#4ecdc4" : PHASE_COLORS[w.phase],
                      borderRadius: "3px",
                    }} />
                  </div>
                  {w.actualVolumeKm > 0 && (
                    <span style={{ color: pct >= 90 ? "#4ecdc4" : "#888", fontSize: "0.7rem", minWidth: "32px" }}>
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan methodology note */}
      <div style={{ backgroundColor: "#141414", borderRadius: "10px", padding: "16px 20px", marginTop: "1.5rem" }}>
        <h3 style={{ color: "#888", fontSize: "0.8rem", fontWeight: 600, marginTop: 0, marginBottom: "8px", textTransform: "uppercase" }}>Plan Details</h3>
        <div style={{ color: "#666", fontSize: "0.78rem", lineHeight: 1.5 }}>
          <p style={{ margin: "0 0 6px 0" }}>
            <strong style={{ color: "#999" }}>Volume increases:</strong> Scale down as volume grows — 10% at low volumes, 8% mid-range, 6% at 45-60km, 4% above 60km. Max +5km/week.
          </p>
          <p style={{ margin: "0 0 6px 0" }}>
            <strong style={{ color: "#999" }}>Recovery cycles:</strong> 3:1 (3 build + 1 recovery) under 60km/week, switching to 2:1 (2 build + 1 recovery) above 60km. Recovery at 65% of peak.
          </p>
          <p style={{ margin: "0 0 6px 0" }}>
            <strong style={{ color: "#999" }}>Long runs:</strong> 28-35% of weekly volume, scaling up with fitness. Capped at ~{Math.round(plan.race_distance_km * 0.55)}km (55% of race distance).
          </p>
          <p style={{ margin: "0 0 6px 0" }}>
            <strong style={{ color: "#999" }}>Back-to-back weekends:</strong> Saturday long run + Sunday at ~60% of long run distance. Introduced at 50+km/week, 10-12 weeks before race.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "#999" }}>Taper:</strong> 3 weeks — 70% → 55% → 35% of peak volume.
          </p>
        </div>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: "1040px",
  margin: "0 auto",
  padding: "2rem 1rem",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const labelStyle: React.CSSProperties = {
  color: "#ccc",
  fontSize: "0.85rem",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const inputStyle: React.CSSProperties = {
  backgroundColor: "#222",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: "6px",
  padding: "10px 12px",
  fontSize: "0.9rem",
};
