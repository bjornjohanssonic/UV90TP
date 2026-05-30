# Strava Dashboard

A personal running dashboard that extends Strava's built-in stats with periodized training plan generation, weekly load tracking, animated route maps, interactive route drawing, daily go-plan suggestions, and plan-aware coaching. Built for ultra-distance race preparation.

## Features

- **Training Plan Generator** — Periodized 28-week plans with build/recovery/taper/race phases, progressive volume increases, long run scheduling, and back-to-back weekend support
- **Daily Go Plan** (`/daily-go-plan`) — Mobile-first PWA start page with readiness, briefing, weather, ACWR, and an editable "Next Run" suggestion derived from remaining weekly distance
- **Route Editor** (`/rutter`) — Google-My-Maps-style draw mode: click waypoints with live distance, start from any past run, close loops into balloons or out-and-back routes, break out into detours, undo/redo (Ctrl+Z/Y), and switch between stylized / OSM / OpenTopoMap basemaps
- **Weekly Summary** — Distance, time, pace, and run count with plan target progress and phase-aware coaching suggestions
- **Animated Route Map** — Leaflet map with animated polyline drawing, start/end markers, and Strava photo gallery
- **Week Detail View** — Day-by-day breakdown with prev/next navigation; click any run to see it on the map
- **Recent Runs Table** — Sortable table with pace, heart rate, effort score, and battery tracking
- **Shoes Tracker** (`/shoes`) — Per-pair distance tracking with rotation warnings and lifespan predictions; per-row kebab menu for retire / reactivate
- **Battery Tracking** — Log watch battery before/after runs, with a post-sync modal for batch entry
- **Diff-Based Sync** — SSE streaming sync that only fetches new activities, with polyline backfill for route maps
- **Effort Tracking** — Suffer score aggregation with week-over-week change indicators

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript, React 19) |
| Database | Turso / libSQL via `@libsql/client` (falls back to a local `file:./strava.db` if `TURSO_DB_URL` is unset) |
| API | Strava API v3, OAuth 2.0 |
| Maps | Leaflet with CartoDB `light_all` tiles (run-map + default rutter basemap). The /rutter editor also offers OpenStreetMap standard and OpenTopoMap layers |
| Styling | Tailwind CSS v4 (light/cream theme: `#F7F3EE` page bg, white cards, stone neutrals, Strava orange `#FC4C02` accent) |
| Auth | iron-session (cookie-based sessions) |
| Testing | Vitest |
| Formatting | Prettier |

## Prerequisites

- Node.js 18+
- A Strava account
- A registered Strava API application ([create one here](https://www.strava.com/settings/api))
  - Set the callback URL to `http://localhost:3000/api/auth/callback`

## Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd strava-dashboard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create environment file**

   Copy `.env.local.example` or create `.env.local` with:

   ```
   STRAVA_CLIENT_ID=<your-client-id>
   STRAVA_CLIENT_SECRET=<your-client-secret>
   SESSION_SECRET=<random-32-char-string>

   # Optional — use Turso (libSQL) for cloud-synced data. If omitted the app falls
   # back to a local SQLite file at ./strava.db.
   TURSO_DB_URL=libsql://<your-db>.turso.io
   TURSO_TOKEN=<turso-auth-token>
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000) and connect your Strava account.

Tables and migrations run automatically against the configured database on first request.

## Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build (includes type-checking) |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |

## Project Structure

```
app/
  page.tsx                Landing page (Strava OAuth login)
  dashboard/
    page.tsx              Main dashboard ("Ground Control")
    hooks/                Data fetching & state hooks (incl. use-weather)
    widgets/              UI components (run-map, this-week, week-detail, recent-runs, …)
  daily-go-plan/
    page.tsx              Mobile-first PWA start page with editable Next Run card
  morning/                Redirect stub → /daily-go-plan (kept for old bookmarks)
  rutter/
    page.tsx              Rita / Föreslå mode toggle
    route-editor.tsx      Leaflet draw editor (balloon / break-out / undo-redo / basemaps)
  shoes/
    page.tsx              Shoe distance tracker + Hall of Fame
  training-plan/
    page.tsx              Training plan creation & visualization
  api/
    auth/                 OAuth login, callback, session, logout
    activities/           Activity CRUD, sync, battery, photos, shoe assignment
    training-plan/        Plan CRUD & generation
    coach/, scoring/, tips/, tips/seed/
    shoes/, shoes/[id]/   Shoe CRUD
    routes/, routes/[id]/ Saved drawn routes

lib/
  db.ts                   libSQL (Turso) client + migrations (9 tables)
  strava.ts               Strava API client with token refresh
  training-plan.ts        Plan generation algorithm
  dashboard-helpers.ts    Formatting, colors, aggregation
  session.ts              iron-session config
  acwr.ts, readiness.ts, coach.ts, scoring.ts, tips.ts   Coach intelligence
  polyline.ts             Encode/decode Google polylines + haversine distance
  route-builder.ts        Pure route model (nodes + legs) used by the /rutter editor
  routes.ts               Saved-routes data access
  shoes.ts, shoe-intelligence.ts   Shoes data + alerts/rotation/predictions
  repositories/           Database access layer

types/
  activity.ts             Activity interfaces
  plan.ts                 Training plan interfaces
  shoe.ts                 Shoe, ShoeType
  route.ts                SavedRoute, RouteSource, NewRouteInput
  coach.ts                Coach intelligence types
```

## Training Plan Algorithm

Plans follow a periodized structure designed for ultra-distance races:

- **Build phase** — Progressive weekly volume increase (max 15%/week, capped at +5 km)
- **Recovery weeks** — Every 4th week at 65% volume
- **Plateau phase** — 4 weeks holding peak volume for race-readiness
- **Taper** — 4 weeks at 70% → 55% → 35% → 20% of peak
- **Long runs** — Progress from 15 km to 35-40 km with recovery week reductions
- **Back-to-back weekends** — Saturday long run + Sunday run during plateau phase

## License

Personal project. Not licensed for redistribution.
