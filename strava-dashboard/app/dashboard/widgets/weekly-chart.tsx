import type { WeekData } from "@/types";
import { COLORS, formatKm } from "@/lib/dashboard-helpers";
import styles from "./weekly-chart.module.css";

interface WeeklyChartProps {
  last8: WeekData[];
  last8Targets: number[];
  maxDist: number;
}

export default function WeeklyChart({ last8, last8Targets, maxDist }: WeeklyChartProps) {
  return (
    <div>
      <h2 className={styles.title}>Weekly Distance</h2>
      <div className={styles.card}>
        <div className={styles.barsContainer}>
          {last8.map((w, i) => {
            const height = (w.totalDistance / maxDist) * 120;
            const targetH = last8Targets[i] > 0 ? (last8Targets[i] / maxDist) * 120 : 0;
            const isCurrentWeek = i === last8.length - 1;
            const metTarget = last8Targets[i] > 0 && w.totalDistance >= last8Targets[i];
            return (
              <div key={w.weekStart} className={styles.barColumn}>
                <span className={styles.barLabel}>{formatKm(w.totalDistance)}</span>
                {targetH > 0 && (
                  <div className={styles.targetLine} style={{ bottom: `${targetH}px` }} />
                )}
                <div
                  className={styles.bar}
                  style={{
                    height: `${Math.max(height, 4)}px`,
                    backgroundColor: metTarget
                      ? COLORS.success
                      : isCurrentWeek
                        ? COLORS.primaryGreen
                        : COLORS.textLight,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className={styles.labelsRow}>
          {last8.map((w) => (
            <div key={w.weekStart} className={styles.labelItem}>
              <span className={styles.labelText}>
                {new Date(w.weekStart).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
        {last8Targets.some((t) => t > 0) && (
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div className={styles.legendTargetLine} />
              <span className={styles.legendText}>Target</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendMetBox} />
              <span className={styles.legendText}>Met target</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
