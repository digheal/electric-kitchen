import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// On Cloudflare the database client is the DB binding (env.DB, typed D1Database), not an npm import.
// Only files inside src/lib may touch it. Routes, pages and client scripts go through src/lib/server/data.ts.
const ROOT = join(__dirname, '..');
const FORBIDDEN = [/\bD1Database\b/, /\benv\.DB\b/, /\.prepare\(/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('database boundary', () => {
  it('no file outside src/lib uses the database client', () => {
    const offenders = files(join(ROOT, 'src'))
      .filter((f) => !relative(ROOT, f).startsWith(`src${sep}lib${sep}`))
      .filter((f) => FORBIDDEN.some((re) => re.test(readFileSync(f, 'utf8'))))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
