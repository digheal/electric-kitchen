import { describe, expect, it } from 'vitest';
import { getKitchen, listKitchens, pingDatabase } from '../src/lib/server/data';
import type { Env } from '../src/lib/server/env';

// A stand-in for the D1 binding that records each query and returns canned rows.
function fakeEnv(rows: Record<string, unknown>[]) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const DB = {
    prepare(sql: string) {
      const call = { sql, args: [] as unknown[] };
      calls.push(call);
      const stmt = {
        bind(...args: unknown[]) { call.args = args; return stmt; },
        async all() { return { results: rows }; },
        async first() { return rows[0] ?? null; },
      };
      return stmt;
    },
  };
  return { env: { DB } as unknown as Env, calls };
}

describe('listKitchens', () => {
  it('selects only public columns of approved kitchens, capped at 500', async () => {
    const { env, calls } = fakeEnv([{ id: 1, equipment: '["combi oven"]' }]);
    const rows = await listKitchens(env, new URLSearchParams('type=cafe'));
    expect(rows).toEqual([{ id: 1, equipment: ['combi oven'] }]);
    expect(calls[0].sql).toMatch(/status = 'approved'/);
    expect(calls[0].sql).toMatch(/LIMIT 500$/);
    expect(calls[0].sql).not.toMatch(/submitter/);
    expect(calls[0].args).toEqual(['cafe']);
  });
});

describe('getKitchen', () => {
  it('returns null when nothing matches', async () => {
    const { env, calls } = fakeEnv([]);
    expect(await getKitchen(env, 7)).toBeNull();
    expect(calls[0].args).toEqual([7]);
    expect(calls[0].sql).toMatch(/status = 'approved'/);
  });

  it('returns the shaped row when found', async () => {
    const { env } = fakeEnv([{ id: 7, equipment: '[]' }]);
    expect(await getKitchen(env, 7)).toEqual({ id: 7, equipment: [] });
  });
});

describe('pingDatabase', () => {
  it('runs a trivial query', async () => {
    const { env, calls } = fakeEnv([{ 1: 1 }]);
    await pingDatabase(env);
    expect(calls[0].sql).toBe('SELECT 1');
  });
});
