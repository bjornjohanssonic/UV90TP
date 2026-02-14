import { useState, useCallback } from "react";
import type { Plan, PlanWeek } from "@/types";

export function useTrainingPlan() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planWeeks, setPlanWeeks] = useState<PlanWeek[]>([]);

  const loadPlan = useCallback(async () => {
    const res = await fetch("/api/training-plan");
    if (res.ok) {
      const data = await res.json();
      setPlan(data.plan);
      setPlanWeeks(data.weeks || []);
    }
  }, []);

  return { plan, planWeeks, loadPlan };
}
