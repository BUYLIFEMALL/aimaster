const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const ownRequire = createRequire(path.join(__dirname, '../blog-content-maker/package.json'));
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

const env = readEnv(path.join(__dirname, '../.env.local'));
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY);

const slug = 'auto-detail-page';
const newVersion = 'v1.20';

async function updateVersion() {
  console.log(`[Supabase DB: esgxyikcnnvmlhygjkth] ${slug} 버전 ${newVersion} 갱신 시도...`);
  const { data, error } = await s
    .from('programs')
    .update({ version: newVersion })
    .eq('slug', slug)
    .select('slug, name, app_url, version');

  if (error) {
    console.error('버전 갱신 실패:', error);
    process.exit(1);
  }

  console.log('버전 갱신 성공:', data);
  process.exit(0);
}

updateVersion();
