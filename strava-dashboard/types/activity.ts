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
  summary_polyline: string | null;
  battery_start: number | null;
  battery_end: number | null;
  shoe_id: number | null;
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
  totalSufferScore: number;
}

export interface NextAction {
  icon: string;
  action: string;
  reason: string;
  priority: "high" | "medium" | "low";
}
