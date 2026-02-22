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
 * Conservative progression: 12% at low volumes, scaling down to 6% at high.
 * Returns the km to ADD this week over previous week.
 */
function getWeeklyIncreaseKm(currentVolumeKm: number): number {
  let pct: number;
  if (currentVolumeKm < 30) {
    pct = 0.12; // 12% at low volume — safe when absolute numbers are small
  } else if (currentVolumeKm < 45) {
    pct = 0.1; // 10% in mid range
  } else if (currentVolumeKm < 55) {
    pct = 0.08; // 8% approaching high volume
  } else {
    pct = 0.06; // 6% at high volume
  }
  const increase = currentVolumeKm * pct;
  // Absolute cap: never add more than 5km in a single week
  return Math.min(increase, 5);
}

/**
 * Peak volume target for the plan.
 * Conservative defaults for hobby ultra runners.
 * Hard cap at 70km to avoid overtraining.
 */
function computePeakVolume(raceDistanceKm: number, startingVolumeKm: number): number {
  let target: number;
  if (raceDistanceKm >= 80) {
    // 90km ultra: peak at ~60-65% of race distance (conservative for hobby runners)
    target = raceDistanceKm * 0.65;
  } else if (raceDistanceKm >= 50) {
    target = raceDistanceKm * 0.7;
  } else {
    // Marathon and below: can get closer to race distance
    target = raceDistanceKm * 0.8;
  }

  // Hard cap at 70km peak for safety
  target = Math.min(target, 70);

  // Must be higher than starting volume
  target = Math.max(target, startingVolumeKm * 1.5);

  return Math.round(target * 10) / 10;
}

