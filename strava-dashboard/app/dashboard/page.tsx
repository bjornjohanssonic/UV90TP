"use client";

import { useEffect, useState, useCallback } from "react";
import { COLORS } from "@/lib/dashboard-helpers";
import type { Activity, Shoe } from "@/types";
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
  const [shoes, setShoes] = useState<Shoe[]>([]);

  const loadShoes = useCallback(async () => {
    const res = await fetch("/api/shoes");
    if (res.ok) setShoes(await res.json());
  }, []);

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
    loadShoes();
  }, [loadData, loadShoes]);

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
          <h1 className="text-3xl font-light text-stone-800 tracking-tight m-0">Ground Control</h1>
          {plan && daysToRace > 0 && (
            <span
              className="text-sm font-medium text-stone-500 bg-stone-100/80 px-3 py-1 rounded-lg border border-stone-300"
              data-tooltip={`${daysToRace} days until ${plan.race_name || "race"} (${plan.race_distance_km} km) on ${plan.race_date}`}
            >
              {plan.race_name || `${plan.race_distance_km} km`} &middot; {daysToRace} days
            </span>
          )}
        </div>
        <div className="flex gap-2.5 items-center">
          <a
            href="/training-plan"
            className="border border-stone-300 hover:border-stone-400 text-stone-500 hover:text-stone-800 rounded-lg px-4 py-2 text-sm font-medium no-underline transition-all"
          >
            Training Plan
          </a>
          <a
            href="/shoes"
            className="border border-stone-300 hover:border-stone-400 text-stone-500 hover:text-stone-800 rounded-lg px-4 py-2 text-sm font-medium no-underline transition-all"
          >
            Skor
          </a>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-stone-800 text-white hover:bg-stone-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed border-none rounded-lg px-4 py-2 text-sm font-medium cursor-pointer transition-all"
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Sync progress */}
      {syncing && syncStatus && (
        <div className="bg-white/60 rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5 border border-stone-200">
          <div className="w-3.5 h-3.5 border-2 border-stone-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-stone-700 text-sm">{syncStatus}</span>
          {syncCount > 0 && <span className="text-stone-500 text-xs ml-auto">{syncCount} saved</span>}
        </div>
      )}

      {syncResult && (
        <p
          className="mb-4 text-sm px-3 py-3 rounded-lg bg-white/60"
          style={{
            color: syncResult.type === "error" ? COLORS.error : COLORS.textMuted,
            border: `1px solid ${syncResult.type === "error" ? "rgba(220,38,38,0.2)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          {syncResult.message}
        </p>
      )}

      {activities.length === 0 && !syncing && (
        <p className="text-stone-500 text-center mt-16 text-sm">No activities yet. Syncing automatically...</p>
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

          {/* Run Map + Week Detail — side by side */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <RunMap selectedActivity={selectedActivity} />
            {effectiveWeekStart && (
              <div className="bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-300 transition-all">
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
          </div>

          {/* Plan Adherence + Streak Tracker */}
          {(adherence || streaks) && (
            <div className="grid gap-4 grid-cols-2">
              <PlanAdherenceCard adherence={adherence} />
              <StreakTracker streaks={streaks} />
            </div>
          )}

          {/* Recent Runs */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-300 transition-all">
            <RecentRuns runs={runs} shoes={shoes} onBatteryUpdate={handleBatteryUpdate} />
          </div>

          <p className="text-stone-400 text-xs text-center px-3 py-3 bg-white/40 rounded-lg">
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
            loadShoes();
            loadActivities();
          }}
          onSaved={handleBatteryUpdate}
        />
      )}
    </main>
  );
}
