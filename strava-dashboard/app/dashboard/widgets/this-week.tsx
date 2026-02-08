import {
  COLORS, PHASE_COLORS, PHASE_LABELS,
  formatKm, formatTime, formatPace,
  type WeekData, type PlanWeek,
} from "@/lib/dashboard-helpers";

interface ThisWeekProps {
  currentWeek: WeekData;
  currentPlanWeek: PlanWeek | null;
  weekChange: number;
}

export default function ThisWeek({ currentWeek, currentPlanWeek, weekChange }: ThisWeekProps) {
  return (
    <div style={{
      backgroundColor: COLORS.cardAccent,
      borderRadius: "20px",
      overflow: "hidden",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
      border: `3px solid ${COLORS.border}`,
    }}>
      {/* Header bar */}
      <div style={{
        background: currentPlanWeek
          ? `linear-gradient(135deg, ${PHASE_COLORS[currentPlanWeek.phase]} 0%, ${PHASE_COLORS[currentPlanWeek.phase]}dd 100%)`
          : `linear-gradient(135deg, ${COLORS.primaryGreen} 0%, ${COLORS.accentGreen} 100%)`,
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h2 style={{ color: COLORS.cardAccent, fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>
          This Week
        </h2>
        {currentPlanWeek && (
          <span style={{
            color: COLORS.cardAccent,
            fontSize: "0.85rem",
            fontWeight: 600,
            padding: "6px 14px",
            backgroundColor: "rgba(255,255,255,0.25)",
            borderRadius: "12px",
          }}>
            {PHASE_LABELS[currentPlanWeek.phase]}
            {currentPlanWeek.cycle_number ? ` · Cycle ${currentPlanWeek.cycle_number}` : ""}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
          <h2 style={{ color: COLORS.textDark, fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
            This Week
            {currentPlanWeek && (
              <span style={{
                color: PHASE_COLORS[currentPlanWeek.phase],
                fontSize: "0.8rem",
                fontWeight: 600,
                marginLeft: "10px",
                padding: "4px 10px",
                backgroundColor: `${PHASE_COLORS[currentPlanWeek.phase]}15`,
                borderRadius: "12px",
              }}>
                {PHASE_LABELS[currentPlanWeek.phase]}
                {currentPlanWeek.cycle_number ? ` · Cycle ${currentPlanWeek.cycle_number}` : ""}
              </span>
            )}
          </h2>
          <span style={{
            color: weekChange >= 0 ? COLORS.success : COLORS.error,
            fontSize: "0.85rem",
            fontWeight: 700,
            padding: "4px 8px",
            backgroundColor: weekChange >= 0 ? `${COLORS.success}15` : `${COLORS.error}15`,
            borderRadius: "6px",
          }}>
            {weekChange >= 0 ? "↑" : "↓"} {Math.abs(weekChange).toFixed(0)}%
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: currentPlanWeek ? "repeat(auto-fit, minmax(100px, 1fr))" : "repeat(auto-fit, minmax(110px, 1fr))",
          gap: "14px",
        }}>
          {currentPlanWeek && (
            <div style={{
              backgroundColor: COLORS.cardAlt,
              padding: "14px",
              borderRadius: "12px",
              border: `2px solid ${PHASE_COLORS[currentPlanWeek.phase]}40`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ color: COLORS.textMuted, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Target</div>
              <div style={{ color: PHASE_COLORS[currentPlanWeek.phase], fontSize: "1.3rem", fontWeight: 700 }}>{currentPlanWeek.target_volume_km} km</div>
            </div>
          )}
          {currentPlanWeek && currentPlanWeek.long_run_km > 0 && (
            <div style={{
              backgroundColor: COLORS.cardAlt,
              padding: "14px",
              borderRadius: "12px",
              border: `2px solid ${COLORS.warmGold}40`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ color: COLORS.textMuted, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Long Run</div>
              <div style={{ color: COLORS.warmGold, fontSize: "1.3rem", fontWeight: 700 }}>
                {currentPlanWeek.long_run_km} km
                {currentPlanWeek.back_to_back ? <span style={{ fontSize: "0.65rem", color: COLORS.error, marginLeft: "6px", fontWeight: 700 }}>B2B</span> : null}
              </div>
            </div>
          )}
          {[
            { label: "Distance", value: `${formatKm(currentWeek.totalDistance)} km`, color: COLORS.primaryGreen },
            { label: "Time", value: formatTime(currentWeek.totalTime), color: COLORS.accentGreen },
            { label: "Runs", value: String(currentWeek.runs), color: COLORS.darkGold },
            { label: "Avg Pace", value: `${formatPace(currentWeek.totalDistance, currentWeek.totalTime)} /km`, color: COLORS.textDark },
            { label: "Longest", value: `${formatKm(currentWeek.longestRun)} km`, color: COLORS.warmGold },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: "14px",
              borderRadius: "12px",
              backgroundColor: COLORS.cardAlt,
              border: `2px solid ${COLORS.border}`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ color: COLORS.textMuted, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{stat.label}</div>
              <div style={{ color: stat.color, fontSize: "1.3rem", fontWeight: 700 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Target progress bar */}
        {currentPlanWeek && (
          <div style={{
            backgroundColor: COLORS.cardAlt,
            borderRadius: "12px",
            height: "14px",
            overflow: "hidden",
            marginTop: "20px",
            border: `2px solid ${COLORS.border}`,
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              width: `${Math.min(100, (currentWeek.totalDistance / (currentPlanWeek.target_volume_km * 1000)) * 100)}%`,
              height: "100%",
              backgroundColor: currentWeek.totalDistance >= currentPlanWeek.target_volume_km * 1000 ? COLORS.success : PHASE_COLORS[currentPlanWeek.phase],
              transition: "width 0.4s ease",
              boxShadow: "0 0 8px rgba(0,0,0,0.1)",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
