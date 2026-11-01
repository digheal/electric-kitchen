# Roadmap

## Before launch

1. Remove the five fake sample kitchens. They were added by `0002_sample_kitchens.sql`, so removal needs a new migration that deletes them.
2. Confirm the five pending California kitchens with each restaurant (ONE65, Chez Panisse, Gwen, Prubechu, Little Sheep Mongolian Hot Pot), then approve, edit or reject them.
3. Confirm whether Shoreside Restaurant & Bar converted from gas, and update `build_type`.
4. Find street addresses for kitchens pinned at a city center.
5. Add a 404 page.
6. Choose a map tile provider that allows production traffic.
7. TODO: owner to list anything else needed before launch.

## Feature ideas

1. Public submission form, protected by Turnstile, saving rows as `pending`.
2. Admin area to review, edit, approve and reject submissions, with a plain language staff guide page.
3. Email notice to the owner on a new submission, through Resend.
4. Kitchen photos stored in R2.
5. More research batches beyond California.

## Security follow ups

1. Add security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`) for static pages.
2. Rate limit the API and the future submission endpoint.
3. Cap the length of the `q` search parameter.
4. Typecheck the test files in CI.

## Limits to watch

1. `MAX_RESULTS` caps lists at 500 kitchens. The globe and browse pages load the whole list.
2. D1 and Workers free tier limits. TODO: confirm which Cloudflare plan the account is on.
3. NASA GIBS and OpenStreetMap tile usage.

## Bigger technical projects

1. Server side pagination and map clustering once the list grows.
2. TODO: owner to add.

## Discussed and decided

1. **2026-10-31 Listing criteria for research entries.** Include kitchens that deliberately moved off gas or chose electric where gas is the norm. Exclude kitchens that never needed gas, and never list fast food. Reason: the site exists to show intentional electrification.
2. **2026-10-31 Unconfirmed kitchens stay pending.** Research entries whose gas status is not confirmed are saved as `pending` so they stay hidden. Reason: we do not publish claims we cannot back up.
3. **2026-10-31 Research entries cite their source** in `notes`. Reason: visitors can check where a claim came from.
4. **2026-10-31 Kitchens built electric only because a local law required it are excluded** (for example Giorgio's in Mountain View). Reason: not a voluntary choice.
5. **2026-10-31 Community kitchens that are not restaurants are excluded from the restaurant research** (for example the Sacramento Asian Sports Foundation kitchen). TODO: owner to confirm whether other kitchen types should be researched later.

## Operations to do

1. Fill in DEPLOY.md section 8 TODOs.
2. Find out why the Workers Builds check fails on pull request branches (see TECHNICAL.md "Known limitations").
3. Decide whether to make the **Tests** check required in branch protection on `main`.
