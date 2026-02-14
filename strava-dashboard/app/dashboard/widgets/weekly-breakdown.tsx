"use client";

import { useRef, useState, useEffect } from "react";
import type { WeekData } from "@/types";
import { COLORS, formatKm, formatTime, formatPace } from "@/lib/dashboard-helpers";
import styles from "./weekly-breakdown.module.css";

interface WeeklyBreakdownProps {
  weeks: WeekData[];
  showAllWeeks: boolean;
  onToggleShowAll: () => void;
  selectedWeekStart?: string | null;
  onSelectWeek?: (weekStart: string) => void;
}

// Breakpoints for hiding columns (cumulative widths in px)
// Full: weekLabel(140) + distance(70) + time(60) + runs(45) + pace(65) + change(60) = 440
// Tight: hide change < 380, hide pace < 320, hide runs < 270, hide time < 210
type VisibleCols = { time: boolean; runs: boolean; pace: boolean; change: boolean };

function getVisibleCols(width: number): VisibleCols {
  return {
    time: width >= 360,
    runs: width >= 310,
    pace: width >= 400,
    change: width >= 460,
  };
}

function buildGridTemplate(cols: VisibleCols): string {
  const parts = ["1fr", "70px"];
  if (cols.time) parts.push("60px");
  if (cols.runs) parts.push("45px");
  if (cols.pace) parts.push("65px");
  if (cols.change) parts.push("60px");
  return parts.join(" ");
}

export default function WeeklyBreakdown({
  weeks,
  showAllWeeks,
  onToggleShowAll,
  selectedWeekStart,
  onSelectWeek,
}: WeeklyBreakdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cols = getVisibleCols(containerWidth);
  const gridTemplate = buildGridTemplate(cols);

  return (
    <div ref={containerRef}>
      <div className={styles.header}>
        <h2 className={styles.title}>Weekly Breakdown</h2>
        {weeks.length > 4 && (
          <button onClick={onToggleShowAll} className={styles.toggleButton}>
            {showAllWeeks ? "Show less" : `Show all ${weeks.length} weeks`}
          </button>
        )}
      </div>
      <div className={styles.weekList}>
        {(showAllWeeks ? weeks : weeks.slice(0, 4)).map((w, i) => {
          const prevWeek = weeks[i + 1];
          const change =
            prevWeek && prevWeek.totalDistance > 0
              ? ((w.totalDistance - prevWeek.totalDistance) / prevWeek.totalDistance) * 100
              : 0;
          const isSelected = selectedWeekStart === w.weekStart;
          const isFirst = i === 0;
          return (
            <div
              key={w.weekStart}
              onClick={() => onSelectWeek?.(w.weekStart)}
              className={styles.weekRow}
              style={{
                backgroundColor: isSelected ? `${COLORS.primaryGreen}15` : isFirst ? COLORS.cardAccent : COLORS.cardBg,
                gridTemplateColumns: gridTemplate,
                border: isSelected
                  ? `2px solid ${COLORS.primaryGreen}`
                  : isFirst
                    ? `2px solid ${COLORS.primaryGreen}`
                    : `2px solid ${COLORS.border}`,
                boxShadow: isFirst ? "0 3px 10px rgba(0,0,0,0.08)" : "0 2px 4px rgba(0,0,0,0.04)",
                cursor: onSelectWeek ? "pointer" : "default",
              }}
            >
              <span
                className={styles.weekLabel}
                style={{
                  color: isFirst ? COLORS.textDark : COLORS.textMuted,
                  fontWeight: isFirst ? 700 : 500,
                }}
              >
                {w.weekLabel}
              </span>
              <span className={styles.distance}>
                {formatKm(w.totalDistance)} km
              </span>
              {cols.time && (
                <span className={styles.time}>{formatTime(w.totalTime)}</span>
              )}
              {cols.runs && (
                <span className={styles.runs}>
                  {w.runs} run{w.runs !== 1 ? "s" : ""}
                </span>
              )}
              {cols.pace && (
                <span className={styles.pace}>
                  {formatPace(w.totalDistance, w.totalTime)} /km
                </span>
              )}
              {cols.change &&
                (prevWeek ? (
                  <span
                    className={styles.change}
                    style={{ color: change >= 0 ? COLORS.success : COLORS.error }}
                  >
                    {change >= 0 ? "\u2191" : "\u2193"}
                    {Math.abs(change).toFixed(0)}%
                  </span>
                ) : (
                  <span className={styles.noChange}>&mdash;</span>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
