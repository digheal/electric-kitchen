import { defineConfig } from 'astro/config';

// Pages are built to plain static files in ./dist.
// The Worker (src/worker) serves them and handles /api/* requests.
export default defineConfig({
  output: 'static',
});
