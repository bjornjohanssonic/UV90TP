import { useMemo } from "react";
import type { Activity, Plan, PlanWeek } from "@/types";
import { getMonday, toLocalDateStr, aggregateWeeks, computePRs, generateNextActions } from "@/lib/dashboard-helpers";

export function useDashboardData(activities: Activity[], plan: Plan | null, planWeeks: PlanWeek[]) {
  return useMemo(() => {
    const weeks = aggregateWeeks(activities);
    const currentWeek = weeks.length > 0 ? weeks[0] : undefined;
    const prev4 = weeks.slice(1, 5);
    const prev4AvgDist = prev4.length > 0 ? prev4.reduce((s, w) => s + w.totalDistance, 0) / prev4.length : 0;
    const weekChange =
      prev4AvgDist > 0 && currentWeek ? ((currentWeek.totalDistance - prev4AvgDist) / prev4AvgDist) * 100 : 0;

    const runs = activities.filter((a) => a.type === "Run");
    const gymSessions = activities.filter((a) => a.type === "WeightTraining");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentPlanWeek =
      planWeeks.find((w) => {
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

    const daysToRace = plan
      ? Math.ceil((new Date(plan.race_date + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
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
    };
  }, [activities, plan, planWeeks]);
}
