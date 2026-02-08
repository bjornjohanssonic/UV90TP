"use client";

import { useEffect, useState, useCallback } from "react";
import {
  COLORS, getMonday, toLocalDateStr, aggregateWeeks, computePRs, generateNextActions,
  type Activity, type Plan, type PlanWeek,
} from "@/lib/dashboard-helpers";
import {
  type WidgetConfig, type WidgetLayout, type WidgetId,
  WIDGET_REGISTRY, DEFAULT_LAYOUT, LAYOUT_STORAGE_KEY,
} from "./widgets/widget-types";
import WidgetContainer from "./widgets/widget-container";
import ThisWeek from "./widgets/this-week";
import RaceDay from "./widgets/race-day";
import NextActionsWidget from "./widgets/next-actions";
import WeeklyChart from "./widgets/weekly-chart";
import GymAndPRs from "./widgets/gym-and-prs";
import WeeklyBreakdown from "./widgets/weekly-breakdown";
import WeekDetail from "./widgets/week-detail";
import RecentRuns from "./widgets/recent-runs";

export default function Dashboard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planWeeks, setPlanWeeks] = useState<PlanWeek[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);
  const [syncCount, setSyncCount] = useState(0);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [widgetLayout, setWidgetLayout] = useState<WidgetLayout>(DEFAULT_LAYOUT);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);

  // ─── Load athlete ID + saved layout ───────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("athlete");
    if (id) {
      setAthleteId(id);
      localStorage.setItem("athleteId", id);
    } else {
      setAthleteId(localStorage.getItem("athleteId"));
    }

    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const first = Object.values(parsed)[0] as Record<string, unknown>;
        if (first && "colSpan" in first && "order" in first) {
          // Merge in any new widgets from DEFAULT_LAYOUT that aren't in saved data
          const merged = { ...parsed };
          for (const [id, config] of Object.entries(DEFAULT_LAYOUT)) {
            if (!(id in merged)) {
              merged[id] = config;
            }
          }
          setWidgetLayout(merged);
        }
      } catch { /* use default */ }
    } else {
      // Migrate from v2 if available
      const v2 = localStorage.getItem("widgetLayout_v2");
      if (v2) {
        try {
          const parsed = JSON.parse(v2);
          const migrated: WidgetLayout = {};
          for (const [id, cfg] of Object.entries(parsed) as [string, Record<string, unknown>][]) {
            const reg = WIDGET_REGISTRY[id as WidgetId];
            if (!reg) continue;
            const colSpan = Math.max(reg.minColSpan, Math.min(reg.maxColSpan, (cfg.colSpan as number) || 6));
            migrated[id] = {
              id: id as WidgetId,
              visible: cfg.visible as boolean ?? true,
              colSpan,
              order: cfg.order as number ?? 0,
            };
          }
          // Merge in any new widgets not in v2
          for (const [id, config] of Object.entries(DEFAULT_LAYOUT)) {
            if (!(id in migrated)) {
              migrated[id] = config;
            }
          }
          setWidgetLayout(migrated);
          localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(migrated));
        } catch { /* use default */ }
      }
    }
  }, []);

  // Persist layout
  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(widgetLayout));
  }, [widgetLayout]);

  // ─── Data loading ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const [actRes, planRes] = await Promise.all([
      fetch("/api/activities"),
      fetch("/api/training-plan"),
    ]);
    if (actRes.ok) setActivities(await actRes.json());
    if (planRes.ok) {
      const data = await planRes.json();
      setPlan(data.plan);
      setPlanWeeks(data.weeks || []);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-sync on login
  useEffect(() => {
    if (athleteId && activities.length === 0 && !syncing) {
      handleSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  // ─── Sync ─────────────────────────────────────────────────────────────

  async function handleSync() {
    if (!athleteId) {
      setSyncResult({ message: "No athlete ID found. Please reconnect with Strava.", type: "error" });
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    setSyncStatus("Connecting to Strava...");
    setSyncCount(0);

    try {
      const res = await fetch("/api/activities/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      });

      if (!res.body) {
        setSyncResult({ message: "Sync failed — no response stream.", type: "error" });
        setSyncing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataMatch = line.match(/^data: (.+)$/m);
          if (!dataMatch) continue;
          try {
            const event = JSON.parse(dataMatch[1]);
            if (event.type === "status") {
              setSyncStatus(event.message);
            } else if (event.type === "progress") {
              setSyncCount(event.total);
              setSyncStatus(`Syncing: ${event.total} activities (${event.latest?.name || ""})`);
            } else if (event.type === "rate_limit") {
              setSyncStatus(null);
              setSyncResult({ message: event.message, type: "warning" });
            } else if (event.type === "done") {
              setSyncStatus(null);
              setSyncResult({
                message: event.message,
                type: event.rateLimited ? "warning" : "success",
              });
              await loadData();
            } else if (event.type === "error") {
              setSyncStatus(null);
              setSyncResult({ message: event.message, type: "error" });
            }
          } catch { /* ignore parse errors */ }
        }
      }

      await loadData();
    } catch {
      setSyncResult({ message: "Sync failed — network error.", type: "error" });
    } finally {
      setSyncing(false);
      setSyncStatus(null);
    }
  }

  // ─── Widget layout management ─────────────────────────────────────────

  const getOrderedVisibleWidgets = (): WidgetConfig[] =>
    Object.values(widgetLayout)
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order);

  const getHiddenWidgets = (): WidgetConfig[] =>
    Object.values(widgetLayout).filter((w) => !w.visible);

  const reorderWidget = (fromId: string, toId: string) => {
    const ordered = getOrderedVisibleWidgets().map((w) => w.id);
    const fromIdx = ordered.indexOf(fromId as WidgetId);
    const toIdx = ordered.indexOf(toId as WidgetId);
    if (fromIdx === -1 || toIdx === -1) return;

    // Remove from old position, insert at new
    ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, fromId as WidgetId);

    // Renumber all orders
    setWidgetLayout((prev) => {
      const next = { ...prev };
      ordered.forEach((id, i) => {
        next[id] = { ...next[id], order: i };
      });
      return next;
    });
  };

  const resizeWidget = (id: string, colSpan: number) => {
    setWidgetLayout((prev) => ({
      ...prev,
      [id]: { ...prev[id], colSpan },
    }));
  };

  const toggleWidgetVisibility = (id: string) => {
    setWidgetLayout((prev) => {
      const widget = prev[id];
      if (widget.visible) {
        return { ...prev, [id]: { ...widget, visible: false } };
      }
      // When restoring, put it at the end with its default colSpan
      const maxOrder = Math.max(...Object.values(prev).filter((w) => w.visible).map((w) => w.order), -1);
      const defaultColSpan = DEFAULT_LAYOUT[id]?.colSpan ?? 6;
      return { ...prev, [id]: { ...widget, visible: true, colSpan: defaultColSpan, order: maxOrder + 1 } };
    });
  };

  const resetLayout = () => setWidgetLayout(DEFAULT_LAYOUT);

  // ─── Derived data ─────────────────────────────────────────────────────

  const weeks = aggregateWeeks(activities);
  const currentWeek = weeks.length > 0 ? weeks[0] : undefined;
  const prev4 = weeks.slice(1, 5);
  const prev4AvgDist = prev4.length > 0 ? prev4.reduce((s, w) => s + w.totalDistance, 0) / prev4.length : 0;
  const weekChange = prev4AvgDist > 0 && currentWeek ? ((currentWeek.totalDistance - prev4AvgDist) / prev4AvgDist) * 100 : 0;

  const runs = activities.filter((a) => a.type === "Run");
  const gymSessions = activities.filter((a) => a.type === "WeightTraining");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentPlanWeek = planWeeks.find((w) => {
    const start = new Date(w.start_date + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return today >= start && today < end;
  }) || null;

  if (!currentPlanWeek && planWeeks.length > 0) {
    const planStartDate = new Date(planWeeks[0].start_date + "T00:00:00");
    const planEndDate = new Date(planWeeks[planWeeks.length - 1].start_date + "T00:00:00");
    planEndDate.setDate(planEndDate.getDate() + 7);
    if (today < planStartDate) currentPlanWeek = planWeeks[0];
    else if (today >= planEndDate) currentPlanWeek = planWeeks[planWeeks.length - 1];
  }

  const mondayStr = toLocalDateStr(getMonday(today));
  const sundayEnd = new Date(getMonday(today));
  sundayEnd.setDate(sundayEnd.getDate() + 7);
  const gymThisWeek = gymSessions.filter((a) => {
    const d = new Date(a.start_date);
    return toLocalDateStr(d) >= mondayStr && d < sundayEnd;
  });

  const last8 = weeks.slice(0, 8).reverse();
  const last8Targets = last8.map((w) => {
    const pw = planWeeks.find((p) => p.start_date === w.weekStart);
    return pw ? pw.target_volume_km * 1000 : 0;
  });
  const maxDist = Math.max(...last8.map((w) => w.totalDistance), ...last8Targets, 1);

  const nextActions = generateNextActions(currentWeek, weeks, activities, currentPlanWeek, !!plan);
  const prs = computePRs(activities);

  const daysToRace = plan ? Math.ceil((new Date(plan.race_date + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // ─── Render widget by ID ──────────────────────────────────────────────

  function renderWidget(widgetId: WidgetId) {
    switch (widgetId) {
      case "thisWeek":
        return currentWeek ? <ThisWeek currentWeek={currentWeek} currentPlanWeek={currentPlanWeek} weekChange={weekChange} /> : null;
      case "raceDay":
        return plan ? <RaceDay plan={plan} daysToRace={daysToRace} /> : null;
      case "nextActions":
        return nextActions.length > 0 ? <NextActionsWidget actions={nextActions} /> : null;
      case "weeklyChart":
        return last8.length > 1 ? <WeeklyChart last8={last8} last8Targets={last8Targets} maxDist={maxDist} /> : null;
      case "gymAndPRs":
        return <GymAndPRs gymThisWeek={gymThisWeek} prs={prs} />;
      case "weeklyBreakdown":
        return (
          <WeeklyBreakdown
            weeks={weeks}
            showAllWeeks={showAllWeeks}
            onToggleShowAll={() => setShowAllWeeks(!showAllWeeks)}
            selectedWeekStart={selectedWeekStart}
            onSelectWeek={(ws) => setSelectedWeekStart(selectedWeekStart === ws ? null : ws)}
          />
        );
      case "weekDetail": {
        const effectiveWeek = selectedWeekStart || (weeks.length > 0 ? weeks[0].weekStart : null);
        return effectiveWeek ? <WeekDetail activities={activities} selectedWeekStart={effectiveWeek} /> : null;
      }
      case "recentRuns":
        return <RecentRuns runs={runs} />;
      default:
        return null;
    }
  }

  // ─── JSX ──────────────────────────────────────────────────────────────

  return (
    <main style={{
      maxWidth: "1400px",
      margin: "0 auto",
      padding: "2rem 2rem",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: COLORS.bg,
      minHeight: "100vh",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: COLORS.textDark, margin: 0 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => setShowWidgetMenu(!showWidgetMenu)} style={{
            color: showWidgetMenu ? COLORS.cardAccent : COLORS.warmGold,
            backgroundColor: showWidgetMenu ? COLORS.warmGold : "transparent",
            border: `2px solid ${COLORS.warmGold}`,
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}>
            ⚙️ Customize
          </button>
          <a href="/training-plan" style={{
            color: COLORS.primaryGreen,
            border: `2px solid ${COLORS.primaryGreen}`,
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "0.9rem",
            fontWeight: 600,
            textDecoration: "none",
            transition: "all 0.2s",
          }}>
            Training Plan
          </a>
          <button onClick={handleSync} disabled={syncing} style={{
            backgroundColor: syncing ? COLORS.textLight : COLORS.primaryGreen,
            color: COLORS.bg,
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: syncing ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}>
            {syncing ? "Syncing..." : "Sync Activities"}
          </button>
        </div>
      </div>

      {/* Widget Customization Menu */}
      {showWidgetMenu && (
        <div style={{
          backgroundColor: COLORS.cardAccent,
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "1.5rem",
          border: `3px solid ${COLORS.warmGold}`,
          boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: COLORS.textDark, margin: 0 }}>
              Dashboard Customization
            </h2>
            <button onClick={resetLayout} style={{
              fontSize: "0.75rem",
              padding: "6px 12px",
              borderRadius: "6px",
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.cardBg,
              color: COLORS.textDark,
              cursor: "pointer",
              fontWeight: 600,
            }}>
              Reset to Default
            </button>
          </div>
          <p style={{ color: COLORS.textMuted, fontSize: "0.85rem", marginBottom: "16px" }}>
            <strong>Drag widgets</strong> by their top bar to reorder. <strong>Drag the right edge</strong> to resize width. Click <strong>✕</strong> to hide.
          </p>

          {getHiddenWidgets().length > 0 && (
            <>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: COLORS.textDark, marginBottom: "10px" }}>
                Hidden Widgets
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {getHiddenWidgets().map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    style={{
                      fontSize: "0.8rem",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: `2px solid ${COLORS.primaryGreen}`,
                      backgroundColor: COLORS.cardBg,
                      color: COLORS.primaryGreen,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    + {WIDGET_REGISTRY[widget.id].name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sync progress */}
      {syncing && syncStatus && (
        <div style={{
          backgroundColor: COLORS.cardAlt,
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          border: `2px solid ${COLORS.primaryGreen}`,
        }}>
          <div style={{
            width: "14px",
            height: "14px",
            border: `2px solid ${COLORS.primaryGreen}`,
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ color: COLORS.textDark, fontSize: "0.85rem" }}>{syncStatus}</span>
          {syncCount > 0 && <span style={{ color: COLORS.textMuted, fontSize: "0.8rem", marginLeft: "auto" }}>{syncCount} saved</span>}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {syncResult && (
        <p style={{
          color: syncResult.type === "error" ? COLORS.error : syncResult.type === "warning" ? COLORS.warning : COLORS.success,
          marginBottom: "1rem",
          fontSize: "0.85rem",
          padding: "12px",
          backgroundColor: COLORS.cardBg,
          borderRadius: "8px",
          border: `1px solid ${syncResult.type === "error" ? COLORS.error : syncResult.type === "warning" ? COLORS.warning : COLORS.success}30`,
        }}>{syncResult.message}</p>
      )}

      {activities.length === 0 && !syncing && (
        <p style={{ color: COLORS.textMuted, textAlign: "center", marginTop: "4rem", fontSize: "0.95rem" }}>
          No activities yet. Syncing automatically...
        </p>
      )}

      {activities.length > 0 && (
        <>
          <div
            id="dashboard-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gridAutoFlow: "row",
              gap: "16px",
              marginBottom: "2rem",
            }}
          >
            {getOrderedVisibleWidgets().map((widgetConfig) => {
              const content = renderWidget(widgetConfig.id);
              if (!content) return null;

              return (
                <WidgetContainer
                  key={widgetConfig.id}
                  config={widgetConfig}
                  title={WIDGET_REGISTRY[widgetConfig.id].name}
                  onReorder={reorderWidget}
                  onResize={(colSpan) => resizeWidget(widgetConfig.id, colSpan)}
                  onRemove={() => toggleWidgetVisibility(widgetConfig.id)}
                >
                  {content}
                </WidgetContainer>
              );
            })}
          </div>

          <p style={{
            color: COLORS.textLight,
            fontSize: "0.75rem",
            textAlign: "center",
            padding: "12px",
            backgroundColor: COLORS.cardAlt,
            borderRadius: "8px",
          }}>
            {activities.length} activities cached · {runs.length} runs · {gymSessions.length} gym sessions
          </p>
        </>
      )}
    </main>
  );
}
