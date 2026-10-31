// Cloudflare bindings the Worker receives. Names must match wrangler.jsonc.
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PHOTOS: R2Bucket;
}
