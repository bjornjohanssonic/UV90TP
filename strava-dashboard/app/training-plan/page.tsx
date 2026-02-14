"use client";

import { useEffect, useState } from "react";
import type { Plan, PlanWeek } from "@/types";
import { COLORS, PHASE_COLORS, PHASE_LABELS } from "@/lib/dashboard-helpers";

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
  const [raceDate, setRaceDate] = useState("2025-08-17");
  const [raceDistance, setRaceDistance] = useState("90");
  const [startingVolume, setStartingVolume] = useState("26");
  const [startingLongRun, setStartingLongRun] = useState("15");
  const [peakVolume, setPeakVolume] = useState("72.5");
  const [totalWeeks, setTotalWeeks] = useState("28");
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

  useEffect(() => {
    loadPlan();
  }, []);

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
          startingLongRunKm: Number(startingLongRun),
          peakVolumeKm: Number(peakVolume),
          totalWeeks: Number(totalWeeks),
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
      <main
        style={{ ...pageStyle, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}
      >
        <p style={{ color: COLORS.textMuted, fontSize: "0.95rem" }}>Loading...</p>
      </main>
    );
  }

  // ── No plan yet → show setup form ──
  if (!plan) {
    return (
      <main style={pageStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: COLORS.textDark, margin: 0 }}>Training Plan</h1>
          <a
            href="/dashboard"
            style={{
              color: COLORS.primaryGreen,
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
              padding: "8px 16px",
              border: `2px solid ${COLORS.primaryGreen}`,
              borderRadius: "8px",
            }}
          >
            &larr; Dashboard
          </a>
        </div>

        <div
          style={{
            backgroundColor: COLORS.cardAccent,
            borderRadius: "16px",
            padding: "28px",
            maxWidth: "550px",
            border: `3px solid ${COLORS.border}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{ color: COLORS.textDark, fontSize: "1.2rem", fontWeight: 700, marginTop: 0, marginBottom: "12px" }}
          >
            Set Up Your Race Plan
          </h2>
          <p style={{ color: COLORS.textMuted, fontSize: "0.88rem", marginBottom: "24px", lineHeight: 1.6 }}>
            Enter your race details and current fitness. The plan uses 28-week periodization with specific long run
            progression (15→25→35→40km), plateau phase (weeks 20-24), recovery every 4 weeks, and a 4-week taper.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={labelStyle}>
              Race Name (optional)
              <input
                type="text"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="e.g. Ultravasan 90"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Race Date
              <input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Race Distance (km)
              <input
                type="number"
                value={raceDistance}
                onChange={(e) => setRaceDistance(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Total Plan Weeks
              <input
                type="number"
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Current Weekly Volume (km)
              <input
                type="number"
                value={startingVolume}
                onChange={(e) => setStartingVolume(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Current Long Run (km)
              <input
                type="number"
                value={startingLongRun}
                onChange={(e) => setStartingLongRun(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Target Peak Volume (km)
              <input
                type="number"
                value={peakVolume}
                onChange={(e) => setPeakVolume(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          {error && (
            <p
              style={{
                color: COLORS.error,
                fontSize: "0.85rem",
                marginTop: "12px",
                padding: "10px 12px",
                backgroundColor: `${COLORS.error}15`,
                borderRadius: "8px",
                border: `1px solid ${COLORS.error}40`,
              }}
            >
              {error}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              backgroundColor: creating ? COLORS.textLight : COLORS.primaryGreen,
              color: COLORS.cardAccent,
              border: "none",
              borderRadius: "10px",
              padding: "14px 28px",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: creating ? "not-allowed" : "pointer",
              marginTop: "24px",
              width: "100%",
              boxShadow: creating ? "none" : "0 4px 12px rgba(0,0,0,0.15)",
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
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: COLORS.textDark, margin: 0 }}>{plan.name}</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href="/dashboard"
            style={{
              color: COLORS.primaryGreen,
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
              padding: "8px 16px",
              border: `2px solid ${COLORS.primaryGreen}`,
              borderRadius: "8px",
            }}
          >
            &larr; Dashboard
          </a>
          <button
            onClick={handleDelete}
            style={{
              backgroundColor: "transparent",
              color: COLORS.error,
              border: `2px solid ${COLORS.error}`,
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Delete Plan
          </button>
        </div>
      </div>

      {/* Race countdown */}
      <div
        style={{
          backgroundColor: COLORS.cardAccent,
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: `3px solid ${COLORS.warmGold}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div>
          <span
            style={{
              color: COLORS.textMuted,
              fontSize: "0.75rem",
              textTransform: "uppercase",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            Race Day
          </span>
          <div style={{ color: COLORS.textDark, fontSize: "1.15rem", fontWeight: 700, marginTop: "4px" }}>
            🏁 {plan.race_name || `${plan.race_distance_km}km Ultra`}
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: "0.85rem", marginTop: "2px" }}>
            {new Date(plan.race_date + "T00:00:00").toLocaleDateString("sv-SE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: COLORS.cardAccent,
              fontSize: "2rem",
              fontWeight: 700,
              backgroundColor: COLORS.warmGold,
              padding: "8px 16px",
              borderRadius: "12px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            {daysToRace}
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: "0.75rem", marginTop: "4px", fontWeight: 600 }}>
            days to go
          </div>
        </div>
      </div>

      {/* Current week card */}
      {currentWeek && (
        <div
          style={{
            backgroundColor: COLORS.cardAccent,
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "1.5rem",
            border: `3px solid ${COLORS.border}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header bar */}
          <div
            style={{
              background: `linear-gradient(135deg, ${PHASE_COLORS[currentWeek.phase]} 0%, ${PHASE_COLORS[currentWeek.phase]}dd 100%)`,
              padding: "14px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ color: COLORS.cardAccent, fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
              Week {currentWeek.week_number} — {PHASE_LABELS[currentWeek.phase]}
            </h2>
            <span style={{ color: COLORS.cardAccent, fontSize: "0.8rem", fontWeight: 600 }}>
              {currentWeek.cycle_number ? `Cycle ${currentWeek.cycle_number}, W${currentWeek.week_in_cycle}` : ""} ·{" "}
              {weeksToRace} weeks to race
            </span>
          </div>

          <div style={{ padding: "18px 20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: currentWeek.back_to_back ? "1fr 1fr 1fr 1fr 1fr" : "1fr 1fr 1fr 1fr",
                gap: "14px",
              }}
            >
              <div
                style={{
                  backgroundColor: COLORS.cardAlt,
                  padding: "12px",
                  borderRadius: "10px",
                  border: `2px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    color: COLORS.textMuted,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontWeight: 700,
                  }}
                >
                  Target
                </div>
                <div style={{ color: COLORS.textDark, fontSize: "1.3rem", fontWeight: 700 }}>
                  {currentWeek.target_volume_km} km
                </div>
              </div>
              <div
                style={{
                  backgroundColor: COLORS.cardAlt,
                  padding: "12px",
                  borderRadius: "10px",
                  border: `2px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    color: COLORS.textMuted,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontWeight: 700,
                  }}
                >
                  Actual
                </div>
                <div
                  style={{
                    color:
                      currentWeek.actualVolumeKm >= currentWeek.target_volume_km ? COLORS.success : COLORS.textDark,
                    fontSize: "1.3rem",
                    fontWeight: 700,
                  }}
                >
                  {currentWeek.actualVolumeKm} km
                </div>
              </div>
              <div
                style={{
                  backgroundColor: COLORS.cardAlt,
                  padding: "12px",
                  borderRadius: "10px",
                  border: `2px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    color: COLORS.textMuted,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontWeight: 700,
                  }}
                >
                  Remaining
                </div>
                <div style={{ color: COLORS.warmGold, fontSize: "1.3rem", fontWeight: 700 }}>
                  {Math.max(0, Math.round((currentWeek.target_volume_km - currentWeek.actualVolumeKm) * 10) / 10)} km
                </div>
              </div>
              <div
                style={{
                  backgroundColor: COLORS.cardAlt,
                  padding: "12px",
                  borderRadius: "10px",
                  border: `2px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    color: COLORS.textMuted,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontWeight: 700,
                  }}
                >
                  Long Run
                </div>
                <div style={{ color: COLORS.darkGold, fontSize: "1.3rem", fontWeight: 700 }}>
                  {currentWeek.long_run_km > 0 ? `${currentWeek.long_run_km} km` : "—"}
                </div>
              </div>
              {currentWeek.back_to_back ? (
                <div
                  style={{
                    backgroundColor: COLORS.cardAlt,
                    padding: "12px",
                    borderRadius: "10px",
                    border: `2px solid ${COLORS.error}40`,
                  }}
                >
                  <div
                    style={{
                      color: COLORS.textMuted,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                      fontWeight: 700,
                    }}
                  >
                    Back-to-Back
                  </div>
                  <div style={{ color: COLORS.error, fontSize: "1.3rem", fontWeight: 700 }}>
                    {Math.round(currentWeek.long_run_km * 0.6 * 10) / 10} km
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: "0.65rem" }}>day 2 (Sat+Sun)</div>
                </div>
              ) : null}
            </div>
            {/* Progress bar */}
            <div
              style={{
                backgroundColor: COLORS.cardAlt,
                borderRadius: "10px",
                height: "12px",
                marginTop: "16px",
                overflow: "hidden",
                border: `2px solid ${COLORS.border}`,
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (currentWeek.actualVolumeKm / currentWeek.target_volume_km) * 100)}%`,
                  height: "100%",
                  backgroundColor:
                    currentWeek.actualVolumeKm >= currentWeek.target_volume_km
                      ? COLORS.success
                      : PHASE_COLORS[currentWeek.phase],
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Plan stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
        {[
          { label: "Start Volume", value: `${plan.starting_volume_km} km` },
          { label: "Peak Volume", value: `${plan.peak_volume_km} km` },
          { label: "Peak Long Run", value: `${peakLongRun} km` },
          { label: "B2B Weekends", value: String(b2bWeekCount) },
          { label: "Total Weeks", value: String(plan.total_weeks) },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              backgroundColor: COLORS.cardBg,
              borderRadius: "12px",
              padding: "14px",
              border: `2px solid ${COLORS.border}`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                color: COLORS.textMuted,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                marginBottom: "6px",
                fontWeight: 700,
              }}
            >
              {s.label}
            </div>
            <div style={{ color: COLORS.textDark, fontSize: "1.15rem", fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Volume chart: target vs actual + long run overlay */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ color: COLORS.textDark, fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>
          Volume Plan
        </h2>
        <div
          style={{
            backgroundColor: COLORS.cardBg,
            borderRadius: "14px",
            padding: "20px",
            overflowX: "auto",
            border: `2px solid ${COLORS.border}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "3px",
              height: "220px",
              minWidth: `${weeks.length * 28}px`,
            }}
          >
            {weeks.map((w, i) => {
              const targetH = (w.target_volume_km / maxBar) * 180;
              const actualH = (w.actualVolumeKm / maxBar) * 180;
              const longRunH = (w.long_run_km / maxBar) * 180;
              const isCurrent = i === currentIdx;
              return (
                <div
                  key={w.week_number}
                  style={{
                    flex: "0 0 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    position: "relative",
                  }}
                >
                  {/* Back-to-back marker */}
                  {w.back_to_back ? (
                    <div
                      style={{
                        position: "absolute",
                        top: "-16px",
                        fontSize: "0.55rem",
                        color: COLORS.error,
                        fontWeight: 700,
                      }}
                    >
                      B2B
                    </div>
                  ) : null}
                  {/* Target bar (ghost) */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      width: "20px",
                      height: `${Math.max(targetH, 2)}px`,
                      backgroundColor: "transparent",
                      border: `1px solid ${PHASE_COLORS[w.phase]}40`,
                      borderRadius: "2px 2px 0 0",
                      opacity: 0.5,
                    }}
                  />
                  {/* Long run indicator line */}
                  {w.long_run_km > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: `${longRunH}px`,
                        width: "20px",
                        height: "0",
                        borderTop: "2px dashed #f0ad4e50",
                      }}
                    />
                  )}
                  {/* Actual bar */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      width: "14px",
                      height: `${Math.max(actualH, 0)}px`,
                      backgroundColor: w.actualVolumeKm >= w.target_volume_km ? "#4ecdc4" : PHASE_COLORS[w.phase],
                      borderRadius: "2px 2px 0 0",
                      opacity: isCurrent ? 1 : 0.7,
                    }}
                  />
                  {/* Current week marker */}
                  {isCurrent && (
                    <div
                      style={{
                        position: "absolute",
                        top: w.back_to_back ? "-28px" : "-14px",
                        fontSize: "0.6rem",
                        color: COLORS.primaryGreen,
                        fontWeight: 700,
                      }}
                    >
                      NOW
                    </div>
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
                  <span style={{ color: COLORS.textMuted, fontSize: "0.6rem" }}>{formatDate(w.start_date)}</span>
                )}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>
            {Object.entries(PHASE_COLORS).map(([phase, color]) => (
              <div key={phase} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "10px", height: "10px", backgroundColor: color, borderRadius: "2px" }} />
                <span style={{ color: COLORS.textMuted, fontSize: "0.7rem" }}>{PHASE_LABELS[phase]}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "10px", height: "10px", backgroundColor: COLORS.success, borderRadius: "2px" }} />
              <span style={{ color: COLORS.textMuted, fontSize: "0.7rem" }}>Target met</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "16px", borderTop: `2px dashed ${COLORS.warmGold}60` }} />
              <span style={{ color: COLORS.textMuted, fontSize: "0.7rem" }}>Long run</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: COLORS.error, fontSize: "0.6rem", fontWeight: 700 }}>B2B</span>
              <span style={{ color: COLORS.textMuted, fontSize: "0.7rem" }}>Back-to-back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week-by-week table */}
      <div>
        <h2 style={{ color: COLORS.textDark, fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>
          Week by Week
        </h2>
        <div
          style={{
            backgroundColor: COLORS.cardBg,
            borderRadius: "14px",
            overflow: "hidden",
            border: `2px solid ${COLORS.border}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "46px 80px 68px 65px 70px 65px 55px 55px 45px 1fr",
              padding: "10px 14px",
              backgroundColor: COLORS.cardAlt,
              color: COLORS.textMuted,
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              borderBottom: `2px solid ${COLORS.border}`,
            }}
          >
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
                  padding: "10px 14px",
                  backgroundColor: isCurrent
                    ? `${PHASE_COLORS[w.phase]}15`
                    : i % 2 === 0
                      ? COLORS.cardBg
                      : `${COLORS.cardAlt}80`,
                  borderLeft: isCurrent ? `4px solid ${PHASE_COLORS[w.phase]}` : "4px solid transparent",
                  borderBottom: i < weeks.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  alignItems: "center",
                  opacity: isPast && pct === 0 ? 0.5 : 1,
                }}
              >
                <span
                  style={{
                    color: isCurrent ? COLORS.textDark : COLORS.textMuted,
                    fontSize: "0.8rem",
                    fontWeight: isCurrent ? 700 : 500,
                  }}
                >
                  {w.week_number}
                </span>
                <span style={{ color: COLORS.textMuted, fontSize: "0.72rem" }}>{formatDate(w.start_date)}</span>
                <span style={{ color: PHASE_COLORS[w.phase], fontSize: "0.72rem", fontWeight: 600 }}>
                  {PHASE_LABELS[w.phase]}
                </span>
                <span style={{ color: COLORS.textDark, fontSize: "0.8rem" }}>{w.target_volume_km} km</span>
                <span
                  style={{
                    color: w.long_run_km > 0 ? COLORS.warmGold : COLORS.textLight,
                    fontSize: "0.8rem",
                    fontWeight: w.long_run_km > 0 ? 600 : 400,
                  }}
                >
                  {w.long_run_km > 0 ? `${w.long_run_km} km` : "—"}
                </span>
                <span
                  style={{
                    color: w.actualVolumeKm > 0 ? (pct >= 90 ? COLORS.success : COLORS.textDark) : COLORS.textLight,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  {w.actualVolumeKm > 0 ? `${w.actualVolumeKm} km` : "—"}
                </span>
                <span style={{ color: COLORS.textMuted, fontSize: "0.75rem" }}>
                  {w.runCount > 0 ? w.runCount : "—"}
                </span>
                <span style={{ color: COLORS.textMuted, fontSize: "0.75rem" }}>
                  {w.gymCount > 0 ? w.gymCount : "—"}
                </span>
                <span
                  style={{
                    color: w.back_to_back ? COLORS.error : COLORS.textLight,
                    fontSize: "0.7rem",
                    fontWeight: w.back_to_back ? 700 : 400,
                  }}
                >
                  {w.back_to_back ? "✓" : "—"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{ flex: 1, backgroundColor: "#222", borderRadius: "3px", height: "5px", overflow: "hidden" }}
                  >
                    <div
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        height: "100%",
                        backgroundColor: pct >= 90 ? "#4ecdc4" : PHASE_COLORS[w.phase],
                        borderRadius: "3px",
                      }}
                    />
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
      <div
        style={{
          backgroundColor: COLORS.cardBg,
          borderRadius: "14px",
          padding: "20px 24px",
          marginTop: "1.5rem",
          border: `2px solid ${COLORS.border}`,
          boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
        }}
      >
        <h3
          style={{
            color: COLORS.textMuted,
            fontSize: "0.85rem",
            fontWeight: 700,
            marginTop: 0,
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Plan Details
        </h3>
        <div style={{ color: COLORS.textMuted, fontSize: "0.82rem", lineHeight: 1.6 }}>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong style={{ color: COLORS.textDark }}>28-week structure:</strong> 24 weeks build/plateau phase + 4
            weeks taper. Recovery weeks at weeks 4, 8, 12, 16, 20.
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong style={{ color: COLORS.textDark }}>Volume increases:</strong> Progressive build with max 15%
            increase per week, capped at +5km/week.
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong style={{ color: COLORS.textDark }}>Long run progression:</strong> Weeks 1-8: 15→25km | Weeks 9-16:
            25→35km | Weeks 17-24: 35-40km plateau.
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong style={{ color: COLORS.textDark }}>Recovery weeks:</strong> 65% of previous week's volume, long run
            at 50% of previous week.
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong style={{ color: COLORS.textDark }}>Plateau phase (weeks 20-24):</strong> Hold peak volume with 2-3
            back-to-back long run weekends.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: COLORS.textDark }}>Taper (weeks 25-28):</strong> 70% → 55% → 35% → 20% of peak
            volume.
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
  backgroundColor: COLORS.bg,
  minHeight: "100vh",
};

const labelStyle: React.CSSProperties = {
  color: COLORS.textDark,
  fontSize: "0.88rem",
  fontWeight: 600,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const inputStyle: React.CSSProperties = {
  backgroundColor: COLORS.cardAccent,
  color: COLORS.textDark,
  border: `2px solid ${COLORS.border}`,
  borderRadius: "10px",
  padding: "12px 14px",
  fontSize: "0.9rem",
  fontWeight: 500,
};
