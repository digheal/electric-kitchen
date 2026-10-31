// Every database read lives here. Routes call these functions and never touch env.DB themselves.
import type { Env } from './env';
import { kitchenQuery, MAX_RESULTS, PUBLIC_COLUMNS, shapeKitchen, type KitchenRow } from '../rules';

export async function listKitchens(env: Env, params: URLSearchParams) {
  const { where, args, order } = kitchenQuery(params);
  const { results } = await env.DB
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM kitchens WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${MAX_RESULTS}`)
    .bind(...args)
    .all<KitchenRow>();
  return results.map(shapeKitchen);
}

/** One approved kitchen, or null when the id is unknown or not approved yet. */
export async function getKitchen(env: Env, id: number) {
  const row = await env.DB
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM kitchens WHERE id = ? AND status = 'approved'`)
    .bind(id)
    .first<KitchenRow>();
  return row ? shapeKitchen(row) : null;
}

/** Used by /api/health. Rejects when the database cannot be reached. */
export async function pingDatabase(env: Env) {
  await env.DB.prepare('SELECT 1').first();
}
