"use client";

import {
  COLORS, getMonday, formatKm, formatTime, formatPace,
  type Activity,
} from "@/lib/dashboard-helpers";

interface WeekDetailProps {
  activities: Activity[];
  selectedWeekStart: string;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_ICONS: Record<string, string> = {
  Run: "🏃",
  WeightTraining: "🏋️",
  Ride: "🚴",
  Swim: "🏊",
  Walk: "🚶",
  Hike: "🥾",
  Yoga: "🧘",
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
  const weekHeader = `${monday.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })} – ${sun.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const isCurrentWeek = getMonday(today).toISOString().slice(0, 10) === selectedWeekStart;

  return (
    <div>
      <h2 style={{ color: COLORS.textDark, fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>
        Week Detail
        <span style={{ color: COLORS.textMuted, fontSize: "0.85rem", fontWeight: 500, marginLeft: "8px" }}>
          {weekHeader}
        </span>
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {DAY_NAMES.map((dayName, dayIdx) => {
          const acts = dayBuckets[dayIdx];
          const dayDate = new Date(monday);
          dayDate.setDate(dayDate.getDate() + dayIdx);
          const dayStr = dayDate.toISOString().slice(0, 10);
          const isToday = dayStr === todayStr;
          const isPast = dayDate < today;
          const isFuture = !isToday && dayDate > today;

          return (
            <div key={dayIdx} style={{
              backgroundColor: isToday ? `${COLORS.primaryGreen}10` : COLORS.cardBg,
              borderRadius: "10px",
              padding: "10px 14px",
              border: isToday ? `2px solid ${COLORS.primaryGreen}` : `1px solid ${COLORS.border}`,
              opacity: isFuture && isCurrentWeek ? 0.5 : 1,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: acts.length > 0 ? "8px" : 0,
              }}>
                <span style={{
                  color: isToday ? COLORS.primaryGreen : COLORS.textMuted,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  minWidth: "32px",
                }}>
                  {dayName}
                </span>
                <span style={{
                  color: COLORS.textLight,
                  fontSize: "0.7rem",
                }}>
                  {dayDate.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                </span>
                {acts.length === 0 && isPast && (
                  <span style={{ color: COLORS.textLight, fontSize: "0.75rem", fontStyle: "italic" }}>Rest day</span>
                )}
                {acts.length === 0 && isFuture && isCurrentWeek && (
                  <span style={{ color: COLORS.textLight, fontSize: "0.75rem", fontStyle: "italic" }}>Upcoming</span>
                )}
                {isToday && (
                  <span style={{
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    color: COLORS.cardAccent,
                    backgroundColor: COLORS.primaryGreen,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}>Today</span>
                )}
              </div>
              {acts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginLeft: "42px" }}>
                  {acts.map((act) => (
                    <div key={act.strava_id} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 10px",
                      backgroundColor: COLORS.cardAlt,
                      borderRadius: "8px",
                      flexWrap: "wrap",
                    }}>
                      <span style={{ fontSize: "1rem" }}>{TYPE_ICONS[act.type] || "🏅"}</span>
                      <span style={{
                        color: COLORS.textDark,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        flex: 1,
                        minWidth: "80px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>{act.name}</span>
                      {act.distance > 0 && (
                        <span style={{ color: COLORS.primaryGreen, fontSize: "0.8rem", fontWeight: 700 }}>
                          {formatKm(act.distance)} km
                        </span>
                      )}
                      <span style={{ color: COLORS.textMuted, fontSize: "0.75rem" }}>
                        {formatTime(act.moving_time)}
                      </span>
                      {act.type === "Run" && act.distance > 0 && (
                        <span style={{ color: COLORS.textMuted, fontSize: "0.75rem" }}>
                          {formatPace(act.distance, act.moving_time)}/km
                        </span>
                      )}
                      {act.average_heartrate && (
                        <span style={{ color: COLORS.error, fontSize: "0.75rem" }}>
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
