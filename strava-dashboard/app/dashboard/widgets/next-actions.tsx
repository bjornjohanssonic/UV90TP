import { COLORS, type NextAction } from "@/lib/dashboard-helpers";

interface NextActionsProps {
  actions: NextAction[];
}

export default function NextActions({ actions }: NextActionsProps) {
  return (
    <div style={{
      backgroundColor: COLORS.cardAccent,
      borderRadius: "20px",
      overflow: "hidden",
      border: `3px solid ${COLORS.primaryGreen}`,
      boxShadow: "0 6px 20px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)",
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.primaryGreen} 0%, ${COLORS.accentGreen} 100%)`,
        padding: "16px 24px",
      }}>
        <h2 style={{
          color: COLORS.cardAccent,
          fontSize: "1.3rem",
          fontWeight: 700,
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <span style={{ fontSize: "1.5rem" }}>✓</span>
          Next Actions
        </h2>
      </div>

      {/* Actions list */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {actions.map((action, i) => {
          const priorityColors = {
            high: { bg: COLORS.cardAlt, border: COLORS.error, text: COLORS.error },
            medium: { bg: COLORS.cardAlt, border: COLORS.warmGold, text: COLORS.warmGold },
            low: { bg: COLORS.cardAlt, border: COLORS.accentGreen, text: COLORS.accentGreen },
          };
          const colors = priorityColors[action.priority];

          return (
            <div key={i} style={{
              backgroundColor: colors.bg,
              borderRadius: "14px",
              padding: "18px",
              border: `2px solid ${colors.border}`,
              display: "flex",
              gap: "16px",
              alignItems: "flex-start",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}>
              <span style={{ fontSize: "2rem", lineHeight: 1 }}>{action.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "8px",
                }}>
                  <div style={{
                    color: COLORS.textDark,
                    fontWeight: 700,
                    fontSize: "1rem",
                    lineHeight: 1.4,
                  }}>
                    {action.action}
                  </div>
                  <span style={{
                    color: colors.text,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "4px 10px",
                    backgroundColor: `${colors.text}20`,
                    borderRadius: "8px",
                    marginLeft: "12px",
                    whiteSpace: "nowrap",
                    border: `1px solid ${colors.text}40`,
                  }}>
                    {action.priority}
                  </span>
                </div>
                <div style={{
                  color: COLORS.textMuted,
                  fontSize: "0.88rem",
                  lineHeight: 1.5,
                }}>
                  {action.reason}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
