import { describe, it, expect } from "vitest";
import type { Activity, PlanWeek } from "@/types";
import {
  getMonday,
  formatKm,
  formatTime,
  formatPace,
  formatDate,
  weekLabel,
  getDayOfWeek,
  COLORS,
  PHASE_COLORS,
  PHASE_LABELS,
  aggregateWeeks,
  computePRs,
  generateNextActions,
} from "./dashboard-helpers";

// ─── Helper factory ─────────────────────────────────────────────────────────

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    strava_id: "1",
    name: "Morning Run",
    type: "Run",
    distance: 5000,
    moving_time: 1500,
    elapsed_time: 1600,
    average_speed: 3.33,
    max_speed: 4.0,
    average_heartrate: 150,
    max_heartrate: 170,
    total_elevation_gain: 50,
    start_date: "2025-01-06T08:00:00Z",
    suffer_score: 50,
    ...overrides,
  };
}

// ─── getMonday ──────────────────────────────────────────────────────────────

describe("getMonday", () => {
  it("returns Monday for a Wednesday", () => {
    // Use local date string to avoid UTC offset issues
    const wed = new Date(2025, 0, 8, 12, 0, 0); // Jan 8 2025 = Wednesday
    const mon = getMonday(wed);
    expect(mon.getDay()).toBe(1); // Monday
    // Compare using local date parts, not toISOString (which is UTC)
    expect(mon.getFullYear()).toBe(2025);
    expect(mon.getMonth()).toBe(0);
    expect(mon.getDate()).toBe(6);
  });

  it("returns same day for a Monday", () => {
    const mon = new Date(2025, 0, 6, 12, 0, 0); // Jan 6 2025 = Monday
    const result = getMonday(mon);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(6);
  });

  it("returns previous Monday for a Sunday", () => {
    const sun = new Date(2025, 0, 12, 12, 0, 0); // Jan 12 2025 = Sunday
    const result = getMonday(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(6);
  });

  it("does not mutate the input date", () => {
    const original = new Date("2025-01-08T15:30:00");
    const originalTime = original.getTime();
    getMonday(original);
    expect(original.getTime()).toBe(originalTime);
  });
});

// ─── formatKm ───────────────────────────────────────────────────────────────

describe("formatKm", () => {
  it("converts meters to km with one decimal", () => {
    expect(formatKm(5000)).toBe("5.0");
    expect(formatKm(10543)).toBe("10.5");
    expect(formatKm(0)).toBe("0.0");
  });

  it("handles large distances", () => {
    expect(formatKm(42195)).toBe("42.2");
  });
});

// ─── formatTime ─────────────────────────────────────────────────────────────

describe("formatTime", () => {
  it("formats seconds under an hour", () => {
    expect(formatTime(90)).toBe("1:30");
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(59)).toBe("0:59");
  });

  it("formats seconds over an hour", () => {
    expect(formatTime(3661)).toBe("1:01:01");
    expect(formatTime(7200)).toBe("2:00:00");
  });

  it("pads minutes and seconds correctly", () => {
    expect(formatTime(3605)).toBe("1:00:05");
  });
});

// ─── formatPace ─────────────────────────────────────────────────────────────

describe("formatPace", () => {
  it("returns dash for zero distance", () => {
    expect(formatPace(0, 100)).toBe("-");
  });

  it("calculates pace correctly", () => {
    // 5km in 25 minutes = 5:00/km
    expect(formatPace(5000, 1500)).toBe("5:00");
  });

  it("handles sub-4 pace", () => {
    // 10km in 38 minutes = 3:48/km
    expect(formatPace(10000, 2280)).toBe("3:48");
  });
});

// ─── formatDate ─────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("returns a formatted date string", () => {
    const result = formatDate("2025-01-06T08:00:00Z");
    // Should contain day name, month, day number (locale-dependent but should not throw)
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── weekLabel ──────────────────────────────────────────────────────────────

describe("weekLabel", () => {
  it("returns a range string for a Monday", () => {
    const label = weekLabel("2025-01-06");
    expect(label).toContain("–"); // em-dash separator
    expect(typeof label).toBe("string");
  });
});

// ─── COLORS ─────────────────────────────────────────────────────────────────

describe("COLORS", () => {
  it("has all required color keys", () => {
    const requiredKeys = [
      "bg",
      "cardBg",
      "cardAlt",
      "cardAccent",
      "primaryGreen",
      "accentGreen",
      "warmGold",
      "darkGold",
      "textDark",
      "textMuted",
      "textLight",
      "border",
      "success",
      "warning",
      "error",
    ];
    for (const key of requiredKeys) {
      expect(COLORS).toHaveProperty(key);
      expect(typeof (COLORS as Record<string, string>)[key]).toBe("string");
    }
  });
});

describe("PHASE_COLORS", () => {
  it("has entries for all phases", () => {
    expect(PHASE_COLORS).toHaveProperty("build");
    expect(PHASE_COLORS).toHaveProperty("recovery");
    expect(PHASE_COLORS).toHaveProperty("taper");
    expect(PHASE_COLORS).toHaveProperty("race");
  });
});

describe("PHASE_LABELS", () => {
  it("has labels for all phases", () => {
    expect(PHASE_LABELS.build).toBe("Build");
    expect(PHASE_LABELS.recovery).toBe("Recovery");
    expect(PHASE_LABELS.taper).toBe("Taper");
    expect(PHASE_LABELS.race).toBe("Race Week");
  });
});

// ─── aggregateWeeks ─────────────────────────────────────────────────────────

