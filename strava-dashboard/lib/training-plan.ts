import type { PlanConfig, GeneratedWeek, GeneratedPlan } from "@/types";

export type { PlanConfig, GeneratedWeek, GeneratedPlan };

function getMondayBefore(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Volume-dependent weekly increase rate.
 * At low volumes (<30km) we can grow faster; at high volumes we must be conservative.
 * Returns the km to ADD this week over previous week.
 */
function getWeeklyIncreaseKm(currentVolumeKm: number): number {
  let pct: number;
  if (currentVolumeKm < 30) {
    pct = 0.1; // 10% at low volume
  } else if (currentVolumeKm < 45) {
    pct = 0.08; // 8% in mid range
  } else if (currentVolumeKm < 60) {
    pct = 0.06; // 6% approaching high volume
  } else {
    pct = 0.04; // 4% at high volume
  }
  const increase = currentVolumeKm * pct;
  // Absolute cap: never add more than 5km in a single week
  return Math.min(increase, 5);
}

/**
 * Long run target: 25-35% of weekly volume.
 * Starts at 30% and grows toward 35% as fitness improves.
 * Capped at race-specific max (45-55km range for 90km ultra).
 */
function getLongRunKm(weeklyVolumeKm: number, raceDistanceKm: number, phase: string): number {
  // Recovery weeks: shorter long run
  if (phase === "recovery") {
    return Math.round(weeklyVolumeKm * 0.25 * 10) / 10;
  }

  // Long run as % of weekly volume: scale up from 28% to 35% as volume grows
  let longRunPct: number;
  if (weeklyVolumeKm < 30) {
    longRunPct = 0.28;
  } else if (weeklyVolumeKm < 50) {
    longRunPct = 0.3;
  } else if (weeklyVolumeKm < 65) {
    longRunPct = 0.32;
  } else {
    longRunPct = 0.35;
  }

  let longRun = weeklyVolumeKm * longRunPct;

  // Cap long run based on race distance (50-60% of race distance)
  const maxLongRun = raceDistanceKm * 0.55;
  longRun = Math.min(longRun, maxLongRun);

  return Math.round(longRun * 10) / 10;
}

/**
 * Peak volume target for the plan.
 * For ultra distances (>50km), peak weekly volume typically 65-80% of race distance.
 * Hard cap at 80km to avoid overtraining.
 */
function computePeakVolume(raceDistanceKm: number, startingVolumeKm: number): number {
  let target: number;
  if (raceDistanceKm >= 80) {
    // 90km ultra: peak at ~70-75% of race distance
    target = raceDistanceKm * 0.72;
  } else if (raceDistanceKm >= 50) {
    target = raceDistanceKm * 0.78;
  } else {
    // Marathon and below: can get closer to race distance
    target = raceDistanceKm * 0.85;
  }

  // Hard cap at 80km peak for safety
  target = Math.min(target, 80);

  // Must be higher than starting volume
  target = Math.max(target, startingVolumeKm * 1.5);

  return Math.round(target * 10) / 10;
}

export function generatePlan(config: PlanConfig): GeneratedPlan {
  // 4-week taper (weeks 25-28)
  const taperSchedule = [0.7, 0.55, 0.35, 0.2]; // 4-week taper
  const taperWeekCount = taperSchedule.length;

  const raceWeekMonday = getMondayBefore(config.raceDate);

  // Start from THIS Monday (the current week), not next Monday
  const today = new Date();
  const startMonday = getMondayBefore(toDateStr(today));

  // Calculate or use provided total weeks
  let totalWeeks: number;
  if (config.totalWeeks) {
    totalWeeks = config.totalWeeks;
  } else {
    totalWeeks = Math.round((raceWeekMonday.getTime() - startMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1; // +1 because race week is included
  }

  // Need at least taper + race week + 4 build weeks
  if (totalWeeks < taperWeekCount + 1 + 4) {
    throw new Error(`Not enough time: ${totalWeeks} weeks available, need at least ${taperWeekCount + 5}`);
  }

  // Use provided peak volume or calculate it
  const peakVolumeKm = config.peakVolumeKm || computePeakVolume(config.raceDistanceKm, config.startingVolumeKm);

  // Starting long run (default to 30% of starting volume if not provided)
  const startingLongRunKm = config.startingLongRunKm || config.startingVolumeKm * 0.3;

  // Build phase = weeks 1-24 (everything before taper)
  const buildPhaseWeeks = totalWeeks - taperWeekCount;

  // Generate build phase with specific long run progression and plateau
  const buildVolumes: number[] = [];
  const buildPhases: ("build" | "recovery")[] = [];
  const longRuns: number[] = [];
  const cycleNumbers: (number | null)[] = [];
  const weekInCycles: (number | null)[] = [];
  const backToBackFlags: boolean[] = [];

  let currentVolume = config.startingVolumeKm;
  let currentLongRun = startingLongRunKm;
  let cycleNum = 1;

  // Define recovery weeks (every 3-4 weeks)
  // For 24 build weeks: weeks 4, 8, 12, 16, 20 are recovery
  const recoveryWeeks = new Set([4, 8, 12, 16, 20]);

  // Plateau phase: weeks 20-24 hold peak volume
  const plateauStart = 20;
  const plateauEnd = 24;

  // B2B weeks during plateau (weeks 20-24): 2-3 instances
  const b2bWeeks = new Set([20, 23]); // 2 B2B weekends during plateau

  for (let weekNum = 1; weekNum <= buildPhaseWeeks; weekNum++) {
    const isRecoveryWeek = recoveryWeeks.has(weekNum);
    const isPlateauPhase = weekNum >= plateauStart && weekNum <= plateauEnd;
    const isB2bWeek = b2bWeeks.has(weekNum);

    if (isRecoveryWeek) {
      // Recovery week: ~65% of previous build week volume
      const recoveryVolume = Math.round(currentVolume * 0.65 * 10) / 10;
      buildVolumes.push(recoveryVolume);

      // Recovery week long run: ~50% of previous long run
      const recoveryLongRun = Math.round(currentLongRun * 0.5 * 10) / 10;
      longRuns.push(recoveryLongRun);

      buildPhases.push("recovery");
      cycleNumbers.push(cycleNum);
      weekInCycles.push(4); // Recovery week is 4th week in cycle
      backToBackFlags.push(false);

      // Start new cycle
      cycleNum++;
    } else {
      // Build week
      if (weekNum > 1 && !recoveryWeeks.has(weekNum - 1)) {
        // Not first week and not coming from recovery
        if (!isPlateauPhase) {
          // Progressive volume increase (max 15%)
          const maxIncrease = currentVolume * 0.15;
          const targetIncrease = Math.min(5, maxIncrease); // Max 5km per week
          currentVolume += targetIncrease;
          currentVolume = Math.min(currentVolume, peakVolumeKm);
        } else {
          // Plateau: hold peak volume
          currentVolume = peakVolumeKm;
        }
      } else if (recoveryWeeks.has(weekNum - 1)) {
        // Coming from recovery week: bump back up
        if (!isPlateauPhase) {
          const increase = Math.min(5, currentVolume * 0.1);
          currentVolume += increase;
          currentVolume = Math.min(currentVolume, peakVolumeKm);
        } else {
          currentVolume = peakVolumeKm;
        }
      }

      buildVolumes.push(Math.round(currentVolume * 10) / 10);

      // Long run progression
      if (weekNum <= 8) {
        // Weeks 1-8: 15 km → 25 km (10 km over 8 weeks = ~1.4 km/week)
        currentLongRun = 15 + ((25 - 15) / 8) * (weekNum - 1);
      } else if (weekNum <= 16) {
        // Weeks 9-16: 25 km → 35 km (10 km over 8 weeks = ~1.25 km/week)
        currentLongRun = 25 + ((35 - 25) / 8) * (weekNum - 9);
      } else if (weekNum <= 24) {
        // Weeks 17-24: hold at 35-40 km
        currentLongRun = 37.5; // Mid-point of 35-40 range
      }

      longRuns.push(Math.round(currentLongRun * 10) / 10);
      buildPhases.push("build");

      // Cycle position
      const weeksIntoCycle = ((weekNum - 1) % 4) + 1;
      cycleNumbers.push(cycleNum);
      weekInCycles.push(weeksIntoCycle);

      backToBackFlags.push(isB2bWeek);
    }
  }

  // Actual peak volume achieved
  const actualPeak = Math.max(...buildVolumes);

  // Build week objects for build phase
  const weeks: GeneratedWeek[] = [];

  for (let i = 0; i < buildPhaseWeeks; i++) {
    const weekDate = new Date(startMonday);
    weekDate.setDate(weekDate.getDate() + i * 7);

    weeks.push({
      weekNumber: i + 1,
      startDate: toDateStr(weekDate),
      targetVolumeKm: buildVolumes[i],
      longRunKm: longRuns[i],
      backToBack: backToBackFlags[i],
      phase: buildPhases[i],
      cycleNumber: cycleNumbers[i],
      weekInCycle: weekInCycles[i],
    });
  }

  // Taper weeks (4 weeks: 25-28)
  for (let i = 0; i < taperWeekCount; i++) {
    const weekDate = new Date(startMonday);
    weekDate.setDate(weekDate.getDate() + (buildPhaseWeeks + i) * 7);
    const taperVolume = Math.round(actualPeak * taperSchedule[i] * 10) / 10;

    // Taper long runs: progressive reduction
    let taperLongRun: number;
    if (i === 0) {
      taperLongRun = Math.round(actualPeak * 0.25 * 10) / 10; // ~18 km
    } else if (i === 1) {
      taperLongRun = Math.round(actualPeak * 0.18 * 10) / 10; // ~13 km
    } else if (i === 2) {
      taperLongRun = Math.round(actualPeak * 0.1 * 10) / 10; // ~7 km
    } else {
      taperLongRun = 0; // Race week - no long run
    }

    weeks.push({
      weekNumber: buildPhaseWeeks + i + 1,
      startDate: toDateStr(weekDate),
      targetVolumeKm: taperVolume,
      longRunKm: taperLongRun,
      backToBack: false,
      phase: i < taperWeekCount - 1 ? "taper" : "race",
      cycleNumber: null,
      weekInCycle: null,
    });
  }

  // Compute average increment for metadata
  const buildOnlyVolumes = buildVolumes.filter((_, i) => buildPhases[i] === "build");
  let totalPctIncrease = 0;
  let increaseCount = 0;
  for (let i = 1; i < buildOnlyVolumes.length; i++) {
    if (buildOnlyVolumes[i] > buildOnlyVolumes[i - 1]) {
      totalPctIncrease += (buildOnlyVolumes[i] - buildOnlyVolumes[i - 1]) / buildOnlyVolumes[i - 1];
      increaseCount++;
    }
  }
  const avgIncrement = increaseCount > 0 ? totalPctIncrease / increaseCount : 0;

  return {
    name: config.raceName ? `${config.raceName} Training Plan` : `${config.raceDistanceKm}km Race Plan`,
    raceName: config.raceName || null,
    raceDate: config.raceDate,
    raceDistanceKm: config.raceDistanceKm,
    startDate: toDateStr(startMonday),
    startingVolumeKm: config.startingVolumeKm,
    peakVolumeKm: Math.round(actualPeak * 10) / 10,
    totalWeeks: weeks.length,
    buildIncrement: Math.round(avgIncrement * 1000) / 1000,
    recoveryFactor: 0.65,
    weeks,
  };
}
