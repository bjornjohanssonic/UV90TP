import { COLORS, formatKm, type WeekData } from "@/lib/dashboard-helpers";

interface WeeklyChartProps {
  last8: WeekData[];
  last8Targets: number[];
  maxDist: number;
}

export default function WeeklyChart({ last8, last8Targets, maxDist }: WeeklyChartProps) {
  return (
    <div>
      <h2 style={{ color: COLORS.textDark, fontSize: "1.1rem", fontWeight: 600, marginBottom: "10px" }}>Weekly Distance</h2>
      <div style={{
        backgroundColor: COLORS.cardBg,
        borderRadius: "12px",
        padding: "20px",
        border: `2px solid ${COLORS.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "140px" }}>
          {last8.map((w, i) => {
            const height = (w.totalDistance / maxDist) * 120;
            const targetH = last8Targets[i] > 0 ? (last8Targets[i] / maxDist) * 120 : 0;
            const isCurrentWeek = i === last8.length - 1;
            const metTarget = last8Targets[i] > 0 && w.totalDistance >= last8Targets[i];
            return (
              <div key={w.weekStart} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", position: "relative" }}>
                <span style={{ color: COLORS.textDark, fontSize: "0.7rem", fontWeight: 600 }}>{formatKm(w.totalDistance)}</span>
                {targetH > 0 && (
                  <div style={{
                    position: "absolute",
                    bottom: `${targetH}px`,
                    width: "100%",
                    height: "1px",
                    borderTop: `2px dashed ${COLORS.textMuted}`,
                  }} />
                )}
                <div style={{
                  width: "100%",
                  height: `${Math.max(height, 4)}px`,
                  backgroundColor: metTarget ? COLORS.success : isCurrentWeek ? COLORS.primaryGreen : COLORS.textLight,
                  borderRadius: "6px 6px 0 0",
                  transition: "height 0.3s ease",
                }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
          {last8.map((w) => (
            <div key={w.weekStart} style={{ flex: 1, textAlign: "center" }}>
              <span style={{ color: COLORS.textMuted, fontSize: "0.65rem" }}>
                {new Date(w.weekStart).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
        {last8Targets.some((t) => t > 0) && (
          <div style={{ display: "flex", gap: "14px", marginTop: "12px", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "18px", borderTop: `2px dashed ${COLORS.textMuted}` }} />
              <span style={{ color: COLORS.textMuted, fontSize: "0.7rem" }}>Target</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "12px", backgroundColor: COLORS.success, borderRadius: "3px" }} />
              <span style={{ color: COLORS.textMuted, fontSize: "0.7rem" }}>Met target</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
