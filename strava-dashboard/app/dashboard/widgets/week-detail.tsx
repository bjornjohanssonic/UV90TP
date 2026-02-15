"use client";

import type { Activity, WeekData } from "@/types";
import { getMonday, formatKm, formatTime, formatPace, formatTimeOfDay } from "@/lib/dashboard-helpers";

interface WeekDetailProps {
  activities: Activity[];
  selectedWeekStart: string;
  selectedActivityId: string | null;
  onSelectActivity: (activity: Activity) => void;
  onWeekChange: (weekStart: string) => void;
  weeks: WeekData[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_ABBREVS: Record<string, string> = {
  Run: "RUN",
  WeightTraining: "GYM",
  Ride: "RIDE",
  Swim: "SWIM",
  Walk: "WALK",
  Hike: "HIKE",
  Yoga: "YOGA",
};

export default function WeekDetail({ activities, selectedWeekStart, selectedActivityId, onSelectActivity, onWeekChange, weeks }: WeekDetailProps) {
  const monday = new Date(selectedWeekStart + "T00:00:00");
  const sundayEnd = new Date(monday);
  sundayEnd.setDate(sundayEnd.getDate() + 7);

  const weekActivities = activities.filter((a) => {
    const d = new Date(a.start_date);
    return d >= monday && d < sundayEnd;
  });

  const dayBuckets: Activity[][] = Array.from({ length: 7 }, () => []);
  for (const act of weekActivities) {
    const d = new Date(act.start_date);
    const dayIdx = (d.getDay() + 6) % 7;
    dayBuckets[dayIdx].push(act);
  }

  const sun = new Date(monday);
  sun.setDate(sun.getDate() + 6);
  const weekHeader = `${monday.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })} \u2013 ${sun.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const isCurrentWeek = getMonday(today).toISOString().slice(0, 10) === selectedWeekStart;

  // Navigation
  const currentIdx = weeks.findIndex((w) => w.weekStart === selectedWeekStart);
  const hasPrev = currentIdx < weeks.length - 1;
  const hasNext = currentIdx > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-neutral-500">
          Week Detail
          <span className="ml-2 text-neutral-600 normal-case tracking-normal">{weekHeader}</span>
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => hasPrev && onWeekChange(weeks[currentIdx + 1].weekStart)}
            disabled={!hasPrev}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:text-neutral-700 disabled:hover:bg-transparent transition-all border-none bg-transparent cursor-pointer disabled:cursor-not-allowed"
          >
            &larr;
          </button>
          <button
            onClick={() => hasNext && onWeekChange(weeks[currentIdx - 1].weekStart)}
            disabled={!hasNext}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:text-neutral-700 disabled:hover:bg-transparent transition-all border-none bg-transparent cursor-pointer disabled:cursor-not-allowed"
          >
            &rarr;
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {DAY_NAMES.map((dayName, dayIdx) => {
          const acts = dayBuckets[dayIdx];
          const dayDate = new Date(monday);
          dayDate.setDate(dayDate.getDate() + dayIdx);
          const dayStr = dayDate.toISOString().slice(0, 10);
          const isToday = dayStr === todayStr;
          const isPast = dayDate < today;
          const isFuture = !isToday && dayDate > today;

          return (
            <div
              key={dayIdx}
              className="rounded-lg transition-all"
              style={{
                backgroundColor: isToday ? "rgba(163,163,163,0.08)" : "rgba(163,163,163,0.03)",
                border: isToday ? "1px solid #525252" : "1px solid #262626",
                opacity: isFuture && isCurrentWeek ? 0.5 : 1,
                padding: acts.length > 0 ? "8px 12px" : "6px 12px",
              }}
            >
              <div className={`flex items-center gap-3 ${acts.length > 0 ? "mb-1.5" : ""}`}>
                <span className="text-xs font-medium w-8" style={{ color: isToday ? "#d4d4d4" : "#737373" }}>
                  {dayName}
                </span>
                <span className="text-[0.65rem] text-neutral-600">
                  {dayDate.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                </span>
                {acts.length === 0 && isPast && (
                  <span className="text-[0.65rem] text-neutral-700 ml-auto">Rest day</span>
                )}
                {acts.length === 0 && isFuture && isCurrentWeek && (
                  <span className="text-[0.65rem] text-neutral-700 ml-auto">Upcoming</span>
                )}
                {isToday && (
                  <span className="text-[0.55rem] uppercase tracking-wider font-medium text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded ml-auto">
                    Today
                  </span>
                )}
              </div>
              {acts.length > 0 && (
                <div className="flex flex-col gap-1 ml-11">
                  {acts.map((act) => {
                    const isSelected = act.strava_id === selectedActivityId;
                    const isRun = act.type === "Run";
                    return (
                      <div
                        key={act.strava_id}
                        className={`flex items-center gap-2 text-xs rounded px-2 py-1 -mx-2 transition-all ${
                          isRun ? "cursor-pointer hover:bg-neutral-800/60" : ""
                        }`}
                        style={{
                          borderLeft: isSelected ? "2px solid #d4d4d4" : "2px solid transparent",
                          backgroundColor: isSelected ? "rgba(163,163,163,0.08)" : undefined,
                        }}
                        onClick={() => isRun && onSelectActivity(act)}
                      >
                        <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-500 w-8">
                          {TYPE_ABBREVS[act.type] || act.type.slice(0, 4).toUpperCase()}
                        </span>
                        <span className={`truncate flex-1 min-w-0 ${isSelected ? "text-neutral-100" : "text-neutral-300"}`}>
                          {act.name}
                        </span>
                        <span className="text-neutral-600 text-[0.6rem] whitespace-nowrap">{formatTimeOfDay(act.start_date)}</span>
                        {act.distance > 0 && (
                          <span className="text-neutral-400 whitespace-nowrap">{formatKm(act.distance)} km</span>
                        )}
                        <span className="text-neutral-500 whitespace-nowrap">{formatTime(act.moving_time)}</span>
                        {act.type === "Run" && act.distance > 0 && (
                          <span className="text-neutral-500 whitespace-nowrap">
                            {formatPace(act.distance, act.moving_time)}/km
                          </span>
                        )}
                        {act.average_heartrate && (
                          <span className="text-neutral-600 whitespace-nowrap">
                            {Math.round(act.average_heartrate)} bpm
                          </span>
                        )}
                        {act.suffer_score && (
                          <span className="text-neutral-600 whitespace-nowrap text-[0.6rem]">
                            {Math.round(act.suffer_score)} effort
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
