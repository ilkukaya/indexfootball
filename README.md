# IndexFootball

> The free football encyclopedia — players, clubs, leagues, matches and history.

IndexFootball is a 100% static site (programmatic SEO) covering the top European
leagues, UCL/UEL and ~20 seasons of history. It is a **stats and history**
reference, not a market-value or live-scores site — built entirely on free, open
data. Site language: **English only**.

Full product/architecture spec lives in [`PROJECT_SPEC.md`](./PROJECT_SPEC.md).

## Tech stack

| Layer     | Choice                          |
| --------- | ------------------------------- |
| Framework | Astro 5 (static output)         |
| Styling   | Tailwind CSS v4                 |
| Language  | TypeScript (strict)             |
| Search    | Pagefind (client-side)          |
| Build     | GitHub Actions                  |
| Hosting   | Netlify (hosting only, no build)|
| Images    | Sharp via Astro Assets          |
| Sitemap   | `@astrojs/sitemap` (split)      |

> **Tailwind note:** the project uses Tailwind **v4** via the `@tailwindcss/vite`
> plugin (configured in `astro.config.mjs`), not the older `@astrojs/tailwind`
> integration. Theme tokens are defined CSS-first in `src/styles/global.css`.

## Getting started

Requires Node.js 20+.

```sh
npm install
npm run dev      # local dev server at http://localhost:4321
```

| Command           | Action                                       |
| ----------------- | -------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start the local dev server                   |
| `npm run build`   | Build the production site to `./dist/`       |
| `npm run preview` | Preview the production build locally         |
| `npm run check`   | Type-check `.astro`/`.ts` with `astro check` |

### Local development data

For local development the site reads small, committed **seed** data from
`data/seed/` (e.g. `premier-league-2024-25.json`). The full dataset is fetched
and normalized at build time into `data/raw/` and `data/processed/`, both of
which are git-ignored. Data fetching/processing (`npm run fetch:all`,
`npm run process`) is implemented in Phase 2.

## Project structure

```text
indexfootball/
├── .github/workflows/build-deploy.yml   # CI build + Netlify deploy
├── data/
│   ├── raw/                             # gitignored — fetched at build time
│   ├── processed/                       # gitignored — normalized JSON
│   └── seed/                            # committed — sample data for local dev
├── scripts/                             # data pipeline (Phase 2+)
├── src/
│   ├── layouts/                         # BaseLayout, EntityLayout
│   ├── components/                      # nav, tables, cards, seo, ui
│   ├── pages/                           # routes (leagues, clubs, players, …)
│   ├── lib/                             # data loaders, standings, seo, format
│   └── styles/global.css                # Tailwind v4 + theme tokens
├── public/                              # robots.txt, favicon, cached images
├── astro.config.mjs
├── netlify.toml
└── PROJECT_SPEC.md
```

## Build & deploy

To conserve Netlify free-tier build minutes, **the site is built in GitHub
Actions and deployed to Netlify via the API** — Netlify itself runs no build
(`netlify.toml` has no build command). See
[`.github/workflows/build-deploy.yml`](./.github/workflows/build-deploy.yml).

The workflow runs on pushes to `main`, on a weekly cron (Mondays 04:00 UTC), and
manually via `workflow_dispatch`. Required GitHub repository secrets:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`
- `SPORTSDB_KEY` (the free-tier value `3` is fine)

## Data sources & attribution

- **[OpenFootball](https://github.com/openfootball)** — matches, teams and
  seasons (CC BY).
- **[TheSportsDB](https://www.thesportsdb.com)** — club/player logos, photos and
  metadata.
- **[Wikidata](https://www.wikidata.org)** — player bios and club histories.

Logos and photos belong to their respective owners. IndexFootball is an
independent, non-commercial reference project and is not affiliated with any
club, league or governing body.

## Roadmap

Development follows the phased plan in `PROJECT_SPEC.md` §7:

1. **Phase 1 — Skeleton** ✅ (this commit): Astro + Tailwind, layout, nav,
   placeholder homepage, CI workflow, Netlify config.
2. Phase 2 — Data pipeline (Premier League 2024-25 as the proving ground).
3. Phase 3 — League & match pages.
4. Phase 4 — Club pages.
5. Phase 5 — Player pages.
6. Phase 6 — Scale to more leagues + seasons.
7. Phase 7 — SEO, search, polish.
