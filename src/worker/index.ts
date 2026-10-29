export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PHOTOS: R2Bucket;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    // Phase 1 check: confirms the database and photo storage are connected.
    if (pathname === '/api/health') {
      const [db, photos] = await Promise.allSettled([
        env.DB.prepare('SELECT 1').first(),
        env.PHOTOS.list({ limit: 1 }),
      ]);
      return json({
        ok: db.status === 'fulfilled' && photos.status === 'fulfilled',
        db: db.status === 'fulfilled',
        photos: photos.status === 'fulfilled',
      });
    }

    if (pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