export function generatePlan(config: PlanConfig): GeneratedPlan {
  const taperSchedule = [0.7, 0.55, 0.35, 0.2];
  const taperWeekCount = taperSchedule.length;

  const raceWeekMonday = getMondayBefore(config.raceDate);

  // Start from provided date or THIS Monday (the current week)
  const startMonday = config.startDate ? getMondayBefore(config.startDate) : getMondayBefore(toDateStr(new Date()));

  // Calculate or use provided total weeks
  let totalWeeks: number;
  if (config.totalWeeks) {
    totalWeeks = config.totalWeeks;
  } else {
    totalWeeks = Math.round((raceWeekMonday.getTime() - startMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }

  // Need at least taper + 4 build weeks
  if (totalWeeks < taperWeekCount + 4) {
    throw new Error(`Not enough time: ${totalWeeks} weeks available, need at least ${taperWeekCount + 4}`);
  }

  const peakVolumeKm = config.peakVolumeKm || computePeakVolume(config.raceDistanceKm, config.startingVolumeKm);
  const startingLongRunKm = config.startingLongRunKm || config.startingVolumeKm * 0.3;
  const maxLongRunKm = config.maxLongRunKm || 35;
  const firstRecoveryWeek = config.firstRecoveryWeek || 4;

  // Build phase = everything before taper
  const buildPhaseWeeks = totalWeeks - taperWeekCount;

  // Recovery weeks: first at firstRecoveryWeek, then every 4 weeks
  const recoveryWeeks = new Set<number>();
  for (let w = firstRecoveryWeek; w <= buildPhaseWeeks; w += 4) {
    recoveryWeeks.add(w);
  }

  // B2B weekends: 3, placed in peak phase counting back from taper
  // Positions: taperStart-3, taperStart-5, taperStart-7 (adjusting for recovery weeks)
  const b2bCandidates = [buildPhaseWeeks - 2, buildPhaseWeeks - 4, buildPhaseWeeks - 6];
  const b2bWeeks = new Set<number>();
  for (const candidate of b2bCandidates) {
    if (candidate > 0 && !recoveryWeeks.has(candidate)) {
      b2bWeeks.add(candidate);
    } else if (candidate > 1 && !recoveryWeeks.has(candidate - 1)) {
      // Shift by 1 if candidate hits a recovery week
      b2bWeeks.add(candidate - 1);
    }
  }

  // --- Volume and long run generation ---
  const buildVolumes: number[] = [];
  const buildPhases: ("build" | "recovery")[] = [];
  const longRuns: number[] = [];
  const cycleNumbers: (number | null)[] = [];
  const weekInCycles: (number | null)[] = [];
  const backToBackFlags: boolean[] = [];

  let currentVolume = config.startingVolumeKm;
  let lastBuildLongRun = startingLongRunKm;
  let cycleNum = 1;

  // Count total build weeks for long run progression
  let totalBuildWeekCount = 0;
  for (let w = 1; w <= buildPhaseWeeks; w++) {
    if (!recoveryWeeks.has(w)) totalBuildWeekCount++;
  }
  let buildWeekIndex = 0;

  // Track cycle position (weeks since last recovery)
  let weeksSinceRecovery = 0;

  for (let weekNum = 1; weekNum <= buildPhaseWeeks; weekNum++) {
    const isRecoveryWeek = recoveryWeeks.has(weekNum);
    const isB2bWeek = b2bWeeks.has(weekNum);

    if (isRecoveryWeek) {
      // Recovery week: 65% of current build volume
      const recoveryVolume = Math.round(currentVolume * 0.65 * 10) / 10;
      buildVolumes.push(recoveryVolume);

      // Recovery long run: 50% of previous build long run
      const recoveryLongRun = Math.round(lastBuildLongRun * 0.5 * 10) / 10;
      longRuns.push(recoveryLongRun);

      buildPhases.push("recovery");
      cycleNumbers.push(cycleNum);
      weekInCycles.push(weeksSinceRecovery + 1);
      backToBackFlags.push(false);

      cycleNum++;
      weeksSinceRecovery = 0;
    } else {
      // Build week — progressive volume increase
      if (weekNum > 1) {
        const increase = getWeeklyIncreaseKm(currentVolume);
        currentVolume += increase;
        currentVolume = Math.min(currentVolume, peakVolumeKm);
      }

      // Step down in the last 2 build weeks before taper (pre-taper buffer)
      const weeksBeforeTaper = buildPhaseWeeks - weekNum;
      if (weeksBeforeTaper <= 1 && currentVolume >= peakVolumeKm * 0.9) {
        // Gentle step down: 90% and 85% of peak in last 2 weeks before taper
        const stepDownFactor = weeksBeforeTaper === 1 ? 0.9 : 0.85;
        currentVolume = Math.min(currentVolume, peakVolumeKm * stepDownFactor);
      }

      const weekVolume = Math.round(currentVolume * 10) / 10;
      buildVolumes.push(weekVolume);

      // Long run: linear progression from startingLR to maxLR across build weeks
      const longRunProgress = totalBuildWeekCount > 1 ? buildWeekIndex / (totalBuildWeekCount - 1) : 0;
      let longRun = startingLongRunKm + (maxLongRunKm - startingLongRunKm) * longRunProgress;
      longRun = Math.min(longRun, maxLongRunKm);

      // B2B weeks: adjust long run to fit within weekly volume
      // Ensure room for secondary run (65% of LR) + at least 10km midweek
      if (isB2bWeek) {
        const maxB2bLongRun = (weekVolume - 10) / 1.65;
        longRun = Math.min(longRun, maxB2bLongRun);
      }

      longRun = Math.round(longRun * 10) / 10;
      longRuns.push(longRun);
      lastBuildLongRun = longRun;

      buildPhases.push("build");
      weeksSinceRecovery++;
      cycleNumbers.push(cycleNum);
      weekInCycles.push(weeksSinceRecovery);
      backToBackFlags.push(isB2bWeek);

      buildWeekIndex++;
    }
  }

  // Actual peak volume achieved
  const actualPeak = Math.max(...buildVolumes);

  // Build week objects
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

  // Taper weeks
  for (let i = 0; i < taperWeekCount; i++) {
    const weekDate = new Date(startMonday);
    weekDate.setDate(weekDate.getDate() + (buildPhaseWeeks + i) * 7);
    const taperVolume = Math.round(actualPeak * taperSchedule[i] * 10) / 10;

    let taperLongRun: number;
    if (i === 0) {
      taperLongRun = Math.round(actualPeak * 0.25 * 10) / 10;
    } else if (i === 1) {
      taperLongRun = Math.round(actualPeak * 0.18 * 10) / 10;
    } else if (i === 2) {
      taperLongRun = Math.round(actualPeak * 0.1 * 10) / 10;
    } else {
      taperLongRun = 0;
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
