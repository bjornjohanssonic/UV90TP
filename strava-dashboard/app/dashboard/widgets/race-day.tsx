import { COLORS, type Plan } from "@/lib/dashboard-helpers";

interface RaceDayProps {
  plan: Plan;
  daysToRace: number;
}

export default function RaceDay({ plan, daysToRace }: RaceDayProps) {
  return (
    <div style={{
      backgroundColor: COLORS.cardAccent,
      borderRadius: "16px",
      padding: "20px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      border: `3px solid ${COLORS.warmGold}`,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <div>
        <span style={{
          color: COLORS.textMuted,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}>Race Day</span>
        <div style={{ color: COLORS.textDark, fontSize: "1.15rem", fontWeight: 700, marginTop: "4px" }}>
          🏁 {plan.race_name || `${plan.race_distance_km}km Ultra`}
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: "0.85rem", marginTop: "2px" }}>
          {new Date(plan.race_date + "T00:00:00").toLocaleDateString("sv-SE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          color: COLORS.cardAccent,
          fontSize: "2rem",
          fontWeight: 700,
          backgroundColor: daysToRace > 0 ? COLORS.warmGold : COLORS.textMuted,
          padding: "8px 16px",
          borderRadius: "12px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}>
          {daysToRace > 0 ? daysToRace : "Past"}
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: "0.75rem", marginTop: "4px", fontWeight: 600 }}>
          {daysToRace > 0 ? "days to go" : "race completed"}
        </div>
      </div>
    </div>
  );
}
