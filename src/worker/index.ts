export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PHOTOS: R2Bucket;
}

// Only these columns ever leave the database. Submitter name and email are not here on purpose.
const PUBLIC_COLUMNS = `id, name, kitchen_type, street_address, city, region, country, lat, lng,
  equipment, equipment_other, website, photo_key, year_electric, build_type, notes, approved_at`;

const json = (body: unknown, status = 200, cache = 'public, max-age=30') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache },
  });

type Row = Record<string, unknown> & { equipment: string };
const shape = (row: Row) => ({ ...row, equipment: JSON.parse(row.equipment) as string[] });

async function listKitchens(url: URL, env: Env) {
  const p = url.searchParams;
  const where = [`status = 'approved'`];
  const args: unknown[] = [];

  const type = p.get('type');
  if (type) { where.push('kitchen_type = ?'); args.push(type); }
  const region = p.get('state');
  if (region) { where.push('region = ?'); args.push(region); }
  const city = p.get('city');
  if (city) { where.push('city = ?'); args.push(city); }
  const equipment = p.get('equipment');
  if (equipment) {
    where.push('EXISTS (SELECT 1 FROM json_each(kitchens.equipment) WHERE value = ?)');
    args.push(equipment);
  }
  const q = p.get('q')?.trim();
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    where.push(`(name LIKE ? ESCAPE '\\' OR city LIKE ? ESCAPE '\\' OR region LIKE ? ESCAPE '\\')`);
    args.push(like, like, like);
  }

  const order = p.get('sort') === 'name' ? 'name COLLATE NOCASE ASC' : 'approved_at DESC, id DESC';
  const { results } = await env.DB
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM kitchens WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 500`)
    .bind(...args)
    .all<Row>();
  return json(results.map(shape));
}

async function getKitchen(id: number, env: Env) {
  const row = await env.DB
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM kitchens WHERE id = ? AND status = 'approved'`)
    .bind(id)
    .first<Row>();
  return row ? json(shape(row)) : json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'GET' || request.method === 'HEAD') {
      if (pathname === '/api/health') {
        const [db, photos] = await Promise.allSettled([
          env.DB.prepare('SELECT 1').first(),
          env.PHOTOS.list({ limit: 1 }),
        ]);
        return json(
          { ok: db.status === 'fulfilled' && photos.status === 'fulfilled', db: db.status === 'fulfilled', photos: photos.status === 'fulfilled' },
          200,
          'no-store',
        );
      }
      if (pathname === '/api/kitchens') return listKitchens(url, env);
      const one = pathname.match(/^\/api\/kitchens\/(\d+)$/);
      if (one) return getKitchen(Number(one[1]), env);
    }

    if (pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404, 'no-store');
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
