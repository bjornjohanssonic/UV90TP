import axios from "axios";
import { refreshAccessToken } from "@/lib/strava";
import { getMostRecentActivityDate, getActivitySplits, upsertActivity, countActivitiesMissingPolyline, getActivitiesMissingPolyline } from "@/lib/repositories";
import { getAuthenticatedAthleteId } from "@/lib/session";

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain: number;
  start_date: string;
  suffer_score?: number;
  splits_metric?: unknown[];
  map?: { summary_polyline?: string };
}

export async function POST() {
  const athleteId = await getAuthenticatedAthleteId();

  if (!athleteId) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const accessToken = await refreshAccessToken(athleteId);

        const mostRecent = getMostRecentActivityDate();

        // Use most recent activity date when we have data, otherwise fetch from Aug 2025
        const after = mostRecent
          ? Math.floor(new Date(mostRecent.start_date).getTime() / 1000)
          : Math.floor(new Date("2025-08-01T00:00:00Z").getTime() / 1000);

        let page = 1;
        const perPage = 100;
        let synced = 0;
        let total = 0;
        let rateLimited = false;

        send({ type: "status", message: "Fetching activity list from Strava..." });

        while (!rateLimited) {
          let activities: StravaActivity[];
          try {
            const response = await axios.get<StravaActivity[]>("https://www.strava.com/api/v3/athlete/activities", {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: { after, page, per_page: perPage },
            });
            activities = response.data;
          } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 429) {
              rateLimited = true;
              send({
                type: "rate_limit",
                synced,
                total,
                message: "Rate limit reached. Progress has been saved.",
              });
              break;
            }
            throw err;
          }

          if (activities.length === 0) break;

          send({
            type: "status",
            message: `Found ${(page - 1) * perPage + activities.length} activities. Fetching details...`,
          });

          for (const act of activities) {
            const existing = getActivitySplits(String(act.id));

            let splitsJson: string | null = null;
            let summaryPolyline: string | null = null;

            if (!existing?.splits || !existing?.summary_polyline || existing.summary_polyline === "") {
              try {
                const detail = await axios.get<StravaActivity>(`https://www.strava.com/api/v3/activities/${act.id}`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (detail.data.splits_metric) {
                  splitsJson = JSON.stringify(detail.data.splits_metric);
                }
                summaryPolyline = detail.data.map?.summary_polyline || null;
              } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 429) {
                  rateLimited = true;
                }
              }
              // Preserve existing data if detail fetch didn't return new data
              if (!splitsJson && existing?.splits) splitsJson = existing.splits;
              if (!summaryPolyline && existing?.summary_polyline) summaryPolyline = existing.summary_polyline;
              synced++;
            } else {
              splitsJson = existing.splits;
              summaryPolyline = existing.summary_polyline;
            }

            upsertActivity({
              strava_id: String(act.id),
              name: act.name,
              type: act.type,
              distance: act.distance,
              moving_time: act.moving_time,
              elapsed_time: act.elapsed_time,
              average_speed: act.average_speed,
              max_speed: act.max_speed,
              average_heartrate: act.average_heartrate ?? null,
              max_heartrate: act.max_heartrate ?? null,
              total_elevation_gain: act.total_elevation_gain,
              start_date: act.start_date,
              suffer_score: act.suffer_score ?? null,
              splits: splitsJson,
              summary_polyline: summaryPolyline,
            });
            total++;

            send({
              type: "progress",
              synced,
              total,
              latest: { strava_id: String(act.id), name: act.name, type: act.type, distance: act.distance, start_date: act.start_date },
            });

            if (rateLimited) break;
          }

          if (activities.length < perPage || rateLimited) break;
          page++;
        }

        // Polyline backfill pass: fetch details for activities missing polyline data
        let backfilled = 0;
        if (!rateLimited) {
          const missingPolylines = getActivitiesMissingPolyline();
          if (missingPolylines.length > 0) {
            send({ type: "status", message: `Backfilling route data for ${missingPolylines.length} activities...` });
            for (const { strava_id, name } of missingPolylines) {
              try {
                const detail = await axios.get<StravaActivity>(`https://www.strava.com/api/v3/activities/${strava_id}`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                const summaryPolyline = detail.data.map?.summary_polyline || null;
                const splitsJson = detail.data.splits_metric ? JSON.stringify(detail.data.splits_metric) : null;
                if (summaryPolyline || splitsJson) {
                  const existing = getActivitySplits(strava_id);
                  upsertActivity({
                    strava_id,
                    name: detail.data.name,
                    type: detail.data.type,
                    distance: detail.data.distance,
                    moving_time: detail.data.moving_time,
                    elapsed_time: detail.data.elapsed_time,
                    average_speed: detail.data.average_speed,
                    max_speed: detail.data.max_speed,
                    average_heartrate: detail.data.average_heartrate ?? null,
                    max_heartrate: detail.data.max_heartrate ?? null,
                    total_elevation_gain: detail.data.total_elevation_gain,
                    start_date: detail.data.start_date,
                    suffer_score: detail.data.suffer_score ?? null,
                    splits: splitsJson || existing?.splits || null,
                    summary_polyline: summaryPolyline || existing?.summary_polyline || null,
                  });
                  backfilled++;
                }
                send({ type: "status", message: `Backfilling routes: ${backfilled}/${missingPolylines.length} (${name})` });
              } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 429) {
                  rateLimited = true;
                  break;
                }
              }
            }
          }
        }

        if (rateLimited) {
          send({
            type: "done",
            synced,
            total,
            rateLimited: true,
            message: `Saved ${total} activities${backfilled > 0 ? `, backfilled ${backfilled} routes` : ""}. Rate limit hit — next sync available around ${new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}.`,
          });
        } else {
          send({
            type: "done",
            synced,
            total,
            rateLimited: false,
            message: `Synced ${total} activities (${synced} detail fetches${backfilled > 0 ? `, ${backfilled} routes backfilled` : ""}).`,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
