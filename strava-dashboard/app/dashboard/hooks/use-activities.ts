import { useState, useCallback } from "react";
import type { Activity } from "@/types";

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);

  const loadActivities = useCallback(async () => {
    const res = await fetch("/api/activities");
    if (res.ok) setActivities(await res.json());
  }, []);

  return { activities, loadActivities };
}
