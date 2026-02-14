import { NextResponse } from "next/server";
import { getAllActivities } from "@/lib/repositories";
import { getAuthenticatedAthleteId } from "@/lib/session";

export async function GET() {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const activities = getAllActivities();
  return NextResponse.json(activities);
}
