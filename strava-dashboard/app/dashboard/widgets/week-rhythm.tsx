"use client";

import type { Activity } from "@/types";
import type { PlanWeek } from "@/types/plan";
import { toLocalDateStr, getMonday } from "@/lib/dashboard-helpers";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayData {
  label: string;
  distanceKm: number;
  intensity: number; // 0-1, based on pace relative to average
  isToday: boolean;
  isFuture: boolean;
  runCount: number;
}

export function WeekRhythm({
  activities,
  planWeek,
  weekStart,
}: {
  activities: Activity[];
  planWeek: PlanWeek | null;
  weekStart: string;
}) {
  const runs = activities.filter((a) => a.type === "Run");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(today);
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  // Build 7 days of data
  const monday = new Date(weekStart + "T00:00:00");
  const days: DayData[] = [];

  // Calculate average pace for intensity normalization
  const recentRuns = runs.slice(0, 20);
  const avgPace =
    recentRuns.length > 0
      ? recentRuns.reduce((s, r) => s + (r.distance > 0 ? r.moving_time / (r.distance / 1000) : 0), 0) /
        recentRuns.length
      : 360; // 6:00/km default

  let maxDistance = 0;

  for (let d = 0; d < 7; d++) {
    const date = new Date(monday);
    date.setDate(date.getDate() + d);
    const dateStr = toLocalDateStr(date);
    const dayRuns = runs.filter((r) => r.start_date.slice(0, 10) === dateStr);
    const distanceKm = dayRuns.reduce((s, r) => s + r.distance / 1000, 0);

    // Intensity: faster than average = higher
    let intensity = 0.5;
    if (dayRuns.length > 0) {
      const dayPace = dayRuns.reduce((s, r) => s + r.moving_time, 0) / Math.max(distanceKm, 0.1) / 1000;
      intensity = avgPace > 0 ? Math.min(Math.max(avgPace / Math.max(dayPace, 1), 0.3), 1) : 0.5;
    }

    maxDistance = Math.max(maxDistance, distanceKm);

    days.push({
      label: DAY_LABELS[d],
      distanceKm,
      intensity,
      isToday: dateStr === todayStr,
      isFuture: date > today,
      runCount: dayRuns.length,
    });
  }

  // Daily target line
  const weeklyTargetKm = planWeek?.target_volume_km ?? 0;
  const weeklyActualKm = days.reduce((s, d) => s + d.distanceKm, 0);
  const remainingKm = Math.max(weeklyTargetKm - weeklyActualKm, 0);
  const daysRemaining = days.filter((d) => d.isFuture || d.isToday).filter((d) => d.distanceKm === 0).length;
  const dailyTargetKm = daysRemaining > 0 ? remainingKm / daysRemaining : 0;

  // Scale: use max of (maxDistance, dailyTarget, 15km) for bar heights
  const scale = Math.max(maxDistance, dailyTargetKm, 15);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="text-[0.7rem] text-stone-400 uppercase tracking-wider font-medium mb-4">Week Rhythm</div>

      <div className="flex items-end gap-2 h-28 relative">
        {/* Daily target dashed line */}
        {dailyTargetKm > 0 && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-stone-300"
            style={{ bottom: `${(dailyTargetKm / scale) * 100}%` }}
          >
            <span className="absolute right-0 -top-3.5 text-[0.55rem] text-stone-400">
              {dailyTargetKm.toFixed(0)}km/day
            </span>
          </div>
        )}

        {days.map((day, i) => {
          const heightPct = day.distanceKm > 0 ? (day.distanceKm / scale) * 100 : 0;
          const opacity = day.isFuture ? 0.2 : day.distanceKm > 0 ? 0.3 + day.intensity * 0.5 : 0.08;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              {/* Bar */}
              <div className="w-full flex-1 flex items-end justify-center">
                {day.distanceKm > 0 ? (
                  <div
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: `rgba(120, 113, 100, ${opacity})`,
                      animationDelay: `${i * 0.06}s`,
                    }}
                  />
                ) : (
                  <div
                    className="w-full rounded-sm border border-dashed"
                    style={{
                      height: "4px",
                      borderColor: day.isFuture ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.1)",
                    }}
                  />
                )}
              </div>

              {/* Distance label */}
              <div className="text-[0.6rem] text-stone-500 h-3">
                {day.distanceKm > 0 ? `${day.distanceKm.toFixed(0)}` : ""}
              </div>

              {/* Day label */}
              <div
                className={`text-[0.6rem] uppercase tracking-wider font-medium ${
                  day.isToday
                    ? "text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded"
                    : day.isFuture
                      ? "text-stone-300"
                      : "text-stone-500"
                }`}
              >
                {day.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
