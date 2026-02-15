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
      <main className="max-w-[1040px] mx-auto px-4 py-8 min-h-screen flex justify-center items-center">
        <p className="text-neutral-500 text-sm">Loading...</p>
      </main>
    );
  }

  // ── No plan yet → show setup form ──
  if (!plan) {
    return (
      <main className="max-w-[1040px] mx-auto px-4 py-8 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-light text-neutral-100 tracking-tight m-0">Training Plan</h1>
          <a
            href="/dashboard"
            className="border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-neutral-200 rounded-lg px-4 py-2 text-sm font-medium no-underline transition-all"
          >
            &larr; Dashboard
          </a>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-7 max-w-[550px]">
          <h2 className="text-lg font-medium text-neutral-100 mt-0 mb-3">Set Up Your Race Plan</h2>
          <p className="text-neutral-500 text-sm mb-6 leading-relaxed">
            Enter your race details and current fitness. The plan uses 28-week periodization with specific long run
            progression (15→25→35→40km), plateau phase (weeks 20-24), recovery every 4 weeks, and a 4-week taper.
          </p>

          <div className="flex flex-col gap-3">
            <label className="text-neutral-300 text-sm font-medium flex flex-col gap-1.5">
              Race Name (optional)
              <input
                type="text"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="e.g. Ultravasan 90"
                className="bg-neutral-900 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3.5 py-3 text-sm font-normal text-neutral-200 outline-none transition-colors"
              />
            </label>
            <label className="text-neutral-300 text-sm font-medium flex flex-col gap-1.5">
              Race Date
              <input
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3.5 py-3 text-sm font-normal text-neutral-200 outline-none transition-colors"
              />
            </label>
            <label className="text-neutral-300 text-sm font-medium flex flex-col gap-1.5">
              Race Distance (km)
              <input
                type="number"
                value={raceDistance}
                onChange={(e) => setRaceDistance(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3.5 py-3 text-sm font-normal text-neutral-200 outline-none transition-colors"
              />
            </label>
            <label className="text-neutral-300 text-sm font-medium flex flex-col gap-1.5">
              Total Plan Weeks
              <input
                type="number"
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3.5 py-3 text-sm font-normal text-neutral-200 outline-none transition-colors"
              />
            </label>
            <label className="text-neutral-300 text-sm font-medium flex flex-col gap-1.5">
              Current Weekly Volume (km)
              <input
                type="number"
                value={startingVolume}
                onChange={(e) => setStartingVolume(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3.5 py-3 text-sm font-normal text-neutral-200 outline-none transition-colors"
              />
            </label>
            <label className="text-neutral-300 text-sm font-medium flex flex-col gap-1.5">
              Current Long Run (km)
              <input
                type="number"
                value={startingLongRun}
                onChange={(e) => setStartingLongRun(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3.5 py-3 text-sm font-normal text-neutral-200 outline-none transition-colors"
              />
            </label>
            <label className="text-neutral-300 text-sm font-medium flex flex-col gap-1.5">
              Target Peak Volume (km)
              <input
                type="number"
                value={peakVolume}
                onChange={(e) => setPeakVolume(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3.5 py-3 text-sm font-normal text-neutral-200 outline-none transition-colors"
              />
            </label>
          </div>

          {error && (
            <p className="text-sm mt-3 px-3 py-2.5 rounded-lg bg-red-900/10 border border-red-900/30 text-red-400">
              {error}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-neutral-200 text-neutral-900 hover:bg-neutral-300 disabled:bg-neutral-600 disabled:text-neutral-400 disabled:cursor-not-allowed border-none rounded-lg px-7 py-3.5 text-base font-semibold cursor-pointer mt-6 w-full transition-all"
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

  const b2bWeekCount = weeks.filter((w) => w.back_to_back).length;
  const peakLongRun = Math.max(...weeks.map((w) => w.long_run_km), 0);

  return (
    <main className="max-w-[1040px] mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-light text-neutral-100 tracking-tight m-0">{plan.name}</h1>
        <div className="flex gap-2.5 items-center">
          <a
            href="/dashboard"
            className="border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-neutral-200 rounded-lg px-4 py-2 text-sm font-medium no-underline transition-all"
          >
            &larr; Dashboard
          </a>
          <button
            onClick={handleDelete}
            className="bg-transparent text-red-400 border border-red-900/50 hover:border-red-400 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer transition-all"
          >
            Delete Plan
          </button>
        </div>
      </div>

      {/* Race countdown */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-6 py-5 mb-6 flex justify-between items-center hover:border-neutral-700 transition-all">
        <div>
          <span className="text-neutral-500 text-[0.7rem] uppercase tracking-wider font-medium">Race Day</span>
          <div className="text-lg font-light text-neutral-100 tracking-tight mt-1">
            {plan.race_name || `${plan.race_distance_km}km Ultra`}
          </div>
          <div className="text-neutral-500 text-sm mt-0.5">
            {new Date(plan.race_date + "T00:00:00").toLocaleDateString("sv-SE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <div className="text-right">
          <div className="bg-neutral-800 text-neutral-100 text-4xl font-light tracking-tight px-5 py-3 rounded-xl">
            {daysToRace}
          </div>
          <div className="text-neutral-500 text-[0.65rem] uppercase tracking-wider font-medium mt-1.5">days to go</div>
        </div>
      </div>

      {/* Current week card */}
      {currentWeek && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden mb-6 hover:border-neutral-700 transition-all">
          {/* Header bar */}
          <div
            className="px-5 py-3.5 flex justify-between items-center"
            style={{ backgroundColor: `${PHASE_COLORS[currentWeek.phase]}15` }}
          >
            <h2 className="text-base font-medium text-neutral-100 m-0">
              Week {currentWeek.week_number} — {PHASE_LABELS[currentWeek.phase]}
            </h2>
            <span className="text-neutral-400 text-xs font-medium">
              {currentWeek.cycle_number ? `Cycle ${currentWeek.cycle_number}, W${currentWeek.week_in_cycle}` : ""} ·{" "}
              {weeksToRace} weeks to race
            </span>
          </div>

          <div className="p-5">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: currentWeek.back_to_back ? "repeat(5, 1fr)" : "repeat(4, 1fr)",
              }}
            >
              {[
                { label: "Target", value: `${currentWeek.target_volume_km} km` },
                {
                  label: "Actual",
                  value: `${currentWeek.actualVolumeKm} km`,
                  highlight: currentWeek.actualVolumeKm >= currentWeek.target_volume_km,
                },
                {
                  label: "Remaining",
                  value: `${Math.max(0, Math.round((currentWeek.target_volume_km - currentWeek.actualVolumeKm) * 10) / 10)} km`,
                },
                { label: "Long Run", value: currentWeek.long_run_km > 0 ? `${currentWeek.long_run_km} km` : "—" },
              ].map((s) => (
                <div key={s.label} className="bg-neutral-800/30 rounded-lg p-3 border border-neutral-800">
                  <div className="text-neutral-500 text-[0.7rem] uppercase tracking-wider font-medium mb-1.5">
                    {s.label}
                  </div>
                  <div className="text-xl font-light text-neutral-100 tracking-tight">{s.value}</div>
                </div>
              ))}
              {currentWeek.back_to_back && (
                <div className="bg-neutral-800/30 rounded-lg p-3 border border-red-900/30">
                  <div className="text-neutral-500 text-[0.7rem] uppercase tracking-wider font-medium mb-1.5">
                    Back-to-Back
                  </div>
                  <div className="text-xl font-light text-neutral-100 tracking-tight">
                    {Math.round(currentWeek.long_run_km * 0.6 * 10) / 10} km
                  </div>
                  <div className="text-neutral-600 text-[0.65rem]">day 2 (Sat+Sun)</div>
                </div>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (currentWeek.actualVolumeKm / currentWeek.target_volume_km) * 100)}%`,
                  backgroundColor: currentWeek.actualVolumeKm >= currentWeek.target_volume_km ? "#d4d4d4" : "#a3a3a3",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Plan stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Start Volume", value: `${plan.starting_volume_km} km` },
          { label: "Peak Volume", value: `${plan.peak_volume_km} km` },
          { label: "Peak Long Run", value: `${peakLongRun} km` },
          { label: "B2B Weekends", value: String(b2bWeekCount) },
          { label: "Total Weeks", value: String(plan.total_weeks) },
        ].map((s) => (
          <div key={s.label} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5">
            <div className="text-neutral-500 text-[0.7rem] uppercase tracking-wider font-medium mb-1.5">{s.label}</div>
            <div className="text-lg font-light text-neutral-100 tracking-tight">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Volume chart */}
      <div className="mb-6">
        <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-neutral-500 mb-3">Volume Plan</h2>
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 overflow-x-auto hover:border-neutral-700 transition-all">
          <div className="flex items-end gap-[3px]" style={{ height: "220px", minWidth: `${weeks.length * 28}px` }}>
            {weeks.map((w, i) => {
              const targetH = (w.target_volume_km / maxBar) * 180;
              const actualH = (w.actualVolumeKm / maxBar) * 180;
              const longRunH = (w.long_run_km / maxBar) * 180;
              const isCurrent = i === currentIdx;
              return (
                <div
                  key={w.week_number}
                  className="flex flex-col items-center gap-0.5 relative"
                  style={{ flex: "0 0 24px" }}
                >
                  {w.back_to_back && <div className="absolute -top-4 text-[0.55rem] text-red-400 font-bold">B2B</div>}
                  {/* Target bar (ghost) */}
                  <div
                    className="absolute bottom-0 rounded-t-sm opacity-50"
                    style={{
                      width: "20px",
                      height: `${Math.max(targetH, 2)}px`,
                      border: "1px solid rgba(163,163,163,0.15)",
                      backgroundColor: "transparent",
                    }}
                  />
                  {/* Long run indicator */}
                  {w.long_run_km > 0 && (
                    <div
                      className="absolute w-5 border-t-2 border-dashed border-neutral-600/50"
                      style={{ bottom: `${longRunH}px` }}
                    />
                  )}
                  {/* Actual bar */}
                  <div
                    className="absolute bottom-0 rounded-t-sm"
                    style={{
                      width: "14px",
                      height: `${Math.max(actualH, 0)}px`,
                      backgroundColor: w.actualVolumeKm >= w.target_volume_km ? "#d4d4d4" : PHASE_COLORS[w.phase],
                      opacity: isCurrent ? 1 : 0.7,
                    }}
                  />
                  {isCurrent && (
                    <div
                      className="absolute text-[0.6rem] text-neutral-300 font-bold"
                      style={{ top: w.back_to_back ? "-28px" : "-14px" }}
                    >
                      NOW
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Week labels */}
          <div className="flex gap-[3px] mt-1.5" style={{ minWidth: `${weeks.length * 28}px` }}>
            {weeks.map((w, i) => (
              <div key={w.week_number} className="text-center" style={{ flex: "0 0 24px" }}>
                {i % 4 === 0 && <span className="text-neutral-600 text-[0.6rem]">{formatDate(w.start_date)}</span>}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 pt-3 border-t border-neutral-800 flex-wrap">
            {Object.entries(PHASE_COLORS).map(([phase, color]) => (
              <div key={phase} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-neutral-500 text-[0.7rem]">{PHASE_LABELS[phase]}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-neutral-300" />
              <span className="text-neutral-500 text-[0.7rem]">Target met</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 border-t-2 border-dashed border-neutral-600/50" />
              <span className="text-neutral-500 text-[0.7rem]">Long run</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-400 text-[0.6rem] font-bold">B2B</span>
              <span className="text-neutral-500 text-[0.7rem]">Back-to-back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week-by-week table */}
      <div>
        <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-neutral-500 mb-3">Week by Week</h2>
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-all">
          {/* Header */}
          <div
            className="grid px-3.5 py-2.5 text-[0.65rem] font-medium uppercase tracking-wider text-neutral-600 border-b border-neutral-800"
            style={{ gridTemplateColumns: "46px 80px 68px 65px 70px 65px 55px 55px 45px 1fr" }}
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
                className="grid items-center px-3.5 py-2.5"
                style={{
                  gridTemplateColumns: "46px 80px 68px 65px 70px 65px 55px 55px 45px 1fr",
                  backgroundColor: isCurrent
                    ? "rgba(163,163,163,0.08)"
                    : i % 2 === 0
                      ? "rgba(163,163,163,0.02)"
                      : "rgba(163,163,163,0.04)",
                  borderLeft: isCurrent ? "2px solid #a3a3a3" : "2px solid transparent",
                  borderBottom: i < weeks.length - 1 ? "1px solid rgba(38,38,38,0.6)" : "none",
                  opacity: isPast && pct === 0 ? 0.5 : 1,
                }}
              >
                <span
                  className="text-xs"
                  style={{
                    color: isCurrent ? "#ededed" : "#737373",
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {w.week_number}
                </span>
                <span className="text-neutral-500 text-[0.72rem]">{formatDate(w.start_date)}</span>
                <span className="text-[0.72rem] font-medium" style={{ color: PHASE_COLORS[w.phase] }}>
                  {PHASE_LABELS[w.phase]}
                </span>
                <span className="text-neutral-200 text-xs">{w.target_volume_km} km</span>
                <span
                  className="text-xs"
                  style={{
                    color: w.long_run_km > 0 ? "#a3a3a3" : "#525252",
                    fontWeight: w.long_run_km > 0 ? 500 : 400,
                  }}
                >
                  {w.long_run_km > 0 ? `${w.long_run_km} km` : "—"}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{
                    color: w.actualVolumeKm > 0 ? (pct >= 90 ? "#d4d4d4" : "#ededed") : "#525252",
                  }}
                >
                  {w.actualVolumeKm > 0 ? `${w.actualVolumeKm} km` : "—"}
                </span>
                <span className="text-neutral-500 text-[0.75rem]">{w.runCount > 0 ? w.runCount : "—"}</span>
                <span className="text-neutral-500 text-[0.75rem]">{w.gymCount > 0 ? w.gymCount : "—"}</span>
                <span
                  className="text-[0.7rem]"
                  style={{
                    color: w.back_to_back ? COLORS.error : "#525252",
                    fontWeight: w.back_to_back ? 700 : 400,
                  }}
                >
                  {w.back_to_back ? "✓" : "—"}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 bg-neutral-800 rounded-sm h-1 overflow-hidden">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: pct >= 90 ? "#d4d4d4" : PHASE_COLORS[w.phase],
                      }}
                    />
                  </div>
                  {w.actualVolumeKm > 0 && (
                    <span className="text-[0.7rem] min-w-[32px]" style={{ color: pct >= 90 ? "#d4d4d4" : "#737373" }}>
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
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-6 py-5 mt-6">
        <h3 className="text-[0.7rem] uppercase tracking-wider font-medium text-neutral-500 mt-0 mb-3">Plan Details</h3>
        <div className="text-neutral-500 text-sm leading-relaxed">
          <p className="mb-2">
            <strong className="text-neutral-300">28-week structure:</strong> 24 weeks build/plateau phase + 4 weeks
            taper. Recovery weeks at weeks 4, 8, 12, 16, 20.
          </p>
          <p className="mb-2">
            <strong className="text-neutral-300">Volume increases:</strong> Progressive build with max 15% increase per
            week, capped at +5km/week.
          </p>
          <p className="mb-2">
            <strong className="text-neutral-300">Long run progression:</strong> Weeks 1-8: 15→25km | Weeks 9-16: 25→35km
            | Weeks 17-24: 35-40km plateau.
          </p>
          <p className="mb-2">
            <strong className="text-neutral-300">Recovery weeks:</strong> 65% of previous week's volume, long run at 50%
            of previous week.
          </p>
          <p className="mb-2">
            <strong className="text-neutral-300">Plateau phase (weeks 20-24):</strong> Hold peak volume with 2-3
            back-to-back long run weekends.
          </p>
          <p className="m-0">
            <strong className="text-neutral-300">Taper (weeks 25-28):</strong> 70% → 55% → 35% → 20% of peak volume.
          </p>
        </div>
      </div>
    </main>
  );
}
