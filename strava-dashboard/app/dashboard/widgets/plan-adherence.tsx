"use client";

import type { PlanAdherence as PlanAdherenceType } from "@/types/coach";
import { TrendingUp, CheckCircle, ArrowDown, BarChart3 } from "lucide-react";

export function PlanAdherenceCard({ adherence }: { adherence: PlanAdherenceType | null }) {
  if (!adherence) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="text-[0.7rem] text-stone-400 uppercase tracking-wider font-medium mb-3">Plan Adherence</div>
        <div className="text-stone-400 text-sm">No plan data available</div>
      </div>
    );
  }

  const insights = [
    { icon: BarChart3, label: "Overall", value: `${adherence.overallPercent}%`, key: "overall", tooltip: "Percentage of completed weeks where actual volume reached at least 90% of target" },
    { icon: TrendingUp, label: "Long run hit rate", value: adherence.longRunHitRate, key: "longrun", tooltip: "Weeks where you completed the planned long run (volume reached 80%+ of target)" },
    { icon: ArrowDown, label: "Recovery compliance", value: adherence.recoveryCompliance, key: "recovery", tooltip: "How closely you followed recovery week targets — staying near 65% of build volume helps adaptation" },
    { icon: CheckCircle, label: "Build progression", value: adherence.buildProgression, key: "build", tooltip: "Average week-over-week volume increase during build phases (excludes current week)" },
  ];

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 h-full">
      <div className="text-[0.7rem] text-stone-400 uppercase tracking-wider font-medium mb-4">Plan Adherence</div>

      <div className="space-y-3">
        {insights.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-3" title={item.tooltip}>
              <Icon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <div className="flex-1 text-xs text-stone-500">{item.label}</div>
              <div className="text-sm font-light text-stone-800">{item.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
