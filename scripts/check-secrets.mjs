// Scans the build output (dist/) for anything that looks like a secret.
// Run after `npm run build`. Exits with code 1 and names the file if it finds one.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PATTERNS = [
  { name: 'Resend API key', re: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/ },
  { name: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'secret name with a value', re: /(ADMIN_PASSWORD|RESEND_API_KEY|TURNSTILE_SECRET_KEY)\s*[=:]\s*["']?[^\s"']{6,}/ },
];

// Any real value in a local .dev.vars must never end up in the build either.
if (existsSync('.dev.vars')) {
  for (const line of readFileSync('.dev.vars', 'utf8').split('\n')) {
    const value = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    if (value.length >= 8) PATTERNS.push({ name: 'a value from .dev.vars', literal: value });
  }
}

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});

if (!existsSync('dist')) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

let found = 0;
for (const file of files('dist')) {
  const text = readFileSync(file, 'utf8');
  for (const p of PATTERNS) {
    if (p.re ? p.re.test(text) : text.includes(p.literal)) {
      console.error(`Possible ${p.name} in ${file}`);
      found++;
    }
  }
}
if (found) process.exit(1);
console.log('No secrets found in dist/.');
