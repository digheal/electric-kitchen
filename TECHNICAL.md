# Technical reference

## Contents

1. Architecture
2. Repository layout
3. Configuration
4. Data model
5. Authentication
6. Authorization
7. Core workflows
8. Security controls
9. Rate limits and input bounds
10. Performance
11. Background jobs
12. Data retention
13. Deployment and schema changes
14. Testing
15. Known limitations and accepted risks
16. Audit guide

## 1. Architecture

The site is a set of static pages built by Astro (`astro.config.mjs`, `output: 'static'`) plus one Cloudflare Worker (`src/worker/index.ts`). The Worker serves the built files from `dist/` through the `ASSETS` binding and answers `/api/*` itself. `wrangler.jsonc` sets `run_worker_first: ["/api/*"]`, so every other path is served straight from static files without running Worker code.

Pages load data in the browser by calling the JSON API (`fetchKitchens` in `src/lib/shared.ts`). The Worker reads from Cloudflare D1 (binding `DB`) through the functions in `src/lib/server/data.ts`. An R2 bucket is bound as `PHOTOS` and is only touched by the health check.

### Routes

| Method and path | Handler | Notes |
| --- | --- | --- |
| `GET /api/health` | `fetch` in `src/worker/index.ts`, `pingDatabase` in `src/lib/server/data.ts` | Returns `{ ok, db, photos }`. Sent with `cache-control: no-store`. |
| `GET /api/kitchens` | `listKitchens` in `src/lib/server/data.ts` | Query parameters `q`, `type`, `state`, `city`, `equipment`, `sort` (see `kitchenQuery` in `src/lib/rules.ts`). Approved rows only, at most `MAX_RESULTS` (500). |
| `GET /api/kitchens/:id` | `getKitchen` in `src/lib/server/data.ts` | `:id` must match `\d+`. Returns 404 JSON when the row is missing or not approved. |
| Any other `/api/*` | `fetch` in `src/worker/index.ts` | 404 JSON, `no-store`. |
| `/` | `src/pages/index.astro` | Globe and newest additions. |
| `/browse/` | `src/pages/browse/index.astro` | Search and filters. |
| `/kitchen/?id=N` | `src/pages/kitchen/index.astro` | One kitchen. |

`GET` and `HEAD` are the only methods the API handles. Successful API responses carry `cache-control: public, max-age=30` (`json` in `src/worker/index.ts`).

## 2. Repository layout

