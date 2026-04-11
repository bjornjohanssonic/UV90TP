"use client";

import { useState } from "react";
import type { Activity, Shoe } from "@/types";
import type { RunQualityScore } from "@/types/coach";
import { formatKm, formatTime, formatPace, formatDate } from "@/lib/dashboard-helpers";
import EditableBatteryCell from "./editable-battery-cell";
import { scoreRun } from "@/lib/scoring";
import { BarChart3, Table2 } from "lucide-react";

const SHOE_TYPE_SHORT: Record<string, string> = {
  road: "road",
  trail: "trail",
  hybrid: "hybrid",
  dubb: "dubb",
  gore_tex: "GTX",
};

interface RecentRunsProps {
  runs: Activity[];
  shoes: Shoe[];
  onBatteryUpdate: (stravaId: string, start: number | null, end: number | null) => void;
}

function QualityBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-green-400"
      : score >= 60
        ? "text-stone-700"
        : score >= 40
          ? "text-yellow-400"
          : "text-red-400";
  return <span className={`text-xs text-right tabular-nums ${color}`}>{score}</span>;
}

// ─── Metric definitions ─────────────────────────────────────────────────────

type MetricKey = "distance" | "pace" | "hr" | "effort" | "quality";

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  /** If true, lower values are "better" and shown taller */
  invertY?: boolean;
  getValue: (run: Activity, score?: RunQualityScore) => number | null;
  format: (value: number) => string;
}

const METRICS: MetricConfig[] = [
  {
    key: "distance",
    label: "Distance",
    unit: "km",
    color: "#60a5fa",
    getValue: (r) => r.distance / 1000,
    format: (v) => `${v.toFixed(1)} km`,
  },
  {
    key: "pace",
    label: "Pace",
    unit: "min/km",
    color: "#c084fc",
    invertY: true,
    getValue: (r) => (r.distance > 0 ? r.moving_time / 60 / (r.distance / 1000) : null),
    format: (v) => {
      const mins = Math.floor(v);
      const secs = Math.round((v - mins) * 60);
      return `${mins}:${String(secs).padStart(2, "0")} /km`;
    },
  },
  {
    key: "hr",
    label: "Heart Rate",
    unit: "bpm",
    color: "#f87171",
    getValue: (r) => r.average_heartrate,
    format: (v) => `${Math.round(v)} bpm`,
  },
  {
    key: "effort",
    label: "Effort",
    unit: "",
    color: "#fbbf24",
    getValue: (r) => (r.suffer_score && r.suffer_score > 0 ? r.suffer_score : null),
    format: (v) => `${Math.round(v)}`,
  },
  {
    key: "quality",
    label: "Quality",
    unit: "",
    color: "#4ade80",
    getValue: (_, score) => (score ? score.total : null),
    format: (v) => `${Math.round(v)}`,
  },
];

// ─── Bar Chart ──────────────────────────────────────────────────────────────

interface BarRun {
  run: Activity;
  value: number;
  score?: RunQualityScore;
}

