# IndexFootball - Claude Code Build Prompt

> A free football encyclopedia (players, clubs, leagues, matches, history) built as a static site with programmatic SEO. Transfermarkt-style information architecture, but **without** proprietary market values (we can't get those for free). Site language: **English only**.

---

## 1. PROJECT OVERVIEW

**Name:** IndexFootball
**Domain:** indexfootball.com (to be added via Netlify)
**Positioning:** "The free football encyclopedia — players, clubs, matches, history."
**Type:** 100% static site, programmatic SEO, English language.
**Scale target (v1):** Top 5 European leagues + UCL + UEL, ~20 seasons of history. Roughly 100–150k generated pages.

**What we ARE building:**
- League pages with computed standings (from raw match data)
- Season fixtures + results
- Club profiles (squad, history, matches)
- Player profiles (career, current club, biography from Wikipedia)
- Match detail pages
- Country pages (national team + leagues)
- Full-text search (Pagefind, client-side)

**What we are NOT building (ücretsiz veriyle imkânsız):**
- Market values
- Real-time transfer rumors
- News articles
- Live scores
- Forum / community

Kullanıcıya gerçekçi konumlanma: "stats and history" sitesi, "valuations" sitesi değil.

---

## 2. TECH STACK

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Astro 5** | Best SSG for content-heavy programmatic sites |
| Styling | **Tailwind CSS v4** | Standard |
| Language | **TypeScript (strict)** | |
| Search | **Pagefind** | Static, client-side, no backend |
| Build | **GitHub Actions** | Conserve Netlify free-tier minutes (önemli) |
| Hosting | **Netlify** | Hosting only — NO build on Netlify |
| Images | **Sharp** via Astro Assets | |
| Sitemap | **@astrojs/sitemap** | Split sitemaps |

---

## 3. DATA SOURCES (all free)

### Primary: OpenFootball
- GitHub org: https://github.com/openfootball
- Key repos:
  - `football.json` — generic matches/teams JSON
  - `england` — Premier League seasons (going back decades)
  - `deutschland` — Bundesliga
  - `espana` — La Liga
  - `italy` — Serie A
  - `france` — Ligue 1
  - `champions-league` — UCL
  - `world-cup` — World Cup history
  - `euro` — Euros
- Format: JSON files per season. We clone repos at build time and parse.

### Secondary: TheSportsDB
- Base URL: `https://www.thesportsdb.com/api/v1/json/3/` (free tier key = `3`)
- Endpoints we'll use:
  - `searchteams.php?t={team}` → team logo, stadium, founded
  - `searchplayers.php?p={player}` → player photo, position, nationality
  - `lookupteam.php?id={id}` → full team detail
- Rate limit: gentle, but we cache aggressively (one fetch, save to `data/raw/sportsdb/`, never refetch unless missing)

### Tertiary: Wikidata SPARQL
- Endpoint: `https://query.wikidata.org/sparql`
- For player bios and club histories (English Wikipedia abstracts via Wikidata `P31`, `P54`, etc.)
- Rate limit: be polite (1 req/sec), include User-Agent

### Optional later: football-data.org
- Free tier: 10 req/min, limited competitions
- Use only if we need current-season live standings (probably skip for v1)

---

## 4. URL STRUCTURE

```
/                                       Homepage
/leagues/                               All leagues index
/leagues/[slug]/                        League landing (current season)
/leagues/[slug]/[season]/               Season overview (e.g. /leagues/premier-league/2023-24/)
/leagues/[slug]/[season]/table          Standings
/leagues/[slug]/[season]/fixtures       All matches that season
/leagues/[slug]/all-time                All-time table
/clubs/                                 All clubs (paginated A-Z)
/clubs/[slug]/                          Club profile
/clubs/[slug]/squad                     Current squad
/clubs/[slug]/history                   Season-by-season history
/clubs/[slug]/matches                   Recent matches
/players/                               Players index (paginated A-Z)
/players/[slug]/                        Player profile
/matches/[id]                           Match detail
/countries/                             Countries index
/countries/[slug]                       Country (national team + domestic leagues)
/seasons/[year]                         Cross-league season overview
/search                                 Search page (Pagefind UI)
/about                                  About + data sources + disclaimers
```

---

## 5. FOLDER STRUCTURE

```
indexfootball/
├── .github/
│   └── workflows/
│       └── build-deploy.yml
├── data/
│   ├── raw/                          # gitignored - fetched at build time
│   │   ├── openfootball/
│   │   ├── sportsdb/
│   │   └── wikidata/
│   ├── processed/                    # gitignored - normalized JSONs
│   │   ├── leagues.json
│   │   ├── clubs.json
│   │   ├── players.json
│   │   ├── matches.json
│   │   └── countries.json
│   └── seed/                         # committed - small sample data for local dev
│       └── premier-league-2024-25.json
├── scripts/
│   ├── fetch-openfootball.ts
│   ├── fetch-sportsdb.ts
│   ├── fetch-wikidata.ts
│   ├── process-data.ts               # normalize + dedupe + link entities
│   ├── generate-slugs.ts
│   └── lib/
│       ├── slugify.ts
│       ├── http.ts                   # retry + cache helper
│       └── normalize.ts
├── src/
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── EntityLayout.astro        # shared club/player/league shell
│   ├── components/
│   │   ├── nav/
│   │   │   ├── Header.astro
│   │   │   └── Footer.astro
│   │   ├── tables/
│   │   │   ├── StandingsTable.astro
│   │   │   ├── FixturesTable.astro
│   │   │   └── SquadTable.astro
│   │   ├── cards/
│   │   │   ├── PlayerCard.astro
│   │   │   ├── ClubCard.astro
│   │   │   └── MatchCard.astro
│   │   ├── seo/
│   │   │   ├── JsonLd.astro
│   │   │   └── Breadcrumbs.astro
│   │   └── ui/
│   │       ├── Flag.astro             # country flag from ISO code
│   │       └── Logo.astro             # club logo with fallback
│   ├── pages/
│   │   ├── index.astro
│   │   ├── leagues/
│   │   ├── clubs/
│   │   ├── players/
│   │   ├── matches/
│   │   ├── countries/
│   │   ├── seasons/
│   │   ├── search.astro
│   │   ├── about.astro
│   │   └── 404.astro
│   ├── lib/
│   │   ├── data.ts                    # load processed JSONs
│   │   ├── standings.ts               # compute table from matches
│   │   ├── seo.ts                     # meta + JSON-LD builders
│   │   └── format.ts                  # date, score formatting
│   └── styles/
│       └── global.css
├── public/
│   ├── robots.txt
│   ├── favicon.svg
│   └── images/
│       ├── clubs/                     # cached logos
│       └── players/                   # cached photos
├── astro.config.mjs
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── netlify.toml
├── .gitignore
└── README.md
```

---

## 6. BUILD PIPELINE (CRITICAL — GitHub Actions, not Netlify)

`.github/workflows/build-deploy.yml`:

```yaml
name: Build & Deploy
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 4 * * 1'   # weekly refresh on Monday 04:00 UTC
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Cache processed data
        uses: actions/cache@v4
        with:
          path: data/processed
          key: data-${{ hashFiles('scripts/**', 'data/raw/**') }}

      - name: Fetch data
        run: npm run fetch:all
        env:
          SPORTSDB_KEY: ${{ secrets.SPORTSDB_KEY }}   # '3' is fine for free

      - name: Process data
        run: npm run process

      - name: Build Astro
        run: npm run build

      - name: Pagefind index
        run: npx pagefind --site dist

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: ./dist
          production-deploy: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

`netlify.toml`:
```toml
[build]
publish = "dist"
# NO command — GitHub Actions deploys via API

[[redirects]]
from = "/*"
status = 404
```

---

## 7. PHASED EXECUTION PLAN

**Do not try to build everything in one go.** Execute phases sequentially. After each phase, stop and let me commit + verify before moving on.

### Phase 1 — Skeleton (this is what you start with)
1. `npm create astro@latest . --template minimal --typescript strict --no-install --no-git`
2. Install deps:
   ```
   npm i -D @astrojs/tailwind tailwindcss @astrojs/sitemap @astrojs/check sharp
   npm i pagefind
   ```
3. Configure `astro.config.mjs` with tailwind + sitemap integrations.
4. Create the full folder tree from §5.
5. `BaseLayout.astro`: header (logo "IndexFootball", nav: Leagues / Clubs / Players / Search / About), main slot, footer (data attribution to OpenFootball, TheSportsDB, Wikidata).
6. `src/pages/index.astro`: temporary "IndexFootball — coming soon. The free football encyclopedia." with hero + 3-column "What you'll find" placeholder.
7. `.gitignore`: `node_modules/`, `dist/`, `data/raw/`, `data/processed/`, `.astro/`, `.netlify/`.
8. `.github/workflows/build-deploy.yml` per §6.
9. `netlify.toml` per §6.
10. `README.md` with setup, data source attribution, how to run locally (`npm run dev` with seed data).

**STOP after Phase 1.** I will commit + connect Netlify + verify deploy.

### Phase 2 — Data pipeline (one league, one season)
Start narrow. Pick **Premier League 2024-25** as the proving ground.

1. `scripts/fetch-openfootball.ts`:
   - Clone `https://github.com/openfootball/england` into `data/raw/openfootball/england/` (use `git clone --depth=1` via shelljs or simple-git).
   - Find `2024-25/en.1.json` (or whatever the current naming convention is — adapt).
2. `scripts/process-data.ts`:
   - Parse the file into normalized entities:
     - **leagues.json**: `{ id, slug, name, country, tier, seasons[] }`
     - **clubs.json**: `{ id, slug, name, country, founded, league_ids[] }`
     - **matches.json**: `{ id, date, home_club_id, away_club_id, score: {ht, ft}, league_id, season }`
   - Use deterministic slug generation (`scripts/lib/slugify.ts`).
3. `src/lib/data.ts`: typed loaders that read processed JSONs.
4. `src/lib/standings.ts`: pure function `computeStandings(matches, clubs) → Standing[]` with P/W/D/L/GF/GA/GD/Pts.
5. Add a temporary debug page `/debug` that prints league + match counts to verify the pipeline.

**STOP after Phase 2.**

### Phase 3 — League & match pages
1. `/leagues/[slug]/[season]/table` — `StandingsTable.astro` component, computed at build.
2. `/leagues/[slug]/[season]/fixtures` — chronological list, grouped by matchday.
3. `/leagues/[slug]/[season]/` — landing with table preview + recent results + top scorers (if data available).
4. `/matches/[id]` — match detail (date, venue if available, score, lineups if available — likely not from OpenFootball, so skip lineups for v1).
5. SEO meta on each: unique title + description templates per §9.

**STOP after Phase 3.**

### Phase 4 — Club pages
1. `/clubs/[slug]/` — overview (country, founded, league, recent results, current squad placeholder).
2. `/clubs/[slug]/squad` — current squad (will be sparse for v1 — OK).
3. `/clubs/[slug]/history` — season-by-season league + finish position.
4. `/clubs/[slug]/matches` — paginated recent matches.
5. Fetch + cache logos from TheSportsDB during data processing. Save as `public/images/clubs/[slug].png`. Fall back to initials-on-color if missing.

**STOP after Phase 4.**

### Phase 5 — Player pages
1. Extract player list from match data where lineups exist (OpenFootball lineup data is partial — work with what we have).
2. `/players/` — paginated A-Z index.
3. `/players/[slug]/` — name, DOB, nationality, position, current club, career mini-table.
4. Fetch Wikipedia abstract via Wikidata SPARQL (cache forever — these don't change).
5. Player photo from TheSportsDB (cache to `public/images/players/`).

**STOP after Phase 5.**

### Phase 6 — Scale to more leagues + seasons
Same pipeline, more sources:
- Bundesliga, La Liga, Serie A, Ligue 1
- UCL, UEL
- 10–20 historical seasons each
- Country pages, season cross-league pages

### Phase 7 — SEO + Search + Polish
1. **Sitemaps split** by entity type:
   - `/sitemap-index.xml`
   - `/sitemap-leagues.xml`
   - `/sitemap-clubs.xml`
   - `/sitemap-players.xml`
   - `/sitemap-matches.xml`
2. **JSON-LD on every page** (see §9).
3. **Pagefind** indexing in CI, search UI on `/search`.
4. **OpenGraph + Twitter cards** with dynamic OG images (use Astro's `@vercel/og` or `satori` — generate at build, save to `/og/`).
5. **Dark mode** toggle (Tailwind `dark:` + localStorage).
6. **404 page** with search box.
7. **Lighthouse check**: target 95+ on Performance, SEO, Best Practices, Accessibility.

---

## 8. KEY COMPONENT SPECS

### `StandingsTable.astro`
- Props: `matches: Match[]`, `clubs: Club[]`, `season: string`
- Computes: position, P, W, D, L, GF, GA, GD, Pts
- Header row sticky on scroll
- Columns: # | Club (logo + name, link to club page) | P | W | D | L | GF | GA | GD | Pts | Form (last 5)
- Mobile: hide GF/GA, keep GD/Pts/Form

### `MatchCard.astro`
- Props: `match: Match`
- Layout: `[date]  [home logo] [home name]   [score]   [away name] [away logo]  [league badge]`
- Clickable, goes to `/matches/[id]`

### `PlayerCard.astro`
- Props: `player: Player`
- Photo (or initials placeholder) | Name | Nationality flag | Position | Age | Current club logo+name

### `EntityLayout.astro`
Shared shell used by club / player / league profile pages:
- Hero strip (image + name + key facts pills)
- Tabbed nav (Overview / Squad / History / Matches — varies per entity type)
- `<slot />` for the active tab content
- Breadcrumbs at top

---

## 9. SEO REQUIREMENTS

### Unique meta per page (templates)

| Page | Title template | Description template |
|---|---|---|
| League season | `{League} {Season} Table, Fixtures & Results - IndexFootball` | `{League} {Season} — full standings, fixtures, results and stats. {N} clubs, {N} matches.` |
| Club | `{Club} - Squad, History & Stats - IndexFootball` | `{Club}, {Country} football club founded {Year}, plays in {League}. Squad, season history, recent matches.` |
| Player | `{Name} - Career, Stats & Biography - IndexFootball` | `{Name}, {Nationality} {Position} born {DOB}, plays for {Club}. Career stats, biography, and match history.` |
| Match | `{Home} {Score} {Away} - {Date} - {League} - IndexFootball` | `{Home} vs {Away} on {Date} in {League} {Season}. Final score {Score}. Match details, lineups, and stats.` |

### JSON-LD per page type
- **Club** → `SportsTeam` (name, sport: "Soccer", logo, foundingDate, location, memberOf)
- **Player** → `Person` (name, nationality, birthDate, jobTitle: "Footballer", affiliation: SportsTeam)
- **Match** → `SportsEvent` (name, startDate, homeTeam, awayTeam, location.venue, competitor)
- **League season** → `SportsOrganization` + `ItemList` of clubs
- All pages → `BreadcrumbList`

### Internal linking density
Every page must link to:
- The country it belongs to
- The league(s) involved
- Related entities (player → club → league → country)
Target: 15–30 internal links per content page.

### Pagination strategy
Prefer **single-page indices with client-side filtering** for entity lists where possible (<5000 items), to avoid pagination SEO headaches. For 5000+ players, paginate by first letter (`/players/a/`, `/players/b/` …) with proper canonicals.

---

## 10. GOVERNANCE / LEGAL

- Add `/about` page citing all data sources with links.
- Footer attribution: "Data: OpenFootball (CC BY), TheSportsDB, Wikidata. Logos and photos belong to their respective owners."
- `robots.txt`: allow all, link sitemap index.
- No user-generated content, no comments, no auth — keeps it simple and legally clean.

---

## 11. START COMMAND FOR CLAUDE CODE

Paste this as the first message to Claude Code (after putting this spec in the repo as `PROJECT_SPEC.md`):

> Read `PROJECT_SPEC.md`. Execute **Phase 1 only**. Initialize an Astro 5 minimal+TS-strict project in the current directory, install all listed dependencies, create the full folder structure from §5, write `BaseLayout.astro` + `Header.astro` + `Footer.astro` per §8, write a placeholder homepage, create the GitHub Actions workflow and `netlify.toml` per §6, create a thorough `.gitignore` and `README.md`. **Stop after Phase 1.** Do not start the data pipeline yet. Confirm what you created and wait for my approval before moving to Phase 2.

---

## 12. NOTES TO SELF (İLKAY)

- Domain alımı: indexfootball.com Namecheap'ten kontrol et. .com yoksa .football TLD'si de iyi olabilir.
- Netlify site ID + auth token GitHub secrets'a eklenecek (her zamanki gibi).
- Adsense başvurusu için en az 30–40 kaliteli sayfa + privacy policy + terms + about gerekecek — Faz 3 sonunda yapabilirsin.
- OpenFootball verisinin lineup/transfer detayı sınırlı. Player data zenginleştirme için ileride **Wikipedia kategori scraping** (örn. "Category:Premier League players") düşünülebilir — manuel JSON listeleri olarak.
- Ad gelir hedefi: yarinhava ile aynı patern — organik trafik 3-6 ayda binmeye başlar.
