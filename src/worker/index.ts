import type { Env } from '../lib/server/env';
import { getKitchen, listKitchens, pingDatabase } from '../lib/server/data';

const json = (body: unknown, status = 200, cache = 'public, max-age=30') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'GET' || request.method === 'HEAD') {
      if (pathname === '/api/health') {
        const [db, photos] = await Promise.allSettled([
          pingDatabase(env),
          env.PHOTOS.list({ limit: 1 }),
        ]);
        return json(
          { ok: db.status === 'fulfilled' && photos.status === 'fulfilled', db: db.status === 'fulfilled', photos: photos.status === 'fulfilled' },
          200,
          'no-store',
        );
      }
      if (pathname === '/api/kitchens') return json(await listKitchens(env, url.searchParams));
      const one = pathname.match(/^\/api\/kitchens\/(\d+)$/);
      if (one) {
        const kitchen = await getKitchen(env, Number(one[1]));
        return kitchen ? json(kitchen) : json({ error: 'Not found' }, 404);
      }
    }

    if (pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404, 'no-store');
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
