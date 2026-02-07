import { NextResponse } from "next/server";
import { getCachedActivities } from "@/lib/strava";

export async function GET() {
  const activities = getCachedActivities();
  return NextResponse.json(activities);
}
