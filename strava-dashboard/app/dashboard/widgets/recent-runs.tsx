import {
  COLORS, formatKm, formatTime, formatPace, formatDate,
  type Activity,
} from "@/lib/dashboard-helpers";

interface RecentRunsProps {
  runs: Activity[];
}

export default function RecentRuns({ runs }: RecentRunsProps) {
  return (
    <div>
      <h2 style={{ color: COLORS.textDark, fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>Recent Runs</h2>
      <div style={{
        backgroundColor: COLORS.cardBg,
        borderRadius: "12px",
        overflow: "hidden",
        border: `2px solid ${COLORS.border}`,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr 80px 70px 80px 60px",
          padding: "10px 14px",
          color: COLORS.textMuted,
          fontSize: "0.7rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          backgroundColor: COLORS.cardAlt,
          borderBottom: `2px solid ${COLORS.border}`,
        }}>
          <span>Date</span><span>Name</span><span>Distance</span><span>Time</span><span>Pace</span><span>HR</span>
        </div>
        {runs.slice(0, 20).map((act, idx) => (
          <div key={act.strava_id} style={{
            display: "grid",
            gridTemplateColumns: "110px 1fr 80px 70px 80px 60px",
            padding: "10px 14px",
            backgroundColor: idx % 2 === 0 ? COLORS.cardBg : `${COLORS.cardAlt}80`,
            borderBottom: idx < 19 ? `1px solid ${COLORS.border}` : "none",
            alignItems: "center",
          }}>
            <span style={{ color: COLORS.textMuted, fontSize: "0.8rem" }}>{formatDate(act.start_date)}</span>
            <span style={{
              color: COLORS.textDark,
              fontSize: "0.85rem",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>{act.name}</span>
            <span style={{ color: COLORS.primaryGreen, fontSize: "0.85rem", fontWeight: 700 }}>
              {formatKm(act.distance)} km
            </span>
            <span style={{ color: COLORS.textDark, fontSize: "0.8rem" }}>{formatTime(act.moving_time)}</span>
            <span style={{ color: COLORS.textDark, fontSize: "0.8rem" }}>{formatPace(act.distance, act.moving_time)} /km</span>
            <span style={{
              color: act.average_heartrate ? COLORS.error : COLORS.textLight,
              fontSize: "0.8rem",
              fontWeight: act.average_heartrate ? 600 : 400,
            }}>
              {act.average_heartrate ? Math.round(act.average_heartrate) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