function BarChart({
  bars,
  metric,
  hoveredIndex,
  onHover,
}: {
  bars: BarRun[];
  metric: MetricConfig;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}) {
  if (bars.length === 0) return null;

  const values = bars.map((b) => b.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // For inverted metrics (pace), we flip so lower = taller bar
  // Use a floor that gives some breathing room
  const floor = metric.invertY ? max : Math.min(min, 0);
  const ceiling = metric.invertY ? min : max;
  const range = Math.abs(ceiling - floor) || 1;

  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  // SVG dimensions
  const svgW = 800;
  const svgH = 200;
  const padTop = 24;
  const padBottom = 28;
  const padLeft = 6;
  const padRight = 6;
  const chartH = svgH - padTop - padBottom;
  const chartW = svgW - padLeft - padRight;
  const gap = 3;
  const barW = (chartW - gap * (bars.length - 1)) / bars.length;

  const getBarHeight = (v: number) => {
    const normalized = metric.invertY ? (max - v) / range : (v - floor) / range;
    return Math.max(normalized * chartH, 2);
  };

  // Average line position
  const avgY = metric.invertY
    ? padTop + ((max - avg) / range) * chartH
    : padTop + chartH - ((avg - floor) / range) * chartH;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height: svgH }}>
      {/* Grid lines */}
      {[0, 0.5, 1].map((pct) => {
        const y = padTop + pct * chartH;
        const val = metric.invertY ? floor + pct * range : ceiling - pct * range;
        return (
          <g key={pct}>
            <line x1={padLeft} x2={svgW - padRight} y1={y} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
            <text x={svgW - padRight} y={y - 3} textAnchor="end" fill="rgba(0,0,0,0.3)" fontSize="9">
              {metric.format(val)}
            </text>
          </g>
        );
      })}

      {/* Average line */}
      <line
        x1={padLeft}
        x2={svgW - padRight}
        y1={avgY}
        y2={avgY}
        stroke={metric.color}
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.3"
      />
      <text x={padLeft + 2} y={avgY - 4} fill={metric.color} fontSize="8" opacity="0.5">
        avg {metric.format(avg)}
      </text>

      {/* Visible bars — no pointer events, purely visual */}
      {bars.map((bar, i) => {
        const h = getBarHeight(bar.value);
        const x = padLeft + i * (barW + gap);
        const y = padTop + chartH - h;
        const isHovered = hoveredIndex === i;
        const opacity = hoveredIndex === null ? 0.5 : isHovered ? 0.85 : 0.2;

        return (
          <g key={i} style={{ pointerEvents: "none" }}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={Math.min(barW / 2, 3)}
              fill={metric.color}
              opacity={opacity}
              style={{ transition: "opacity 0.15s" }}
            />
            {isHovered && (
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                fill={metric.color}
                fontSize="10"
                fontWeight="500"
              >
                {metric.format(bar.value)}
              </text>
            )}
          </g>
        );
      })}

      {/* Hover zones — single layer on top, full chart height, no gaps */}
      <g onMouseLeave={() => onHover(null)}>
        {bars.map((_, i) => {
          const x = padLeft + i * (barW + gap);
          return (
            <rect
              key={i}
              x={i === 0 ? 0 : x - gap / 2}
              y={0}
              width={i === 0 || i === bars.length - 1 ? barW + gap / 2 + padLeft : barW + gap}
              height={svgH}
              fill="transparent"
              onMouseEnter={() => onHover(i)}
            />
          );
        })}
      </g>

      {/* Date labels — first, middle, last */}
      {bars.length > 0 && (
        <>
          <text x={padLeft} y={svgH - 4} textAnchor="start" fill="rgba(0,0,0,0.4)" fontSize="9">
            {formatDate(bars[0].run.start_date)}
          </text>
          {bars.length > 4 && (
            <text
              x={padLeft + Math.floor(bars.length / 2) * (barW + gap) + barW / 2}
              y={svgH - 4}
              textAnchor="middle"
              fill="rgba(0,0,0,0.4)"
              fontSize="9"
            >
              {formatDate(bars[Math.floor(bars.length / 2)].run.start_date)}
            </text>
          )}
          <text
            x={padLeft + (bars.length - 1) * (barW + gap) + barW}
            y={svgH - 4}
            textAnchor="end"
            fill="rgba(0,0,0,0.4)"
            fontSize="9"
          >
            {formatDate(bars[bars.length - 1].run.start_date)}
          </text>
        </>
      )}
    </svg>
  );
}

// ─── Hover Detail Panel ─────────────────────────────────────────────────────

