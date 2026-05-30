import { NextRequest, NextResponse } from "next/server";
import { getAllRoutes, createRoute } from "@/lib/routes";
import { getAuthenticatedAthleteId } from "@/lib/session";
import type { LatLng } from "@/lib/polyline";
import type { RouteSource } from "@/types";

const VALID_SOURCES: RouteSource[] = ["draw", "breakout", "suggest"];

function parseWaypoints(raw: unknown): LatLng[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const points: LatLng[] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length !== 2) return null;
    const [lat, lng] = item;
    if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)) {
      return null;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    points.push([lat, lng]);
  }
  return points;
}

export async function GET() {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const routes = await getAllRoutes(athleteId);
  return NextResponse.json(routes);
}

export async function POST(req: NextRequest) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const waypoints = parseWaypoints(body.waypoints);
  if (!waypoints) {
    return NextResponse.json({ error: "waypoints must be at least 2 valid [lat,lng] points" }, { status: 400 });
  }

  const source: RouteSource = VALID_SOURCES.includes(body.source) ? body.source : "draw";
  const baseActivityId =
    typeof body.base_activity_id === "string" ? body.base_activity_id : null;

  const route = await createRoute({ name, waypoints, source, base_activity_id: baseActivityId }, athleteId);
  return NextResponse.json(route, { status: 201 });
}
