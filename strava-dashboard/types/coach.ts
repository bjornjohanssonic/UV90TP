export interface DailyBriefing {
  headline: string;
  subtext: string;
  urgency: "rest" | "easy" | "moderate" | "key_session" | "race";
}

export interface CoachContext {
  dayOfWeek: number;
  planPhase: string | null;
  planWeekNumber: number | null;
  targetVolumeKm: number;
  actualVolumeKm: number;
  longRunKm: number;
  longestRunThisWeekKm: number;
  backToBack: boolean;
  consecutiveRunDays: number;
  acwrRatio: number;
  acwrZone: "green" | "yellow" | "red";
  readinessScore: number;
  daysToRace: number | null;
  avgPace4w: string;
}

export interface CoachResponse {
  briefing: DailyBriefing;
  acwr: ACWRResult;
  readiness: ReadinessResult;
}

export interface ACWRResult {
  ratio: number;
  acuteLoadKm: number;
  chronicLoadKm: number;
  zone: "green" | "yellow" | "red";
  label: string;
}

export interface ReadinessFactors {
  restDays: number;
  loadBalance: number;
  recentIntensity: number;
  planPhase: number;
}

export interface ReadinessResult {
  score: number;
  factors: ReadinessFactors;
  label: "Fresh" | "Ready" | "Moderate" | "Fatigued" | "Depleted";
}

export interface RunQualityScore {
  total: number;
  paceConsistency: number;
  heartRateEfficiency: number;
  elevationHandling: number;
  planAlignment: number;
}

export interface Tip {
  id: number;
  category: string;
  trigger: string;
  severity: "info" | "warning" | "action";
  title: string;
  body: string;
  source: string | null;
}

export interface TipSelection {
  daily: Tip[];
  contextual: Tip[];
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  consistency: number;
}

export interface PlanAdherence {
  overallPercent: number;
  longRunHitRate: string;
  recoveryCompliance: string;
  buildProgression: string;
}
