import type { Activity } from "@/types";
import type { RunQualityScore } from "@/types/coach";
import { formatKm, formatTime, formatPace, formatDate } from "@/lib/dashboard-helpers";
import EditableBatteryCell from "./editable-battery-cell";
import { scoreRun } from "@/lib/scoring";

interface RecentRunsProps {
  runs: Activity[];
  onBatteryUpdate: (stravaId: string, start: number | null, end: number | null) => void;
}

function QualityBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-green-400"
      : score >= 60
        ? "text-neutral-300"
        : score >= 40
          ? "text-yellow-400"
          : "text-red-400";
  return <span className={`text-xs text-right tabular-nums ${color}`}>{score}</span>;
}

export default function RecentRuns({ runs, onBatteryUpdate }: RecentRunsProps) {
  // Pre-compute quality scores for all visible runs
  const scores = new Map<string, RunQualityScore>();
  const visibleRuns = runs.slice(0, 20);
  for (const run of visibleRuns) {
    scores.set(run.strava_id, scoreRun(run, null, new Date(run.start_date).getDay(), visibleRuns));
  }

  return (
    <div>
      <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-neutral-500 mb-3">Recent Runs</h2>
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-all">
        <div className="grid grid-cols-[1fr_1.5fr_70px_65px_65px_50px_50px_40px_70px] px-4 py-2 border-b border-neutral-800">
          <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-600">Date</span>
          <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-600">Name</span>
          <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-600 text-right">
            Distance
          </span>
          <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-600 text-right">Time</span>
          <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-600 text-right">Pace</span>
          <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-600 text-right">HR</span>
          <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-600 text-right">Effort</span>
          <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-600 text-right">Q</span>
          <span className="text-[0.6rem] uppercase tracking-wider font-medium text-neutral-600 text-right">Battery</span>
        </div>
        {visibleRuns.map((act, idx) => {
          const quality = scores.get(act.strava_id);
          return (
            <div
              key={act.strava_id}
              className="grid grid-cols-[1fr_1.5fr_70px_65px_65px_50px_50px_40px_70px] px-4 py-2 items-center"
              style={{
                backgroundColor: idx % 2 === 0 ? "rgba(163,163,163,0.04)" : "rgba(163,163,163,0.02)",
                borderBottom: idx < 19 ? "1px solid rgba(38,38,38,0.6)" : "none",
              }}
            >
              <span className="text-xs text-neutral-500">{formatDate(act.start_date)}</span>
              <span className="text-xs text-neutral-300 truncate">{act.name}</span>
              <span className="text-xs text-neutral-200 text-right">{formatKm(act.distance)} km</span>
              <span className="text-xs text-neutral-400 text-right">{formatTime(act.moving_time)}</span>
              <span className="text-xs text-neutral-400 text-right">{formatPace(act.distance, act.moving_time)} /km</span>
              <span className={`text-xs text-right ${act.average_heartrate ? "text-neutral-400" : "text-neutral-700"}`}>
                {act.average_heartrate ? Math.round(act.average_heartrate) : "\u2014"}
              </span>
              <span className={`text-xs text-right ${act.suffer_score ? "text-neutral-400" : "text-neutral-700"}`}>
                {act.suffer_score ? Math.round(act.suffer_score) : "\u2014"}
              </span>
              <div className="text-right">
                {quality ? <QualityBadge score={quality.total} /> : <span className="text-xs text-neutral-700">{"\u2014"}</span>}
              </div>
              <div className="text-right">
                <EditableBatteryCell
                  stravaId={act.strava_id}
                  batteryStart={act.battery_start}
                  batteryEnd={act.battery_end}
                  onSaved={onBatteryUpdate}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
