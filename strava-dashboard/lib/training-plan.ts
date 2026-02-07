export interface PlanConfig {
  raceName?: string;
  raceDate: string;
  raceDistanceKm: number;
  startingVolumeKm: number;
}

export interface GeneratedWeek {
  weekNumber: number;
  startDate: string;
  targetVolumeKm: number;
  longRunKm: number;
  backToBack: boolean; // true = back-to-back long run weekend planned
  phase: "build" | "recovery" | "taper" | "race";
  cycleNumber: number | null;
  weekInCycle: number | null;
}

export interface GeneratedPlan {
  name: string;
  raceName: string | null;
  raceDate: string;
  raceDistanceKm: number;
  startDate: string;
  startingVolumeKm: number;
  peakVolumeKm: number;
  totalWeeks: number;
  buildIncrement: number;
  recoveryFactor: number;
  weeks: GeneratedWeek[];
}

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
    pct = 0.10; // 10% at low volume
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
    longRunPct = 0.30;
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
  const taperSchedule = [0.70, 0.55, 0.35]; // 3-week taper
  const taperWeekCount = taperSchedule.length;

  const raceWeekMonday = getMondayBefore(config.raceDate);

  // Start from next Monday
  const today = new Date();
  const todayMonday = getMondayBefore(toDateStr(today));
  const nextMonday = new Date(todayMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  const totalWeeks = Math.round(
    (raceWeekMonday.getTime() - nextMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  ) + 1; // +1 because race week is included

  // Need at least taper + race week + 4 build weeks
  if (totalWeeks < taperWeekCount + 1 + 4) {
    throw new Error(`Not enough time: ${totalWeeks} weeks available, need at least ${taperWeekCount + 5}`);
  }

  const peakVolumeKm = computePeakVolume(config.raceDistanceKm, config.startingVolumeKm);

  // Build phase = everything before taper + race week
  const buildPhaseWeeks = totalWeeks - taperWeekCount - 1; // -1 for race week

  // Generate build phase volumes using progressive overload
  const buildVolumes: number[] = [];
  const buildPhases: ("build" | "recovery")[] = [];
  const cycleNumbers: (number | null)[] = [];
  const weekInCycles: (number | null)[] = [];

  let currentVolume = config.startingVolumeKm;
  let weekIdx = 0;
  let cycleNum = 1;
  let weekInCycle = 1;

  while (weekIdx < buildPhaseWeeks) {
    // Dynamic recovery frequency: 3:1 under 60km, 2:1 at 60+km
    const cycleLength = currentVolume >= 60 ? 3 : 4; // 2:1 = 3 weeks, 3:1 = 4 weeks
    const buildWeeksInCycle = cycleLength - 1;

    if (weekInCycle <= buildWeeksInCycle) {
      // Build week: add volume-dependent increase
      if (weekInCycle > 1) {
        const increase = getWeeklyIncreaseKm(currentVolume);
        currentVolume += increase;
      }

      // Don't exceed peak volume during build
      currentVolume = Math.min(currentVolume, peakVolumeKm);

      buildVolumes.push(Math.round(currentVolume * 10) / 10);
      buildPhases.push("build");
      cycleNumbers.push(cycleNum);
      weekInCycles.push(weekInCycle);

      weekInCycle++;
    } else {
      // Recovery week: 65-70% of previous week
      const recoveryVolume = currentVolume * 0.65;
      buildVolumes.push(Math.round(recoveryVolume * 10) / 10);
      buildPhases.push("recovery");
      cycleNumbers.push(cycleNum);
      weekInCycles.push(weekInCycle);

      // Next cycle starts from where we left off (not from recovery volume)
      weekInCycle = 1;
      cycleNum++;

      // Small bump for next cycle start
      const nextIncrease = getWeeklyIncreaseKm(currentVolume);
      currentVolume += nextIncrease;
      currentVolume = Math.min(currentVolume, peakVolumeKm);
    }

    weekIdx++;
  }

  // Determine back-to-back long run weekends
  // Introduced when weekly volume >= 50km, every 2-3 weeks, starting 10-12 weeks before race
  const raceWeekIdx = totalWeeks - 1;
  const b2bStartWeekIdx = Math.max(0, raceWeekIdx - 12); // Start back-to-backs 12 weeks out
  const b2bEndWeekIdx = raceWeekIdx - taperWeekCount - 1; // Stop before taper

  // Build week objects
  const weeks: GeneratedWeek[] = [];

  // Build phase weeks
  for (let i = 0; i < buildVolumes.length; i++) {
    const weekDate = new Date(nextMonday);
    weekDate.setDate(weekDate.getDate() + i * 7);

    const volume = buildVolumes[i];
    const phase = buildPhases[i];
    const longRun = getLongRunKm(volume, config.raceDistanceKm, phase);

    // Back-to-back: only on build weeks, volume >= 50km, within the b2b window, every 2-3 weeks
    const globalWeekIdx = i;
    const inB2bWindow = globalWeekIdx >= b2bStartWeekIdx && globalWeekIdx <= b2bEndWeekIdx;
    const isB2bCandidate = phase === "build" && volume >= 50 && inB2bWindow;

    // Space back-to-backs about every 2-3 weeks within the window
    let backToBack = false;
    if (isB2bCandidate) {
      const weeksIntoB2bWindow = globalWeekIdx - b2bStartWeekIdx;
      backToBack = weeksIntoB2bWindow % 3 === 0; // Every 3rd week in the window
    }

    weeks.push({
      weekNumber: i + 1,
      startDate: toDateStr(weekDate),
      targetVolumeKm: volume,
      longRunKm: longRun,
      backToBack,
      phase,
      cycleNumber: cycleNumbers[i],
      weekInCycle: weekInCycles[i],
    });
  }

  // Actual peak volume achieved
  const actualPeak = Math.max(...buildVolumes);

  // Taper weeks (3 weeks)
  for (let i = 0; i < taperWeekCount; i++) {
    const weekDate = new Date(nextMonday);
    weekDate.setDate(weekDate.getDate() + (buildPhaseWeeks + i) * 7);
    const taperVolume = Math.round(actualPeak * taperSchedule[i] * 10) / 10;
    const longRun = getLongRunKm(taperVolume, config.raceDistanceKm, "taper");

    weeks.push({
      weekNumber: buildPhaseWeeks + i + 1,
      startDate: toDateStr(weekDate),
      targetVolumeKm: taperVolume,
      longRunKm: i < 2 ? longRun : Math.round(taperVolume * 0.2 * 10) / 10, // Last taper week: very short long run
      backToBack: false,
      phase: "taper",
      cycleNumber: null,
      weekInCycle: null,
    });
  }

  // Race week
  const raceWeekDate = new Date(nextMonday);
  raceWeekDate.setDate(raceWeekDate.getDate() + (totalWeeks - 1) * 7);
  const raceWeekVolume = Math.round(actualPeak * 0.25 * 10) / 10;
  weeks.push({
    weekNumber: totalWeeks,
    startDate: toDateStr(raceWeekDate),
    targetVolumeKm: raceWeekVolume,
    longRunKm: 0, // Race is the long run!
    backToBack: false,
    phase: "race",
    cycleNumber: null,
    weekInCycle: null,
  });

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
    name: config.raceName
      ? `${config.raceName} Training Plan`
      : `${config.raceDistanceKm}km Race Plan`,
    raceName: config.raceName || null,
    raceDate: config.raceDate,
    raceDistanceKm: config.raceDistanceKm,
    startDate: toDateStr(nextMonday),
    startingVolumeKm: config.startingVolumeKm,
    peakVolumeKm: Math.round(actualPeak * 10) / 10,
    totalWeeks: weeks.length,
    buildIncrement: Math.round(avgIncrement * 1000) / 1000,
    recoveryFactor: 0.65,
    weeks,
  };
}
