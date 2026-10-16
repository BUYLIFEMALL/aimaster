const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const ownRequire = createRequire('D:/Antigravity/AIMaster/blog-content-maker/package.json');
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

const platform = readEnv('D:/Antigravity/AIMaster/.env.local');
const url = platform.NEXT_PUBLIC_SUPABASE_URL;
const serverKey = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();
const admin = createClient(url, serverKey);

async function run() {
  const { data, error } = await admin
    .from('programs')
    .update({ version: 'v1.08', updated_at: new Date().toISOString() })
    .eq('slug', 'music-automation')
    .select('slug, name, version');

  if (error) {
    console.error('Update error:', error);
    process.exit(1);
  }
  console.log('Update success:', data);
}

run();
