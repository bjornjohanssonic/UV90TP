# Strava Dashboard

Personal running dashboard with training plan tracking, built with Next.js 15 and SQLite.
Key deps: iron-session (auth), Vitest (tests), Prettier (formatting). Dates use `sv-SE` locale.

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
  globals.css             CSS custom properties (theme tokens)
  page.tsx                Landing page (Strava OAuth login)
  dashboard/
    page.tsx              Main dashboard (client component)
    hooks/                Custom hooks: use-activities, use-training-plan,
                          use-sync-stream, use-widget-layout, use-dashboard-data
    widgets/              8 widgets + widget-container, widget-error-boundary, widget-types
  training-plan/
    page.tsx              Training plan editor
  api/
    auth/login/           Strava OAuth redirect
    auth/callback/        Strava OAuth callback
    auth/session/         GET current session
    auth/logout/          POST logout
    activities/           GET activities from SQLite
    activities/sync/      POST streaming sync from Strava API
    training-plan/        GET/POST training plan

types/
  activity.ts, plan.ts    Centralized TypeScript interfaces

lib/
  session.ts              iron-session config (uses SESSION_SECRET env var, hardcoded fallback)
  dashboard-helpers.ts    Pure functions: formatting, colors, aggregation, PRs, next actions
  db.ts                   SQLite database (better-sqlite3)
  strava.ts               Strava API client
  training-plan.ts        Training plan logic
  repositories/           user-repository, activity-repository, plan-repository
```

## Widget System

Uses a **12-column CSS Grid** with `grid-auto-flow: row dense`. Each widget has:

- `colSpan` (4-12): how many grid columns it spans
- `order`: determines render order (lower = first)
- `minHeight` (optional): pixel height override, 0/undefined = auto from content
- `visible`: show/hide toggle

Layout is persisted in `localStorage` under key `widgetLayout_v2`. When adding new widgets, they are automatically merged into existing saved layouts.

The `WIDGET_REGISTRY` and `DEFAULT_LAYOUT` in `widget-types.ts` must stay in sync: every widget ID must appear in both. The test suite (`widget-types.test.ts`) enforces this.

### Drag-to-reorder

Uses HTML5 Drag & Drop API. Dragging by the top bar reorders widgets (changes `order` values). Green indicator line shows drop position.

### Resize

Bottom-right corner handle. Horizontal drag changes `colSpan`, vertical drag sets `minHeight`. Both update simultaneously during drag.

## Conventions

- All widget components are in `app/dashboard/widgets/` as separate files
- Pure logic (formatting, data processing) lives in `lib/dashboard-helpers.ts`
- CSS Modules (`.module.css`) per component + `globals.css` with CSS custom properties — no Tailwind
- Color palette defined in `COLORS` object in `dashboard-helpers.ts`
- Widget components receive props, never fetch data themselves — hooks in `dashboard/hooks/` orchestrate data
- CI: `.github/workflows/ci.yml` runs format-check, lint, test, build

## Testing

Tests use **vitest** (config in `vitest.config.ts`). Test files live next to the code they test:

- `lib/dashboard-helpers.test.ts` - Helper functions, formatting, aggregation, PRs, next actions
- `app/dashboard/widgets/widget-types.test.ts` - Registry/layout consistency, file existence checks

When adding a new widget:

1. Add the `WidgetId` to the union type
2. Add entry to `WIDGET_REGISTRY`
3. Add entry to `DEFAULT_LAYOUT` with correct order
4. Create the component file in `widgets/`
5. Add the render case in `page.tsx`'s `renderWidget()`
6. Tests will catch missing registry entries, layout entries, or component files
