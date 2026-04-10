import { NextRequest, NextResponse } from "next/server";
import { updateBattery } from "@/lib/repositories";
import { getAuthenticatedAthleteId } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ strava_id: string }> }) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { strava_id } = await params;
  const body = await req.json();
  const { battery_start, battery_end } = body;

  // Validate: null or integer 0-100
  for (const val of [battery_start, battery_end]) {
    if (val !== null && val !== undefined) {
      if (!Number.isInteger(val) || val < 0 || val > 100) {
        return NextResponse.json({ error: "Battery values must be integers 0-100 or null" }, { status: 400 });
      }
    }
  }

  await updateBattery(strava_id, battery_start ?? null, battery_end ?? null, athleteId);
  return NextResponse.json({ ok: true });
}
