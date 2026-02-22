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
- **Styling:** CSS Modules (`.module.css`) + `globals.css` with CSS custom properties (light warm theme, WCAG AA compliant)
- **Auth/Session:** iron-session (secure cookie-based sessions)
- **Testing:** Vitest
- **Formatting:** Prettier (120 width, semicolons, trailing commas)
- **Hosting:** Local only (localhost:3000)
- **Locale:** `sv-SE` for all date formatting

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
- Checks localStorage for existing athlete ID → redirects to dashboard if found with loading indicator
- "Connect with Strava" button → initiates OAuth flow

### Dashboard (`/dashboard`)
- **Auto-sync on login** — automatically fetches latest Strava activities when dashboard loads
- **Activity sync** with SSE streaming progress
- **Customizable widget layout** — drag, resize, hide, and rearrange all dashboard widgets:
  - **Drag to reorder**: Hover over widget to reveal drag handle (top bar), drag to reorder
  - **Resize widgets**: Click bottom-left corner to cycle through sizes (small/medium/large/full)
  - **Hide/show widgets**: Remove button (✕) in drag handle, restore via Customize menu
  - **Visual drop indicators**: Dashed border shows where widget will land
  - **Side-by-side layout**: Smaller widgets (small/medium/large) can sit next to each other
  - **Persistent configuration**: Layout saved to localStorage
  - **Recent Runs locked**: Table widget locked to full width for readability
- **This week summary** (creative gradient card) — distance, time, pace, runs, plan target progress with color-coded phase badges
- **Race countdown** — days until race with gradient banner
- **Next Actions** (smart checklist card) — contextual, actionable suggestions based on **training plan progress** with priority indicators (high/medium/low):
  - Pulls target from current plan week (not generic activity data)
  - Smart long run scheduling: less aggressive on Saturdays (recognizes Sunday is available), more urgent on Sundays
  - Suggests specific actions: "Do your 15km long run before week ends" rather than generic advice
  - Rest day recommendations based on consecutive run days
  - Phase-specific guidance (recovery, taper, race week)
  - Volume management with daily km targets
  - Flexible week matching: if plan hasn't started yet, uses week 1; if plan ended, uses last week
- **Weekly distance chart** — last 8 weeks as bar chart with plan targets overlay
- **Gym sessions** — this week's weight training count and duration
- **Personal records** — top 4: longest run, fastest pace, most elevation, longest time
- **Weekly breakdown** — last 4 weeks detail table (expandable to all) with trend indicators
- **Recent runs** — last 20 runs with date, distance, time, pace, HR in striped table

### Training Plan (`/training-plan`)
- **No plan state:** form to create with fields:
  - Race name (optional), date, distance
  - Total plan weeks (default 28)
  - Current weekly volume and long run capability
  - Target peak volume
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

### 28-Week Plan Structure
- **Total duration:** 28 weeks configurable (24 build/plateau + 4 taper)
- **Start date:** Plans start from **current week's Monday** (not next week), so activities from the current week count immediately
- **Recovery weeks:** Fixed at weeks 4, 8, 12, 16, 20 (every 4 weeks)
- **Plateau phase:** Weeks 20-24 hold peak volume for race-readiness
- **Taper:** 4 weeks (weeks 25-28) at 70%, 55%, 35%, 20% of peak volume

### Volume Progression
- **Starting volume:** User-defined (e.g., 26 km/week)
- **Peak volume:** User-defined or auto-calculated (70-75 km for ultra)
- **Build weeks:** Progressive increase, max 15% per week, capped at +5 km/week
- **Recovery weeks:** 65% of previous build week volume
- **Plateau:** Holds peak volume during weeks 20-24

### Long Run Progression
- **Weeks 1-8:** 15 km → 25 km (~1.4 km/week increase)
- **Weeks 9-16:** 25 km → 35 km (~1.25 km/week increase)
- **Weeks 17-24:** Hold at 35-40 km (plateau phase)
- **Recovery weeks:** Long run at 50% of previous week
- **Taper:** Progressive reduction (18 km → 13 km → 7 km → 0)

### Back-to-Back Weekends
- **Timing:** 2-3 B2B weekends during plateau phase (weeks 20, 23)
- **Format:** Saturday long run + Sunday at ~60% of long run distance
- **Purpose:** Build race-day endurance without excessive single-run volume

## Design Preferences

### Color Scheme (WCAG AA Compliant)
- **Light warm theme** with green and tan/yellow tones:
  - Background: Warm off-white (#FAF8F3)
  - Cards: Light tan (#F5F1E8, #EFEBD9)
  - Primary green: Forest green (#4A7C59) for actions and current week
  - Accent green: Sage green (#5C8A6F) for success states
  - Warm gold: Golden tan (#C9A961) for highlights and records
  - Dark gold: Tan accent (#B8956A) for secondary elements
  - Text: Dark brown (#2C2C2C) primary, gray-brown (#6B6B6B) muted
  - Error: Muted red (#B85C5C)
  - Warning: Warm orange (#D4A574)

### Phase Colors
- **Build:** Forest green (#4A7C59)
- **Recovery:** Warm gold (#C9A961)
- **Taper:** Sage green (#5C8A6F)
- **Race:** Dark gold (#B8956A)

### UI Design
- **Creative cards:** Not generic card-deck style
  - Gradient backgrounds for key cards (This Week)
  - Checklist-style Next Actions with priority badges
  - Subtle shadows and borders for depth
- **Metric units:** km, min/km
- **Weeks start:** Monday
- **Tone:** Actionable and direct (not just encouraging)
- **Focus:** Running activities (gym sessions tracked separately)

## Future Ideas

- Heart rate zone analysis
- Shoe/gear mileage tracking
- Export weekly summaries
- Web hosting