| Path | Contents |
| --- | --- |
| `src/worker/index.ts` | Worker entry point and router. No database calls. |
| `src/lib/rules.ts` | Pure rules: `PUBLIC_COLUMNS`, `MAX_RESULTS`, `kitchenQuery`, `escapeLike`, `shapeKitchen`. |
| `src/lib/server/data.ts` | All database reads. |
| `src/lib/server/env.ts` | `Env`, the Worker binding types. |
| `src/lib/shared.ts` | Browser helpers and the `Kitchen` type: `fetchKitchens`, `place`, `el`, `kitchenCard`, `KITCHEN_TYPES`, `EQUIPMENT`. |
| `src/pages/` | Astro pages (this project's equivalent of `src/app/`). |
| `src/layouts/Base.astro` | Shared page shell and global CSS. |
| `src/scripts/map.ts`, `src/scripts/grid.ts` | Client scripts for maps and the hero animation. |
| `migrations/` | Numbered D1 migrations, applied by Wrangler. |
| `scripts/` | `copy-maplibre-worker.mjs` (runs before build and dev), `check-secrets.mjs`. |
| `tests/` | One Vitest file per lib module, plus `db-boundary.test.ts`. |
| `.github/` | CI workflow and Dependabot config. |

There is no `src/components/` folder because no shared Astro components exist yet. Card markup is built in `kitchenCard` in `src/lib/shared.ts`.

`src/lib/server/` holds code that needs Worker types. It is excluded from the Astro typecheck (`tsconfig.json`) and included in the Worker typecheck (`src/worker/tsconfig.json`).

## 3. Configuration

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Worker name `electric-kitchen`, entry `src/worker/index.ts`, `compatibility_date` 2026-10-29, assets from `./dist` with `not_found_handling: "404-page"`, D1 binding `DB` (database `electric-kitchen-db`), R2 binding `PHOTOS` (bucket `electric-kitchen-photos`), observability on. |
| `astro.config.mjs` | Static output. |
| `.node-version` | Node 22.22.0, used by Cloudflare builds and CI. |
| `package.json` | Scripts (see AGENTS.md "Commands"). `engines.node` is `>=22.22.0`. |
| `.dev.vars.example` | Every Worker secret name with an empty value. Copy to `.dev.vars` for local work. |
| `tsconfig.json`, `src/worker/tsconfig.json` | Browser side and Worker side typechecks. |

Secrets reserved for planned features: `ADMIN_PASSWORD`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY` (`.dev.vars.example`). No code reads them yet.

## 4. Data model

One table, `kitchens` (`migrations/0001_init.sql`).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER PK | Autoincrement. |
| `name`, `kitchen_type`, `city`, `region`, `country` | TEXT NOT NULL | `kitchen_type` values are listed in `KITCHEN_TYPES` (`src/lib/shared.ts`). The database does not enforce them. |
| `street_address` | TEXT | Optional. |
| `lat`, `lng` | REAL | Optional. Rows without them get no map pin. |
| `equipment` | TEXT NOT NULL, default `'[]'` | JSON array of strings, normally from `EQUIPMENT`. Returned as a list by `shapeKitchen`. |
| `equipment_other` | TEXT | Free text. |
| `website` | TEXT | Rendered as a link only when it starts with `http://` or `https://` (`src/pages/kitchen/index.astro`). |
| `photo_key` | TEXT | Intended R2 key. Unused. |
| `year_electric` | INTEGER | Year the kitchen went electric. |
| `build_type` | TEXT NOT NULL, default `'unknown'` | `new build`, `converted` or `unknown`. |
| `notes` | TEXT | Shown on the detail page. Research entries name their source here. |
| `relationship` | TEXT | Submitter's relationship to the kitchen. Not public. |
| `submitter_name`, `submitter_email` | TEXT | Private. Never selected by public queries. |
| `status` | TEXT NOT NULL, default `'pending'` | `pending`, `approved` or `rejected`. Only `approved` is public. |
| `submitted_at` | TEXT | Default `datetime('now')`, UTC. |
| `approved_at` | TEXT | UTC. Drives the default "newest" sort. |

Index: `idx_kitchens_status (status, approved_at)`.

Data files: `0002_sample_kitchens.sql` (five fake rows, approved), `0003_california_kitchens.sql` (two approved, five pending).

## 5. Authentication

None. Every route is public and read only. TODO: the admin area is planned and its auth method is not chosen (see ROADMAP.md).

## 6. Authorization

The only access rule is that public queries return approved rows only (`kitchenQuery` in `src/lib/rules.ts`, `getKitchen` in `src/lib/server/data.ts`). Changing a row's `status` requires direct database access through Wrangler (`wrangler d1 execute DB --remote`), which is limited to people with access to the Cloudflare account.

## 7. Core workflows

### 7.1 Home globe

`src/pages/index.astro` calls `fetchKitchens()`, shows the count, starts `startGrid` (`src/scripts/grid.ts`) and `showGlobe` (`src/scripts/map.ts`), fills the button rail with every kitchen that has coordinates, and lists the six newest as cards. `showGlobe` adds pins (`addPins`), spins slowly (`spinGlobe`) and flies to a kitchen with a popup (`popupFor`) on click. The spin and the grid animation start paused when the visitor prefers reduced motion, and the pause button controls both.

### 7.2 Map tiles

`createMap` in `src/scripts/map.ts` builds the style inline. The globe uses NASA GIBS Blue Marble tiles up to zoom 8, with OpenStreetMap tiles fading in from zoom 4.5. If a GIBS tile request fails, it switches to OpenStreetMap at every zoom. Flat maps on the detail page use OpenStreetMap only. Scroll zoom is off. Cooperative gestures (two fingers to pan) turn on for coarse pointers. MapLibre's worker files are copied to `public/maplibre/` by `scripts/copy-maplibre-worker.mjs` and loaded through `setWorkerUrl`.

### 7.3 Browse and filter

`src/pages/browse/index.astro` reads the filter form into query parameters and calls `fetchKitchens(params)`, debounced by 250 ms on input. The region dropdown is filled from a separate unfiltered fetch (`fillRegions`). The server side filter logic is `kitchenQuery` in `src/lib/rules.ts`.

### 7.4 Kitchen detail

`src/pages/kitchen/index.astro` reads `id` from the query string, checks it against `^\d+$`, fetches `/api/kitchens/:id`, and renders facts, equipment, notes and a small map (`showKitchenMap`).

### 7.5 Adding and approving kitchens

There is no submission form or admin screen. Kitchens are added by new migration files (as in `0003_california_kitchens.sql`) or by SQL run through Wrangler. A row becomes public when `status` is `approved`.

## 8. Security controls

1. Public column allow list: `PUBLIC_COLUMNS` in `src/lib/rules.ts`. Tested in `tests/rules.test.ts` and `tests/data.test.ts`.
2. Approved only: `kitchenQuery` always starts with `status = 'approved'`. `getKitchen` filters the same way.
3. Bound parameters for every value (`listKitchens`, `getKitchen`). LIKE wildcards escaped by `escapeLike`.
4. Database boundary: only `src/lib/` touches `env.DB` (`tests/db-boundary.test.ts`).
5. DOM output through `el` (`src/lib/shared.ts`), which uses `setAttribute` and text nodes only. Map popups use `setDOMContent` with the same helper.
6. Website links restricted to `http` and `https`, with `rel="noopener noreferrer"` (`src/pages/kitchen/index.astro`).
7. No secrets in the repository. `scripts/check-secrets.mjs` scans `dist/` in CI. `.gitignore` excludes `.dev.vars` and `.env` files.
8. CI actions pinned to commit hashes, with `persist-credentials: false` and read only permissions (`.github/workflows/test.yml`).
9. `npm audit --audit-level=high` runs in CI.

## 9. Rate limits and input bounds

1. No rate limiting on any route. TODO: decide whether Cloudflare rules are needed (see ROADMAP.md).
2. List responses are capped at `MAX_RESULTS` (500) rows.
3. `:id` must be digits only (router regex in `src/worker/index.ts`).
4. The `q` search text has no length limit.

## 10. Performance

1. Pages are static files served from Cloudflare's edge.
2. API responses are cacheable for 30 seconds.
3. The default list order uses `idx_kitchens_status`.
4. The equipment filter scans `json_each(equipment)` per row. Fine at current size.
5. The browse page makes two list requests on load (`fillRegions` and `load`).
6. Map tiles come from third parties (NASA GIBS, OpenStreetMap).

## 11. Background jobs

None.

## 12. Data retention

No retention policy is defined and nothing is deleted automatically. TODO: decide how long rejected rows and submitter contact details are kept once submissions exist.

## 13. Deployment and schema changes

Cloudflare Workers Builds runs `npm run deploy` on every push to `main`: `astro build`, then `wrangler d1 migrations apply DB --remote`, then `wrangler deploy` (`package.json`). Wrangler records applied migrations in the database's `d1_migrations` table and only runs new files.

Migrations run before the new Worker is published, so the old Worker briefly runs against the new schema. Schema changes must stay compatible with the code already live (add columns, do not rename or drop them in the same release). Never edit a migration after it has run. Full steps are in DEPLOY.md.

## 14. Testing

Vitest (`npm test`), files in `tests/`:

| File | Covers |
| --- | --- |
| `tests/rules.test.ts` | `kitchenQuery`, `escapeLike`, `PUBLIC_COLUMNS`, `shapeKitchen`. |
| `tests/data.test.ts` | `listKitchens`, `getKitchen`, `pingDatabase` against a fake D1 binding. |
| `tests/shared.test.ts` | `place`, `fetchKitchens`. |
| `tests/db-boundary.test.ts` | Fails if any file under `src/` outside `src/lib/` uses `env.DB`, `D1Database` or `.prepare(`. |

CI (`.github/workflows/test.yml`, job name **Tests**) runs `npm ci`, tests, typecheck, build, the secret scan and `npm audit` on every pull request and every push to `main`, except when only `.md` files changed.

Not covered by automated tests: `el` and `kitchenCard` (need a DOM), the Astro pages, the map and grid scripts, and the router in `src/worker/index.ts`. Check those by running `npm run preview`.

## 15. Known limitations and accepted risks

1. Five fake sample kitchens (`0002_sample_kitchens.sql`) are live and approved.
2. Five California rows are pending because their gas status is unconfirmed. Three approved or pending rows have city center coordinates instead of a street address.
3. No submission form, admin area or authentication.
4. No rate limiting and no length limit on search text.
5. No security headers (CSP and others) are set on static pages.
6. `not_found_handling` is `404-page`, but no `404.astro` page exists, so unknown paths get a bare 404.
7. The R2 bucket and `photo_key` column are unused.
8. A list over 500 approved kitchens would be cut off on the globe and browse pages.
9. The OpenStreetMap tile server has a usage policy that does not allow heavy traffic. TODO: pick a tile provider before launch traffic.
10. Test files are not typechecked by `npm run check`.
11. Pull requests that change only `.md` files skip the Tests check. If that check is made required in branch protection, such pull requests cannot merge.
12. Docs dates and CHANGELOG hashes before 2026-10-31 were reconstructed from git history.
13. The "Workers Builds: electric-kitchen" check fails within a second on pull request branches, before any build step runs. Production builds from `main` work. The cause is in the Cloudflare build settings for non production branches and is not visible from the repository.

## 16. Audit guide

To review this project quickly:

1. Start with `src/worker/index.ts`. Every route is in one `fetch` function.
2. Check that every database call is in `src/lib/server/data.ts` and that each query uses `PUBLIC_COLUMNS` and `status = 'approved'`.
3. Read `src/lib/rules.ts` for filter logic and `tests/rules.test.ts` for what is guaranteed.
4. Search the pages and scripts for `innerHTML` (there should be none) and confirm data goes through `el`.
5. Check `migrations/` against DEPLOY.md section 8 "Migrations applied".
6. Run `npm test`, `npm run check`, `npm run build` and `npm run check:secrets`.
7. Confirm nothing in the repository holds a secret value.
