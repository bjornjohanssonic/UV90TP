import type { Activity } from "@/types";
import { COLORS, formatKm, formatTime, formatPace, formatDate } from "@/lib/dashboard-helpers";
import styles from "./recent-runs.module.css";

interface RecentRunsProps {
  runs: Activity[];
}

export default function RecentRuns({ runs }: RecentRunsProps) {
  return (
    <div>
      <h2 className={styles.title}>Recent Runs</h2>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <span>Date</span>
          <span>Name</span>
          <span>Distance</span>
          <span>Time</span>
          <span>Pace</span>
          <span>HR</span>
        </div>
        {runs.slice(0, 20).map((act, idx) => (
          <div
            key={act.strava_id}
            className={styles.dataRow}
            style={{
              backgroundColor: idx % 2 === 0 ? COLORS.cardBg : `${COLORS.cardAlt}80`,
              borderBottom: idx < 19 ? `1px solid ${COLORS.border}` : "none",
            }}
          >
            <span className={styles.dateCell}>{formatDate(act.start_date)}</span>
            <span className={styles.nameCell}>{act.name}</span>
            <span className={styles.distanceCell}>{formatKm(act.distance)} km</span>
            <span className={styles.timeCell}>{formatTime(act.moving_time)}</span>
            <span className={styles.paceCell}>{formatPace(act.distance, act.moving_time)} /km</span>
            <span className={act.average_heartrate ? `${styles.hrCell} ${styles.hrActive}` : `${styles.hrCell} ${styles.hrInactive}`}>
              {act.average_heartrate ? Math.round(act.average_heartrate) : "\u2014"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
