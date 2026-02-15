import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { refreshAccessToken } from "@/lib/strava";
import { getAuthenticatedAthleteId } from "@/lib/session";

interface StravaPhoto {
  unique_id: string;
  urls: Record<string, string>;
  caption: string | null;
  source: number;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ strava_id: string }> }) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { strava_id } = await params;

  try {
    const accessToken = await refreshAccessToken(athleteId);
    const response = await axios.get<StravaPhoto[]>(
      `https://www.strava.com/api/v3/activities/${strava_id}/photos`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { size: 600 },
      },
    );
    return NextResponse.json(response.data);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}
