const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const ownRequire = require('module').createRequire(path.join(root, 'reverse-prompt/package.json'));
const { createClient } = ownRequire('@supabase/supabase-js');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const env = readEnv(path.join(root, '.env.local'));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await sb
    .from('programs')
    .select('id, name, slug, version, app_url')
    .or('slug.eq.tarot-reading,slug.eq.tarot');
  
  if (error) {
    console.error('DB 조회 실패:', error);
    process.exit(1);
  }
  console.log('★ [37번 타로] DB 조회 결과:', data);
}

run();
