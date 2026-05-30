import { NextResponse } from "next/server";
import { getRoute, deleteRoute } from "@/lib/routes";
import { getAuthenticatedAthleteId } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const routeId = parseInt(id, 10);
  if (isNaN(routeId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const route = await getRoute(routeId, athleteId);
  if (!route) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(route);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const routeId = parseInt(id, 10);
  if (isNaN(routeId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const ok = await deleteRoute(routeId, athleteId);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
