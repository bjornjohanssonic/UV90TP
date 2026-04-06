export type ShoeType = "road" | "trail" | "hybrid" | "dubb" | "gore_tex";

export interface Shoe {
  id: number;
  name: string;
  type: ShoeType;
  retired: number;
  manual_km: number;
  created_at: string;
  activity_km?: number;
  total_km?: number;
  activity_count?: number;
}
