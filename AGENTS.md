# AGENTS.md

All-Electric Kitchens is a public website that lists commercial kitchens (restaurants, cafes, schools, hospitals and others) that cook without gas. Visitors browse the list on a globe, filter it, and read about each kitchen. Listings are reviewed before they appear. TODO: who runs the site and who the main audience is (owner to confirm).

Doc files:

1. **AGENTS.md** (this file). Rules and current state for any AI agent working here.
2. **CODING-GUIDELINES.md**. How to approach a change.
3. **CLAUDE.md**. Loads the two files above for Claude Code. Do not add content to it.
4. **README.md**. Plain language overview for people.
5. **TECHNICAL.md**. Technical reference with file and function references.
6. **DEPLOY.md**. Deployment runbook. Section 8 records what is actually set in production.
7. **ROADMAP.md**. Planned work, open questions and decisions already made.
8. **CHANGELOG.md**. What changed, newest first.

## Start here

Read in this order at the start of a session:

1. This file.
2. The top three entries of CHANGELOG.md.
3. TECHNICAL.md "Known limitations and accepted risks".
4. TECHNICAL.md "Audit guide".
5. DEPLOY.md section 8 "Production configuration reference".
6. ROADMAP.md.

The code in the repository is the source of truth.

## Current state (update when this changes)

1. **2026-10-29** Foundation. Astro builds static pages into `dist/` (`astro.config.mjs`). One Cloudflare Worker (`src/worker/index.ts`) serves them and answers `/api/*`. Bindings are in `wrangler.jsonc`. Node is pinned in `.node-version`.
2. **2026-10-29** Data model. One `kitchens` table (`migrations/0001_init.sql`). Five fake sample kitchens (`migrations/0002_sample_kitchens.sql`) are still live and must go before launch.
3. **2026-10-29** Public read API. `GET /api/kitchens` (`listKitchens` in `src/lib/server/data.ts`, filters built by `kitchenQuery` in `src/lib/rules.ts`), `GET /api/kitchens/:id` (`getKitchen`) and `GET /api/health` (`pingDatabase` plus an R2 list).
4. **2026-10-29** Browse page (`src/pages/browse/index.astro`) with search, type, region, equipment and sort filters. Kitchen detail page (`src/pages/kitchen/index.astro`, `?id=`). Both fetch through `fetchKitchens` and render with `el` and `kitchenCard` in `src/lib/shared.ts`.
5. **2026-10-31** Home page globe (`src/pages/index.astro`). `showGlobe` and `showKitchenMap` in `src/scripts/map.ts` use MapLibre with NASA GIBS satellite tiles and an OpenStreetMap fallback. `startGrid` in `src/scripts/grid.ts` draws the animated hero grid. Two finger map gestures on touch screens.
6. **2026-10-31** First real data. Two approved and five pending California kitchens (`migrations/0003_california_kitchens.sql`).
7. **2026-11-01** Light and dark mode. Header button `#theme-toggle` in `src/layouts/Base.astro`, run by `setupThemeToggle` in `src/scripts/theme.ts`. An inline script in `<head>` sets `data-theme` before paint. The globe follows through `onThemeChange`.
8. **2026-10-31** Repository structure. Database calls moved into `src/lib/server/data.ts`. Pure rules in `src/lib/rules.ts`. Vitest tests in `tests/`. CI in `.github/workflows/test.yml`.

Migrations: the latest file is `0003_california_kitchens.sql`, applied in production on 2026-10-31 (see DEPLOY.md section 8). The next migration is **0004**.

## Stack

1. Astro 7, static output (`output: 'static'`).
2. Cloudflare Workers for hosting and the `/api/*` routes.
3. Cloudflare D1 (SQLite) for data, binding `DB`.
4. Cloudflare R2 for photos, binding `PHOTOS` (bound, not used by any feature yet).
5. MapLibre GL for maps.
6. TypeScript, Vitest, Node 22.22.0.
7. Deploys through Cloudflare Workers Builds on every push to `main`.

