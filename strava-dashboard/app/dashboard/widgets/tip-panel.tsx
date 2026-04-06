"use client";

import type { Tip } from "@/types/coach";
import { AlertTriangle, Info, Zap } from "lucide-react";

const SEVERITY_CONFIG = {
  action: { icon: Zap, border: "border-l-stone-600", iconColor: "text-stone-700" },
  warning: { icon: AlertTriangle, border: "border-l-stone-400", iconColor: "text-stone-500" },
  info: { icon: Info, border: "border-l-neutral-700", iconColor: "text-stone-400" },
};

const CATEGORY_LABELS: Record<string, string> = {
  tibialis_anterior: "SHIN HEALTH",
  recovery: "RECOVERY",
  nutrition: "NUTRITION",
  sleep: "SLEEP",
  mobility: "MOBILITY",
  strength: "STRENGTH",
  form: "RUNNING FORM",
  prehab: "PREHAB",
};

export function TipPanel({ tips }: { tips: Tip[] }) {
  if (!tips || tips.length === 0) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="text-[0.7rem] text-stone-400 uppercase tracking-wider font-medium mb-3">
        Today&apos;s Tips
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tips.map((tip, i) => {
          const config = SEVERITY_CONFIG[tip.severity] ?? SEVERITY_CONFIG.info;
          const Icon = config.icon;

          return (
            <div
              key={tip.id || i}
              className={`bg-stone-100/30 border border-stone-200 rounded-lg p-3.5 border-l-2 ${config.border} transition-all duration-300 hover:border-stone-300 hover:bg-stone-100/40`}
              style={{ animationDelay: `${0.5 + i * 0.1}s` }}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider mb-1">
                    {CATEGORY_LABELS[tip.category] ?? tip.category.toUpperCase()}
                  </div>
                  <div className="text-sm text-stone-800 font-medium leading-snug">{tip.title}</div>
                  <div className="text-xs text-stone-500 mt-1 leading-relaxed">{tip.body}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
