"use client";

import { useEffect, useState, useCallback } from "react";
import { COLORS } from "@/lib/dashboard-helpers";
import type { Activity } from "@/types";
import ThisWeek from "./widgets/this-week";
import WeekDetail from "./widgets/week-detail";
import RecentRuns from "./widgets/recent-runs";
import RunMap from "./widgets/run-map";
import BatteryModal from "./widgets/battery-modal";
import { ReadinessHero } from "./widgets/readiness-hero";
import { DailyBriefingCard } from "./widgets/daily-briefing";
import { ACWRGauge } from "./widgets/acwr-gauge";
import { WeatherPanel } from "./widgets/weather";
import { TipPanel } from "./widgets/tip-panel";
import { PlanAdherenceCard } from "./widgets/plan-adherence";
import { StreakTracker } from "./widgets/streak-tracker";
import { useActivities, useTrainingPlan, useSyncStream, useDashboardData } from "./hooks";
import { useCoach } from "./hooks/use-coach";
import { useTips } from "./hooks/use-tips";

export default function Dashboard() {
  const { activities, loadActivities } = useActivities();
  const { plan, planWeeks, loadPlan } = useTrainingPlan();

  const loadData = useCallback(async () => {
    await Promise.all([loadActivities(), loadPlan()]);
  }, [loadActivities, loadPlan]);

  const { syncing, syncStatus, syncResult, syncCount, newlySyncedIds, clearSyncedIds, handleSync } =
    useSyncStream(loadData);
  const {
    weeks,
    currentWeek,
    weekChange,
    sufferScoreChange,
    runs,
    currentPlanWeek,
    nextActions,
    daysToRace,
    streaks,
    adherence,
  } = useDashboardData(activities, plan, planWeeks);

  // v2: Coach intelligence
  const { data: coachData, reload: reloadCoach } = useCoach();
  const { tips } = useTips();

  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showBatteryModal, setShowBatteryModal] = useState(false);

  // Show battery modal when sync completes with new activities
  useEffect(() => {
    if (!syncing && newlySyncedIds.length > 0) {
      setShowBatteryModal(true);
    }
  }, [syncing, newlySyncedIds]);

  const handleBatteryUpdate = useCallback(
    (stravaId: string, start: number | null, end: number | null) => {
      loadActivities();
    },
    [loadActivities],
  );

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData().then(() => setLoaded(true));
  }, [loadData]);

  // Auto-sync only when data has loaded and there are truly no activities
  useEffect(() => {
    if (loaded && activities.length === 0 && !syncing) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, activities.length]);

  // Reload coach data when activities change
  useEffect(() => {
    if (activities.length > 0 && loaded) {
      reloadCoach();
    }
  }, [activities.length, loaded, reloadCoach]);

  // Keep selected activity in sync with reloaded data
  useEffect(() => {
    if (activities.length === 0) return;
    if (selectedActivity) {
      const updated = activities.find((a) => a.strava_id === selectedActivity.strava_id);
      if (updated && updated !== selectedActivity) setSelectedActivity(updated);
    } else {
      const mostRecentRun = activities.find((a) => a.type === "Run");
      if (mostRecentRun) setSelectedActivity(mostRecentRun);
    }
  }, [activities, selectedActivity]);

  // Clean up old localStorage keys from previous widget system
  useEffect(() => {
    localStorage.removeItem("widgetLayout_v2");
    localStorage.removeItem("widgetLayout_v3");
  }, []);

  const effectiveWeekStart = selectedWeekStart || (weeks.length > 0 ? weeks[0].weekStart : null);

  return (
    <main className="max-w-[1400px] mx-auto p-8 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2.5">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-light text-neutral-100 tracking-tight m-0">Ground Control</h1>
          {plan && daysToRace > 0 && (
            <span
              className="text-sm font-medium text-neutral-400 bg-neutral-800/60 px-3 py-1 rounded-lg border border-neutral-700"
              data-tooltip={`${daysToRace} days until ${plan.race_name || "race"} (${plan.race_distance_km} km) on ${plan.race_date}`}
            >
              {plan.race_name || `${plan.race_distance_km} km`} &middot; {daysToRace} days
            </span>
          )}
        </div>
        <div className="flex gap-2.5 items-center">
          <a
            href="/training-plan"
            className="border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-neutral-200 rounded-lg px-4 py-2 text-sm font-medium no-underline transition-all"
          >
            Training Plan
          </a>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-neutral-200 text-neutral-900 hover:bg-neutral-300 disabled:bg-neutral-600 disabled:text-neutral-400 disabled:cursor-not-allowed border-none rounded-lg px-4 py-2 text-sm font-medium cursor-pointer transition-all"
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Sync progress */}
      {syncing && syncStatus && (
        <div className="bg-neutral-900/40 rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5 border border-neutral-800">
          <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-300 text-sm">{syncStatus}</span>
          {syncCount > 0 && <span className="text-neutral-500 text-xs ml-auto">{syncCount} saved</span>}
        </div>
      )}

      {syncResult && (
        <p
          className="mb-4 text-sm px-3 py-3 rounded-lg bg-neutral-900/40"
          style={{
            color: syncResult.type === "error" ? COLORS.error : COLORS.textMuted,
            border: `1px solid ${syncResult.type === "error" ? "rgba(248,113,113,0.2)" : "rgba(163,163,163,0.15)"}`,
          }}
        >
          {syncResult.message}
        </p>
      )}

      {activities.length === 0 && !syncing && (
        <p className="text-neutral-500 text-center mt-16 text-sm">No activities yet. Syncing automatically...</p>
      )}

      {activities.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Readiness Hero */}
          <ReadinessHero readiness={coachData?.readiness ?? null} />

          {/* Daily Briefing */}
          <DailyBriefingCard briefing={coachData?.briefing ?? null} />

          {/* Weather */}
          <WeatherPanel />

          {/* ACWR + This Week */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "2fr 3fr" }}>
            <ACWRGauge acwr={coachData?.acwr ?? null} />
            {currentWeek && (
              <ThisWeek
                currentWeek={currentWeek}
                currentPlanWeek={currentPlanWeek}
                weekChange={weekChange}
                sufferScoreChange={sufferScoreChange}
                actions={nextActions}
              />
            )}
          </div>

          {/* Tips */}
          <TipPanel tips={tips} />

          {/* Run Map */}
          <RunMap selectedActivity={selectedActivity} />

          {/* Week Detail */}
          {effectiveWeekStart && (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-all">
              <WeekDetail
                activities={activities}
                selectedWeekStart={effectiveWeekStart}
                selectedActivityId={selectedActivity?.strava_id ?? null}
                onSelectActivity={setSelectedActivity}
                onWeekChange={setSelectedWeekStart}
                weeks={weeks}
              />
            </div>
          )}

          {/* Plan Adherence + Streak Tracker */}
          {(adherence || streaks) && (
            <div className="grid gap-4 grid-cols-2">
              <PlanAdherenceCard adherence={adherence} />
              <StreakTracker streaks={streaks} />
            </div>
          )}

          {/* Recent Runs */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-all">
            <RecentRuns runs={runs} onBatteryUpdate={handleBatteryUpdate} />
          </div>

          <p className="text-neutral-600 text-xs text-center px-3 py-3 bg-neutral-900/30 rounded-lg">
            {activities.length} activities cached &middot; {runs.length} runs
          </p>
        </div>
      )}

      {showBatteryModal && newlySyncedIds.length > 0 && (
        <BatteryModal
          activities={activities.filter((a) => newlySyncedIds.includes(a.strava_id) && a.type === "Run")}
          onClose={() => {
            setShowBatteryModal(false);
            clearSyncedIds();
          }}
          onSaved={handleBatteryUpdate}
        />
      )}
    </main>
  );
}
