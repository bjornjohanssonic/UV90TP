// ─── Types ──────────────────────────────────────────────────────────────────

export interface Activity {
  strava_id: string;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  max_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  total_elevation_gain: number;
  start_date: string;
  suffer_score: number | null;
}

export interface PlanWeek {
  week_number: number;
  start_date: string;
  target_volume_km: number;
  long_run_km: number;
  back_to_back: number;
  phase: string;
  cycle_number: number | null;
  week_in_cycle: number | null;
  actualVolumeKm: number;
  runCount: number;
  gymCount: number;
}

export interface Plan {
  id: number;
  name: string;
  race_name: string | null;
  race_date: string;
  race_distance_km: number;
  peak_volume_km: number;
}

export interface WeekData {
  weekStart: string;
  weekLabel: string;
  totalDistance: number;
  totalTime: number;
  runs: number;
  avgPace: number;
  longestRun: number;
  totalElevation: number;
}

export interface PersonalRecord {
  label: string;
  value: string;
  activity: string;
  date: string;
}

export interface NextAction {
  icon: string;
  action: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
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

export function getDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

// ─── Colors ─────────────────────────────────────────────────────────────────

export const COLORS = {
  bg: "#E8E4DB",
  cardBg: "#F5F2EA",
  cardAlt: "#EBE7DD",
  cardAccent: "#FFFEF9",
  primaryGreen: "#3D6B4A",
  accentGreen: "#528A66",
  warmGold: "#B8954E",
  darkGold: "#9D7F42",
  textDark: "#252525",
  textMuted: "#5A5A5A",
  textLight: "#7A7A7A",
  border: "#D4CFC3",
  success: "#3D6B4A",
  warning: "#C89A4F",
  error: "#A94442",
};

export const PHASE_COLORS: Record<string, string> = {
  build: COLORS.primaryGreen,
  recovery: COLORS.warmGold,
  taper: COLORS.accentGreen,
  race: COLORS.darkGold,
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
    const key = monday.toISOString().slice(0, 10);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(run);
  }

  const weeks: WeekData[] = [];
  for (const [mondayKey, acts] of weekMap) {
    const totalDistance = acts.reduce((s, a) => s + a.distance, 0);
    const totalTime = acts.reduce((s, a) => s + a.moving_time, 0);
    const longestRun = Math.max(...acts.map((a) => a.distance));
    const totalElevation = acts.reduce((s, a) => s + a.total_elevation_gain, 0);
    weeks.push({
      weekStart: mondayKey,
      weekLabel: weekLabel(mondayKey),
      totalDistance,
      totalTime,
      runs: acts.length,
      avgPace: totalDistance > 0 ? totalTime / (totalDistance / 1000) : 0,
      longestRun,
      totalElevation,
    });
  }

  weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return weeks;
}

// ─── Personal Records ───────────────────────────────────────────────────────

export function computePRs(activities: Activity[]): PersonalRecord[] {
  const runs = activities.filter((a) => a.type === "Run" && a.distance > 0);
  if (runs.length === 0) return [];

  const prs: PersonalRecord[] = [];

  const longest = runs.reduce((best, r) => (r.distance > best.distance ? r : best), runs[0]);
  prs.push({ label: "Longest Run", value: `${formatKm(longest.distance)} km`, activity: longest.name, date: formatDate(longest.start_date) });

  const paceRuns = runs.filter((r) => r.distance >= 1000);
  if (paceRuns.length > 0) {
    const fastest = paceRuns.reduce((best, r) => {
      const pace = r.moving_time / (r.distance / 1000);
      const bestPace = best.moving_time / (best.distance / 1000);
      return pace < bestPace ? r : best;
    }, paceRuns[0]);
    prs.push({ label: "Fastest Pace", value: `${formatPace(fastest.distance, fastest.moving_time)} /km`, activity: fastest.name, date: formatDate(fastest.start_date) });
  }

  const highestElev = runs.reduce((best, r) => r.total_elevation_gain > best.total_elevation_gain ? r : best, runs[0]);
  if (highestElev.total_elevation_gain > 0) {
    prs.push({ label: "Most Elevation", value: `${Math.round(highestElev.total_elevation_gain)} m`, activity: highestElev.name, date: formatDate(highestElev.start_date) });
  }

  const longestTime = runs.reduce((best, r) => r.moving_time > best.moving_time ? r : best, runs[0]);
  prs.push({ label: "Longest Time", value: formatTime(longestTime.moving_time), activity: longestTime.name, date: formatDate(longestTime.start_date) });

  const hrRuns = runs.filter((r) => r.max_heartrate);
  if (hrRuns.length > 0) {
    const maxHr = hrRuns.reduce((best, r) => (r.max_heartrate || 0) > (best.max_heartrate || 0) ? r : best, hrRuns[0]);
    prs.push({ label: "Max Heart Rate", value: `${Math.round(maxHr.max_heartrate!)} bpm`, activity: maxHr.name, date: formatDate(maxHr.start_date) });
  }

  return prs;
}

