# Strava Dashboard

A personal running dashboard that extends Strava's built-in stats with periodized training plan generation, weekly load tracking, animated route maps, and plan-aware coaching suggestions. Built for ultra-distance race preparation.

## Features

- **Training Plan Generator** — Periodized 28-week plans with build/recovery/taper/race phases, progressive volume increases, long run scheduling, and back-to-back weekend support
- **Weekly Summary** — Distance, time, pace, and run count with plan target progress and phase-aware coaching suggestions
- **Animated Route Map** — Leaflet map with animated polyline drawing, start/end markers, and Strava photo gallery
- **Week Detail View** — Day-by-day breakdown with prev/next navigation; click any run to see it on the map
- **Recent Runs Table** — Sortable table with pace, heart rate, effort score, and battery tracking
- **Battery Tracking** — Log watch battery before/after runs, with a post-sync modal for batch entry
- **Diff-Based Sync** — SSE streaming sync that only fetches new activities, with polyline backfill for route maps
- **Effort Tracking** — Suffer score aggregation with week-over-week change indicators

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript, React 19) |
| Database | SQLite via better-sqlite3 (WAL mode) |
| API | Strava API v3, OAuth 2.0 |
| Maps | Leaflet with CartoDB Dark Matter tiles |
| Styling | Tailwind CSS v4 |
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
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000) and connect your Strava account.

The SQLite database (`strava.db`) is created automatically on first run with all required tables and migrations.

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
    page.tsx              Main dashboard
    hooks/                Data fetching & state hooks
    widgets/              UI components (this-week, run-map, week-detail, recent-runs)
  training-plan/
    page.tsx              Training plan creation & visualization
  api/
    auth/                 OAuth login, callback, session, logout
    activities/           Activity CRUD, sync, battery, photos
    training-plan/        Plan CRUD & generation

lib/
  db.ts                   SQLite schema & migrations
  strava.ts               Strava API client with token refresh
  training-plan.ts        Plan generation algorithm
  dashboard-helpers.ts    Formatting, colors, aggregation
  session.ts              iron-session config
  repositories/           Database access layer

types/
  activity.ts             Activity interfaces
  plan.ts                 Training plan interfaces
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
