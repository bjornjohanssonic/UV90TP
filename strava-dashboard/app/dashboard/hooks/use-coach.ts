"use client";

import { useState, useEffect, useCallback } from "react";
import type { CoachResponse } from "@/types/coach";

export function useCoach() {
  const [data, setData] = useState<CoachResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCoach = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach");
      if (res.ok) {
        const json: CoachResponse = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  return { data, loading, reload: loadCoach };
}
