import type { Activity, PersonalRecord } from "@/types";
import { COLORS, formatTime } from "@/lib/dashboard-helpers";
import styles from "./gym-and-prs.module.css";

interface GymAndPRsProps {
  gymThisWeek: Activity[];
  prs: PersonalRecord[];
}

export default function GymAndPRs({ gymThisWeek, prs }: GymAndPRsProps) {
  return (
    <div className={styles.grid}>
      {/* Gym this week */}
      <div className={styles.card}>
        <h2 className={styles.heading}>
          🏋️ Gym This Week
          <span className={styles.headingCount}>
            ({gymThisWeek.length})
          </span>
        </h2>
        {gymThisWeek.length === 0 && (
          <p className={styles.emptyText}>No gym sessions yet.</p>
        )}
        <div className={styles.list}>
          {gymThisWeek.map((g) => (
            <div
              key={g.strava_id}
              className={styles.listItem}
              style={{ backgroundColor: `${COLORS.accentGreen}10` }}
            >
              <span className={styles.gymName}>{g.name}</span>
              <span className={styles.gymTime}>{formatTime(g.moving_time)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PRs */}
      <div className={styles.card}>
        <h2 className={styles.heading}>
          🏆 Personal Records
        </h2>
        {prs.length === 0 && <p className={styles.emptyText}>No records yet.</p>}
        <div className={styles.list}>
          {prs.slice(0, 4).map((pr) => (
            <div
              key={pr.label}
              className={styles.listItem}
              style={{ backgroundColor: `${COLORS.warmGold}10` }}
            >
              <span className={styles.prLabel}>{pr.label}</span>
              <span className={styles.prValue}>{pr.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
