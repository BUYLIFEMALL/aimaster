const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-content-maker/package.json'));
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

const platform = readEnv(path.join(root, '.env.local'));
const url = platform.NEXT_PUBLIC_SUPABASE_URL;
const serverKey = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();

async function main() {
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: prog, error: fetchErr } = await admin.from('programs').select('id, name, slug, version, app_url').eq('slug', 'ai-task-planner').single();
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }
  console.log('Current DB Program:', prog);

  const { data: updated, error: updateErr } = await admin.from('programs').update({
    version: 'v1.07'
  }).eq('slug', 'ai-task-planner').select();

  if (updateErr) {
    console.error('Update error:', updateErr);
    return;
  }
  console.log('Updated DB Program:', updated);
}

main().catch(console.error);
