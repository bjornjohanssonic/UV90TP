import type { WeekData, PlanWeek, NextAction } from "@/types";
import { COLORS, PHASE_COLORS, PHASE_LABELS, formatKm, formatTime, formatPace } from "@/lib/dashboard-helpers";

interface ThisWeekProps {
  currentWeek: WeekData;
  currentPlanWeek: PlanWeek | null;
  weekChange: number;
  sufferScoreChange: number;
  actions: NextAction[];
}

const PRIORITY_COLORS = {
  high: "#4A4743",
  medium: "#6B6660",
  low: "#A39E95",
};

export default function ThisWeek({ currentWeek, currentPlanWeek, weekChange, sufferScoreChange, actions }: ThisWeekProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl hover:border-stone-300 transition-all overflow-hidden">
      {/* Header bar - monochromatic phase indicator */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{
          backgroundColor: currentPlanWeek ? `${PHASE_COLORS[currentPlanWeek.phase]}15` : "rgba(0,0,0,0.03)",
        }}
      >
        <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-stone-500 m-0">This Week</h2>
        {currentPlanWeek && (
          <span className="text-[0.65rem] uppercase tracking-wider font-medium text-stone-500 bg-stone-100/80 px-2 py-0.5 rounded">
            {PHASE_LABELS[currentPlanWeek.phase]}
            {currentPlanWeek.cycle_number ? ` · Cycle ${currentPlanWeek.cycle_number}` : ""}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 pt-3">
        <div className="flex items-center justify-end mb-3">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded"
            style={{
              color: weekChange >= 0 ? COLORS.textMuted : COLORS.error,
              backgroundColor: weekChange >= 0 ? "rgba(0,0,0,0.05)" : "rgba(220,38,38,0.08)",
            }}
          >
            {weekChange >= 0 ? "\u2191" : "\u2193"} {Math.abs(weekChange).toFixed(0)}% vs last week
          </span>
        </div>

        <div className="grid gap-2.5 grid-cols-3">
          {currentPlanWeek && (
            <div className="bg-stone-100/40 rounded-lg p-3 border border-stone-200">
              <div className="text-stone-500 text-[0.7rem] uppercase tracking-wider font-medium mb-1.5">Target</div>
              <div className="text-xl font-light text-stone-800 tracking-tight">
                {currentPlanWeek.target_volume_km} km
              </div>
              <div className="text-stone-400 text-[0.6rem] mt-0.5">
                min {Math.ceil(currentPlanWeek.target_volume_km * 0.9)} km
              </div>
            </div>
          )}
          {currentPlanWeek && currentPlanWeek.long_run_km > 0 && (
            <div className="bg-stone-100/40 rounded-lg p-3 border border-stone-200">
              <div className="text-stone-500 text-[0.7rem] uppercase tracking-wider font-medium mb-1.5">Long Run</div>
              <div className="text-xl font-light text-stone-800 tracking-tight">
                {currentPlanWeek.long_run_km} km
                {currentPlanWeek.back_to_back ? (
                  <span className="ml-1.5 text-[0.6rem] uppercase tracking-wider text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                    B2B
                  </span>
                ) : null}
              </div>
            </div>
          )}
          {[
            { label: "Distance", value: `${formatKm(currentWeek.totalDistance)} km` },
            { label: "Time", value: formatTime(currentWeek.totalTime) },
            { label: "Runs", value: String(currentWeek.runs) },
            { label: "Avg Pace", value: `${formatPace(currentWeek.totalDistance, currentWeek.totalTime)} /km` },
            { label: "Longest", value: `${formatKm(currentWeek.longestRun)} km` },
            {
              label: "Effort",
              value: currentWeek.totalSufferScore > 0 ? String(Math.round(currentWeek.totalSufferScore)) : "\u2014",
              badge: sufferScoreChange !== 0 && currentWeek.totalSufferScore > 0
                ? { value: sufferScoreChange, label: `${sufferScoreChange >= 0 ? "\u2191" : "\u2193"} ${Math.abs(sufferScoreChange).toFixed(0)}%` }
                : undefined,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-stone-100/40 rounded-lg p-3">
              <div className="text-stone-500 text-[0.7rem] uppercase tracking-wider font-medium mb-1.5">
                {stat.label}
              </div>
              <div className="text-xl font-light text-stone-800 tracking-tight flex items-center gap-1.5">
                {stat.value}
                {"badge" in stat && stat.badge && (
                  <span
                    className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      color: stat.badge.value >= 0 ? COLORS.textMuted : COLORS.error,
                      backgroundColor: stat.badge.value >= 0 ? "rgba(0,0,0,0.05)" : "rgba(220,38,38,0.08)",
                    }}
                  >
                    {stat.badge.label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Target progress bar */}
        {currentPlanWeek && (
          <div className="mt-4 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (currentWeek.totalDistance / (currentPlanWeek.target_volume_km * 1000)) * 100)}%`,
                backgroundColor:
                  currentWeek.totalDistance >= currentPlanWeek.target_volume_km * 0.9 * 1000 ? "#4A7C59" : "#8A847B",
              }}
            />
          </div>
        )}

        {/* Next Actions */}
        {actions.length > 0 && (
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="text-stone-500 text-[0.65rem] uppercase tracking-wider font-medium mb-0.5">Next</div>
            {actions.map((action, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 bg-stone-100/40"
                style={{ borderLeft: `2px solid ${PRIORITY_COLORS[action.priority]}` }}
              >
                <span className="shrink-0">{action.icon}</span>
                <div className="min-w-0">
                  <div className="text-stone-800">{action.action}</div>
                  <div className="text-stone-500 text-[0.65rem] mt-0.5">{action.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
