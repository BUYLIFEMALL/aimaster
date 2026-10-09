// Read-only live REST verification. Uses only this project's public anonymous key.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function env(name) {
  if (process.env[name]) return process.env[name];
  for (const file of ['.env.local', '.env']) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    const match = fs.readFileSync(full, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}
const url = env('NEXT_PUBLIC_SUPABASE_URL');
const key = env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (url !== 'https://esgxyikcnnvmlhygjkth.supabase.co' || !key) {
  throw new Error('Expected AIMaster project URL and public anonymous key are required');
}
const tables = ['blog_posts', 'blog_authors', 'blog_candidates', 'blog_categories',
  'blog_post_categories', 'blog_comments', 'blog_likes'];
let failed = 0;
for (const table of tables) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key }, signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  const blocked = [401, 403].includes(response.status) && body.code === '42501';
  // Never print row contents, keys, tokens or request headers.
  console.log(`${blocked ? 'OK' : 'FAIL'} ${table}: anonymous HTTP ${response.status}`);
  if (!blocked) failed++;
}
console.log(`${tables.length} tables, ${failed} failures`);
if (failed) process.exitCode = 1;
