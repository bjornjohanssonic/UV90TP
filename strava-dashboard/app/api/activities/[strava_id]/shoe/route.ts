import { NextRequest, NextResponse } from "next/server";
import { assignShoeToActivity } from "@/lib/shoes";
import { getAuthenticatedAthleteId } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ strava_id: string }> }) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { strava_id } = await params;
  const body = await req.json();
  const shoeId: number | null = body.shoe_id ?? null;

  await assignShoeToActivity(strava_id, shoeId, athleteId);
  return NextResponse.json({ ok: true });
}
