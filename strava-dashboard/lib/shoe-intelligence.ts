/**
 * Shoe intelligence: lifecycle alerts, rotation warnings, mileage predictions.
 *
 * All functions are pure — no DB imports, safe for client-side use.
 */

import type { Shoe } from "@/types";
import type { Activity } from "@/types";

export type ShoeAlertLevel = "ok" | "warning" | "critical";

export interface ShoeAlert {
  shoeId: number;
  shoeName: string;
  level: ShoeAlertLevel;
  message: string;
}

export interface ShoeRotationWarning {
  shoeId: number;
  shoeName: string;
  runsInWindow: number;
  windowRuns: number;
  pct: number; // % of window runs on this shoe
}

export interface ShoePrediction {
  shoeId: number;
  shoeName: string;
  currentKm: number;
  weeksToLimit: number | null; // null = already past limit
  weeklyKmRate: number;
}

const RETIRE_LIMIT_KM = 700;
const WARN_AT_KM = 600;
const ROTATION_WINDOW_DAYS = 14;
const ROTATION_WARN_PCT = 0.8; // flag if one shoe has >80% of runs in window

/** Lifecycle alerts: warn at 600km, critical at 700km */
export function getShoeAlerts(shoes: Shoe[]): ShoeAlert[] {
  const alerts: ShoeAlert[] = [];
  for (const shoe of shoes) {
    if (shoe.retired) continue;
    const km = shoe.total_km ?? 0;
    if (km >= RETIRE_LIMIT_KM) {
      alerts.push({
        shoeId: shoe.id,
        shoeName: shoe.name,
        level: "critical",
        message: `${Math.round(km)} km — past recommended ${RETIRE_LIMIT_KM} km limit. Replace soon.`,
      });
    } else if (km >= WARN_AT_KM) {
      const remaining = Math.round(RETIRE_LIMIT_KM - km);
      alerts.push({
        shoeId: shoe.id,
        shoeName: shoe.name,
        level: "warning",
        message: `${Math.round(km)} km — ~${remaining} km left before replacement.`,
      });
    }
  }
  return alerts;
}

/** Rotation warning: flag if one shoe dominated last 14 days */
export function getRotationWarning(
  shoes: Shoe[],
  activities: Activity[],
): ShoeRotationWarning | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ROTATION_WINDOW_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const windowRuns = activities.filter(
    (a) => a.type === "Run" && a.shoe_id != null && a.start_date.slice(0, 10) >= cutoffStr,
  );
  if (windowRuns.length < 3) return null;

  const countByShoe = new Map<number, number>();
  for (const r of windowRuns) {
    if (r.shoe_id == null) continue;
    countByShoe.set(r.shoe_id, (countByShoe.get(r.shoe_id) ?? 0) + 1);
  }

  for (const [shoeId, count] of countByShoe) {
    const pct = count / windowRuns.length;
    if (pct > ROTATION_WARN_PCT) {
      const shoe = shoes.find((s) => s.id === shoeId);
      if (!shoe || shoe.retired) continue;
      return {
        shoeId,
        shoeName: shoe.name,
        runsInWindow: count,
        windowRuns: windowRuns.length,
        pct,
      };
    }
  }
  return null;
}

/**
 * At the current weekly km rate (last 4 weeks of Strava runs for this shoe),
 * predict how many weeks until the shoe hits 700km.
 */
export function getShoePredictions(shoes: Shoe[], activities: Activity[]): ShoePrediction[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recentRuns = activities.filter(
    (a) => a.type === "Run" && a.shoe_id != null && a.start_date.slice(0, 10) >= cutoffStr,
  );

  const kmByShoe = new Map<number, number>();
  for (const r of recentRuns) {
    if (r.shoe_id == null) continue;
    kmByShoe.set(r.shoe_id, (kmByShoe.get(r.shoe_id) ?? 0) + r.distance / 1000);
  }

  return shoes
    .filter((s) => !s.retired)
    .map((shoe) => {
      const currentKm = shoe.total_km ?? 0;
      const weeklyKmRate = (kmByShoe.get(shoe.id) ?? 0) / 4;
      let weeksToLimit: number | null = null;
      if (currentKm >= RETIRE_LIMIT_KM) {
        weeksToLimit = null; // already past limit
      } else if (weeklyKmRate > 0) {
        weeksToLimit = Math.ceil((RETIRE_LIMIT_KM - currentKm) / weeklyKmRate);
      }
      return { shoeId: shoe.id, shoeName: shoe.name, currentKm, weeksToLimit, weeklyKmRate };
    })
    .filter((p) => p.weeklyKmRate > 0 || (p.currentKm >= WARN_AT_KM));
}
