# All-Electric Kitchens Tracker

A public website listing commercial kitchens that cook without gas.
Built with Astro and Cloudflare Workers (D1 database, R2 photo storage).

## Run locally

```bash
npm install
npm run preview
```

## Deploy

Pushes to `main` deploy through Cloudflare Workers Builds.
The deploy command is `npm run deploy`. It builds the site, applies any new
database migrations from `migrations/`, then publishes the Worker.

## Sample data

`migrations/0002_sample_kitchens.sql` adds five fake kitchens. Remove them before launch.

## Secrets

This repo is public. Never commit keys, passwords, or private emails.
Secrets (admin password, Resend key, Turnstile key) live in Cloudflare as
Worker secrets. For local work, put them in `.dev.vars`, which git ignores.
