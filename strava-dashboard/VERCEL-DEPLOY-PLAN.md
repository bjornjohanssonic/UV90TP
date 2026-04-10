# Vercel + Turso Deployment Plan

## Status
- [x] Kod migrerad: `better-sqlite3` → `@libsql/client`
- [x] Multi-user isolation: `athlete_id` på alla tabeller
- [x] Session-säkerhet: ingen hardcoded fallback i produktion
- [x] Callback-URL dynamisk via `NEXT_PUBLIC_BASE_URL`
- [x] Bygget verifierat: `npm run build` — noll fel

---

## Kvarstående manuella steg

### 1. Turso — skapa databas
1. Skapa konto på https://turso.tech
2. Skapa en ny databas
3. Kopiera:
   - `TURSO_DB_URL` — ser ut som `libsql://din-db.turso.io`
   - `TURSO_TOKEN` — generera ett auth token via Turso-dashboarden

### ~~2. Migrera befintlig data~~ ✅ KLAR
Om du vill ha med befintliga aktiviteter och plan i Turso:

```bash
# Installera Turso CLI: https://docs.turso.tech/cli/installation

# Dumpa lokal SQLite till SQL
sqlite3 strava.db .dump > strava_dump.sql

# Importera till Turso
turso db shell din-db < strava_dump.sql
```

Hoppa över detta om du börjar från scratch — appen skapar tabeller automatiskt
och aktiviteter synkas via Strava-synken i dashboarden.

### 3. Vercel — deploya
1. Gå till https://vercel.com och logga in med GitHub
2. Importera `strava-dashboard`-repot
3. Under **Settings → Environment Variables**, lägg till:

| Variabel              | Värde                                    |
|-----------------------|------------------------------------------|
| `STRAVA_CLIENT_ID`    | Från https://www.strava.com/settings/api |
| `STRAVA_CLIENT_SECRET`| Från https://www.strava.com/settings/api |
| `SESSION_SECRET`      | Minst 32 tecken — kör: `openssl rand -base64 32` |
| `TURSO_DB_URL`        | `libsql://din-db.turso.io`               |
| `TURSO_TOKEN`         | Token från Turso                         |
| `NEXT_PUBLIC_BASE_URL`| `https://din-app.vercel.app` (Vercel-URL:en du får) |

4. Klicka Deploy — Vercel känner igen Next.js automatiskt.

### 4. Uppdatera Strava OAuth-callback
1. Gå till https://www.strava.com/settings/api
2. Ändra **Authorization Callback Domain** till:
   `din-app.vercel.app`
   (bara domänen, utan `https://`)

---

## Lokalt dev — fortsätter fungera som vanligt
- `.env.local` behöver **inte** ha `TURSO_DB_URL` eller `TURSO_TOKEN`
- Appen faller automatiskt tillbaka på `file:./strava.db`
- `SESSION_SECRET` kan vara vad som helst lokalt (valfri sträng)