// ─── Next Actions ───────────────────────────────────────────────────────────

export function generateNextActions(
  currentWeek: WeekData | undefined,
  weeks: WeekData[],
  activities: Activity[],
  planWeek: PlanWeek | null,
  hasPlan: boolean
): NextAction[] {
  const actions: NextAction[] = [];
  const dayOfWeek = getDayOfWeek();
  const daysLeft = 7 - dayOfWeek;
  const runs = activities.filter((a) => a.type === "Run");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentWeeks = weeks.slice(0, 4).filter((w) => w.runs > 0);
  const avgPace4w = recentWeeks.length > 0
    ? recentWeeks.reduce((s, w) => s + w.avgPace, 0) / recentWeeks.length
    : 0;
  const paceStr = avgPace4w > 0 ? formatPace(1000, avgPace4w) : "easy";

  let consecutiveDays = 0;
  const checkDate = new Date(today);
  for (let i = 0; i < 7; i++) {
    const dayStr = checkDate.toISOString().slice(0, 10);
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

  const remaining = planWeek.target_volume_km - planWeek.actualVolumeKm;
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
            ? `Do ${planWeek.long_run_km}km long run this weekend + ${Math.round(planWeek.long_run_km * 0.6)}km tomorrow`
            : `Do your ${planWeek.long_run_km}km long run this weekend`,
          reason: `${remaining.toFixed(1)}km left—Saturday or Sunday both work`,
          priority: "high",
        });
      } else if (isSunday) {
        actions.push({
          icon: "🏃",
          action: planWeek.back_to_back
            ? `Complete ${Math.round(planWeek.long_run_km * 0.6)}km second long run TODAY`
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
          ? `Consider long run TODAY: ${planWeek.long_run_km}km, then ${Math.round(planWeek.long_run_km * 0.6)}km tomorrow`
          : `Consider ${planWeek.long_run_km}km long run TODAY or tomorrow`,
        reason: `${remaining.toFixed(1)}km left—weekend is here`,
        priority: "high",
      });
    } else if (isSunday && proportionLeft >= 0.2) {
      actions.push({
        icon: "🏃",
        action: planWeek.back_to_back
          ? `Complete ${Math.round(planWeek.long_run_km * 0.6)}km second long run TODAY`
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

  if (remaining > 0 && daysLeft > 0 && actions.length === 0) {
    const perDay = remaining / daysLeft;

    if (planWeek.phase === "recovery") {
      actions.push({
        icon: "🧘",
        action: `Easy ${perDay.toFixed(1)}km runs at recovery pace (slower than ${paceStr}/km)`,
        reason: `Recovery week: ${remaining.toFixed(1)}km left, low intensity`,
        priority: "medium",
      });
    } else if (perDay > 12) {
      actions.push({
        icon: "⚠️",
        action: `Run ${perDay.toFixed(1)}km per day for ${daysLeft} days`,
        reason: "High daily volume needed—consider adding an extra run day",
        priority: "high",
      });
    } else if (perDay > 0) {
      actions.push({
        icon: "✓",
        action: `${perDay.toFixed(1)}km per day for ${daysLeft} remaining days`,
        reason: `${remaining.toFixed(1)}km left—manageable daily pace at ~${paceStr}/km`,
        priority: "medium",
      });
    }
  } else if (remaining <= 0) {
    if (consecutiveDays >= 2) {
      actions.push({
        icon: "🎉",
        action: "Rest day or easy recovery run only",
        reason: "Weekly target met—prioritize recovery",
        priority: "low",
      });
    } else {
      actions.push({
        icon: "✅",
        action: "Week complete! Extra miles should be easy effort",
        reason: `${planWeek.target_volume_km}km target reached`,
        priority: "low",
      });
    }
  }

  if (consecutiveDays >= 3 && !actions.some(a => a.icon === "🛌")) {
    actions.push({
      icon: "💡",
      action: "Consider a rest day tomorrow",
      reason: `${consecutiveDays} consecutive run days—recovery helps adaptation`,
      priority: "medium",
    });
  }

  return actions.slice(0, 3);
}
