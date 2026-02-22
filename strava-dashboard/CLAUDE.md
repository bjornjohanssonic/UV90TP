# Strava Dashboard — "Ground Control"

Personal running dashboard with coaching intelligence, built with Next.js 15 and SQLite.
Features: readiness scoring, ACWR tracking, daily coaching briefings, run quality scoring, 141 injury prevention tips, training plan tracking.
Key deps: iron-session (auth), lucide-react (icons), Vitest (tests), Prettier (formatting), Leaflet (maps). Dates use `sv-SE` locale.

## Commands

- `npm run dev` - Start dev server (port 3000)
- `npm run build` - Production build (also type-checks)
- `npm test` - Run tests (vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - ESLint
- `npm run format` - Prettier (write)
- `npm run format:check` - Prettier (check only)

**Important:** After changing files in `lib/` or `app/`, always delete `.next/` and rebuild if you see `Cannot find module './XXX.js'` errors. This is a stale webpack cache issue, not a code bug.

## Architecture

```
app/
  layout.tsx              Root layout
  globals.css             Tailwind import + Ground Control design tokens + custom animations
  page.tsx                Landing page (Strava OAuth login)
  dashboard/
    page.tsx              Main dashboard ("Ground Control", client component, vertical stack)
    hooks/
      use-activities.ts   Activity data fetching
      use-training-plan.ts Plan data fetching
      use-sync-stream.ts  SSE-based Strava sync
      use-dashboard-data.ts Week aggregation, streaks, plan adherence
      use-coach.ts        Fetches /api/coach (readiness + briefing + ACWR)
      use-tips.ts         Seeds tip DB then fetches /api/tips
    widgets/
      readiness-hero.tsx  Giant readiness score (0-100) with 5-factor breakdown bars
      daily-briefing.tsx  One-sentence coach directive with urgency icon
      acwr-gauge.tsx      Horizontal ACWR zone gauge with marker dot
      week-rhythm.tsx     7-day (Mon-Sun) intensity bar chart with daily target line
      tip-panel.tsx       Grid of 2-3 tip cards with severity icons + category labels
      plan-adherence.tsx  4 plan insight rows (overall %, long run, recovery, build)
      streak-tracker.tsx  Current/longest streak + 8-week consistency bar
      this-week.tsx       Weekly summary + inline next actions + effort/suffer score
      run-map.tsx         Leaflet map with animated route drawing + photo gallery + quality score
      week-detail.tsx     Day-by-day detail with prev/next navigation
      recent-runs.tsx     Runs table with effort + quality (Q) + battery columns
      editable-battery-cell.tsx  Inline battery % editor
      battery-modal.tsx   Post-sync modal for batch battery entry
  training-plan/
    page.tsx              Training plan editor
  api/
    auth/login/           Strava OAuth redirect
    auth/callback/        Strava OAuth callback
    auth/session/         GET current session
    auth/logout/          POST logout
    activities/           GET activities from SQLite
    activities/sync/      POST streaming sync from Strava API (diff-based)
    activities/[strava_id]/battery/   PATCH battery_start/battery_end (0-100 or null)
    activities/[strava_id]/photos/    GET proxy to Strava photos API (size=600)
    training-plan/        GET/POST training plan
    coach/                GET → { briefing, acwr, readiness } (CoachResponse)
    scoring/[strava_id]/  GET → RunQualityScore for a specific run
    tips/                 GET → { daily, contextual } tips (query: trigger, strava_id)
    tips/seed/            POST → seeds 141 tips into DB if empty

types/
  activity.ts, plan.ts    Centralized TypeScript interfaces
  coach.ts                Intelligence types: DailyBriefing, CoachContext, CoachResponse,
                          ACWRResult, ReadinessFactors, ReadinessResult, RunQualityScore,
                          Tip, TipSelection, StreakData, PlanAdherence

lib/
  session.ts              iron-session config (uses SESSION_SECRET env var, hardcoded fallback)
  dashboard-helpers.ts    Pure functions: formatting, colors, aggregation, next actions
  db.ts                   SQLite database (better-sqlite3) + migrations (6 tables)
  strava.ts               Strava API client
  training-plan.ts        Training plan logic
  acwr.ts                 ACWR computation (7d acute / 28d chronic)
  readiness.ts            Readiness score (0-100, 5 weighted factors)
  scoring.ts              Run quality scoring (0-100, 4 sub-scores) — PURE, no server deps
  coach.ts                Daily briefing generation (priority-ordered decision tree)
  tips.ts                 141 tip seed data + deterministic selection (mulberry32 PRNG)
  repositories/
    user-repository.ts    User CRUD
    activity-repository.ts Activity CRUD + date-range queries
    plan-repository.ts    Plan CRUD
    tip-repository.ts     Tips CRUD (getTipsByTrigger, recordTipShown, insertTip, etc.)
    readiness-repository.ts Readiness cache (getCachedReadiness, upsertReadiness)
```

## Layout

Vertical stack layout (title: "Ground Control"):
- **Header**: "Ground Control" title, race countdown badge, Training Plan link, Sync button
- **Readiness Hero** (full width): Giant 0-100 score with animated counter, zone-colored glow, 5-factor breakdown bars
- **Daily Briefing** (full width): One-sentence coach directive with urgency-based left border + Lucide icon
- **ACWR + This Week** (2-column, 2fr 3fr): ACWR gauge | This Week summary with next actions
- **Week Rhythm** (full width): 7 vertical bars (Mon-Sun), height=distance, opacity=intensity, dashed daily target line
- **Tip Panel** (full width): 2-3 rotating tip cards with severity indicators
- **Run Map** (full width): Animated route drawing + quality score in details panel
- **Week Detail** (full width): Day-by-day breakdown with prev/next week arrows
- **Plan Adherence + Streak Tracker** (2-column, 50/50): Plan insights | Streak data
- **Recent Runs** (full width): Table with Date, Name, Distance, Time, Pace, HR, Effort, Q, Battery

## Coach Intelligence

### ACWR — Acute:Chronic Workload Ratio
`lib/acwr.ts` — `computeACWR(activities) → ACWRResult`
- **Acute**: sum of distance (km) in last 7 days
- **Chronic**: average weekly distance over last 28 days
- **Zones**: green (0.8–1.3), yellow (<0.8 or 1.3–1.5), red (<0.6 or >1.5)

### Readiness Score (0-100)
`lib/readiness.ts` — `computeReadiness(activities, planWeek, acwr, dayOfWeek) → ReadinessResult`

| Factor | Max | Logic |
|--------|-----|-------|
| Rest since last run | 25 | 0d=5, 1d=15, 2d=25, 3d=22, 4d+=18 |
| ACWR load balance | 25 | Green=25, yellow=12-15, red=5 |
| Yesterday's intensity | 25 | No run=22, easy=20, hard=5 |
| Plan phase | 15 | Recovery=15, taper=13, build=10, race=8 |
| Day pattern | 10 | Varies by weekday |

Labels: 80+ Fresh, 60+ Ready, 40+ Moderate, 20+ Fatigued, <20 Depleted

### Daily Briefing
`lib/coach.ts` — `generateDailyBriefing(ctx: CoachContext) → DailyBriefing`

Priority-ordered decision tree:
1. Safety overrides (5+ consecutive run days → rest, ACWR >1.5 → back off, readiness <25 → no run)
2. Race proximity (0–3 days to race)
3. Taper phase → short easy runs
4. Recovery phase → minimal volume
5. Long run day scheduling (Sat/Sun, end-of-week urgency)
6. Readiness-based guidance
7. Build week volume management
8. Fallback (no plan active)

### Run Quality Score (0-100)
`lib/scoring.ts` — `scoreRun(run, planWeek, dayOfWeek, recentRuns?) → RunQualityScore`

4 sub-scores of 25 each:
- **Pace consistency**: coefficient of variation of per-km split paces
- **HR efficiency**: pace per heartbeat, normalized against recent personal range
- **Elevation handling**: elevation gain per km (lower = better for flat runs)
- **Plan alignment**: distance vs plan target, HR appropriateness for phase

**Important:** `scoreRun()` is pure — no server-side imports. Safe for client-side use.
Used directly in `recent-runs.tsx` (client-side) and via `/api/scoring/[strava_id]` in `run-map.tsx`.

## Tip System

`lib/tips.ts` — 141 tips across 8 categories, seeded on first request via `POST /api/tips/seed`.

| Category | Count | Focus |
|----------|-------|-------|
| tibialis_anterior | 32 | Exercises with sets/reps, progression protocols |
| recovery | 21 | Post-run recovery strategies |
| nutrition | 16 | Fueling, hydration, timing |
| sleep | 13 | Sleep hygiene for runners |
| mobility | 16 | Stretching, foam rolling routines |
| strength | 16 | Runner-specific strength work |
| form | 13 | Running form cues and drills |
| prehab | 14 | Injury prevention protocols |

### Selection logic
- **Daily tips** (`selectDailyTips(date, weeklyVolumeKm)`): Picks exactly 2 tips per day using deterministic PRNG (mulberry32 seeded by date hash). Same date always produces same tips. Excludes tips shown in last 14 days. Tibialis anterior tips guaranteed every 2-3 days.
- **Post-run tips** (`selectPostRunTips(run, weeklyVolumeKm)`): 1-2 contextual tips based on run classification (long >15km, hard suffer_score>100, high elevation >300m, recovery <5km). Scores candidates by category relevance + severity weighting.
- **Volume filtering**: Each tip has `min_weekly_km`/`max_weekly_km` range so tips match training level.
- **History tracking**: `tip_history` table prevents repetition (14-day window for daily, 7-day for post-run).

### Tip triggers
`daily`, `rest_day`, `recovery_day`, `post_run`, `post_long_run`, `post_hard_run`, `high_load_week`

## Database Tables (6 total)

Existing: `users`, `activities`, `training_plans`, `training_weeks` (see training plan docs)

### tips
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| category | TEXT | One of 8 categories |
| trigger | TEXT | When to show (daily, post_run, etc.) |
| severity | TEXT | info, warning, action |
| title | TEXT | Short title |
| body | TEXT | Full tip text with specific numbers |
| source | TEXT | Evidence source (BJSM, ACSM, etc.) or null |
| min_weekly_km | REAL | Min volume for relevance (default 0) |
| max_weekly_km | REAL | Max volume for relevance (default 999) |
| active | INTEGER | 1 = active |

### tip_history
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| tip_id | INTEGER | FK → tips(id) |
| shown_date | TEXT | Date shown (YYYY-MM-DD) |
| context | TEXT | Context (post_run, post_long_run, etc.) |
| dismissed | INTEGER | 1 = dismissed by user |
| | | UNIQUE(tip_id, shown_date) |

### daily_readiness
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| date | TEXT | Date (UNIQUE) |
| score | INTEGER | Readiness score 0-100 |
| factors | TEXT | JSON-serialized ReadinessFactors |
| computed_at | TEXT | ISO timestamp |

## Run Map — Animation & Photos

### Route Drawing Animation

Every run selection triggers a three-phase animation:
1. **Loading phase** (1.5s): Solid black overlay with spinning orange circle. Map loads tiles behind it.
2. **Drawing phase**: Black overlay fades out (0.6s CSS `animate-fade-out`). After 500ms delay, the
   polyline draws from start to finish using `stroke-dasharray`/`stroke-dashoffset` driven by a
   `requestAnimationFrame` loop with cubic ease-in-out. A moving orange "head" marker follows the
   drawn tip using `SVGPathElement.getPointAtLength()` → `getScreenCTM()` → `map.containerPointToLatLng()`
   to stay perfectly synced with the dashoffset.
3. **Done phase**: Dash properties cleaned up, start (white) + end (orange) markers shown, photos fetched.

**Draw duration scales with distance:** `1000 + km * 300 + km² * 3` (clamped 3–35s).
Examples: 5km ≈ 3s, 20km ≈ 8s, 40km ≈ 18s, 60km ≈ 30s.

**Flash prevention:** Polyline is created with `opacity: 0` in Leaflet options AND `stroke-opacity: 0`
forced via `!important`. Only set to `0.85` after `stroke-dashoffset` is in place (so the line is
masked before becoming visible).

### Tailwind v4 / Leaflet SVG Conflict

Tailwind v4's CSS preflight overrides SVG presentation attributes on `<path>` elements.
`forcePathStyles()` applies inline `!important` overrides. `forceMarkerStyles()` does the same for
circle markers, re-applied in `requestAnimationFrame` and after `setLatLng()` calls.
- Do NOT remove these force functions — without them the polyline/markers become invisible
- SVG renderer uses `L.svg({ padding: 1 })` to prevent clipping-box artifacts

### Photo Gallery

- `GET /api/activities/[strava_id]/photos` proxies Strava's photos endpoint
- Photos fetched after animation completes (done phase)
- Toggle button (gallery icon / map icon) in top-right corner, only shown when photos exist
- Gallery mode: full-area black background with photo + pagination arrows
- Map mode: normal map view

**Map tiles:** CartoDB Dark Matter, tile pane `brightness(2.4)` filter.

Key facts:
- `summary_polyline` stored in `activities` table (TEXT column, Google Encoded Polyline format)
- Inline `decodePolyline()` function decodes to `[lat, lng][]`
- Leaflet CSS loaded from unpkg CDN via dynamic `<link>` element
- Leaflet JS loaded via dynamic `import("leaflet")` then `require("leaflet")` in useEffect
- `globals.css` has `.leaflet-container img { max-width: none !important }` fix for tile rendering

### Quality Score in Details Panel
- Fetches `RunQualityScore` from `/api/scoring/[strava_id]` for the selected run
- Shows total score (color-coded: green 80+, neutral 60+, yellow 40+, red <40) + 4 sub-scores (P/H/E/A)

## Sync

- **Diff-based**: `after` = most recent activity's `start_date` (unix timestamp). First-ever sync
  uses 2025-08-01. No 24h buffer (Strava `after` is exclusive, upsert handles duplicates).
- **Polyline backfill pass**: After the main sync loop, fetches details for activities missing
  `summary_polyline` (outdoor types only: Run, Walk, Ride, Hike, Swim). Skipped if rate-limited.
- `getActivitiesMissingPolyline()` returns `{strava_id, name}[]` for the backfill pass
- `countActivitiesMissingPolyline()` excludes indoor types
- Rate-limited sync shows estimated next-available time
- Auto-sync only triggers after initial data load confirms no cached activities
- Progress events include `strava_id` for battery modal tracking

## Battery Tracking

- **DB columns**: `battery_start INTEGER`, `battery_end INTEGER` on activities table (migration in `db.ts`)
- **Upsert protection**: `ON CONFLICT` clause uses `COALESCE(activities.battery_start, NULL)` to
  preserve user-entered values when Strava sync updates other fields
- **API**: `PATCH /api/activities/[strava_id]/battery` validates 0-100 or null
- **Inline editing**: `EditableBatteryCell` in RecentRuns — click to open two number inputs,
  Enter to save, Escape or click-outside to cancel
- **Post-sync modal**: `BatteryModal` appears after sync completes with new activities (runs only).
  Lists each activity with name/date/distance, two inputs per row, skip per row, Save All / Skip All.
- **Flow**: `useSyncStream` collects `strava_id` from progress events into `newlySyncedIds[]`.
  On sync complete, dashboard shows modal. On close, `clearSyncedIds()` resets.

## Suffer Score & Week-over-Week

- `WeekData.totalSufferScore` — sum of `suffer_score` for all runs in the week
- `sufferScoreChange` — % change vs 4-week average, computed in `useDashboardData`
- **ThisWeek widget**: "Effort" stat with change badge (↑/↓ %)
- **RecentRuns**: "Effort" column
- **WeekDetail**: suffer score shown per activity row

## Training Plan

### Algorithm (`lib/training-plan.ts`)

Conservative periodized plan for hobby ultra runners (UV90-focused):

- **Graduated build rate**: 12% at <30km, 10% at 30-45km, 8% at 45-55km, 6% at >55km. Hard cap: +5km/week max.
- **Peak volume**: User-configurable, hard cap 70km. Default computed as 65% of race distance for 80km+ races.
- **Recovery weeks**: Every 4 weeks at 65% of current build volume. First recovery week configurable (`firstRecoveryWeek`, default 4).
- **Long run**: Linear progression from starting LR to `maxLongRunKm` (default 35km hard cap). Recovery weeks: 50% of previous build LR.
- **B2B weekends**: 3 back-to-back weekends placed in peak phase before taper. Secondary run = 65% of long run. Long run capped at `(weekVolume - 10) / 1.65` to ensure room for secondary + midweek runs.
- **Pre-taper step-down**: Last 2 build weeks reduce to 90% and 85% of peak.
- **Taper**: 4 weeks at 70% → 55% → 35% → 20% of peak volume.
- **Start date**: Configurable via `startDate` in PlanConfig. Uses `getMondayBefore()` to align to Monday. Allows backdating to include already-trained weeks.
- **Volume flexibility**: All targets have ±10% tolerance. 90% of target = "met".

### PlanConfig (`types/plan.ts`)

Key config fields beyond basics (raceName, raceDate, raceDistanceKm, startingVolumeKm, peakVolumeKm, totalWeeks):
- `firstRecoveryWeek?: number` — default 4, set to 2-3 if already training
- `maxLongRunKm?: number` — hard cap on single long run, default 35
- `startDate?: string` — plan start date (YYYY-MM-DD), defaults to this Monday
- `startingLongRunKm?: number` — starting long run distance

### Training Plan Page (`app/training-plan/page.tsx`)

**Form (no plan state)**:
- Grouped into sections: Race, Schedule, Current Fitness, Targets
- Every field has descriptive helper text
- Date inputs use `colorScheme: "dark"` for native dark-themed date pickers
- Client-side validation before submit: race date must be future, start date before race, start date within 1 year of race (catches wrong-year typos)
- Default race date: `2026-08-15` (Ultravasan 90)

**Plan view**:
- Delete confirmation: two-step — "Delete Plan" → "Delete this plan? [Yes, delete] [Cancel]"
- Race countdown: "days to go" centered below the number
- Volume chart: Y-axis with km gridlines, wider bars, week numbers on x-axis, hover tooltips, target shown as low-opacity fill + target line, actual as foreground bar. Sorted by `week_number`.
- Week-by-week table: date ranges ("9–15 feb") via `formatDateRange()` instead of single dates. Cross-month format: "27 feb–5 mar". Column width 110px.

### Plan Adherence (`use-dashboard-data.ts`)

- Uses 90% threshold: "% of weeks where actual >= 90% of target"
- Next actions in `dashboard-helpers.ts` use `minTarget = target * 0.9` and "at least X km" language
- B2B secondary run ratio: 0.65 (used in dashboard-helpers, coach, training-plan page, this-week widget)

### Lessons Learned — Date Bugs

**Wrong year in plan start date**: User entered `2025-02-09` instead of `2026-02-09`. Since Feb 9, 2025 is a Sunday, `getMondayBefore()` rolled back to Feb 3, 2025. All 28 weeks ended up in 2025, making the system think the user was past race week. **Fix**: Added client-side validation that catches start dates >12 months before race date with a clear error message.

**Date handling rules**:
- Always use `"T00:00:00"` suffix when creating Date from `YYYY-MM-DD` string to avoid timezone interpretation as UTC
- `getMondayBefore()` uses local time — safe for same-timezone server/client (localhost)
- `toDateStr()` uses local date parts (getFullYear/getMonth/getDate) — matches `getMondayBefore()` timezone
- Week ranges: start_date + 6 days = Sunday (Mon-Sun weeks)
- To debug plan dates: query SQLite directly with `node -e` and `better-sqlite3` to inspect stored `start_date` values and verify they fall on Mondays

## Streaks & Plan Adherence

Computed in `use-dashboard-data.ts`:
- **Streaks**: A "streak week" = week with 3+ runs. Tracks current streak, longest streak, and 8-week consistency (% of last 8 weeks that are streak weeks).
- **Plan adherence**: Overall volume adherence %, long run hit rate (e.g. "4/6"), recovery week compliance, build progression rate.
- Both return `null` when insufficient data exists.

## Timestamps

- `formatTimeOfDay(iso)` — "HH:MM" format (sv-SE locale)
- `formatStartEnd(startDate, elapsedTime)` — "HH:MM–HH:MM" (end = start + elapsed_time)
- RunMap detail panel: "Clock" stat
- WeekDetail activity rows: start time annotation

## Conventions

- Dashboard title is "Ground Control" (not "Dashboard")
- All widget components are in `app/dashboard/widgets/` as separate files
- Pure logic (formatting, data processing) lives in `lib/dashboard-helpers.ts`
- Intelligence logic (ACWR, readiness, scoring, coach) lives in separate `lib/` files
- Tailwind CSS for styling (via `@tailwindcss/postcss`), dark theme — no CSS Modules
- Color palette defined in `COLORS` object in `dashboard-helpers.ts` (monochromatic neutrals)
- Health signal colors for readiness/ACWR zones: green (#4ade80), yellow (#fbbf24), red (#f87171)
- Lucide React icons — no emojis in UI
- Widget components receive props, never fetch data themselves — hooks in `dashboard/hooks/` orchestrate data
- Exception: `run-map.tsx` fetches quality score from API for selected activity
- `scoreRun()` in `lib/scoring.ts` is pure (no server deps) — imported client-side by `recent-runs.tsx`
- Activities include `summary_polyline` from Strava for map rendering
- CI: `.github/workflows/ci.yml` runs format-check, lint, test, build

### CSS Custom Properties (globals.css)
- Health signal colors: `--color-zone-green`, `--color-zone-yellow`, `--color-zone-red` (+ muted variants)
- Readiness glows: `--glow-fresh`, `--glow-ready`, `--glow-moderate`, `--glow-fatigued`
- Animations: `animate-spin-slow` (2s), `animate-fade-out` (0.6s), `fade-in` (0.5s blur), `count-up` (0.6s slide), `grow-bar` (0.5s scaleY), `pulse-glow` (3s infinite opacity)

## Testing

Tests use **vitest** (config in `vitest.config.ts`). Test files live next to the code they test:

- `lib/dashboard-helpers.test.ts` - Helper functions, formatting, aggregation, next actions
- Test factory `makeActivity()` includes all Activity fields (battery_start, battery_end, etc.)
