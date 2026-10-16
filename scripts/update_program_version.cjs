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

const slug = process.argv[2];
const version = process.argv[3];

if (!slug || !version) {
  console.error('Usage: node update_program_version.cjs <slug> <version>');
  process.exit(1);
}

async function main() {
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: prog, error: fetchErr } = await admin.from('programs').select('id, name, slug, version, app_url').eq('slug', slug).single();
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    process.exit(1);
  }
  console.log(`Current DB [${prog.name} (${prog.slug})]:`, prog.version);

  const { data: updated, error: updateErr } = await admin.from('programs').update({
    version: version
  }).eq('slug', slug).select();

  if (updateErr) {
    console.error('Update error:', updateErr);
    process.exit(1);
  }
  console.log(`Updated DB [${slug}] version to:`, updated[0].version);
}

main().catch(console.error);
