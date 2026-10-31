# Changelog

Newest first. Each entry names the commit, who asked and why, what changed and any SQL file to run.

## 2026-10-31

### Repository structure and working rules `TODO-hash`

Owner asked to organize this repository the same way as their Kachori Chhori project, with agent rules, docs, tests and CI.

1. Added: AGENTS.md, CLAUDE.md, CODING-GUIDELINES.md, TECHNICAL.md, DEPLOY.md, ROADMAP.md and this changelog.
2. Added: Vitest tests in `tests/`, including a check that only `src/lib/` touches the database.
3. Added: CI workflow (`.github/workflows/test.yml`), Dependabot, `scripts/check-secrets.mjs`, `.dev.vars.example`.
4. Changed: database reads moved from `src/worker/index.ts` into `src/lib/server/data.ts`, and filter rules into `src/lib/rules.ts`. API behavior is unchanged.
5. Changed: README rewritten as a plain language overview.

**Database**: none.

### Add researched California all-electric kitchens `b92e25c`

Owner asked to add restaurants found through news research that deliberately cook without gas.

1. Added: Flour + Water Pizzeria (Oakland) and Shoreside Restaurant & Bar (Santa Monica), approved.
2. Added: ONE65, Chez Panisse, Gwen, Prubechu and Little Sheep Mongolian Hot Pot, pending until confirmed.

**Database**: `migrations/0003_california_kitchens.sql`.

### Half-globe layout, two-finger map gestures on phones, animated grid dots `ddd954b`

Owner asked for design changes to the home page. TODO: reason not recorded.

1. Changed: the globe sits to the right so about half shows beside the text card.
2. Added: two finger map gestures on touch screens, so one finger scrolls the page.
3. Added: animated dots on the hero grid (`src/scripts/grid.ts`).

**Database**: none.

### Tighter hero grid `c2470cb`

Owner asked for design changes to the home page. TODO: reason not recorded.

1. Changed: smaller hero grid spacing.

**Database**: none.

### Light hero with fading grid, NASA satellite globe with street fallback `29bf01f`

Owner asked for design changes to the home page. TODO: reason not recorded.

1. Changed: light hero background with a grid that fades toward the edges.
2. Added: NASA GIBS satellite imagery on the globe, with OpenStreetMap as fallback.

**Database**: none.

### Globe-first home page, MapLibre maps, modern site styling `638fb78`

Owner asked for a globe on the home page. TODO: reason not recorded.

1. Added: MapLibre globe on the home page and small maps on kitchen pages.
2. Changed: site wide styling.

**Database**: none.

## 2026-10-29

### Phase 2: database schema, public API, Home, Browse and Detail pages, map `b6f09bc`

Owner asked for the first working version of the site.

1. Added: `kitchens` table and five fake sample kitchens.
2. Added: `GET /api/kitchens`, `GET /api/kitchens/:id`, `GET /api/health`.
3. Added: Home, Browse and Kitchen detail pages.

**Database**: `migrations/0001_init.sql`, `migrations/0002_sample_kitchens.sql`.

### Pin Node 22.22 for Cloudflare builds `eaae435`

Cloudflare builds needed a fixed Node version.

1. Added: `.node-version` and `engines.node` in `package.json`.

**Database**: none.

### Phase 1: Astro site and Cloudflare Worker foundation `bdc7e96`

Owner asked for the project foundation.

1. Added: Astro static site, Cloudflare Worker, D1 and R2 bindings.

**Database**: none.
