import type { Activity, WeekData, NextAction, PlanWeek, Plan } from "@/types";

export type { Activity, WeekData, NextAction, PlanWeek, Plan };

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Format a Date as "YYYY-MM-DD" in local time (avoids UTC shift from toISOString). */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatKm(meters: number): string {
  return (meters / 1000).toFixed(1);
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatPace(meters: number, seconds: number): string {
  if (meters === 0) return "-";
  const pace = seconds / (meters / 1000);
  const m = Math.floor(pace / 60);
  const s = Math.round(pace % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" });
}

export function weekLabel(mondayStr: string): string {
  const mon = new Date(mondayStr);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return `${mon.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })} – ${sun.toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}`;
}

export function formatTimeOfDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

export function formatStartEnd(startDate: string, elapsedTime: number): string {
  const start = new Date(startDate);
  const end = new Date(start.getTime() + elapsedTime * 1000);
  const fmt = (d: Date) => d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)}\u2013${fmt(end)}`;
}

export function formatBattery(start: number | null, end: number | null): string {
  if (start == null && end == null) return "\u2014";
  if (start != null && end != null) return `${start}% \u2192 ${end}%`;
  if (start != null) return `${start}%`;
  return `\u2192 ${end}%`;
}

export function batteryDrain(start: number | null, end: number | null): number | null {
  if (start == null || end == null) return null;
  return start - end;
}

export function getDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

// ─── Colors ─────────────────────────────────────────────────────────────────

export const COLORS = {
  bg: "#0a0a0a",
  cardBg: "rgba(163,163,163,0.08)",
  cardAlt: "rgba(163,163,163,0.04)",
  cardAccent: "#171717",
  primaryNeutral: "#d4d4d4",
  accentNeutral: "#a3a3a3",
  warmNeutral: "#737373",
  darkNeutral: "#525252",
  textDark: "#ededed",
  textMuted: "#a3a3a3",
  textLight: "#737373",
  border: "#262626",
  success: "#a3a3a3",
  warning: "#737373",
  error: "#f87171",
};

export const PHASE_COLORS: Record<string, string> = {
  build: "#d4d4d4",
  recovery: "#737373",
  taper: "#a3a3a3",
  race: "#525252",
};

export const PHASE_LABELS: Record<string, string> = {
  build: "Build",
  recovery: "Recovery",
  taper: "Taper",
  race: "Race Week",
};

// ─── Weekly aggregation ─────────────────────────────────────────────────────

export function aggregateWeeks(activities: Activity[]): WeekData[] {
  const runs = activities.filter((a) => a.type === "Run");
  const weekMap = new Map<string, Activity[]>();

  for (const run of runs) {
    const monday = getMonday(new Date(run.start_date));
    const key = toLocalDateStr(monday);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(run);
  }

  const weeks: WeekData[] = [];
  for (const [mondayKey, acts] of weekMap) {
    const totalDistance = acts.reduce((s, a) => s + a.distance, 0);
    const totalTime = acts.reduce((s, a) => s + a.moving_time, 0);
    const longestRun = Math.max(...acts.map((a) => a.distance));
    const totalElevation = acts.reduce((s, a) => s + a.total_elevation_gain, 0);
    const totalSufferScore = acts.reduce((s, a) => s + (a.suffer_score ?? 0), 0);
    weeks.push({
      weekStart: mondayKey,
      weekLabel: weekLabel(mondayKey),
      totalDistance,
      totalTime,
      runs: acts.length,
      avgPace: totalDistance > 0 ? totalTime / (totalDistance / 1000) : 0,
      longestRun,
      totalElevation,
      totalSufferScore,
    });
  }

  weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return weeks;
}

// ─── Next Actions ───────────────────────────────────────────────────────────

export function generateNextActions(
  currentWeek: WeekData | undefined,
  weeks: WeekData[],
  activities: Activity[],
  planWeek: PlanWeek | null,
  hasPlan: boolean,
): NextAction[] {
  const actions: NextAction[] = [];
  const dayOfWeek = getDayOfWeek();
  const daysLeft = 7 - dayOfWeek;
  const runs = activities.filter((a) => a.type === "Run");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentWeeks = weeks.slice(0, 4).filter((w) => w.runs > 0);
  const avgPace4w = recentWeeks.length > 0 ? recentWeeks.reduce((s, w) => s + w.avgPace, 0) / recentWeeks.length : 0;
  const paceStr = avgPace4w > 0 ? formatPace(1000, avgPace4w) : "easy";

  let consecutiveDays = 0;
  const checkDate = new Date(today);
  for (let i = 0; i < 7; i++) {
    const dayStr = toLocalDateStr(checkDate);
    if (runs.some((r) => r.start_date.slice(0, 10) === dayStr)) {
      consecutiveDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }

  if (!hasPlan) {
    actions.push({
      icon: "📋",
      action: "Create a training plan",
      reason: "Get personalized weekly targets and structured progression",
      priority: "medium",
    });
    return actions;
  }

  if (!planWeek) {
    if (runs.length > 0) {
      const recentDist = currentWeek ? currentWeek.totalDistance / 1000 : 0;
      actions.push({
        icon: "🏃",
        action: `Continue your training at ${recentDist.toFixed(0)}km/week`,
        reason: "Plan period outside current week - maintain your base",
        priority: "medium",
      });
    } else {
      actions.push({
        icon: "▶️",
        action: "Start your training plan",
        reason: "Your plan is ready - time to begin",
        priority: "high",
      });
    }
    return actions;
  }

  const minTarget = planWeek.target_volume_km * 0.9;
  const remaining = planWeek.target_volume_km - planWeek.actualVolumeKm;
  const minRemaining = Math.max(0, minTarget - planWeek.actualVolumeKm);
  const longestThisWeek = currentWeek ? currentWeek.longestRun / 1000 : 0;
  const longRunNeeded = planWeek.long_run_km > 0 && longestThisWeek < planWeek.long_run_km * 0.9;
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 7;

  if (consecutiveDays >= 4) {
    actions.push({
      icon: "🛌",
      action: "Take a rest day today",
      reason: `${consecutiveDays} consecutive run days—recovery prevents injury`,
      priority: "high",
    });
    return actions;
  }

  if (planWeek.phase === "race") {
    actions.push({
      icon: "🏁",
      action: "Easy shakeout run (20-30 min max)",
      reason: "Race week: stay loose, stay rested",
      priority: "high",
    });
    return actions;
  }

  if (planWeek.phase === "taper") {
    if (remaining > 0 && daysLeft > 0) {
      const shortRun = Math.min(remaining, 8);
      actions.push({
        icon: "🎯",
        action: `Short ${shortRun.toFixed(0)}km run at comfortable pace`,
        reason: `Taper week: ${remaining.toFixed(1)}km left, keep efforts brief`,
        priority: "medium",
      });
    } else {
      actions.push({
        icon: "✅",
        action: "Week complete—rest or easy cross-training only",
        reason: "Taper volume met, focus on staying fresh",
        priority: "low",
      });
    }
    return actions;
  }

  if (longRunNeeded && planWeek.phase !== "recovery") {
    const proportionLeft = remaining / planWeek.target_volume_km;

    if (remaining >= planWeek.long_run_km * 0.8 && remaining <= planWeek.long_run_km * 1.3) {
      if (isSaturday) {
        actions.push({
          icon: "🏃",
          action: planWeek.back_to_back
            ? `Do ${planWeek.long_run_km}km long run this weekend + ${Math.round(planWeek.long_run_km * 0.65)}km tomorrow`
            : `Do your ${planWeek.long_run_km}km long run this weekend`,
          reason: `${remaining.toFixed(1)}km left—Saturday or Sunday both work`,
          priority: "high",
        });
      } else if (isSunday) {
        actions.push({
          icon: "🏃",
          action: planWeek.back_to_back
            ? `Complete ${Math.round(planWeek.long_run_km * 0.65)}km second long run TODAY`
            : `Do your ${planWeek.long_run_km}km long run TODAY`,
          reason: `${remaining.toFixed(1)}km left—last day to get it done`,
          priority: "high",
        });
      } else if (dayOfWeek >= 4) {
        actions.push({
          icon: "📅",
          action: `Schedule ${planWeek.long_run_km}km long run for this weekend`,
          reason: `${remaining.toFixed(1)}km remaining—save your long run for Sat/Sun`,
          priority: "high",
        });
      } else {
        actions.push({
          icon: "🗓️",
          action: `Build base this week, do ${planWeek.long_run_km}km long run on weekend`,
          reason: `${remaining.toFixed(1)}km left—spread shorter runs midweek`,
          priority: "medium",
        });
      }
    } else if (isSaturday && proportionLeft >= 0.35) {
      actions.push({
        icon: "🏃",
        action: planWeek.back_to_back
          ? `Consider long run TODAY: ${planWeek.long_run_km}km, then ${Math.round(planWeek.long_run_km * 0.65)}km tomorrow`
          : `Consider ${planWeek.long_run_km}km long run TODAY or tomorrow`,
        reason: `${remaining.toFixed(1)}km left—weekend is here`,
        priority: "high",
      });
    } else if (isSunday && proportionLeft >= 0.2) {
      actions.push({
        icon: "🏃",
        action: planWeek.back_to_back
          ? `Complete ${Math.round(planWeek.long_run_km * 0.65)}km second long run TODAY`
          : `Do ${planWeek.long_run_km}km long run TODAY (last chance!)`,
        reason: `${remaining.toFixed(1)}km remaining—complete your long run today`,
        priority: "high",
      });
    } else if (dayOfWeek <= 3 && remaining > planWeek.long_run_km) {
      actions.push({
        icon: "🗓️",
        action: "Build mileage during the week, save long run for weekend",
        reason: `${remaining.toFixed(1)}km left—plan ${planWeek.long_run_km}km long run for Sat/Sun`,
        priority: "medium",
      });
    }
  }

  if (minRemaining > 0 && daysLeft > 0 && actions.length === 0) {
    const perDay = minRemaining / daysLeft;

    if (planWeek.phase === "recovery") {
      actions.push({
        icon: "🧘",
        action: `Easy ${perDay.toFixed(1)}km runs at recovery pace (slower than ${paceStr}/km)`,
        reason: `Recovery week: at least ${minRemaining.toFixed(1)}km left, low intensity`,
        priority: "medium",
      });
    } else if (perDay > 12) {
      actions.push({
        icon: "⚠️",
        action: `Run at least ${perDay.toFixed(1)}km per day for ${daysLeft} days`,
        reason: "High daily volume needed—consider adding an extra run day",
        priority: "high",
      });
    } else if (perDay > 0) {
      actions.push({
        icon: "✓",
        action: `At least ${perDay.toFixed(1)}km per day for ${daysLeft} remaining days`,
        reason: `Get at least ${Math.ceil(minTarget)}km in this week (target ${planWeek.target_volume_km}km)`,
        priority: "medium",
      });
    }
  } else if (minRemaining <= 0) {
    if (consecutiveDays >= 2) {
      actions.push({
        icon: "🎉",
        action: "Rest day or easy recovery run only",
        reason: "Weekly minimum met—prioritize recovery",
        priority: "low",
      });
    } else {
      actions.push({
        icon: "✅",
        action: remaining <= 0 ? "Week complete! Extra miles should be easy effort" : "Minimum met—any extra km is bonus",
        reason: `At least ${Math.ceil(minTarget)}km target reached`,
        priority: "low",
      });
    }
  }

  if (consecutiveDays >= 3 && !actions.some((a) => a.icon === "🛌")) {
    actions.push({
      icon: "💡",
      action: "Consider a rest day tomorrow",
      reason: `${consecutiveDays} consecutive run days—recovery helps adaptation`,
      priority: "medium",
    });
  }

  return actions.slice(0, 3);
}