function HoverDetail({ run, score }: { run: Activity; score?: RunQualityScore }) {
  const stats = [
    { label: "Distance", value: `${formatKm(run.distance)} km` },
    { label: "Time", value: formatTime(run.moving_time) },
    { label: "Pace", value: run.distance > 0 ? `${formatPace(run.distance, run.moving_time)} /km` : "\u2014" },
    { label: "HR", value: run.average_heartrate ? `${Math.round(run.average_heartrate)} bpm` : "\u2014" },
    { label: "Elevation", value: `${Math.round(run.total_elevation_gain)} m` },
    { label: "Effort", value: run.suffer_score ? `${Math.round(run.suffer_score)}` : "\u2014" },
    { label: "Quality", value: score ? `${score.total}` : "\u2014" },
  ];

  return (
    <div className="bg-white/95 border border-stone-300/60 rounded-lg px-4 py-3 flex items-center gap-6 min-h-[52px]">
      <div className="shrink-0">
        <div className="text-xs text-stone-800 font-medium truncate max-w-[200px]">{run.name}</div>
        <div className="text-[0.6rem] text-stone-500">{formatDate(run.start_date)}</div>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="text-[0.6rem] text-stone-400 uppercase tracking-wider">{s.label}</span>
            <span className="text-xs text-stone-700 tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Graph View ─────────────────────────────────────────────────────────────

function GraphView({
  runs,
  scores,
  totalRuns,
  onShowMore,
  onShowLess,
}: {
  runs: Activity[];
  scores: Map<string, RunQualityScore>;
  totalRuns: number;
  onShowMore: () => void;
  onShowLess: () => void;
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("distance");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Chronological order (oldest first)
  const chronological = [...runs].reverse();
  const metric = METRICS.find((m) => m.key === activeMetric)!;

  // Filter runs that have data for this metric
  const bars: BarRun[] = [];
  for (const run of chronological) {
    const score = scores.get(run.strava_id);
    const value = metric.getValue(run, score);
    if (value !== null) {
      bars.push({ run, value, score });
    }
  }

  // Available metrics (only show tabs for metrics that have data)
  const available = METRICS.filter((m) => {
    return chronological.some((r) => m.getValue(r, scores.get(r.strava_id)) !== null);
  });

  const hoveredBar = hoveredIndex !== null ? bars[hoveredIndex] : null;
  const hasMore = runs.length < totalRuns;
  const canShowLess = runs.length > GRAPH_PAGE_SIZE;

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 transition-all">
      {/* Metric tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-1">
        {available.map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setActiveMetric(m.key);
              setHoveredIndex(null);
            }}
            className={`px-2.5 py-1 rounded text-[0.65rem] uppercase tracking-wider font-medium transition-all cursor-pointer border-none ${
              activeMetric === m.key
                ? "bg-stone-100 text-stone-800"
                : "bg-transparent text-stone-400 hover:text-stone-500"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="px-4 pb-1">
        <BarChart bars={bars} metric={metric} hoveredIndex={hoveredIndex} onHover={setHoveredIndex} />
      </div>

      {/* Hover detail — fixed height to prevent layout shift */}
      <div className="px-4 pb-3">
        {hoveredBar ? (
          <HoverDetail run={hoveredBar.run} score={hoveredBar.score} />
        ) : (
          <div className="bg-white/60 border border-stone-200/50 rounded-lg px-4 py-3 min-h-[52px] flex items-center">
            <span className="text-[0.6rem] text-stone-400">Hover over a bar to see run details</span>
          </div>
        )}
      </div>

      {/* Show more / less */}
      {(hasMore || canShowLess) && (
        <div className="flex items-center gap-2 px-4 pb-3">
          {hasMore ? (
            <button
              onClick={onShowMore}
              className="flex-1 py-2 rounded-lg border border-stone-200 bg-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 text-[0.65rem] uppercase tracking-wider font-medium cursor-pointer transition-all"
            >
              &laquo; show more
            </button>
          ) : (
            <div className="flex-1" />
          )}
          <span className="text-[0.6rem] text-stone-400 tabular-nums">{runs.length} of {totalRuns}</span>
          {canShowLess ? (
            <button
              onClick={onShowLess}
              className="flex-1 py-2 rounded-lg border border-stone-200 bg-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 text-[0.65rem] uppercase tracking-wider font-medium cursor-pointer transition-all"
            >
              show less &raquo;
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const GRAPH_PAGE_SIZE = 20;

export default function RecentRuns({ runs, shoes, onBatteryUpdate }: RecentRunsProps) {
  const shoeMap = new Map(shoes.map((s) => [s.id, s]));
  const [view, setView] = useState<"table" | "graph">("table");
  const [graphLimit, setGraphLimit] = useState(GRAPH_PAGE_SIZE);

  const tableRuns = runs.slice(0, 20);
  const graphRuns = runs.slice(0, graphLimit);

  // Pre-compute quality scores for all runs we might display
  const maxVisible = Math.max(tableRuns.length, graphRuns.length);
  const allVisible = runs.slice(0, maxVisible);
  const scores = new Map<string, RunQualityScore>();
  for (const run of allVisible) {
    scores.set(run.strava_id, scoreRun(run, null, new Date(run.start_date).getDay(), allVisible));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-stone-500">Recent Runs</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView("table")}
            className={`p-1.5 rounded transition-all cursor-pointer border-none bg-transparent ${view === "table" ? "text-stone-700" : "text-stone-400 hover:text-stone-500"}`}
            title="Table view"
          >
            <Table2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setView("graph")}
            className={`p-1.5 rounded transition-all cursor-pointer border-none bg-transparent ${view === "graph" ? "text-stone-700" : "text-stone-400 hover:text-stone-500"}`}
            title="Graph view"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {view === "graph" ? (
        <GraphView
          runs={graphRuns}
          scores={scores}
          totalRuns={runs.length}
          onShowMore={() => setGraphLimit((prev) => Math.min(prev + GRAPH_PAGE_SIZE, runs.length))}
          onShowLess={() => setGraphLimit((prev) => Math.max(prev - GRAPH_PAGE_SIZE, GRAPH_PAGE_SIZE))}
        />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 transition-all">
          <div className="grid grid-cols-[1fr_1.5fr_65px_65px] sm:grid-cols-[1fr_1.5fr_70px_65px_65px_50px_50px_40px_70px_90px] px-4 py-2 border-b border-stone-200">
            <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Date</span>
            <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Name</span>
            <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Dist</span>
            <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Pace</span>
            <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Time</span>
            <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">HR</span>
            <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Effort</span>
            <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Q</span>
            <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Battery</span>
            <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Shoes</span>
          </div>
          {tableRuns.map((act, idx) => {
            const quality = scores.get(act.strava_id);
            const shoe = act.shoe_id != null ? shoeMap.get(act.shoe_id) : undefined;
            return (
              <div
                key={act.strava_id}
                className="grid grid-cols-[1fr_1.5fr_65px_65px] sm:grid-cols-[1fr_1.5fr_70px_65px_65px_50px_50px_40px_70px_90px] px-4 py-2 items-center"
                style={{
                  backgroundColor: idx % 2 === 0 ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.01)",
                  borderBottom: idx < 19 ? "1px solid rgba(0,0,0,0.06)" : "none",
                }}
              >
                <span className="text-xs text-stone-500">{formatDate(act.start_date)}</span>
                <span className="text-xs text-stone-700 truncate">{act.name}</span>
                <span className="text-xs text-stone-800 text-right">{formatKm(act.distance)} km</span>
                <span className="text-xs text-stone-500 text-right">{formatPace(act.distance, act.moving_time)} /km</span>
                <span className="hidden sm:block text-xs text-stone-500 text-right">{formatTime(act.moving_time)}</span>
                <span className={`hidden sm:block text-xs text-right ${act.average_heartrate ? "text-stone-500" : "text-stone-300"}`}>
                  {act.average_heartrate ? Math.round(act.average_heartrate) : "\u2014"}
                </span>
                <span className={`hidden sm:block text-xs text-right ${act.suffer_score ? "text-stone-500" : "text-stone-300"}`}>
                  {act.suffer_score ? Math.round(act.suffer_score) : "\u2014"}
                </span>
                <div className="hidden sm:block text-right">
                  {quality ? <QualityBadge score={quality.total} /> : <span className="text-xs text-stone-300">{"\u2014"}</span>}
                </div>
                <div className="hidden sm:block text-right">
                  <EditableBatteryCell
                    stravaId={act.strava_id}
                    batteryStart={act.battery_start}
                    batteryEnd={act.battery_end}
                    onSaved={onBatteryUpdate}
                  />
                </div>
                <div className="hidden sm:block text-right">
                  {shoe ? (
                    <span className="text-xs text-stone-500 truncate block" title={shoe.name}>
                      {shoe.name} <span className="text-stone-400">{SHOE_TYPE_SHORT[shoe.type] ?? shoe.type}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-stone-300">{"\u2014"}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
