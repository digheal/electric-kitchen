# Deployment runbook

Store only where each secret lives. Never write a secret value in this file or anywhere in the repository.

## 1. Prerequisites

1. Node 22.22.0 (`.node-version`).
2. `npm ci` to install dependencies, including Wrangler.
3. A Cloudflare account with access to the `electric-kitchen` Worker. TODO: name the account and who has access.
4. Write access to the GitHub repository `digheal/electric-kitchen`.

## 2. Cloudflare Workers and Workers Builds

1. The Worker is named `electric-kitchen` (`wrangler.jsonc`).
2. Workers Builds is connected to the GitHub repository and builds on every push to `main`.
3. Build settings: the deploy command is `npm run deploy`, which builds the site, applies new D1 migrations, then publishes the Worker. TODO: record the build command and any build variables set in the Workers Builds dashboard.
4. Pushes to other branches TODO: confirm whether Workers Builds creates preview versions for them.

## 3. Cloudflare D1

1. Database `electric-kitchen-db`, bound as `DB`. The database ID is in `wrangler.jsonc`. It is not a secret.
2. To create it from scratch: `npx wrangler d1 create electric-kitchen-db`, then put the new ID in `wrangler.jsonc`.
3. Migrations live in `migrations/` and are applied in number order by `wrangler d1 migrations apply DB --remote`, which runs inside `npm run deploy`.
4. To see what production has applied: `npx wrangler d1 migrations list DB --remote`.

## 4. Cloudflare R2

1. Bucket `electric-kitchen-photos`, bound as `PHOTOS`.
2. To create it: `npx wrangler r2 bucket create electric-kitchen-photos`.
3. No feature stores photos yet. The health check lists one object to prove the binding works.

## 5. Planned outside services

Not wired up yet. Fill in when each one is built.

1. Resend for email. Secret `RESEND_API_KEY`. TODO: sending domain and DNS records.
2. Cloudflare Turnstile for the submission form. Secret `TURNSTILE_SECRET_KEY`. TODO: site key and allowed hostnames.
3. Admin login. Secret `ADMIN_PASSWORD`. TODO: auth method not chosen.

## 6. Configuration

1. Non secret settings live in `wrangler.jsonc` and are deployed with the code.
2. Secrets are Worker secrets. Set one with `npx wrangler secret put NAME`. List names with `npx wrangler secret list`.
3. For local work, copy `.dev.vars.example` to `.dev.vars` and fill in values. `.dev.vars` is git ignored.
4. Any new setting must be added to `.dev.vars.example`, TECHNICAL.md "Configuration" and section 8 below in the same commit.

## 7. Verification and routine operations

### After a deploy

1. Open `/api/health`. Expect `{"ok":true,"db":true,"photos":true}`.
2. Open `/`, `/browse/` and one kitchen page. The globe should show pins and the list should load.
3. Run `npx wrangler d1 migrations list DB --remote` and update "Migrations applied" in section 8.

### Approve or hide a kitchen

1. Approve: `npx wrangler d1 execute DB --remote --command "UPDATE kitchens SET status='approved', approved_at=datetime('now') WHERE id=N"`.
2. Hide: set `status='rejected'` the same way.
3. For anything the owner should be able to repeat, prefer a new migration file so the change is in git.

### Logs

Observability is on (`wrangler.jsonc`). View logs in the Cloudflare dashboard, or live with `npx wrangler tail`.

### Roll back

Use the Worker's version history in the Cloudflare dashboard, or `npx wrangler rollback`. A rollback does not undo migrations. Fix schema problems with a new migration.

## 8. Production configuration reference

What is actually set in production. Update this whenever production changes.

| Item | Value |
| --- | --- |
| Worker | `electric-kitchen` |
| Public URL | TODO: production domain or workers.dev URL |
| Deploys from | `main`, through Cloudflare Workers Builds |
| Node version | 22.22.0 |
| D1 database | `electric-kitchen-db`, binding `DB` |
| R2 bucket | `electric-kitchen-photos`, binding `PHOTOS` |
| Observability | On |

### Secrets

| Name | Where it lives | Set in production? |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Cloudflare Worker secret | TODO: confirm |
| `RESEND_API_KEY` | Cloudflare Worker secret | TODO: confirm |
| `TURNSTILE_SECRET_KEY` | Cloudflare Worker secret | TODO: confirm |

### Migrations applied

Checked against the production `d1_migrations` table on 2026-11-01. Times are UTC.

1. `0001_init.sql`, applied 2026-10-31 04:48:24.
2. `0002_sample_kitchens.sql`, applied 2026-10-31 04:48:25.
3. `0003_california_kitchens.sql`, applied 2026-10-31 05:52:29.
