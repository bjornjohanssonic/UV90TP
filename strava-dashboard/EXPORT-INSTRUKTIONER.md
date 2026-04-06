# Exportera data till IC-modulen

## Steg-för-steg

### 1. Exportera från SQLite till JSON

Kör detta från `strava-dashboard/`-mappen:

```bash
node export-for-ic-module.js
```

Det skapar en fil som heter `running-dashboard-export-YYYY-MM-DD.json` i samma mapp.

**Flaggor:**
- `--db /sökväg/till/strava.db` — om databasen ligger på annan plats
- `--output mitt-filnamn.json` — anpassat filnamn

**Exempel:**
```bash
# Standard (letar efter strava.db i samma mapp)
node export-for-ic-module.js

# Ange databas och output
node export-for-ic-module.js --db ./strava.db --output min-data.json
```

### 2. Importera i IC-modulen

1. Öppna löpardashboard-modulen i IC-plattformen
2. Gå till fliken **Inställningar**
3. Klicka **Importera JSON**
4. Välj filen du just skapade
5. Klart — du bör se en toast med "Importerade X aktiviteter (Y nya, Z uppdaterade)"

### 3. Exportera tillbaka (om du vill)

IC-modulen har en **Exportera JSON**-knapp som skapar exakt samma filformat. Den filen kan sedan importeras tillbaka till SQLite:

```bash
node import-from-ic-module.js running-dashboard-export-2026-02-16.json
```

**Flaggor:**
- `--db /sökväg/till/strava.db` — om databasen ligger på annan plats
- `--dry-run` — visa vad som skulle importeras utan att skriva något

**Exempel:**
```bash
# Förhandsgranska
node import-from-ic-module.js min-data.json --dry-run

# Importera på riktigt
node import-from-ic-module.js min-data.json
```

## Dataflöde (symmetri)

```
SQLite (strava.db)           JSON-fil                  IC-modul (localStorage)
      │                         │                              │
      ├─── export-for-ic ──────►│                              │
      │                         ├───── IC import ─────────────►│
      │                         │                              │
      │                         │◄──── IC export ──────────────┤
      │◄── import-from-ic ─────┤                              │
      │                         │                              │
```

Alla fyra operationer använder **exakt samma JSON-format**. Det betyder:
- Du kan exportera från SQLite → importera i IC-modulen
- Du kan exportera från IC-modulen → importera i SQLite
- Du kan exportera från IC-modulen → importera i IC-modulen (backup/restore)
- Ingen data förloras i rundturen

## Merge-beteende

| System | Aktiviteter | Träningsplan | Battery-värden |
|--------|-------------|-------------|----------------|
| IC-modul import | Merge på `id` (nya läggs till, befintliga uppdateras) | Ersätts helt | Skrivs över |
| SQLite import | Upsert på `strava_id` (nya läggs till, befintliga uppdateras) | Ersätts helt (gamla avaktiveras) | Bevaras med COALESCE om redan ifyllda |

## Felsökning

**"Databasen hittades inte"** — se till att du kör från rätt mapp eller ange `--db` flaggan.

**Filen är tom / inga aktiviteter** — kontrollera att `strava.db` har data:
```bash
node -e "const D=require('better-sqlite3');const d=new D('./strava.db',{readonly:true});console.log(d.prepare('SELECT COUNT(*) as c FROM activities').get())"
```

**Import i IC-modulen visar "Ogiltig fil"** — kontrollera att filen har `export_version` och `activities`-array i toppnivån.
