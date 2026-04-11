# Strava App — Monorepo

Two packages in this repo:

- **`strava-dashboard/`** — Next.js 15 running dashboard ("Ground Control"). See its own `CLAUDE.md` for full docs.
- **`strava-mcp/`** — Local MCP server exposing running data and training plan to Claude via 8 tools. Reads `strava-dashboard/strava.db` directly (read-only, better-sqlite3).

## Quick start

```
dashboard.bat       — start dev server (npm run dev in strava-dashboard)
next level.bat      — nuclear restart: kill node, clear .next, reopen in Edge
next restart.bat    — kill node, clear .next, npm run dev (no browser)
```

## MCP server

```bash
cd strava-mcp
npm run build   # tsc → dist/
npm start       # node dist/index.js (stdio transport)
```

Registered in `%APPDATA%\Claude\claude_desktop_config.json`. Restart Claude Desktop after rebuilding.
