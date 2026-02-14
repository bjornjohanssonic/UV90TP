import { NextResponse } from "next/server";
import { getAuthenticatedAthleteId } from "@/lib/session";

export async function GET() {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ athleteId });
}
