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
  splits: string | null;
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
