"use client";

import { useEffect, useState } from "react";
import type { ReadinessResult } from "@/types/coach";

const ZONE_STYLES: Record<string, { color: string; glow: string; bg: string }> = {
  Fresh: { color: "text-green-400", glow: "var(--glow-fresh)", bg: "var(--color-zone-green-muted)" },
  Ready: { color: "text-stone-800", glow: "var(--glow-ready)", bg: "rgba(0,0,0,0.04)" },
  Moderate: { color: "text-yellow-400", glow: "var(--glow-moderate)", bg: "var(--color-zone-yellow-muted)" },
  Fatigued: { color: "text-red-400", glow: "var(--glow-fatigued)", bg: "var(--color-zone-red-muted)" },
  Depleted: { color: "text-red-500", glow: "var(--glow-fatigued)", bg: "var(--color-zone-red-muted)" },
};

const FACTOR_LABELS: Record<string, { label: string; max: number; tooltip: string }> = {
  restDays: { label: "REST", max: 30, tooltip: "Days since your last run. 1 day rest = 27/30, 2 days = 30/30." },
  loadBalance: { label: "LOAD", max: 25, tooltip: "ACWR balance. Green zone (0.8–1.3) = 25/25." },
  recentIntensity: { label: "INTENSITY", max: 25, tooltip: "Yesterday's effort vs your 20-run average suffer score." },
  planPhase: { label: "PHASE", max: 20, tooltip: "Current training phase. Recovery = 20, build = 13, race = 10." },
};

export function ReadinessHero({ readiness }: { readiness: ReadinessResult | null }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readiness) return;
    setVisible(true);
    // Animated counter
    const target = readiness.score;
    const duration = 1000;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [readiness]);

  if (!readiness) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
        <div className="text-stone-400 text-sm">Computing readiness...</div>
      </div>
    );
  }

  const style = ZONE_STYLES[readiness.label] ?? ZONE_STYLES.Ready;

  return (
    <div
      className={`relative bg-white border border-stone-200 rounded-xl p-5 sm:p-8 transition-all duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ boxShadow: style.glow }}
    >
      {/* Hero number */}
      <div
        className="flex flex-col items-center gap-2"
        data-tooltip={`Readiness ${readiness.score}/100 — sum of 4 factors: Rest (${readiness.factors.restDays}/${FACTOR_LABELS.restDays.max}), Load (${readiness.factors.loadBalance}/${FACTOR_LABELS.loadBalance.max}), Intensity (${readiness.factors.recentIntensity}/${FACTOR_LABELS.recentIntensity.max}), Phase (${readiness.factors.planPhase}/${FACTOR_LABELS.planPhase.max})`}
      >
        <div className={`text-7xl font-light tracking-tight ${style.color} transition-colors duration-500`}>
          {displayScore}
        </div>
        <div
          className="px-3 py-1 rounded-full text-[0.7rem] font-medium uppercase tracking-widest"
          style={{ background: style.bg, color: "var(--color-text-secondary)" }}
        >
          {readiness.label}
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(readiness.factors).map(([key, value], i) => {
          const config = FACTOR_LABELS[key];
          if (!config) return null;
          const pct = (value / config.max) * 100;
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5"
              data-tooltip={config.tooltip}
              style={{ animationDelay: `${0.3 + i * 0.08}s` }}
            >
              <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider font-medium">
                {config.label}
              </div>
              <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct > 70 ? "var(--color-zone-green)" : pct > 40 ? "var(--color-zone-yellow)" : "var(--color-zone-red)",
                    opacity: 0.6,
                  }}
                />
              </div>
              <div className="text-[0.65rem] text-stone-500">
                {value}/{config.max}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
