"use client";

import { useRef, useState, useEffect } from "react";
import {
  COLORS, formatKm, formatTime, formatPace,
  type WeekData,
} from "@/lib/dashboard-helpers";

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
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <h2 style={{ color: COLORS.textDark, fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Weekly Breakdown</h2>
        {weeks.length > 4 && (
          <button onClick={onToggleShowAll} style={{
            backgroundColor: "transparent",
            color: COLORS.primaryGreen,
            border: `2px solid ${COLORS.primaryGreen}`,
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.7rem",
            cursor: "pointer",
            fontWeight: 600,
          }}>
            {showAllWeeks ? "Show less" : `Show all ${weeks.length} weeks`}
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {(showAllWeeks ? weeks : weeks.slice(0, 4)).map((w, i) => {
          const prevWeek = weeks[i + 1];
          const change = prevWeek && prevWeek.totalDistance > 0 ? ((w.totalDistance - prevWeek.totalDistance) / prevWeek.totalDistance) * 100 : 0;
          const isSelected = selectedWeekStart === w.weekStart;
          const isFirst = i === 0;
          return (
            <div
              key={w.weekStart}
              onClick={() => onSelectWeek?.(w.weekStart)}
              style={{
                backgroundColor: isSelected ? `${COLORS.primaryGreen}15` : isFirst ? COLORS.cardAccent : COLORS.cardBg,
                borderRadius: "12px",
                padding: "14px 18px",
                display: "grid",
                gridTemplateColumns: gridTemplate,
                alignItems: "center",
                gap: "8px",
                border: isSelected
                  ? `2px solid ${COLORS.primaryGreen}`
                  : isFirst
                    ? `2px solid ${COLORS.primaryGreen}`
                    : `2px solid ${COLORS.border}`,
                boxShadow: isFirst ? "0 3px 10px rgba(0,0,0,0.08)" : "0 2px 4px rgba(0,0,0,0.04)",
                cursor: onSelectWeek ? "pointer" : "default",
                transition: "background-color 0.15s",
              }}>
              <span style={{
                color: isFirst ? COLORS.textDark : COLORS.textMuted,
                fontSize: "0.85rem",
                fontWeight: isFirst ? 700 : 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {w.weekLabel}
              </span>
              <span style={{ color: COLORS.primaryGreen, fontSize: "0.9rem", fontWeight: 700 }}>
                {formatKm(w.totalDistance)} km
              </span>
              {cols.time && (
                <span style={{ color: COLORS.textDark, fontSize: "0.8rem" }}>{formatTime(w.totalTime)}</span>
              )}
              {cols.runs && (
                <span style={{ color: COLORS.textDark, fontSize: "0.8rem" }}>{w.runs} run{w.runs !== 1 ? "s" : ""}</span>
              )}
              {cols.pace && (
                <span style={{ color: COLORS.textDark, fontSize: "0.8rem" }}>{formatPace(w.totalDistance, w.totalTime)} /km</span>
              )}
              {cols.change && (
                prevWeek ? (
                  <span style={{
                    color: change >= 0 ? COLORS.success : COLORS.error,
                    fontSize: "0.8rem",
                    textAlign: "right",
                    fontWeight: 600,
                  }}>
                    {change >= 0 ? "↑" : "↓"}{Math.abs(change).toFixed(0)}%
                  </span>
                ) : (
                  <span style={{ color: COLORS.textLight, fontSize: "0.8rem", textAlign: "right" }}>—</span>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
