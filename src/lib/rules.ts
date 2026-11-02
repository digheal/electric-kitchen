// Pure rules for the public kitchen list. No database, network or DOM access here,
// so the Worker and the tests can both use this file.

/** Columns the public API may return. Submitter name and email are left out on purpose. */
export const PUBLIC_COLUMNS = `id, name, kitchen_type, street_address, city, region, country, lat, lng,
  equipment, equipment_other, website, photo_key, year_electric, build_type, notes, approved_at`;

/** The most kitchens one list request can return. */
export const MAX_RESULTS = 500;

export interface KitchenQuery { where: string[]; args: unknown[]; order: string }

/** Escapes LIKE wildcards so a search for "50%" matches the text "50%". Pair with ESCAPE '\'. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

/** Turns browse filters from the URL into SQL conditions. Only approved kitchens are ever included. */
export function kitchenQuery(p: URLSearchParams): KitchenQuery {
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
    const like = `%${escapeLike(q)}%`;
    where.push(`(name LIKE ? ESCAPE '\\' OR city LIKE ? ESCAPE '\\' OR region LIKE ? ESCAPE '\\')`);
    args.push(like, like, like);
  }

  const order = p.get('sort') === 'name' ? 'name COLLATE NOCASE ASC' : 'approved_at DESC, id DESC';
  return { where, args, order };
}

export type KitchenRow = Record<string, unknown> & { equipment: string };

/** The equipment column is stored as JSON text. The API returns it as a real list. */
export function shapeKitchen(row: KitchenRow) {
  return { ...row, equipment: JSON.parse(row.equipment) as string[] };
}
