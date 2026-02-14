import type { WeekData, PlanWeek } from "@/types";
import { COLORS, PHASE_COLORS, PHASE_LABELS, formatKm, formatTime, formatPace } from "@/lib/dashboard-helpers";
import styles from "./this-week.module.css";

interface ThisWeekProps {
  currentWeek: WeekData;
  currentPlanWeek: PlanWeek | null;
  weekChange: number;
}

export default function ThisWeek({ currentWeek, currentPlanWeek, weekChange }: ThisWeekProps) {
  return (
    <div className={styles.container}>
      {/* Header bar - DYNAMIC gradient color based on phase */}
      <div
        className={styles.header}
        style={{
          background: currentPlanWeek
            ? `linear-gradient(135deg, ${PHASE_COLORS[currentPlanWeek.phase]} 0%, ${PHASE_COLORS[currentPlanWeek.phase]}dd 100%)`
            : `linear-gradient(135deg, ${COLORS.primaryGreen} 0%, ${COLORS.accentGreen} 100%)`,
        }}
      >
        <h2 className={styles.headerTitle}>This Week</h2>
        {currentPlanWeek && (
          <span className={styles.headerBadge}>
            {PHASE_LABELS[currentPlanWeek.phase]}
            {currentPlanWeek.cycle_number ? ` · Cycle ${currentPlanWeek.cycle_number}` : ""}
          </span>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <h2 className={styles.contentTitle}>
            This Week
            {currentPlanWeek && (
              <span
                className={styles.phaseBadge}
                style={{
                  color: PHASE_COLORS[currentPlanWeek.phase],
                  backgroundColor: `${PHASE_COLORS[currentPlanWeek.phase]}15`,
                }}
              >
                {PHASE_LABELS[currentPlanWeek.phase]}
                {currentPlanWeek.cycle_number ? ` · Cycle ${currentPlanWeek.cycle_number}` : ""}
              </span>
            )}
          </h2>
          <span
            className={styles.weekChangeBadge}
            style={{
              color: weekChange >= 0 ? COLORS.success : COLORS.error,
              backgroundColor: weekChange >= 0 ? `${COLORS.success}15` : `${COLORS.error}15`,
            }}
          >
            {weekChange >= 0 ? "\u2191" : "\u2193"} {Math.abs(weekChange).toFixed(0)}%
          </span>
        </div>

        <div className={`${styles.statsGrid} ${currentPlanWeek ? styles.statsGridWithPlan : styles.statsGridDefault}`}>
          {currentPlanWeek && (
            <div
              className={styles.planStatCard}
              style={{ border: `2px solid ${PHASE_COLORS[currentPlanWeek.phase]}40` }}
            >
              <div className={styles.statLabel}>Target</div>
              <div className={styles.statValue} style={{ color: PHASE_COLORS[currentPlanWeek.phase] }}>
                {currentPlanWeek.target_volume_km} km
              </div>
            </div>
          )}
          {currentPlanWeek && currentPlanWeek.long_run_km > 0 && (
            <div
              className={styles.planStatCard}
              style={{ border: `2px solid ${COLORS.warmGold}40` }}
            >
              <div className={styles.statLabel}>Long Run</div>
              <div className={styles.statValue} style={{ color: COLORS.warmGold }}>
                {currentPlanWeek.long_run_km} km
                {currentPlanWeek.back_to_back ? (
                  <span className={styles.b2bLabel}>B2B</span>
                ) : null}
              </div>
            </div>
          )}
          {[
            { label: "Distance", value: `${formatKm(currentWeek.totalDistance)} km`, color: COLORS.primaryGreen },
            { label: "Time", value: formatTime(currentWeek.totalTime), color: COLORS.accentGreen },
            { label: "Runs", value: String(currentWeek.runs), color: COLORS.darkGold },
            {
              label: "Avg Pace",
              value: `${formatPace(currentWeek.totalDistance, currentWeek.totalTime)} /km`,
              color: COLORS.textDark,
            },
            { label: "Longest", value: `${formatKm(currentWeek.longestRun)} km`, color: COLORS.warmGold },
          ].map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statValue} style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Target progress bar - DYNAMIC width and color */}
        {currentPlanWeek && (
          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{
                width: `${Math.min(100, (currentWeek.totalDistance / (currentPlanWeek.target_volume_km * 1000)) * 100)}%`,
                backgroundColor:
                  currentWeek.totalDistance >= currentPlanWeek.target_volume_km * 1000
                    ? COLORS.success
                    : PHASE_COLORS[currentPlanWeek.phase],
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
