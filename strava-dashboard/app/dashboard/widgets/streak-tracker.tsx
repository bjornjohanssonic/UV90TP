"use client";

import type { StreakData } from "@/types/coach";
import { Flame, Target, Trophy } from "lucide-react";

export function StreakTracker({ streaks }: { streaks: StreakData | null }) {
  if (!streaks) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="text-[0.7rem] text-stone-400 uppercase tracking-wider font-medium mb-3">Consistency</div>
        <div className="text-stone-400 text-sm">No data</div>
      </div>
    );
  }

  const isRecord = streaks.currentStreak > 0 && streaks.currentStreak >= streaks.longestStreak;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 h-full">
      <div className="text-[0.7rem] text-stone-400 uppercase tracking-wider font-medium mb-4">Consistency</div>

      <div className="space-y-4">
        {/* Current streak — hero */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-stone-100/60">
            <Flame className="w-4 h-4 text-stone-500" />
          </div>
          <div className="flex-1">
            <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider">Current Streak</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-light text-stone-800 tracking-tight">{streaks.currentStreak}</span>
              <span className="text-xs text-stone-500">weeks</span>
              {isRecord && (
                <span className="text-[0.6rem] uppercase tracking-wider text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                  PR
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Consistency */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-stone-100/60">
            <Target className="w-4 h-4 text-stone-500" />
          </div>
          <div className="flex-1">
            <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider">8-Week Consistency</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-stone-400 transition-all duration-700"
                  style={{ width: `${streaks.consistency}%` }}
                />
              </div>
              <span className="text-sm font-light text-stone-700">{streaks.consistency}%</span>
            </div>
          </div>
        </div>

        {/* Longest streak */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-stone-100/60">
            <Trophy className="w-4 h-4 text-stone-400" />
          </div>
          <div className="flex-1">
            <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider">Longest Streak</div>
            <div className="text-sm font-light text-stone-500">{streaks.longestStreak} weeks</div>
          </div>
        </div>
      </div>
    </div>
  );
}
