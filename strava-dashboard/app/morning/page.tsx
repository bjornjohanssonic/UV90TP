"use client";

import { useEffect, useState } from "react";
import { Moon, Zap, Activity, Target, Flag, ChevronRight, Droplets } from "lucide-react";
import type { DailyBriefing } from "@/types/coach";
import { useCoach } from "@/app/dashboard/hooks/use-coach";
import { useTips } from "@/app/dashboard/hooks/use-tips";
import { useWeather } from "@/app/dashboard/hooks/use-weather";

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MorningPage() {
  const { data, loading: coachLoading } = useCoach();
  const { tips, loading: tipsLoading } = useTips();
  const [hour, setHour] = useState(new Date().getHours());

  useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const readiness = data?.readiness ?? null;
  const briefing = data?.briefing ?? null;
  const acwr = data?.acwr ?? null;
  const tip = tips.length > 0 ? tips[0] : null;

  const score = readiness?.score ?? null;
  const scoreColor = score != null ? readinessColor(score) : "#a8a29e";

  return (
    <main className="min-h-screen bg-[#F7F3EE] flex flex-col items-center justify-start pt-safe">
      <div className="w-full max-w-md px-5 pb-10 pt-8 flex flex-col gap-4">

        {/* Greeting + back link */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-light text-stone-700 tracking-tight">{greeting()}</h1>
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
            href="/training-plan"
            className="flex-1 text-center py-3 rounded-xl border border-stone-200 text-sm text-stone-500 hover:text-stone-700 hover:border-stone-400 transition-all no-underline"
          >
            Träningsplan
          </a>
        </div>
      </div>
    </main>
  );
}
