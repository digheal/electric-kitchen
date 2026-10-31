// MapLibre runs its heavy work in a background worker made of two files.
// Bundlers mangle them, so we serve them as plain files from /maplibre/ instead.
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('public/maplibre', { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  cpSync(`node_modules/maplibre-gl/dist/${file}`, `public/maplibre/${file}`);
}
