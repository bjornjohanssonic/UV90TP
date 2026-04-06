"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tip } from "@/types/coach";

export function useTips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  const seedTips = useCallback(async () => {
    try {
      await fetch("/api/tips/seed", { method: "POST" });
      setSeeded(true);
    } catch {
      // silently fail
    }
  }, []);

  const loadTips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tips?trigger=daily");
      if (res.ok) {
        const json = await res.json();
        const allTips = [...(json.daily ?? []), ...(json.contextual ?? [])];
        setTips(allTips);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Seed first, then load
    seedTips().then(() => loadTips());
  }, [seedTips, loadTips]);

  return { tips, loading, reload: loadTips };
}
