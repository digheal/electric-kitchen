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

## Secrets

This repo is public. Never commit keys, passwords, or private emails.
Secrets (admin password, Resend key, Turnstile key) live in Cloudflare as
Worker secrets. For local work, put them in `.dev.vars`, which git ignores.
