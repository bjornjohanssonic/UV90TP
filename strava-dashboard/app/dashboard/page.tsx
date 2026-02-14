"use client";

import { useEffect, useState, useCallback } from "react";
import { COLORS } from "@/lib/dashboard-helpers";
import { type WidgetId, WIDGET_REGISTRY } from "./widgets/widget-types";
import WidgetContainer from "./widgets/widget-container";
import ThisWeek from "./widgets/this-week";
import RaceDay from "./widgets/race-day";
import NextActionsWidget from "./widgets/next-actions";
import WeeklyChart from "./widgets/weekly-chart";
import GymAndPRs from "./widgets/gym-and-prs";
import WeeklyBreakdown from "./widgets/weekly-breakdown";
import WeekDetail from "./widgets/week-detail";
import RecentRuns from "./widgets/recent-runs";
import WidgetErrorBoundary from "./widgets/widget-error-boundary";
import { useActivities, useTrainingPlan, useSyncStream, useWidgetLayout, useDashboardData } from "./hooks";
import styles from "./page.module.css";

export default function Dashboard() {
  const { activities, loadActivities } = useActivities();
  const { plan, planWeeks, loadPlan } = useTrainingPlan();

  const loadData = useCallback(async () => {
    await Promise.all([loadActivities(), loadPlan()]);
  }, [loadActivities, loadPlan]);

  const { syncing, syncStatus, syncResult, syncCount, handleSync } = useSyncStream(loadData);
  const {
    showWidgetMenu,
    setShowWidgetMenu,
    getOrderedVisibleWidgets,
    getHiddenWidgets,
    reorderWidget,
    resizeWidget,
    toggleWidgetVisibility,
    resetLayout,
  } = useWidgetLayout();
  const {
    weeks,
    currentWeek,
    weekChange,
    runs,
    gymSessions,
    currentPlanWeek,
    gymThisWeek,
    last8,
    last8Targets,
    maxDist,
    nextActions,
    prs,
    daysToRace,
  } = useDashboardData(activities, plan, planWeeks);

  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-sync when no activities
  useEffect(() => {
    if (activities.length === 0 && !syncing) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities.length]);

  // ─── Render widget by ID ──────────────────────────────────────────────

  function renderWidget(widgetId: WidgetId) {
    switch (widgetId) {
      case "thisWeek":
        return currentWeek ? (
          <ThisWeek currentWeek={currentWeek} currentPlanWeek={currentPlanWeek} weekChange={weekChange} />
        ) : null;
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
    <main className={styles.main}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Dashboard</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowWidgetMenu(!showWidgetMenu)}
            className={styles.customizeBtn}
            style={{
              color: showWidgetMenu ? COLORS.cardAccent : COLORS.warmGold,
              backgroundColor: showWidgetMenu ? COLORS.warmGold : "transparent",
            }}
          >
            ⚙️ Customize
          </button>
          <a href="/training-plan" className={styles.planLink}>
            Training Plan
          </a>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={styles.syncBtn}
            style={{ backgroundColor: syncing ? COLORS.textLight : COLORS.primaryGreen }}
          >
            {syncing ? "Syncing..." : "Sync Activities"}
          </button>
        </div>
      </div>

      {/* Widget Customization Menu */}
      {showWidgetMenu && (
        <div className={styles.customizeMenu}>
          <div className={styles.customizeHeader}>
            <h2 className={styles.customizeTitle}>Dashboard Customization</h2>
            <button onClick={resetLayout} className={styles.resetBtn}>
              Reset to Default
            </button>
          </div>
          <p className={styles.customizeHint}>
            <strong>Drag widgets</strong> by their top bar to reorder. <strong>Drag the right edge</strong> to resize
            width. Click <strong>✕</strong> to hide.
          </p>

          {getHiddenWidgets().length > 0 && (
            <>
              <h3 className={styles.hiddenTitle}>Hidden Widgets</h3>
              <div className={styles.hiddenList}>
                {getHiddenWidgets().map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className={styles.hiddenBtn}
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
        <div className={styles.syncProgress}>
          <div className={styles.syncSpinner} />
          <span className={styles.syncStatusText}>{syncStatus}</span>
          {syncCount > 0 && <span className={styles.syncCountText}>{syncCount} saved</span>}
        </div>
      )}

      {syncResult && (
        <p
          className={styles.syncResult}
          style={{
            color:
              syncResult.type === "error"
                ? COLORS.error
                : syncResult.type === "warning"
                  ? COLORS.warning
                  : COLORS.success,
            border: `1px solid ${syncResult.type === "error" ? COLORS.error : syncResult.type === "warning" ? COLORS.warning : COLORS.success}30`,
          }}
        >
          {syncResult.message}
        </p>
      )}

      {activities.length === 0 && !syncing && (
        <p className={styles.emptyState}>No activities yet. Syncing automatically...</p>
      )}

      {activities.length > 0 && (
        <>
          <div id="dashboard-grid" className={styles.grid}>
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
                  <WidgetErrorBoundary widgetName={WIDGET_REGISTRY[widgetConfig.id].name}>
                    {content}
                  </WidgetErrorBoundary>
                </WidgetContainer>
              );
            })}
          </div>

          <p className={styles.footer}>
            {activities.length} activities cached · {runs.length} runs · {gymSessions.length} gym sessions
          </p>
        </>
      )}
    </main>
  );
}
