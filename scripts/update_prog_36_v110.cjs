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
    .update({ version: 'v1.10' })
    .eq('slug', 'video-to-gif')
    .select('id, name, slug, version, app_url');
  
  if (error) {
    console.error('DB 업데이트 실패:', error);
    process.exit(1);
  }
  console.log('★ [36번 VideoToGIF] DB 버전 갱신 성공:', data);
}

run();
