const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnv(f) {
  const env = {};
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const env = readEnv('.env.local');
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('programs')
    .update({ version: 'v1.04' })
    .eq('slug', 'allinone-graphic')
    .select('id, slug, name, version');

  if (error) {
    console.error('Update Error:', error);
    process.exit(1);
  }
  console.log('Successfully updated allinone-graphic version in DB:', data);
}

run();
