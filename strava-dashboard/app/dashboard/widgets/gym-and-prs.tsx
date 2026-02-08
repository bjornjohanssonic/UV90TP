import {
  COLORS, formatTime,
  type Activity, type PersonalRecord,
} from "@/lib/dashboard-helpers";

interface GymAndPRsProps {
  gymThisWeek: Activity[];
  prs: PersonalRecord[];
}

export default function GymAndPRs({ gymThisWeek, prs }: GymAndPRsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
      {/* Gym this week */}
      <div style={{
        backgroundColor: COLORS.cardBg,
        borderRadius: "12px",
        padding: "18px",
        border: `2px solid ${COLORS.border}`,
      }}>
        <h2 style={{ color: COLORS.textDark, fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
          🏋️ Gym This Week
          <span style={{ color: COLORS.textMuted, fontWeight: 600, fontSize: "0.8rem", marginLeft: "8px" }}>
            ({gymThisWeek.length})
          </span>
        </h2>
        {gymThisWeek.length === 0 && (
          <p style={{ color: COLORS.textLight, fontSize: "0.85rem", margin: 0 }}>No gym sessions yet.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {gymThisWeek.map((g) => (
            <div key={g.strava_id} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px",
              backgroundColor: `${COLORS.accentGreen}10`,
              borderRadius: "6px",
            }}>
              <span style={{ color: COLORS.textDark, fontSize: "0.8rem", fontWeight: 500 }}>{g.name}</span>
              <span style={{ color: COLORS.textMuted, fontSize: "0.8rem" }}>{formatTime(g.moving_time)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PRs */}
      <div style={{
        backgroundColor: COLORS.cardBg,
        borderRadius: "12px",
        padding: "18px",
        border: `2px solid ${COLORS.border}`,
      }}>
        <h2 style={{ color: COLORS.textDark, fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
          🏆 Personal Records
        </h2>
        {prs.length === 0 && (
          <p style={{ color: COLORS.textLight, fontSize: "0.85rem", margin: 0 }}>No records yet.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {prs.slice(0, 4).map((pr) => (
            <div key={pr.label} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px",
              backgroundColor: `${COLORS.warmGold}10`,
              borderRadius: "6px",
            }}>
              <span style={{ color: COLORS.textMuted, fontSize: "0.8rem" }}>{pr.label}</span>
              <span style={{ color: COLORS.warmGold, fontSize: "0.85rem", fontWeight: 700 }}>{pr.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
