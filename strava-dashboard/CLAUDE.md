# Strava Dashboard

Personal running dashboard with training plan tracking, built with Next.js 15 and SQLite.
Key deps: iron-session (auth), Vitest (tests), Prettier (formatting), Leaflet (maps). Dates use `sv-SE` locale.

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
  globals.css             Tailwind import + Memoria design tokens + custom animations
  page.tsx                Landing page (Strava OAuth login)
  dashboard/
    page.tsx              Main dashboard (client component, fixed layout)
    hooks/                Custom hooks: use-activities, use-training-plan,
                          use-sync-stream, use-dashboard-data
    widgets/
      this-week.tsx       Weekly summary + inline next actions + effort/suffer score
      run-map.tsx         Leaflet map with animated route drawing + photo gallery
      week-detail.tsx     Day-by-day detail with prev/next navigation
      recent-runs.tsx     Runs table with effort + battery columns
      editable-battery-cell.tsx  Inline battery % editor (click to edit, click-outside to close)
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

types/
  activity.ts, plan.ts    Centralized TypeScript interfaces

lib/
  session.ts              iron-session config (uses SESSION_SECRET env var, hardcoded fallback)
  dashboard-helpers.ts    Pure functions: formatting, colors, aggregation, next actions
  db.ts                   SQLite database (better-sqlite3) + migrations
  strava.ts               Strava API client
  training-plan.ts        Training plan logic
  repositories/           user-repository, activity-repository, plan-repository
```

## Layout

Fixed layout (no drag/resize/hide):
- **Header**: Dashboard title, race countdown badge, Training Plan link, Sync button
- **Row 1** (two columns, 5fr 7fr): ThisWeek (with inline next actions) + RunMap
- **Row 2** (full width): WeekDetail with prev/next week arrows; click runs to update map
- **Row 3** (full width): RecentRuns

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

## Timestamps

- `formatTimeOfDay(iso)` — "HH:MM" format (sv-SE locale)
- `formatStartEnd(startDate, elapsedTime)` — "HH:MM–HH:MM" (end = start + elapsed_time)
- RunMap detail panel: "Clock" stat
- WeekDetail activity rows: start time annotation

## Conventions

- All widget components are in `app/dashboard/widgets/` as separate files
- Pure logic (formatting, data processing) lives in `lib/dashboard-helpers.ts`
- Tailwind CSS for styling (via `@tailwindcss/postcss`), Memoria dark design system — no CSS Modules
- Color palette defined in `COLORS` object in `dashboard-helpers.ts` (monochromatic neutrals)
- Widget components receive props, never fetch data themselves — hooks in `dashboard/hooks/` orchestrate data
- Activities include `summary_polyline` from Strava for map rendering
- CI: `.github/workflows/ci.yml` runs format-check, lint, test, build
- Custom CSS animations in `globals.css`: `animate-spin-slow` (2s), `animate-fade-out` (0.6s)

## Testing

Tests use **vitest** (config in `vitest.config.ts`). Test files live next to the code they test:

- `lib/dashboard-helpers.test.ts` - Helper functions, formatting, aggregation, next actions
- Test factory `makeActivity()` includes all Activity fields (battery_start, battery_end, etc.)
