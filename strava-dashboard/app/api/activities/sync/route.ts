import { NextRequest } from "next/server";
import axios from "axios";
import getDb from "@/lib/db";
import { refreshAccessToken } from "@/lib/strava";

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
}

export async function POST(request: NextRequest) {
  const { athleteId } = await request.json();

  if (!athleteId) {
    return new Response(JSON.stringify({ error: "athleteId required" }), {
      status: 400,
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
        const db = getDb();

        const after = Math.floor(new Date("2025-08-01T00:00:00Z").getTime() / 1000);

        let page = 1;
        const perPage = 100;
        let synced = 0;
        let total = 0;
        let rateLimited = false;

        const upsertStmt = db.prepare(
          `INSERT INTO activities (strava_id, name, type, distance, moving_time, elapsed_time,
            average_speed, max_speed, average_heartrate, max_heartrate,
            total_elevation_gain, start_date, suffer_score, splits)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(strava_id) DO UPDATE SET
             name = excluded.name, type = excluded.type, distance = excluded.distance,
             moving_time = excluded.moving_time, elapsed_time = excluded.elapsed_time,
             average_speed = excluded.average_speed, max_speed = excluded.max_speed,
             average_heartrate = excluded.average_heartrate, max_heartrate = excluded.max_heartrate,
             total_elevation_gain = excluded.total_elevation_gain, start_date = excluded.start_date,
             suffer_score = excluded.suffer_score, splits = excluded.splits`
        );

        send({ type: "status", message: "Fetching activity list from Strava..." });

        while (!rateLimited) {
          let activities: StravaActivity[];
          try {
            const response = await axios.get<StravaActivity[]>(
              "https://www.strava.com/api/v3/athlete/activities",
              {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { after, page, per_page: perPage },
              }
            );
            activities = response.data;
          } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 429) {
              rateLimited = true;
              send({ type: "rate_limit", synced, total, message: "Rate limit reached. Progress has been saved." });
              break;
            }
            throw err;
          }

          if (activities.length === 0) break;

          send({ type: "status", message: `Found ${(page - 1) * perPage + activities.length} activities. Fetching details...` });

          for (const act of activities) {
            const existing = db
              .prepare("SELECT strava_id, splits FROM activities WHERE strava_id = ?")
              .get(String(act.id)) as { strava_id: string; splits: string | null } | undefined;

            let splitsJson: string | null = null;

            if (!existing?.splits) {
              try {
                const detail = await axios.get<StravaActivity>(
                  `https://www.strava.com/api/v3/activities/${act.id}`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (detail.data.splits_metric) {
                  splitsJson = JSON.stringify(detail.data.splits_metric);
                }
              } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 429) {
                  rateLimited = true;
                  // Still save this activity without splits
                }
                // Other errors: save without splits
              }
              synced++;
            } else {
              splitsJson = existing.splits;
            }

            upsertStmt.run(
              String(act.id), act.name, act.type, act.distance,
              act.moving_time, act.elapsed_time, act.average_speed, act.max_speed,
              act.average_heartrate ?? null, act.max_heartrate ?? null,
              act.total_elevation_gain, act.start_date, act.suffer_score ?? null,
              splitsJson
            );
            total++;

            // Send progress every activity
            send({
              type: "progress",
              synced,
              total,
              latest: { name: act.name, type: act.type, distance: act.distance, start_date: act.start_date },
            });

            if (rateLimited) break;
          }

          if (activities.length < perPage || rateLimited) break;
          page++;
        }

        if (rateLimited) {
          send({ type: "done", synced, total, rateLimited: true, message: `Saved ${total} activities. Rate limit hit — run sync again in ~15 min to fetch remaining details.` });
        } else {
          send({ type: "done", synced, total, rateLimited: false, message: `Synced ${total} activities (${synced} detail fetches).` });
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
