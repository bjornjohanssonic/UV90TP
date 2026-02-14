import type { Plan } from "@/types";
import { COLORS } from "@/lib/dashboard-helpers";
import styles from "./race-day.module.css";

interface RaceDayProps {
  plan: Plan;
  daysToRace: number;
}

export default function RaceDay({ plan, daysToRace }: RaceDayProps) {
  return (
    <div className={styles.container}>
      <div>
        <span className={styles.label}>Race Day</span>
        <div className={styles.raceName}>
          🏁 {plan.race_name || `${plan.race_distance_km}km Ultra`}
        </div>
        <div className={styles.raceDate}>
          {new Date(plan.race_date + "T00:00:00").toLocaleDateString("sv-SE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>
      <div className={styles.rightSection}>
        <div
          className={styles.countdown}
          style={{
            backgroundColor: daysToRace > 0 ? COLORS.warmGold : COLORS.textMuted,
          }}
        >
          {daysToRace > 0 ? daysToRace : "Past"}
        </div>
        <div className={styles.countdownLabel}>
          {daysToRace > 0 ? "days to go" : "race completed"}
        </div>
      </div>
    </div>
  );
}
