import type { Activity } from "@/types";
import type { ACWRResult } from "@/types/coach";

export function computeACWR(activities: Activity[]): ACWRResult {
  const runs = activities.filter((a) => a.type === "Run");
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const daysAgo = (days: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const sevenDaysAgo = daysAgo(7);
  const twentyEightDaysAgo = daysAgo(28);

  // Acute load: total run distance in last 7 days (km)
  const acuteLoadKm = runs
    .filter((r) => new Date(r.start_date) >= sevenDaysAgo)
    .reduce((sum, r) => sum + r.distance / 1000, 0);

  // Chronic load: average weekly run distance over last 28 days (km)
  const last28DaysKm = runs
    .filter((r) => new Date(r.start_date) >= twentyEightDaysAgo)
    .reduce((sum, r) => sum + r.distance / 1000, 0);
  const chronicLoadKm = last28DaysKm / 4;

  // Ratio
  const ratio = chronicLoadKm > 0 ? acuteLoadKm / chronicLoadKm : 0;

  // Zone classification
  let zone: "green" | "yellow" | "red";
  let label: string;

  if (ratio >= 0.8 && ratio <= 1.3) {
    zone = "green";
    label = "Sweet spot";
  } else if ((ratio >= 0.6 && ratio < 0.8) || (ratio > 1.3 && ratio <= 1.5)) {
    zone = "yellow";
    label = ratio < 0.8 ? "Undertraining" : "Caution";
  } else {
    zone = "red";
    label = ratio > 1.5 ? "Danger zone" : ratio === 0 ? "No data" : "Detraining";
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    acuteLoadKm: Math.round(acuteLoadKm * 10) / 10,
    chronicLoadKm: Math.round(chronicLoadKm * 10) / 10,
    zone,
    label,
  };
}
