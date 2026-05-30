"use client";

import { useEffect, useState } from "react";
import { Moon, Zap, Activity, Target, Flag, ChevronRight, Droplets, Footprints, Minus, Plus, RotateCcw } from "lucide-react";
import type { DailyBriefing } from "@/types/coach";
import { useCoach } from "@/app/dashboard/hooks/use-coach";
import { useTips } from "@/app/dashboard/hooks/use-tips";
import { useWeather } from "@/app/dashboard/hooks/use-weather";
import { useActivities, useTrainingPlan, useDashboardData } from "@/app/dashboard/hooks";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";

// ─── Helpers ────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Natt";
  if (h < 10) return "God morgon";
  if (h < 13) return "God dag";
  if (h < 18) return "God eftermiddag";
  return "God kväll";
}

function readinessColor(score: number): string {
  if (score >= 80) return "#4ade80";
  if (score >= 60) return "#60a5fa";
  if (score >= 40) return "#fbbf24";
  if (score >= 20) return "#f97316";
  return "#f87171";
}

function localDateStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Days remaining in the current Mon–Sun week, including today. */
function daysLeftInWeek(d = new Date()): number {
  const mondayIndex = (d.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
  return 7 - mondayIndex;
}

function roundHalf(km: number): number {
  return Math.max(0, Math.round(km * 2) / 2);
}

const URGENCY_ICON: Record<string, typeof Moon> = {
  rest: Moon,
  easy: Activity,
  moderate: Zap,
  key_session: Target,
  race: Flag,
};

const URGENCY_BG: Record<string, string> = {
  rest: "bg-stone-100 border-stone-200",
  easy: "bg-stone-50 border-stone-200",
  moderate: "bg-stone-50 border-stone-300",
  key_session: "bg-stone-800 border-stone-700",
  race: "bg-stone-900 border-stone-800",
};

const URGENCY_TEXT: Record<string, string> = {
  rest: "text-stone-600",
  easy: "text-stone-600",
  moderate: "text-stone-700",
  key_session: "text-white",
  race: "text-white",
};

function BriefingCard({ briefing }: { briefing: DailyBriefing }) {
  const Icon = URGENCY_ICON[briefing.urgency] ?? Zap;
  const bg = URGENCY_BG[briefing.urgency] ?? URGENCY_BG.moderate;
  const textColor = URGENCY_TEXT[briefing.urgency] ?? "text-stone-700";

  return (
    <div className={`rounded-2xl border p-5 ${bg}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-2 rounded-xl ${briefing.urgency === "key_session" || briefing.urgency === "race" ? "bg-white/10" : "bg-white/60"}`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
        <div>
          <p className={`text-lg font-light leading-snug ${textColor}`}>{briefing.headline}</p>
          <p className={`mt-1 text-sm opacity-70 ${textColor}`}>{briefing.subtext}</p>
        </div>
      </div>
    </div>
  );
}

function ACWRPill({ ratio, zone }: { ratio: number; zone: string }) {
  const color =
    zone === "green" ? "bg-green-100 text-green-700 border-green-200" :
    zone === "yellow" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
    "bg-red-100 text-red-700 border-red-200";
  const label =
    zone === "green" ? "Bra belastning" :
    zone === "yellow" ? "Bevaka belastning" :
    "Hög belastning";
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${color}`}>
      <span className="text-sm font-medium">ACWR {ratio.toFixed(2)}</span>
      <span className="text-xs opacity-70">·</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

function WeatherSnippet() {
  const { weather, loading } = useWeather();
  if (loading) return <div className="h-10 bg-stone-100 rounded-xl animate-pulse" />;
  if (!weather || weather.today.length === 0) return null;

  const now = weather.today[0];
  const maxRain = Math.max(...weather.today.slice(0, 6).map((h) => h.precipProb));

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-stone-200 rounded-xl">
      <span className="text-2xl font-light text-stone-700">{now.feelsLike}°</span>
      <div className="flex flex-col">
        <span className="text-xs text-stone-500">{now.time} — känns-som</span>
        {maxRain >= 20 && (
          <span className="text-xs text-blue-500 flex items-center gap-1">
            <Droplets className="w-3 h-3" /> {maxRain}% regn (6h)
          </span>
        )}
      </div>
      {weather.locationName && (
        <span className="text-xs text-stone-400 ml-auto truncate max-w-[120px]">{weather.locationName}</span>
      )}
    </div>
  );
}

// ─── Next run + weekly distance ───────────────────────────────────────────────

function WeekPlanCard({ targetKm, doneKm }: { targetKm: number | null; doneKm: number }) {
  const daysLeft = daysLeftInWeek();
  const remaining = targetKm != null ? Math.max(0, targetKm - doneKm) : null;
  const suggested =
    remaining == null ? null : remaining <= 0 ? 0 : roundHalf(remaining / daysLeft);

  const dateKey = localDateStr();
  const storageKey = `nextRunOverride:${dateKey}`;
  const [override, setOverride] = useState<number | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      setOverride(v != null ? parseFloat(v) : null);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const display = override != null ? override : (suggested ?? 0);

  function setVal(km: number) {
    const v = roundHalf(km);
    setOverride(v);
    try {
      localStorage.setItem(storageKey, String(v));
    } catch {
      /* ignore */
    }
  }

  function reset() {
    setOverride(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }

  const pct = targetKm && targetKm > 0 ? Math.min(100, (doneKm / targetKm) * 100) : 0;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Footprints className="w-4 h-4 text-[#FC4C02]" />
        <span className="text-[0.7rem] uppercase tracking-wider font-medium text-stone-500">Nästa pass</span>
        {override != null && (
          <span className="text-[0.6rem] text-stone-400 ml-auto">egen siffra</span>
        )}
      </div>

      {/* Editable next-run distance */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setVal(display - 0.5)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-700 bg-transparent cursor-pointer transition-all"
          aria-label="Minska"
        >
          <Minus size={16} />
        </button>
        <div className="flex items-end gap-1">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={display}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              setVal(isNaN(n) ? 0 : n);
            }}
            className="w-20 text-center text-4xl font-extralight text-stone-800 tabular-nums bg-transparent border-none outline-none p-0
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-base text-stone-400 mb-1.5">km</span>
        </div>
        <button
          onClick={() => setVal(display + 0.5)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-700 bg-transparent cursor-pointer transition-all"
          aria-label="Öka"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Rationale */}
      <div className="text-center mt-2 text-xs text-stone-500">
        {remaining == null ? (
          "Ingen aktiv plan — sätt din egen distans"
        ) : remaining <= 0 ? (
          "Veckans mål är nått — allt extra är bonus"
        ) : (
          <>
            <span className="font-medium text-stone-700">{remaining.toFixed(1)} km</span> kvar denna vecka
            {override != null && (
              <button onClick={reset} className="ml-2 inline-flex items-center gap-1 text-stone-400 hover:text-stone-600 bg-transparent border-none cursor-pointer">
                <RotateCcw size={11} /> auto ({suggested?.toFixed(1)} km)
              </button>
            )}
          </>
        )}
      </div>

      {/* Weekly distance summary */}
      <div className="mt-4 pt-4 border-t border-stone-100">
        {targetKm != null && (
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: doneKm >= targetKm * 0.9 ? "#4ade80" : "#FC4C02" }}
            />
          </div>
        )}
        <div className="text-center">
          <span className="text-xl font-light tabular-nums text-stone-800">{doneKm.toFixed(1)}</span>
          <span className="text-stone-300 mx-1">/</span>
          <span className="text-base font-light tabular-nums text-stone-400">{targetKm != null ? targetKm.toFixed(0) : "—"} km</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DailyGoPlanPage() {
  useAuthGuard();
  const { data, loading: coachLoading } = useCoach();
  const { tips, loading: tipsLoading } = useTips();
  const { activities, loadActivities } = useActivities();
  const { plan, planWeeks, loadPlan } = useTrainingPlan();
  const [, setHour] = useState(new Date().getHours());

  useEffect(() => {
    loadActivities();
    loadPlan();
  }, [loadActivities, loadPlan]);

  useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const { currentWeek, currentPlanWeek } = useDashboardData(activities, plan, planWeeks);

  const readiness = data?.readiness ?? null;
  const briefing = data?.briefing ?? null;
  const acwr = data?.acwr ?? null;
  const tip = tips.length > 0 ? tips[0] : null;

  const score = readiness?.score ?? null;
  const scoreColor = score != null ? readinessColor(score) : "#a8a29e";

  const targetKm = currentPlanWeek?.target_volume_km ?? null;
  const doneKm = currentWeek ? currentWeek.totalDistance / 1000 : 0;

  return (
    <main className="min-h-screen bg-[#F7F3EE] flex flex-col items-center justify-start pt-safe">
      <div className="w-full max-w-md px-5 pb-10 pt-8 flex flex-col gap-4">

        {/* Greeting + back link */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Daily Go Plan</div>
            <h1 className="text-2xl font-light text-stone-700 tracking-tight">{greeting()}</h1>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors no-underline"
          >
            Dashboard <ChevronRight className="w-3 h-3" />
          </a>
        </div>

        {/* Readiness hero */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col items-center">
          {coachLoading ? (
            <div className="h-24 w-24 rounded-full bg-stone-100 animate-pulse" />
          ) : (
            <>
              <div
                className="text-7xl font-extralight tabular-nums leading-none"
                style={{ color: scoreColor }}
              >
                {score ?? "—"}
              </div>
              <div className="text-sm text-stone-500 mt-2 tracking-wide">
                {readiness?.label ?? "Beräknar..."}
              </div>
              {readiness && (
                <div className="w-full mt-4 grid grid-cols-4 gap-2">
                  {[
                    { label: "Vila", value: readiness.factors.restDays, max: 30 },
                    { label: "Last", value: readiness.factors.loadBalance, max: 25 },
                    { label: "Intensitet", value: readiness.factors.recentIntensity, max: 25 },
                    { label: "Fas", value: readiness.factors.planPhase, max: 20 },
                  ].map((f) => (
                    <div key={f.label} className="flex flex-col items-center gap-1">
                      <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(f.value / f.max) * 100}%`,
                            backgroundColor: scoreColor,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <span className="text-[0.55rem] text-stone-400 text-center">{f.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Daily briefing */}
        {briefing ? (
          <BriefingCard briefing={briefing} />
        ) : (
          <div className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
        )}

        {/* Next run + weekly distance */}
        <WeekPlanCard targetKm={targetKm} doneKm={doneKm} />

        {/* Weather snippet */}
        <WeatherSnippet />

        {/* ACWR */}
        {acwr && <ACWRPill ratio={acwr.ratio} zone={acwr.zone} />}

        {/* Tip */}
        {!tipsLoading && tip && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                  tip.severity === "action"
                    ? "bg-orange-100 text-orange-600"
                    : tip.severity === "warning"
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-stone-100 text-stone-500"
                }`}
              >
                {tip.category.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm font-medium text-stone-700">{tip.title}</p>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">{tip.body}</p>
            {tip.source && (
              <p className="text-[0.6rem] text-stone-400 mt-2">{tip.source}</p>
            )}
          </div>
        )}

        {/* Footer links */}
        <div className="flex gap-2 pt-2">
          <a
            href="/dashboard"
            className="flex-1 text-center py-3 rounded-xl border border-stone-200 text-sm text-stone-500 hover:text-stone-700 hover:border-stone-400 transition-all no-underline"
          >
            Full dashboard
          </a>
          <a
            href="/rutter"
            className="flex-1 text-center py-3 rounded-xl border border-stone-200 text-sm text-stone-500 hover:text-stone-700 hover:border-stone-400 transition-all no-underline"
          >
            Rutter
          </a>
        </div>
      </div>
    </main>
  );
}
