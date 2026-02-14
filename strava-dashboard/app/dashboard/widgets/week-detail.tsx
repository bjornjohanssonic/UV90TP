"use client";

import type { Activity } from "@/types";
import { COLORS, getMonday, formatKm, formatTime, formatPace } from "@/lib/dashboard-helpers";
import styles from "./week-detail.module.css";

interface WeekDetailProps {
  activities: Activity[];
  selectedWeekStart: string;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_ICONS: Record<string, string> = {
  Run: "\u{1F3C3}",
  WeightTraining: "\u{1F3CB}\uFE0F",
  Ride: "\u{1F6B4}",
  Swim: "\u{1F3CA}",
  Walk: "\u{1F6B6}",
  Hike: "\u{1F97E}",
  Yoga: "\u{1F9D8}",
};

export default function WeekDetail({ activities, selectedWeekStart }: WeekDetailProps) {
  const monday = new Date(selectedWeekStart + "T00:00:00");
  const sundayEnd = new Date(monday);
  sundayEnd.setDate(sundayEnd.getDate() + 7);

  // Get all activities in the selected week
  const weekActivities = activities.filter((a) => {
    const d = new Date(a.start_date);
    return d >= monday && d < sundayEnd;
  });

  // Group by day of week (0=Mon, 6=Sun)
  const dayBuckets: Activity[][] = Array.from({ length: 7 }, () => []);
  for (const act of weekActivities) {
    const d = new Date(act.start_date);
    const dayIdx = (d.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
    dayBuckets[dayIdx].push(act);
  }

  // Format the week header
  const sun = new Date(monday);
  sun.setDate(sun.getDate() + 6);
  const weekHeader = `${monday.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })} \u2013 ${sun.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const isCurrentWeek = getMonday(today).toISOString().slice(0, 10) === selectedWeekStart;

  return (
    <div>
      <h2 className={styles.title}>
        Week Detail
        <span className={styles.titleDateRange}>
          {weekHeader}
        </span>
      </h2>
      <div className={styles.dayList}>
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
              className={styles.dayRow}
              style={{
                backgroundColor: isToday ? `${COLORS.primaryGreen}10` : COLORS.cardBg,
                border: isToday ? `2px solid ${COLORS.primaryGreen}` : `1px solid ${COLORS.border}`,
                opacity: isFuture && isCurrentWeek ? 0.5 : 1,
              }}
            >
              <div className={acts.length > 0 ? styles.dayHeaderWithActivities : styles.dayHeader}>
                <span
                  className={styles.dayName}
                  style={{ color: isToday ? COLORS.primaryGreen : COLORS.textMuted }}
                >
                  {dayName}
                </span>
                <span className={styles.dayDate}>
                  {dayDate.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                </span>
                {acts.length === 0 && isPast && (
                  <span className={styles.restDay}>Rest day</span>
                )}
                {acts.length === 0 && isFuture && isCurrentWeek && (
                  <span className={styles.restDay}>Upcoming</span>
                )}
                {isToday && (
                  <span className={styles.todayBadge}>
                    Today
                  </span>
                )}
              </div>
              {acts.length > 0 && (
                <div className={styles.activitiesList}>
                  {acts.map((act) => (
                    <div key={act.strava_id} className={styles.activityCard}>
                      <span className={styles.activityIcon}>{TYPE_ICONS[act.type] || "\u{1F3C5}"}</span>
                      <span className={styles.activityName}>
                        {act.name}
                      </span>
                      {act.distance > 0 && (
                        <span className={styles.activityDistance}>
                          {formatKm(act.distance)} km
                        </span>
                      )}
                      <span className={styles.activityTime}>
                        {formatTime(act.moving_time)}
                      </span>
                      {act.type === "Run" && act.distance > 0 && (
                        <span className={styles.activityPace}>
                          {formatPace(act.distance, act.moving_time)}/km
                        </span>
                      )}
                      {act.average_heartrate && (
                        <span className={styles.activityHr}>
                          {Math.round(act.average_heartrate)} bpm
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