## Rules to keep

1. **Database calls live in `src/lib/server/` only.** Reads go in `data.ts`. Writes go in `data-writes.ts` (create it with the first write). Routes, pages and client scripts never touch `env.DB`. `tests/db-boundary.test.ts` fails if they do.
2. **Only public columns of approved rows leave the database.** Every public query selects `PUBLIC_COLUMNS` from `src/lib/rules.ts` and filters on `status = 'approved'`. `submitter_name` and `submitter_email` are never returned.
3. **Every protected route checks auth first.** Any future route under `/api/admin/` must verify the caller before it reads input or touches data. TODO: no protected routes exist yet, and the auth method is not chosen.
4. **Never trust the browser.** The server sets `status`, `approved_at`, `submitted_at` and `id`. New submissions always start as `pending`. Validate `kitchen_type` against `KITCHEN_TYPES` and equipment against `EQUIPMENT` on the server, not only in the form.
5. **Dates.** The database stores UTC text in SQLite `datetime('now')` format, `YYYY-MM-DD HH:MM:SS`. The browser converts it for display (see `src/pages/kitchen/index.astro`). Docs and the changelog use `YYYY-MM-DD`.
6. **Business rules live in `src/lib/rules.ts`** as pure functions with no database, network or DOM access, and each one has a test.
7. **Escape user text.** Pages build elements with `textContent` through `el` in `src/lib/shared.ts`. Never use `innerHTML` with data. Any future email (Resend is planned) must HTML escape every user supplied value. Only `http` and `https` links are rendered as links.
8. **Bind every SQL value** with `.bind()`. Never build SQL from user text. Search text goes through `escapeLike`.
9. **Never edit a migration after it has run** anywhere. Add the next numbered file instead.
10. **Never write secret values into the repository.** This repo is public. Secrets live in Cloudflare as Worker secrets and locally in `.dev.vars`.

## Documentation

Update docs in the same commit as the change:

| Change | Update |
| --- | --- |
| Behavior, config, routes or schema | TECHNICAL.md |
| Settings, secrets, bindings or outside services | TECHNICAL.md and DEPLOY.md |
| Anything a user or the owner would notice | CHANGELOG.md entry |
| New SQL file | CHANGELOG.md "**Database**:" line, DEPLOY.md section 8 once applied, "Current state" above |
| A ROADMAP item ships | Remove it from ROADMAP.md and record it in CHANGELOG.md |
| Owner discusses or rejects an idea | Add it to ROADMAP.md ("Discussed and decided" when settled, with the reason) |
| Shipped feature or new migration | "Current state" in this file |
| Staff or admin screens | The staff guide page. TODO: there is no admin area yet. When one is built, add a plain language staff guide page and keep it current. |

## Concurrent contributors

1. Pull `main` before you start.
2. Work on your own branch. Never commit to `main` directly.
3. Open a pull request.
4. Wait for the **Tests** check to pass.
5. The owner merges, using a merge commit.
6. Never force push.
7. To catch up with `main`, merge `main` into your branch. Do not rebase.

## Commands

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Test | `npm test` |
| Typecheck | `npm run check` |
| Build | `npm run build` |
| Scan the build for secrets | `npm run check:secrets` (after build) |
| Preview locally | `npm run preview` (build plus `wrangler dev`) |
| Apply migrations locally | `npm run db:local` |
| Deploy | `npm run deploy`. Workers Builds runs this on every push to `main`. Do not run it by hand unless the owner asks. |

## Before you push

1. `npm test` passes.
2. `npm run check` is clean.
3. `npm run build` and `npm run check:secrets` pass.
4. TECHNICAL.md, DEPLOY.md, ROADMAP.md and this file are updated where the change needs it.
5. CHANGELOG.md has an entry, and any new SQL file is named on its "**Database**:" line.
6. No secret values anywhere in the diff.
