import type { NextAction } from "@/types";
import { COLORS } from "@/lib/dashboard-helpers";
import styles from "./next-actions.module.css";

interface NextActionsProps {
  actions: NextAction[];
}

export default function NextActions({ actions }: NextActionsProps) {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>
          <span className={styles.headerIcon}>&#x2713;</span>
          Next Actions
        </h2>
      </div>

      {/* Actions list */}
      <div className={styles.actionsList}>
        {actions.map((action, i) => {
          const priorityColors = {
            high: { bg: COLORS.cardAlt, border: COLORS.error, text: COLORS.error },
            medium: { bg: COLORS.cardAlt, border: COLORS.warmGold, text: COLORS.warmGold },
            low: { bg: COLORS.cardAlt, border: COLORS.accentGreen, text: COLORS.accentGreen },
          };
          const colors = priorityColors[action.priority];

          return (
            <div
              key={i}
              className={styles.actionCard}
              style={{ border: `2px solid ${colors.border}` }}
            >
              <span className={styles.actionIcon}>{action.icon}</span>
              <div className={styles.actionContent}>
                <div className={styles.actionHeader}>
                  <div className={styles.actionTitle}>{action.action}</div>
                  <span
                    className={styles.priorityBadge}
                    style={{
                      color: colors.text,
                      backgroundColor: `${colors.text}20`,
                      border: `1px solid ${colors.text}40`,
                    }}
                  >
                    {action.priority}
                  </span>
                </div>
                <div className={styles.actionReason}>{action.reason}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
