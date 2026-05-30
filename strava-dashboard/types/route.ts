import type { LatLng } from "@/lib/polyline";

export type RouteSource = "draw" | "breakout" | "suggest";

export interface SavedRoute {
  id: number;
  name: string;
  /** Encoded polyline of the rendered path (same format as activities.summary_polyline). */
  polyline: string;
  distance_m: number;
  /** JSON-serialized LatLng[] of the editable anchor points. */
  waypoints: string;
  source: RouteSource;
  base_activity_id: string | null;
  created_at: string;
}

export interface NewRouteInput {
  name: string;
  waypoints: LatLng[];
  source?: RouteSource;
  base_activity_id?: string | null;
}
