export interface Plan {
  id: number;
  name: string;
  race_name: string | null;
  race_date: string;
  race_distance_km: number;
  start_date: string;
  starting_volume_km: number;
  peak_volume_km: number;
  total_weeks: number;
  build_increment: number;
  recovery_factor: number;
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

export interface PlanConfig {
  raceName?: string;
  raceDate: string;
  raceDistanceKm: number;
  startingVolumeKm: number;
  startingLongRunKm?: number;
  peakVolumeKm?: number;
  totalWeeks?: number;
  firstRecoveryWeek?: number; // default 4, set to 2-3 if already training
  maxLongRunKm?: number; // hard cap on single long run, default 35
  startDate?: string; // plan start date (YYYY-MM-DD), defaults to this Monday
}

export interface GeneratedWeek {
  weekNumber: number;
  startDate: string;
  targetVolumeKm: number;
  longRunKm: number;
  backToBack: boolean;
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

export interface WeekRow {
  id: number;
  plan_id: number;
  week_number: number;
  start_date: string;
  target_volume_km: number;
  long_run_km: number;
  back_to_back: number;
  phase: string;
  cycle_number: number | null;
  week_in_cycle: number | null;
}

export interface VolumeRow {
  week_start: string;
  actual_km: number;
  run_count: number;
}

export interface GymRow {
  week_start: string;
  gym_count: number;
}
