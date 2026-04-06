"use client";

import type { DailyBriefing as DailyBriefingType } from "@/types/coach";
import { Moon, Zap, Activity, Target, Flag } from "lucide-react";

const URGENCY_CONFIG: Record<string, { icon: typeof Moon; borderColor: string }> = {
  rest: { icon: Moon, borderColor: "border-l-stone-400" },
  easy: { icon: Activity, borderColor: "border-l-stone-400" },
  moderate: { icon: Zap, borderColor: "border-l-stone-500" },
  key_session: { icon: Target, borderColor: "border-l-stone-700" },
  race: { icon: Flag, borderColor: "border-l-stone-700" },
};

export function DailyBriefingCard({ briefing }: { briefing: DailyBriefingType | null }) {
  if (!briefing) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="text-stone-400 text-sm">Loading coach...</div>
      </div>
    );
  }

  const config = URGENCY_CONFIG[briefing.urgency] ?? URGENCY_CONFIG.moderate;
  const Icon = config.icon;

  return (
    <div
      className={`bg-white border border-stone-200 rounded-xl p-5 border-l-2 ${config.borderColor} transition-all duration-300 hover:border-stone-300`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-stone-100/60" data-tooltip={`Today's priority: ${briefing.urgency.replace("_", " ")}`}>
          <Icon className="w-4 h-4 text-stone-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-light text-stone-800 leading-relaxed">{briefing.headline}</p>
          <p className="mt-1.5 text-xs text-stone-500">{briefing.subtext}</p>
        </div>
      </div>
    </div>
  );
}
