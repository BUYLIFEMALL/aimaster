const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-content-maker/package.json'));
const { createClient } = ownRequire('@supabase/supabase-js');

function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const platform = readEnv(path.join(root, '.env.local'));
const url = platform.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co';
const serverKey = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();

const slug = process.argv[2] || 'music-player';

async function main() {
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: prog, error: fetchErr } = await admin.from('programs').select('id, name, slug, version, app_url, is_active').eq('slug', slug).single();
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    process.exit(1);
  }
  console.log('Program info:', prog);
}

main().catch(console.error);
