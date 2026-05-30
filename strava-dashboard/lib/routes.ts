import getDb from "./db";
import { encodePolyline, routeDistanceMeters, type LatLng } from "./polyline";
import type { SavedRoute, NewRouteInput } from "@/types";

export async function getAllRoutes(athleteId: string): Promise<SavedRoute[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT id, name, polyline, distance_m, waypoints, source, base_activity_id, created_at
          FROM saved_routes WHERE athlete_id = ? ORDER BY created_at DESC`,
    args: [athleteId],
  });
  return result.rows as unknown as SavedRoute[];
}

export async function getRoute(id: number, athleteId: string): Promise<SavedRoute | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT id, name, polyline, distance_m, waypoints, source, base_activity_id, created_at
          FROM saved_routes WHERE id = ? AND athlete_id = ?`,
    args: [id, athleteId],
  });
  return (result.rows[0] as unknown as SavedRoute) ?? null;
}

export async function createRoute(input: NewRouteInput, athleteId: string): Promise<SavedRoute> {
  const db = await getDb();
  // Distance and polyline are derived server-side so they always match the stored waypoints.
  const waypoints: LatLng[] = input.waypoints;
  const polyline = encodePolyline(waypoints);
  const distanceM = routeDistanceMeters(waypoints);

  const result = await db.execute({
    sql: `INSERT INTO saved_routes (name, polyline, distance_m, waypoints, source, base_activity_id, athlete_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING id, name, polyline, distance_m, waypoints, source, base_activity_id, created_at`,
    args: [
      input.name,
      polyline,
      distanceM,
      JSON.stringify(waypoints),
      input.source ?? "draw",
      input.base_activity_id ?? null,
      athleteId,
    ],
  });
  return result.rows[0] as unknown as SavedRoute;
}

export async function deleteRoute(id: number, athleteId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({
    sql: `DELETE FROM saved_routes WHERE id = ? AND athlete_id = ?`,
    args: [id, athleteId],
  });
  return result.rowsAffected > 0;
}
