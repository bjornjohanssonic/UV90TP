import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/strava";
import { getAuthenticatedAthleteId } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ strava_id: string }> }) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { strava_id } = await params;

  try {
    const accessToken = await refreshAccessToken(athleteId);
    const url = new URL(`https://www.strava.com/api/v3/activities/${strava_id}/photos`);
    url.searchParams.set("size", "600");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.status === 429) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}
