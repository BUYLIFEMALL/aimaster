const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const { createClient } = require(path.join(root, 'node_modules/@supabase/supabase-js'));

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const platform = readEnv(path.join(root, '.env.local'));
const url = platform.NEXT_PUBLIC_SUPABASE_URL;
const key = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();

async function main() {
  const sb = createClient(url, key);
  const { data, error } = await sb.from('programs').update({ version: 'v1.10', updated_at: new Date().toISOString() }).eq('slug', 'ai-slide-builder').select('id, name, slug, version');
  if (error) console.error(error);
  else console.log('DB 업데이트 성공:', JSON.stringify(data, null, 2));
}

main();
