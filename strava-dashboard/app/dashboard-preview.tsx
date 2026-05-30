/**
 * Static, non-interactive replica of the "Ground Control" dashboard, used as
 * a faded backdrop on the login page so visitors get a peek at the real app
 * before connecting. Mirrors the styling of the live widgets in
 * app/dashboard/widgets/ but with hard-coded sample data and no data fetching.
 */
import { Moon } from "lucide-react";

const FACTORS = [
  { label: "REST", value: 27, max: 30 },
  { label: "LOAD", value: 23, max: 25 },
  { label: "INTENSITY", value: 20, max: 25 },
  { label: "PHASE", value: 13, max: 20 },
];

const RECENT_RUNS = [
  { date: "28 maj", name: "Morgonlöprunda", dist: "12,4 km", time: "1:02:18", pace: "5:01", hr: "148" },
  { date: "26 maj", name: "Intervaller på banan", dist: "8,0 km", time: "0:38:44", pace: "4:50", hr: "162" },
  { date: "24 maj", name: "Långpass i skogen", dist: "27,2 km", time: "2:31:05", pace: "5:33", hr: "139" },
  { date: "22 maj", name: "Återhämtning", dist: "5,1 km", time: "0:29:10", pace: "5:43", hr: "128" },
];

function zoneColor(pct: number) {
  return pct > 70 ? "var(--color-zone-green)" : pct > 40 ? "var(--color-zone-yellow)" : "var(--color-zone-red)";
}

export default function DashboardPreview() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 select-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2.5">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-light text-stone-800 tracking-tight m-0">Ground Control</h1>
          <span className="text-sm font-medium text-stone-500 bg-stone-100/80 px-3 py-1 rounded-lg border border-stone-300">
            Ultravasan 90 · 77 days
          </span>
        </div>
        <div className="flex gap-2.5 items-center">
          {["Daily Go Plan", "Plan", "Skor", "Rutter"].map((label) => (
            <span
              key={label}
              className="border border-stone-300 text-stone-500 rounded-lg px-4 py-2 text-sm font-medium"
            >
              {label}
            </span>
          ))}
          <span className="bg-stone-800 text-white rounded-lg px-4 py-2 text-sm font-medium">Sync</span>
        </div>
      </div>

      {/* Readiness hero */}
      <div
        className="relative bg-white border border-stone-200 rounded-xl p-5 sm:p-8 mb-4"
        style={{ boxShadow: "var(--glow-fresh)" }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="text-7xl font-light tracking-tight text-green-400">82</div>
          <div
            className="px-3 py-1 rounded-full text-[0.7rem] font-medium uppercase tracking-widest"
            style={{ background: "var(--color-zone-green-muted)", color: "var(--color-text-secondary)" }}
          >
            Fresh
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FACTORS.map((f) => {
            const pct = (f.value / f.max) * 100;
            return (
              <div key={f.label} className="flex flex-col items-center gap-1.5">
                <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider font-medium">{f.label}</div>
                <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: zoneColor(pct), opacity: 0.6 }}
                  />
                </div>
                <div className="text-[0.65rem] text-stone-500">
                  {f.value}/{f.max}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily briefing */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 border-l-2 border-l-stone-400 mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-1.5 rounded-lg bg-stone-100/60">
            <Moon className="w-4 h-4 text-stone-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-light text-stone-800 leading-relaxed">
              Lätt distanspass idag — du är pigg och i grön belastningszon.
            </p>
            <p className="mt-1.5 text-xs text-stone-500">8–10 km i konverserande tempo, spara benen till helgens långpass.</p>
          </div>
        </div>
      </div>

      {/* ACWR + This Week */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 mb-4">
        {/* ACWR gauge */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-[0.7rem] text-stone-400 uppercase tracking-wider font-medium mb-3">Training Load</div>
          <div className="text-center mb-4">
            <div className="text-4xl font-light tracking-tight text-green-400">1.08</div>
            <div className="text-[0.7rem] text-stone-500 mt-1 uppercase tracking-wide">Optimal</div>
          </div>
          <div className="relative mb-4">
            <div className="flex h-2 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: "30%", backgroundColor: "var(--color-zone-red)", opacity: 0.25 }} />
              <div className="h-full" style={{ width: "10%", backgroundColor: "var(--color-zone-yellow)", opacity: 0.25 }} />
              <div className="h-full" style={{ width: "25%", backgroundColor: "var(--color-zone-green)", opacity: 0.3 }} />
              <div className="h-full" style={{ width: "10%", backgroundColor: "var(--color-zone-yellow)", opacity: 0.25 }} />
              <div className="h-full" style={{ width: "25%", backgroundColor: "var(--color-zone-red)", opacity: 0.25 }} />
            </div>
            <div
              className="absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
              style={{
                left: "54%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "var(--color-zone-green)",
                boxShadow: "0 0 8px var(--color-zone-green)",
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider">7-Day</div>
              <div className="text-sm font-light text-stone-700">52 km</div>
            </div>
            <div>
              <div className="text-[0.6rem] text-stone-400 uppercase tracking-wider">28-Day Avg</div>
              <div className="text-sm font-light text-stone-700">48 km/wk</div>
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: "#4A7C5915" }}>
            <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-stone-500 m-0">This Week</h2>
            <span className="text-[0.65rem] uppercase tracking-wider font-medium text-stone-500 bg-stone-100/80 px-2 py-0.5 rounded">
              Build · Cycle 3
            </span>
          </div>
          <div className="p-5 pt-4">
            <div className="grid gap-2.5 grid-cols-3">
              {[
                { label: "Target", value: "55 km", sub: "min 50 km" },
                { label: "Done", value: "41 km", sub: "4 runs" },
                { label: "Effort", value: "312", sub: "↑ 8% effort" },
              ].map((s) => (
                <div key={s.label} className="bg-stone-100/40 rounded-lg p-3 border border-stone-200">
                  <div className="text-stone-500 text-[0.7rem] uppercase tracking-wider font-medium mb-1.5">{s.label}</div>
                  <div className="text-xl font-light text-stone-800 tracking-tight">{s.value}</div>
                  <div className="text-stone-400 text-[0.6rem] mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent runs */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200">
          <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-stone-500 m-0">Recent Runs</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[0.6rem] text-stone-400 uppercase tracking-wider">
              <th className="text-left font-medium px-5 py-2">Date</th>
              <th className="text-left font-medium px-3 py-2">Name</th>
              <th className="text-right font-medium px-3 py-2">Distance</th>
              <th className="text-right font-medium px-3 py-2">Time</th>
              <th className="text-right font-medium px-3 py-2">Pace</th>
              <th className="text-right font-medium px-5 py-2">HR</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_RUNS.map((r) => (
              <tr key={r.date} className="border-t border-stone-100">
                <td className="px-5 py-2.5 text-stone-500">{r.date}</td>
                <td className="px-3 py-2.5 text-stone-800 font-light">{r.name}</td>
                <td className="px-3 py-2.5 text-right text-stone-700 tabular-nums">{r.dist}</td>
                <td className="px-3 py-2.5 text-right text-stone-700 tabular-nums">{r.time}</td>
                <td className="px-3 py-2.5 text-right text-stone-700 tabular-nums">{r.pace}</td>
                <td className="px-5 py-2.5 text-right text-stone-700 tabular-nums">{r.hr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
