const fs = require('fs');
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('programs')
    .update({ app_url: 'https://playlist-maker.buylife.xyz' })
    .eq('slug', 'playlist-channel-studio')
    .select('id, name, slug, app_url, version');

  if (error) {
    console.error('Update error:', error);
    process.exit(1);
  }
  console.log('Successfully updated app_url to https://playlist-maker.buylife.xyz:', data);
}

run();