describe("aggregateWeeks", () => {
  it("returns empty array for no activities", () => {
    expect(aggregateWeeks([])).toEqual([]);
  });

  it("ignores non-Run activities", () => {
    const gym = makeActivity({ type: "WeightTraining" });
    expect(aggregateWeeks([gym])).toEqual([]);
  });

  it("groups runs by week (Monday)", () => {
    const mon = makeActivity({ strava_id: "1", start_date: "2025-01-06T08:00:00Z", distance: 5000, moving_time: 1500 });
    const wed = makeActivity({ strava_id: "2", start_date: "2025-01-08T08:00:00Z", distance: 8000, moving_time: 2400 });
    const nextMon = makeActivity({
      strava_id: "3",
      start_date: "2025-01-13T08:00:00Z",
      distance: 6000,
      moving_time: 1800,
    });

    const weeks = aggregateWeeks([mon, wed, nextMon]);
    expect(weeks).toHaveLength(2);
    // Sorted descending by weekStart
    expect(weeks[0].runs).toBe(1); // Jan 13 week
    expect(weeks[1].runs).toBe(2); // Jan 6 week
    expect(weeks[1].totalDistance).toBe(13000); // 5000 + 8000
  });

  it("calculates avgPace correctly", () => {
    const run = makeActivity({ distance: 10000, moving_time: 3000 });
    const weeks = aggregateWeeks([run]);
    // avgPace = totalTime / (totalDistance / 1000) = 3000 / 10 = 300 seconds/km
    expect(weeks[0].avgPace).toBe(300);
  });

  it("finds longest run in a week", () => {
    const short = makeActivity({ strava_id: "1", distance: 3000, start_date: "2025-01-06T08:00:00Z" });
    const long = makeActivity({ strava_id: "2", distance: 15000, start_date: "2025-01-07T08:00:00Z" });
    const weeks = aggregateWeeks([short, long]);
    expect(weeks[0].longestRun).toBe(15000);
  });
});

// ─── computePRs ─────────────────────────────────────────────────────────────

describe("computePRs", () => {
  it("returns empty for no activities", () => {
    expect(computePRs([])).toEqual([]);
  });

  it("returns empty for non-run activities", () => {
    expect(computePRs([makeActivity({ type: "WeightTraining" })])).toEqual([]);
  });

  it("returns empty for runs with zero distance", () => {
    expect(computePRs([makeActivity({ distance: 0 })])).toEqual([]);
  });

  it("computes longest run PR", () => {
    const short = makeActivity({ strava_id: "1", distance: 5000, name: "Short" });
    const long = makeActivity({ strava_id: "2", distance: 20000, name: "Long" });
    const prs = computePRs([short, long]);
    const longestPR = prs.find((p) => p.label === "Longest Run");
    expect(longestPR).toBeDefined();
    expect(longestPR!.value).toBe("20.0 km");
    expect(longestPR!.activity).toBe("Long");
  });

  it("computes fastest pace PR (only for runs >= 1km)", () => {
    const slow = makeActivity({ strava_id: "1", distance: 5000, moving_time: 2500, name: "Slow" });
    const fast = makeActivity({ strava_id: "2", distance: 5000, moving_time: 1250, name: "Fast" });
    const tooShort = makeActivity({ strava_id: "3", distance: 500, moving_time: 100, name: "TooShort" });
    const prs = computePRs([slow, fast, tooShort]);
    const pacePR = prs.find((p) => p.label === "Fastest Pace");
    expect(pacePR).toBeDefined();
    expect(pacePR!.activity).toBe("Fast");
  });

  it("includes max heart rate PR when available", () => {
    const withHR = makeActivity({ max_heartrate: 195 });
    const prs = computePRs([withHR]);
    const hrPR = prs.find((p) => p.label === "Max Heart Rate");
    expect(hrPR).toBeDefined();
    expect(hrPR!.value).toBe("195 bpm");
  });

  it("skips max heart rate PR when no HR data", () => {
    const noHR = makeActivity({ max_heartrate: null, average_heartrate: null });
    const prs = computePRs([noHR]);
    const hrPR = prs.find((p) => p.label === "Max Heart Rate");
    expect(hrPR).toBeUndefined();
  });
});

// ─── generateNextActions ────────────────────────────────────────────────────

describe("generateNextActions", () => {
  it("suggests creating a plan when none exists", () => {
    const actions = generateNextActions(undefined, [], [], null, false);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toContain("training plan");
  });

  it("returns at most 3 actions", () => {
    const planWeek: PlanWeek = {
      week_number: 1,
      start_date: new Date().toISOString().slice(0, 10),
      target_volume_km: 50,
      long_run_km: 15,
      back_to_back: 0,
      phase: "build",
      cycle_number: 1,
      week_in_cycle: 1,
      actualVolumeKm: 10,
      runCount: 2,
      gymCount: 0,
    };
    const actions = generateNextActions(undefined, [], [], planWeek, true);
    expect(actions.length).toBeLessThanOrEqual(3);
  });

  it("each action has required fields", () => {
    const actions = generateNextActions(undefined, [], [], null, false);
    for (const action of actions) {
      expect(action).toHaveProperty("icon");
      expect(action).toHaveProperty("action");
      expect(action).toHaveProperty("reason");
      expect(["high", "medium", "low"]).toContain(action.priority);
    }
  });

  it("suggests race week shakeout during race phase", () => {
    const planWeek: PlanWeek = {
      week_number: 20,
      start_date: new Date().toISOString().slice(0, 10),
      target_volume_km: 20,
      long_run_km: 0,
      back_to_back: 0,
      phase: "race",
      cycle_number: null,
      week_in_cycle: null,
      actualVolumeKm: 5,
      runCount: 1,
      gymCount: 0,
    };
    const actions = generateNextActions(undefined, [], [makeActivity()], planWeek, true);
    expect(actions[0].action).toContain("shakeout");
  });
});
