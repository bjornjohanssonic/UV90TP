# Strava Dashboard

A personal running dashboard that extends Strava's built-in stats with training plan generation, weekly load tracking, personal records, and plan-aware coaching suggestions.

## Purpose

- Periodized training plan generation for race preparation (ultra-distance focused)
- Weekly training load overview with plan target comparison
- Stream-based activity sync with real-time progress feedback
- Personal records tracking (longest run, fastest pace, elevation, etc.)
- Plan-aware suggestions based on current phase (build/recovery/taper/race)
- Gym session tracking alongside running volume

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript, React 19)
- **Database:** SQLite via better-sqlite3 (WAL mode, local, no server needed)
- **API:** Strava API v3 with OAuth 2.0
- **HTTP Client:** Axios
- **Styling:** Inline CSS (dark theme, no external CSS library)
- **Hosting:** Local only (localhost:3000)

## Project Structure

```
strava-dashboard/
├── app/
│   ├── page.tsx                   # Home/login page
│   ├── layout.tsx                 # Root layout
│   ├── dashboard/page.tsx         # Main dashboard
│   ├── training-plan/page.tsx     # Training plan setup & visualization
│   └── api/
│       ├── auth/login/route.ts    # OAuth redirect to Strava
│       ├── auth/callback/route.ts # OAuth token exchange
│       ├── activities/route.ts    # Get cached activities
│       ├── activities/sync/route.ts # SSE-based sync with Strava
│       └── training-plan/route.ts # Plan CRUD & computation
├── lib/
│   ├── db.ts                      # SQLite init & schema
│   ├── strava.ts                  # Strava API client & token refresh
│   └── training-plan.ts           # Plan generation algorithm
└── strava.db                      # SQLite database
```

## Strava API Notes

- OAuth 2.0 flow with `read_all,activity:read_all` scope
- Callback URL: `http://localhost:3000/api/auth/callback`
- Access tokens expire every 6 hours — auto-refreshed using refresh token
- Rate limits: 100 requests per 15 minutes, 1000 per day
- Activities cached locally in SQLite to minimize API calls
- Sync fetches all activities since Aug 1, 2025 (paginated, 100 per page)
- Register app at: https://www.strava.com/settings/api

## Environment Variables (.env.local)

```
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
NEXTAUTH_SECRET=
```

## Database Tables

### users
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (autoincrement) |
| strava_athlete_id | TEXT | Strava's athlete ID (unique) |
| access_token | TEXT | Current OAuth access token |
| refresh_token | TEXT | OAuth refresh token |
| token_expires_at | INTEGER | Token expiry timestamp |

### activities
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (autoincrement) |
| strava_id | TEXT | Strava's activity ID (unique) |
| name | TEXT | Activity name |
| type | TEXT | Activity type (Run, WeightTraining, etc.) |
| distance | REAL | Distance in meters |
| moving_time | INTEGER | Moving time in seconds |
| elapsed_time | INTEGER | Total elapsed time in seconds |
| average_speed | REAL | Average speed in m/s |
| max_speed | REAL | Max speed in m/s |
| average_heartrate | REAL | Average heart rate |
| max_heartrate | REAL | Max heart rate |
| total_elevation_gain | REAL | Elevation gain in meters |
| start_date | TEXT | ISO timestamp |
| suffer_score | REAL | Strava's suffer score |
| splits | TEXT | JSON string of per-km split data |

### training_plans
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (autoincrement) |
| name | TEXT | Plan name |
| race_name | TEXT | Target race name |
| race_date | TEXT | Race date (YYYY-MM-DD) |
| race_distance_km | REAL | Race distance in km |
| start_date | TEXT | Plan start date (next Monday) |
| starting_volume_km | REAL | Initial weekly volume |
| peak_volume_km | REAL | Max weekly volume |
| total_weeks | INTEGER | Total plan duration |
| build_increment | REAL | Avg % increase per build week |
| recovery_factor | REAL | Recovery week factor (0.65) |
| active | INTEGER | 1 = active (only one at a time) |
| created_at | TEXT | ISO timestamp |

### training_weeks
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (autoincrement) |
| plan_id | INTEGER | FK → training_plans (cascade delete) |
| week_number | INTEGER | Week number in plan |
| start_date | TEXT | Monday of that week |
| target_volume_km | REAL | Target weekly distance |
| long_run_km | REAL | Target long run distance |
| back_to_back | INTEGER | 1 = Saturday long + Sunday run |
| phase | TEXT | build, recovery, taper, or race |
| cycle_number | INTEGER | Build cycle number |
| week_in_cycle | INTEGER | Position within cycle |

## Pages

### Home (`/`)
- Checks localStorage for existing athlete ID → redirects to dashboard if found
- "Connect with Strava" button → initiates OAuth flow

### Dashboard (`/dashboard`)
- **Activity sync** with SSE streaming progress
- **This week summary** — distance, time, pace, runs, % change vs 4-week avg, plan target progress
- **Weekly distance chart** — last 8 weeks as bar chart with plan targets overlay
- **Suggestions** — plan-aware coaching (rest days, long run planning, weekly km targets, phase guidance)
- **Personal records** — top 5: longest run, fastest pace, most elevation, longest time, max HR
- **Gym sessions** — this week's weight training count and duration
- **Weekly breakdown** — last 4 weeks detail table (expandable to all)
- **Recent runs** — last 20 runs with date, distance, time, pace, HR

### Training Plan (`/training-plan`)
- **No plan state:** form to create (race name, date, distance, current weekly volume)
- **Plan active state:**
  - Race countdown + race name
  - Current week card (target, actual, remaining, long run, back-to-back)
  - Plan stats (start/peak volume, peak long run, B2B weeks, total weeks)
  - Volume chart — horizontal bars for all weeks showing target vs actual, colored by phase
  - Week-by-week table (week #, dates, phase, target, long run, actual, runs, gym, B2B, progress %)
  - Plan methodology explanation
  - Delete plan button

## Training Plan Algorithm

Periodized plan generation in `lib/training-plan.ts`:

- **Peak volume** scales by race distance (72% for 90km ultra, up to 85% for <50km, capped at 80km)
- **Build progression** — volume-dependent weekly increase (4–10%, max +5km/week)
- **Recovery cycles** — 3:1 below 60km/week, 2:1 at 60km+; recovery weeks at 65% of previous volume
- **Long runs** — 25% of volume on recovery weeks, 28–35% on build weeks, capped at 55% of race distance
- **Back-to-back weekends** — introduced at 50km+ volume, starting 12 weeks pre-race, every 3rd build week
- **Taper** — 3 weeks at 70%, 55%, 35% of peak volume
- **Race week** — 25% of peak volume, no long run

## Design Preferences

- Dark theme (#0a0a0a background, #141414 cards, #ededed text)
- Strava orange (#fc4c02) for primary actions
- Phase colors: build (cyan #4ecdc4), recovery (purple #a78bfa), taper (gold #f0ad4e), race (orange)
- Metric units (km, min/km)
- Weeks start on Monday
- Encouraging tone in suggestions
- Focus on running activities (gym sessions tracked separately)

## Future Ideas

- Heart rate zone analysis
- Shoe/gear mileage tracking
- Export weekly summaries
- Web hosting